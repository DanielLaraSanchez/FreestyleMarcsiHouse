import { Injectable } from '@angular/core';
import { default as io, Socket } from 'socket.io-client'; // Importing default
import { Observable } from 'rxjs';
import { Message } from '../models/message';

@Injectable({
  providedIn: 'root',
})
export class SignalingService {
  private socket: any; // Updated the type

  constructor() {
    this.socket = io('http://localhost:3000'); // Make sure the server URL is correct
  }

  sendMessage(tabId: string, message: Message): void {
    this.socket.emit('message', { tabId, message });
  }

  onMessage(): Observable<{ tabId: string; message: Message }> {
    return new Observable((observer) => {
      this.socket.on('message', (data: any) => {
        observer.next(data);
      });
    });
  }
}