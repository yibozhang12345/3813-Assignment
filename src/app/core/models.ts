export type Role = 'super' | 'groupAdmin' | 'user';

export interface User {
  id: string;
  email: string;
  password: string;     // Phase 1：本地存储演示
  username?: string;    // 自定义显示名（发言优先）
  roles: Role[];
  groups: string[];     // 加入的群组
}

export interface Group {
  id: string;
  name: string;
  ownerId: string;
  adminIds: string[];
  memberIds: string[];  // 组成员
}

export interface Channel {
  id: string;
  name: string;
  groupId: string;
  memberIds: string[];  // ✅ 频道成员（只有成员可见/可发言）
}
