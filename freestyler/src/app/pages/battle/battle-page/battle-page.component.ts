import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-battle-page',
  templateUrl: './battle-page.component.html',
  styleUrls: ['./battle-page.component.css']
})
export class BattlePageComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement1') videoElement1!: ElementRef<HTMLVideoElement>;
  @ViewChild('videoElement2') videoElement2!: ElementRef<HTMLVideoElement>;
  stream!: MediaStream;

  // Timer Properties
  totalTime: number = 60; // Total time in seconds
  timeLeft: number = this.totalTime;
  timerSubscription!: Subscription;

  // Voting State
  hasVoted: boolean = false;

  constructor() { }

  ngOnInit(): void {
    this.startCamera();
    this.startTimer();
  }

  ngOnDestroy(): void {
    this.stopCamera();
    this.stopTimer();
  }

  startCamera(): void {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          this.stream = stream;
          this.videoElement1.nativeElement.srcObject = stream;
          this.videoElement2.nativeElement.srcObject = stream;
        })
        .catch(error => {
          console.error('Error accessing media devices.', error);
        });
    } else {
      console.error('Media devices API not supported.');
    }
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  }

  // Timer Methods
  startTimer(): void {
    // Initialize the timer
    this.timeLeft = this.totalTime;
    this.updateTimerProgress();

    // Create an observable that emits every second
    const timer = interval(1000);

    // Subscribe to the observable to decrement the timer
    this.timerSubscription = timer.subscribe(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
        this.updateTimerProgress();
      } else {
        this.stopTimer();
        // Action when time is up
        alert('Time is up!');
      }
    });
  }

  stopTimer(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }

  // Timer Progress Calculation
  updateTimerProgress(): void {
    // Since the knob's [(ngModel)] is bound to timeLeft,
    // and [min] is 0, [max] is 60, it will correctly display the remaining time.
    // No additional calculations are needed.
  }

  // Voting Method
  vote(): void {
    if (this.hasVoted) {
      alert('You have already voted!');
      return;
    }

    // Implement actual voting logic here (e.g., send vote to backend)
    alert('Thank you for voting!');

    // Update voting state
    this.hasVoted = true;
  }

  // Optional: Display formatted time (not used in knob but can be used elsewhere)
  get formattedTime(): string {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    return `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
  }
}