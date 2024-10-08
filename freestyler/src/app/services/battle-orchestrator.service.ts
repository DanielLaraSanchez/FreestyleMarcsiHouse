import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BattleOrchestratorService {
  private totalTime: number = 60; // Total time in seconds
  private timeLeft: number = this.totalTime;
  private timerSubscription!: Subscription;

  private currentTurnSubject = new BehaviorSubject<string>('Player 1');
  currentTurn$ = this.currentTurnSubject.asObservable();

  private timeLeftSubject = new BehaviorSubject<number>(this.timeLeft);
  timeLeft$ = this.timeLeftSubject.asObservable();

  private currentWordSubject = new BehaviorSubject<string>('');
  currentWord$ = this.currentWordSubject.asObservable();

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
    'Legend'
  ];

  constructor() { }

  startBattle(): void {
    this.timeLeft = this.totalTime;
    this.timeLeftSubject.next(this.timeLeft);
    this.currentTurnSubject.next('Player 1');
    this.generateRandomWord();
    this.startTimer();
  }

  private startTimer(): void {
    this.timerSubscription = interval(1000).subscribe(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
        this.timeLeftSubject.next(this.timeLeft);
      } else {
        this.stopTimer();
        this.switchTurn();
        this.resetTimer();
      }
    });
  }

  private stopTimer(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }

  private resetTimer(): void {
    this.timeLeft = this.totalTime;
    this.timeLeftSubject.next(this.timeLeft);
    this.generateRandomWord();
    this.startTimer();
  }

  private switchTurn(): void {
    const current = this.currentTurnSubject.value;
    const nextTurn = current === 'Player 1' ? 'Player 2' : 'Player 1';
    this.currentTurnSubject.next(nextTurn);
  }

  private generateRandomWord(): void {
    const randomIndex = Math.floor(Math.random() * this.words.length);
    this.currentWordSubject.next(this.words[randomIndex]);
  }

  getFormattedTime(): string {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    return `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }
}