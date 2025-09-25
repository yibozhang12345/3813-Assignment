import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { GroupService } from '../../core/services/group.service';
import { StorageService } from '../../core/services/storage.service';
import { Group, Channel, User } from '../../core/models';

@Component({
  standalone: true,
  selector: 'app-groups-admin',
  imports: [CommonModule, FormsModule],
  styles: [`
    .groups-container{display:flex;flex-wrap:wrap;gap:12px}
    .group-card{flex:0 0 25%;max-width:25%;box-sizing:border-box;padding:12px;border:1px solid #1f2937;border-radius:8px}
    ul{list-style:none;padding:0;margin:6px 0}
    li{margin-bottom:6px}
    .row{display:flex;gap:8px;align-items:center}
    .input{padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px}
    .btn{padding:6px 10px;border:none;border-radius:6px;background:#2563eb;color:#fff;cursor:pointer}
    .btn:disabled{opacity:.5;cursor:not-allowed}
    .card{padding:12px;border:1px solid #cbd5e1;border-radius:10px}
    .stack{display:grid;gap:8px}
    .small{font-size:.9rem;color:#475569}
  `],
  template: `
  <div class="card" *ngIf="auth.isGroupAdmin(); else noPermTmpl">
    <h3>Groups / Channels Management (groupAdmin/super)</h3>

    <!-- 创建新群组 -->
    <div class="stack">
      <h4>Create a new group</h4>
      <input class="input" placeholder="Group name" [(ngModel)]="gname" name="gname">
      <label class="small">Owner</label>
      <select class="input" [(ngModel)]="ownerId" name="ownerId">
        <option *ngFor="let u of users" [value]="u.id">{{ nameOf(u) }}</option>
      </select>
      <button class="btn" (click)="createGroup()">Create group</button>
    </div>

    <hr>

    <div class="groups-container">
      <div class="group-card" *ngFor="let g of visibleGroups(); trackBy: trackByGroup">
        <div class="row" style="justify-content:space-between;align-items:center">
          <b>{{ g.name }}</b>
          <button class="btn" style="background:#b91c1c" (click)="removeGroup(g.id)">
            Delete group
          </button>
        </div>

        <div class="small">Members:</div>
        <ul>
          <li *ngFor="let m of membersOf(g); trackBy: trackByUser">
            {{ nameOf(m) }}
            <button class="btn" style="background:#64748b"
                    (click)="removeUserFromGroup(m.id, g.id)">
              Remove from group
            </button>
          </li>
        </ul>

        <!-- 每个群组独立的用户选择器 -->
        <div class="row">
          <select class="input" [(ngModel)]="pickerUserByGroup[g.id]">
            <option [ngValue]="null">Select user</option>
            <option *ngFor="let u of users" [ngValue]="u">{{ nameOf(u) }}</option>
          </select>
          <button class="btn" (click)="addUserToGroup(g.id)" [disabled]="!pickerUserByGroup[g.id]">
            Add to group
          </button>
        </div>

        <hr>

        <div class="small">Channels:</div>
        <ul>
          <li *ngFor="let c of channelsOf(g); trackBy: trackByChannel">
            #{{ c.name }}
            <div class="small">Members:
              <span *ngFor="let u of usersOfChannel(c);trackBy: trackByUser"> {{ nameOf(u) }} </span>
            </div>

            <!-- 每个频道独立的用户选择器 -->
            <div class="row">
              <select class="input" [(ngModel)]="pickerUserByChannel[c.id]">
                <option [ngValue]="null">Select user</option>
                <option *ngFor="let u of membersOf(g)" [ngValue]="u">{{ nameOf(u) }}</option>
              </select>
              <button class="btn" (click)="addUserToChannel(c.id)" [disabled]="!pickerUserByChannel[c.id]">
                Add to channel
              </button>
            </div>

            <div class="row">
              <select class="input" [(ngModel)]="pickerUserByChannel[c.id]">
                <option [ngValue]="null">Select user</option>
                <option *ngFor="let u of usersOfChannel(c)" [ngValue]="u">{{ nameOf(u) }}</option>
              </select>
              <button class="btn" style="background:#64748b"
                      (click)="removeUserFromChannel(pickerUserByChannel[c.id]?.id!, c.id)"
                      [disabled]="!pickerUserByChannel[c.id]">
                Remove from channel
              </button>
            </div>
          </li>
        </ul>

        <div class="row">
          <input class="input" placeholder="New channel name" [(ngModel)]="cname" name="cname">
          <button class="btn" (click)="createChannel(g.id, cname); cname=''">
            Create channel
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- 没权限时显示的模板（注意这是模板引用，不是类属性） -->
  <ng-template #noPermTmpl>
    <div class="card">groupAdmin or super role required.</div>
  </ng-template>
  `
})
export class GroupsAdminComponent {
  users: User[] = [];
  groups: Group[] = [];
    // 放在类里任意位置（比如工具方法后面）
trackByGroup   = (_: number, g: Group)   => g.id;
trackByUser    = (_: number, u: User)    => u.id;
trackByChannel = (_: number, c: Channel) => c.id;

