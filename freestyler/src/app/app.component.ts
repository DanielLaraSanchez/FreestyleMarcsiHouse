import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { MenuItem } from 'primeng/api';
import { DeviceDetectorService } from './services/device-detector.service';
import { SignalingService } from './services/signaling.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'] // Corrected from 'styleUrl' to 'styleUrls'
})
export class AppComponent implements OnDestroy {
  title = 'freestyler';

  isDesktop: boolean = false;
  isMobile: boolean = false;
  subscriptions: Subscription = new Subscription();

  // Menu items
  desktopMenuItems: MenuItem[] = [];
  mobileMenuItems: MenuItem[] = [];

  activeItem!: MenuItem;

  constructor(private deviceDetectorService: DeviceDetectorService) {
    // Subscribe to device type observables
    this.subscriptions.add(
      this.deviceDetectorService.isDesktop$.subscribe((isDesktop) => {
        console.log(isDesktop)
        this.isDesktop = isDesktop;
      })
    );

    this.subscriptions.add(
      this.deviceDetectorService.isMobile$.subscribe((isMobile) => {
        console.log(isMobile)
        this.isMobile = isMobile;
      })
    );

    // Define menu items
    this.desktopMenuItems = [
      {
        label: 'Home',
        icon: 'pi pi-fw pi-home',
        routerLink: '/home',
      },
      {
        label: 'Battle',
        icon: 'pi pi-fw pi-microphone',
        routerLink: '/battle',
      },
      {
        label: 'Chat',
        icon: 'pi pi-fw pi-comments',
        routerLink: '/chat',
      },
      {
        label: 'Profile',
        icon: 'pi pi-fw pi-user',
        routerLink: '/profile',
      },
    ];

    // Mobile menu items (icons only)
    this.mobileMenuItems = [
      {
        icon: 'pi pi-fw pi-home',
        routerLink: '/home',
      },
      {
        icon: 'pi pi-fw pi-microphone',
        routerLink: '/battle',
      },
      {
        icon: 'pi pi-fw pi-comments',
        routerLink: '/chat',
      },
      {
        icon: 'pi pi-fw pi-user',
        routerLink: '/profile',
      },
    ];

    // Set the default active item
    this.activeItem = this.mobileMenuItems[0];
  }

  ngOnDestroy() {
    // Unsubscribe to prevent memory leaks
    this.subscriptions.unsubscribe();
  }
}
