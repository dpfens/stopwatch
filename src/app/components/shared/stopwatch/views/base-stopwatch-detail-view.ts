import { AfterViewInit, Component, computed, inject, signal, WritableSignal, DestroyRef, input, effect, OnInit, OnDestroy } from '@angular/core';
import { ContextualStopwatchEntity, IStopwatchStateController, SelectOptGroup, StopwatchEvent, StopwatchState, UniqueIdentifier, VisibleSplit } from '../../../../models/sequence/interfaces';
import { StopwatchService } from '../../../../services/stopwatch/stopwatch.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TimeService } from '../../../../services/time/time.service';
import { LapUnits, ONE_MINUTE, Time } from '../../../../utilities/constants';
import { FormBuilder, FormControl, FormsModule, Validators } from '@angular/forms';
import { TZDate } from '../../../../models/date';
import { GroupService } from '../../../../services/group/group.service';
import { StopwatchStateController } from '../../../../controllers/stopwatch/stopwatch-state-controller';
import { StopwatchSelectionService } from '../../../../services/stopwatch/stopwatch-selection/stopwatch-selection.service';
import { ApplicationAnalyticsService } from '../../../../services/analytics/application-analytics.service';
import SplitPredictor from '../../../../analysis/split-prediction';
import { ConfidenceInterval, PredictionResult, TimeCastingStrategy } from '../../../../models/sequence/analysis/strategy';
import { createEnsembleStrategy } from '../../../../analysis';

// Define strongly-typed form interface
interface StopwatchSettingsForm {
  title: FormControl<string | null>;
  description: FormControl<string | null>;
  lapValue: FormControl<number | null>;
  lapUnit: FormControl<string | null>;
  groups: FormControl<UniqueIdentifier[]>;
}

@Component({
  selector: 'base-stopwatch-detail-view',
  imports: [FormsModule],
  template: ''
})
export class BaseStopwatchDetailViewComponent implements OnInit, AfterViewInit, OnDestroy {
  protected readonly service = inject(StopwatchService);
  protected readonly groupService = inject(GroupService);
  protected readonly timeService = inject(TimeService);
  protected readonly snackbar = inject(MatSnackBar);
  protected readonly destroyRef = inject(DestroyRef);
  protected readonly fb = inject(FormBuilder);
  protected readonly selectionService = inject(StopwatchSelectionService);
  protected readonly analyticService = inject(ApplicationAnalyticsService);

  id = input.required<UniqueIdentifier>();
  instance = computed(() => 
    this.service.instances().find(inst => inst.id === this.id())
  );
  selectionMode = input(false);

  showControls = input(true);
  showBasicControls = input(true);
  showCheckpointControls = input(true);
  MILLISECOND_THRESHOLD = ONE_MINUTE;

  // Signal to track elapsed time for reactive filtering of forecasted splits
  private elapsedTimeForFilter = signal(0);
  private filterCheckInterval?: number;

  getInstance(): ContextualStopwatchEntity {
    const inst = this.instance();
    if (!inst) {
      throw new Error(`Stopwatch ${this.id()} not found`);
    }
    return inst;
  }

  groups = this.groupService.instances;
  loading = this.service.isLoading;
  error = this.service.error;
  displaySettings = signal(false);
  lapUnits: SelectOptGroup<string>[] = LapUnits;
  visibleSplits: WritableSignal<VisibleSplit[]> = signal([]);
  computedEvents: WritableSignal<StopwatchEvent[]> = signal([]);

  truncate(str: string | number, maxLength: number) {
    if (typeof str === 'number') {
      str = str.toString();
    }
    if (str.length <= maxLength) {
      return str;
    } else {
      return str.slice(0, maxLength - 3) + "..."; 
    }
  }

  readonly hasSplits = computed(() => 
    this.controller().getEvents('split').length > 0
  );

  readonly hasLaps = computed(() => 
    this.controller().getEvents('lap').length > 0
  );

