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
  // Battle Mechanics Subjects
  private totalTime: number = 60; // Total time in seconds
  private timeLeft: number = this.totalTime;
  private timerSubscription!: Subscription;
  private wordChangeSubscription!: Subscription;

  private currentTurnSubject = new BehaviorSubject<string>('Player 1');
  currentTurn$ = this.currentTurnSubject.asObservable();

  private timeLeftSubject = new BehaviorSubject<number>(this.timeLeft);
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

  // Subjects to notify when partner disconnects or hangs up
  private partnerDisconnectedSubject = new Subject<void>();
  public partnerDisconnected$ = this.partnerDisconnectedSubject.asObservable();

  private partnerHangUpSubject = new Subject<void>();
  public partnerHangUp$ = this.partnerHangUpSubject.asObservable();

  // WebRTC Related
  public peerConnection: RTCPeerConnection | null = null;
  public remoteStream: MediaStream | null = null;
  public roomId: string = '';
  public partnerSocketId: string = '';

  // Subjects to emit WebRTC connection status and remote stream
  private connectionStateSubject = new BehaviorSubject<string>('disconnected');
  public connectionState$ = this.connectionStateSubject.asObservable();

  private remoteStreamSubject = new Subject<MediaStream | null>();
  public remoteStream$ = this.remoteStreamSubject.asObservable();

  private battleFoundSubject = new Subject<BattleFoundData>();
  public battleFound$ = this.battleFoundSubject.asObservable();

  // Subject for battle start
  private battleStartSubject = new Subject<void>();
  public battleStart$ = this.battleStartSubject.asObservable();

  // ICE Configuration
  private iceConfig: RTCConfiguration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    // Add TURN servers here for production
  };

  // Matchmaking and WebRTC Subscriptions
  private subscriptions = new Subscription();

  // Local Stream
  public localStream: MediaStream | null = null;

  // Store own socket ID
  private ownSocketId: string = '';

  // Role Determination
  public isOfferer: boolean = false;

  // Flag to prevent multiple connections
  public isConnectedToPeer: boolean = false;

  // Battle Started Flag
  public battleStarted: boolean = false;

  // Local Flags for Animations (optional, based on your original code)
  public triggerFlipAnimation: boolean = false;
  public triggerZoomOut: boolean = false;
  public triggerBounceIn: boolean = false;

  constructor(
    private signalingService: SignalingService,
    private authService: AuthService
  ) {
    // Subscribe to own socket ID
    const ownSocketIdSubscription = this.signalingService.ownSocketId$.subscribe(
      (id) => {
        this.ownSocketId = id;
        console.log('Own Socket ID:', this.ownSocketId);
      }
    );
    this.subscriptions.add(ownSocketIdSubscription);

    // Subscribe to battle found event
    const battleFoundSubscription = this.signalingService.battleFound$.subscribe(
      (data) => {
        if (this.isConnectedToPeer) {
          console.warn(
            'Already connected to a peer. Ignoring new battleFound event.'
          );
          return;
        }
        this.roomId = data.roomId;
        this.partnerSocketId = data.partnerSocketId;
        console.log(
          `Battle found! Room ID: ${this.roomId}, Partner Socket ID: ${this.partnerSocketId}`
        );
        // Notify subscribers about battle found
        this.battleFoundSubject.next(data);
        // Determine role based on socket IDs
        this.determineRoleAndInitiate();
      }
    );
    this.subscriptions.add(battleFoundSubscription);

    // Subscribe to battleStart event from SignalingService
    const battleStartSubscription = this.signalingService.battleStart$.subscribe(
      () => {
        console.log('Received battleStart event. Commencing battle.');
        this.initiateBattle();

        // Emit to the battleStart$ observable
        this.battleStartSubject.next();
      }
    );
    this.subscriptions.add(battleStartSubscription);

    // Subscribe to incoming WebRTC offers
    const incomingOfferSubscription =
      this.signalingService.webrtcOffer$.subscribe((offer) => {
        if (this.isOfferer) {
          console.warn('Offerer should not receive offers. Ignoring.');
          return;
        }
        console.log('Received WebRTC offer:', offer);
        this.handleOffer(offer);
      });
    this.subscriptions.add(incomingOfferSubscription);

    // Subscribe to incoming WebRTC answers
    const incomingAnswerSubscription =
      this.signalingService.webrtcAnswer$.subscribe((answer) => {
        if (!this.isOfferer) {
          console.warn('Answerer should not receive answers. Ignoring.');
          return;
        }
        console.log('Received WebRTC answer:', answer);
        this.handleAnswer(answer);
      });
    this.subscriptions.add(incomingAnswerSubscription);

    // Subscribe to incoming ICE candidates
    const incomingIceCandidateSubscription =
      this.signalingService.webrtcIceCandidate$.subscribe((candidate) => {
        console.log('Received ICE candidate:', candidate);
        this.handleIceCandidate(candidate);
      });
    this.subscriptions.add(incomingIceCandidateSubscription);

    // Subscribe to partnerDisconnected event
    const partnerDisconnectedSubscription =
      this.signalingService.partnerDisconnected$.subscribe(() => {
        console.log(
          'Partner has disconnected. Initiating cleanup and re-joining matchmaking.'
        );
        this.handlePartnerDisconnected();
        this.restartBattle(); // Automatically re-initiate matchmaking
      });
    this.subscriptions.add(partnerDisconnectedSubscription);

    // Subscribe to partnerHangUp event
    const partnerHangUpSubscription =
      this.signalingService.partnerHangUp$.subscribe(() => {
        console.log(
          'Partner has hung up the battle. Initiating cleanup and allowing new battles.'
        );

        this.handlePartnerHangUp();

        this.restartBattle(); // Automatically re-initiate matchmaking

      });
    this.subscriptions.add(partnerHangUpSubscription);
  }

  public hangUp(): void {
    console.log('Calling hangUp() in BattleOrchestratorService.');
    this.signalingService.hangUp();
    this.closeConnection();
    console.log('Emitted hangUp event and closed connections.');
  }

  public closeConnection(): void {
    console.log('Closing WebRTC connections.');

    // Close peer connection if exists
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
      console.log('Peer connection closed.');
    }

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
      console.log('Local media tracks stopped.');
    }

    // Stop remote stream
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
      this.remoteStream = null;
      console.log('Remote media tracks stopped.');
    }

    // Reset battle flags
    this.battleStarted = false;
  }

  private handlePartnerDisconnected(): void {
    // Cleanup WebRTC connections and streams
    this.closeConnection();

    // Reset battle-related states
    this.roomId = '';
    this.partnerSocketId = '';
    this.isOfferer = false;
    this.isConnectedToPeer = false;

    // Notify components about the disconnection
    this.partnerDisconnectedSubject.next();
    console.log(
      'Emitted partnerDisconnected to subscribers and reset state.'
    );
  }

  private handlePartnerHangUp(): void {
    // Cleanup WebRTC connections and streams
    this.closeConnection();

    // Reset battle-related states
    this.roomId = '';
    this.partnerSocketId = '';
    this.isOfferer = false;
    this.isConnectedToPeer = false;

    // Notify components about the hang up
    this.partnerHangUpSubject.next();
    console.log(
      'Emitted partnerHangUp to subscribers and reset state.'
    );
  }

  // Initialize local stream
  async initializeLocalStream(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      console.log('Local stream initialized.');
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  }

  // Start the battle and initiate matchmaking
  async startBattle(): Promise<void> {
    if (this.isConnectedToPeer) {
      console.warn('Already connected to a peer. Cannot start another battle.');
      return;
    }

    // Reset battle state
    this.currentTurnSubject.next('Player 1');
    this.timeLeftSubject.next(this.totalTime);
    this.voteCountSubject.next(0);
    this.viewerCountSubject.next(0);
    this.currentWordSubject.next('');

    // Initialize local stream if not already
    if (!this.localStream) {
      await this.initializeLocalStream();
    }

    // Start matchmaking
    this.signalingService.startRandomBattle();
    console.log('Matchmaking initiated.');
  }

  private startTimer(): void {
    // Prevent multiple timers
    this.stopTimer();

    this.timeLeft = this.totalTime;
    this.timeLeftSubject.next(this.timeLeft);

    this.timerSubscription = interval(1000).subscribe(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
        this.timeLeftSubject.next(this.timeLeft);
      } else {
        this.stopTimer();
        this.switchTurn();
      }
    });
    console.log('Timer started.');
  }

  private startWordChange(): void {
    // Prevent multiple word change subscriptions
    this.stopWordChange();

    this.wordChangeSubscription = interval(5000).subscribe(() => {
      this.generateRandomWord();
    });
    this.generateRandomWord(); // Initial word
    console.log('Word generation started.');
  }

  private stopTimer(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      console.log('Timer stopped.');
    }
  }

  private stopWordChange(): void {
    if (this.wordChangeSubscription) {
      this.wordChangeSubscription.unsubscribe();
      console.log('Word generation stopped.');
    }
  }

  private switchTurn(): void {
    const current = this.currentTurnSubject.value;
    const nextTurn = current === 'Player 1' ? 'Player 2' : 'Player 1';
    this.currentTurnSubject.next(nextTurn);
    this.voteCountSubject.next(0);
    this.timeLeft = this.totalTime;
    this.timeLeftSubject.next(this.timeLeft);
    console.log(`Turn switched to ${nextTurn}.`);

    // Restart timer and word change for the next turn
    this.startTimer();
    this.startWordChange();
  }

  async handleOffer(offer: RTCSessionDescriptionInit) {
    if (this.isOfferer) {
      console.warn('Offerer should not handle offers. Ignoring.');
      return;
    }

    console.log('Handling received offer.');
    this.connectionStateSubject.next('answering');

    this.peerConnection = new RTCPeerConnection(this.iceConfig);
    console.log('RTCPeerConnection created for answering.');

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
        this.remoteStreamSubject.next(this.remoteStream);
        console.log('Remote stream initialized.');
      }
      this.remoteStream.addTrack(event.track);
      console.log('Added remote track to remoteStream.');
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalingService.sendWebRTCIceCandidate(this.roomId, event.candidate);
        console.log('Sent ICE candidate.');
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log(`RTCPeerConnection state: ${state}`);
      if (state === 'connected') {
        this.connectionStateSubject.next('connected');
        this.isConnectedToPeer = true;
      } else if (state === 'disconnected' || state === 'failed') {
        this.connectionStateSubject.next('disconnected');
        this.isConnectedToPeer = false;
      }
    };

    // Add local stream tracks to the peer connection
    if (this.localStream) {
      console.log('Adding local stream tracks to peer connection.');
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });
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
      console.error('Error handling offer:', error);
    }
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.isOfferer) {
      console.warn('Answerer should not handle answers. Ignoring.');
      return;
    }

    console.log('Handling received answer.');
    try {
      await this.peerConnection?.setRemoteDescription(new RTCSessionDescription(answer));
      this.connectionStateSubject.next('connected');
      this.isConnectedToPeer = true;
      console.log('Set remote description with answer. WebRTC connection established.');
    } catch (error) {
      console.error('Error setting remote description with answer:', error);
    }
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit) {
    console.log('Adding received ICE candidate.');
    try {
      await this.peerConnection?.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('Added ICE candidate.');
    } catch (error) {
      console.error('Error adding received ICE candidate:', error);
    }
  }

  incrementVote(): void {
    const currentVotes = this.voteCountSubject.getValue();
    this.voteCountSubject.next(currentVotes + 1);
    console.log('Vote incremented:', currentVotes + 1);
  }

  private generateRandomWord(): void {
    const randomIndex = Math.floor(Math.random() * this.words.length);
    const selectedWord = this.words[randomIndex];
    this.currentWordSubject.next(selectedWord);
    console.log('Generated word:', selectedWord);
  }

  private determineRoleAndInitiate() {
    if (!this.ownSocketId || !this.partnerSocketId) {
      console.error('Socket IDs not available for role determination.');
      return;
    }

    // Use localeCompare for accurate string comparison
    const comparison = this.ownSocketId.localeCompare(this.partnerSocketId);
    if (comparison === -1) {
      console.log('Role determined: Offerer');
      this.isOfferer = true;
      // Automatically initiate WebRTC connection for Offerer
      this.initiateWebRTCConnection();
    } else {
      console.log('Role determined: Answerer');
      this.isOfferer = false;
      // Answerer will wait for the offer
    }

    console.log(`isOfferer: ${this.isOfferer}`);
  }

  // Initiate WebRTC Connection (Offerer)
  async initiateWebRTCConnection() {
    if (!this.roomId) {
      console.error('Cannot initiate WebRTC connection without roomId.');
      return;
    }

    this.connectionStateSubject.next('connecting');
    this.peerConnection = new RTCPeerConnection(this.iceConfig);
    console.log('RTCPeerConnection created.');

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
        this.remoteStreamSubject.next(this.remoteStream);
        console.log('Remote stream initialized.');
      }
      this.remoteStream.addTrack(event.track);
      console.log('Added remote track to remoteStream.');
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalingService.sendWebRTCIceCandidate(this.roomId, event.candidate);
        console.log('Sent ICE candidate.');
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log(`RTCPeerConnection state: ${state}`);
      if (state === 'connected') {
        this.connectionStateSubject.next('connected');
        this.isConnectedToPeer = true;
      } else if (state === 'disconnected' || state === 'failed') {
        this.connectionStateSubject.next('disconnected');
        this.isConnectedToPeer = false;
      }
    };

    // Add local stream tracks to the peer connection
    if (this.localStream) {
      console.log('Adding local stream tracks to peer connection.');
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });
    } else {
      console.warn('Local stream not initialized.');
    }

    // Create an offer
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      this.signalingService.sendWebRTCOffer(this.roomId, offer);
      console.log('Sent WebRTC offer.');
    } catch (error) {
      console.error('Error creating or sending offer:', error);
    }
  }

  // Initiate battle logic upon receiving 'battleStart'
  private initiateBattle(): void {
    this.battleStarted = true; // Flag to indicate battle has started

    // Start battle mechanics
    this.startTimer();
    this.startWordChange();

    // Initialize WebRTC connections if not already done
    this.initializeWebRTC();

    console.log('Battle has been initiated.');
  }

  // Emit 'readyToStart' when user is ready
  public userReadyToStart(): void {
    this.signalingService.emitReadyToStart();
    console.log('User is ready to start the battle.');
  }

  // Initialize WebRTC connections
  private initializeWebRTC(): void {
    // Your existing WebRTC initiation logic
    if (!this.isConnectedToPeer) {
      this.determineRoleAndInitiate();
    }
  }

  // Restart Battle by re-initiating matchmaking
  private async restartBattle(): Promise<void> {
    console.log('Restarting battle and re-initiating matchmaking.');
    await this.startBattle();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.wordChangeSubscription?.unsubscribe();
    this.stopTimer();

    // Close WebRTC connection if it exists
    if (this.peerConnection) {
      this.peerConnection.close();
      console.log('Peer connection closed.');
      this.peerConnection = null;
    }

    // Stop all media tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      console.log('Local media tracks stopped.');
      this.localStream = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
      console.log('Remote media tracks stopped.');
      this.remoteStream = null;
    }
  }
}
