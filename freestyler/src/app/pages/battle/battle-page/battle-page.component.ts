import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { DeviceDetectorService } from '../../../services/device-detector.service';

interface Battler {
  id: number;
  name: string;
  profilePicture: string;
  isOnline: boolean;
  isInBattlefield: boolean;
  stats: {
    points: number;
    votes: number;
    battles: number;
    wins: number;
  };
}

@Component({
  selector: 'app-battle-page',
  templateUrl: './battle-page.component.html',
  styleUrls: ['./battle-page.component.css']
})
export class BattlePageComponent implements OnInit, OnDestroy {

  battler1: Battler = {
    id: 1,
    name: 'MC Hammer',
    profilePicture: 'https://randomuser.me/api/portraits/men/1.jpg',
    isOnline: true,
    isInBattlefield: false,
    stats: {
      points: 100,
      votes: 50,
      battles: 10,
      wins: 5,
    },
  };

  battler2: Battler = {
    id: 2,
    name: 'Eminem',
    profilePicture: 'https://randomuser.me/api/portraits/men/2.jpg',
    isOnline: false,
    isInBattlefield: true,
    stats: {
      points: 200,
      votes: 120,
      battles: 30,
      wins: 20,
    },
  };

  isDesktop: boolean = false;
  isMobileView: boolean = false;
  subscriptions: Subscription = new Subscription();

  timer: number = 60; // Countdown from 60 seconds
  randomWord: string = 'Flow'; // Initial random word

  countdownInterval: any;
  wordInterval: any;

  backgroundBeat: string = 'beat1'; // Placeholder for selected beat

  constructor(private deviceDetectorService: DeviceDetectorService) {

    this.subscriptions.add(
      this.deviceDetectorService.isDesktop$.subscribe((isDesktop) => {
        console.log(isDesktop)
        this.isDesktop = isDesktop;
      })
    );

    this.subscriptions.add(
      this.deviceDetectorService.isMobile$.subscribe((isMobile) => {
        console.log(isMobile)
        this.isMobileView = isMobile;
      })
    );

  }

  ngOnInit(): void {
    // Start the countdown timer
    this.countdownInterval = setInterval(() => {
      if (this.timer > 0) {
        this.timer--;
      } else {
        clearInterval(this.countdownInterval);
      }
    }, 1000);

    // Update the random word every 10 seconds
    this.wordInterval = setInterval(() => {
      this.randomWord = this.getRandomWord();
    }, 10000);
  }

  ngOnDestroy(): void {
    // Clear intervals to prevent memory leaks
    clearInterval(this.countdownInterval);
    clearInterval(this.wordInterval);
  }

  // Mock function to get a random word
  getRandomWord(): string {
    const words = ['Flow', 'Rhythm', 'Verse', 'Beat', 'Mic', 'Bars', 'Cypher', 'Freestyle'];
    return words[Math.floor(Math.random() * words.length)];
  }

  calculateVotePercentage(battler: Battler): number {
    const totalVotes = this.battler1.stats.votes + this.battler2.stats.votes;
    if (totalVotes === 0) return 0;
    return (battler.stats.votes / totalVotes) * 100;
  }

  // Voting logic (mock)
  vote(battler: Battler): void {
    // Implement actual voting logic here
    alert(`You voted for ${battler.name}!`);
  }

  // Beat control logic (mock)
  toggleBeat(): void {
    // Implement actual beat control logic here
    this.backgroundBeat = this.backgroundBeat === 'beat1' ? 'beat2' : 'beat1';
    alert(`Beat ${this.backgroundBeat === 'beat1' ? 'Play' : 'Pause'} Toggled!`);
  }

}