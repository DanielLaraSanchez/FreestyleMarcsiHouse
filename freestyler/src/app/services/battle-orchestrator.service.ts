import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, interval, Subject, Subscription } from 'rxjs';
import { SignalingService } from './signaling.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class BattleOrchestratorService implements OnDestroy {
    // Animations flags
    public triggerFlipAnimation: boolean = false;
    public triggerZoomOut: boolean = false;
    public triggerBounceIn: boolean = false;
    public battleStarted: boolean = false;


  private subscriptions = new Subscription();

    // Battle mechanics
    private readonly TOTAL_TIME: number = 60; // seconds
    private timerSubscription: Subscription | null = null;
    private wordChangeSubscription: Subscription | null = null;

    private currentTurnSubject = new BehaviorSubject<string>('Player 1');
    currentTurn$ = this.currentTurnSubject.asObservable();

    private timeLeftSubject = new BehaviorSubject<number>(this.TOTAL_TIME);
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





constructor(private signalingService: SignalingService,
  private authService: AuthService){

}




  /**
   * Resets the battle-related states and observables.
   */
  public resetBattleState(): void {
    this.currentTurnSubject.next('Player 1');
    this.timeLeftSubject.next(this.TOTAL_TIME);
    this.voteCountSubject.next(0);
    this.viewerCountSubject.next(0);
    this.currentWordSubject.next('');
    this.battleStarted = false;
    this.triggerFlipAnimation = false;
    this.triggerZoomOut = false;
    this.triggerBounceIn = false;

    // Stop any existing timers or word change subscriptions
    this.stopTimersAndWordChange();
    console.log('Battle state has been reset.');
  }

    /**
   * Sends a 'readyToStart' signal to the server.
   */
  public userReadyToStart(): void {
    this.signalingService.emitReadyToStart();
    this.triggerFlipAnimation = false;
    this.triggerZoomOut = false;
    this.triggerBounceIn = false;
    console.log('User marked as ready to start the battle.');
  }

  /**
   * Initiates the battle mechanics after battle start.
   */
  public initiateBattle(): void {
    this.battleStarted = true;
    this.triggerFlipAnimation = true;

    setTimeout(() => {
      this.triggerZoomOut = true;
    }, 300);

    setTimeout(() => {
      this.triggerBounceIn = !this.triggerBounceIn;
      // Additional logic if required
    }, 1500);
  }

  /**
   * Starts the battle timers and word changes.
   */
  private startTimers(): void {
    this.stopTimers(); // Clear existing timers

    this.timeLeftSubject.next(this.TOTAL_TIME);
    this.timerSubscription = interval(1000).subscribe(() => {
      if (this.timeLeftSubject.getValue() > 0) {
        this.timeLeftSubject.next(this.timeLeftSubject.getValue() - 1);
      } else {
        this.switchTurn();
      }
    });

    console.log('Timer started.');
  }

  /**
   * Starts the word change interval.
   */
  private startWordChange(): void {
    this.stopWordChange();

    this.generateRandomWord(); // initial word
    this.wordChangeSubscription = interval(5000).subscribe(() => {
      this.generateRandomWord();
    });

    console.log('Word change initiated.');
  }

  /**
   * Stops the battle timers.
   */
  private stopTimers(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
      console.log('Timer stopped.');
    }
  }

  /**
   * Stops the word change interval.
   */
  private stopWordChange(): void {
    if (this.wordChangeSubscription) {
      this.wordChangeSubscription.unsubscribe();
      this.wordChangeSubscription = null;
      console.log('Word change stopped.');
    }
  }

  /**
   * Stops all battle-related timers and subscriptions.
   */
  public stopTimersAndWordChange(): void {
    this.stopTimers();
    this.stopWordChange();
  }

  /**
   * Switches the current turn and restarts timers and word changes.
   */
  private switchTurn(): void {
    const current = this.currentTurnSubject.getValue();
    const nextTurn = current === 'Player 1' ? 'Player 2' : 'Player 1';
    this.currentTurnSubject.next(nextTurn);
    this.voteCountSubject.next(0);
    this.timeLeftSubject.next(this.TOTAL_TIME);

    console.log(`Turn switched to ${nextTurn}.`);
    this.startTimers();
    this.startWordChange();
  }

  /**
   * Generates a random word from the words list.
   */
  private generateRandomWord(): void {
    const randomWord = this.words[Math.floor(Math.random() * this.words.length)];
    this.currentWordSubject.next(randomWord);
    console.log(`Generated word: ${randomWord}`);
  }

  /**
   * Increments the vote count.
   */
  public incrementVote(): void {
    const currentVotes = this.voteCountSubject.getValue();
    this.voteCountSubject.next(currentVotes + 1);
    console.log(`Vote count incremented to ${currentVotes + 1}`);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.stopTimersAndWordChange();
  }

}
