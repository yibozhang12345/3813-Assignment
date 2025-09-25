/**
 * 注册页：支持自定义用户名（昵称）、邮箱、密码，使用MongoDB后端API进行注册
 * Registration page: Username (nickname), email, password, register with MongoDB backend API
 * - 注册后自动登录并跳转 /plaza / Auto login and redirect to /plaza after registration
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-register',
  template: `
  <div class="card stack">
    <h3>{{ 'Register / 注册' }}</h3>
    <div class="stack">
      <input
        class="input"
        placeholder="Username / 用户名"
        [(ngModel)]="username"
        name="username"
        [disabled]="loading">
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
        (click)="doRegister()"
        [disabled]="loading || !username.trim() || !email.trim() || !password.trim()">
        {{ loading ? 'Registering... / 注册中...' : 'Register & Login / 注册并登录' }}
      </button>
      <div class="small error" *ngIf="error">{{ error }}</div>
      <div class="small">
        Already have an account? / 已有账户？
        <a routerLink="/login">Login / 登录</a>
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
      background-color: #28a745;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
    }
    .btn:hover:not(:disabled) {
      background-color: #218838;
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
export class RegisterComponent {
  username = '';
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

  doRegister() {
    this.error = '';
    this.loading = true;

    // 基本验证 / Basic validation
    if (!this.username.trim() || !this.email.trim() || !this.password.trim()) {
      this.error = 'Please fill in all fields / 请填写所有字段';
      this.loading = false;
      return;
    }

    // 用户名长度验证 / Username length validation
    if (this.username.trim().length < 2) {
      this.error = 'Username must be at least 2 characters / 用户名至少需要2个字符';
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

    // 密码长度验证 / Password length validation
    if (this.password.trim().length < 6) {
      this.error = 'Password must be at least 6 characters / 密码至少需要6个字符';
      this.loading = false;
      return;
    }

    // 调用注册API / Call registration API
    this.auth.register({
      username: this.username.trim(),
      email: this.email.trim(),
      password: this.password.trim()
    }).subscribe({
      next: (user) => {
        console.log('Registration successful:', user);
        this.router.navigateByUrl('/plaza');
      },
      error: (error) => {
        console.error('Registration error:', error);
        this.error = error.message || 'Registration failed / 注册失败';
        this.loading = false;
      }
    });
  }
}
