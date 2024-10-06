import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BattlefieldPageComponent } from './pages/battlefield/battlefield-page/battlefield-page.component';
import { SignupComponent } from './pages/signup/signup/signup.component';
import { LoginComponent } from './pages/login/login/login.component';
import { BattlePageComponent } from './pages/battle/battle-page/battle-page.component';
import { ChatPageComponent } from './pages/chat/chat-page/chat-page.component';
import { AuthCallbackComponent } from './components/auth-callback/auth-callback.component';
import { AuthGuard } from './guards/auth.guard';

const routes2: Routes = [

];


const routes: Routes = [
  // Public routes
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'auth/google/callback', component: AuthCallbackComponent },
  { path: 'battle', component: BattlePageComponent},

  // Protected routes
  { path: 'chat', component: ChatPageComponent, canActivate: [AuthGuard] },
  { path: 'battlefield', component: BattlefieldPageComponent, canActivate: [AuthGuard] },
  // { path: 'battle', component: BattlePageComponent, canActivate: [AuthGuard]},


  { path: '**', redirectTo: 'login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