  /**
   * Simplified computedSplits using controller methods where beneficial.
   * 
   * Key insight: The controller helps with actual events, but forecasted events
   * need direct timestamp comparison since they're not part of running intervals.
   */
  readonly computedSplits = computed(() => {
    const computedEvents = this.computedEvents();
    if (computedEvents.length === 0) return [];

    const controller = this.controller();
    const actualLapEvents = controller.getEvents('lap');
    
    // Initialize previousLapDuration from actual laps (for difference calculation)
    let previousLapDuration: number | undefined;
    if (actualLapEvents.length >= 2) {
      previousLapDuration = controller.getElapsedTimeBetweenEvents(
        actualLapEvents[actualLapEvents.length - 2].id,
        actualLapEvents[actualLapEvents.length - 1].id
      );
    } else if (actualLapEvents.length === 1) {
      const startEvent = controller.getEvents('start')[0];
      if (startEvent) {
        previousLapDuration = controller.getElapsedTimeBetweenEvents(
          startEvent.id,
          actualLapEvents[0].id
        );
      }
    }

    // Get last actual event (excluding stop/resume) for split reference
    const actualEvents = controller.getEvents()
      .filter(e => !['stop', 'resume'].includes(e.type));
    const lastActualEvent = actualEvents[actualEvents.length - 1];

    const forecastedSplits: VisibleSplit[] = [];

    for (let i = 0; i < computedEvents.length; i++) {
      const event = computedEvents[i];
      const isFirst = i === 0;
      let splitRawDuration: number;

      if (event.type === 'lap') {
        // LAP: duration from previous lap (actual or forecasted)
        const previousLaps = [
          ...actualLapEvents,
          ...forecastedSplits.filter(s => s.event.type === 'lap').map(s => s.event)
        ];
        const prevLap = previousLaps[previousLaps.length - 1];
        
        if (prevLap) {
          splitRawDuration = event.timestamp.durationFrom(prevLap.timestamp);
        } else {
          // No previous lap - use start
          const startEvent = controller.getEvents('start')[0];
          splitRawDuration = event.timestamp.durationFrom(startEvent.timestamp);
        }
      } else {
        // SPLIT: duration from immediately previous event (actual or forecasted)
        if (isFirst) {
          splitRawDuration = event.timestamp.durationFrom(lastActualEvent.timestamp);
        } else {
          splitRawDuration = event.timestamp.durationFrom(computedEvents[i - 1].timestamp);
        }
      }

      // Calculate lap difference
      let difference: number | undefined;
      if (event.type === 'lap') {
        if (previousLapDuration !== undefined) {
          difference = splitRawDuration - previousLapDuration;
        }
        previousLapDuration = splitRawDuration;
      }

      forecastedSplits.push({
        duration: this.timeService.toDurationObject(splitRawDuration),
        event,
        unit: event.unit,
        difference,
      });
    }

    return forecastedSplits;
  });

  readonly totalDurationCalc = () => this.controller().getElapsedTime();
  
  readonly splitDurationCalc = () => {
    const lastSplitEvent = this.controller().getState().sequence.findLast(event => event.type === 'split');
    return lastSplitEvent ? this.controller().getElapsedTimeBetweenEvents(lastSplitEvent.id, null) : 0;
  };
  
  readonly lapDurationCalc = () => {
    const lastLapEvent = this.controller().getState().sequence.findLast(event => event.type === 'lap');
    return lastLapEvent ? this.controller().getElapsedTimeBetweenEvents(lastLapEvent.id, null) : 0;
  };
  

  // Strongly-typed reactive form
  settingsForm = this.fb.group<StopwatchSettingsForm>({
    title: this.fb.control<string | null>(null),
    description: this.fb.control<string | null>(null),
    lapValue: this.fb.control<number | null>(null, [Validators.min(0.01)]),
    lapUnit: this.fb.control<string | null>('m'),
    groups: this.fb.control<UniqueIdentifier[]>([], { nonNullable: true })
  });

  // Computed form state signals
  readonly hasLapSettings = computed(() => {
    const lapValue = this.settingsForm.controls.lapValue.value;
    const lapUnit = this.settingsForm.controls.lapUnit.value;
    return !!(lapValue && lapUnit);
  });

  private _controllerCache?: IStopwatchStateController;
  private _lastInstanceVersion?: string;
  
