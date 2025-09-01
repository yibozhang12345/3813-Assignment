// src/app/pages/plaza/plaza.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroupService } from '../../core/services/group.service';
import { Group } from '../../core/models';

@Component({
  standalone: true,
  selector: 'app-plaza',
  template: `
  <div class="card">
    <h3>广场（所有群组与频道）</h3>
    <div *ngFor="let g of groups" class="stack" style="margin:10px 0;padding:20px;border:2px solid #4a76b4ff;border-radius:8px">
      <div><b>{{ g.name }}</b> <span class="small">(#{{ g.id }})</span></div>
      <div class="small">频道：</div>
      <div class="row" style="flex-wrap:wrap">
        <span *ngFor="let c of channelsOf(g.id)" class="chip">#{{ c.name }}</span>
      </div>
    </div>
  </div>
  `,
  styles:[`.chip{background:#4a76b4ff;color:orange;padding:2px 10px;border-radius:999px;border:1px solid #91a8c5ff}`],
  imports:[CommonModule]
})
export class PlazaComponent implements OnInit {
  groups: Group[] = [];
  constructor(private groupSvc: GroupService) {}
  ngOnInit(): void {
    this.groups = this.groupSvc.allGroups();
  }
  channelsOf(id: string) { return this.groupSvc.channelsOfGroup(id); }
}