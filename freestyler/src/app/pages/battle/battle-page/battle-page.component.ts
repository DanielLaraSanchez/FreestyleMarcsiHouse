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
import { AuthService } from '../../../services/auth.service';

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
  // Video Elements
  @ViewChild('videoElement1') videoElement1!: ElementRef<HTMLVideoElement>; // Local Video
  @ViewChild('videoElement2') videoElement2!: ElementRef<HTMLVideoElement>; // Remote Video

  // Battle Mechanics Properties
  timeLeft: number = 60;
  currentTurn: string = 'Player 1';
  word: string = '';
  rapperName: string = 'Player 1';
  viewerCount: number = 100;
  voteCount: number = 0;
  hasVoted: boolean = false;

  // UI Animation Flags
  triggerTada: boolean = false;
  applyGlow: boolean = false;
  battleStarted: boolean = false;
  triggerZoomOut: boolean = false;
  triggerFlipAnimation: boolean = false;
  triggerBounceIn: boolean = false;
  showStartButton: boolean = false;

  // Subscriptions
  private subscriptions = new Subscription();
  private remoteStreamSubscription!: Subscription;

  // Current User ID
  currentUserId!: string | null;

  constructor(
    private battleService: BattleOrchestratorService,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Retrieve current user ID from AuthService
    this.currentUserId = this.authService.getCurrentUserId();
    console.log('Current User ID:', this.currentUserId);
    if (!this.currentUserId) {
      console.error('User not authenticated.');
      this.router.navigate(['/login']); // Redirect to login if not authenticated
      return;
    }

    // Initialize local video stream and assign to videoElement1 (Local Video)
    this.initializeLocalVideo();

    // Automatically start matchmaking
    this.startMatchmaking();

    // Subscribe to battle found event to handle room creation and role determination
    const battleFoundSubscription = this.battleService.battleFound$.subscribe(
      (data) => {
        console.log('Battle found event received:', data);
        this.showStartButton = this.battleService.isOfferer; // Show "Start Battle" only if offerer

        if (this.battleService.isOfferer) {
          // Offerer should see the "Start Battle" button
          console.log('User is Offerer. Awaiting user action to start battle.');
        } else {
          // If answerer, automatically set battleStarted to true to render remoteVideo
          this.battleStarted = true;
          console.log('User is Answerer. Automatically starting battle.');
        }
      }
    );
    this.subscriptions.add(battleFoundSubscription);

    // Subscribe to connection state to handle WebRTC connection updates
    const connectionStateSubscription =
      this.battleService.connectionState$.subscribe((state) => {
        console.log(
          'WebRTC Connection State:',
          state
        );

        if (state !== 'disconnected') {
          // Once connected, assign the remote stream to the remote video element
          this.remoteStreamSubscription =
            this.battleService.remoteStream$.subscribe((stream) => {
              console.log('Received remote stream:', stream);

              if (stream && this.videoElement2) {
                // Ensure the video element is available
                setTimeout(() => {
                  this.videoElement2.nativeElement.srcObject = stream;
                  console.log('Remote video stream assigned.');
                  this.battleStarted = true;
                  this.cdr.detectChanges(); // Trigger change detection
                }, 0);
              } else {
                console.warn(
                  'Remote stream received but videoElement2 is undefined.'
                );
              }
            });
          this.subscriptions.add(this.remoteStreamSubscription);
        } else if (state === 'disconnected') {
          // Clear remote video stream
          if (this.videoElement2) {
            this.videoElement2.nativeElement.srcObject = null;
            console.log('Remote video stream cleared.');
          }
        }
      });
    this.subscriptions.add(connectionStateSubscription);

    // Existing Subscriptions for Battle Mechanics
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

    // Subscribe to partnerDisconnected event to handle partner disconnections gracefully
    const partnerDisconnectedSubscription =
      this.battleService.partnerDisconnected$.subscribe(() => {
        console.log('Partner disconnected. Rejoining matchmaking.');
        // Optionally, show a user notification (e.g., toast message)
        // Restart battle to rejoin matchmaking
        this.restartBattle();
      });
    this.subscriptions.add(partnerDisconnectedSubscription);
  }

  ngOnDestroy(): void {
    // Clean up WebRTC connections and streams
    this.battleService.ngOnDestroy();

    // Unsubscribe from all subscriptions
    this.subscriptions.unsubscribe();
  }

  // Initialize local video stream and assign to videoElement1 (Local Video)
  async initializeLocalVideo(): Promise<void> {
    try {
      await this.battleService.initializeLocalStream();
      if (
        this.videoElement1 &&
        this.battleService.localStream &&
        this.videoElement1.nativeElement
      ) {
        this.videoElement1.nativeElement.srcObject =
          this.battleService.localStream;
        console.log(
          'Local video stream assigned to videoElement1 (Local Video).'
        );
      } else {
        console.warn(
          'videoElement1 or localStream is undefined. Cannot assign local video stream.'
        );
      }
    } catch (error) {
      console.error('Failed to initialize local video:', error);
    }
  }

  // Automatically start matchmaking upon entering the battle page
  startMatchmaking(): void {
    console.log('Starting matchmaking automatically.');
    this.battleService.startBattle();
  }

  // Restart Battle by re-initiating matchmaking
  private async restartBattle(): Promise<void> {
    console.log('Restarting battle and re-initiating matchmaking.');
    // Clean up existing connections if any
    this.battleService.closeConnection();
    // Reset battle-related states if necessary
    this.battleStarted = false;
    this.showStartButton = false;
    // Re-initiate matchmaking
    await this.startBattle();
  }

  // Start Battle method triggered by the "Start Battle" button
  startBattle(): void {
    this.triggerFlipAnimation = true;

    // Trigger flip animation after 300ms
    setTimeout(() => {
      this.triggerZoomOut = true;
    }, 300);

    // Trigger bounce animation and start battle mechanics after 1500ms
    setTimeout(() => {
      this.showStartButton = false; // Hide the "Start Battle" button
      this.battleService.startBattle();
      this.triggerBounceIn = true;
      this.battleStarted = true;
      console.log('Battle started.');
    }, 1500);
  }

  // Thumbs Up method for voting
  thumbsUp(): void {
    if (this.hasVoted) {
      console.warn('User has already voted.');
      return;
    }

    this.battleService.incrementVote();
    this.hasVoted = true;

    this.triggerTada = !this.triggerTada;
    setTimeout(() => {
      this.applyGlow = true;
      setTimeout(() => {
        this.applyGlow = false;
      }, 2000);
    }, 0);
  }

  // Update Rapper Data based on the current turn
  updateRapperData(turn: string): void {
    this.rapperName = turn;
  }

  // Hang Up method to end the battle and navigate away
  hangUp(navigate: boolean = true): void {
    console.log('Hang Up method called. Ending battle.');

    // Close WebRTC connections and stop streams
    this.battleService.closeConnection();

    // Update battle state flags
    this.battleStarted = false;

    // Hide the "Start Battle" button if necessary
    this.showStartButton = false;

    if (navigate) {
      // Navigate to /battle (matchmaking queue) if needed
      this.router.navigate(['/battle']);
    }
  }

  // Optional: Stop camera streams if you have separate controls
  stopCamera(): void {
    if (this.battleService.localStream) {
      this.battleService.localStream
        .getTracks()
        .forEach((track) => track.stop());
      console.log('Local media tracks stopped.');
    }
    if (this.battleService.remoteStream) {
      this.battleService.remoteStream
        .getTracks()
        .forEach((track) => track.stop());
      console.log('Remote media tracks stopped.');
    }
  }
}
