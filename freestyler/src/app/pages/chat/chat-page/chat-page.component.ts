import { Component, OnInit, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { User } from '../../../models/user';
import { Message } from '../../../models/message';
import { users } from '../../../data/users';
import { DeviceDetectorService } from '../../../services/device-detector.service';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ChatService } from '../../../services/chat.service';
import { ChatTab } from '../../../models/chat-tab';
import { UserActionsDialogComponent } from '../../../components/user-actions-dialog/user-actions-dialog.component';

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
  currentUser: User;

  chatTabs: ChatTab[] = [];
  activeTabId: string = 'general'; // Default to 'general'
  selectedTab: ChatTab | undefined;

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  ref!: DynamicDialogRef;

  // Define a dummy user for the "General" channel
  generalUser: User = {
    id: -1,
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
    private chatService: ChatService
  ) {
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
      isOnline: true, // Assuming current user is online
    };
  }

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

    // Initialize online users with mock data, excluding the "General" user
    this.onlineUsers = users.filter(
      (user) => user.isOnline && user.id !== this.generalUser.id
    );

    // Subscribe to chatTabs from ChatService
    this.chatService.chatTabs$.subscribe((tabs) => {
      this.chatTabs = tabs;
      this.selectedTab = this.chatTabs.find(
        (tab) => tab.id === this.activeTabId
      );
      // If the activeTabId no longer exists, reset to 'general'
      if (!this.selectedTab) {
        this.activeTabId = 'general';
        this.selectedTab = this.chatTabs.find((tab) => tab.id === 'general');
      }
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  sendMessage(tabId: string | null = null) {
    const targetTabId = tabId ? tabId : this.activeTabId;
    const trimmedMessage = this.newMessage.trim();
    if (trimmedMessage && this.selectedTab) {
      const message: Message = {
        id: this.getNextMessageId(this.selectedTab.id),
        sender: this.currentUser,
        content: trimmedMessage,
        timestamp: new Date(),
      };

      this.chatService.addMessage(targetTabId, message);
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
    // Set the active tab to the selected user's chat
    this.activeTabId = user.id.toString();
    this.selectedTab = this.chatTabs.find(
      (tab) => tab.id === this.activeTabId
    );
    if (!this.selectedTab) {
      // If the tab doesn't exist, create it
      this.chatService.addChatTab({
        id: user.id.toString(),
        label: user.name,
        messages: [],
      });
      this.selectedTab = this.chatTabs.find(
        (tab) => tab.id === this.activeTabId
      );
    }
  }

  selectTab(tabId: string) {
    this.activeTabId = tabId;
    this.selectedTab = this.chatTabs.find((tab) => tab.id === tabId);
  }

  closeTab(tabId: string) {
    // Removed close functionality as per user request
  }

  getNextMessageId(tabId: string): number {
    const tab = this.chatTabs.find((t) => t.id === tabId);
    if (tab && tab.messages.length > 0) {
      return Math.max(...tab.messages.map((msg) => msg.id ?? 0)) + 1;
    }
    return 1;
  }

  getUserById(tabId: string): User {
    if (tabId === 'general') {
      return this.generalUser;
    }
    const userId = parseInt(tabId, 10);
    const user = users.find((user) => user.id === userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    return user;
  }

  getUserProfilePicture(tabId: string): string {
    if (tabId === 'general') {
      return this.generalUser.profilePicture;
    }
    const user = this.getUserById(tabId);
    return user ? user.profilePicture : 'https://via.placeholder.com/150';
  }

  getUserStatus(tabId: string): string {
    if (tabId === 'general') {
      return 'Always Online';
    }
    const user = this.getUserById(tabId);
    return user ? (user.isOnline ? 'Online' : 'Offline') : '';
  }

  getLastMessage(tabId: string | undefined): string {
    if (!tabId) return 'No messages yet';
    const tab = this.chatTabs.find((t) => t.id === tabId);
    if (tab && tab.messages.length > 0) {
      return tab.messages[tab.messages.length - 1].content || '';
    }
    return 'No messages yet';
  }

  toggleNotifications() {
    // Implement notification toggle logic
    alert('Notification toggle clicked');
  }

  deselectTab() {
    this.activeTabId = '';
    this.selectedTab = undefined;
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
}