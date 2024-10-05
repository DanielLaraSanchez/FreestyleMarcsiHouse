import { Injectable, OnDestroy } from '@angular/core';
import { default as io } from 'socket.io-client';
import { BehaviorSubject, ReplaySubject, Subscription } from 'rxjs';
import { Message } from '../models/message';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class SignalingService implements OnDestroy {
  private socket!: any;
  private isConnected = false;

  // Subjects to emit socket connection status and user status updates
  private socketConnectedSubject = new BehaviorSubject<boolean>(false);
  public socketConnected$ = this.socketConnectedSubject.asObservable();

  private userStatusSubject = new ReplaySubject<{ userId: string; status: string }>(1);
  public userStatus$ = this.userStatusSubject.asObservable();

  private onMessageSubject = new ReplaySubject<{ tabId: string; message: Message }>(1);
  public onMessage$ = this.onMessageSubject.asObservable();

  private onlineUsersSubject = new BehaviorSubject<string[]>([]);
  public onlineUsers$ = this.onlineUsersSubject.asObservable();

  private tokenSubscription!: Subscription;

  constructor(private authService: AuthService) {
    // Subscribe to authentication status changes
    this.tokenSubscription = this.authService.token$.subscribe((token) => {
      if (token) {
        this.connectSocket();
      } else {
        this.disconnectSocket();
      }
    });
  }

  private connectSocket() {
    if (this.isConnected) {
      return; // Already connected
    }

    const userId = this.authService.getCurrentUserId();
    console.log(userId)
    if (!userId) {
      console.error('No userId found, cannot connect socket.');
      return;
    }

    this.socket = io('http://localhost:3000', {
      auth: {
        userId: userId,
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

    // Handle incoming messages
    this.socket.on('message', (data: any) => {
      this.onMessageSubject.next(data);
    });

    // Handle user online/offline status updates
    this.socket.on('userOnline', (data: any) => {
      console.log("its workinggggg")
      const { userId } = data;
      this.userStatusSubject.next({ userId, status: 'online' });
    });

    this.socket.on('userOffline', (data: any) => {
      const { userId } = data;
      this.userStatusSubject.next({ userId, status: 'offline' });
    });

    // Handle online users list
    this.socket.on('onlineUsers', (data: any) => {
      console.log(data.onlineUsers)
      this.onlineUsersSubject.next(data.onlineUsers);
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

  sendMessage(tabId: string, message: Message): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('message', { tabId, message });
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
