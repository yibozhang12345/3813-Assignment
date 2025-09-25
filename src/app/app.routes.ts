
import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { PlazaComponent } from './pages/plaza/plaza.component';
import { ChatComponent } from './pages/chat/chat.component';
import { NotificationsComponent } from './pages/notifications/notifications.component';
import { UsersAdminComponent } from './pages/admin/users-admin.component';
import { GroupsAdminComponent } from './pages/admin/groups-admin.component';
import { authGuard } from './core/guards/auth.guard';
/**
 * 全站路由表：
 * - 未登录仍可访问 /login /register
 * - 登录后访问 /plaza /chat /notifications /profile
 * 备注：路由：新增管理页，并加守卫
 */
export const routes: Routes = [
  { path: '', redirectTo: 'plaza', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  { path: 'plaza', component: PlazaComponent },
  { path: 'chat', component: ChatComponent, canActivate: [authGuard] },
  { path: 'notifications', component: NotificationsComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },

  // 简单起见：进入页面后组件内部再判断角色（super / groupAdmin）
  { path: 'admin/users', component: UsersAdminComponent, canActivate: [authGuard] },
  { path: 'admin/groups', component: GroupsAdminComponent, canActivate: [authGuard] },

  { path: '**', redirectTo: 'plaza' },
];

