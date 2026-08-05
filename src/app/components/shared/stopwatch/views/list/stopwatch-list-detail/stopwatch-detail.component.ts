import { Component } from '@angular/core';
import { BaseStopwatchDetailViewComponent } from '../../base-stopwatch-detail-view';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SimpleTimerComponent } from "../../../../timer/timer.component";
import { RouterModule } from '@angular/router';

@Component({
  selector: 'stopwatch-list-detail-view',
  imports: [MatCardModule, MatButtonToggleModule, MatButtonModule, MatMenuModule, MatIconModule, MatChipsModule, MatExpansionModule,
    FormsModule, ReactiveFormsModule, MatSelectModule, MatFormFieldModule, MatInputModule,
    MatListModule, MatCheckboxModule, SimpleTimerComponent, RouterModule],
  templateUrl: './stopwatch-detail.component.html',
  styleUrl: './stopwatch-detail.component.scss'
})
export class StopwatchListDetailViewComponent extends BaseStopwatchDetailViewComponent {
}
