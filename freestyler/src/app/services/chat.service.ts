import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { filter } from 'rxjs/operators';
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

    // Subscribe to incoming messages
    this.signalingService.onMessage$
      .pipe(filter((data) => data !== null))
      .subscribe((data) => {
        if (data) {
          const { tabId, message } = data;
          this.addMessageToTab(tabId, message);
        }
      });
  }

  private addMessageToTab(tabId: string, message: Message): void {
    const currentTabs = this.chatTabsSubject.getValue();
    let tab = currentTabs.find((t) => t.id === tabId);
    if (!tab) {
      // Create the tab if it doesn't exist
      const label =
        tabId === 'general'
          ? 'General'
          : message.sender?.name || 'Private Chat';
      tab = { id: tabId, label: label, messages: [] };
      currentTabs.push(tab);
    }
    tab.messages.push(message);
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

  sendMessage(tabId: string | undefined, message: Message) {
    if (!tabId) return;

    // Emit message via signaling service
    this.signalingService.sendMessage(tabId, message);
  }
}
