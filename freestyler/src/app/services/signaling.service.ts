import { Injectable, OnDestroy } from '@angular/core';
import { default as io, Socket } from 'socket.io-client';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { Message } from '../models/message';
import { AuthService } from './auth.service';

const SOCKET_URL = 'http://localhost:3000'; // Adjust if different

@Injectable({
  providedIn: 'root',
})
export class SignalingService implements OnDestroy {
  private socket: any;
  private isConnected = false;

  // Subjects to emit socket connection status and user status updates
  private socketConnectedSubject = new BehaviorSubject<boolean>(false);
  public socketConnected$ = this.socketConnectedSubject.asObservable();

  private userStatusSubject = new Subject<{ status: string; userId: string }>();
  public userStatus$ = this.userStatusSubject.asObservable();

  private onMessageSubject = new Subject<{ tabId: string; message: Message }>();
  public onMessage$ = this.onMessageSubject.asObservable();

  // Subjects for WebRTC Battle Events
  private battleFoundSubject = new Subject<{ roomId: string; partnerId: string }>();
  public battleFound$ = this.battleFoundSubject.asObservable();

  private webrtcOfferSubject = new Subject<any>();
  public webrtcOffer$ = this.webrtcOfferSubject.asObservable();

  private webrtcAnswerSubject = new Subject<any>();
  public webrtcAnswer$ = this.webrtcAnswerSubject.asObservable();

  private webrtcIceCandidateSubject = new Subject<any>();
  public webrtcIceCandidate$ = this.webrtcIceCandidateSubject.asObservable();

  private tokenSubscription!: Subscription;

  constructor(private authService: AuthService) {
    // Subscribe to authentication status changes
    this.tokenSubscription = this.authService.token$.subscribe((token) => {
      if (token) {
        this.connectSocket(token);
      } else {
        this.disconnectSocket();
      }
    });
  }

  private connectSocket(token: string) {
    if (this.isConnected) {
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
      console.log('Socket connected:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.socketConnectedSubject.next(false);
      console.log('Socket disconnected');
    });

    // Handle user online/offline status updates
    this.socket.on('userOnline', (data: any) => {
      const { userId } = data;
      this.userStatusSubject.next({ status: 'online', userId });
    });

    this.socket.on('userOffline', (data: any) => {
      const { userId } = data;
      this.userStatusSubject.next({ status: 'offline', userId });
    });

    // Handle incoming messages
    this.socket.on('message', (data: any) => {
      this.onMessageSubject.next(data);
    });

    // Handle battle found event
    this.socket.on('battleFound', (data: any) => {
      this.battleFoundSubject.next(data);
    });

    // Handle WebRTC signaling events
    this.socket.on('webrtc_offer', (data: any) => {
      this.webrtcOfferSubject.next(data);
    });

    this.socket.on('webrtc_answer', (data: any) => {
      this.webrtcAnswerSubject.next(data);
    });

    this.socket.on('webrtc_ice_candidate', (data: any) => {
      this.webrtcIceCandidateSubject.next(data);
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
      this.socket = undefined as any;
      console.log('Socket disconnected');
    }
  }

  // Existing Chat Methods
  sendMessage(tabId: string, message: Message): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('message', { tabId, message });
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

  sendWebRTCOffer(roomId: string, offer: any): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('webrtc_offer', { roomId, offer });
      console.log('Sent WebRTC offer.');
    } else {
      console.error('Socket is not connected.');
    }
  }

  sendWebRTCAnswer(roomId: string, answer: any): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('webrtc_answer', { roomId, answer });
      console.log('Sent WebRTC answer.');
    } else {
      console.error('Socket is not connected.');
    }
  }

  sendWebRTCIceCandidate(roomId: string, candidate: any): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('webrtc_ice_candidate', { roomId, candidate });
      console.log('Sent ICE candidate.');
    } else {
      console.error('Socket is not connected.');
    }
  }

  ngOnDestroy() {
    if (this.tokenSubscription) {
      this.tokenSubscription.unsubscribe();
    }
    this.disconnectSocket();
  }
}
