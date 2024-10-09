import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-battle-sidebar',
  templateUrl: './battle-sidebar.component.html',
  styleUrls: ['./battle-sidebar.component.css'] // Corrected from 'styleUrl' to 'styleUrls'
})
export class BattleSidebarComponent {
  // Inputs to receive data from parent component
  @Input() timeLeft!: number;
  @Input() word!: string;

  // Output to emit events to parent component
  @Output() hangUp = new EventEmitter<void>();

  // Method to emit hangUp event
  onHangUp() {
    this.hangUp.emit();
  }
}