import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { GroupManagementComponent } from './pages/group-management/group-management.component';
import { ChannelManagementComponent } from './pages/channel-management/channel-management.component';
import { ChatroomComponent } from './pages/chatroom/chatroom.component';
import { RouterModule } from '@angular/router';  
import { AppRoutingModule } from './app-routing.module';  

@Component({
  standalone: true,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
    imports: [
    AppComponent,
    AppRoutingModule,
    LoginComponent,
    RegisterComponent,
    DashboardComponent,
    GroupManagementComponent,
    ChannelManagementComponent,
    ChatroomComponent,
    RouterModule
  ]
})
export class AppComponent {
  constructor(private router: Router) {}

  isLoggedIn(): boolean {
    return !!localStorage.getItem('user');
  }

  displayName(): string {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '');
      return user?.username || 'Guest';
    } catch {
      return 'Guest';
    }
  }

  logout() {
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }
}
