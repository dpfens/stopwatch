import { Component, inject, computed, signal } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { StopwatchSelectionService } from '../../../services/stopwatch/stopwatch-selection/stopwatch-selection.service';
import { StopwatchBulkOperationsService, BulkOperationResult } from '../../../services/stopwatch/bulk-operation/stopwatch-bulk-operation-service.service';
import { Time } from '../../../utilities/constants';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApplicationAnalyticsService } from '../../../services/analytics/application-analytics.service';

@Component({
  selector: 'global-action-bar',
  imports: [
    MatToolbarModule,
    MatButtonModule, 
    MatIconModule,
    MatBadgeModule,
    MatProgressBarModule,
    MatTooltipModule
  ],
  styleUrl: 'action-bar.component.scss',
  templateUrl: 'action-bar.component.html'
})
export class GlobalActionBarComponent {
  private readonly selectionService = inject(StopwatchSelectionService);
  private readonly bulkOpsService = inject(StopwatchBulkOperationsService);
  private readonly snackbar = inject(MatSnackBar);
  private readonly analyticService = inject(ApplicationAnalyticsService);

  readonly isProcessing = signal(false);

  // Selection state
  readonly hasSelection = this.selectionService.hasSelection;
  readonly selectedCount = this.selectionService.selectedCount;
  readonly selectedStopwatches = this.selectionService.selectedStopwatches;
  
  // Command availability
  readonly canStartAny = this.selectionService.canStartAny;
  readonly canStopAny = this.selectionService.canStopAny;
  readonly canResumeAny = this.selectionService.canResumeAny;
  readonly canResetAny = this.selectionService.canResetAny;
  readonly canSplitAny = this.selectionService.canSplitAny;
  readonly canLapAny = this.selectionService.canLapAny;

  // Computed counts for display
  readonly getStartableCount = computed(() => {
    return this.selectedStopwatches().filter(sw => !this.isStopwatchRunning(sw)).length;
  });

  readonly getStoppableCount = computed(() => {
    return this.selectedStopwatches().filter(sw => this.isStopwatchRunning(sw)).length;
  });

  readonly getResumableCount = computed(() => {
    return this.selectedStopwatches().filter(sw => this.isStopwatchStopped(sw)).length;
  });

  readonly getResetableCount = computed(() => {
    return this.selectedStopwatches().filter(sw => this.isStopwatchActive(sw)).length;
  });

  readonly getRunningCount = computed(() => {
    return this.selectedStopwatches().filter(sw => this.isStopwatchRunning(sw)).length;
  });

  readonly getLappableCount = computed(() => {
    return this.selectedStopwatches().filter(sw => 
      this.isStopwatchRunning(sw) && !!sw.state.lap
    ).length;
  });

  /**
   * Clears the current selection
   */
  clearSelection(): void {
    this.selectionService.clearSelection();
  }

  /**
   * Executes start command on all applicable stopwatches
   */
  async executeStartAll(): Promise<void> {
    const stopwatches = this.selectedStopwatches().filter(sw => !this.isStopwatchRunning(sw));
    await this.executeWithFeedback(
      () => this.bulkOpsService.startAll(stopwatches),
      'start',
      stopwatches.length
    );
    this.analyticService.trackBulkStart(stopwatches.map(sw => sw.id), "manual");
  }

  /**
   * Executes stop command on all applicable stopwatches
   */
  async executeStopAll(): Promise<void> {
    const stopwatches = this.selectedStopwatches().filter(sw => this.isStopwatchRunning(sw));
    await this.executeWithFeedback(
      () => this.bulkOpsService.stopAll(stopwatches),
      'stop',
      stopwatches.length
    );
    this.analyticService.trackBulkStop(stopwatches.map(sw => sw.id), "manual");
  }

  /**
   * Executes resume command on all applicable stopwatches
   */
  async executeResumeAll(): Promise<void> {
    const stopwatches = this.selectedStopwatches().filter(sw => this.isStopwatchStopped(sw));
    await this.executeWithFeedback(
      () => this.bulkOpsService.resumeAll(stopwatches),
      'resume',
      stopwatches.length
    );
    this.analyticService.trackBulkResume(stopwatches.map(sw => sw.id), "manual");
  }

