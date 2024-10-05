import { Injectable } from '@angular/core';
import { default as io } from 'socket.io-client';
import { Observable, ReplaySubject, Subscription } from 'rxjs';
import { Message } from '../models/message';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class SignalingService {
  private socket: any;
  private isConnected = false;
  private onMessageSubject = new ReplaySubject<{ tabId: string; message: Message }>(1);
  private tokenSubscription!: Subscription;

  constructor(private authService: AuthService) {
    // Subscribe to token changes
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

    this.socket = io('http://localhost:3000', {
      auth: {
        token: token,
      },
    });
    this.isConnected = true;

    // Handle incoming messages
    this.socket.on('message', (data: any) => {
      this.onMessageSubject.next(data);
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
      this.socket = null;
    }
  }

  sendMessage(tabId: string, message: Message): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('message', { tabId, message });
    } else {
      console.error('Socket is not connected.');
    }
  }

  onMessage(): Observable<{ tabId: string; message: Message }> {
    return this.onMessageSubject.asObservable();
  }

  // Remember to clean up the subscription
  ngOnDestroy() {
    this.tokenSubscription.unsubscribe();
    this.disconnectSocket();
  }
}