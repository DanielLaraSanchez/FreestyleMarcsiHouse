import { Component, Input } from '@angular/core';
import { flipAnimation } from 'angular-animations';

@Component({
  selector: 'app-battle-pair',
  templateUrl: './battle-pair.component.html',
  styleUrls: ['./battle-pair.component.css'],
  animations: [

    flipAnimation({ duration: 1500, delay: 0 }),

  ],
})
export class BattlePairComponent {
  @Input() battle: any;

  triggerFlipAnimation: boolean = false;

}
