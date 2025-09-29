import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-group-management',
  templateUrl: './group-management.component.html'
})
export class GroupManagementComponent {
  groupName = '';
  message = '';
  error = '';
  user: any = null;

  constructor(private http: HttpClient) {
    const stored = localStorage.getItem('user');
    if (stored) this.user = JSON.parse(stored);
  }

  createGroup() {
    if (!this.groupName || !this.user?._id) return;

    this.http.post('http://localhost:3000/api/groups', {
      name: this.groupName,
      adminId: this.user._id
    }).subscribe({
      next: () => {
        this.message = 'Group created successfully';
        this.error = '';
        this.groupName = '';
      },
      error: () => {
        this.error = 'Error creating group';
        this.message = '';
      }
    });
  }
}
