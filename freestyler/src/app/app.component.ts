import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { MenuItem } from 'primeng/api';
import { DeviceDetectorService } from './services/device-detector.service';
import { Router, NavigationEnd, Event } from '@angular/router';
import { filter } from 'rxjs/operators';

interface DesktopMenuItem {
  label: string;
  icon: string;
  routerLink: string;
}

interface MobileMenuItem {
  icon: string;
  routerLink: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'] // Corrected from 'styleUrl' to 'styleUrls'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'freestyler';

  isDesktop: boolean = false;
  isMobile: boolean = false;
  subscriptions: Subscription = new Subscription();

  // Flag to determine if the current page is the Battle Page
  isBattlePage: boolean = false;

  // Menu items with required 'icon' property
  desktopMenuItems: DesktopMenuItem[] = [];
  mobileMenuItems: MobileMenuItem[] = [];

  activeItem!: MobileMenuItem;

  constructor(
    private deviceDetectorService: DeviceDetectorService,
    private router: Router
  ) {
    // Define desktop menu items
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
        routerLink: '/user-profile',
      },
      {
        label: 'BattleField',
        icon: 'pi pi-fw pi-slack',
        routerLink: '/field',
      },
    ];

    // Define mobile menu items (icons only)
    this.mobileMenuItems = [
      {
        icon: 'pi pi-fw pi-slack',
        routerLink: '/field',
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
        routerLink: '/user-profile',
      },
    ];

    // Set the default active item
    this.activeItem = this.mobileMenuItems[0];
  }

  ngOnInit() {
    // Subscribe to device type observables
    this.subscriptions.add(
      this.deviceDetectorService.isDesktop$.subscribe((isDesktop) => {
        console.log('Is Desktop:', isDesktop);
        this.isDesktop = isDesktop;
      })
    );

    this.subscriptions.add(
      this.deviceDetectorService.isMobile$.subscribe((isMobile) => {
        console.log('Is Mobile:', isMobile);
        this.isMobile = isMobile;
      })
    );

    // Subscribe to router events to determine the current route
    this.subscriptions.add(
      this.router.events
        .pipe(
          filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd)
        )
        .subscribe((event: NavigationEnd) => {
          this.isBattlePage = event.urlAfterRedirects.endsWith('/battle');
          console.log('Is Battle Page:', this.isBattlePage);
        })
    );
  }

  ngOnDestroy() {
    // Unsubscribe to prevent memory leaks
    this.subscriptions.unsubscribe();
  }
}