  readonly controller = computed(() => {
    const instance = this.getInstance();
    if (!instance) {
      throw new Error('Instance must be set before accessing controller');
    }
    
    // Create a version string based on instance modification timestamp
    const currentVersion = `${instance.id}-${instance.metadata.lastModification?.timestamp || 0}`;
    
    // Invalidate cache if instance has changed
    if (this._lastInstanceVersion !== currentVersion) {
      this._controllerCache = undefined;
      this._lastInstanceVersion = currentVersion;
    }
    
    // Create new controller if not cached
    if (!this._controllerCache) {
      this._controllerCache = new StopwatchStateController(instance.state);
    }
    
    return this._controllerCache;
  });

  readonly timingBehaviors = computed(() => {
    const instance = this.getInstance();
    return instance.groups.flatMap(group => group.traits.timing);
  });

  readonly evaluationBehaviors = computed(() => {
    const instance = this.getInstance();
    return instance.groups.flatMap(group => group.traits.evaluation);
  });

  constructor() {
    // Auto-populate form when instance changes
    effect(() => {
      const instance = this.instance();
      if (instance && this.displaySettings()) {
        this.populateForm(instance);
      }
    });

    effect(() => {
      const instance = this.instance();
      if (!instance) return;
      // Update component state when instance changes externally
      // This will trigger when bulk operations update the stopwatch
      this.refreshComponentState();
    });

    // Effect to filter out expired predictions
    effect(() => {
      // Trigger re-evaluation when this signal updates
      const _ = this.elapsedTimeForFilter();
      
      const events = this.computedEvents();
      if (events.length === 0) return;
      
      const controller = this.controller();
      const startEvent = controller.getEvents('start')[0];
      const lastLapEvent = controller.getEvents('lap').at(-1);
      
      if (!startEvent) return;
      
      const currentLapDuration = this.lapDurationCalc();
      
      const validEvents = events.filter(event => {
        const predictedTotalElapsed = event.timestamp.timestamp - startEvent.timestamp.timestamp;
        
        if (event.type === 'lap') {
          // For laps: compare against current lap duration
          const referenceEvent = lastLapEvent || startEvent;
          const predictedLapDuration = event.timestamp.timestamp - referenceEvent.timestamp.timestamp;
          return predictedLapDuration > currentLapDuration;
        } else {
          // For splits: compare prediction against current segment duration
          return predictedTotalElapsed > this.totalDurationCalc();
        }
      });
      
      if (validEvents.length !== events.length) {
        this.computedEvents.set(validEvents);
      }
    });

    // Effect to update elapsed time signal while running
    effect(() => {
      const isRunning = this.controller().isRunning();
      
      if (isRunning) {
        this.filterCheckInterval = window.setInterval(() => {
          this.elapsedTimeForFilter.set(this.controller().getElapsedTime());
        }, 500); // Check every 500ms
      } else {
        if (this.filterCheckInterval) {
          clearInterval(this.filterCheckInterval);
          this.filterCheckInterval = undefined;
        }
        // Update once when stopped
        this.elapsedTimeForFilter.set(this.controller().getElapsedTime());
      }
    });
  }

  private refreshComponentState(): void {
    const controller = this.controller();
    
    if (controller.isActive()) {
      this.buildSplits();
    } else {
      this.visibleSplits.set([]);
      this.computedEvents.set([]);
    }
  }

  ngOnInit(): void {
    this.initializeForm();
  }

  ngOnDestroy(): void {
    if (this.filterCheckInterval) {
      clearInterval(this.filterCheckInterval);
    }
  }

  ngAfterViewInit(): void {
    const controller = this.controller();
    if (controller.isActive()) {
      this.buildSplits();
    }
  }

  private initializeForm(): void {
    const instance = this.getInstance();

    this.settingsForm.patchValue({
      title: instance.annotation.title,
      description: instance.annotation.description,
      lapValue: instance.state.lap?.value || 400,
      lapUnit: instance.state.lap?.unit || 'm',
      groups: instance.groups.map(g => g.id)
    });
  }

  // Simplified form population
  private populateForm(instance: ContextualStopwatchEntity): void {
    const state = this.controller().getState();
    
    this.settingsForm.patchValue({
      title: instance.annotation.title || null,
      description: instance.annotation.description || null,
      lapValue: state.lap?.value || null,
      lapUnit: state.lap?.unit || 'm',
      groups: instance.groups.map(group => group.id)
    }, { emitEvent: false }); // Don't trigger valueChanges during initial population
  }

