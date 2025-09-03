import { Injectable } from '@angular/core';
import { Channel, Group, User, Role } from '../models';
//本地存储与种子数据 + 用户/组/频道管理 + 记住用户名
@Injectable({ providedIn: 'root' })
export class StorageService {
  private K_USERS = 'users';
  private K_GROUPS = 'groups';
  private K_CHANNELS = 'channels';
  private K_AUTH = 'auth_user';
  private K_LAST = 'last_username'; // ✅ 登录记住的用户名

  // 初次运行注入演示数据
seed() {
  if (!localStorage.getItem('seeded')) {
    // ✅ 明确为 User[]，并把 roles 标成 Role[]，groups 标成 string[]
    const users: User[] = [
      {
        id: 'u1',
        username: 'super123',
        email: 'super@test.com',
        password: '123',
        roles: ['super'] as Role[],        // ✅ 不是 string[]，而是 Role[]
        groups: [] as string[],            // ✅ 明确为空的 string[]，避免推断为 never[]
      },
      {
        id: 'u2',
        username: 'alice',
        email: 'alice@test.com',
        password: '123',
        roles: ['groupAdmin'] as Role[],   // ✅
        groups: [] as string[],
      },
      {
        id: 'u3',
        username: 'bob',
        email: 'bob@test.com',
        password: '123',
        roles: ['user'] as Role[],         // ✅
        groups: [] as string[],
      },
      {
        id: 'u4',
        username: 'charlie',
        email: 'charlie@test.com',
        password: '123',
        roles: ['user'] as Role[],         // ✅
        groups: [] as string[],
      },
    ];

    const groups: Group[] = [
      { id:'g1', name:'General', ownerId:'u2', adminIds:['u2'], memberIds:['u1','u2','u3'] },
      { id:'g2', name:'Tech',    ownerId:'u1', adminIds:['u1'], memberIds:['u1','u4'] }
    ];

    const channels: Channel[] = [
      { id:'c1', name:'general', groupId:'g1', memberIds:['u1','u2','u3'] },
      { id:'c2', name:'general', groupId:'g2', memberIds:['u1','u4'] }
    ];

    this.saveUsers(users);     // ✅ 原来是 setUsers
    this.saveGroups(groups);   // ✅ 原来是 setGroups
    this.saveChannels(channels); // ✅ 原来是 setChannels
    localStorage.setItem('seeded','1');
  }
}


  // ---- 通用读写 ----
  private read<T>(k:string): T|null { const raw=localStorage.getItem(k); return raw? JSON.parse(raw) as T: null; }
  private write<T>(k:string, v:T){ localStorage.setItem(k, JSON.stringify(v)); }

  users(): User[] { return this.read<User[]>(this.K_USERS) ?? []; }
  saveUsers(u:User[]){ this.write(this.K_USERS,u); }

  groups(): Group[] { return this.read<Group[]>(this.K_GROUPS) ?? []; }
  saveGroups(g:Group[]){ this.write(this.K_GROUPS,g); }

  channels(): Channel[] { return this.read<Channel[]>(this.K_CHANNELS) ?? []; }
  saveChannels(c:Channel[]){ this.write(this.K_CHANNELS,c); }

  authUser(): User | null { return this.read<User>(this.K_AUTH); }
  setAuthUser(u:User|null){ u? this.write(this.K_AUTH,u): localStorage.removeItem(this.K_AUTH); }

  setLastUsername(name:string){ localStorage.setItem(this.K_LAST, name); }
  getLastUsername(): string { return localStorage.getItem(this.K_LAST) ?? ''; }
  clearLastUsername(){ localStorage.removeItem(this.K_LAST); }

  // ---- 用户管理（super） ----
  usernameExists(name:string){ return this.users().some(u => (u.username||'').toLowerCase() === name.toLowerCase()); }
  emailExists(email:string){ return this.users().some(u => u.email.toLowerCase() === email.toLowerCase()); }

  addUser(u: Omit<User,'id'|'groups'|'roles'> & {roles:User['roles']}): User {
    const users = this.users();
    const id = 'u' + (users.length + 1);
    const nu: User = { id, groups:[], ...u };
    users.push(nu); this.saveUsers(users);
    return nu;
  }
  deleteUser(userId:string){
    this.saveUsers(this.users().filter(u=>u.id!==userId));
    // 同步从组/频道中移除
    const gs = this.groups().map(g => ({...g, memberIds: g.memberIds.filter(id=>id!==userId), adminIds: g.adminIds.filter(id=>id!==userId)}));
    this.saveGroups(gs);
    const cs = this.channels().map(c => ({...c, memberIds: c.memberIds.filter(id=>id!==userId)}));
    this.saveChannels(cs);
  }

  // ---- 群组/频道管理（groupAdmin/super） ----
  addGroup(name:string, ownerId:string): Group {
    const gs = this.groups();
    const id = 'g' + (gs.length + 1);
    const g: Group = { id, name, ownerId, adminIds:[ownerId], memberIds:[ownerId] };
    gs.push(g); this.saveGroups(gs); return g;
  }
  removeGroup(groupId:string){
    this.saveGroups(this.groups().filter(g=>g.id!==groupId));
    this.saveChannels(this.channels().filter(c=>c.groupId!==groupId));
  }
  addUserToGroup(userId:string, groupId:string){
    const gs = this.groups(); const g = gs.find(x=>x.id===groupId); if(!g) return;
    if(!g.memberIds.includes(userId)) g.memberIds.push(userId);
    this.saveGroups(gs);
  }
  removeUserFromGroup(userId:string, groupId:string){
    const gs = this.groups(); const g = gs.find(x=>x.id===groupId); if(!g) return;
    g.memberIds = g.memberIds.filter(id=>id!==userId);
    this.saveGroups(gs);
    // 同时把该用户从此组的所有频道踢出
    const cs = this.channels().map(c => c.groupId===groupId? {...c, memberIds: c.memberIds.filter(id=>id!==userId)}: c);
    this.saveChannels(cs);
  }

  addChannel(groupId:string, name:string): Channel {
    const cs = this.channels();
    const id = 'c' + (cs.length + 1);
    const ch: Channel = { id, name, groupId, memberIds:[] };
    cs.push(ch); this.saveChannels(cs); return ch;
  }
  addUserToChannel(userId:string, channelId:string){
    const cs = this.channels(); const c = cs.find(x=>x.id===channelId); if(!c) return;
    if(!c.memberIds.includes(userId)) c.memberIds.push(userId);
    this.saveChannels(cs);
  }
  removeUserFromChannel(userId:string, channelId:string){
    const cs = this.channels(); const c = cs.find(x=>x.id===channelId); if(!c) return;
    c.memberIds = c.memberIds.filter(id=>id!==userId);
    this.saveChannels(cs);
  }
}
