import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone:true,
  selector:'app-notifications',
  template:`
  <div class="card stack">
    <h3>notifications（unrealized）</h3>
    <div class="small">用于处理：加入申请、群组管理员报告、被加入频道拒绝的系统通知等。</div>
    <div class="small">Phase 1 暂不实现具体逻辑，后续接入后端与权限流转。</div>
  </div>
  `,
  imports:[CommonModule]
})
export class NotificationsComponent {}
