import {
  Component, OnInit, OnDestroy, ViewChild, ElementRef
} from '@angular/core';
import { Subscription } from 'rxjs';
import { BattleOrchestratorService } from '../../../services/battle-orchestrator.service';
import {
  heartBeatAnimation,
  rubberBandAnimation,
  tadaAnimation
} from 'angular-animations';

@Component({
  selector: 'app-battle-page',
  templateUrl: './battle-page.component.html',
  styleUrls: ['./battle-page.component.css'],
  animations: [heartBeatAnimation(), rubberBandAnimation(), tadaAnimation()] // Use only heartBeatAnimation
})
export class BattlePageComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement1') videoElement1!: ElementRef<HTMLVideoElement>;
  @ViewChild('videoElement2') videoElement2!: ElementRef<HTMLVideoElement>;
  stream!: MediaStream;

  // Timer Properties
  timeLeft: number = 60;
  timerSubscription!: Subscription;

  // Current Turn and Word
  currentTurn: string = 'Player 1';
  word: string = '';

  // Additional Properties
  rapperName: string = 'Player 1';
  viewerCount: number = 100;
  voteCount: number = 0;

  // Voting State
  hasVoted: boolean = false;
  triggerHeartBeat: boolean = false; // Animation trigger

  constructor(private battleService: BattleOrchestratorService) {}

  ngOnInit(): void {
    this.startCamera();
    this.battleService.startBattle();

    this.timerSubscription = this.battleService.timeLeft$.subscribe(time => {
      this.timeLeft = time;
    });

    this.battleService.currentTurn$.subscribe(turn => {
      this.currentTurn = turn;
      this.updateRapperData(turn);
    });

    this.battleService.currentWord$.subscribe(word => {
      this.word = word;
    });

    this.battleService.viewerCount$.subscribe(count => {
      this.viewerCount = count;
    });

    this.battleService.voteCount$.subscribe(count => {
      this.voteCount = count;
    });
  }

  ngOnDestroy(): void {
    this.stopCamera();
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
    this.battleService.ngOnDestroy();
  }

  startCamera(): void {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        this.stream = stream;
        this.videoElement1.nativeElement.srcObject = stream;
        this.videoElement2.nativeElement.srcObject = stream;
      })
      .catch(error => {
        console.error('Error accessing media devices.', error);
      });
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  }

  hangUp(): void {
    this.stopCamera();
    alert('You have ended the battle.');
  }

  thumbsUp(): void {
    // if (this.hasVoted) {
    //   alert('You have already voted!');
    //   return;
    // }

    this.battleService.incrementVote();

    // Trigger heartBeat animation
    this.triggerHeartBeat = !this.triggerHeartBeat;

    this.hasVoted = true;
  }

  updateRapperData(turn: string): void {
    this.rapperName = turn;
  }

  get formattedTime(): string {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    return `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
  }
}