  /**
   * Executes reset command on all applicable stopwatches
   */
  async executeResetAll(): Promise<void> {
    const stopwatches = this.selectedStopwatches().filter(sw => this.isStopwatchActive(sw));
    await this.executeWithFeedback(
      () => this.bulkOpsService.resetAll(stopwatches),
      'reset',
      stopwatches.length
    );
    this.analyticService.trackBulkReset(stopwatches.map(sw => sw.id), "manual");
  }

  /**
   * Executes split command on all running stopwatches
   */
  async executeSplitAll(): Promise<void> {
    const stopwatches = this.selectedStopwatches().filter(sw => this.isStopwatchRunning(sw));
    await this.executeWithFeedback(
      () => this.bulkOpsService.splitAll(stopwatches),
      'add splits to',
      stopwatches.length
    );
  }

  /**
   * Executes lap command on all running stopwatches with lap configuration
   */
  async executeLapAll(): Promise<void> {
    const stopwatches = this.selectedStopwatches().filter(sw => 
      this.isStopwatchRunning(sw) && !!sw.state.lap
    );
    await this.executeWithFeedback(
      () => this.bulkOpsService.lapAll(stopwatches),
      'add laps to',
      stopwatches.length
    );
  }

  /**
   * Executes duplicate command on all selected stopwatches
   */
  async executeForkAll(): Promise<void> {
    const stopwatches = this.selectedStopwatches();
    await this.executeWithFeedback(
      () => this.bulkOpsService.forkAll(stopwatches),
      'duplicate',
      stopwatches.length
    );
  }

  /**
   * Executes delete command on all selected stopwatches
   */
  async executeDeleteAll(): Promise<void> {
    // Show confirmation for destructive action
    const confirmed = confirm(`Are you sure you want to delete ${this.selectedCount()} stopwatch(es)? This action cannot be undone.`);
    
    if (!confirmed) {
      return;
    }

    const stopwatches = this.selectedStopwatches();
    const result = await this.executeWithFeedback(
      () => this.bulkOpsService.deleteAll(stopwatches),
      'delete',
      stopwatches.length
    );

    // Clear selection after successful delete
    if (result && result.successCount > 0) {
      this.selectionService.clearSelection();
    }
    this.analyticService.trackBulkDelete(stopwatches.map(sw => sw.id), "manual");
  }

  /**
   * Generic method to execute bulk operations with loading state and user feedback
   */
  private async executeWithFeedback(
    operation: () => Promise<BulkOperationResult>,
    actionName: string,
    expectedCount: number
  ): Promise<BulkOperationResult | null> {
    if (this.isProcessing()) {
      return null;
    }

    this.isProcessing.set(true);
    
    try {
      const result = await operation();
      
      // Show success/failure feedback
      if (result.failureCount === 0) {
        // All successful
        this.snackbar.open(
          `Successfully ${actionName} ${result.successCount} stopwatch${result.successCount !== 1 ? 'es' : ''}`,
          'Close',
          { duration: Time.FIVE_SECONDS }
        );
      } else if (result.successCount === 0) {
        // All failed
        this.snackbar.open(
          `Failed to ${actionName} any stopwatches`,
          'Close',
          { duration: Time.FIVE_SECONDS }
        );
      } else {
        // Mixed results
        this.snackbar.open(
          `${actionName} ${result.successCount} of ${result.totalCount} stopwatches (${result.failureCount} failed)`,
          'Close',
          { duration: Time.FIVE_SECONDS }
        );
      }
      
      return result;
    } catch (error) {
      console.error(`Bulk ${actionName} operation failed:`, error);
      this.snackbar.open(
        `Failed to ${actionName} stopwatches: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'Close',
        { duration: Time.FIVE_SECONDS }
      );
      return null;
    } finally {
      this.isProcessing.set(false);
    }
  }

  // Helper methods for checking stopwatch states
  private isStopwatchRunning(sw: any): boolean {
    if (sw.state.sequence.length === 0) return false;
    const lastEvent = sw.state.sequence[sw.state.sequence.length - 1];
    return lastEvent.type !== 'stop';
  }

  private isStopwatchStopped(sw: any): boolean {
    if (sw.state.sequence.length === 0) return false;
    const lastEvent = sw.state.sequence[sw.state.sequence.length - 1];
    return lastEvent.type === 'stop';
  }

  private isStopwatchActive(sw: any): boolean {
    return sw.state.sequence.some((event: any) => event.type === 'start');
  }
}