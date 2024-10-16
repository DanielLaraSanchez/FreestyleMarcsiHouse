import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, interval, Subject, Subscription } from 'rxjs';
import { SignalingService } from './signaling.service';
import { AuthService } from './auth.service';

interface BattleFoundData {
  roomId: string;
  partnerSocketId: string;
}

@Injectable({
  providedIn: 'root',
})
export class BattleOrchestratorService implements OnDestroy {
  // Battle mechanics
  private readonly TOTAL_TIME: number = 60; // seconds
  private timerSubscription: Subscription | null = null;
  private wordChangeSubscription: Subscription | null = null;

  private currentTurnSubject = new BehaviorSubject<string>('Player 1');
  currentTurn$ = this.currentTurnSubject.asObservable();

  private timeLeftSubject = new BehaviorSubject<number>(this.TOTAL_TIME);
  timeLeft$ = this.timeLeftSubject.asObservable();

  private currentWordSubject = new BehaviorSubject<string>('');
  currentWord$ = this.currentWordSubject.asObservable();

  private voteCountSubject = new BehaviorSubject<number>(0);
  voteCount$ = this.voteCountSubject.asObservable();

  private viewerCountSubject = new BehaviorSubject<number>(0);
  viewerCount$ = this.viewerCountSubject.asObservable();

  private words: string[] = [
    'Victory',
    'Hustle',
    'Flow',
    'Rhythm',
    'Battle',
    'Street',
    'Mic',
    'Beats',
    'Freestyle',
    'Legend',
  ];

  private stream!: MediaStream;

  // Partner events
  private partnerDisconnectedSubject = new Subject<void>();
  public partnerDisconnected$ = this.partnerDisconnectedSubject.asObservable();

  private partnerHangUpSubject = new Subject<void>();
  public partnerHangUp$ = this.partnerHangUpSubject.asObservable();

  // WebRTC
  public peerConnection: RTCPeerConnection | null = null;
  public remoteStream: MediaStream | null = null;
  public roomId: string = '';
  public partnerSocketId: string = '';

  private connectionStateSubject = new BehaviorSubject<string>('disconnected');
  public connectionState$ = this.connectionStateSubject.asObservable();

  private remoteStreamSubject = new Subject<MediaStream | null>();
  public remoteStream$ = this.remoteStreamSubject.asObservable();

  private battleFoundSubject = new Subject<BattleFoundData>();
  public battleFound$ = this.battleFoundSubject.asObservable();

  private battleStartSubject = new Subject<void>();
  public battleStart$ = this.battleStartSubject.asObservable();

