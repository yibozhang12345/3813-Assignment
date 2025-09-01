import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';
import { User } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private store: StorageService) { this.store.seed(); }

  isLoggedIn(): boolean { return !!this.currentUser(); }
  currentUser(): User | null { return this.store.authUser(); }

  // 发言展示名：优先 username，否则 email
  displayName(): string {
    const u = this.currentUser();
    return u ? (u.username?.trim() || u.email) : '';
  }

  login(email: string, password: string): User {
    const found = this.store.users().find(u => u.email === email && u.password === password);
    if (!found) throw new Error('邮箱或密码错误');
    this.store.setAuthUser(found);
    return found;
  }

  logout(){ this.store.setAuthUser(null); }

  register(payload: {email:string; password:string; username?:string}): User {
    const users = this.store.users();
    if (users.some(u => u.email === payload.email)) throw new Error('邮箱已被注册');
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

  updateProfile(patch: Partial<Pick<User,'username'|'email'|'password'>>){
    const u = this.currentUser(); if (!u) return;
    const users = this.store.users();
    const idx = users.findIndex(x=>x.id===u.id);
    if (idx>=0){
      users[idx] = {...u, ...patch};
      this.store.saveUsers(users);
      this.store.setAuthUser(users[idx]);
    }
  }
}
