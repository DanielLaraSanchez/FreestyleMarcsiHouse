import { Stats } from './stats';

export interface User {
  _id: string; // MongoDB uses _id
  name: string;
  profilePicture: string;
  stats: Stats;
  isOnline?: boolean;
  status?: string;
  isInBattlefield?: boolean;
}
