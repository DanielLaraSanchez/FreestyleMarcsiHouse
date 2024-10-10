import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, interval, Subscription, timer } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BattleOrchestratorService implements OnDestroy {
  private totalTime: number = 60; // Total time in seconds
  private timeLeft: number = this.totalTime;
  private timerSubscription!: Subscription;
  private wordChangeSubscription!: Subscription;

  private currentTurnSubject = new BehaviorSubject<string>('Player 1');
  currentTurn$ = this.currentTurnSubject.asObservable();

  private timeLeftSubject = new BehaviorSubject<number>(this.timeLeft);
  timeLeft$ = this.timeLeftSubject.asObservable();

  private currentWordSubject = new BehaviorSubject<string>('');
  currentWord$ = this.currentWordSubject.asObservable();

  private voteCountSubject = new BehaviorSubject<number>(0);
  voteCount$ = this.voteCountSubject.asObservable();

  private viewerCountSubject = new BehaviorSubject<number>(0);
  viewerCount$ = this.viewerCountSubject.asObservable();

  private words: string[] = [
    'Victory',
    'Hustle',
    'Flow',
    'Rhythm',
    'Battle',
    'Street',
    'Mic',
    'Beats',
    'Freestyle',
    'Legend',
  ];

  private stream!: MediaStream;

  constructor() {}

  startBattle(): void {
    this.timeLeft = this.totalTime;
    this.currentTurnSubject.next('Player 1');
    this.voteCountSubject.next(0);
    this.startTimer();
    this.startWordChange();
  }

  private startTimer(): void {
    this.timerSubscription = interval(1000).subscribe(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
        this.timeLeftSubject.next(this.timeLeft);
      } else {
        this.stopTimer();
        this.switchTurn();
      }
    });
  }

  private startWordChange(): void {
    this.wordChangeSubscription = interval(5000).subscribe(() => {
      this.generateRandomWord();
    });
    this.generateRandomWord(); // Generate initial word
  }

  private stopTimer(): void {
    this.timerSubscription?.unsubscribe();
  }

  private switchTurn(): void {
    const current = this.currentTurnSubject.value;
    const nextTurn = current === 'Player 1' ? 'Player 2' : 'Player 1';
    this.currentTurnSubject.next(nextTurn);
    this.voteCountSubject.next(0); // Reset vote count for new turn
    this.timeLeft = this.totalTime;
    this.timeLeftSubject.next(this.timeLeft);
  }

  private generateRandomWord(): void {
    const randomIndex = Math.floor(Math.random() * this.words.length);
    this.currentWordSubject.next(this.words[randomIndex]);
  }

  incrementVote(): void {
    const currentVotes = this.voteCountSubject.getValue();
    this.voteCountSubject.next(currentVotes + 1);
  }

  startCamera(): void {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        this.stream = stream;
        // Setup video streams in the component
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

  ngOnDestroy(): void {
    this.stopTimer();
    this.wordChangeSubscription?.unsubscribe();
  }
}
