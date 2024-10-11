import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
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
  @ViewChild('videoElement1') videoElement1!: ElementRef<HTMLVideoElement>;
  @ViewChild('videoElement2') videoElement2!: ElementRef<HTMLVideoElement>;

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

  constructor(private battleService: BattleOrchestratorService, private router: Router) {}

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
    });

    this.battleService.viewerCount$.subscribe((count) => {
      this.viewerCount = count;
    });

    this.battleService.voteCount$.subscribe((count) => {
      this.voteCount = count;
    });
  }

  ngOnDestroy(): void {
    // this.stopCamera();
    this.battleService.ngOnDestroy();
  }

  startCamera(): void {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        this.stream = stream;
        this.videoElement1.nativeElement.srcObject = stream;
        this.videoElement2.nativeElement.srcObject = stream;
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

  hangUp(): void {
    this.stopCamera();
    this.router.navigate(['/battlefield'])
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
