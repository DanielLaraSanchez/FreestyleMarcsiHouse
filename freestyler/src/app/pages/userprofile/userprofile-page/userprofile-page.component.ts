import { Component } from '@angular/core';
import { DeviceDetectorService } from '../../../services/device-detector.service';

@Component({
  selector: 'app-userprofile-page',
  templateUrl: './userprofile-page.component.html',
  styleUrls: ['./userprofile-page.component.css']
})
export class UserprofilePageComponent {
  user = {
    _id: "1",
    name: 'MC Hammer',
    profilePicture: 'https://randomuser.me/api/portraits/men/1.jpg',
    isOnline: true,
    isInBattlefield: false,
    stats: {
      points: 100,
      votes: 50,
      battles: 10,
      wins: 5,
    },
    status: 'Available',
  };

  isMobile: boolean = false;
  isTablet: boolean = false;
  isDesktop: boolean = false;

  constructor(private deviceDetector: DeviceDetectorService) {
    this.deviceDetector.isMobile$.subscribe(
      (isMobile) => (this.isMobile = isMobile)
    );
    this.deviceDetector.isTablet$.subscribe(
      (isTablet) => (this.isTablet = isTablet)
    );
    this.deviceDetector.isDesktop$.subscribe(
      (isDesktop) => (this.isDesktop = isDesktop)
    );
  }
}