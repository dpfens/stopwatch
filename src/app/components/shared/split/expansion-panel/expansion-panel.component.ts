import { Component, EventEmitter, inject, OnInit, Output, signal, OnDestroy, computed } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BaseSplitComponent } from '../base-split.component';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { StopWatchEventType, VisibleSplit } from '../../../../models/sequence/interfaces';
import { MatButtonModule } from '@angular/material/button';
import { LapUnits } from '../../../../utilities/constants';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { Subject, takeUntil } from 'rxjs';

// Define the form interface for type safety
interface SplitFormData {
  title: string;
  splitType: StopWatchEventType;
  splitValue: number | null;
  splitUnit: string;
}

@Component({
  selector: 'split-expansion-panel',
  imports: [
    MatExpansionModule,
    ReactiveFormsModule, 
    MatFormFieldModule, 
    MatSelectModule, 
    MatInputModule,
    MatListModule, 
    MatButtonModule, 
    MatIconModule
  ],
  templateUrl: './expansion-panel.component.html',
  styleUrl: './expansion-panel.component.scss'
})
export class SplitExpansionPanelComponent extends BaseSplitComponent implements OnInit, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  // Strongly typed form using nonNullable FormBuilder
  readonly form = this.formBuilder.nonNullable.group({
    title: [''],
    splitType: ['split' as StopWatchEventType],
    splitValue: [null as number | null],
    splitUnit: ['']
  });

  readonly isEditing = signal(false);
  readonly lapUnits = LapUnits;

  readonly isEditable = computed(() => this.updateEmitter.observed);
  readonly isDeletable = computed(() => this.deleteEmitter.observed);

  @Output() updateEmitter: EventEmitter<VisibleSplit> = new EventEmitter<VisibleSplit>();
  @Output() deleteEmitter: EventEmitter<VisibleSplit> = new EventEmitter<VisibleSplit>();

  // Convenient getters for form controls
  get titleControl() { return this.form.controls.title; }
  get splitTypeControl() { return this.form.controls.splitType; }
  get splitValueControl() { return this.form.controls.splitValue; }
  get splitUnitControl() { return this.form.controls.splitUnit; }

  ngOnInit(): void {
    this.initializeForm();
    this.setupFormSubscription();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    // Use patchValue with the entire form data at once
    this.form.patchValue({
      title: this.instance.event.annotation.title,
      splitType: this.instance.event.type,
      splitValue: this.instance.event.unit?.value ?? null,
      splitUnit: this.instance.event.unit?.unit ?? ''
    });
  }

  private setupFormSubscription(): void {
    // Automatically update the model when form values change
    this.form.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(formData => this.updateInstanceFromForm(formData));
  }

  private updateInstanceFromForm(formData: Partial<SplitFormData>): void {
    // Update the instance based on form data
    if (formData.splitType) {
      this.instance.event.type = formData.splitType;
    }
    
    if (formData.title !== undefined) {
      this.instance.event.annotation.title = formData.title;
    }

    // Handle unit data
    if (formData.splitValue && formData.splitUnit) {
      this.instance.event.unit = {
        value: formData.splitValue,
        unit: formData.splitUnit
      };
    } else {
      this.instance.event.unit = undefined;
    }

    this.updateEmitter.emit(this.instance);
  }

  delete(): void {
    this.deleteEmitter.emit(this.instance);
  }

  toggleEditing(): void {
    this.isEditing.set(!this.isEditing());
  }

  cancelEditing(): void {
    this.initializeForm();
    this.isEditing.set(false);
  }


  resetForm(): void {
    this.form.reset();
  }

  get isFormValid(): boolean {
    return this.form.valid;
  }
}