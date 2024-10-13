import { Injectable, OnDestroy } from '@angular/core';
import { default as io, Socket } from 'socket.io-client';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { Message } from '../models/message';
import { AuthService } from './auth.service';

const SOCKET_URL = 'http://localhost:3000'; // Adjust if different

interface BattleFoundData {
  roomId: string;
  partnerSocketId: string;
}

@Injectable({
  providedIn: 'root',
})
export class SignalingService implements OnDestroy {
  private socket: any = null;
  private isConnected = false;

  // Expose the client's own socket ID
  private ownSocketIdSubject = new BehaviorSubject<string>('');
  public ownSocketId$ = this.ownSocketIdSubject.asObservable();

  // Subjects to emit socket connection status and user status updates
  private socketConnectedSubject = new BehaviorSubject<boolean>(false);
  public socketConnected$ = this.socketConnectedSubject.asObservable();

  private userStatusSubject = new Subject<{ status: string; userId: string }>();
  public userStatus$ = this.userStatusSubject.asObservable();

  private onMessageSubject = new Subject<{ tabId: string; message: Message }>();
  public onMessage$ = this.onMessageSubject.asObservable();

  // Subjects for WebRTC Battle Events
  private battleFoundSubject = new Subject<BattleFoundData>();
  public battleFound$ = this.battleFoundSubject.asObservable();

  private webrtcOfferSubject = new Subject<RTCSessionDescriptionInit>();
  public webrtcOffer$ = this.webrtcOfferSubject.asObservable();

  private webrtcAnswerSubject = new Subject<RTCSessionDescriptionInit>();
  public webrtcAnswer$ = this.webrtcAnswerSubject.asObservable();

  private webrtcIceCandidateSubject = new Subject<RTCIceCandidateInit>();
  public webrtcIceCandidate$ = this.webrtcIceCandidateSubject.asObservable();

  private subscriptions = new Subscription();

  constructor(private authService: AuthService) {
    // Subscribe to authentication status changes
    const authSubscription = this.authService.token$.subscribe((token) => {
      if (token) {
        this.connectSocket(token);
      } else {
        this.disconnectSocket();
      }
    });
    this.subscriptions.add(authSubscription);
  }

  private connectSocket(token: string) {
    if (this.isConnected && this.socket) {
      return; // Already connected
    }

    if (!token) {
      console.error('No token found, cannot connect socket.');
      return;
    }

    this.socket = io(SOCKET_URL, {
      query: {
        token: token,
      },
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.socketConnectedSubject.next(true);
      console.log('Socket connected:', this.socket?.id);
      if (this.socket) {
        this.ownSocketIdSubject.next(this.socket.id); // Emit own socket.id
      }
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.socketConnectedSubject.next(false);
      console.log('Socket disconnected');
      this.ownSocketIdSubject.next(''); // Reset own socket ID
    });

    // Handle user online/offline status updates
    this.socket.on('userOnline', (data: { userId: string }) => {
      const { userId } = data;
      this.userStatusSubject.next({ status: 'online', userId });
      console.log(`User Online: ${userId}`);
    });

    this.socket.on('userOffline', (data: { userId: string }) => {
      const { userId } = data;
      this.userStatusSubject.next({ status: 'offline', userId });
      console.log(`User Offline: ${userId}`);
    });

    // Handle incoming messages
    this.socket.on('message', (data: { tabId: string; message: Message }) => {
      this.onMessageSubject.next(data);
      console.log('Received message:', data);
    });

    // Handle battle found event
    this.socket.on('battleFound', (data: BattleFoundData) => {
      this.battleFoundSubject.next(data);
      console.log('Received battleFound event:', data);
    });

    // Handle WebRTC signaling events
    this.socket.on('webrtc_offer', (data: { offer: RTCSessionDescriptionInit }) => {
      if (data.offer) {
        this.webrtcOfferSubject.next(data.offer);
        console.log('Received WebRTC offer:', data.offer);
      }
    });

    this.socket.on('webrtc_answer', (data: { answer: RTCSessionDescriptionInit }) => {
      if (data.answer) {
        this.webrtcAnswerSubject.next(data.answer);
        console.log('Received WebRTC answer:', data.answer);
      }
    });

    this.socket.on('webrtc_ice_candidate', (data: { candidate: RTCIceCandidateInit }) => {
      if (data.candidate) {
        this.webrtcIceCandidateSubject.next(data.candidate);
        console.log('Received ICE candidate:', data.candidate);
      }
    });

    // Handle socket errors if needed
    this.socket.on('connect_error', (err: any) => {
      console.error('Socket connection error:', err);
    });
  }

  private disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
      this.socketConnectedSubject.next(false);
      this.socket = null;
      console.log('Socket disconnected');
    }
  }

  // Existing Chat Methods
  sendMessage(tabId: string, message: Message): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('message', { tabId, message });
      console.log('Sent message:', { tabId, message });
    } else {
      console.error('Socket is not connected.');
    }
  }

  // New Battle and WebRTC Methods
  startRandomBattle(): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('startRandomBattle');
      console.log('Requested to start a random battle.');
    } else {
      console.error('Socket is not connected.');
    }
  }

  sendWebRTCOffer(roomId: string, offer: RTCSessionDescriptionInit): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('webrtc_offer', { roomId, offer });
      console.log('Sent WebRTC offer.');
    } else {
      console.error('Socket is not connected.');
    }
  }

  sendWebRTCAnswer(roomId: string, answer: RTCSessionDescriptionInit): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('webrtc_answer', { roomId, answer });
      console.log('Sent WebRTC answer.');
    } else {
      console.error('Socket is not connected.');
    }
  }

  sendWebRTCIceCandidate(roomId: string, candidate: RTCIceCandidateInit): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('webrtc_ice_candidate', { roomId, candidate });
      console.log('Sent ICE candidate.');
    } else {
      console.error('Socket is not connected.');
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.disconnectSocket();
  }
}
