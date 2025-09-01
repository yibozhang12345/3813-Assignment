import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone:true,
  selector:'app-register',
  template:`
  <div class="card stack">
    <h3>注册</h3>
    <input class="input" placeholder="自定义用户名（可选）" [(ngModel)]="username" name="username">
    <input class="input" placeholder="电子邮件" [(ngModel)]="email" name="email">
    <input class="input" type="password" placeholder="密码" [(ngModel)]="password" name="password">
    <button class="btn" (click)="doRegister()">注册并登录</button>
    <div class="small" *ngIf="error">{{ error }}</div>
  </div>
  `,
  imports:[CommonModule, FormsModule]
})
export class RegisterComponent {
  username=''; email=''; password=''; error='';
  constructor(private auth:AuthService, private router:Router){}
  doRegister(){
    this.error='';
    try{ this.auth.register({email:this.email.trim(), password:this.password.trim(), username:this.username.trim()}); this.router.navigateByUrl('/plaza'); }
    catch(e:any){ this.error=e?.message||'注册失败'; }
  }
}
