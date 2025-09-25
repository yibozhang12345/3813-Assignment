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
        <div class="small">groups</div>
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

      <!-- 右侧：聊天区（只显示当前频道的消息） -->
      <div class="stack" style="flex:1">
        <div class="card" style="min-height:240px">
          <div class="small" *ngIf="!activeChannelId">Select a group or channel to start chatting</div>
          <div class="multiline" *ngFor="let m of viewFeed">{{ m }}</div>
        </div>

        <form class="row" (ngSubmit)="send()" *ngIf="activeChannelId">
          <input class="input" [(ngModel)]="text" name="text" placeholder="Please enter..." required>
          <button class="btn" type="submit">send</button>
        </form>
      </div>
    </div>
  </div>

  <ng-template #needLogin>
    <div class="card">plaese <a routerLink="/login">login</a></div>
  </ng-template>
  `,
  styles: [`
    ul {
  list-style: none;
  margin: 6px 0;
  padding: 0;
  display: flex;        /* 如果希望一行排列，可以加这句 */
  flex-wrap: wrap;      /* 允许换行 */
  gap: 8px;             /* 标签之间的间距 */
}

li {
  display: inline-block;   /* 关键：改为 inline-block，而不是 block */
  padding: 6px 12px;       /* 内边距，让背景比文字稍大 */
  border-radius: 8px;
  cursor: pointer;
}
    li.sel{ background:#fffacd; color:#111; }  /* 已选频道淡黄色 */
    li:hover{ background:orange; }
    .multiline{ white-space:pre-line; }       /* 让 \\n 生效 */
  `],
  imports: [CommonModule, FormsModule],
})
export class ChatComponent implements OnInit {
  myGroups: Group[] = [];
  channels: Channel[] = [];
  activeGroupId?: string;
  activeChannelId?: string;

  /** 每个频道的消息独立存储：feeds[channelId] = string[] */
  private feeds: Record<string, string[]> = {};
  /** 当前显示的消息（指向 feeds[activeChannelId]） */
  viewFeed: string[] = [];
  text = '';

  constructor(
    public  auth:AuthService,
    private groupSvc:GroupService,
    private sockets:SocketsService,
  ) {}

  ngOnInit(){
    this.myGroups = this.groupSvc.myGroups(this.auth.currentUser());

    // 订阅来自后端的消息：只入库到对应频道
    this.sockets.onMessage().subscribe((msg:any)=>{
      const ch = msg?.channelId as string | undefined;
      if (!ch) return; // 没带频道的不处理（也可放到某个“公共频道”）

      // 组装展示文本：用户名（身份）：发言
      const roles = (this.auth.currentUser()?.roles ?? []).join(', ') || 'user';
      const display = `${msg?.user ?? '匿名'}（${roles}）：${msg?.text ?? ''}`;

      // 推入该频道消息列表
      this.feeds[ch] = this.feeds[ch] ?? [];
      this.feeds[ch].push(display);

      // 如果此时正在该频道，刷新右侧视图
      if (this.activeChannelId === ch) {
        this.viewFeed = this.feeds[ch];
      }
    });
  }

  selectGroup(g:Group){
    this.activeGroupId = g.id;
    const me = this.auth.currentUser()!;    // ✅ 只显示我加入的频道
    this.channels = this.groupSvc.channelsOfGroup(g.id);
    this.activeChannelId = undefined;
    this.viewFeed = [];
  }

  selectChannel(c:Channel){
    this.activeChannelId = c.id;// 让后端把当前 socket 加入该频道“房间”
    this.sockets.joinChannel(c.id);// 切换右侧消息为该频道的历史（本地内存）
    this.viewFeed = this.feeds[c.id] ?? [];
  }

  send(){
    const content = this.text.trim();
    if (!content || !this.activeChannelId) return;
    const me = this.auth.currentUser()!;
    this.sockets.sendMessage({
      user: this.auth.displayName(),
      roles: me.roles,                   // ✅ 带上“身份”
      text: content,
      groupId: this.activeGroupId,
      channelId: this.activeChannelId,
    });
    this.text = '';
  }
}
