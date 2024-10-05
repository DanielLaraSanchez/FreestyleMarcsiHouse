import {
  Component,
  OnInit,
  AfterViewChecked,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { User } from '../../../models/user';
import { Message } from '../../../models/message';
import { DeviceDetectorService } from '../../../services/device-detector.service';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ChatService } from '../../../services/chat.service';
import { ChatTab } from '../../../models/chat-tab';
import { UserActionsDialogComponent } from '../../../components/user-actions-dialog/user-actions-dialog.component';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { SignalingService } from '../../../services/signaling.service';
import { filter } from 'rxjs/operators';
import { Router } from '@angular/router';

@Component({
  selector: 'app-chat-page',
  templateUrl: './chat-page.component.html',
  styleUrls: ['./chat-page.component.css'],
  providers: [DialogService],
})
export class ChatPageComponent implements OnInit, AfterViewChecked {
  isMobile: boolean = false;
  isTablet: boolean = false;
  isDesktop: boolean = false;

  onlineUsers: User[] = [];
  newMessage: string = '';
  currentUser!: User;

  chatTabs: ChatTab[] = [];
  activeTabId: string = 'general'; // Default to 'general'
  selectedTab: ChatTab | undefined;

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  ref!: DynamicDialogRef;

  // Define a dummy user for the "General" channel
  generalUser: User = {
    _id: '-1', // Use _id instead of id
    name: 'General',
    profilePicture:
      'https://via.placeholder.com/150/000000/FFFFFF/?text=General',
    stats: {
      points: 0,
      votes: 0,
      battles: 0,
      wins: 0,
    },
    isOnline: true, // Assuming general is always online
  };

  // Added searchTerm for filtering chats
  searchTerm: string = '';

