import { User } from "./user";

export interface Message {
id?: number;
  sender?: User;
  content?: string;
  timestamp?: Date;
}
