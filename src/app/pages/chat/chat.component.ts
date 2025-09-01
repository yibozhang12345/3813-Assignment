import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { GroupService } from '../../core/services/group.service';
import { SocketsService } from '../../core/services/sockets.service';
import { Group, Channel } from '../../core/models';

@Component({
  standalone:true,
  selector:'app-chat',
  template:`
  <div class="card" *ngIf="auth.isLoggedIn(); else needLogin">
    <h3>聊天</h3>

    <div class="row">
      <div class="stack" style="min-width:240px;flex:0 0 260px">
        <div class="small">我的群组</div>
        <ul>
          <li *ngFor="let g of myGroups" [class.sel]="g.id===activeGroupId" (click)="selectGroup(g)">
            {{ g.name }}
          </li>
        </ul>

        <div class="small" *ngIf="activeGroupId">频道</div>
        <ul *ngIf="activeGroupId">
          <li *ngFor="let c of channels" [class.sel]="c.id===activeChannelId" (click)="selectChannel(c)">
            #{{ c.name }}
          </li>
        </ul>
      </div>

      <div class="stack" style="flex:1">
        <div class="card" style="min-height:240px">
          <div class="small" *ngIf="!activeChannelId">请选择左侧频道开始聊天</div>
          <div *ngFor="let m of feed">{{ m }}</div>
        </div>

        <form class="row" (ngSubmit)="send()" *ngIf="activeChannelId">
          <input class="input" [(ngModel)]="text" name="text" placeholder="发言..." required>
          <button class="btn" type="submit">发送</button>
        </form>
      </div>
    </div>
  </div>

  <ng-template #needLogin><div class="card">请先 <a routerLink="/login">登录</a></div></ng-template>
  `,
  styles:[`
    ul{list-style:none;margin:6px 0;padding:0}
    li{padding:6px 8px;border-radius:8px;cursor:pointer}
    li.sel {
  background: #fffacd;   /* 淡黄色 */
  color: black;          /* 确保文字颜色可读 */
}

li:hover {
  background: #fef3c7;   /* 鼠标悬停时也可用淡黄色，或者保持原来的深灰 */
}
  `],
  imports:[CommonModule, FormsModule]
})
export class ChatComponent implements OnInit {
  myGroups: Group[] = [];
  channels: Channel[] = [];
  activeGroupId?: string;
  activeChannelId?: string;

  feed: string[] = [];      // 简单的消息流
  text = '';

  constructor(
    public auth:AuthService,
    private groupSvc:GroupService,
    private sockets:SocketsService
  ){}

  ngOnInit(){
    this.myGroups = this.groupSvc.myGroups(this.auth.currentUser());
    this.sockets.onMessage().subscribe((msg:any)=>{
      const by = msg?.user || '匿名';
      const name = msg?.channelId ? `#${msg.channelId}`: '';
      this.feed.push(`${by}${name?(' @'+name):''}: ${msg?.text}`);
    });
  }

  selectGroup(g:Group){
    this.activeGroupId = g.id;
    this.channels = this.groupSvc.channelsOfGroup(g.id);
    this.activeChannelId = undefined;
  }
  selectChannel(c:Channel){ this.activeChannelId = c.id; }

  send(){
    if(!this.text.trim()) return;
    const user = this.auth.displayName();
    this.sockets.sendMessage({
      user,
      text: this.text.trim(),
      groupId: this.activeGroupId,
      channelId: this.activeChannelId
    });
    this.text='';
  }
}
