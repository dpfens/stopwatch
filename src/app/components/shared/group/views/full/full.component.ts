import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { BaseGroupDetailViewComponent } from '../base-group-detail-view';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, NonNullableFormBuilder, Validators } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { GroupEvaluationBehaviorOptions, GroupPresetOptions, GroupTimingOptions, GroupPresets } from '../../../../../utilities/constants';
import { GroupEvaluationBehavior, GroupTimingBehavior, GroupTraitPreset } from '../../../../../models/sequence/interfaces';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs';
import {MatTooltipModule} from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { StopwatchCollectionViewComponent } from '../../../stopwatch/collection/stopwatch-collection.component';
import { SimpleTimerComponent } from "../../../timer/timer.component";
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { DecimalPipe, NgStyle } from '@angular/common';

// Define the form structure interface
interface GroupForm {
  title: FormControl<string>;
  description: FormControl<string>;
  traitPreset: FormControl<GroupTraitPreset>;
  traitTiming: FormControl<GroupTimingBehavior>;
  traitEvaluation: FormControl<GroupEvaluationBehavior[]>;
}

@Component({
  selector: 'full-group-detail',
  imports: [
    DecimalPipe,
    MatCardModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
    NgStyle,
    StopwatchCollectionViewComponent,
    SimpleTimerComponent
],
  templateUrl: './full.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './full.component.scss'
})
export class FullGroupDetailComponent extends BaseGroupDetailViewComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private isUpdatingPreset = false;

  isEditting = signal(false);
  
  // Strongly typed FormGroup
  formGroup: FormGroup<GroupForm> = this.fb.group({
    title: this.fb.control('', [Validators.required, Validators.minLength(1)]),
    description: this.fb.control(''),
    traitPreset: this.fb.control<GroupTraitPreset>('normal'),
    traitTiming: this.fb.control<GroupTimingBehavior>('independent'),
    traitEvaluation: this.fb.control<GroupEvaluationBehavior[]>([])
  });

  // Options remain the same
  readonly groupTimingOptions = GroupTimingOptions;
  readonly groupEvaluationBehaviorOptions = GroupEvaluationBehaviorOptions;
  readonly groupPresetOptions = GroupPresetOptions;
  readonly groupPresets = GroupPresets;

  ngOnInit(): void {
    this.initializeForm();
    this.setupFormSubscription();
    this.setupPresetSynchronization();
  }

  private initializeForm(): void {
    const instance = this.getInstance();
    if (instance) {
      // Use patchValue with the complete object structure
      this.formGroup.patchValue({
        title: instance.annotation?.title || '',
        description: instance.annotation?.description || '',
        traitTiming: instance.traits?.timing || 'independent',
        traitEvaluation: instance.traits?.evaluation || [],
        traitPreset: this.preset() as GroupTraitPreset || 'normal'
      });

      // After setting initial values, check if they match a preset
      setTimeout(() => {
        this.updatePresetBasedOnTraits();
      }, 0);
    }
  }

  private setupFormSubscription(): void {
    // Subscribe to form changes with debouncing to avoid excessive API calls
    this.formGroup.valueChanges
      .pipe(
        debounceTime(500), // Wait 500ms after user stops typing
        distinctUntilChanged(), // Only emit if values actually changed
        takeUntilDestroyed(this.destroyRef) // Automatic cleanup
      )
      .subscribe(() => {
        if (this.formGroup.valid && this.isEditting()) {
          this.saveSettings();
        }
      });
  }

  private setupPresetSynchronization(): void {
    // Watch for preset changes and update timing/evaluation accordingly
    this.presetControl.valueChanges
      .pipe(
        filter(() => !this.isUpdatingPreset), // Prevent infinite loops
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((preset) => {
        this.applyPresetToTraits(preset);
      });

    // Watch for timing/evaluation changes and update preset if they match a preset
    this.formGroup.valueChanges
      .pipe(
        filter(() => !this.isUpdatingPreset), // Prevent infinite loops
        debounceTime(300), // Small debounce to avoid too frequent checks
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.updatePresetBasedOnTraits();
      });
  }

  private applyPresetToTraits(preset: GroupTraitPreset): void {
    if (!preset || !this.groupPresets[preset]) return;
    
    const presetConfig = this.groupPresets[preset];
    
    // Temporarily set flag to prevent infinite loops
    this.isUpdatingPreset = true;
    
    // Update timing and evaluation based on preset
    this.formGroup.patchValue({
      traitTiming: presetConfig.timing,
      traitEvaluation: presetConfig.evaluation
    }, { emitEvent: false }); // Don't emit events to prevent loops
    
    // Reset flag after a short delay
    setTimeout(() => {
      this.isUpdatingPreset = false;
    }, 100);
  }

  private updatePresetBasedOnTraits(): void {
    const currentTiming = this.timingControl.value;
    const currentEvaluation = this.evaluationControl.value || [];
    
    // Find matching preset
    const matchingPreset = this.findMatchingPreset(currentTiming, currentEvaluation);
    
    if (matchingPreset && matchingPreset !== this.presetControl.value) {
      this.isUpdatingPreset = true;
      
      this.presetControl.setValue(matchingPreset, { emitEvent: false });
      
      setTimeout(() => {
        this.isUpdatingPreset = false;
      }, 100);
    }
  }

  private findMatchingPreset(timing: GroupTimingBehavior, evaluation: GroupEvaluationBehavior[]): GroupTraitPreset | null {
    // Sort evaluation arrays for comparison
    const sortedCurrentEvaluation = [...evaluation].sort();
    
    for (const [presetKey, presetConfig] of Object.entries(this.groupPresets)) {
      const sortedPresetEvaluation = [...presetConfig.evaluation].sort();
      
      if (
        presetConfig.timing === timing &&
        this.arraysEqual(sortedCurrentEvaluation, sortedPresetEvaluation)
      ) {
        return presetKey as GroupTraitPreset;
      }
    }
    
    return null; // No matching preset found
  }

  private arraysEqual<T>(arr1: T[], arr2: T[]): boolean {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((val, index) => val === arr2[index]);
  }

  async saveSettings(): Promise<void> {
    if (this.formGroup.invalid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const instance = { ...this.getInstance() };
    const formValue = this.formGroup.getRawValue(); // Gets all values including disabled ones

    // Cleaner way to update instance
    if (formValue.title) {
      instance.annotation = { 
        ...instance.annotation, 
        title: formValue.title,
        description: formValue.description || ''
      };
    }

    if (formValue.traitTiming || formValue.traitEvaluation) {
      instance.traits = {
        ...instance.traits,
        timing: formValue.traitTiming,
        evaluation: formValue.traitEvaluation
      };
    }

    try {
      await this.service.update(instance);
      this.analyticsService.trackGroupSaveSettings(this.getInstance().id, []);
    } catch (error) {
      console.error('Error saving settings:', error);
      // Handle error appropriately
    }
  }

  // Alternative method if you want to handle individual control changes
  onControlChange(controlName: keyof GroupForm): void {
    const control = this.formGroup.controls[controlName];
    if (control.valid) {
      this.saveSettings();
    }
  }

  // Getter methods for easier template access
  get titleControl(): FormControl<string> {
    return this.formGroup.controls.title;
  }

  get descriptionControl(): FormControl<string> {
    return this.formGroup.controls.description;
  }

  get presetControl(): FormControl<GroupTraitPreset> {
    return this.formGroup.controls.traitPreset;
  }

  get timingControl(): FormControl<GroupTimingBehavior> {
    return this.formGroup.controls.traitTiming;
  }

  get evaluationControl(): FormControl<GroupEvaluationBehavior[]> {
    return this.formGroup.controls.traitEvaluation;
  }

  // Method to reset form to initial state
  resetForm(): void {
    this.initializeForm();
    this.formGroup.markAsUntouched();
  }

  // Method to check if form has unsaved changes
  hasUnsavedChanges(): boolean {
    return this.formGroup.dirty;
  }

  // Method to check if current trait settings match the selected preset
  traitsMatchPreset(): boolean {
    const currentPreset = this.presetControl.value;
    const currentTiming = this.timingControl.value;
    const currentEvaluation = this.evaluationControl.value || [];
    
    if (!currentPreset || !this.groupPresets[currentPreset]) return false;
    
    const presetConfig = this.groupPresets[currentPreset];
    const sortedCurrentEvaluation = [...currentEvaluation].sort();
    const sortedPresetEvaluation = [...presetConfig.evaluation].sort();
    
    return presetConfig.timing === currentTiming && 
           this.arraysEqual(sortedCurrentEvaluation, sortedPresetEvaluation);
  }

  // Get display name for current preset
  getCurrentPresetDisplay(): string {
    const currentPreset = this.presetControl.value;
    const option = this.groupPresetOptions.find(opt => opt.value === currentPreset);
    return option?.display || 'Custom';
  }

  // Get descriptions for current selections
  getCurrentPresetDescription(): string {
    const currentPreset = this.presetControl.value;
    return this.groupPresets[currentPreset]?.description || '';
  }

  getCurrentPresetUseCases(): string[] {
    const currentPreset = this.presetControl.value;
    return this.groupPresets[currentPreset]?.useCases || [];
  }

  getCurrentTimingDescription(): string {
    const currentTiming = this.timingControl.value;
    const option = this.groupTimingOptions.find(opt => opt.value === currentTiming);
    return option?.description || '';
  }

  getCurrentEvaluationDescriptions(): { display: string; description: string }[] {
    const currentEvaluations = this.evaluationControl.value || [];
    return currentEvaluations.map(evalValue => {
      const option = this.groupEvaluationBehaviorOptions.find(opt => opt.value === evalValue);
      return {
        display: option?.display || evalValue,
        description: option?.description || ''
      };
    });
  }

  // Helper method to get option by value
  getTimingOption(value: GroupTimingBehavior) {
    return this.groupTimingOptions.find(opt => opt.value === value);
  }

  getEvaluationOption(value: GroupEvaluationBehavior) {
    return this.groupEvaluationBehaviorOptions.find(opt => opt.value === value);
  }

  async createNew(): Promise<void> {
    const instance = await this.stopwatchService.blank('', '');
    await this.stopwatchService.create(instance);
    const groupId = this.id();
    this.analyticsService.trackStopwatchCreate(instance.id);
    if (groupId) {
      await this.service.addMember(groupId, instance.id);
      this.analyticsService.trackStopwatchAddToGroup(instance.id, [groupId]);
    }

  }
}