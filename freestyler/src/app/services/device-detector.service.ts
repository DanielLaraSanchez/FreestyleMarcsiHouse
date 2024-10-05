import { Injectable } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
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
    // Observe each breakpoint individually and map to result.matches
    this.isMobile$ = this.breakpointObserver
      .observe(Breakpoints.Handset)
      .pipe(map((result) => result.matches));

    this.isTablet$ = this.breakpointObserver
      .observe(Breakpoints.Tablet)
      .pipe(map((result) => result.matches));

    this.isDesktop$ = this.breakpointObserver
      .observe(Breakpoints.Web)
      .pipe(map((result) => result.matches));
  }
}
