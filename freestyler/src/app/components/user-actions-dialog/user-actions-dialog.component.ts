import { Component, OnInit } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { User } from '../../models/user';

@Component({
  selector: 'app-user-actions-dialog',
  templateUrl: './user-actions-dialog.component.html',
  styleUrls: ['./user-actions-dialog.component.css']
})
export class UserActionsDialogComponent implements OnInit {
  user!: User;

  constructor(
    public ref: DynamicDialogRef,
    public config: DynamicDialogConfig
  ) { }

  ngOnInit(): void {
    this.user = this.config.data.user;
  }

  sendPrivateMessage() {
    this.ref.close('privateMessage');
  }

  viewProfile() {
    this.ref.close('viewProfile');
  }

  sendBattleRequest() {
    this.ref.close('battleRequest');
  }
}