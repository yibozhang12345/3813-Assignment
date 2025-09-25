import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { User } from '../models';
import { AppConfig } from '../../app.config';

// 认证服务：使用MongoDB后端API进行用户认证和管理
// Authentication service: Use MongoDB backend API for user authentication and management
@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private tokenKey = 'auth_token';
  private userKey = 'auth_user';

  constructor(private http: HttpClient) {
    // 启动时检查本地存储的用户和令牌 / Check stored user and token on startup
    this.loadStoredAuth();
  }

  // 加载本地存储的认证信息 / Load stored authentication info
  private loadStoredAuth(): void {
    const token = localStorage.getItem(this.tokenKey);
    const userStr = localStorage.getItem(this.userKey);

    if (token && userStr) {
      try {
        const user: User = JSON.parse(userStr);
        this.currentUserSubject.next(user);
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        this.clearStoredAuth();
      }
    }
  }

  // 清除本地存储的认证信息 / Clear stored authentication info
  private clearStoredAuth(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUserSubject.next(null);
  }

  // 保存认证信息到本地存储 / Save authentication info to local storage
  private saveAuthData(user: User, token: string): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
    localStorage.setItem(this.tokenKey, token);
    this.currentUserSubject.next(user);
  }

  // 获取认证头 / Get authentication headers
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem(this.tokenKey);
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  // 检查是否已登录 / Check if logged in
  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value && !!localStorage.getItem(this.tokenKey);
  }

  // 获取当前用户 / Get current user
  currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // 获取显示名称 / Get display name
  displayName(): string {
    const user = this.currentUser();
    return user ? (user.username?.trim() || user.email) : '';
  }

  // 检查是否是超级管理员 / Check if super admin
  isSuper(): boolean {
    return this.currentUser()?.roles.includes('super') ?? false;
  }

  // 检查是否是群组管理员 / Check if group admin
  isGroupAdmin(): boolean {
    const user = this.currentUser();
    return !!user && (user.roles.includes('groupAdmin') || user.roles.includes('super'));
  }

  // 用户登录 / User login
  login(email: string, password: string): Observable<User> {
    const loginData = { email: email.trim(), password };

    return this.http.post<any>(`${AppConfig.apiUrl}/api/auth/login`, loginData)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            const { user, token } = response.data;
            this.saveAuthData(user, token);
            return user;
          }
          throw new Error(response.message || 'Login failed / 登录失败');
        }),
        catchError(error => {
          console.error('Login error:', error);
          const message = error.error?.message || 'Login failed / 登录失败';
          return throwError(() => new Error(message));
        })
      );
  }

  // 用户注册 / User registration
  register(payload: { email: string; password: string; username?: string }): Observable<User> {
    const registerData = {
      email: payload.email.trim(),
      password: payload.password,
      username: payload.username?.trim()
    };

    return this.http.post<any>(`${AppConfig.apiUrl}/api/auth/register`, registerData)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            const { user, token } = response.data;
            this.saveAuthData(user, token);
            return user;
          }
          throw new Error(response.message || 'Registration failed / 注册失败');
        }),
        catchError(error => {
          console.error('Registration error:', error);
          const message = error.error?.message || 'Registration failed / 注册失败';
          return throwError(() => new Error(message));
        })
      );
  }

  // 用户注销 / User logout
  logout(): Observable<any> {
    return this.http.post<any>(`${AppConfig.apiUrl}/api/auth/logout`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(() => {
        this.clearStoredAuth();
      }),
      catchError(error => {
        // 即使服务器注销失败，也清除本地数据 / Clear local data even if server logout fails
        this.clearStoredAuth();
        return throwError(() => error);
      })
    );
  }

  // 获取当前用户信息 / Get current user info
  getCurrentUserInfo(): Observable<User> {
    return this.http.get<any>(`${AppConfig.apiUrl}/api/auth/me`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          const user = response.data.user;
          // 更新本地用户信息 / Update local user info
          const token = localStorage.getItem(this.tokenKey);
          if (token) {
            this.saveAuthData(user, token);
          }
          return user;
        }
        throw new Error(response.message || 'Failed to get user info / 获取用户信息失败');
      }),
      catchError(error => {
        console.error('Get user info error:', error);
        if (error.status === 401) {
          // 令牌无效，清除本地认证信息 / Token invalid, clear local auth
          this.clearStoredAuth();
        }
        const message = error.error?.message || 'Failed to get user info / 获取用户信息失败';
        return throwError(() => new Error(message));
      })
    );
  }

  // 更新用户资料 / Update user profile
  updateProfile(patch: Partial<Pick<User, 'username' | 'email'>>): Observable<User> {
    const userId = this.currentUser()?.id;
    if (!userId) {
      return throwError(() => new Error('User not logged in / 用户未登录'));
    }

    return this.http.put<any>(`${AppConfig.apiUrl}/api/users/${userId}`, patch, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          const updatedUser = response.data.user;
          // 更新本地用户信息 / Update local user info
          const token = localStorage.getItem(this.tokenKey);
          if (token) {
            this.saveAuthData(updatedUser, token);
          }
          return updatedUser;
        }
        throw new Error(response.message || 'Failed to update profile / 更新资料失败');
      }),
      catchError(error => {
        console.error('Update profile error:', error);
        const message = error.error?.message || 'Failed to update profile / 更新资料失败';
        return throwError(() => new Error(message));
      })
    );
  }

  // 修改密码 / Change password
  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    const changeData = { currentPassword, newPassword };

    return this.http.put<any>(`${AppConfig.apiUrl}/api/auth/change-password`, changeData, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.success) {
          return response;
        }
        throw new Error(response.message || 'Failed to change password / 修改密码失败');
      }),
      catchError(error => {
        console.error('Change password error:', error);
        const message = error.error?.message || 'Failed to change password / 修改密码失败';
        return throwError(() => new Error(message));
      })
    );
  }

  // 刷新令牌 / Refresh token
  refreshToken(): Observable<string> {
    return this.http.post<any>(`${AppConfig.apiUrl}/api/auth/refresh`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          const { user, token } = response.data;
          this.saveAuthData(user, token);
          return token;
        }
        throw new Error(response.message || 'Failed to refresh token / 刷新令牌失败');
      }),
      catchError(error => {
        console.error('Refresh token error:', error);
        if (error.status === 401) {
          // 令牌无效，清除本地认证信息 / Token invalid, clear local auth
          this.clearStoredAuth();
        }
        const message = error.error?.message || 'Failed to refresh token / 刷新令牌失败';
        return throwError(() => new Error(message));
      })
    );
  }

  // 获取认证令牌 / Get auth token
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }
}
