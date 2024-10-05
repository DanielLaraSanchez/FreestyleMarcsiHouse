import { Message } from './message';

export interface ChatTab {
  id: string;
  label: string | undefined;
  messages: Message[];
}