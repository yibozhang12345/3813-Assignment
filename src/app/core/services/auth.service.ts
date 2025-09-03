import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';
import { User } from '../models';
//认证服务：记住/清除用户名、角色工具、守卫使用
@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private store: StorageService) { this.store.seed(); }

  isLoggedIn(): boolean { return !!this.currentUser(); }
  currentUser(): User | null { return this.store.authUser(); }

  displayName(): string {
    const u = this.currentUser();
    return u ? (u.username?.trim() || u.email) : '';
  }
  isSuper(){ return this.currentUser()?.roles.includes('super') ?? false; }
  isGroupAdmin(){ 
    const u = this.currentUser(); 
    return !!u && (u.roles.includes('groupAdmin') || u.roles.includes('super'));
  }

  login(email: string, password: string): User {
    const found = this.store.users().find(u => u.email === email && u.password === password);
    if (!found) throw new Error('邮箱或密码错误');
    this.store.setAuthUser(found);
    this.store.setLastUsername(found.username || found.email); // ✅ 记住用户名
    return found;
  }

  logout(){
    this.store.setAuthUser(null);
    this.store.clearLastUsername(); // ✅ 注销时清除
  }

  register(payload: {email:string; password:string; username?:string}): User {
    const users = this.store.users();
    if (users.some(u => u.email === payload.email)) throw new Error('邮箱已被注册');
    if (payload.username && this.store.usernameExists(payload.username)) throw new Error('用户名已存在');
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
    this.store.setLastUsername(newUser.username || newUser.email);
    return newUser;
  }

  updateProfile(patch: Partial<Pick<User,'username'|'email'|'password'>>){
    const u = this.currentUser(); if (!u) return;
    const users = this.store.users();
    const idx = users.findIndex(x=>x.id===u.id);
    if (idx>=0){
      users[idx] = {...u, ...patch};
      this.store.saveUsers(users);
      this.store.setAuthUser(users[idx]);
      this.store.setLastUsername(users[idx].username || users[idx].email);
    }
  }
}