  showSettings(): void {
    this.initializeForm();
    this.displaySettings.set(true);
    this.analyticService.trackStopwatchShowSettings(this.getInstance().id);
  }

  // Simplified and more reactive settings change handler
  async handleSettingsChange(): Promise<void> {
    if (!this.settingsForm.valid) {
      return;
    }

    const instance = this.getInstance();
    const formValue = this.settingsForm.value;

    // Update instance annotation
    if (formValue.title !== undefined) {
      instance.annotation.title = formValue.title || '';
    }
    if (formValue.description !== undefined) {
      instance.annotation.description = formValue.description || '';
    }

    // Handle group assignments
    await this.updateGroupAssignments(instance, formValue.groups || []);

    // Handle lap settings
    if (formValue.lapValue && formValue.lapUnit) {
      const lap = { value: formValue.lapValue, unit: formValue.lapUnit };
      this.controller().setLap(lap);
    } else {
      this.controller().setLap(null);
    }

    // Update metadata
    instance.metadata.lastModification = {
      timestamp: TZDate.now()
    };

    await this.service.update({ ...instance, state: this.controller().getState() });
  }

  // Extracted group assignment logic for better reusability
  private async updateGroupAssignments(instance: ContextualStopwatchEntity, newGroupIds: UniqueIdentifier[]): Promise<void> {
    const success = await this.service.setGroupMemberships(instance.id, newGroupIds);
    if (!success) {
      throw new Error('Failed to update group memberships');
    }
  }

  // Form validation helpers
  getFieldError(fieldName: keyof StopwatchSettingsForm): string | null {
    const control = this.settingsForm.controls[fieldName];
    if (control.errors && control.touched) {
      if (control.errors['required']) return `${fieldName} is required`;
      if (control.errors['min']) return `${fieldName} must be greater than 0`;
    }
    return null;
  }

  // Reset form to initial state
  resetForm(): void {
    this.settingsForm.reset();
    this.populateForm(this.getInstance());
  }

  // Check if form has unsaved changes
  hasUnsavedChanges(): boolean {
    return this.settingsForm.dirty;
  }

  // Discard changes and close settings
  discardChanges(): void {
    this.initializeForm();
    this.displaySettings.set(false);
  }

  // Save and close settings
  async saveAndClose(): Promise<void> {
    if (!this.settingsForm.valid) {
      return;
    }

    const formValue = this.settingsForm.value;
    const instance = this.getInstance();
    try {
      // Update stopwatch metadata
      const updatedStopwatch = {
        ...instance,
        annotation: {
          title: formValue.title || '',
          description: formValue.description || ''
        },
      };

      if (formValue.lapValue && formValue.lapUnit) {
        const lap = { value: formValue.lapValue, unit: formValue.lapUnit };
        updatedStopwatch.state.lap = lap;
      } else {
        updatedStopwatch.state.lap = null;
      }

      updatedStopwatch.metadata.lastModification = {
        timestamp: TZDate.now()
      };

      // Save stopwatch changes
      const success = await this.service.update(updatedStopwatch);
      
      if (success) {
        const groupIds = formValue.groups || [];
        const membershipSuccess = await this.service.setGroupMemberships(
          instance.id, 
          groupIds
        );
        
        if (membershipSuccess) {
          this.displaySettings.set(false);
          this.analyticService.trackStopwatchSaveSettings(instance.id, []);
        } else {
          console.error('Failed to update group memberships');
          // Handle error appropriately
        }
      } else {
        console.error('Failed to update stopwatch');
        // Handle error appropriately
      }
    } catch (error) {
      console.error('Error saving stopwatch:', error);
      // Handle error appropriately
    }
  }

  async start() {
    const now = new Date();
    this.controller().start(now);
    const metadata = {...this.getInstance().metadata};
    metadata.lastModification = {
      timestamp: TZDate.now()
    };
    const instance = this.getInstance();
    await this.service.update({...instance, metadata, state: this.controller().getState()});
    this.analyticService.trackStopwatchStart(instance.id);
  }

  async stop() {
    const now = new Date();
    this.controller().stop(now);
    const instance = this.getInstance();
    const metadata = {...instance.metadata};
    metadata.lastModification = {
      timestamp: TZDate.now()
    };
    this.analyticService.trackStopwatchStop(instance.id);
    await this.service.update({...instance, metadata, state: this.controller().getState()});
  }

