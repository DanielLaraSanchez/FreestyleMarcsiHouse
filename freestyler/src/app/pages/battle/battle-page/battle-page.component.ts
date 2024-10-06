import { Component, OnInit, OnDestroy, HostListener, Renderer2, ElementRef, ViewChild } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { DeviceDetectorService } from '../../../services/device-detector.service';

@Component({
  selector: 'app-battle-page',
  templateUrl: './battle-page.component.html',
  styleUrls: ['./battle-page.component.css']
})
export class BattlePageComponent implements OnInit, OnDestroy {

  // Battler Details
  battler1 = {
    id: 1,
    name: 'MC Hammer',
    profilePicture: 'https://randomuser.me/api/portraits/men/1.jpg',
    isMuted: false,
    isVideoOff: false
  };

  battler2 = {
    id: 2,
    name: 'Eminem',
    profilePicture: 'https://randomuser.me/api/portraits/men/2.jpg',
    isMuted: false,
    isVideoOff: false
  };

  // Device Detection
  isDesktop: boolean = true;
  subscriptions: Subscription = new Subscription();

  // Timers
  timer1: number = 60; // Battler 1 Timer (seconds)
  timer2: number = 60; // Battler 2 Timer (seconds)
  totalTimer: number = 120; // Total Battle Timer (seconds)

  // SVG Circle Calculations
  battler1DashArray: number = 0;
  battler1DashOffset: number = 0;

  battler2DashArray: number = 0;
  battler2DashOffset: number = 0;

  totalDashArray: number = 0;
  totalDashOffset: number = 0;

  // Interval References
  battler1Subscription: Subscription | undefined;
  battler2Subscription: Subscription | undefined;
  totalTimerSubscription: Subscription | undefined;
  wordSubscription: Subscription | undefined;

  // Active Battler: 'battler1' or 'battler2'
  activeBattler: 'battler1' | 'battler2' = 'battler1';

  // Random Words Array
  words: string[] = ['Flow', 'Rhythm', 'Verse', 'Beat', 'Mic', 'Bars', 'Cypher', 'Freestyle'];
  randomWord: string = 'Flow'; // Initial random word

  // Dragging Variables for Mobile Picture-in-Picture
  @ViewChild('pip') pipElement: ElementRef | undefined;
  isDragging: boolean = false;
  startX: number = 0;
  startY: number = 0;
  currentX: number = 0;
  currentY: number = 0;

  constructor(
    private deviceDetectorService: DeviceDetectorService,
    private renderer: Renderer2
  ) { }

  ngOnInit(): void {
    // Initialize SVG Circle Calculations
    this.initializeCircles();

    // Subscribe to device detection service
    this.subscriptions.add(
      this.deviceDetectorService.isDesktop$.subscribe((isDesktop) => {
        this.isDesktop = isDesktop;
      })
    );

    // Start countdown timers
    this.startTimer1();
    // this.startTimer2();

    // Start random word generator every 10 seconds
    this.wordSubscription = interval(10000).subscribe(() => {
      this.randomWord = this.getRandomWord();
    });
  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions to prevent memory leaks
    this.subscriptions.unsubscribe();

    if (this.battler1Subscription) this.battler1Subscription.unsubscribe();
    if (this.battler2Subscription) this.battler2Subscription.unsubscribe();
    if (this.totalTimerSubscription) this.totalTimerSubscription.unsubscribe();
    if (this.wordSubscription) this.wordSubscription.unsubscribe();
  }

  // Initialize SVG Circle Calculations
  initializeCircles(): void {
    // Assuming radius is 75 for battlers and 95 for total timer
    this.battler1DashArray = 2 * Math.PI * 75;
    this.battler1DashOffset = this.battler1DashArray;

    this.battler2DashArray = 2 * Math.PI * 75;
    this.battler2DashOffset = this.battler2DashArray;

    this.totalDashArray = 2 * Math.PI * 95;
    this.totalDashOffset = this.totalDashArray;
  }

  // Start Battler 1's Timer
  startTimer1(): void {
    this.updateBattler1DashOffset();

    this.battler1Subscription = interval(1000).subscribe(() => {
      if (this.timer1 > 0 && this.activeBattler === 'battler1') {
        this.timer1--;
        this.updateBattler1DashOffset();
      } else if (this.activeBattler === 'battler1') {
        // Battler 1's time is up; switch to Battler 2
        this.battler1Subscription?.unsubscribe();
        this.activeBattler = 'battler2';
        this.startBattler2Timer();
      }
    });
  }

