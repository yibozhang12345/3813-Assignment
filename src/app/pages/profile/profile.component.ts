import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone:true,
  selector:'app-profile',
  template:`
  <div class="card stack" *ngIf="auth.currentUser(); else needLogin">
    <h3>个人资料</h3>
    <label class="small">昵称</label>
    <input class="input" [(ngModel)]="username" name="username" placeholder="昵称（可选）">
<br>
    <label class="small">电子邮件</label>
    <input class="input" [(ngModel)]="email" name="email">
<br>
    <label class="small">密码</label>
    <input class="input" type="password" [(ngModel)]="password" name="password">
<br>
    <div class="row">
      <button class="btn" (click)="save()">保存</button>
      <button class="btn" style="background:#64748b" title="占位功能">账号注销</button>
    </div>
    <div class="small">当前展示名：<b>{{ auth.displayName() }}</b></div>
  </div>

  <ng-template #needLogin>
    <div class="card">请先 <a routerLink="/login">登录</a></div>
  </ng-template>
  `,
  imports:[CommonModule, FormsModule]
})
export class ProfileComponent {
  username=''; email=''; password='';
  constructor(public auth:AuthService){
    const u=auth.currentUser(); if(u){ this.username=u.username||''; this.email=u.email; this.password=u.password; }
  }
  save(){ this.auth.updateProfile({username:this.username,email:this.email,password:this.password}); }
}
