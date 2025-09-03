
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
/**
 * 登录页：邮箱 + 密码，自动带出上次用户名
 * 如果你希望“用户名登录”而不是 email，把模板的输入框 label 改为“用户名/邮箱”即可；AuthService 里现在仍按 email+password 校验，Phase-1 足够。
 * - 成功后跳转到 /plaza
 */
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
  email = '';
  password = '123';
  error = '';

  constructor(private auth: AuthService, private router: Router) {
    // ✅ 自动带出上次用户名（若你希望是 email 就保持 email；若想带 username，可在 UI 上显示）
    const last = (auth as any)['store'].getLastUsername?.() || '';
    if (last && last.includes('@')) this.email = last;
  }

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
