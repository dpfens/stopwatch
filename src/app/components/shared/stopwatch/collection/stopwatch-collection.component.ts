import { Component, inject, input, signal, computed } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { StopwatchListViewComponent } from '../views/list/stopwatch-list/stopwatch-list.component';
import { StopwatchListGridViewComponent } from '../views/grid/stopwatch-grid/stopwatch-list.component';
import { StopwatchSearchService } from '../../../../services/stopwatch/search/search.service';
import { ContextualStopwatchEntity } from '../../../../models/sequence/interfaces';
import { SettingsService } from '../../../../services/settings/settings.service';
import { ApplicationAnalyticsService } from '../../../../services/analytics/application-analytics.service';

export type ViewMode = 'list' | 'grid';

@Component({
  selector: 'stopwatch-collection-view',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatSelectModule,
    MatButtonToggleModule,
    MatTooltipModule,
    StopwatchListViewComponent,
    StopwatchListGridViewComponent
  ],
  templateUrl: './stopwatch-collection.component.html',
  styleUrl: './stopwatch-collection.component.scss'
})
export class StopwatchCollectionViewComponent {
  readonly searchService = inject(StopwatchSearchService);
  readonly settingService = inject(SettingsService);
  private readonly analyticsService = inject(ApplicationAnalyticsService);


  stopwatchView = () => this.settingService.getEffectiveValue('stopwatchView') || 'grid';

  // Display
  gridClasses = input<string>('col-12 col-md-6 col-xl-4 col-xxl-3');
  listClasses = input<string>('col-12');
  
  // Inputs
  instances = input.required<ContextualStopwatchEntity[]>();
  showControls = input<boolean>(true);
  defaultView = input<'list' | 'grid'>(this.stopwatchView());
  
  // View state
  private readonly _currentView = signal<ViewMode>(this.defaultView());
  readonly currentView = this._currentView.asReadonly();
  
  // Computed filtered instances
  readonly filteredInstances = computed(() => 
    this.searchService.filterStopwatches(this.instances())
  );
  
  // Search state shortcuts
  readonly searchTerm = this.searchService.searchTerm;
  readonly hasActiveFilters = this.searchService.hasActiveFilters;
  
  // View switching
  async setView(view: ViewMode): Promise<void> {
    const oldView = this._currentView();
    this._currentView.set(view);
    await this.settingService.set('stopwatchView', view, 'user');
    this.analyticsService.trackSettingChange('stopwatchView', oldView, view);
  }
  
  // Search methods
  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchService.setSearchTerm(target.value);
  }
  
  clearSearch(): void {
    this.searchService.clearSearch();
  }
  
  clearAllFilters(): void {
    this.searchService.clearAllFilters();
  }
}