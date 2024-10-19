import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BattleConfig {
  totalTimePerTurn: number;
  wordChangeInterval: number;
  animationDurations: {
    flip: number;
    zoomOut: number;
    bounceIn: number;
  };
  words: string[];
  maxVoteCount: number;
  initialViewerCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private config!: BattleConfig | undefined;

  constructor(private http: HttpClient) {}

  loadConfig(): Promise<void> {
    return this.http
      .get<BattleConfig>('battle-config.json')
      .toPromise()
      .then((data) => {
        this.config = data;
        console.log('Configuration loaded:', this.config);
      })
      .catch((error) => {
        console.error('Failed to load configuration:', error);
        return Promise.reject(error);
      });
  }

  get battleConfig(): BattleConfig {
    if (!this.config) {
      throw new Error('Configuration has not been loaded.');
    }
    return this.config;
  }
}
