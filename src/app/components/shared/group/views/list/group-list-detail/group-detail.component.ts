import { Component } from '@angular/core';
import { BaseGroupDetailViewComponent } from '../../base-group-detail-view';
import {MatListModule} from '@angular/material/list';
import { MatIcon } from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'group-list-detail-view',
  imports: [
    RouterLink, RouterLinkActive,
    MatListModule, MatButtonModule, MatIcon
  ],
  templateUrl: './group-detail.component.html',
  styleUrl: './group-detail.component.scss'
})
export class GroupListDetailViewComponent extends BaseGroupDetailViewComponent {
}
