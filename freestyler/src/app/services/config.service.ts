import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

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
  private config!: BattleConfig;

  constructor(private http: HttpClient) {}

  async loadConfig(): Promise<void> {
    try {
      this.config = await firstValueFrom(this.http.get<BattleConfig>('battle-config.json'));
      console.log('Configuration loaded:', this.config);
    } catch (error) {
      console.error('Failed to load configuration:', error);
      return Promise.reject(error);
    }
  }

  get words(): string[] {
    if (!this.config) {
      throw new Error('Configuration has not been loaded.');
    }
    return this.config.words;
  }

  get wordChangeInterval(): number {
    if (!this.config) {
      throw new Error('Configuration has not been loaded.');
    }
    return this.config.wordChangeInterval;
  }

  get totalTimePerTurn(): number {
    if (!this.config) {
      throw new Error('Configuration has not been loaded.');
    }
    return this.config.totalTimePerTurn;
  }

}
