import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ChatTab } from '../models/chat-tab';
import { Message } from '../models/message';
import { User } from '../models/user';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private chatTabsSubject = new BehaviorSubject<ChatTab[]>([]);
  chatTabs$ = this.chatTabsSubject.asObservable();

  constructor() {
    // Initialize with General Chat tab
    const initialTabs: ChatTab[] = [
      { id: 'general', label: 'General', messages: [] }
    ];
    this.chatTabsSubject.next(initialTabs);
  }

  getChatTabs(): ChatTab[] {
    return this.chatTabsSubject.getValue();
  }

  addChatTab(tab: ChatTab) {
    const currentTabs = this.getChatTabs();
    this.chatTabsSubject.next([...currentTabs, tab]);
  }

  removeChatTab(tabId: string) {
    const currentTabs = this.getChatTabs().filter(tab => tab.id !== tabId);
    this.chatTabsSubject.next(currentTabs);
  }

  addMessage(tabId: string | undefined, message: Message) {
    if (!tabId) return;
    const currentTabs = this.getChatTabs();
    const tabIndex = currentTabs.findIndex(tab => tab.id === tabId);
    if (tabIndex !== -1) {
      currentTabs[tabIndex].messages.push(message);
      this.chatTabsSubject.next([...currentTabs]);
    }
  }
}