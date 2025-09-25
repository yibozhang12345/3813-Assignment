/**
 * 应用入口：使用 Standalone 方式启动根组件，并注入路由和HTTP客户端
 * Application entry: Bootstrap root component with routing and HTTP client
 */
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { AppComponent } from './app/app';  // 根组件 / Root component
import { routes } from './app/app.routes'; // 路由表 / Route table

bootstrapApplication(AppComponent, {
  providers: [
    // 提供全局路由：让 <router-outlet> 能工作 / Provide global routing
    provideRouter(routes),
    // 提供HTTP客户端：让服务能调用后端API / Provide HTTP client for backend API calls
    provideHttpClient(withInterceptorsFromDi()),
  ],
}).catch(err => console.error(err));
