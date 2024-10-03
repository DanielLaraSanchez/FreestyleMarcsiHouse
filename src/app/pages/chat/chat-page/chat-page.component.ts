import { Component, OnInit, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { User } from '../../../models/user';
import { Message } from '../../../models/message';
import { users } from '../../../data/users';
import { DeviceDetectorService } from '../../../services/device-detector.service';

@Component({
  selector: 'app-chat-page',
  templateUrl: './chat-page.component.html',
  styleUrl: './chat-page.component.css'
})
export class ChatPageComponent implements OnInit, AfterViewChecked {
  isMobile: boolean = false;
  isTablet: boolean = false;
  isDesktop: boolean = false;

  onlineUsers: User[] = [];
  messages: Message[] = [];
  newMessage: string = '';
  currentUser: User;

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  constructor(private deviceService: DeviceDetectorService) {
    // Set the current user (replace with actual authentication logic)
    this.currentUser = {
      id: 0,
      name: 'Me',
      profilePicture: 'https://randomuser.me/api/portraits/men/0.jpg',
      stats: {
        points: 0,
        votes: 0,
        battles: 0,
        wins: 0,
      },
    };
  }

  ngOnInit(): void {
    this.deviceService.isMobile$.subscribe((isMobile) => (this.isMobile = isMobile));
    this.deviceService.isTablet$.subscribe((isTablet) => (this.isTablet = isTablet));
    this.deviceService.isDesktop$.subscribe((isDesktop) => (this.isDesktop = isDesktop));

    // Initialize online users with mock data
    this.onlineUsers = users.filter((user) => user.isOnline);

    // Initialize messages with mock data
    this.messages = this.messages;
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }

  sendMessage() {
    const trimmedMessage = this.newMessage.trim();
    if (trimmedMessage) {
      const message: Message = {
        id: this.messages.length + 1,
        sender: this.currentUser,
        content: trimmedMessage,
        timestamp: new Date(),
      };
      this.messages.push(message);
      this.newMessage = '';
    }
  }

  trackByMessageId(index: number, message: Message): number | undefined {
    return message.id;
  }

  viewUserProfile(user: User) {
    // Logic to view user profile or initiate private chat
    alert(`Viewing profile of ${user.name}`);
  }
}