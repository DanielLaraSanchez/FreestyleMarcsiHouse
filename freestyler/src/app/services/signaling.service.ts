import { Injectable, OnDestroy } from '@angular/core';
import { default as io, Socket } from 'socket.io-client';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { Message } from '../models/message';
import { AuthService } from './auth.service';
import { BattleFoundData } from '../models/battle-found-data';

const SOCKET_URL = 'http://localhost:3000'; // Prefer environment variable

@Injectable({
  providedIn: 'root',
})
export class SignalingService implements OnDestroy {
  private socket: any = null;
  private isConnected = false;

  // Observables
  private ownSocketIdSubject = new BehaviorSubject<string>('');
  public ownSocketId$ = this.ownSocketIdSubject.asObservable();

  private socketConnectedSubject = new BehaviorSubject<boolean>(false);
  public socketConnected$ = this.socketConnectedSubject.asObservable();

  private userStatusSubject = new Subject<{ status: string; userId: string }>();
  public userStatus$ = this.userStatusSubject.asObservable();

  private onMessageSubject = new Subject<{ tabId: string; message: Message }>();
  public onMessage$ = this.onMessageSubject.asObservable();

  private battleFoundSubject = new Subject<BattleFoundData>();
  public battleFound$ = this.battleFoundSubject.asObservable();

  private webrtcOfferSubject = new Subject<RTCSessionDescriptionInit>();
  public webrtcOffer$ = this.webrtcOfferSubject.asObservable();

  private webrtcAnswerSubject = new Subject<RTCSessionDescriptionInit>();
  public webrtcAnswer$ = this.webrtcAnswerSubject.asObservable();

  private webrtcIceCandidateSubject = new Subject<RTCIceCandidateInit>();
  public webrtcIceCandidate$ = this.webrtcIceCandidateSubject.asObservable();

  private partnerDisconnectedSubject = new Subject<void>();
  public partnerDisconnected$ = this.partnerDisconnectedSubject.asObservable();

  private partnerHangUpSubject = new Subject<void>();
  public partnerHangUp$ = this.partnerHangUpSubject.asObservable();

  private battleStartSubject = new Subject<void>();
  public battleStart$ = this.battleStartSubject.asObservable();

  private subscriptions = new Subscription();

  constructor(private authService: AuthService) {
    const authSubscription = this.authService.token$.subscribe((token) => {
      if (token) {
        this.connectSocket(token);
      } else {
        this.disconnectSocket();
      }
    });
    this.subscriptions.add(authSubscription);
  }

  private connectSocket(token: string): void {
    if (this.socket && this.isConnected) {
      console.warn(
        'Existing socket detected. Disconnecting for a fresh connection.'
      );
      this.disconnectSocket();
    }

    this.socket = io(SOCKET_URL, {
      query: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.socketConnectedSubject.next(true);
      console.log(`Socket connected: ${this.socket?.id}`);
      this.ownSocketIdSubject.next(this.socket?.id || '');
    });

    this.socket.on('disconnect', (reason: string) => {
      this.isConnected = false;
      this.socketConnectedSubject.next(false);
      console.log(`Socket disconnected: ${reason}`);
      this.ownSocketIdSubject.next('');
    });

    // User status events
    this.socket.on('userOnline', (data: { userId: string }) => {
      this.userStatusSubject.next({ status: 'online', userId: data.userId });
      console.log(`User online: ${data.userId}`);
    });

    this.socket.on('userOffline', (data: { userId: string }) => {
      this.userStatusSubject.next({ status: 'offline', userId: data.userId });
      console.log(`User offline: ${data.userId}`);
    });

    // Message events
    this.socket.on('message', (data: { tabId: string; message: Message }) => {
      this.onMessageSubject.next(data);
      console.log('Received message:', data);
    });

    // Battle events
    this.socket.on('battleFound', (data: any) => {
      this.battleFoundSubject.next(data);
      console.log('Battle found:', data);
    });

    this.socket.on('battleStart', () => {
      console.log('Battle started!');
      this.battleStartSubject.next();
    });

    // WebRTC signaling events
    this.socket.on(
      'webrtc_offer',
      (data: { offer: RTCSessionDescriptionInit }) => {
        if (data.offer) {
          this.webrtcOfferSubject.next(data.offer);
          console.log('Received WebRTC offer.');
        }
      }
    );

    this.socket.on(
      'webrtc_answer',
      (data: { answer: RTCSessionDescriptionInit }) => {
        if (data.answer) {
          this.webrtcAnswerSubject.next(data.answer);
          console.log('Received WebRTC answer.');
        }
      }
    );

    this.socket.on(
      'webrtc_ice_candidate',
      (data: { candidate: RTCIceCandidateInit }) => {
        if (data.candidate) {
          this.webrtcIceCandidateSubject.next(data.candidate);
          console.log('Received ICE candidate.');
        }
      }
    );

    // Partner events
    this.socket.on('partnerDisconnected', () => {
      console.log('Partner disconnected.');
      this.partnerDisconnectedSubject.next();
      const battleFoundData: BattleFoundData = {
        roomId: '',
        partner: {
          name: '',
          profilePicture: '',
          socketId: '',
          userId: '',
        },
      };
      this.battleFoundSubject.next(battleFoundData);
    });

    this.socket.on('partnerHangUp', () => {
      console.log('Partner hung up.');
      this.partnerHangUpSubject.next();
      const battleFoundData: BattleFoundData = {
        roomId: '',
        partner: {
          name: '',
          profilePicture: '',
          socketId: '',
          userId: '',
        },
      };
      this.battleFoundSubject.next(battleFoundData);
    });

    // Errors
    this.socket.on('connect_error', (error: any) => {
      console.error('Socket connection error:', error);
    });

    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error);
    });
  }

  private disconnectSocket(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
      this.socketConnectedSubject.next(false);
      this.ownSocketIdSubject.next('');
      console.log('Socket disconnected and state reset.');
      this.socket = null;
    }
  }

  // Chat Methods
  sendMessage(tabId: string, message: Message): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('message', { tabId, message });
      console.log('Sent message:', { tabId, message });
    } else {
      console.error('Socket is not connected.');
    }
  }

  // Battle and WebRTC Methods
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

  emitReadyToStart(): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('readyToStart');
      console.log('Emitted readyToStart event.');
    } else {
      console.error('Socket is not connected.');
    }
  }

  /**
   * Emits a 'hangUp' event to the server.
   */
  public hangUp(): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('hangUp');
      console.log('Emitted hangUp event.');
    } else {
      console.error('Socket is not connected.');
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.disconnectSocket();
  }
}
