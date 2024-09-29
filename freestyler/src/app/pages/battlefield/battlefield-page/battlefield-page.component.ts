import { Component } from '@angular/core';
import { Message } from '../../../models/message';
import { User } from '../../../models/user';
import { Pair } from '../../../models/pair';
import { users } from '../../../data/users';
import { pairs } from '../../../data/pairs';


@Component({
  selector: 'app-battlefield-page',
  templateUrl: './battlefield-page.component.html',
  styleUrl: './battlefield-page.component.css'
})
export class BattlefieldPageComponent {
  onlineUsers: User[] = users;
  pairs: Pair[] = pairs;
  messages: Message[] = [];
  newMessage: string = '';


  constructor() {}

}
