import { Injectable } from '@angular/core';
import { default as io, Socket } from 'socket.io-client';
import { Observable, ReplaySubject } from 'rxjs';
import { Message } from '../models/message';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class SignalingService {
  private socket!: typeof Socket;
  private isConnected = false;
  private socketSubject = new ReplaySubject<typeof Socket>(1);

  constructor(private authService: AuthService) {
    // Subscribe to token changes
    this.authService.token$.subscribe((token) => {
      if (token) {
        this.connectSocket(token);
      } else if (this.isConnected) {
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

    // Emit the socket to subscribers
    this.socketSubject.next(this.socket);
  }

  private disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
    }
  }

  sendMessage(tabId: string, message: Message): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('message', { tabId, message });
    } else {
      console.error('Socket is not connected.');
    }
  }

  private onMessageSubject = new ReplaySubject<{ tabId: string; message: Message }>(1);

  onMessage(): Observable<{ tabId: string; message: Message }> {
    return this.onMessageSubject.asObservable();
  }
}