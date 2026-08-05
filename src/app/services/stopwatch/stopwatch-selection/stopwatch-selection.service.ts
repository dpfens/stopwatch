import { Injectable, signal, computed, inject } from '@angular/core';
import { ContextualStopwatchEntity, UniqueIdentifier } from '../../../models/sequence/interfaces';
import { StopwatchStateController } from '../../../controllers/stopwatch/stopwatch-state-controller';
import { StopwatchService } from '../stopwatch.service';
import { StopwatchBulkOperationsService } from '../bulk-operation/stopwatch-bulk-operation-service.service';

/**
 * Service for managing stopwatch selection state and bulk operations
 */
@Injectable({
  providedIn: 'root'
})
export class StopwatchSelectionService {
  service = inject(StopwatchService);
  bulkOperationsService = inject(StopwatchBulkOperationsService);

  private _selectedIds = signal<Set<UniqueIdentifier>>(new Set());
  private allStopwatches = this.service.instances;
  
  // Public readonly signals
  readonly selectedIds = this._selectedIds.asReadonly();
  
  // Computed signals
  readonly selectedStopwatches = computed(() => {
    const selectedSet = this.selectedIds();
    return this.allStopwatches().filter(sw => selectedSet.has(sw.id));
  });
  
  readonly selectedCount = computed(() => this.selectedIds().size);
  readonly hasSelection = computed(() => this.selectedCount() > 0);
  readonly isAllSelected = computed(() => {
    const all = this.allStopwatches();
    const selected = this.selectedIds();
    return all.length > 0 && all.every(sw => selected.has(sw.id));
  });

  // Command availability - computed based on current selection
  readonly canStartAll = computed(() => {
    return this.bulkOperationsService.canStartAll(this.selectedStopwatches());
  });

  readonly canStartAny = computed(() => {
    return this.bulkOperationsService.canStartAny(this.selectedStopwatches());
  });

  readonly canStopAll = computed(() => {
    return this.bulkOperationsService.canStopAll(this.selectedStopwatches());
  });

  readonly canStopAny = computed(() => {
    return this.bulkOperationsService.canStopAny(this.selectedStopwatches());
  });

  readonly canResumeAll = computed(() => {
    return this.bulkOperationsService.canResumeAll(this.selectedStopwatches());
  });

  readonly canResumeAny = computed(() => {
    return this.bulkOperationsService.canResumeAny(this.selectedStopwatches());
  });

  readonly canResetAll = computed(() => {
    return this.bulkOperationsService.canResetAll(this.selectedStopwatches());
  });

  readonly canResetAny = computed(() => {
    return this.bulkOperationsService.canResetAny(this.selectedStopwatches());
  });

  readonly canSplitAll = computed(() => {
    return this.bulkOperationsService.canSplitAll(this.selectedStopwatches());
  });

  readonly canSplitAny = computed(() => {
    return this.bulkOperationsService.canSplitAny(this.selectedStopwatches());
  });

  readonly canLapAll = computed(() => {
    return this.bulkOperationsService.canLapAll(this.selectedStopwatches());
  });

  readonly canLapAny = computed(() => {
    return this.bulkOperationsService.canLapAny(this.selectedStopwatches());
  });

  /**
   * Updates the available stopwatches list
   */
  updateStopwatches(stopwatches: ContextualStopwatchEntity[]): void {
    // Remove any selected IDs that no longer exist
    const existingIds: Set<UniqueIdentifier> = new Set(stopwatches.map(sw => sw.id));
    const currentSelected = this.selectedIds();
    const validSelected = new Set([...currentSelected].filter(id => existingIds.has(id)));
    
    if (validSelected.size !== currentSelected.size) {
      this._selectedIds.set(validSelected);
    }
  }

  /**
   * Toggles selection for a stopwatch
   */
  toggleSelection(id: UniqueIdentifier): void {
    this._selectedIds.update(selected => {
      const newSelected = new Set(selected);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  }

  /**
   * Selects a stopwatch
   */
  select(id: UniqueIdentifier): void {
    this._selectedIds.update(selected => new Set(selected).add(id));
  }

  /**
   * Deselects a stopwatch
   */
  deselect(id: UniqueIdentifier): void {
    this._selectedIds.update(selected => {
      const newSelected = new Set(selected);
      newSelected.delete(id);
      return newSelected;
    });
  }

  /**
   * Selects all stopwatches
   */
  selectAll(): void {
    const allIds = this.allStopwatches().map(sw => sw.id);
    this._selectedIds.set(new Set(allIds));
  }

  /**
   * Clears all selections
   */
  clearSelection(): void {
    this._selectedIds.set(new Set());
  }

  /**
   * Checks if a stopwatch is selected
   */
  isSelected(id: UniqueIdentifier): boolean {
    return this.selectedIds().has(id);
  }

  /**
   * Selects multiple stopwatches
   */
  selectMultiple(ids: UniqueIdentifier[]): void {
    this._selectedIds.update(selected => {
      const newSelected = new Set(selected);
      ids.forEach(id => newSelected.add(id));
      return newSelected;
    });
  }

  /**
   * Deselects multiple stopwatches
   */
  deselectMultiple(ids: UniqueIdentifier[]): void {
    this._selectedIds.update(selected => {
      const newSelected = new Set(selected);
      ids.forEach(id => newSelected.delete(id));
      return newSelected;
    });
  }

  // Helper methods for checking stopwatch states
  private isStopwatchRunning(sw: ContextualStopwatchEntity): boolean {
    const controller = new StopwatchStateController(sw.state);
    return controller.isRunning();
  }

  private isStopwatchStopped(sw: ContextualStopwatchEntity): boolean {
    const controller = new StopwatchStateController(sw.state);
    return controller.isActive() && !controller.isRunning();
  }

  private isStopwatchActive(sw: ContextualStopwatchEntity): boolean {
    const controller = new StopwatchStateController(sw.state);
    return controller.isActive();
  }
}