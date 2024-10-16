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
    this.initializeLocalVideo();

    // Automatically start matchmaking upon entering the battle page
    this.startMatchmaking();

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
        this.router.navigate(['/battle'])
      });
    this.subscriptions.add(partnerHangUpSubscription);

    // Additional subscriptions for battle mechanics can be added here
    // e.g., timeLeft$, currentWord$, voteCount$, viewerCount$, etc.
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

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this.subscriptions.unsubscribe();

    // Optionally, perform additional cleanup
    this.battleService.closeConnection();
  }

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

  // Automatically start matchmaking upon entering the battle page
  startMatchmaking(): void {
    console.log('Starting matchmaking automatically.');
    this.battleService.startBattle();
    this.showWaitingMessage = true; // Show waiting message
  }

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

  // Thumbs Up (Vote) Functionality
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

  // Update Rapper Data Based on Current Turn
  updateRapperData(turn: string): void {
    this.rapperName = turn;
  }

  // Formatted Time Display
  get formattedTime(): string {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    return `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
  }

  // Hang Up method to end the battle and navigate away
  hangUp(navigate: boolean = true): void {
    console.log('Hang Up method called. Ending battle.');

    // Emit 'hangUp' event via BattleOrchestratorService
    console.log('Called BattleOrchestratorService.hangUp()');
    // Close WebRTC connections and stop streams
    this.battleService.closeConnection();

    // Update battle state flags
    this.battleStarted = false;

    // Hide the "Start Battle" button if necessary
    this.showStartButton = false;

    // Reset animation triggers
    this.triggerFlipAnimation = false;
    this.triggerZoomOut = false;
    this.triggerBounceIn = false;

    if (navigate) {
      this.battleService.hangUp();

      // Navigate to /battle if invoked by user
      this.router.navigate(['/chat']);
    }

    // Optionally, re-initiate matchmaking if desired
    // this.startMatchmaking();
  }
}
