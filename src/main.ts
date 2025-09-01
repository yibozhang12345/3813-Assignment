/**
 * 应用入口：使用 Standalone 方式启动根组件，并注入路由
 */
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app/app';  // 根组件
import { routes } from './app/app.routes'; // 路由表

bootstrapApplication(AppComponent, {
  providers: [
    // 提供全局路由：让 <router-outlet> 能工作
    provideRouter(routes),
  ],
}).catch(err => console.error(err));
