export const pairs = [
  {
    id: 1,
    user1: {
      _id: "1",
      name: 'MC Hammer',
      profilePicture: 'https://randomuser.me/api/portraits/men/1.jpg',
      stats: {
        points: 100,
        votes: 50,
        battles: 10,
        wins: 5,
      },
      isOnline: true,
      status: 'Available',
    },
    user2: {
      _id: "2",
      name: 'Eminem',
      profilePicture: 'https://randomuser.me/api/portraits/men/2.jpg',
      stats: {
        points: 200,
        votes: 120,
        battles: 30,
        wins: 20,
      },
      isOnline: false,
      status: 'Busy',
    },
    status: 'Battling',
  },
  {
    id: 2,
    user1: {
      _id: "3",
      name: 'Jay-Z',
      profilePicture: 'https://randomuser.me/api/portraits/men/3.jpg',
      stats: {
        points: 300,
        votes: 180,
        battles: 40,
        wins: 25,
      },
      isOnline: true,
      status: 'Available',
    },
    user2: {
      _id: "4",
      name: 'Kendrick Lamar',
      profilePicture: 'https://randomuser.me/api/portraits/men/4.jpg',
      stats: {
        points: 150,
        votes: 90,
        battles: 20,
        wins: 10,
      },
      isOnline: true,
      status: 'In Game',
    },
    status: 'Waiting for Acceptance',
  },
  // Add more pairs as needed
];
