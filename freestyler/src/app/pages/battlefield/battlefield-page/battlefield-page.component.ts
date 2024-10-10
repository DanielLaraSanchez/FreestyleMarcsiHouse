import { Component, OnInit, OnDestroy } from '@angular/core';
import { DeviceDetectorService } from '../../../services/device-detector.service';
import { Pair } from '../../../models/pair';
import { User } from '../../../models/user';
import { pairs } from '../../../data/pairs';
import { users } from '../../../data/users';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-battlefield-page',
  templateUrl: './battlefield-page.component.html',
  styleUrls: ['./battlefield-page.component.css'],
})
export class BattlefieldPageComponent implements OnInit, OnDestroy {
  isMobile: boolean = false;
  isTablet: boolean = false;
  isDesktop: boolean = false;
  subscriptions: Subscription = new Subscription();

  ongoingBattles: Pair[] = [];
  usersInBattlefield: User[] = [];

  constructor(
    private deviceService: DeviceDetectorService,
    private router: Router
  ) {}

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

  watchBattle(battle: Pair) {
    this.router.navigate(['/battle', battle.id]);
  }

  sendBattleRequest(user: User) {
    console.log('Sending battle request to', user.name);
    // Implement battle request logic here
  }

  startRandomBattle() {
    console.log('Starting random battle');
    this.router.navigate(['/battle']);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
