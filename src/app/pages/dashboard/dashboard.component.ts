import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  user: any = null;

  ngOnInit(): void {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      this.user = JSON.parse(storedUser);
    }
  }

  goToGroup(groupId: string) {
    this.router.navigate([`/groups/${groupId}/channels`]);
  }
logout() {
  localStorage.removeItem('user');
  this.router.navigate(['/login']);
}

  constructor(private router: Router) {}
}
