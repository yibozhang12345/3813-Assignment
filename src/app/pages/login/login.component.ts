/**
 * 登录页：邮箱 + 密码
 * - 成功后跳转到 /plaza
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-login',
  template: `
  <div class="card stack">
    <h3>login</h3>
    <div class="stack">
      <input class="input" placeholder="email" [(ngModel)]="email" name="email">
      <input class="input" type="password" placeholder="password" [(ngModel)]="password" name="password">
      <button class="btn" (click)="doLogin()">login</button>
      <div class="small" *ngIf="error">{{ error }}</div>
      <div class="small">Don't have an account yet? <a routerLink="/register">register</a></div>
    </div>
  </div>
  `,
  imports: [CommonModule, FormsModule],
})
export class LoginComponent {
  email = 'super@example.com';
  password = '123';
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  doLogin() {
    this.error = '';
    try {
      this.auth.login(this.email.trim(), this.password.trim());
      this.router.navigateByUrl('/plaza');
    } catch (e: any) {
      this.error = e?.message || 'login failed';
    }
  }
}
