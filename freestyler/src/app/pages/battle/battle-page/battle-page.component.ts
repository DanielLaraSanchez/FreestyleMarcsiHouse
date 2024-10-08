import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { BattleOrchestratorService } from '../../../services/battle-orchestrator.service';

@Component({
  selector: 'app-battle-page',
  templateUrl: './battle-page.component.html',
  styleUrls: ['./battle-page.component.css']
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

  // Voting State
  hasVoted: boolean = false;

  constructor(private battleService: BattleOrchestratorService) { }

  ngOnInit(): void {
    this.startCamera();
    this.battleService.startBattle();

    this.timerSubscription = this.battleService.timeLeft$.subscribe(time => {
      this.timeLeft = time;
    });

    this.battleService.currentTurn$.subscribe(turn => {
      this.currentTurn = turn;
    });

    this.battleService.currentWord$.subscribe(word => {
      this.word = word;
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

  // Voting Method
  vote(): void {
    if (this.hasVoted) {
      alert('You have already voted!');
      return;
    }

    // Implement actual voting logic here (e.g., send vote to backend)
    alert('Thank you for voting!');

    // Update voting state
    this.hasVoted = true;
  }

  // Optional: Display formatted time
  get formattedTime(): string {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    return `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
  }
}