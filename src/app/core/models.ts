export type Role = 'super' | 'groupAdmin' | 'user';

export interface User {
  id: string;
  email: string;
  password: string;          // Phase 1：纯演示，明文本地存储
  username?: string;         // 自定义显示名；发言优先展示它
  roles: Role[];
  groups: string[];          // 加入的群组ID
}

export interface Group {
  id: string;
  name: string;
  ownerId: string;
  adminIds: string[];
  memberIds: string[];
}

export interface Channel {
  id: string;
  name: string;
  groupId: string;
}
