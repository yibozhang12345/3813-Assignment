/**
 * 全站路由表：
 * - 未登录仍可访问 /login /register
 * - 登录后访问 /plaza /chat /notifications /profile
 * 备注：此处未加守卫（Phase 1 可选）
 */
import { Routes } from '@angular/router';

import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { PlazaComponent } from './pages/plaza/plaza.component';
import { ChatComponent } from './pages/chat/chat.component';
import { NotificationsComponent } from './pages/notifications/notifications.component';

export const routes: Routes = [
  { path: '', redirectTo: 'plaza', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'plaza', component: PlazaComponent },
  { path: 'chat', component: ChatComponent },
  { path: 'notifications', component: NotificationsComponent },
  { path: 'profile', component: ProfileComponent },
  { path: '**', redirectTo: 'plaza' },
];
