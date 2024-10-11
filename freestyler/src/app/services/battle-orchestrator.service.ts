import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { SignalingService } from './signaling.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class BattleOrchestratorService implements OnDestroy {
  // Existing Battle Subjects
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
  peerConnection!: RTCPeerConnection;
  remoteStream!: MediaStream | null;
  roomId!: string;
  partnerId!: string;

  // Subjects to emit WebRTC connection status and remote stream
  private connectionStateSubject = new BehaviorSubject<string>('disconnected');
  public connectionState$ = this.connectionStateSubject.asObservable();

  private remoteStreamSubject = new BehaviorSubject<MediaStream | null>(null);
  public remoteStream$ = this.remoteStreamSubject.asObservable();

  private battleFoundSubject = new Subject<{ roomId: string; partnerId: string }>();
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

  // Battle Found Subscription
  private battleFoundSubscription!: Subscription;

  // Incoming WebRTC Events Subscriptions
  private incomingOfferSubscription!: Subscription;
  private incomingAnswerSubscription!: Subscription;
  private incomingIceCandidateSubscription!: Subscription;

  private subscriptionBag: Subscription = new Subscription();

  // Local Stream
  localStream!: MediaStream;

  constructor(
    private signalingService: SignalingService,
    private authService: AuthService
  ) {
    // Subscribe to battle found events
    this.battleFoundSubscription = this.signalingService.battleFound$.subscribe((data) => {
      this.roomId = data.roomId;
      this.partnerId = data.partnerId;
      console.log(`Battle found! Room ID: ${this.roomId}, Partner ID: ${this.partnerId}`);
      // Do not automatically initiate WebRTC connection; wait for user to click "Start Battle"
    });
    this.subscriptionBag.add(this.battleFoundSubscription);

    // Subscribe to incoming WebRTC offers
    this.incomingOfferSubscription = this.signalingService.webrtcOffer$.subscribe((data) => {
      console.log('Received WebRTC offer:', data);
      this.handleOffer(data.offer);
    });
    this.subscriptionBag.add(this.incomingOfferSubscription);

    // Subscribe to incoming WebRTC answers
    this.incomingAnswerSubscription = this.signalingService.webrtcAnswer$.subscribe((data) => {
      console.log('Received WebRTC answer:', data);
      this.handleAnswer(data.answer);
    });
    this.subscriptionBag.add(this.incomingAnswerSubscription);

    // Subscribe to incoming ICE candidates
    this.incomingIceCandidateSubscription = this.signalingService.webrtcIceCandidate$.subscribe((data) => {
      console.log('Received ICE candidate:', data);
      this.handleIceCandidate(data.candidate);
    });
    this.subscriptionBag.add(this.incomingIceCandidateSubscription);
  }

  // Initialize local stream
  async initializeLocalStream() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      console.log('Local stream initialized.');
    } catch (error) {
      console.error('Error accessing media devices.', error);
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

    // Initialize local stream and start matchmaking
    await this.initializeLocalStream();
    this.signalingService.startRandomBattle();
    console.log('Matchmaking initiated.');
  }

  // Initiate WebRTC Connection
  async initiateWebRTCConnection() {
    this.connectionStateSubject.next('connecting');
    this.peerConnection = new RTCPeerConnection(this.iceConfig);

    // Add local stream tracks to the peer connection
    if (this.localStream) {
      console.log('Adding local stream tracks to peer connection.');
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
        this.remoteStreamSubject.next(this.remoteStream);
        console.log('Remote stream received.');
      }
      this.remoteStream.addTrack(event.track);
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalingService.sendWebRTCIceCandidate(this.roomId, event.candidate);
        console.log('Sent ICE candidate.');
      }
    };

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

  // Handle WebRTC Offer
  async handleOffer(offer: RTCSessionDescriptionInit) {
    console.log('Handling received offer.');
    this.connectionStateSubject.next('connecting');
    this.peerConnection = new RTCPeerConnection(this.iceConfig);

    // Add local stream tracks to the peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
        this.remoteStreamSubject.next(this.remoteStream);
        console.log('Remote stream received.');
      }
      this.remoteStream.addTrack(event.track);
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalingService.sendWebRTCIceCandidate(this.roomId, event.candidate);
        console.log('Sent ICE candidate.');
      }
    };

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.signalingService.sendWebRTCAnswer(this.roomId, answer);
      console.log('Sent WebRTC answer.');
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  // Handle WebRTC Answer
  async handleAnswer(answer: RTCSessionDescriptionInit) {
    console.log('Handling received answer.');
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      this.connectionStateSubject.next('connected');
      console.log('WebRTC connection established.');
    } catch (error) {
      console.error('Error setting remote description:', error);
    }
  }

  // Handle ICE Candidate
  async handleIceCandidate(candidate: RTCIceCandidateInit) {
    console.log('Adding received ICE candidate.');
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('Added ICE candidate.');
    } catch (error) {
      console.error('Error adding received ICE candidate:', error);
    }
  }

  // Increment vote count
  incrementVote(): void {
    const currentVotes = this.voteCountSubject.getValue();
    this.voteCountSubject.next(currentVotes + 1);
  }

  ngOnDestroy(): void {
    // Cleanup subscriptions
    this.subscriptionBag.unsubscribe();

    // Close WebRTC connection if it exists
    if (this.peerConnection) {
      this.peerConnection.close();
      console.log('Peer connection closed.');
    }

    // Stop all media tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      console.log('Local media tracks stopped.');
    }

    // Existing battle cleanup handled by the component
  }
}
