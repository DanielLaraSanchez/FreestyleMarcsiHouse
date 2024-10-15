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
    bounceOutRightAnimation({ duration: 1500, delay: 0 },
    ),
    bounceInAnimation()

  ],
})
export class BattlePageComponent implements OnInit, OnDestroy {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;


  private subscriptions = new Subscription();
  private remoteStreamSubscription!: Subscription;
  stream!: MediaStream;
  timeLeft: number = 60;
  timerSubscription!: Subscription;
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
  showStartButton: boolean = false;

  constructor(private battleService: BattleOrchestratorService, private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.startCamera();

    this.battleService.timeLeft$.subscribe((time) => {
      this.timeLeft = time;
    });

    this.battleService.currentTurn$.subscribe((turn) => {
      this.currentTurn = turn;
      this.updateRapperData(turn);
    });

    this.battleService.currentWord$.subscribe((word) => {
      this.word = word;
      console.log(word, "word")
    });

    this.battleService.viewerCount$.subscribe((count) => {
      this.viewerCount = count;
    });

    this.battleService.voteCount$.subscribe((count) => {
      this.voteCount = count;
    });

    //  // this.battleService.startBattle();
    // // Get current user ID from AuthService
    // this.currentUserId = this.authService.getCurrentUserId();
    // console.log('Current User ID:', this.currentUserId);
    // if (!this.currentUserId) {
    //   console.error('User not authenticated.');
    //   this.router.navigate(['/login']); // Redirect to login if not authenticated
    //   return;
    // }

    // Initialize local video stream
    this.initializeLocalVideo();

    // Automatically start matchmaking
    this.startMatchmaking();

    // Subscribe to battle found event to handle room creation
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
              console.log(
                'WebRTC Connection State:',
                stream
              );

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

    // Subscribe to partnerDisconnected event
    const partnerDisconnectedSubscription =
      this.battleService.partnerDisconnected$.subscribe(() => {
        console.log('Partner disconnected. Redirecting to /chat.');

        // Show a user notification (optional)
        alert(
          'Your battle partner has disconnected. You will be redirected to the chat page.'
        );

        // Perform cleanup
        this.hangUp(false);

        // Redirect to /chat
        this.router.navigate(['/battle']);
      });
    this.subscriptions.add(partnerDisconnectedSubscription);
  }



  ngOnDestroy(): void {
    // this.stopCamera();
    this.battleService.ngOnDestroy();
  }

  async initializeLocalVideo(): Promise<void> {
    try {
      await this.battleService.initializeLocalStream();
      if (this.localVideo && this.battleService.localStream) {
        this.localVideo.nativeElement.srcObject =
          this.battleService.localStream;
        console.log(
          'Local video stream assigned to local video element.'
        );
      } else {
        console.warn(
          'Local video element or localStream is undefined.'
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


  startCamera(): void {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        this.stream = stream;
        this.localVideo.nativeElement.srcObject = stream;
        // this.remoteVideo.nativeElement.srcObject = stream;
      })
      .catch((error) => {
        console.error('Error accessing media devices.', error);
      });
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
    // this.router.navigate(['/battlefield'])

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
    // Navigate to /chat if invoked by user
    this.router.navigate(['/chat']);
  }
}

  startBattle(): void {
    this.triggerFlipAnimation = true;

    // Trigger flip animation after 1 second
    setTimeout(() => {
      this.triggerZoomOut = true;

    }, 300);

    // Trigger zoom out after 2 seconds
    setTimeout(() => {
      this.showStartButton = !this.showStartButton;

    }, 1500);

    // Start the battle after 3 seconds
    setTimeout(() => {
      this.battleStarted = true;
      this.battleService.startBattle();
      this.triggerBounceIn = !this.triggerBounceIn;
    }, 1500);
  }

  thumbsUp(): void {
    // if (this.hasVoted) {
    //   alert('You have already voted!');
    //   return;
    // }

    this.battleService.incrementVote();

    this.triggerTada = !this.triggerTada;
    setTimeout(() => {
      this.applyGlow = true;
      setTimeout(() => {
        this.applyGlow = false;
      }, 2000);
    }, 0);

    // this.hasVoted = true;
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
