import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { GroupManagementComponent } from './pages/group-management/group-management.component';
import { ChannelManagementComponent } from './pages/channel-management/channel-management.component';
import { ChatroomComponent } from './pages/chatroom/chatroom.component';
import { AuthGuard } from './guards/auth-guard';

const routes: Routes = [
  { path: '', component: DashboardComponent  },// 默认路由
  { path: 'login', component: LoginComponent }, // 登录路由
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'groups', component: GroupManagementComponent, canActivate: [AuthGuard] },
  { path: 'groups/:id/channels', component: ChannelManagementComponent, canActivate: [AuthGuard] },
  { path: 'groups/:groupId/channels/:channelId', component: ChatroomComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: 'login' }// 404重定向到首页
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
