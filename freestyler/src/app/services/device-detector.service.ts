import { Injectable } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DeviceDetectorService {
 private isMobileSubject = new BehaviorSubject<boolean>(false);
 public isMobile$: Observable<boolean> = this.isMobileSubject.asObservable();

 private isTabletSubject = new BehaviorSubject<boolean>(false);
 public isTablet$: Observable<boolean> = this.isTabletSubject.asObservable();

 private isDesktopSubject = new BehaviorSubject<boolean>(false);
 public isDesktop$: Observable<boolean> = this.isDesktopSubject.asObservable();

 constructor(private breakpointObserver: BreakpointObserver) {
   this.breakpointObserver.observe([
     Breakpoints.Handset,
     Breakpoints.Tablet,
     Breakpoints.Web
   ]).subscribe(result => {
     this.isMobileSubject.next(result.breakpoints[Breakpoints.Handset]);
     this.isTabletSubject.next(result.breakpoints[Breakpoints.Tablet]);
     this.isDesktopSubject.next(result.breakpoints[Breakpoints.Web]);
   });
 }
}

