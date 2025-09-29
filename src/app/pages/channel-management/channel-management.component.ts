import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-channel-management',
  templateUrl: './channel-management.component.html'
})
export class ChannelManagementComponent {
  groupId = '';
  channelName = '';
  message = '';
  error = '';

  constructor(private route: ActivatedRoute, private http: HttpClient) {
    this.groupId = this.route.snapshot.params['id'];
  }

  createChannel() {
    if (!this.channelName) return;

    this.http.post(`http://localhost:3000/api/groups/${this.groupId}/channels`, {
      name: this.channelName
    }).subscribe({
      next: () => {
        this.message = 'Channel created';
        this.channelName = '';
        this.error = '';
      },
      error: () => {
        this.error = 'Error creating channel';
        this.message = '';
      }
    });
  }
}
