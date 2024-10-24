import { Component, Input } from '@angular/core';
import { User } from '../../models/user';

@Component({
  selector: 'app-user-dialog',
  templateUrl: './user-dialog.component.html',
  styleUrl: './user-dialog.component.css'
})
export class UserDialogComponent {
  @Input() user?: User;
}
