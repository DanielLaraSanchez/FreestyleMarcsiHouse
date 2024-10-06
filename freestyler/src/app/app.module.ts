import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { BattlefieldPageComponent } from './pages/battlefield/battlefield-page/battlefield-page.component';
import { BattlePageComponent } from './pages/battle/battle-page/battle-page.component';
import { LoginComponent } from './pages/login/login/login.component';
import { SignupComponent } from './pages/signup/signup/signup.component';

import { SidebarModule } from 'primeng/sidebar';
import { ButtonModule } from 'primeng/button';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { MenubarModule } from 'primeng/menubar';
import { RippleModule } from 'primeng/ripple';
import { TabMenuModule } from 'primeng/tabmenu';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { InputTextModule } from 'primeng/inputtext';
import { PanelModule } from 'primeng/panel';
import { CardModule } from 'primeng/card';
import { OverlayPanelModule } from 'primeng/overlaypanel';

import { JwtModule, JwtInterceptor } from '@auth0/angular-jwt';
import { HttpTokenInterceptor } from './services/http.interceptor';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ChatPageComponent } from './pages/chat/chat-page/chat-page.component';
import { CarouselModule } from 'primeng/carousel';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { TooltipModule } from 'primeng/tooltip';
import { TabViewModule } from 'primeng/tabview';
import { UserActionsDialogComponent } from './components/user-actions-dialog/user-actions-dialog.component';
import { DynamicDialogModule } from 'primeng/dynamicdialog';
import { BattlePairComponent } from './components/battle-pair/battle-pair.component';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { AuthCallbackComponent } from './components/auth-callback/auth-callback.component';

@NgModule({
  declarations: [
    AppComponent,
    BattlefieldPageComponent,
    BattlePageComponent,
    LoginComponent,
    SignupComponent,
    ChatPageComponent,
    UserActionsDialogComponent,
    BattlePairComponent,
    AuthCallbackComponent
  ],
  imports: [
    HttpClientModule,
    JwtModule.forRoot({
      config: {
        tokenGetter: () => {
          return localStorage.getItem('auth-token');
        },
        allowedDomains: ['localhost:3000'], // Adjust based on your backend domain
      },
    }),
    BrowserModule,
    AppRoutingModule,
    SidebarModule,
    ButtonModule,
    BrowserAnimationsModule,
    AvatarModule,
    DynamicDialogModule,
    AvatarGroupModule,
    TabMenuModule,
    TieredMenuModule,
    OverlayPanelModule,
    ProgressBarModule,
    TooltipModule,
    CardModule,
    SidebarModule,
    ButtonModule,
    ProgressSpinnerModule,
    MenubarModule,
    AvatarModule,
    RippleModule,
    InputTextModule,
    ReactiveFormsModule,
    TabViewModule,
    CarouselModule,
    PanelModule,
    FormsModule, // Add FormsModule here
  ],
  providers: [{ provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: HttpTokenInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
