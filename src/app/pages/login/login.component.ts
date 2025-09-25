
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/**
 * 登录页：邮箱 + 密码，使用MongoDB后端API进行认证
 * Login page: Email + password, authenticate with MongoDB backend API
 * - 成功后跳转到 /plaza / Redirect to /plaza on success
 */
@Component({
  standalone: true,
  selector: 'app-login',
  template: `
  <div class="card stack">
    <h3>{{ 'Login / 登录' }}</h3>
    <div class="stack">
      <input
        class="input"
        placeholder="Email / 邮箱"
        [(ngModel)]="email"
        name="email"
        type="email"
        [disabled]="loading">
      <input
        class="input"
        type="password"
        placeholder="Password / 密码"
        [(ngModel)]="password"
        name="password"
        [disabled]="loading">
      <button
        class="btn"
        (click)="doLogin()"
        [disabled]="loading || !email.trim() || !password.trim()">
        {{ loading ? 'Logging in... / 登录中...' : 'Login / 登录' }}
      </button>
      <div class="small error" *ngIf="error">{{ error }}</div>
      <div class="small">
        Don't have an account yet? / 还没有账户？
        <a routerLink="/register">Register / 注册</a>
      </div>
    </div>
  </div>
  `,
  imports: [CommonModule, FormsModule, RouterModule],
  styles: [`
    .card {
      max-width: 400px;
      margin: 2rem auto;
      padding: 2rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .stack > * + * {
      margin-top: 1rem;
    }
    .input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 1rem;
    }
    .input:disabled {
      background-color: #f5f5f5;
      cursor: not-allowed;
    }
    .btn {
      width: 100%;
      padding: 0.75rem;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
    }
    .btn:hover:not(:disabled) {
      background-color: #0056b3;
    }
    .btn:disabled {
      background-color: #6c757d;
      cursor: not-allowed;
    }
    .small {
      font-size: 0.875rem;
      color: #666;
      text-align: center;
    }
    .error {
      color: #dc3545;
    }
    a {
      color: #007bff;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {
    // 检查是否已经登录，如果是则重定向 / Check if already logged in, redirect if so
    if (this.auth.isLoggedIn()) {
      this.router.navigateByUrl('/plaza');
    }
  }

  doLogin() {
    this.error = '';
    this.loading = true;

    // 基本验证 / Basic validation
    if (!this.email.trim() || !this.password.trim()) {
      this.error = 'Please fill in all fields / 请填写所有字段';
      this.loading = false;
      return;
    }

    // 简单的邮箱格式验证 / Simple email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email.trim())) {
      this.error = 'Please enter a valid email address / 请输入有效的邮箱地址';
      this.loading = false;
      return;
    }

    // 调用登录API / Call login API
    this.auth.login(this.email.trim(), this.password.trim()).subscribe({
      next: (user) => {
        console.log('Login successful:', user);
        this.router.navigateByUrl('/plaza');
      },
      error: (error) => {
        console.error('Login error:', error);
        this.error = error.message || 'Login failed / 登录失败';
        this.loading = false;
      }
    });
  }
}
