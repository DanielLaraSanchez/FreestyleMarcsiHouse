import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BattlefieldPageComponent } from './pages/battlefield/battlefield-page/battlefield-page.component';
import { SignupComponent } from './pages/signup/signup/signup.component';
import { LoginComponent } from './pages/login/login/login.component';
import { BattlePageComponent } from './pages/battle/battle-page/battle-page.component';
import { ChatPageComponent } from './pages/chat/chat-page/chat-page.component';
import { AuthCallbackComponent } from './components/auth-callback/auth-callback.component';

const routes: Routes = [
  { path: 'battlefield', component: BattlefieldPageComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'login', component: LoginComponent },
  { path: 'battle', component: BattlePageComponent },
  { path: 'chat', component: ChatPageComponent },
  { path: 'auth/google/callback', component: AuthCallbackComponent },



];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
