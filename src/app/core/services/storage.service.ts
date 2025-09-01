/**
 * localStorage 读写封装 + 种子数据初始化
 * Phase 1：所有数据放本地，满足演示需求
 */
import { Injectable } from '@angular/core';
import { Channel, Group, User } from '../models';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private K_USERS='users';
  private K_GROUPS='groups';
  private K_CHANNELS='channels';
  private K_AUTH='auth_user';

  // 初始化种子数据：第一次运行时创建示例用户/群组/频道
  seed() {
    if (!localStorage.getItem(this.K_USERS)) {
      const users: User[] = [
        { id:'u1', email:'super@example.com', password:'123', username:'super', roles:['super'], groups:['g1'] },
        { id:'u2', email:'alice@example.com', password:'123', username:'alice', roles:['user'], groups:['g1'] },
      ];
      const groups: Group[] = [
        { id:'g1', name:'General', ownerId:'u1', adminIds:['u1'], memberIds:['u1','u2'] },
        { id:'g2', name:'Tech',    ownerId:'u1', adminIds:['u1'], memberIds:['u1'] }
      ];
      const channels: Channel[] = [
        { id:'c1', name:'general', groupId:'g1' },
        { id:'c2', name:'random',  groupId:'g1' },
        { id:'c3', name:'dev',     groupId:'g2' }
      ];
      localStorage.setItem(this.K_USERS, JSON.stringify(users));
      localStorage.setItem(this.K_GROUPS, JSON.stringify(groups));
      localStorage.setItem(this.K_CHANNELS, JSON.stringify(channels));
    }
  }

  // 通用读写工具
  private read<T>(key:string): T | null {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  }
  private write<T>(key:string, val:T){ localStorage.setItem(key, JSON.stringify(val)); }

  users(): User[] { return this.read<User[]>(this.K_USERS) ?? []; }
  saveUsers(u:User[]){ this.write(this.K_USERS,u); }

  groups(): Group[] { return this.read<Group[]>(this.K_GROUPS) ?? []; }
  channels(): Channel[] { return this.read<Channel[]>(this.K_CHANNELS) ?? []; }

  authUser(): User | null { return this.read<User>(this.K_AUTH); }
  setAuthUser(u:User|null){ u? this.write(this.K_AUTH,u) : localStorage.removeItem(this.K_AUTH); }
}
