/**
 * 个人资料：
 * - 修改用户名（发言优先显示）、邮箱、密码
 * - “账号注销”按钮为占位（无需实现）
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone:true,
  selector:'app-profile',
  template:`
  <div class="card stack" *ngIf="auth.currentUser(); else needLogin">
    <h3>profile</h3>
    <label class="small">username</label>
    <input class="input" [(ngModel)]="username" name="username" placeholder="username（optional）">
<br>
    <label class="small">email</label>
    <input class="input" [(ngModel)]="email" name="email">
<br>
    <label class="small">password</label>
    <input class="input" type="password" [(ngModel)]="password" name="password">
<br>
    <div class="row">
      <button class="btn" (click)="save()">save</button>
      <button class="btn" style="background:#64748b" title="占位功能">Account deletion</button>
    </div>
    <div class="small">Current user：<b>{{ auth.displayName() }}</b></div>
  </div>

  <ng-template #needLogin>
    <div class="card">plase <a routerLink="/login">login</a></div>
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
