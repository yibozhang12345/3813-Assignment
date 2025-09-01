/**
 * 聊天页：
 * - 左侧：我加入的群组 → 频道
 * - 右侧：消息区域 + 发言框
 * - 发言内容带上“显示名（username 优先）”、groupId、channelId
 * - 频道选中样式见 app.css 的 li.sel
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { GroupService } from '../../core/services/group.service';
import { SocketsService } from '../../core/services/sockets.service';
import { Group, Channel } from '../../core/models';

@Component({
  standalone: true,
  selector: 'app-chat',
  template: `
  <div class="card" *ngIf="auth.isLoggedIn(); else needLogin">
    <h3>chat</h3>

    <div class="row">
      <!-- 左侧：我的群组与频道 -->
      <div class="stack" style="min-width:240px;flex:0 0 260px">
        <div class="small">group</div>
        <ul>
          <li *ngFor="let g of myGroups"
              [class.sel]="g.id===activeGroupId"
              (click)="selectGroup(g)">
            {{ g.name }}
          </li>
        </ul>

        <div class="small" *ngIf="activeGroupId">channels</div>
        <ul *ngIf="activeGroupId">
          <li *ngFor="let c of channels"
              [class.sel]="c.id===activeChannelId"
              (click)="selectChannel(c)">
            #{{ c.name }}
          </li>
        </ul>
      </div>

      <!-- 右侧：聊天区 -->
      <div class="stack" style="flex:1">
        <div class="card" style="min-height:240px">
          <div class="small" *ngIf="!activeChannelId">Please select the channel on the left to start chatting</div>
          <!-- 简单消息列表 -->
          <div class="multiline" *ngFor="let m of feed">{{ m }}</div>
        </div>

        <form class="row" (ngSubmit)="send()" *ngIf="activeChannelId">
          <input class="input" [(ngModel)]="text" name="text" required>
          <button class="btn" type="submit">send</button>
        </form>
      </div>
    </div>
  </div>

  <ng-template #needLogin>
    <div class="card">please <a routerLink="/login">login</a></div>
  </ng-template>
  `,
  styles: [`
    ul{list-style:none;margin:6px 0;padding:0}
    li{padding:6px 8px;border-radius:8px;cursor:pointer}
    li.sel, li:hover{ /* hover 样式在 app.css 里可按需分开 */ }
    .multiline{ white-space:pre-line; } /* 让 \n 换行生效 */
  `],
  imports: [CommonModule, FormsModule],
})
export class ChatComponent implements OnInit {
  myGroups: Group[] = [];
  channels: Channel[] = [];
  activeGroupId?: string;
  activeChannelId?: string;

  feed: string[] = [];   // 简单的消息列表
  text = '';

  constructor(
    public  auth:AuthService,
    private groupSvc:GroupService,
    private sockets:SocketsService,
  ) {}

  ngOnInit(){
    // 初始化：列出我的群组，并订阅消息
    this.myGroups = this.groupSvc.myGroups(this.auth.currentUser());
    this.sockets.onMessage().subscribe((msg:any)=>{
      const by = msg?.user || '匿名';
      const tag = msg?.channelId ? ` #${msg.channelId}` : '';
      this.feed.push(`${by}${tag}: ${msg?.text}`);
    });
  }

  selectGroup(g:Group){
    this.activeGroupId = g.id;
    this.channels = this.groupSvc.channelsOfGroup(g.id);
    this.activeChannelId = undefined;
  }

  selectChannel(c:Channel){
    this.activeChannelId = c.id;
    // 如果 server.js 做了“房间”机制，这里通知后端加入该频道
    this.sockets.joinChannel(c.id);
  }

  send(){
    const content = this.text.trim();
    if (!content) return;
    this.sockets.sendMessage({
      user: this.auth.displayName(),
      text: content,
      groupId: this.activeGroupId,
      channelId: this.activeChannelId,
    });
    this.text = ''; // 清空输入框
  }
}