  async resume() {
    const now = new Date();
    this.controller().resume(now);
    const instance = this.getInstance();
    const metadata = {...instance.metadata};
    metadata.lastModification = {
      timestamp: TZDate.now()
    };
    this.analyticService.trackStopwatchResume(instance.id);
    await this.service.update({...instance, metadata, state: this.controller().getState()});
  }

  async lap() {
    const now = new Date();
    const eventType = 'lap';
    const eventName = this.findAvailableEventName(eventType);
    this.controller().addEvent(eventType, eventName, now);
    const state = this.controller().getState();
    if (state.lap) {
      const lapEvents = this.controller().getEvents('lap');
      const lastLapEvent = lapEvents.at(-1);
      if (lastLapEvent) {
        lastLapEvent.unit = {value: state.lap!.value * lapEvents.length, unit: state.lap?.unit};
      }
    }
    const instance = this.getInstance()
    const metadata = {...instance.metadata};
    metadata.lastModification = {
      timestamp: TZDate.now()
    };
    const lapNumber = this.controller().getEvents('lap').length;
    this.analyticService.trackLapCreate(instance.id, lapNumber);
    this.buildSplits();
    await this.service.update({...instance, metadata, state});
  }

  async split() {
    const now = new Date();
    const eventType = 'split';
    const eventName = this.findAvailableEventName(eventType);
    this.controller().addEvent(eventType, eventName, now);
    const instance = this.getInstance();
    const metadata = {...instance.metadata};
    metadata.lastModification = {
      timestamp: TZDate.now()
    };
    const splitNumber = this.controller().getEvents('split').length;
    this.analyticService.trackSplitCreate(instance.id, splitNumber);
    this.buildSplits();
    await this.service.update({...instance, metadata, state: this.controller().getState()});
  }

  async reset() {
    const now = new Date();
    this.controller().reset(now);
    this.visibleSplits.set([]);
    this.computedEvents.set([]);

    const instance = this.getInstance();
    const metadata = {...instance.metadata};
    metadata.lastModification = {
      timestamp: TZDate.now()
    };
    this.analyticService.trackStopwatchReset(instance.id);
    await this.service.update({...instance, metadata, state: this.controller().getState()});
  }

  async fork() {
    const instance = this.getInstance();
    const newInstance = {
      ...instance,
      id: crypto.randomUUID(),
      state: this.controller().getState(),
      metadata: {
        ...instance.metadata,
        clone: { source: instance.id}
      }
    };
    this.analyticService.trackStopwatchFork(instance.id, newInstance.id);
    await this.service.create(newInstance);
    await Promise.all(
      instance.groups.map(g => this.groupService.addMember(g.id, newInstance.id))
    );
  }

  async delete() {
    const instance = this.getInstance();
    await this.service.delete(instance.id);
    this.analyticService.trackStopwatchDelete(instance.id);
    this.snackbar.open(`Deleted stopwatch "${instance.annotation.title || instance.id}"`, 'Close');
    setTimeout(() => this.snackbar.dismiss(), Time.FIVE_SECONDS);
  }

  private buildSplits() {
    const state = this.controller().getState();
    const eligibleSplits = state.sequence.filter(event => !['stop', 'resume'].includes(event.type));
    const visibleSplits: VisibleSplit[] = [];
    let lapAnchorId = eligibleSplits[0]?.id;   // start event, then each lap
    let previousLapDuration: number | undefined;

    for (let i = 1; i < eligibleSplits.length; i++) {
      const event = eligibleSplits[i];
      const isLap = event.type === 'lap';
      // laps measure from the previous lap; everything else from the previous event
      const anchorId = isLap ? lapAnchorId : eligibleSplits[i - 1].id;
      const rawSplitDuration = this.controller().getElapsedTimeBetweenEvents(anchorId, event.id);
      let difference: number | undefined;
      if (isLap) {
        if (previousLapDuration !== undefined) {
          difference = rawSplitDuration - previousLapDuration;
        }
        previousLapDuration = rawSplitDuration;
        lapAnchorId = event.id;
      }
      visibleSplits.push({
        duration: this.timeService.toDurationObject(rawSplitDuration),
        event,
        unit: event.unit,
        difference
      });
    }
    this.visibleSplits.set(visibleSplits);
    this.computeForecastedEvents();
  }

