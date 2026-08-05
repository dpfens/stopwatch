import { Component, input } from '@angular/core';
import { BaseStopwatchListViewComponent } from '../../base-stopwatch-list-view';
import { StopwatchGridDetailViewComponent } from '../stopwatch-grid-detail/stopwatch-detail.component';
import { GlobalActionBarComponent } from "../../../../action-bar/action-bar.component";
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'stopwatch-list-grid-view',
  imports: [StopwatchGridDetailViewComponent, GlobalActionBarComponent,
    MatCardModule, MatIconModule,  MatInputModule,
    MatCheckboxModule, MatFormFieldModule, MatProgressSpinnerModule
  ],
  templateUrl: './stopwatch-list.component.html',
  styleUrl: './stopwatch-list.component.scss'
})
export class StopwatchListGridViewComponent extends BaseStopwatchListViewComponent {
  columns = input('col-3')
}
