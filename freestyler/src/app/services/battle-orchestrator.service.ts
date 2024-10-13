import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
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
  private currentTurnSubject = new BehaviorSubject<string>('Player 1');
  currentTurn$ = this.currentTurnSubject.asObservable();

  private timeLeftSubject = new BehaviorSubject<number>(60);
  timeLeft$ = this.timeLeftSubject.asObservable();

  private currentWordSubject = new BehaviorSubject<string>('');
  currentWord$ = this.currentWordSubject.asObservable();

  private voteCountSubject = new BehaviorSubject<number>(0);
  voteCount$ = this.voteCountSubject.asObservable();

  private viewerCountSubject = new BehaviorSubject<number>(0);
  viewerCount$ = this.viewerCountSubject.asObservable();

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

  // ICE Configuration (add TURN servers as needed)
  private iceConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      // Add TURN servers here for production
      // {
      //   urls: 'turn:your.turn.server:3478',
      //   username: 'yourUsername',
      //   credential: 'yourCredential'
      // },
    ],
  };

  // Matchmaking and WebRTC Subscriptions
  private subscriptions = new Subscription();

  // Local Stream
  public localStream: MediaStream | null = null;

  // Store own socket ID
  private ownSocketId: string = '';

  // Role Determination
  public isOfferer: boolean = false;

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

    // Subscribe to incoming WebRTC offers
    const incomingOfferSubscription = this.signalingService.webrtcOffer$.subscribe(
      (offer) => {
        console.log('Received WebRTC offer:', offer);
        this.handleOffer(offer);
      }
    );
    this.subscriptions.add(incomingOfferSubscription);

    // Subscribe to incoming WebRTC answers
    const incomingAnswerSubscription = this.signalingService.webrtcAnswer$.subscribe(
      (answer) => {
        console.log('Received WebRTC answer:', answer);
        this.handleAnswer(answer);
      }
    );
    this.subscriptions.add(incomingAnswerSubscription);

    // Subscribe to incoming ICE candidates
    const incomingIceCandidateSubscription = this.signalingService.webrtcIceCandidate$.subscribe(
      (candidate) => {
        console.log('Received ICE candidate:', candidate);
        this.handleIceCandidate(candidate);
      }
    );
    this.subscriptions.add(incomingIceCandidateSubscription);
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
    // Reset battle state
    this.currentTurnSubject.next('Player 1');
    this.timeLeftSubject.next(60);
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

  // Determine role based on socket IDs and initiate WebRTC if offerer
  private determineRoleAndInitiate() {
    if (!this.ownSocketId || !this.partnerSocketId) {
      console.error('Socket IDs not available for role determination.');
      return;
    }

    // Simple lexical comparison to determine who is the offerer
    if (this.ownSocketId < this.partnerSocketId) {
      console.log('Role determined: Offerer');
      this.isOfferer = true;
      // Automatically initiate WebRTC connection as the offerer
      this.initiateWebRTCConnection();
    } else {
      console.log('Role determined: Answerer');
      this.isOfferer = false;
      // The answerer will wait for the offer to be received
    }
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
      } else if (state === 'disconnected' || state === 'failed') {
        this.connectionStateSubject.next('disconnected');
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

  // Handle WebRTC Offer (Answerer)
  async handleOffer(offer: RTCSessionDescriptionInit) {
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
      } else if (state === 'disconnected' || state === 'failed') {
        this.connectionStateSubject.next('disconnected');
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

  // Handle WebRTC Answer (Offerer)
  async handleAnswer(answer: RTCSessionDescriptionInit) {
    console.log('Handling received answer.');
    try {
      await this.peerConnection?.setRemoteDescription(new RTCSessionDescription(answer));
      this.connectionStateSubject.next('connected');
      console.log('Set remote description with answer. WebRTC connection established.');
    } catch (error) {
      console.error('Error setting remote description with answer:', error);
    }
  }

  // Handle ICE Candidate
  async handleIceCandidate(candidate: RTCIceCandidateInit) {
    console.log('Adding received ICE candidate.');
    try {
      await this.peerConnection?.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('Added ICE candidate.');
    } catch (error) {
      console.error('Error adding received ICE candidate:', error);
    }
  }

  // Increment vote count
  incrementVote(): void {
    const currentVotes = this.voteCountSubject.getValue();
    this.voteCountSubject.next(currentVotes + 1);
    console.log('Vote incremented:', currentVotes + 1);
  }

  ngOnDestroy(): void {
    // Cleanup subscriptions
    this.subscriptions.unsubscribe();

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
