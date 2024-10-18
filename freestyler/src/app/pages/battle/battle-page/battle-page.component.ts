import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { BattleOrchestratorService } from '../../../services/battle-orchestrator.service';
import {
  bounceInAnimation,
  bounceOutRightAnimation,
  flipAnimation,
  heartBeatAnimation,
  rubberBandAnimation,
  tadaAnimation,
  zoomOutDownAnimation,
} from 'angular-animations';
import { Router } from '@angular/router';
import { BattleService } from '../../../services/battle.service';

@Component({
  selector: 'app-battle-page',
  templateUrl: './battle-page.component.html',
  styleUrls: ['./battle-page.component.css'],
  animations: [
    heartBeatAnimation(),
    rubberBandAnimation(),
    tadaAnimation({ duration: 1000, delay: 0 }),
    zoomOutDownAnimation(),
    flipAnimation({ duration: 1500, delay: 0 }),
    bounceOutRightAnimation({ duration: 1500, delay: 0 }),
    bounceInAnimation(),
  ],
})
export class BattlePageComponent implements OnInit, OnDestroy {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  private subscriptions = new Subscription();

  // Battle state variables (Component-specific)
  timeLeft: number = 60;
  currentTurn: string = 'Player 1';
  word: string = '';

  rapperName: string = 'Player 1';
  viewerCount: number = 100;
  voteCount: number = 0;

  hasVoted: boolean = false;
  triggerTada: boolean = false;
  applyGlow: boolean = false;
  battleStarted: boolean = false;
  triggerZoomOut: boolean = false;
  triggerFlipAnimation: boolean = false;
  triggerBounceIn: boolean = false;
  showStartButton: boolean = true;
  showWaitingMessage: boolean = false;

  constructor(
    private battleService: BattleService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private orchestratorService: BattleOrchestratorService
  ) {}

  ngOnInit(): void {
    this.cleanupPreviousBattle();
    this.initializeLocalVideo();
    this.startMatchmaking();
    this.subscribeToBattleEvents();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.battleService.closeConnection();
  }

  /**
   * Cleans up any residual battle data from previous battles.
   */
  private cleanupPreviousBattle(): void {
    console.log('Checking for residual battle data...');
    if (this.battleService.isConnectedToPeer || this.battleService.battleStarted) {
      console.log('Residual battle data found. Performing cleanup...');
      this.battleService.closeConnection();
      this.battleService.isConnectedToPeer = false; // Reset flags
      this.battleService.battleStarted = false;
    } else {
      console.log('No residual battle data found.');
    }
    this.resetComponentState();
  }

  /**
   * Resets component state variables.
   */
  private resetComponentState(): void {
    this.timeLeft = 60;
    this.currentTurn = 'Player 1';
    this.word = '';

    this.rapperName = 'Player 1';
    this.viewerCount = 100;
    this.voteCount = 0;

    this.hasVoted = false;
    this.triggerTada = false;
    this.applyGlow = false;
    this.battleStarted = false;
    this.triggerZoomOut = false;
    this.triggerFlipAnimation = false;
    this.triggerBounceIn = false;
    this.showStartButton = true;
    this.showWaitingMessage = false;

    console.log('Component state has been reset.');
  }

  /**
   * Initializes the local video stream and assigns it to the video element.
   */
  private async initializeLocalVideo(): Promise<void> {
    try {
      await this.battleService.initializeLocalStream();
      if (this.localVideo && this.battleService.localStream) {
        this.localVideo.nativeElement.srcObject = this.battleService.localStream;
        this.localVideo.nativeElement.play();
        console.log('Local video stream assigned to video element.');
      } else {
        console.warn('Local video element or localStream is undefined.');
      }
    } catch (error) {
      console.error('Failed to initialize local video:', error);
    }
  }

  /**
   * Starts matchmaking to find an opponent.
   */
  private startMatchmaking(): void {
    console.log('Starting matchmaking.');
    this.battleService.startBattle();
    this.showWaitingMessage = true;
  }

