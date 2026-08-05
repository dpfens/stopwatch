import { Component } from '@angular/core';
import { BaseGroupDetailViewComponent } from '../../base-group-detail-view';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatIconModule} from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatChipsModule} from '@angular/material/chips';
import {MatExpansionModule} from '@angular/material/expansion';

@Component({
  selector: 'group-grid-detail-view',
  imports: [MatCardModule, MatButtonToggleModule, MatButtonModule, MatMenuModule, MatIconModule, MatChipsModule, MatExpansionModule,],
  templateUrl: './group-detail.component.html',
  styleUrl: './group-detail.component.scss'
})
export class GroupGridDetailViewComponent extends BaseGroupDetailViewComponent {
}
