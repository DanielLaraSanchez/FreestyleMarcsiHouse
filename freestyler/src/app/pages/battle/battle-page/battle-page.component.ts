import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { DeviceDetectorService } from '../../../services/device-detector.service';

@Component({
  selector: 'app-battle-page',
  templateUrl: './battle-page.component.html',
  styleUrls: ['./battle-page.component.css']
})
export class BattlePageComponent implements OnInit, OnDestroy {
  isMobile: boolean = false;
  isTablet: boolean = false;
  isDesktop: boolean = false;

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

  @ViewChild('videoElement1') videoElement1!: ElementRef<HTMLVideoElement>;
  @ViewChild('videoElement2') videoElement2!: ElementRef<HTMLVideoElement>;
  stream!: MediaStream;

  // Additional properties
  isPlaying: boolean = true;
  words: string[] = ['Flow', 'Beat', 'Rhythm', 'Verse', 'Mic'];
  currentWord: string = '';

  constructor(
    private deviceService: DeviceDetectorService
  ) { }

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
    this.generateRandomWord();
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  startCamera() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
        this.stream = stream;
        this.videoElement1.nativeElement.srcObject = stream;
        this.videoElement2.nativeElement.srcObject = stream;
      }).catch((error) => {
        console.error('Error accessing media devices.', error);
      });
    } else {
      console.error('Media devices API not supported.');
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  }

  togglePlayPause() {
    this.isPlaying = !this.isPlaying;
    if (this.isPlaying) {
      this.videoElement1.nativeElement.play();
    } else {
      this.videoElement1.nativeElement.pause();
    }
  }

  replayVideo() {
    this.videoElement1.nativeElement.currentTime = 0;
    this.videoElement1.nativeElement.play();
    this.isPlaying = true;
  }

  vote() {
    // Implement voting logic here
    alert('Thank you for voting!');
  }

  generateRandomWord() {
    const randomIndex = Math.floor(Math.random() * this.words.length);
    this.currentWord = this.words[randomIndex];
  }
}