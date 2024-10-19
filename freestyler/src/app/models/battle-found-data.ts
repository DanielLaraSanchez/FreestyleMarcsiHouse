export interface BattleFoundData {
  roomId: string;
  partner: {
    userId: string;
    socketId: string;
    name: string;
    profilePicture: string;
  };
}
