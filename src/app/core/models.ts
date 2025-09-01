/**
 * 统一的数据模型接口（User / Group / Channel）
 * - username 为用户自定义显示名；发言时优先使用
 */
export type Role = 'super' | 'groupAdmin' | 'user';

export interface User {
  id: string;
  email: string;
  password: string;   // Phase 1 演示用（明文存本地）；Phase 2 会改
  username?: string;  // 自定义显示名
  roles: Role[];
  groups: string[];   // 所属群组 ID 列表
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
  groupId: string;    // 所属群组
}
