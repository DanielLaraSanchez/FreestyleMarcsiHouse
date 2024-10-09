import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-battle-sidebar',
  templateUrl: './battle-sidebar.component.html',
  styleUrls: ['./battle-sidebar.component.css']
})
export class BattleSidebarComponent {
  @Input() timeLeft!: number;
  @Input() word!: string;
  @Input() rapperName!: string;
  @Input() viewerCount!: number;
  @Input() voteCount!: number;

  @Output() hangUp = new EventEmitter<void>();
  @Output() thumbsUp = new EventEmitter<void>();

  onHangUp(): void {
    this.hangUp.emit();
  }

  onThumbsUp(): void {
    this.thumbsUp.emit();
  }
}