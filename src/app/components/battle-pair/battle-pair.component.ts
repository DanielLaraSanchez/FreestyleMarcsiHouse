import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-battle-pair',
  templateUrl: './battle-pair.component.html',
  styleUrls: ['./battle-pair.component.css'],
})
export class BattlePairComponent {
  @Input() battle: any;
}