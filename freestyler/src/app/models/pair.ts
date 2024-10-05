import { User } from './user';

export interface Pair {
  id: number;
  user1: User;
  user2?: User;
  status: string;
}
