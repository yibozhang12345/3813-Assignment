/**
 * 个人资料页：修改用户信息和头像上传功能，使用MongoDB后端API
 * Profile page: Update user info and avatar upload, using MongoDB backend API
 * - 修改用户名（发言优先显示）、邮箱、密码 / Update username (display priority), email, password
 * - 头像上传和预览功能 / Avatar upload and preview functionality
 * - "账号注销"按钮为占位（无需实现） / Account deletion button is placeholder (no implementation needed)
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { GroupService } from '../../core/services/group.service';

@Component({
  standalone: true,
  selector: 'app-profile',
  template: `
  <div class="card stack" *ngIf="currentUser; else needLogin">
    <h3>{{ 'Profile / 个人资料' }}</h3>

    <!-- 头像部分 / Avatar section -->
    <div class="avatar-section">
      <div class="avatar-container">
        <img
          [src]="avatarUrl || '/assets/default-avatar.svg'"
          alt="Avatar"
          class="avatar-preview"
          (error)="onAvatarError($event)">
        <div class="avatar-overlay" (click)="fileInput.click()">
          <span>📷</span>
        </div>
      </div>
      <input
        #fileInput
        type="file"
        accept="image/*"
        (change)="onAvatarSelected($event)"
        style="display: none;">
      <div class="small" *ngIf="avatarUploading">{{ 'Uploading avatar... / 上传头像中...' }}</div>
    </div>

    <div class="form-section">
      <label class="small">{{ 'Username / 用户名' }}</label>
      <input
        class="input"
        [(ngModel)]="username"
        name="username"
        placeholder="Username / 用户名"
        [disabled]="loading">

      <label class="small">{{ 'Email / 邮箱' }}</label>
      <input
        class="input"
        [(ngModel)]="email"
        name="email"
        type="email"
        placeholder="Email / 邮箱"
        [disabled]="loading">

      <label class="small">{{ 'New Password (leave empty to keep current) / 新密码（留空保持不变）' }}</label>
      <input
        class="input"
        type="password"
        [(ngModel)]="newPassword"
        name="newPassword"
        placeholder="New Password / 新密码"
        [disabled]="loading">

      <div class="row">
        <button
          class="btn"
          (click)="save()"
          [disabled]="loading">
          {{ loading ? 'Saving... / 保存中...' : 'Save / 保存' }}
        </button>
        <button
          class="btn btn-secondary"
          title="Placeholder feature / 占位功能">
          {{ 'Account Deletion / 账号注销' }}
        </button>
      </div>

      <div class="small error" *ngIf="error">{{ error }}</div>
      <div class="small success" *ngIf="success">{{ success }}</div>
      <div class="small">
        {{ 'Current user / 当前用户：' }}<b>{{ currentUser?.username }}</b>
      </div>
    </div>
  </div>

  <ng-template #needLogin>
    <div class="card">
      {{ 'Please' }} <a routerLink="/login">{{ 'login / 登录' }}</a>
    </div>
  </ng-template>
  `,
  imports: [CommonModule, FormsModule, RouterModule],
  styles: [`
    .card {
      max-width: 500px;
      margin: 2rem auto;
      padding: 2rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .stack > * + * {
      margin-top: 1rem;
    }
    .avatar-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 2rem;
    }
    .avatar-container {
      position: relative;
      width: 120px;
      height: 120px;
      border-radius: 50%;
      overflow: hidden;
      border: 3px solid #ddd;
      cursor: pointer;
    }
    .avatar-preview {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .avatar-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s;
      font-size: 1.5rem;
    }
    .avatar-container:hover .avatar-overlay {
      opacity: 1;
    }
    .form-section > * + * {
      margin-top: 1rem;
    }
    .input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 1rem;
    }
    .input:disabled {
      background-color: #f5f5f5;
      cursor: not-allowed;
    }
    .row {
      display: flex;
      gap: 1rem;
    }
    .btn {
      flex: 1;
      padding: 0.75rem;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
    }
    .btn:hover:not(:disabled) {
      background-color: #0056b3;
    }
    .btn:disabled {
      background-color: #6c757d;
      cursor: not-allowed;
    }
    .btn-secondary {
      background-color: #6c757d;
    }
    .btn-secondary:hover:not(:disabled) {
      background-color: #545b62;
    }
    .small {
      font-size: 0.875rem;
      color: #666;
      margin-bottom: 0.5rem;
    }
    .error {
      color: #dc3545;
      text-align: center;
    }
    .success {
      color: #28a745;
      text-align: center;
    }
    a {
      color: #007bff;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  `]
})
export class ProfileComponent implements OnInit {
  currentUser: any = null;
  username = '';
  email = '';
  newPassword = '';
  avatarUrl = '';
  error = '';
  success = '';
  loading = false;
  avatarUploading = false;

  constructor(
    public auth: AuthService,
    private groupService: GroupService,
    private router: Router
  ) {}

  ngOnInit() {
    // 订阅当前用户信息 / Subscribe to current user info
    this.auth.currentUser$.subscribe(user => {
      if (user) {
        this.currentUser = user;
        this.username = user.username || '';
        this.email = user.email || '';
        this.avatarUrl = user.avatarUrl || '';
      } else {
        this.currentUser = null;
        this.router.navigateByUrl('/login');
      }
    });
  }

  onAvatarSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    // 文件类型验证 / File type validation
    if (!file.type.startsWith('image/')) {
      this.error = 'Please select an image file / 请选择图片文件';
      return;
    }

    // 文件大小验证 (5MB) / File size validation (5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.error = 'Image file must be less than 5MB / 图片文件必须小于5MB';
      return;
    }

    this.uploadAvatar(file);
  }

  uploadAvatar(file: File) {
    this.avatarUploading = true;
    this.error = '';

    this.groupService.uploadFile(file, 'avatar').subscribe({
      next: (response) => {
        this.avatarUrl = response.url;
        this.avatarUploading = false;
        this.success = 'Avatar uploaded successfully / 头像上传成功';

        // 更新用户资料以保存头像URL / Update user profile to save avatar URL
        this.auth.updateProfile({ avatarUrl: response.url }).subscribe({
          next: () => {
            console.log('Avatar URL updated in profile');
          },
          error: (error) => {
            console.error('Failed to update avatar URL:', error);
          }
        });
      },
      error: (error) => {
        console.error('Avatar upload error:', error);
        this.error = error.message || 'Avatar upload failed / 头像上传失败';
        this.avatarUploading = false;
      }
    });
  }

  onAvatarError(event: any) {
    // 头像加载失败时显示默认头像 / Show default avatar when loading fails
    event.target.src = '/assets/default-avatar.svg';
  }

  save() {
    this.error = '';
    this.success = '';
    this.loading = true;

    // 基本验证 / Basic validation
    if (!this.username.trim() || !this.email.trim()) {
      this.error = 'Username and email are required / 用户名和邮箱为必填项';
      this.loading = false;
      return;
    }

    // 用户名长度验证 / Username length validation
    if (this.username.trim().length < 2) {
      this.error = 'Username must be at least 2 characters / 用户名至少需要2个字符';
      this.loading = false;
      return;
    }

    // 简单的邮箱格式验证 / Simple email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email.trim())) {
      this.error = 'Please enter a valid email address / 请输入有效的邮箱地址';
      this.loading = false;
      return;
    }

    // 密码长度验证（如果提供了新密码）/ Password length validation (if new password provided)
    if (this.newPassword && this.newPassword.length < 6) {
      this.error = 'Password must be at least 6 characters / 密码至少需要6个字符';
      this.loading = false;
      return;
    }

    // 构建更新数据 / Build update data
    const updateData: any = {
      username: this.username.trim(),
      email: this.email.trim()
    };

    // 只有在提供了新密码时才包含密码 / Only include password if new password provided
    if (this.newPassword) {
      updateData.password = this.newPassword;
    }

    // 调用更新API / Call update API
    this.auth.updateProfile(updateData).subscribe({
      next: (user) => {
        console.log('Profile updated successfully:', user);
        this.success = 'Profile updated successfully / 资料更新成功';
        this.newPassword = ''; // 清空密码字段 / Clear password field
        this.loading = false;
      },
      error: (error) => {
        console.error('Profile update error:', error);
        this.error = error.message || 'Profile update failed / 资料更新失败';
        this.loading = false;
      }
    });
  }
}
