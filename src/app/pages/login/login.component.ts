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
    <h3>登录</h3>
    <div class="stack">
      <input class="input" placeholder="电子邮件" [(ngModel)]="email" name="email">
      <input class="input" type="password" placeholder="密码" [(ngModel)]="password" name="password">
      <button class="btn" (click)="doLogin()">登录</button>
      <div class="small" *ngIf="error">{{ error }}</div>
      <div class="small">还没有账号？ <a routerLink="/register">注册</a></div>
    </div>
  </div>
  `,
  imports: [CommonModule, FormsModule]
})
export class LoginComponent {
  email = 'super@example.com'; password = '123'; error = '';
  constructor(private auth: AuthService, private router: Router) {}
  doLogin(){
    this.error='';
    try{ this.auth.login(this.email.trim(), this.password.trim()); this.router.navigateByUrl('/plaza'); }
    catch(e:any){ this.error = e?.message || '登录失败'; }
  }
}
