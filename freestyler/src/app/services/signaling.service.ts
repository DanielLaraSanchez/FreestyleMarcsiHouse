import { Injectable } from '@angular/core';
import { default as io, Socket } from 'socket.io-client'; // Importing default
import { Observable } from 'rxjs';
import { Message } from '../models/message';
import { AuthService } from './auth.service';


@Injectable({
  providedIn: 'root',
})
export class SignalingService {
  private socket: any;

  constructor(private authService: AuthService) {
    const token = this.authService.getToken();

    this.socket = io('http://localhost:3000', {
      auth: {
        token: token,
      }
    });
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