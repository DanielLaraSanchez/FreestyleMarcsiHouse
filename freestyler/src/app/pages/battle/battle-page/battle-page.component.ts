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
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-battle-page',
  templateUrl: './battle-page.component.html',
  styleUrls: ['./battle-page.component.css'],
})
export class BattlePageComponent implements OnInit, OnDestroy {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  // Flags and properties
  battleStarted: boolean = false;
  showStartButton: boolean = false;

  // Subscriptions
  private subscriptions = new Subscription();
  private remoteStreamSubscription!: Subscription;

  // Current User ID
  currentUserId!: string | null;

  // Battle Mechanics Properties
  timeLeft: number = 60;
  currentTurn: string = 'Player 1';
  word: string = '';
  rapperName: string = 'Player 1';
  viewerCount: number = 100;
  voteCount: number = 0;
  hasVoted: boolean = false;
  triggerTada: boolean = false;
  applyGlow: boolean = false;
  triggerBounceIn: boolean = false;

  constructor(
    public battleService: BattleOrchestratorService, // Made public for template access
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef // Inject ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Get current user ID from AuthService
    this.currentUserId = this.authService.getCurrentUserId();
    console.log('Current User ID:', this.currentUserId);
    if (!this.currentUserId) {
      console.error('User not authenticated.');
      this.router.navigate(['/login']); // Redirect to login if not authenticated
      return;
    }

    // Initialize local video stream
    this.initializeLocalVideo();

    // Automatically start matchmaking
    this.startMatchmaking();

    // Subscribe to battle found event to handle room creation
    const battleFoundSubscription = this.battleService.battleFound$.subscribe((data) => {
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
    });
    this.subscriptions.add(battleFoundSubscription);

    // Subscribe to connection state to handle WebRTC connection updates
    const connectionStateSubscription = this.battleService.connectionState$.subscribe((state) => {
      console.log('WebRTC Connection State:AKIIIIIIIIIIIIIIIIIIIIIIIIIIII', state);
      if (state !== 'disconnected') {
        // Once connected, assign the remote stream to the remote video element
        this.remoteStreamSubscription = this.battleService.remoteStream$.subscribe((stream) => {
          console.log('WebRTC Connection State:AKIIIIIIIIIIIIIIIIIIIIIIIIIIII', stream);

          if (stream && this.remoteVideo) {
            // Ensure the video element is available
            setTimeout(() => {
              this.remoteVideo.nativeElement.srcObject = stream;
              console.log('Remote video stream assigned.');
              this.cdr.detectChanges(); // Trigger change detection
            }, 0);
          } else {
            console.warn('Remote stream received but remoteVideo is undefined.');
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
    const timeLeftSubscription = this.battleService.timeLeft$.subscribe((time) => {
      this.timeLeft = time;
    });
    this.subscriptions.add(timeLeftSubscription);

    const currentTurnSubscription = this.battleService.currentTurn$.subscribe((turn) => {
      this.currentTurn = turn;
      this.updateRapperData(turn);
    });
    this.subscriptions.add(currentTurnSubscription);

    const currentWordSubscription = this.battleService.currentWord$.subscribe((word) => {
      this.word = word;
    });
    this.subscriptions.add(currentWordSubscription);

    const viewerCountSubscription = this.battleService.viewerCount$.subscribe((count) => {
      this.viewerCount = count;
    });
    this.subscriptions.add(viewerCountSubscription);

    const voteCountSubscription = this.battleService.voteCount$.subscribe((count) => {
      this.voteCount = count;
    });
    this.subscriptions.add(voteCountSubscription);
  }

  ngOnDestroy(): void {
    // Clean up WebRTC connections and streams
    this.battleService.ngOnDestroy();

    // Unsubscribe from all subscriptions
    this.subscriptions.unsubscribe();
  }

  // Initialize local video stream and assign to the local video element
  async initializeLocalVideo(): Promise<void> {
    try {
      await this.battleService.initializeLocalStream();
      if (this.localVideo && this.battleService.localStream) {
        this.localVideo.nativeElement.srcObject = this.battleService.localStream;
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
  }

  // Start Battle method triggered by the "Start Battle" button (now optional)
  startBattle(): void {
    console.log('Start Battle method called.');
    // The battle initiation is now handled automatically for the Offerer
    // This method can be left empty or used for additional controls if needed
  }

  // Thumbs Up method for voting
  thumbsUp(): void {
    this.battleService.incrementVote();

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
  hangUp(): void {
    // Close WebRTC connections and stop streams
    this.battleService.ngOnDestroy();

    // Stop battle logic and navigate back
    this.stopCamera();
    this.router.navigate(['/field']);
  }

  // Stop camera streams
  stopCamera(): void {
    if (this.battleService.localStream) {
      this.battleService.localStream.getTracks().forEach((track) => track.stop());
      console.log('Local media tracks stopped.');
    }
    if (this.battleService.remoteStream) {
      this.battleService.remoteStream.getTracks().forEach((track) => track.stop());
      console.log('Remote media tracks stopped.');
    }
  }
}
