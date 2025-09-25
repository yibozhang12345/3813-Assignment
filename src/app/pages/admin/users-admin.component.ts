import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { StorageService } from '../../core/services/storage.service';
import { User, Role } from '../../core/models';

@Component({
  standalone:true,
  selector:'app-users-admin',
  template:`
  <div class="card" *ngIf="auth.isSuper(); else noPerm">
    <h3>User Management (super)</h3>

    <div class="stack">
      <input class="input" placeholder="Username (unique)" [(ngModel)]="username" name="username">
      <input class="input" placeholder="Email (unique)" [(ngModel)]="email" name="email">
      <input class="input" type="password" placeholder="Initial password" [(ngModel)]="password" name="password">
      <label class="small">Roles</label>
      <select class="input" [(ngModel)]="role" name="role">
        <option value="user">user</option>
        <option value="groupAdmin">groupAdmin</option>
        <option value="super">super</option>
      </select>
      <button class="btn" (click)="create()">Create user</button>
      <div class="small" *ngIf="msg">{{ msg }}</div>
    </div>

    <hr>
    <h4>User list</h4>
    <ul>
      <li *ngFor="let u of users">
        {{u.username || u.email}} ({{u.roles.join(',')}})
        <button class="btn" style="background:#b91c1c" (click)="remove(u.id)">Delete</button>
      </li>
    </ul>
  </div>

  <ng-template #noPerm>
    <div class="card">Super role required.</div>
  </ng-template>
  `,
  imports:[CommonModule, FormsModule]
})
export class UsersAdminComponent {
  users: User[] = [];
  username=''; email=''; password='123'; role:Role='user';
  msg='';

  constructor(public auth:AuthService, private store:StorageService){
    this.refresh();
  }
  refresh(){ this.users = this.store.users(); }

  create(){
    this.msg='';
    if (this.username && this.store.usernameExists(this.username)) { this.msg='Username already exists'; return; }
    if (this.store.emailExists(this.email)) { this.msg='Email already exists'; return; }
    this.store.addUser({username:this.username, email:this.email, password:this.password, roles:[this.role]});
    this.username=''; this.email=''; this.password='123'; this.role='user';
    this.refresh();
  }
  remove(id:string){ this.store.deleteUser(id); this.refresh(); }
}