  constructor(
    private deviceService: DeviceDetectorService,
    public dialogService: DialogService,
    private chatService: ChatService,
    private userService: UserService,
    private authService: AuthService,
    private signalingService: SignalingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.deviceService.isMobile$.subscribe(
      (isMobile) => (this.isMobile = isMobile)
    );
    this.deviceService.isTablet$.subscribe(
      (isTablet) => (this.isTablet = isTablet)
    );
    this.deviceService.isDesktop$.subscribe(
      (isDesktop) => (this.isDesktop = isDesktop)
    );

    // Fetch current user
    const token = this.authService.getToken();
    if (token) {
      const decodedToken = this.authService.decodeToken(token);
      if (decodedToken && decodedToken.id) {
        this.userService.getUserById(decodedToken.id).subscribe({
          next: (user) => {
            this.currentUser = user;
            // Socket connection and user status setup
            this.signalingService.socketConnected$.subscribe(
              (isConnected) => {
                if (isConnected) {
                  // Fetch online users when socket connects
                  this.loadOnlineUsers();
                  // Set up real-time user status updates
                  this.setupUserStatusListeners();
                }
              }
            );
          },
          error: (error) => {
            console.error('Error fetching current user:', error);
            // Handle error, possibly redirect to login
            this.authService.logout();
            this.router.navigate(['/login']);
          },
        });
      } else {
        // Invalid token
        console.error('Invalid token');
        this.authService.logout();
        this.router.navigate(['/login']);
      }
    } else {
      // Handle case where there is no token
      console.error('No auth token found, redirecting to login.');
      this.router.navigate(['/login']);
    }

    // Subscribe to chatTabs from ChatService
    this.chatService.chatTabs$.subscribe({
      next: (tabs) => {
        this.chatTabs = tabs;
        this.updateSelectedTab();
      },
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private updateSelectedTab(): void {
    this.selectedTab = this.chatTabs.find(
      (tab) => tab.id === this.activeTabId
    );
  }

  scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  sendMessage() {
    const trimmedMessage = this.newMessage.trim();
    if (trimmedMessage && this.selectedTab) {
      const message: Message = {
        id: this.getNextMessageId(this.selectedTab.id),
        sender: this.currentUser,
        content: trimmedMessage,
        timestamp: new Date(),
      };

      // Instead of adding the message directly, rely on receiving it back from the server
      this.chatService.sendMessage(this.selectedTab.id, message);
      this.newMessage = '';
    }
  }

  trackByMessageId(index: number, message: Message): number | undefined {
    return message.id;
  }

  openUserActions(user: User) {
    this.ref = this.dialogService.open(UserActionsDialogComponent, {
      data: {
        user: user,
      },
      styleClass: 'dialog-freestyler',
      dismissableMask: true,
      closeOnEscape: true,
      draggable: false,
      resizable: false,
      width: '300px',
    });

    this.ref.onClose.subscribe((action: string) => {
      if (action === 'privateMessage') {
        this.openPrivateChat(user);
      } else if (action === 'viewProfile') {
        // Navigate to profile page when implemented
        alert(`Viewing profile of ${user.name}`);
      } else if (action === 'battleRequest') {
        // Handle battle request logic here
        alert(`Battle request sent to ${user.name}`);
      }
    });
  }

  openPrivateChat(user: User) {
    this.selectTab(user._id);
  }

  selectTab(tabId: string) {
    this.activeTabId = tabId;
    this.updateSelectedTab();

    if (!this.selectedTab) {
      // Tab doesn't exist; create it
      if (tabId === 'general') {
        // General tab should exist, but just in case
        this.selectedTab = { id: 'general', label: 'General', messages: [] };
      } else {
        const user = this.getUserById(tabId);
        const label = user?.name || 'Private Chat';
        const newTab: ChatTab = { id: tabId, label: label, messages: [] };
        this.chatService.addChatTab(newTab);

        // After adding, update selectedTab
        this.chatTabs = this.chatService.getChatTabs();
        this.updateSelectedTab();
      }
    }
  }

  deselectTab() {
    this.activeTabId = '';
    this.selectedTab = undefined;
  }

  getNextMessageId(tabId: string): number {
    const tab = this.chatTabs.find((t) => t.id === tabId);
    if (tab && tab.messages.length > 0) {
      return Math.max(...tab.messages.map((msg) => msg.id ?? 0)) + 1;
    }
    return 1;
  }

  getUserById(tabId: string): User | null {
    if (tabId === 'general') {
      return this.generalUser;
    }
    return this.onlineUsers.find((user) => user._id === tabId) || null;
  }

  getUserProfilePicture(tabId: string): string {
    if (tabId === 'general') {
      return this.generalUser.profilePicture;
    }
    const user = this.getUserById(tabId);
    return user && user.profilePicture
      ? user.profilePicture
      : 'https://via.placeholder.com/150';
  }

  getUserStatus(tabId: string): string {
    if (tabId === 'general') {
      return 'Always Online';
    }
    const user = this.getUserById(tabId);
    return user ? (user.isOnline ? 'Online' : 'Offline') : 'Unknown';
  }

  getLastMessage(tabId: string | undefined): string {
    if (!tabId) return 'No messages yet';
    const tab = this.chatTabs.find((t) => t.id === tabId);
    if (tab && tab.messages.length > 0) {
      return tab.messages[tab.messages.length - 1].content || '';
    }
    return 'No messages yet';
  }

  // Added getter for filtered users based on searchTerm
  get filteredUsers(): User[] {
    if (!this.searchTerm) {
      return this.onlineUsers;
    }
    const lowerSearch = this.searchTerm.toLowerCase();
    return this.onlineUsers.filter((user) =>
      user.name.toLowerCase().includes(lowerSearch)
    );
  }

  private loadOnlineUsers(): void {
    this.userService.getOnlineUsers().subscribe({
      next: (users) => {
        this.onlineUsers = users.filter(
          (user) => user._id !== this.currentUser._id
        );
      },
      error: (error) => {
        console.error('Error fetching online users:', error);
      },
    });
  }

  private setupUserStatusListeners(): void {
    this.signalingService.userStatus$.subscribe((status) => {
      // Fetch the updated list of online users
      this.loadOnlineUsers();
    });
  }
}