  private readonly ICE_CONFIG: RTCConfiguration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    // Add TURN servers for production
  };

  private subscriptions = new Subscription();

  public localStream: MediaStream | null = null;

  private ownSocketId: string = '';

  public isOfferer: boolean = false;

  public isConnectedToPeer: boolean = false;

  public battleStarted: boolean = false;

  // Animations flags
  public triggerFlipAnimation: boolean = false;
  public triggerZoomOut: boolean = false;
  public triggerBounceIn: boolean = false;

  constructor(
    private signalingService: SignalingService,
    private authService: AuthService
  ) {
    // Subscribe to own socket ID
    const ownSocketIdSub = this.signalingService.ownSocketId$.subscribe(id => {
      this.ownSocketId = id;
      console.log(`Own Socket ID: ${this.ownSocketId}`);
    });
    this.subscriptions.add(ownSocketIdSub);

    // Subscribe to battle found event
    const battleFoundSub = this.signalingService.battleFound$.subscribe(data => {
      if (this.isConnectedToPeer) {
        console.warn('Already connected to a peer. Ignoring new battleFound event.');
        return;
      }
      this.roomId = data.roomId;
      this.partnerSocketId = data.partnerSocketId;
      console.log(`Battle found! Room ID: ${this.roomId}, Partner Socket ID: ${this.partnerSocketId}`);
      this.battleFoundSubject.next(data);
      this.determineRoleAndInitiate();
    });
    this.subscriptions.add(battleFoundSub);

    // Subscribe to battleStart event
    const battleStartSub = this.signalingService.battleStart$.subscribe(() => {
      console.log('BattleStart event received. Initiating battle.');
      this.initiateBattle();
      this.battleStartSubject.next();
    });
    this.subscriptions.add(battleStartSub);

    // WebRTC Events
    const offerSub = this.signalingService.webrtcOffer$.subscribe(offer => {
      if (this.isOfferer) {
        console.warn('Offerer should not receive offers. Ignoring.');
        return;
      }
      console.log('Received WebRTC offer.');
      this.handleOffer(offer);
    });
    this.subscriptions.add(offerSub);

    const answerSub = this.signalingService.webrtcAnswer$.subscribe(answer => {
      if (!this.isOfferer) {
        console.warn('Answerer should not receive answers. Ignoring.');
        return;
      }
      console.log('Received WebRTC answer.');
      this.handleAnswer(answer);
    });
    this.subscriptions.add(answerSub);

    const iceCandidateSub = this.signalingService.webrtcIceCandidate$.subscribe(candidate => {
      console.log('Received ICE candidate.');
      this.handleIceCandidate(candidate);
    });
    this.subscriptions.add(iceCandidateSub);

    // Partner events
    const partnerDisconnectedSub = this.signalingService.partnerDisconnected$.subscribe(() => {
      console.log('Partner has disconnected. Cleaning up and re-initiating matchmaking.');
      this.handlePartnerDisconnected();
      this.restartBattle();
    });
    this.subscriptions.add(partnerDisconnectedSub);

    const partnerHangUpSub = this.signalingService.partnerHangUp$.subscribe(() => {
      console.log('Partner has hung up. Cleaning up and re-initiating matchmaking.');
      this.handlePartnerHangUp();
      this.restartBattle();
    });
    this.subscriptions.add(partnerHangUpSub);
  }

  /**
   * Sends a 'readyToStart' signal to the server.
   */
  public userReadyToStart(): void {
    this.signalingService.emitReadyToStart();
    this.triggerFlipAnimation = false;
    this.triggerZoomOut = false;
    this.triggerBounceIn = false;
    console.log('User marked as ready to start the battle.');
  }

  /**
   * Initiates the battle mechanics after battle start.
   */
  private initiateBattle(): void {
    this.battleStarted = true;
    this.triggerFlipAnimation = true;

    setTimeout(() => {
      this.triggerZoomOut = true;
    }, 300);

    setTimeout(() => {
      this.triggerBounceIn = !this.triggerBounceIn;
      // Additional logic if required
    }, 1500);
  }

  /**
   * Starts the battle timers and word changes.
   */
  private startTimers(): void {
    this.stopTimers(); // Clear existing timers

    this.timeLeftSubject.next(this.TOTAL_TIME);
    this.timerSubscription = interval(1000).subscribe(() => {
      if (this.timeLeftSubject.getValue() > 0) {
        this.timeLeftSubject.next(this.timeLeftSubject.getValue() - 1);
      } else {
        this.switchTurn();
      }
    });

    console.log('Timer started.');
  }

  /**
   * Starts the word change interval.
   */
  private startWordChange(): void {
    this.stopWordChange();

    this.generateRandomWord(); // initial word
    this.wordChangeSubscription = interval(5000).subscribe(() => {
      this.generateRandomWord();
    });

    console.log('Word change initiated.');
  }

  /**
   * Stops the battle timers.
   */
  private stopTimers(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
      console.log('Timer stopped.');
    }
  }

  /**
   * Stops the word change interval.
   */
  private stopWordChange(): void {
    if (this.wordChangeSubscription) {
      this.wordChangeSubscription.unsubscribe();
      this.wordChangeSubscription = null;
      console.log('Word change stopped.');
    }
  }

  /**
   * Stops all battle-related timers and subscriptions.
   */
  private stopTimersAndWordChange(): void {
    this.stopTimers();
    this.stopWordChange();
  }

  /**
   * Switches the current turn and restarts timers and word changes.
   */
  private switchTurn(): void {
    const current = this.currentTurnSubject.getValue();
    const nextTurn = current === 'Player 1' ? 'Player 2' : 'Player 1';
    this.currentTurnSubject.next(nextTurn);
    this.voteCountSubject.next(0);
    this.timeLeftSubject.next(this.TOTAL_TIME);

    console.log(`Turn switched to ${nextTurn}.`);
    this.startTimers();
    this.startWordChange();
  }

  /**
   * Generates a random word from the words list.
   */
  private generateRandomWord(): void {
    const randomWord = this.words[Math.floor(Math.random() * this.words.length)];
    this.currentWordSubject.next(randomWord);
    console.log(`Generated word: ${randomWord}`);
  }

  /**
   * Increments the vote count.
   */
  public incrementVote(): void {
    const currentVotes = this.voteCountSubject.getValue();
    this.voteCountSubject.next(currentVotes + 1);
    console.log(`Vote count incremented to ${currentVotes + 1}`);
  }

  /**
   * Determines the role (offerer/answerer) based on socket IDs and initiates WebRTC.
   */
  private determineRoleAndInitiate(): void {
    if (!this.ownSocketId || !this.partnerSocketId) {
      console.error('Socket IDs not available for role determination.');
      return;
    }

    const comparison = this.ownSocketId.localeCompare(this.partnerSocketId);
    this.isOfferer = comparison === -1;

    if (this.isOfferer) {
      console.log('Role: Offerer. Initiating WebRTC connection.');
      this.initiateWebRTCConnection();
    } else {
      console.log('Role: Answerer. Waiting for offer.');
    }

    console.log(`isOfferer: ${this.isOfferer}`);
  }

  /**
   * Initiates WebRTC connection as offerer.
   */
  private async initiateWebRTCConnection(): Promise<void> {
    if (!this.roomId) {
      console.error('Cannot initiate WebRTC connection without roomId.');
      return;
    }

    this.connectionStateSubject.next('connecting');
    this.peerConnection = new RTCPeerConnection(this.ICE_CONFIG);
    console.log('RTCPeerConnection created for Offerer.');

    this.setupPeerConnection();

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => this.peerConnection?.addTrack(track, this.localStream!));
      console.log('Added local tracks to RTCPeerConnection.');
    } else {
      console.warn('Local stream not initialized.');
    }

    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      this.signalingService.sendWebRTCOffer(this.roomId, offer);
      console.log('Sent WebRTC offer.');
    } catch (error) {
      console.error('Error creating or sending WebRTC offer:', error);
    }
  }

  /**
   * Handles incoming WebRTC offers.
   * @param offer - The received WebRTC offer.
   */
  private async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    this.connectionStateSubject.next('answering');
    this.peerConnection = new RTCPeerConnection(this.ICE_CONFIG);
    console.log('RTCPeerConnection created for Answerer.');

    this.setupPeerConnection();

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => this.peerConnection?.addTrack(track, this.localStream!));
      console.log('Added local tracks to RTCPeerConnection.');
    } else {
      console.warn('Local stream not initialized.');
    }

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('Set remote description with offer.');

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.signalingService.sendWebRTCAnswer(this.roomId, answer);
      console.log('Sent WebRTC answer.');
    } catch (error) {
      console.error('Error handling WebRTC offer:', error);
    }
  }

  /**
   * Handles incoming WebRTC answers.
   * @param answer - The received WebRTC answer.
   */
  private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.isOfferer || !this.peerConnection) {
      console.warn('Not an offerer or no peerConnection exists. Ignoring answer.');
      return;
    }

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      this.connectionStateSubject.next('connected');
      this.isConnectedToPeer = true;
      console.log('WebRTC connection established.');
    } catch (error) {
      console.error('Error setting remote description with answer:', error);
    }
  }

  /**
   * Handles incoming ICE candidates.
   * @param candidate - The received ICE candidate.
   */
  private async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) {
      console.error('No RTCPeerConnection to add ICE candidate.');
      return;
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('Added ICE candidate to RTCPeerConnection.');
    } catch (error) {
      console.error('Error adding received ICE candidate:', error);
    }
  }

  /**
   * Sets up RTCPeerConnection event handlers.
   */
  private setupPeerConnection(): void {
    if (!this.peerConnection) return;

    this.peerConnection.onicecandidate = event => {
      if (event.candidate) {
        this.signalingService.sendWebRTCIceCandidate(this.roomId, event.candidate);
        console.log('Sent ICE candidate.');
      }
    };

    this.peerConnection.ontrack = event => {
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
        this.remoteStreamSubject.next(this.remoteStream);
        console.log('Remote stream initialized.');
      }
      this.remoteStream.addTrack(event.track);
      console.log('Added remote track.');
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log(`RTCPeerConnection state: ${state}`);
      this.connectionStateSubject.next(state || 'unknown');

      if (state === 'connected') {
        this.isConnectedToPeer = true;
      } else if (state === 'disconnected' || state === 'failed') {
        this.isConnectedToPeer = false;
      }
    };
  }

  /**
   * Handles partner disconnection by cleaning up and re-initiating matchmaking.
   */
  private handlePartnerDisconnected(): void {
    this.closeConnection();
    this.roomId = '';
    this.partnerSocketId = '';
    this.isOfferer = false;
    this.isConnectedToPeer = false;
    this.partnerDisconnectedSubject.next();
    console.log('Partner disconnected. Cleaned up connection.');
  }

  /**
   * Handles partner hang up by cleaning up and re-initiating matchmaking.
   */
  private handlePartnerHangUp(): void {
    this.closeConnection();
    this.roomId = '';
    this.partnerSocketId = '';
    this.isOfferer = false;
    this.isConnectedToPeer = false;
    this.partnerHangUpSubject.next();
    console.log('Partner hung up. Cleaned up connection.');
  }

  /**
   * Closes WebRTC connections and stops media streams.
   */
  public closeConnection(): void {
    console.log('Closing WebRTC connections and stopping streams.');

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
      console.log('PeerConnection closed.');
    }

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
      console.log('Local stream stopped.');
    }

    // Stop remote stream
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
      this.remoteStreamSubject.next(null);
      console.log('Remote stream stopped.');
    }

    // Reset connection flags
    this.isConnectedToPeer = false;
    this.connectionStateSubject.next('disconnected');
  }

  /**
   * Handles battle hanging up by the user.
   */
  public hangUp(): void {
    console.log('Hang up initiated.');
    if (this.isConnectedToPeer || this.battleStarted) {
      this.signalingService.hangUp();
      this.closeConnection();
      console.log('Emitted hangUp event and closed connections.');
    } else {
      console.log('No active battle to hang up.');
    }
  }

  /**
   * Restarts the battle by resetting states and re-initiating matchmaking.
   */
  private async restartBattle(): Promise<void> {
    console.log('Restarting battle and re-initiating matchmaking.');
    this.resetBattleState();
    await this.startBattle();
  }

  /**
   * Resets the battle-related states and observables.
   */
  private resetBattleState(): void {
    this.currentTurnSubject.next('Player 1');
    this.timeLeftSubject.next(this.TOTAL_TIME);
    this.voteCountSubject.next(0);
    this.viewerCountSubject.next(0);
    this.currentWordSubject.next('');
    this.battleStarted = false;
    this.triggerFlipAnimation = false;
    this.triggerZoomOut = false;
    this.triggerBounceIn = false;

    // Stop any existing timers or word change subscriptions
    this.stopTimersAndWordChange();
    console.log('Battle state has been reset.');
  }

  /**
   * Initializes the local media stream.
   */
  public async initializeLocalStream(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      console.log('Local media stream initialized.');
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  }

  /**
   * Starts the battle by initiating matchmaking and resetting battle states.
   */
  public async startBattle(): Promise<void> {
    if (this.isConnectedToPeer) {
      console.warn('Already connected to a peer. Cannot start another battle.');
      return;
    }

    this.resetBattleState();

    if (!this.localStream) {
      await this.initializeLocalStream();
      // Assume that the component will handle assigning the stream to video elements
    }

    // Start matchmaking
    this.signalingService.startRandomBattle();
    console.log('Matchmaking initiated.');
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.stopTimersAndWordChange();
    this.closeConnection();
  }
}
