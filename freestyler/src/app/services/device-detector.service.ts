import { Injectable } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class DeviceDetectorService {
  public isMobile$: Observable<boolean>;
  public isTablet$: Observable<boolean>;
  public isDesktop$: Observable<boolean>;

  constructor(private breakpointObserver: BreakpointObserver) {
    // Custom breakpoints to improve detection
    this.isMobile$ = this.breakpointObserver
      .observe('(max-width: 767px)')
      .pipe(map((result) => result.matches));

    this.isTablet$ = this.breakpointObserver
      .observe('(min-width: 768px) and (max-width: 1023px)')
      .pipe(map((result) => result.matches));

    this.isDesktop$ = this.breakpointObserver
      .observe('(min-width: 1024px)')
      .pipe(map((result) => result.matches));
  }
}
