/**
 * 群组/频道相关读取与简单加入逻辑（localStorage）
 * - 列出全部群组/频道（广场）
 * - 列出我的群组（聊天页左侧）
 * - 加入群组（占位：不做审批流）
 * 群组服务：只暴露业务接口（内部调 StorageService）
 */
// src/app/core/services/group.service.ts
import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';
import { Group, Channel, User } from '../models';
import { uid } from '../utils';

@Injectable({ providedIn: 'root' })
export class GroupService {
  constructor(private store: StorageService) {}

  // 读取全部群组
  allGroups(): Group[] {
    return this.store.groups();
  }

  // 读取某群的频道 —— 一定要按 groupId 过滤
  channelsOfGroup(groupId: string): Channel[] {
    return this.store.channels().filter(c => c.groupId === groupId);
  }

  // （供 Chat/导航使用）返回当前用户可见的群组
  myGroups(user: User | null): Group[] {
    if (!user) return [];
    const all = this.store.groups();
    const roles = user.roles || [];

    if (roles.includes('super')) return all;
    if (roles.includes('groupAdmin')) {
      return all.filter(g => g.adminIds.includes(user.id) || g.ownerId === user.id || g.memberIds.includes(user.id));
    }
    return all.filter(g => g.memberIds.includes(user.id));
  }

  // 新建群组（并创建一个默认 general 频道）
  addGroup(name: string, ownerId: string): Group {
    const groups = this.store.groups();
    const g: Group = {
      id: uid('g_'),
      name,
      ownerId,
      adminIds: [ownerId],
      memberIds: [ownerId],
    };
    this.store.saveGroups([...groups, g]); // ✅ 使用 saveGroups

    return g;
  }

  // 删除群组（连带删掉该群所有频道）
  removeGroup(groupId: string): void {
    const groups = this.store.groups().filter(g => g.id !== groupId);
    const channels = this.store.channels().filter(c => c.groupId !== groupId);
    this.store.saveGroups(groups);     // ✅
    this.store.saveChannels(channels); // ✅
  }

  // 群组加人
  addUserToGroup(userId: string, groupId: string): void {
    const groups = this.store.groups().map(g => {
      if (g.id !== groupId) return g;
      return g.memberIds.includes(userId) ? g : { ...g, memberIds: [...g.memberIds, userId] };
    });
    this.store.saveGroups(groups); // ✅
  }

  // 群组移除人（并从该群所有频道移除）
  removeUserFromGroup(userId: string, groupId: string): void {
    const groups = this.store.groups().map(g => {
      if (g.id !== groupId) return g;
      return { ...g, memberIds: g.memberIds.filter(id => id !== userId) };
    });
    const channels = this.store.channels().map(c => {
      if (c.groupId !== groupId) return c;
      return { ...c, memberIds: c.memberIds.filter(id => id !== userId) };
    });
    this.store.saveGroups(groups);     // ✅
    this.store.saveChannels(channels); // ✅
  }

  // 新建频道（注意要绑定到传入 groupId）
  addChannel(groupId: string, name: string): Channel {
    const channels = this.store.channels();
    const ch: Channel = { id: uid('c_'), name, groupId, memberIds: [] };
    this.store.saveChannels([...channels, ch]); // ✅
    return ch;
  }

  // 频道加人
  addUserToChannel(userId: string, channelId: string): void {
    const channels = this.store.channels().map(c => {
      if (c.id !== channelId) return c;
      return c.memberIds.includes(userId) ? c : { ...c, memberIds: [...c.memberIds, userId] };
    });
    this.store.saveChannels(channels); // ✅
  }

  // 频道移除人
  removeUserFromChannel(userId: string, channelId: string): void {
    const channels = this.store.channels().map(c => {
      if (c.id !== channelId) return c;
      return { ...c, memberIds: c.memberIds.filter(id => id !== userId) };
    });
    this.store.saveChannels(channels); // ✅
  }
}