  async handleSplitUpdate(instance: VisibleSplit) {
    const event = instance.event;
    const state = this.controller().getState();
    const index = state.sequence.findIndex(evt => evt.id === event.id);
    if (index) {
      state.sequence[index] = event;
      
      const visibleSplits = this.visibleSplits();
      const visibleSplitIndex = visibleSplits.findIndex(split => split.event.id === event.id);
      visibleSplits[visibleSplitIndex] = instance;
      this.visibleSplits.set([...visibleSplits]);
      const stopwatchInstance = this.getInstance();
      this.service.update({...stopwatchInstance, state});
      this.analyticService.trackSplitSaveSettings(stopwatchInstance.id, []);
    }
  }

  async handleSplitDelete(instance: VisibleSplit) {
    const event = instance.event;
    const eventCount = this.controller().getEvents(event.type).length;
    this.controller().removeEvent(event);
    this.buildSplits();
    const stopwatchInstance = this.getInstance();
    this.service.update({...stopwatchInstance, state: this.controller().getState()});
    this.analyticService.trackSplitDelete(stopwatchInstance.id, event.type, eventCount);
  }

  private findAvailableEventName(eventType: string): string {
    const existingEvents = this.controller().getState().sequence.filter(event => event.type === eventType).length;
    let exists = true;
    let newEventName: string = '';
    let newNumber = existingEvents;
    while (exists) {
      newNumber++;
      newEventName = `${eventType} #${newNumber}`;
      exists = !!this.controller().getState().sequence.find(event => event.annotation.title === newEventName);
      if (!exists) {
        break;
      }
    }
    return newEventName;
  }

  // Computed selection state
  readonly isSelected = computed(() => 
    this.selectionService.isSelected(this.id())
  );
  
  readonly hasAnySelection = computed(() => 
    this.selectionService.hasSelection()
  );

  /**
   * Toggles selection state of this stopwatch
   */
  toggleSelection(): void {
    this.selectionService.toggleSelection(this.id());
  }

  /**
   * Handles card click - toggles selection when in selection mode
   */
  onCardClick(event: Event): void {
    // Only handle selection when in selection mode
    if (this.selectionMode() || this.hasAnySelection()) {
      // Don't prevent default here - let it bubble up to parent if needed
      this.toggleSelection();
    }
  }

  /**
   * Handles selection icon click/keyboard interaction
   */
  onSelectionChange(event: Event): void {
    // Always stop propagation for the selection icon to prevent card click
    event.preventDefault();
    event.stopPropagation();
    
    // For keyboard events, only respond to Enter and Space
    if (event instanceof KeyboardEvent) {
      if (event.code !== 'Enter' && event.code !== 'Space') {
        return;
      }
    }
    
    this.toggleSelection();
  }

  async onGroupSelectionChange(selectedGroupIds: UniqueIdentifier[]): Promise<void> {
    try {
      const success = await this.service.setGroupMemberships(
        this.getInstance().id,
        selectedGroupIds
      );
      
      if (!success) {
        console.error('Failed to update group memberships');
        // Revert the form control to previous state
        this.settingsForm.patchValue({
          groups: this.getInstance().groups.map(g => g.id)
        });
      }
    } catch (error) {
      console.error('Error updating group memberships:', error);
      // Revert the form control to previous state
      this.settingsForm.patchValue({
        groups: this.getInstance().groups.map(g => g.id)
      });
    }
  }

  /**
   * Factory method for creating the casting strategy.
   * Override this in subclasses or inject via service for different behaviors.
   */
  protected createCastingStrategy(): TimeCastingStrategy {
    // Ensemble approach: combines EWMA (recent performance), 
    // OLS-Linear (trend detection), and WLS-Recency (weighted trends)
    // Uses inverse variance weighting - narrower confidence = more weight
    return createEnsembleStrategy.default();
  }