  // Start Battler 2's Timer
  startBattler2Timer(): void {
    this.updateBattler2DashOffset();

    this.battler2Subscription = interval(1000).subscribe(() => {
      if (this.timer2 > 0 && this.activeBattler === 'battler2') {
        this.timer2--;
        this.updateBattler2DashOffset();
      } else if (this.activeBattler === 'battler2') {
        // Battler 2's time is up; switch back to Battler 1
        this.battler2Subscription?.unsubscribe();
        this.activeBattler = 'battler1';
        this.startTimer1();
      }
    });
  }

  // Start Central Battle Timer
  startTotalTimer(): void {
    this.updateTotalDashOffset();

    this.totalTimerSubscription = interval(1000).subscribe(() => {
      if (this.totalTimer > 0) {
        this.totalTimer--;
        this.updateTotalDashOffset();
      } else {
        // Battle Over
        this.endCall();
      }
    });
  }

  // Update Battler 1's Circular Timer Offset
  updateBattler1DashOffset(): void {
    this.battler1DashOffset = this.battler1DashArray - ((this.battler1DashArray * this.timer1) / 60);
  }

  // Update Battler 2's Circular Timer Offset
  updateBattler2DashOffset(): void {
    this.battler2DashOffset = this.battler2DashArray - ((this.battler2DashArray * this.timer2) / 60);
  }

  // Update Central Timer's Circular Timer Offset
  updateTotalDashOffset(): void {
    this.totalDashOffset = this.totalDashArray - ((this.totalDashArray * this.totalTimer) / 120);
  }

  // Get a random word from the array
  getRandomWord(): string {
    const index = Math.floor(Math.random() * this.words.length);
    return this.words[index];
  }

  // Toggle mute for a battler
  toggleMute(battler: any): void {
    battler.isMuted = !battler.isMuted;
    // Implement actual mute logic here
  }

  // Toggle video for a battler
  toggleVideo(battler: any): void {
    battler.isVideoOff = !battler.isVideoOff;
    // Implement actual video toggle logic here
  }

  // End the battle
  endCall(): void {
    // Implement call ending logic here
    alert('Rap Battle Ended.');
    // Optionally, reset timers or navigate away
    this.resetTimers();
  }

  // Reset Timers (optional)
  resetTimers(): void {
    this.timer1 = 60;
    this.timer2 = 60;
    this.totalTimer = 120;
    this.activeBattler = 'battler1';

    // Reset dash offsets
    this.updateBattler1DashOffset();
    this.updateBattler2DashOffset();
    this.updateTotalDashOffset();

    // Restart timers
    if (this.battler1Subscription && !this.battler1Subscription.closed) {
      this.battler1Subscription.unsubscribe();
    }
    if (this.battler2Subscription && !this.battler2Subscription.closed) {
      this.battler2Subscription.unsubscribe();
    }
    if (this.totalTimerSubscription && !this.totalTimerSubscription.closed) {
      this.totalTimerSubscription.unsubscribe();
    }

    this.startTimer1();
    this.startTotalTimer();
  }

  // Accessibility: Keyboard shortcuts for controlling mute, video, and end call
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    switch (event.key.toLowerCase()) {
      case 'm': // 'm' to mute/unmute Battler 1
        this.toggleMute(this.battler1);
        break;
      case 'n': // 'n' to mute/unmute Battler 2
        this.toggleMute(this.battler2);
        break;
      case 'v': // 'v' to toggle video for Battler 1
        this.toggleVideo(this.battler1);
        break;
      case 'b': // 'b' to toggle video for Battler 2
        this.toggleVideo(this.battler2);
        break;
      case 'e': // 'e' to end the call
        this.endCall();
        break;
      default:
        break;
    }
  }

  // Dragging Start (for Mobile Picture-in-Picture)
  startDrag(event: TouchEvent | MouseEvent): void {
    event.preventDefault();
    this.isDragging = true;
    if (event instanceof MouseEvent) {
      this.startX = event.clientX - this.currentX;
      this.startY = event.clientY - this.currentY;
    } else if (event instanceof TouchEvent) {
      this.startX = event.touches[0].clientX - this.currentX;
      this.startY = event.touches[0].clientY - this.currentY;
    }
  }

  // Dragging Move (for Mobile Picture-in-Picture)
  onDrag(event: TouchEvent | MouseEvent): void {
    if (!this.isDragging) return;
    event.preventDefault();
    if (event instanceof MouseEvent) {
      this.currentX = event.clientX - this.startX;
      this.currentY = event.clientY - this.startY;
    } else if (event instanceof TouchEvent) {
      this.currentX = event.touches[0].clientX - this.startX;
      this.currentY = event.touches[0].clientY - this.startY;
    }
    // Update position of PIP
    if (this.pipElement) {
      this.renderer.setStyle(this.pipElement.nativeElement, 'transform', `translate(${this.currentX}px, ${this.currentY}px)`);
    }
  }

  // Dragging End (for Mobile Picture-in-Picture)
  endDrag(): void {
    this.isDragging = false;
  }
}
