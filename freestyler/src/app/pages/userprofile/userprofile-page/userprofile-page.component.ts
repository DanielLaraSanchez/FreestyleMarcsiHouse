import { Component } from '@angular/core';
import { DeviceDetectorService } from '../../../services/device-detector.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-userprofile-page',
  templateUrl: './userprofile-page.component.html',
  styleUrls: ['./userprofile-page.component.css'],
})
export class UserprofilePageComponent {
  user = {
    _id: '1',
    name: 'MC Hammer',
    email: 'mchammer@example.com',
    phone: '+1 (555) 123-4567',
    address: '123 Main St, Springfield, USA',
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
  isDesktop: boolean = false;

  displayUserProfileDialog: boolean = true; // Dialog is visible by default

  constructor(
    private deviceDetector: DeviceDetectorService,
    private router: Router
  ) {
    this.deviceDetector.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
      this.isDesktop = !isMobile;
    });
  }

  onChangeProfilePicture() {
    // Logic to change profile picture
    console.log('Change profile picture clicked');
  }

  saveChanges() {
    // Logic to save changes
    console.log('User details saved:', this.user);
  }

  onDialogHide() {
    // Navigate to the desired route when the dialog is closed
    this.router.navigate(['/field']); // Replace '/home' with your desired route
  }
}