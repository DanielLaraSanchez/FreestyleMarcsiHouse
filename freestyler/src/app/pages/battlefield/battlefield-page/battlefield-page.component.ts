import { Component, OnInit } from '@angular/core';
import { Message } from '../../../models/message';
import { User } from '../../../models/user';
import { Pair } from '../../../models/pair';
import { users } from '../../../data/users';
import { pairs } from '../../../data/pairs';
import { DeviceDetectorService } from '../../../services/device-detector.service';


@Component({
  selector: 'app-battlefield-page',
  templateUrl: './battlefield-page.component.html',
  styleUrl: './battlefield-page.component.css'
})
export class BattlefieldPageComponent implements OnInit {
  isMobile: boolean = false;
  isTablet: boolean = false;
  isDesktop: boolean = false;


  constructor(private deviceService: DeviceDetectorService) {}

  ngOnInit(): void {
    this.deviceService.isMobile$.subscribe(isMobile => this.isMobile = isMobile);
    this.deviceService.isTablet$.subscribe(isTablet => this.isTablet = isTablet);
    this.deviceService.isDesktop$.subscribe(isDesktop => this.isDesktop = isDesktop);
  }

}
