/**
 * 认证服务：
 * - login / logout / register
 * - currentUser / displayName
 * - updateProfile
 * 注意：Phase 1 使用 localStorage；Phase 2 会改为后端 + 数据库
 */
import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';
import { User } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private store: StorageService) { this.store.seed(); }

  isLoggedIn(): boolean { return !!this.currentUser(); }
  currentUser(): User | null { return this.store.authUser(); }

  /** 发言显示名：优先 username（自定义昵称），否则 email */
  displayName(): string {
    const u = this.currentUser();
    return u ? (u.username?.trim() || u.email) : '';
  }

  /** 登录：邮箱 + 密码（Phase 1：对比 localStorage） */
  login(email: string, password: string): User {
    const found = this.store.users().find(u => u.email === email && u.password === password);
    if (!found) throw new Error('email or password error');
    this.store.setAuthUser(found);
    return found;
  }

  /** 退出登录：清空登录态 */
  logout(){ this.store.setAuthUser(null); }

  /** 注册：创建新用户并直接登录 */
  register(payload: {email:string; password:string; username?:string}): User {
    const users = this.store.users();
    if (users.some(u => u.email === payload.email)) throw new Error('The email has already been registered');
    const newUser: User = {
      id: 'u'+(users.length+1),
      email: payload.email,
      password: payload.password,
      username: payload.username?.trim(),
      roles:['user'],
      groups:[]
    };
    users.push(newUser);
    this.store.saveUsers(users);
    this.store.setAuthUser(newUser);
    return newUser;
  }

  /** 修改个人资料：用户名/邮箱/密码 */
  updateProfile(patch: Partial<Pick<User,'username'|'email'|'password'>>){
    const u = this.currentUser(); if (!u) return;
    const users = this.store.users();
    const idx = users.findIndex(x=>x.id===u.id);
    if (idx>=0){
      users[idx] = {...u, ...patch};
      this.store.saveUsers(users);
      this.store.setAuthUser(users[idx]); // 同步登录态
    }
  }
}
