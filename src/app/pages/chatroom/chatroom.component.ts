import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-chatroom',
  templateUrl: './chatroom.component.html'
})
export class ChatroomComponent implements OnInit {
  groupId = '';
  channelId = '';

  ngOnInit(): void {
    this.groupId = this.route.snapshot.params['groupId'];
    this.channelId = this.route.snapshot.params['channelId'];
  }

  constructor(private route: ActivatedRoute) {}
}