  gname = '';          // 新群组名称
  ownerId = '';        // 选定所有者 id
  cname = '';          // 新频道名称

  // 每个群组/频道独立的用户选择器，避免相互覆盖
  pickerUserByGroup: Record<string, User|null> = {};
  pickerUserByChannel: Record<string, User|null> = {};

  constructor(
    public auth: AuthService,
    private store: StorageService,
    private svc: GroupService
  ) {
    this.users = this.store.users();
    this.groups = this.svc.allGroups();

    const me = this.auth.currentUser();
    this.ownerId = me?.id || this.users[0]?.id || '';
  }

  // 工具方法
  nameOf(u: User) { return u.username || u.email; }
  membersOf(g: Group) { return this.users.filter(u => g.memberIds.includes(u.id)); }
  channelsOf(g: Group) { return this.svc.channelsOfGroup(g.id); }
  usersOfChannel(c: Channel) { return this.users.filter(u => c.memberIds.includes(u.id)); }

  // 可见群组：super -> 全部；groupAdmin -> 自己管理/拥有；其他 -> 空
  visibleGroups(): Group[] {
    const me = this.auth.currentUser();
    if (!me) return [];
    if (this.auth.isSuper()) return this.groups;
    if (this.auth.isGroupAdmin()) {
      return this.groups.filter(g => g.adminIds.includes(me.id) || g.ownerId === me.id);
    }
    return [];
  }

  private refresh() {
    this.groups = this.svc.allGroups();
    this.users  = this.store.users();
  }

  // 操作
  createGroup() {
    if (!this.gname || !this.ownerId) return;
    this.svc.addGroup(this.gname, this.ownerId);
    this.gname = '';
    this.refresh();
  }

  removeGroup(id: string) {
    this.svc.removeGroup(id);
    this.refresh();
  }

  addUserToGroup(gid: string) {
    const u = this.pickerUserByGroup[gid];
    if (!u) return;
    this.svc.addUserToGroup(u.id, gid);
    this.pickerUserByGroup[gid] = null;
    this.refresh();
  }

  removeUserFromGroup(uid: string, gid: string) {
    this.svc.removeUserFromGroup(uid, gid);
    this.refresh();
  }

  createChannel(gid: string, name: string) {
    if (!name) return;
    this.svc.addChannel(gid, name);
    this.refresh();
  }

  addUserToChannel(cid: string) {
    const u = this.pickerUserByChannel[cid];
    if (!u) return;
    this.svc.addUserToChannel(u.id, cid);
    this.pickerUserByChannel[cid] = null;
    this.refresh();
  }

  removeUserFromChannel(uid: string, cid: string) {
    this.svc.removeUserFromChannel(uid, cid);
    this.refresh();
  }
}
