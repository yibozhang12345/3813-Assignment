/**
 * 群组/频道相关服务：使用MongoDB后端API进行群组和频道管理
 * Group/Channel service: Use MongoDB backend API for group and channel management
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Group, Channel, User } from '../models';
import { AppConfig } from '../../app.config';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class GroupService {
  constructor(private http: HttpClient, private authService: AuthService) {}

  // 获取认证头 / Get authentication headers
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  // 获取用户的群组列表 / Get user's groups
  getUserGroups(): Observable<Group[]> {
    return this.http.get<any>(`${AppConfig.apiUrl}/api/groups`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data.groups;
        }
        throw new Error(response.message || 'Failed to get groups / 获取群组失败');
      }),
      catchError(error => {
        console.error('Get groups error:', error);
        const message = error.error?.message || 'Failed to get groups / 获取群组失败';
        return throwError(() => new Error(message));
      })
    );
  }

  // 获取所有群组 (仅超级管理员) / Get all groups (super admin only)
  getAllGroups(page: number = 1, limit: number = 10, search?: string): Observable<{groups: Group[], pagination: any}> {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', limit.toString());
    if (search) {
      params.set('search', search);
    }

    return this.http.get<any>(`${AppConfig.apiUrl}/api/groups/all?${params.toString()}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return {
            groups: response.data.groups,
            pagination: response.data.pagination
          };
        }
        throw new Error(response.message || 'Failed to get all groups / 获取所有群组失败');
      }),
      catchError(error => {
        console.error('Get all groups error:', error);
        const message = error.error?.message || 'Failed to get all groups / 获取所有群组失败';
        return throwError(() => new Error(message));
      })
    );
  }

  // 获取群组详情 / Get group details
  getGroupDetails(groupId: string): Observable<Group> {
    return this.http.get<any>(`${AppConfig.apiUrl}/api/groups/${groupId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data.group;
        }
        throw new Error(response.message || 'Failed to get group details / 获取群组详情失败');
      }),
      catchError(error => {
        console.error('Get group details error:', error);
        const message = error.error?.message || 'Failed to get group details / 获取群组详情失败';
        return throwError(() => new Error(message));
      })
    );
  }

  // 创建群组 / Create group
  createGroup(name: string, description?: string): Observable<Group> {
    const groupData = { name: name.trim(), description: description?.trim() || '' };

    return this.http.post<any>(`${AppConfig.apiUrl}/api/groups`, groupData, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data.group;
        }
        throw new Error(response.message || 'Failed to create group / 创建群组失败');
      }),
      catchError(error => {
        console.error('Create group error:', error);
        const message = error.error?.message || 'Failed to create group / 创建群组失败';
        return throwError(() => new Error(message));
      })
    );
  }

  // 更新群组信息 / Update group info
  updateGroup(groupId: string, updateData: {name?: string, description?: string}): Observable<Group> {
    return this.http.put<any>(`${AppConfig.apiUrl}/api/groups/${groupId}`, updateData, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data.group;
        }
        throw new Error(response.message || 'Failed to update group / 更新群组失败');
      }),
      catchError(error => {
        console.error('Update group error:', error);
        const message = error.error?.message || 'Failed to update group / 更新群组失败';
        return throwError(() => new Error(message));
      })
    );
  }

  // 删除群组 / Delete group
  deleteGroup(groupId: string): Observable<any> {
    return this.http.delete<any>(`${AppConfig.apiUrl}/api/groups/${groupId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.success) {
          return response;
        }
        throw new Error(response.message || 'Failed to delete group / 删除群组失败');
      }),
      catchError(error => {
        console.error('Delete group error:', error);
        const message = error.error?.message || 'Failed to delete group / 删除群组失败';
        return throwError(() => new Error(message));
      })
    );
  }

  // 添加成员到群组 / Add member to group
  addMemberToGroup(groupId: string, userId: string): Observable<Group> {
    return this.http.post<any>(`${AppConfig.apiUrl}/api/groups/${groupId}/members`,
      { userId },
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data.group;
        }
        throw new Error(response.message || 'Failed to add member / 添加成员失败');
      }),
      catchError(error => {
        console.error('Add member error:', error);
        const message = error.error?.message || 'Failed to add member / 添加成员失败';
        return throwError(() => new Error(message));
      })
    );
  }

  // 从群组移除成员 / Remove member from group
  removeMemberFromGroup(groupId: string, userId: string): Observable<Group> {
    return this.http.delete<any>(`${AppConfig.apiUrl}/api/groups/${groupId}/members/${userId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data.group;
        }
        throw new Error(response.message || 'Failed to remove member / 移除成员失败');
      }),
      catchError(error => {
        console.error('Remove member error:', error);
        const message = error.error?.message || 'Failed to remove member / 移除成员失败';
        return throwError(() => new Error(message));
      })
    );
  }

  // 添加管理员 / Add admin
  addAdmin(groupId: string, userId: string): Observable<Group> {
    return this.http.post<any>(`${AppConfig.apiUrl}/api/groups/${groupId}/admins`,
      { userId },
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data.group;
        }
        throw new Error(response.message || 'Failed to add admin / 添加管理员失败');
      }),
      catchError(error => {
        console.error('Add admin error:', error);
        const message = error.error?.message || 'Failed to add admin / 添加管理员失败';
        return throwError(() => new Error(message));
      })
    );
  }

  // 获取群组的频道列表 / Get channels in a group
  getGroupChannels(groupId: string): Observable<Channel[]> {
    return this.http.get<any>(`${AppConfig.apiUrl}/api/channels?groupId=${groupId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data.channels;
        }
        throw new Error(response.message || 'Failed to get channels / 获取频道失败');
      }),
      catchError(error => {
        console.error('Get channels error:', error);
        const message = error.error?.message || 'Failed to get channels / 获取频道失败';
        return throwError(() => new Error(message));
      })
    );
  }

  // 获取频道详情 / Get channel details
  getChannelDetails(channelId: string): Observable<Channel> {
    return this.http.get<any>(`${AppConfig.apiUrl}/api/channels/${channelId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data.channel;
        }
        throw new Error(response.message || 'Failed to get channel details / 获取频道详情失败');
      }),
      catchError(error => {
        console.error('Get channel details error:', error);
        const message = error.error?.message || 'Failed to get channel details / 获取频道详情失败';
        return throwError(() => new Error(message));
      })
    );
  }

  // 创建频道 / Create channel
  createChannel(groupId: string, name: string, description?: string): Observable<Channel> {
    const channelData = {
      name: name.trim(),
      description: description?.trim() || '',
      groupId
    };

    return this.http.post<any>(`${AppConfig.apiUrl}/api/channels`, channelData, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data.channel;
        }
        throw new Error(response.message || 'Failed to create channel / 创建频道失败');
      }),
      catchError(error => {
        console.error('Create channel error:', error);
        const message = error.error?.message || 'Failed to create channel / 创建频道失败';
        return throwError(() => new Error(message));
      })
    );
  }

  // 获取消息历史 / Get message history
  getChannelMessages(channelId: string, limit: number = 50, before?: string): Observable<{messages: any[], hasMore: boolean}> {
    const params = new URLSearchParams();
    params.set('channelId', channelId);
    params.set('limit', limit.toString());
    if (before) {
      params.set('before', before);
    }

    return this.http.get<any>(`${AppConfig.apiUrl}/api/messages?${params.toString()}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return {
            messages: response.data.messages,
            hasMore: response.data.hasMore
          };
        }
        throw new Error(response.message || 'Failed to get messages / 获取消息失败');
      }),
      catchError(error => {
        console.error('Get messages error:', error);
        const message = error.error?.message || 'Failed to get messages / 获取消息失败';
        return throwError(() => new Error(message));
      })
    );
  }

  // 搜索消息 / Search messages
  searchMessages(query: string, channelId?: string, limit: number = 20): Observable<{messages: any[], count: number}> {
    const params = new URLSearchParams();
    params.set('q', query);
    params.set('limit', limit.toString());
    if (channelId) {
      params.set('channelId', channelId);
    }

    return this.http.get<any>(`${AppConfig.apiUrl}/api/messages/search?${params.toString()}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return {
            messages: response.data.messages,
            count: response.data.count
          };
        }
        throw new Error(response.message || 'Failed to search messages / 搜索消息失败');
      }),
      catchError(error => {
        console.error('Search messages error:', error);
        const message = error.error?.message || 'Failed to search messages / 搜索消息失败';
        return throwError(() => new Error(message));
      })
    );
  }

  // 获取频道统计 / Get channel statistics
  getChannelStats(channelId: string): Observable<any> {
    return this.http.get<any>(`${AppConfig.apiUrl}/api/messages/stats/${channelId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data.stats;
        }
        throw new Error(response.message || 'Failed to get channel stats / 获取频道统计失败');
      }),
      catchError(error => {
        console.error('Get channel stats error:', error);
        const message = error.error?.message || 'Failed to get channel stats / 获取频道统计失败';
        return throwError(() => new Error(message));
      })
    );
  }

  // 上传文件 / Upload file
  uploadFile(file: File, type: 'avatar' | 'image' | 'file'): Observable<{url: string, fileName?: string}> {
    const formData = new FormData();
    formData.append(type === 'avatar' ? 'avatar' : type === 'image' ? 'image' : 'file', file);

    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
      // 不设置 Content-Type，让浏览器自动设置以包含 boundary
    });

    return this.http.post<any>(`${AppConfig.apiUrl}/api/upload/${type}`, formData, {
      headers
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return {
            url: response.data.imageUrl || response.data.fileUrl || response.data.avatarUrl,
            fileName: response.data.fileName
          };
        }
        throw new Error(response.message || 'Failed to upload file / 文件上传失败');
      }),
      catchError(error => {
        console.error('Upload file error:', error);
        const message = error.error?.message || 'Failed to upload file / 文件上传失败';
        return throwError(() => new Error(message));
      })
    );
  }
}
