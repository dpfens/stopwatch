import { Component } from '@angular/core';
import { BaseGroupListViewComponent } from '../../base-group-list-view';
import { GroupGridDetailViewComponent } from "../group-list-detail/group-detail.component";

@Component({
  selector: 'group-grid-view',
  imports: [GroupGridDetailViewComponent],
  templateUrl: './group-list.component.html',
  styleUrl: './group-list.component.scss'
})
export class GroupGridViewComponent extends BaseGroupListViewComponent {
}
