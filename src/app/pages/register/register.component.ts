/**
 * 注册页：支持自定义用户名（昵称）、邮箱、密码
 * - 注册后自动登录并跳转 /plaza
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-register',
  template: `
  <div class="card stack">
    <h3>register</h3>
    <input class="input" placeholder="username" [(ngModel)]="username" name="username">
    <input class="input" placeholder="email" [(ngModel)]="email" name="email">
    <input class="input" type="password" placeholder="password" [(ngModel)]="password" name="password">
    <button class="btn" (click)="doRegister()">Register&login</button>
    <div class="small" *ngIf="error">{{ error }}</div>
  </div>
  `,
  imports: [CommonModule, FormsModule],
})
export class RegisterComponent {
  username = '';
  email = '';
  password = '';
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  doRegister() {
    this.error = '';
    try {
      this.auth.register({
        email: this.email.trim(),
        password: this.password.trim(),
        username: this.username.trim(),
      });
      this.router.navigateByUrl('/plaza');
    } catch (e: any) {
      this.error = e?.message || 'Registration failed';
    }
  }
}
