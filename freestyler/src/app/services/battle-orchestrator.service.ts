import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import { ConfigService } from './config.service';
import { SignalingService } from './signaling.service';

@Injectable({
  providedIn: 'root',
})
export class BattleOrchestratorService implements OnDestroy {
  public battleStarted: boolean = false;

  // Observable to emit the current word
  private wordSubject: BehaviorSubject<string> = new BehaviorSubject<string>('');
  public word$ = this.wordSubject.asObservable();

    // Observable to emit the remaining time
    private timerSubject: BehaviorSubject<number> = new BehaviorSubject<number>(-1);
    public timer$ = this.timerSubject.asObservable();

  private wordRotationSubscription!: Subscription;
  private timerSubscription!: Subscription;

  private words: string[] = [];

  private currentWordIndex: number = 0;
  private remainingTime: number = 0;


  constructor(
    private configService: ConfigService,
    private signalingService: SignalingService
  ) {
    // Initialize words from ConfigService
    this.words = this.configService.words;

    if (this.words.length === 0) {
      console.warn('No words available in configuration.');
    }
  }

  /**
   * Resets the battle-related states and observables.
   */
  public resetBattleState(): void {
    this.battleStarted = false;
    this.currentWordIndex = 0;
    this.wordSubject.next(''); // Clear the current word

    // Stop word rotation if it's active
    if (this.wordRotationSubscription) {
      this.wordRotationSubscription.unsubscribe();
    }

    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }

    console.log('Battle state has been reset.');
  }

  /**
   * Sends a 'readyToStart' signal to the server.
   */
  public userReadyToStart(): void {
    this.signalingService.emitReadyToStart();
    console.log('User marked as ready to start the battle.');
  }

  /**
   * Initiates the battle mechanics and starts word rotation.
   */
  public initiateBattle(): void {
    if (this.battleStarted) {
      console.warn('Battle has already been initiated.');
      return;
    }

    this.battleStarted = true;
    console.log('Battle has been initiated.');

    // Emit the first word immediately
    this.emitCurrentWord();

    // Start the interval for rotating words
    const intervalTime = this.configService.wordChangeInterval * 1000; // Convert to milliseconds
    this.wordRotationSubscription = interval(intervalTime).subscribe(() => {
      this.advanceWord();
      this.emitCurrentWord();
    });

        // Initialize and start the timer
        this.remainingTime = this.configService.totalTimePerTurn;
        this.timerSubject.next(this.remainingTime);
        this.startTimer();
  }


  /**
   * Advances the word index to the next word.
   */
  private advanceWord(): void {
    if (this.words.length === 0) {
      return;
    }
    this.currentWordIndex = (this.currentWordIndex + 1) % this.words.length;
  }

  /**
   * Emits the current word through the BehaviorSubject.
   */
  private emitCurrentWord(): void {
    if (this.words.length === 0) {
      this.wordSubject.next('No words available.');
      return;
    }
    const word = this.words[this.currentWordIndex];
    this.wordSubject.next(word);
    console.log(`Emitting word: ${word}`);
  }

    /**
   * Starts the countdown timer.
   */
    public startTimer(): void {
      this.timerSubscription = interval(1000).subscribe(() => {
        this.remainingTime -= 1;
        this.timerSubject.next(this.remainingTime);
        console.log(`Remaining Time: ${this.remainingTime}`);

        if (this.remainingTime <= 0) {
          this.endTurn();
        }
      });
    }

    /**
     * Ends the turn when the timer reaches zero.
     */
    private endTurn(): void {
      console.log('Turn ended.');
      this.resetBattleState();
      // Optionally, trigger events or callbacks for turn completion
    }


  ngOnDestroy(): void {
    if (this.wordRotationSubscription) {
      this.wordRotationSubscription.unsubscribe();
    }

    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }
}
