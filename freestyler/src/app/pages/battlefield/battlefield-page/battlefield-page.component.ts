import {
  Component,
  OnInit,
  OnDestroy,
  HostListener
} from '@angular/core';
import { Subscription } from 'rxjs';
import { DeviceDetectorService } from '../../../services/device-detector.service';
import { Pair } from '../../../models/pair';
import { User } from '../../../models/user';
import { pairs } from '../../../data/pairs';
import { users } from '../../../data/users';
import { Router } from '@angular/router';

@Component({
  selector: 'app-battlefield-page',
  templateUrl: './battlefield-page.component.html',
  styleUrls: ['./battlefield-page.component.css'],
})
export class BattlefieldPageComponent implements OnInit, OnDestroy {
  isMobile: boolean = false;
  isTablet: boolean = false;
  isDesktop: boolean = false;

  isHovered: boolean = false;

  sidebarVisible: boolean = false;
  chatSidebarVisible: boolean = false; // For Chat Sidebar
  subscriptions: Subscription = new Subscription();

  ongoingBattles: Pair[] = [];
  usersInBattlefield: User[] = [];

  constructor(
    private deviceService: DeviceDetectorService,
    private router: Router
  ) {
    this.checkScreenSize();
  }

  ngOnInit(): void {
    this.subscriptions.add(
      this.deviceService.isMobile$.subscribe((isMobile) => (this.isMobile = isMobile))
    );
    this.subscriptions.add(
      this.deviceService.isTablet$.subscribe((isTablet) => (this.isTablet = isTablet))
    );
    this.subscriptions.add(
      this.deviceService.isDesktop$.subscribe((isDesktop) => (this.isDesktop = isDesktop))
    );

    // Get ongoing battles
    this.ongoingBattles = pairs;

    // Get users in battlefield
    this.usersInBattlefield = users;
  }

  // Listen to window resize events
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
  }

  checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
    if (!this.isMobile) {
      this.sidebarVisible = false; // Ensure sidebar is hidden on desktop
      this.chatSidebarVisible = false; // Ensure chat sidebar is hidden on desktop
    }
  }

  toggleSidebar() {
    this.sidebarVisible = !this.sidebarVisible;
  }

  openChatSidebar() {
    this.chatSidebarVisible = true;
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  onMouseOver() {
    this.isHovered = true;
  }

  onMouseLeave() {
    this.isHovered = false;
  }
}
