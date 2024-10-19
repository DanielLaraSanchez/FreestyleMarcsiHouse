import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
} from '@angular/core';
import { BehaviorSubject, map, Subscription, switchMap } from 'rxjs';
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
import { User } from '../../../models/user';
import { AuthService } from '../../../services/auth.service';
import { BattleFoundData } from '../../../models/battle-found-data';
import { UserService } from '../../../services/user.service';
import { BattleConfig, ConfigService } from '../../../services/config.service';

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

  viewerCount: number = 100;
  voteCount: number = 0;

  triggerTada: boolean = false;
  applyGlow: boolean = false;
  battleStarted: boolean = false;
  triggerZoomOut: boolean = false;
  triggerFlipAnimation: boolean = false;
  triggerBounceIn: boolean = false;
  showStartButton: boolean = true;

  showWaitingMessage: boolean = false;

  battle: BattleFoundData | null = null;
  ownUser: User | null = null;

  words: string[] = [];

  readonly TOTAL_TIME: number;
  readonly WORD_CHANGE_INTERVAL: number;
  readonly ANIMATION_DURATIONS: {
    flip: number;
    zoomOut: number;
    bounceIn: number;
  };

    // Battle mechanics
    private timerSubscription: Subscription | null = null;
    private wordChangeSubscription: Subscription | null = null;

    private currentTurnSubject = new BehaviorSubject<string>('Player 1');
    currentTurn$ = this.currentTurnSubject.asObservable();

    private timeLeftSubject = new BehaviorSubject<number>(0);
    timeLeft$ = this.timeLeftSubject.asObservable();

    private currentWordSubject = new BehaviorSubject<string>('');
    currentWord$ = this.currentWordSubject.asObservable();

    private voteCountSubject = new BehaviorSubject<number>(0);
    voteCount$ = this.voteCountSubject.asObservable();

    private viewerCountSubject = new BehaviorSubject<number>(0);
    viewerCount$ = this.viewerCountSubject.asObservable();

  constructor(
    private battleService: BattleService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private orchestratorService: BattleOrchestratorService,
    private authService: AuthService,
    private userService: UserService,
    private configService: ConfigService
  ) {
    const config: BattleConfig = this.configService.battleConfig;
    this.TOTAL_TIME = config.totalTimePerTurn;
    this.WORD_CHANGE_INTERVAL = config.wordChangeInterval;
    this.ANIMATION_DURATIONS = config.animationDurations;
    this.words = config.words;
    this.viewerCountSubject.next(config.initialViewerCount);
    // Fetch opponent data when a battle is found
    const opponentSub = this.battleService.battleFound$
      .pipe(
        switchMap(data =>
          this.userService.getUserById(data.partner.userId).pipe(
            map(user => ({
              ...data,
              partner: {
                userId: user._id || '',
                socketId: data.partner.socketId,
                name: user.name,
                profilePicture: user.profilePicture || '',
              },
            }))
          )
        )
      )
      .subscribe(completeData => {
        this.battle = completeData;
        if(completeData) {
          console.log('Opponent data received:', completeData);
        }

        // Here you can manage the UI updates based on opponent data
      });

    this.subscriptions.add(opponentSub);

    // Subscribe to own user data
    const ownUserSub = this.authService.user$.subscribe(user => {
      this.ownUser = user;
      console.log('Own user data:', user);
    });
    this.subscriptions.add(ownUserSub);

  }

  ngOnInit(): void {
    this.cleanupPreviousBattle();
    this.initializeLocalVideo();
    this.startMatchmaking();
    this.subscribeToBattleEvents();
    this.currentWord$.subscribe(res => {
      console.log(res, "dani7")
    })
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
    if (
      this.battleService.isConnectedToPeer ||
      this.battleService.battleStarted
    ) {
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

    this.viewerCount = 100;
    this.voteCount = 0;

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
        this.localVideo.nativeElement.srcObject =
          this.battleService.localStream;
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
    const battleFoundSub = this.battleService.battleFound$.subscribe((data) => {
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
    const connectionStateSub = this.battleService.connectionState$.subscribe(
      (state) => {
        console.log(`WebRTC connection state: ${state}`);
        if (state === 'connected') {
          if (this.remoteVideo && this.battleService.remoteStream) {
            this.remoteVideo.nativeElement.srcObject =
              this.battleService.remoteStream;
            this.remoteVideo.nativeElement.play();
            // this.battleStarted = true;
            this.cdr.detectChanges();
          }
        } else if (state === 'disconnected') {
          if (this.remoteVideo) {
            this.remoteVideo.nativeElement.srcObject = null;
            console.log('Remote video stream cleared.');
          }
        }
      }
    );
    this.subscriptions.add(connectionStateSub);

    // Partner disconnected
    const partnerDisconnectedSub =
      this.battleService.partnerDisconnected$.subscribe(() => {
        alert('Your opponent has disconnected. Redirecting to battle page.');
        this.hangUp(false);
      });
    this.subscriptions.add(partnerDisconnectedSub);

    // Partner hang up
    const partnerHangUpSub = this.battleService.partnerHangUp$.subscribe(() => {
      alert('Your opponent has hung up. You can start a new battle.');
      this.hangUp(false);
    });
    this.subscriptions.add(partnerHangUpSub);

  }

  /**
   * Handles the initiation of the battle once started.
   */
  private handleBattleStart(): void {
    console.log('Handling battle start animations and state.');
    this.battleStarted = true;
    this.triggerFlipAnimation = !this.triggerFlipAnimation;
    this.showWaitingMessage =  true;
    setTimeout(() => {
      this.triggerZoomOut = !this.triggerZoomOut;

    }, 300);

    setTimeout(() => {
      this.showStartButton = false;
      this.triggerBounceIn = !this.triggerBounceIn;

    }, 2000);
  }

   startBattle(): void {
    this.orchestratorService.userReadyToStart()

  }

  /**
   * Casts a vote (Thumbs Up) during the battle.
   */
  public thumbsUp(): void {
    // this.orchestratorService.incrementVote();
    this.triggerTada = !this.triggerTada;
    this.applyGlow = true;

    setTimeout(() => {
      this.applyGlow = false;
    }, 2000);

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
    if (
      this.battleService.isConnectedToPeer ||
      this.battleService.battleStarted
    ) {
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