  private computeForecastedEvents(): void {
    const controller = this.controller();
    const state = controller.getState();
    const events = controller.getEvents();
    const lapEvents = controller.getEvents('lap');
    const splitEvents = controller.getEvents('split');
    const relevantEvents = [...lapEvents, ...splitEvents];
    relevantEvents.sort((a, b) => a.timestamp.timestamp - b.timestamp.timestamp);

    // Need laps with distance units to predict
    const splitsWithDistances = relevantEvents.filter(e => e.unit?.value != null);

    if (splitsWithDistances.length < 2) {
      this.computedEvents.set([]);
      return;
    }

    // Find the starting point for elapsed time calculations
    const startEvent = events.find(
      e => e.type === 'start' || e.type === 'user_start'
    );

    if (!startEvent) {
      this.computedEvents.set([]);
      return;
    }

    // Extract elapsed times (ms) and cumulative distances from lap events
    const elapsedTimes: number[] = [];
    const elapsedDistances: number[] = [];

    for (const split of splitsWithDistances) {
      const elapsedTime = controller.getElapsedTimeBetweenEvents(startEvent.id, split.id);
      elapsedTimes.push(elapsedTime);
      elapsedDistances.push(split.unit!.value);
    }

    // Extract just the distance values for prediction targeting
    const splitDistances = splitsWithDistances.map(e => e.unit!.value);

    try {
      // Determine which distances to predict
      const predictedDistances = SplitPredictor.predict(splitDistances, {
        lapDistance: state.lap?.value,
        maxCount: 3,
        mode: 'auto'
      });

      if (predictedDistances.length === 0) {
        this.computedEvents.set([]);
        return;
      }

      // Create the casting strategy (ensemble by default)
      const strategy = this.createCastingStrategy();

      const forecastedEvents: StopwatchEvent[] = predictedDistances.map((targetDistance, index) => {
        // Use the strategy to predict time at target distance
        const prediction = this.safePredictTime(
          strategy, 
          elapsedTimes, 
          elapsedDistances, 
          targetDistance
        );

        // Calculate the predicted timestamp
        const predictedTimestamp = prediction 
          ? new TZDate(new Date(startEvent.timestamp.timestamp + prediction.value))
          : splitsWithDistances.at(-1)!.timestamp; // Fallback to last known timestamp

        const confidenceDescription = prediction
          ? this.formatConfidenceInterval(prediction.confidence, state.lap?.unit)
          : 'low confidence';

        const eventType = state.lap && targetDistance % state.lap?.value === 0 ? 'lap' : 'split';
        return {
          id: `forecast-${eventType}-${lapEvents.length + index + 1}`,
          annotation: {
            title: `${eventType} #${lapEvents.length + index + 1}`,
            description: `Predicted at ${targetDistance}${state.lap?.unit ?? 'm'} (${confidenceDescription})`
          },
          metadata: {
            creation: { timestamp: TZDate.now() },
            lastModification: { timestamp: TZDate.now() }
          },
          type: eventType,
          origin: 'computed' as const,
          semantics: {},
          qualification: 'forecast' as const,
          timestamp: predictedTimestamp,
          unit: {
            value: targetDistance,
            unit: state.lap?.unit
          }
        };
      });
      this.computedEvents.set(forecastedEvents);
    } catch (error) {
      console.warn('Failed to compute forecasted events:', error);
      this.computedEvents.set([]);
    }
  }

  /**
   * Safely execute prediction, returning null on failure.
   * Isolates strategy errors from the main flow.
   */
  private safePredictTime(
    strategy: TimeCastingStrategy,
    elapsedTimes: number[],
    elapsedDistances: number[],
    targetDistance: number
  ): PredictionResult | null {
    try {
      return strategy.predict(elapsedTimes, elapsedDistances, targetDistance);
    } catch (error) {
      console.warn(`Prediction failed for distance ${targetDistance}:`, error);
      return null;
    }
  }

  /**
   * Format confidence interval for display.
   */
  private formatConfidenceInterval(
    confidence: ConfidenceInterval, 
    unit?: string
  ): string {
    const width = confidence.upperBound - confidence.lowerBound;
    const level = Math.round((confidence.confidenceLevel ?? 0.95) * 100);
    
    // Convert ms to readable time format
    const widthSeconds = width / 1000;
    
    if (widthSeconds < 60) {
      return `±${widthSeconds.toFixed(1)}s @ ${level}%`;
    } else {
      const minutes = Math.floor(widthSeconds / 60);
      const seconds = Math.round(widthSeconds % 60);
      return `±${minutes}m${seconds}s @ ${level}%`;
    }
  }

}