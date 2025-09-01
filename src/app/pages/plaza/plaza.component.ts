/**
 * 广场：查看全部群组与其频道（只读）
 * - Phase 1：不实现申请/审批流程
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroupService } from '../../core/services/group.service';
import { Group } from '../../core/models';

@Component({
  standalone: true,
  selector: 'app-plaza',
  template: `
  <div class="card">
    <h3>plaza（all groups&channels）</h3>

    <!-- all groups -->
    <div *ngFor="let g of groups" class="stack"
         style="margin:10px 0;padding:12px;border:1px solid #1f2937;border-radius:8px">
      <div><b>{{ g.name }}</b> <span class="small">(#{{ g.id }})</span></div>

      <div class="small">channels</div>
      <div class="row" style="flex-wrap:wrap">
        <!-- 展示某个群组下的频道 -->
        <span *ngFor="let c of channelsOf(g.id)" class="chip">#{{ c.name }}</span>
      </div>
    </div>
  </div>
  `,
  styles: [`.chip{background:#172554;color:#e5e7eb;padding:6px 10px;border-radius:999px;border:1px solid #1f2937}`],
  imports: [CommonModule],
})
export class PlazaComponent implements OnInit {
  groups: Group[] = [];

  constructor(private groupSvc: GroupService) {}

  ngOnInit(): void {
    // 初始化时加载所有群组
    this.groups = this.groupSvc.allGroups();
  }

  channelsOf(id: string) { return this.groupSvc.channelsOfGroup(id); }
}