  /**
   * Subscribes to various battle events and updates component state accordingly.
   */
  private subscribeToBattleEvents(): void {
    // Battle found
    const battleFoundSub = this.battleService.battleFound$.subscribe(data => {
      console.log('Battle found:', data);
      this.showStartButton = true;
      this.showWaitingMessage = false;
    });
    this.subscriptions.add(battleFoundSub);

    // Battle started
    const battleStartSub = this.battleService.battleStart$.subscribe(() => {
      console.log('Battle started. Handling battle initiation.');
      this.handleBattleStart();
    });
    this.subscriptions.add(battleStartSub);

    // WebRTC connection state
    const connectionStateSub = this.battleService.connectionState$.subscribe(state => {
      console.log(`WebRTC connection state: ${state}`);
      if (state === 'connected') {
        if (this.remoteVideo && this.battleService.remoteStream) {
          this.remoteVideo.nativeElement.srcObject = this.battleService.remoteStream;
          this.remoteVideo.nativeElement.play();
          this.battleStarted = true;
          this.cdr.detectChanges();
        }
      } else if (state === 'disconnected') {
        if (this.remoteVideo) {
          this.remoteVideo.nativeElement.srcObject = null;
          console.log('Remote video stream cleared.');
        }
      }
    });
    this.subscriptions.add(connectionStateSub);

    // Partner disconnected
    const partnerDisconnectedSub = this.battleService.partnerDisconnected$.subscribe(() => {
      alert('Your opponent has disconnected. Redirecting to battle page.');
      this.hangUp(false);
      this.router.navigate(['/battle']);
    });
    this.subscriptions.add(partnerDisconnectedSub);

    // Partner hang up
    const partnerHangUpSub = this.battleService.partnerHangUp$.subscribe(() => {
      alert('Your opponent has hung up. You can start a new battle.');
      this.hangUp(false);
      this.router.navigate(['/battle']);
    });
    this.subscriptions.add(partnerHangUpSub);

    // Battle Mechanics
    const timeLeftSub = this.orchestratorService.timeLeft$.subscribe(time => {
      this.timeLeft = time;
    });
    this.subscriptions.add(timeLeftSub);

    const currentTurnSub = this.orchestratorService.currentTurn$.subscribe(turn => {
      this.currentTurn = turn;
      this.updateRapperName(turn);
    });
    this.subscriptions.add(currentTurnSub);

    const currentWordSub = this.orchestratorService.currentWord$.subscribe(word => {
      this.word = word;
      console.log(`Current Word: ${word}`);
    });
    this.subscriptions.add(currentWordSub);

    const viewerCountSub = this.orchestratorService.viewerCount$.subscribe(count => {
      this.viewerCount = count;
    });
    this.subscriptions.add(viewerCountSub);

    const voteCountSub = this.orchestratorService.voteCount$.subscribe(count => {
      this.voteCount = count;
    });
    this.subscriptions.add(voteCountSub);
  }

  /**
   * Handles the initiation of the battle once started.
   */
  private handleBattleStart(): void {
    console.log('Handling battle start animations and state.');
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
   * Casts a vote (Thumbs Up) during the battle.
   */
  public thumbsUp(): void {
    if (this.hasVoted) {
      alert('You have already voted!');
      return;
    }

    this.orchestratorService.incrementVote();
    this.triggerTada = !this.triggerTada;
    this.applyGlow = true;

    setTimeout(() => {
      this.applyGlow = false;
    }, 2000);

    this.hasVoted = true;
  }

  /**
   * Updates the rapper's name based on the current turn.
   * @param turn - The current turn identifier.
   */
  private updateRapperName(turn: string): void {
    this.rapperName = turn;
    console.log(`Rapper name updated to: ${turn}`);
  }

  /**
   * Formats the remaining time into MM:SS format.
   */
  get formattedTime(): string {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    return `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
  }

  /**
   * Hangs up the battle, cleans up connections, and navigates if required.
   * @param navigate - Whether to navigate after hanging up.
   */
  public hangUp(navigate: boolean = true): void {
    console.log('Hang up initiated.');
    if (this.battleService.isConnectedToPeer || this.battleService.battleStarted) {
      this.battleService.hangUp();
      console.log('Emitted hangUp event and closed connections.');
    } else {
      console.log('No active battle to hang up.');
    }

    this.battleStarted = false;
    this.showStartButton = false;
    this.triggerFlipAnimation = false;
    this.triggerZoomOut = false;
    this.triggerBounceIn = false;

    if (navigate) {
      this.router.navigate(['/chat']);
    }

    this.resetComponentState();
  }
}
