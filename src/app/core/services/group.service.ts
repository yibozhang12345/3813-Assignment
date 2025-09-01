import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';
import { Channel, Group, User } from '../models';

@Injectable({ providedIn: 'root' })
export class GroupService {
  constructor(private store: StorageService) {}

  allGroups(): Group[] { return this.store.groups(); }
  allChannels(): Channel[] { return this.store.channels(); }

  channelsOfGroup(groupId: string): Channel[] {
    return this.allChannels().filter(c => c.groupId === groupId);
  }

  myGroups(user: User | null): Group[] {
    if (!user) return [];
    return this.allGroups().filter(g => g.memberIds.includes(user.id));
  }

  joinGroup(user: User, groupId: string){
    const groups = this.store.groups();
    const g = groups.find(x=>x.id===groupId); if (!g) return;
    if (!g.memberIds.includes(user.id)) g.memberIds.push(user.id);
    const users = this.store.users();
    const idx = users.findIndex(u=>u.id===user.id);
    if (idx>=0 && !users[idx].groups.includes(groupId)) users[idx].groups.push(groupId);
    this.store.saveUsers(users);
    localStorage.setItem('groups', JSON.stringify(groups));
  }
}
