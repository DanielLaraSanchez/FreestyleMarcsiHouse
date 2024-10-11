import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef
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
import { AuthService } from '../../../services/auth.service'; // Import AuthService

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
    bounceInAnimation()
  ],
})
export class BattlePageComponent implements OnInit, OnDestroy {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  // Battle-related properties
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
  showStartButton: boolean = false;

  // WebRTC Subscriptions
  private battleFoundSubscription!: Subscription;
  private connectionStateSubscription!: Subscription;
  private remoteStreamSubscription!: Subscription;

  // Current User ID
  currentUserId!: string | null;

  constructor(
    private battleService: BattleOrchestratorService,
    private router: Router,
    private authService: AuthService // Inject AuthService
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

    // Subscribe to battle found event to show "Start Battle" button
    this.battleFoundSubscription = this.battleService.battleFound$.subscribe((data) => {
      console.log('Battle found with room:', data.roomId);
      this.showStartButton = true; // Show "Start Battle" button
    });

    // Subscribe to connection state to handle WebRTC connection updates
    this.connectionStateSubscription = this.battleService.connectionState$.subscribe((state) => {
      console.log('WebRTC Connection State:', state);
      if (state === 'connected') {
        // Once connected, assign the remote stream to the remote video element
        this.remoteStreamSubscription = this.battleService.remoteStream$.subscribe((stream) => {
          if (stream) {
            this.remoteVideo.nativeElement.srcObject = stream;
            console.log('Remote video stream assigned.');
          }
        });
      }
    });

    // Existing Subscriptions for Battle Mechanics
    this.battleService.timeLeft$.subscribe((time) => {
      this.timeLeft = time;
    });

    this.battleService.currentTurn$.subscribe((turn) => {
      this.currentTurn = turn;
      this.updateRapperData(turn);
    });

    this.battleService.currentWord$.subscribe((word) => {
      this.word = word;
    });

    this.battleService.viewerCount$.subscribe((count) => {
      this.viewerCount = count;
    });

    this.battleService.voteCount$.subscribe((count) => {
      this.voteCount = count;
    });
  }

  ngOnDestroy(): void {
    // Clean up WebRTC connections and streams
    if (this.battleService.peerConnection) {
      this.battleService.peerConnection.close();
      console.log('Peer connection closed.');
    }
    if (this.battleService.localStream) {
      this.battleService.localStream.getTracks().forEach(track => track.stop());
      console.log('Local media tracks stopped.');
    }
    if (this.battleService.remoteStream) {
      this.battleService.remoteStream.getTracks().forEach(track => track.stop());
      console.log('Remote media tracks stopped.');
    }
    this.battleService.ngOnDestroy();

    // Unsubscribe from all subscriptions
    this.battleFoundSubscription?.unsubscribe();
    this.connectionStateSubscription?.unsubscribe();
    this.remoteStreamSubscription?.unsubscribe();
  }

  // Initialize local video stream and assign to the local video element
  async initializeLocalVideo(): Promise<void> {
    try {
      await this.battleService.initializeLocalStream();
      this.localVideo.nativeElement.srcObject = this.battleService.localStream;
      console.log('Local video stream assigned to small video element.');
    } catch (error) {
      console.error('Failed to initialize local video:', error);
    }
  }

  // Start Battle method triggered by the "Start Battle" button
  startBattle(): void {
    console.log('Start Battle button clicked.');
    this.battleService.initiateWebRTCConnection();
    this.battleStarted = true;
    this.showStartButton = false;
    this.triggerBounceIn = true; // Trigger any animations if needed
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

  // Format time left for display
  get formattedTime(): string {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    return `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
  }

  // Hang Up method to end the battle and navigate away
  hangUp(): void {
    // Close WebRTC connections and stop streams
    if (this.battleService.peerConnection) {
      this.battleService.peerConnection.close();
      console.log('Peer connection closed.');
    }
    if (this.battleService.remoteStream) {
      this.battleService.remoteStream.getTracks().forEach(track => track.stop());
    }
    if (this.battleService.localStream) {
      this.battleService.localStream.getTracks().forEach(track => track.stop());
    }
    this.battleService.remoteStream;
    this.battleService.peerConnection;
    this.battleService.localStream;

    // Stop battle logic and navigate back
    this.stopCamera();
    this.router.navigate(['/field']);
  }

  // Stop camera streams
  stopCamera(): void {
    if (this.battleService.localStream) {
      this.battleService.localStream.getTracks().forEach((track) => track.stop());
    }
  }
}
