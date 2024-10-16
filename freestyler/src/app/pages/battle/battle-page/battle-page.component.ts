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
  private remoteStreamSubscription!: Subscription;
  stream!: MediaStream;
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
    private battleService: BattleOrchestratorService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Step 1: Cleanup any residual data from previous battles
    this.cleanupPreviousBattle();

    // Step 2: Initialize local video
    this.initializeLocalVideo();

    // Step 3: Automatically start matchmaking upon entering the battle page
    this.startMatchmaking();

    // Step 4: Subscribe to battle events and other observables
    this.subscribeToBattleEvents();
  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions to prevent memory leaks
    this.subscriptions.unsubscribe();

    // Perform additional cleanup if necessary
    this.battleService.closeConnection();
  }

  /**
   * Cleans up any residual data from previous battles.
   */
  private cleanupPreviousBattle(): void {
    console.log('Checking for residual battle data...');

    // Check if there's an ongoing battle
    if (this.battleService.isConnectedToPeer || this.battleService.battleStarted) {
      console.log('Residual battle data found. Performing cleanup...');
      this.battleService.closeConnection();
      this.battleService.isConnectedToPeer = false; // Perform cleanup without navigating
      this.battleService.battleStarted = false;
    } else {
      console.log('No residual battle data found.');
    }

    // Reset component state variables
    this.resetComponentState();
  }

  /**
   * Resets all component-specific state variables to their default values.
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
  async initializeLocalVideo(): Promise<void> {
    try {
      await this.battleService.initializeLocalStream();
      if (this.localVideo && this.battleService.localStream) {
        this.localVideo.nativeElement.srcObject = this.battleService.localStream;
        this.localVideo.nativeElement.play();
        console.log('Local video stream assigned to local video element.');
      } else {
        console.warn('Local video element or localStream is undefined.');
      }
    } catch (error) {
      console.error('Failed to initialize local video:', error);
    }
  }

  /**
   * Starts matchmaking to find a random battle opponent.
   */
  startMatchmaking(): void {
    console.log('Starting matchmaking automatically.');
    this.battleService.startBattle();
    this.showWaitingMessage = true; // Show waiting message
  }

  /**
   * Subscribes to various battle-related events and observables.
   */
  private subscribeToBattleEvents(): void {
    // Subscribe to battle found event to handle room creation
    const battleFoundSubscription = this.battleService.battleFound$.subscribe(
      (data) => {
        console.log('Battle found event received:', data);
        this.showStartButton = true; // Show "Start Battle" when paired
        this.showWaitingMessage = false; // Hide waiting message if any

        // Optionally, you can show a message indicating the user is paired and ready to start
      }
    );
    this.subscriptions.add(battleFoundSubscription);

    // Subscribe to battleStart event to initiate battle logic
    const battleStartSubscription = this.battleService.battleStart$.subscribe(() => {
      console.log('BattleStart event received in component.');
      this.handleBattleStart();
    });
    this.subscriptions.add(battleStartSubscription);

    // Subscribe to connection state to handle WebRTC connection updates
    const connectionStateSubscription =
      this.battleService.connectionState$.subscribe((state) => {
        console.log('WebRTC Connection State:', state);
        if (state !== 'disconnected') {
          // Once connected, assign the remote stream to the remote video element
          this.remoteStreamSubscription =
            this.battleService.remoteStream$.subscribe((stream) => {
              console.log('Remote Stream:', stream);

              if (stream && this.remoteVideo) {
                // Ensure the video element is available
                setTimeout(() => {
                  this.remoteVideo.nativeElement.srcObject = stream;
                  console.log('Remote video stream assigned.');
                  this.battleStarted = true;
                  this.cdr.detectChanges(); // Trigger change detection
                }, 0);
              } else {
                console.warn(
                  'Remote stream received but remoteVideo is undefined.'
                );
              }
            });
          this.subscriptions.add(this.remoteStreamSubscription);
        } else if (state === 'disconnected') {
          // Clear remote video stream
          if (this.remoteVideo) {
            this.remoteVideo.nativeElement.srcObject = null;
            console.log('Remote video stream cleared.');
          }
        }
      });
    this.subscriptions.add(connectionStateSubscription);

    // Subscribe to partnerDisconnected event
    const partnerDisconnectedSubscription =
      this.battleService.partnerDisconnected$.subscribe(() => {
        console.log('Partner disconnected. Redirecting to /battle.');

        // Show a user notification (optional)
        alert(
          'Your battle partner has disconnected. You will be redirected to the battle page.'
        );

        // Perform cleanup
        this.hangUp(false);

        // Redirect to /battle
        this.router.navigate(['/battle']);
      });
    this.subscriptions.add(partnerDisconnectedSubscription);

    // Subscribe to partnerHangUp event
    const partnerHangUpSubscription =
      this.battleService.partnerHangUp$.subscribe(() => {
        console.log('Partner hung up the battle. Notifying user.');

        // Show a user notification (optional)
        alert(
          'Your battle partner hung up the battle. You can start a new battle now.'
        );

        // Perform cleanup
        this.hangUp(false);
        this.router.navigate(['/battle']);
      });
    this.subscriptions.add(partnerHangUpSubscription);

    // Additional subscriptions for battle mechanics
    const timeLeftSubscription = this.battleService.timeLeft$.subscribe(
      (time) => {
        this.timeLeft = time;
      }
    );
    this.subscriptions.add(timeLeftSubscription);

    const currentTurnSubscription = this.battleService.currentTurn$.subscribe(
      (turn) => {
        this.currentTurn = turn;
        this.updateRapperData(turn);
      }
    );
    this.subscriptions.add(currentTurnSubscription);

    const currentWordSubscription = this.battleService.currentWord$.subscribe(
      (word) => {
        console.log(word, 'word');
        this.word = word;
      }
    );
    this.subscriptions.add(currentWordSubscription);

    const viewerCountSubscription = this.battleService.viewerCount$.subscribe(
      (count) => {
        this.viewerCount = count;
      }
    );
    this.subscriptions.add(viewerCountSubscription);

    const voteCountSubscription = this.battleService.voteCount$.subscribe(
      (count) => {
        this.voteCount = count;
      }
    );
    this.subscriptions.add(voteCountSubscription);
  }

  /**
   * Handles the initiation of the battle after receiving the 'battleStart' event.
   */
  handleBattleStart(): void {
    console.log('Battle has started!');
    this.battleStarted = true;
    this.triggerFlipAnimation = true;

    // Trigger flip animation after 0.3 seconds
    setTimeout(() => {
      this.triggerZoomOut = true;
    }, 300);

    // Trigger zoom out after 1.5 seconds
    setTimeout(() => {
      this.showStartButton = false;
    }, 1500);

    // Start the battle after 1.5 seconds
    setTimeout(() => {
      this.triggerBounceIn = !this.triggerBounceIn;
    }, 1500);
  }

  /**
   * Thumbs Up (Vote) functionality to cast a vote.
   */
  thumbsUp(): void {
    if (this.hasVoted) {
      alert('You have already voted!');
      return;
    }

    this.battleService.incrementVote();

    this.triggerTada = !this.triggerTada;
    setTimeout(() => {
      this.applyGlow = true;
      setTimeout(() => {
        this.applyGlow = false;
      }, 2000);
    }, 0);

    this.hasVoted = true;
  }

  /**
   * Updates the rapper's name based on the current turn.
   * @param turn - The current turn identifier.
   */
  updateRapperData(turn: string): void {
    this.rapperName = turn;
  }

  /**
   * Formats the remaining time into a MM:SS string.
   */
  get formattedTime(): string {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    return `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
  }

  /**
   * Hang Up method to end the battle and navigate away.
   * @param navigate - Determines whether to navigate after hanging up.
   */
  hangUp(navigate: boolean = true): void {
    console.log('Hang Up method called. Ending battle.');

    // Emit 'hangUp' event via BattleOrchestratorService
    if (this.battleService.isConnectedToPeer || this.battleService.battleStarted) {
      console.log('Calling BattleOrchestratorService.hangUp()');
      // Close WebRTC connections and stop streams
      this.battleService.closeConnection();
      this.battleService.hangUp();
    } else {
      console.log('No active battle to hang up.');
    }

    // Update battle state flags
    this.battleStarted = false;

    // Hide the "Start Battle" button if necessary
    this.showStartButton = false;

    // Reset animation triggers
    this.triggerFlipAnimation = false;
    this.triggerZoomOut = false;
    this.triggerBounceIn = false;

    if (navigate) {
      // Navigate to /chat if invoked by user
      this.router.navigate(['/chat']);
    }

    // Reset component state variables
    this.resetComponentState();
  }
}
