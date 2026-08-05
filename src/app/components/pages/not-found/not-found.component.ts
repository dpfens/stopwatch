import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { Location, CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { StopwatchService } from '../../../services/stopwatch/stopwatch.service';
import { GroupService } from '../../../services/group/group.service';

@Component({
  selector: 'not-found',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule, 
    MatButtonModule, 
    MatCardModule,
    RouterLink
  ],
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.scss']
})
export class NotFoundComponent implements OnInit, OnDestroy {
  private location = inject(Location);
  private router = inject(Router);
  private stopwatchService = inject(StopwatchService);
  private groupService = inject(GroupService);

  countdown = signal<number>(10);
  private intervalId?: number;
  redirectCancelled = signal<boolean>(false);

  // Check if user has data
  hasStopwatches = computed(() => this.stopwatchService.instanceCount() > 0);
  hasGroups = computed(() => this.groupService.instanceCount() > 0);
  hasAnyData = computed(() => this.hasStopwatches() || this.hasGroups());

  stopwatchCount = computed(() => this.stopwatchService.instanceCount());
  groupCount = computed(() => this.groupService.instanceCount());

  ngOnInit(): void {
    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.clearCountdown();
  }

  /**
   * Starts the countdown timer
   */
  private startCountdown(): void {
    this.intervalId = window.setInterval(() => {
      const current = this.countdown();
      
      if (current <= 0) {
        this.clearCountdown();
        if (!this.redirectCancelled()) {
          this.goBack();
        }
      } else {
        this.countdown.set(current - 1);
      }
    }, 1000);
  }

  /**
   * Clears the countdown interval
   */
  private clearCountdown(): void {
    if (this.intervalId !== undefined) {
      window.clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Cancels the automatic redirect
   */
  cancelRedirect(): void {
    this.redirectCancelled.set(true);
    this.clearCountdown();
    this.countdown.set(0);
  }

  /**
   * Navigates back to the previous page
   */
  goBack(): void {
    this.location.back();
  }
}