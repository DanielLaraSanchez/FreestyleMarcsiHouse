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
    this.signalingService.onMessage().subscribe((data) => {
      this.receiveMessage(data);
    });
  }

  getChatTabs(): ChatTab[] {
    return this.chatTabsSubject.getValue();
  }

  addChatTab(tab: ChatTab) {
    const currentTabs = this.getChatTabs();
    this.chatTabsSubject.next([...currentTabs, tab]);
  }

  removeChatTab(tabId: string) {
    const currentTabs = this.getChatTabs().filter((tab) => tab.id !== tabId);
    this.chatTabsSubject.next(currentTabs);
  }

  addMessage(tabId: string | undefined, message: Message) {
    if (!tabId) return;
    const currentTabs = this.getChatTabs();
    const tabIndex = currentTabs.findIndex((tab) => tab.id === tabId);
    if (tabIndex !== -1) {
      currentTabs[tabIndex].messages.push(message);
      this.chatTabsSubject.next([...currentTabs]);
    }

    // Emit message via signaling service
    this.signalingService.sendMessage(tabId, message);
  }

  private receiveMessage(data: { tabId: string; message: Message }) {
    const { tabId, message } = data;
    const currentTabs = this.getChatTabs();
    const tabIndex = currentTabs.findIndex((tab) => tab.id === tabId);
    if (tabIndex !== -1) {
      currentTabs[tabIndex].messages.push(message);
    } else {
      // If the tab does not exist, create it
      this.addChatTab({
        id: tabId,
        label: tabId,
        messages: [message],
      });
    }
    this.chatTabsSubject.next([...currentTabs]);
  }
}