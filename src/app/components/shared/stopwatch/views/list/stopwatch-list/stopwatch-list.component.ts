import { Component } from '@angular/core';
import { BaseStopwatchListViewComponent } from '../../base-stopwatch-list-view';
import { StopwatchListDetailViewComponent } from '../stopwatch-list-detail/stopwatch-detail.component';
import { GlobalActionBarComponent } from "../../../../action-bar/action-bar.component";
import { MatCardModule } from "@angular/material/card";
import {  MatCheckboxModule } from "@angular/material/checkbox";
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'stopwatch-list-view',
  imports: [StopwatchListDetailViewComponent, GlobalActionBarComponent, 
    MatCardModule, MatIconModule, MatButtonModule,
    MatCheckboxModule, MatFormFieldModule, MatProgressSpinnerModule],
  templateUrl: './stopwatch-list.component.html',
  styleUrl: './stopwatch-list.component.scss'
})
export class StopwatchListViewComponent extends BaseStopwatchListViewComponent {
}
