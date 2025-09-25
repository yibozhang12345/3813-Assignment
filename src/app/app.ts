/**
 * 根组件（Standalone）
 * - 顶部导航（登录/注册 或 各页面入口）
 * - 显示当前登录用户信息
 * - 提供退出登录入口
 * - <router-outlet> 渲染各页面
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
  // Standalone 组件要在这里声明依赖模块与指令
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
})
export class AppComponent {
  constructor(public auth: AuthService) {}
  // 顶部“退出登录”按钮
  logout() { this.auth.logout(); }
}
