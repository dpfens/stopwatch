import { Injectable, signal, computed, inject } from '@angular/core';
import { ContextualStopwatchEntity } from '../../../models/sequence/interfaces';
import { StopwatchService } from '../stopwatch.service';

export type StopwatchStatusFilter = 'all' | 'active' | 'inactive';
export type StopwatchRunningFilter = 'all' | 'running' | 'stopped';

export interface SearchFilters {
  term: string;
  status: StopwatchStatusFilter;
  running: StopwatchRunningFilter;
}

@Injectable({
  providedIn: 'root'
})
export class StopwatchSearchService {
  private readonly stopwatchService = inject(StopwatchService);
  
  private readonly _searchTerm = signal<string>('');
  private readonly _statusFilter = signal<StopwatchStatusFilter>('all');
  private readonly _runningFilter = signal<StopwatchRunningFilter>('all');
  
  // Read-only accessors
  readonly searchTerm = this._searchTerm.asReadonly();
  readonly statusFilter = this._statusFilter.asReadonly();
  readonly runningFilter = this._runningFilter.asReadonly();
  
  // Computed search filters object
  readonly filters = computed((): SearchFilters => ({
    term: this._searchTerm(),
    status: this._statusFilter(),
    running: this._runningFilter()
  }));
  
  // Computed boolean to check if any filters are active
  readonly hasActiveFilters = computed(() => 
    this._searchTerm().trim().length > 0 ||
    this._statusFilter() !== 'all' ||
    this._runningFilter() !== 'all'
  );
  
  // Computed to check if running filter should be enabled
  readonly runningFilterEnabled = computed(() => 
    this._statusFilter() === 'active' || this._statusFilter() === 'all'
  );
  
  setSearchTerm(term: string): void {
    this._searchTerm.set(term);
  }
  
  setStatusFilter(status: StopwatchStatusFilter): void {
    this._statusFilter.set(status);
    // Reset running filter if switching to inactive only
    if (status === 'inactive') {
      this._runningFilter.set('all');
    }
  }
  
  setRunningFilter(running: StopwatchRunningFilter): void {
    this._runningFilter.set(running);
  }
  
  clearSearch(): void {
    this._searchTerm.set('');
  }
  
  clearAllFilters(): void {
    this._searchTerm.set('');
    this._statusFilter.set('all');
    this._runningFilter.set('all');
  }
  
  /**
   * Filter stopwatches based on current search criteria
   */
  filterStopwatches(stopwatches: ContextualStopwatchEntity[]): ContextualStopwatchEntity[] {
    const filters = this.filters();
    let filtered = stopwatches;
    
    // Apply text search filter
    if (filters.term.trim()) {
      const searchTerm = filters.term.toLowerCase().trim();
      filtered = filtered.filter(stopwatch => 
        stopwatch.annotation.title.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(stopwatch => {
        const isActive = this.stopwatchService.isStopwatchActive(stopwatch);
        return filters.status === 'active' ? isActive : !isActive;
      });
    }
    
    // Apply running state filter
    if (filters.running !== 'all') {
      filtered = filtered.filter(stopwatch => {
        // Only apply running filter to active stopwatches
        if (!this.stopwatchService.isStopwatchActive(stopwatch)) {
          return filters.running !== 'running' && filters.running !== 'stopped';
        }
        
        const isRunning = this.stopwatchService.isStopwatchRunning(stopwatch);
        return filters.running === 'running' ? isRunning : !isRunning;
      });
    }
    
    return filtered;
  }
  
  /**
   * Create a computed signal for filtered stopwatches
   */
  createFilteredComputed(stopwatches: () => ContextualStopwatchEntity[]) {
    return computed(() => this.filterStopwatches(stopwatches()));
  }
  
  /**
   * Get search statistics
   */
  getSearchStats(originalCount: number, filteredCount: number) {
    return computed(() => ({
      total: originalCount,
      filtered: filteredCount,
      hidden: originalCount - filteredCount,
      hasResults: filteredCount > 0,
      isFiltered: this.hasActiveFilters()
    }));
  }
  
  /**
   * Get filter summary for display
   */
  getFilterSummary(): string {
    const filters = this.filters();
    const parts: string[] = [];
    
    if (filters.term.trim()) {
      parts.push(`"${filters.term}"`);
    }
    
    if (filters.status !== 'all') {
      parts.push(filters.status);
    }
    
    if (filters.running !== 'all' && this.runningFilterEnabled()) {
      parts.push(filters.running);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'all stopwatches';
  }
}