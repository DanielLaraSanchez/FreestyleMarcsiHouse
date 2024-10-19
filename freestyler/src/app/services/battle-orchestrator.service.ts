import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, interval, Subject, Subscription } from 'rxjs';
import { SignalingService } from './signaling.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class BattleOrchestratorService implements OnDestroy {
  public battleStarted: boolean = false;

  private subscriptions = new Subscription();

  constructor(private signalingService: SignalingService) {}

  /**
   * Resets the battle-related states and observables.
   */
  public resetBattleState(): void {
    this.battleStarted = false;

    console.log('Battle state has been reset.');
  }

  /**
   * Sends a 'readyToStart' signal to the server.
   */
  public userReadyToStart(): void {
    this.signalingService.emitReadyToStart();
    console.log('User marked as ready to start the battle.');
  }

  /**
   * Initiates the battle mechanics after battle start.
   */
  public initiateBattle(): void {
    this.battleStarted = true;
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
