import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ChatTab } from '../models/chat-tab';
import { Message } from '../models/message';
import { SignalingService } from './signaling.service';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private chatTabsSubject = new BehaviorSubject<ChatTab[]>([]);
  chatTabs$ = this.chatTabsSubject.asObservable();

  constructor(private signalingService: SignalingService) {
    // Initialize with General Chat tab
    const initialTabs: ChatTab[] = [
      { id: 'general', label: 'General', messages: [] },
    ];
    this.chatTabsSubject.next(initialTabs);

    // Listen for messages from the signaling service
    this.signalingService.onMessage().subscribe({
      next: (data) => {
        const { tabId, message } = data;
        this.addMessageToTab(tabId, message);
      },
      error: (error) => {
        console.error('Error receiving message:', error);
      },
    });
  }

  private addMessageToTab(tabId: string, message: Message): void {
    // Access the current value of chatTabs
    const currentTabs = this.chatTabsSubject.getValue();
    let tab = currentTabs.find((t) => t.id === tabId);
    if (!tab) {
      // Create the tab if it doesn't exist
      tab = { id: tabId, label: tabId, messages: [] };
      currentTabs.push(tab);
    }
    tab.messages.push(message);
    // Emit the updated tabs
    this.chatTabsSubject.next([...currentTabs]);
  }

  getChatTabs(): ChatTab[] {
    return this.chatTabsSubject.getValue();
  }

  addChatTab(tab: ChatTab) {
    const currentTabs = this.chatTabsSubject.getValue();
    this.chatTabsSubject.next([...currentTabs, tab]);
  }

  removeChatTab(tabId: string) {
    const currentTabs = this.chatTabsSubject
      .getValue()
      .filter((tab) => tab.id !== tabId);
    this.chatTabsSubject.next(currentTabs);
  }

  addMessage(tabId: string | undefined, message: Message) {
    if (!tabId) return;
    const currentTabs = this.chatTabsSubject.getValue();
    let tab = currentTabs.find((t) => t.id === tabId);
    if (!tab) {
      // Create the tab if it doesn't exist
      tab = { id: tabId, label: tabId, messages: [] };
      currentTabs.push(tab);
    }
    tab.messages.push(message);
    this.chatTabsSubject.next([...currentTabs]);

    // Emit message via signaling service
    this.signalingService.sendMessage(tabId, message);
  }
}