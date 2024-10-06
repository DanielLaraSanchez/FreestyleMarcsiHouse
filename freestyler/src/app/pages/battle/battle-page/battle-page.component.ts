import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { DeviceDetectorService } from '../../../services/device-detector.service';

@Component({
  selector: 'app-battle-page',
  templateUrl: './battle-page.component.html',
  styleUrls: ['./battle-page.component.css'],
})
export class BattlePageComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  isMobile: boolean = false;
  isTablet: boolean = false;
  isDesktop: boolean = false;

  battler1 = {
    id: 1,
    name: 'MC Hammer',
    profilePicture: 'https://randomuser.me/api/portraits/men/1.jpg',
    isMuted: false,
    isVideoOff: false,
  };

  battler2 = {
    id: 2,
    name: 'Eminem',
    profilePicture: 'https://randomuser.me/api/portraits/men/2.jpg',
    isMuted: false,
    isVideoOff: false,
  };

  @ViewChild('videoElement1') videoElement1!: ElementRef<HTMLVideoElement>;
  @ViewChild('videoElement2') videoElement2!: ElementRef<HTMLVideoElement>;
  @ViewChild('progressPath') progressPath!: ElementRef<SVGPathElement>;
  stream!: MediaStream;

  // Timer properties
  totalTime: number = 60; // Total time in seconds
  timeLeft: number = this.totalTime;
  progressPercent: number = 100; // Progress percentage from 100 to 0
  timerSubscription!: Subscription;

  // Path length for the progress bar
  pathLength: number = 0;

  constructor(private deviceService: DeviceDetectorService) {}

  ngOnInit(): void {
    this.deviceService.isMobile$.subscribe(
      (isMobile) => (this.isMobile = isMobile)
    );
    this.deviceService.isTablet$.subscribe(
      (isTablet) => (this.isTablet = isTablet)
    );
    this.deviceService.isDesktop$.subscribe(
      (isDesktop) => (this.isDesktop = isDesktop)
    );

    this.startCamera();
    this.startTimer();
  }

  ngAfterViewInit(): void {
    // Calculate the total length of the progress path
    if (this.progressPath && this.progressPath.nativeElement) {
      this.pathLength = this.progressPath.nativeElement.getTotalLength();
    }
  }

  ngOnDestroy(): void {
    this.stopCamera();
    this.stopTimer();
  }

  startCamera() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          this.stream = stream;
          this.videoElement1.nativeElement.srcObject = stream;
          this.videoElement2.nativeElement.srcObject = stream;
        })
        .catch((error) => {
          console.error('Error accessing media devices.', error);
        });
    } else {
      console.error('Media devices API not supported.');
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
  }

  startTimer() {
    this.timeLeft = this.totalTime;
    this.progressPercent = 100;

    const timer = interval(1000);
    this.timerSubscription = timer.subscribe(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
        this.progressPercent = (this.timeLeft / this.totalTime) * 100;
      } else {
        this.stopTimer();
        this.progressPercent = 0;
        // Perform any action when time is up
      }
    });
  }

  stopTimer() {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }
}