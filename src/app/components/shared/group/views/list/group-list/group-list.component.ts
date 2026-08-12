import { Component, ChangeDetectionStrategy } from '@angular/core';
import { BaseGroupListViewComponent } from '../../base-group-list-view';
import { GroupListDetailViewComponent } from '../group-list-detail/group-detail.component';
import {MatListModule} from '@angular/material/list';


@Component({
  selector: 'group-list-view',
  imports: [GroupListDetailViewComponent, MatListModule],
  templateUrl: './group-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './group-list.component.scss'
})
export class GroupListViewComponent extends BaseGroupListViewComponent {
}
