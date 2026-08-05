import { Component, signal } from '@angular/core';
import { BaseStopwatchDetailViewComponent } from '../../base-stopwatch-detail-view';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatIconModule} from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatChipsModule} from '@angular/material/chips';
import {MatExpansionModule} from '@angular/material/expansion';
import { SplitExpansionPanelComponent } from '../../../../split/expansion-panel/expansion-panel.component';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { MatSelectModule } from '@angular/material/select';
import { MatListModule } from "@angular/material/list";
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SimpleTimerComponent } from "../../../../timer/timer.component";
import { RouterModule } from '@angular/router';

@Component({
  selector: 'stopwatch-grid-detail-view',
  imports: [
    MatCardModule, MatButtonToggleModule, MatButtonModule, MatMenuModule, MatIconModule, MatChipsModule, MatExpansionModule, SplitExpansionPanelComponent,
    FormsModule, ReactiveFormsModule, MatSelectModule, MatFormFieldModule, MatInputModule,
    MatListModule, MatCheckboxModule, SimpleTimerComponent,
    RouterModule
],
  templateUrl: './stopwatch-detail.component.html',
  styleUrl: './stopwatch-detail.component.scss'
})
export class StopwatchGridDetailViewComponent extends BaseStopwatchDetailViewComponent {
}
