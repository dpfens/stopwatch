import { Component, OnInit, OnDestroy, signal, computed, inject, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { SettingsService } from '../../../services/settings/settings.service';
import { SettingId, SettingScope } from '../../../models/settings/interfaces';
import { SelectOptGroup } from '../../../models/sequence/interfaces';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LapUnits, stopwatchViewOptions, ThemeOptions } from '../../../utilities/constants';
import { ApplicationAnalyticsService } from '../../../services/analytics/application-analytics.service';

/**
 * Configuration for which scopes each setting supports
 */
interface SettingConfiguration {
  id: SettingId;
  label: string;
  description?: string;
  supportedScopes: SettingScope[];
  defaultScope: SettingScope;
  type: 'text' | 'number' | 'select' | 'boolean';
  options?: SelectOptGroup<any>[];
  min: number | null;
  max: number | null;
  step?: number;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatIconModule,
    MatDividerModule,
    MatChipsModule,
    MatSlideToggleModule
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements AfterViewInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private settingsService = inject(SettingsService);
  private readonly analyticsService = inject(ApplicationAnalyticsService);

  // Form and state management
  settingsForm: FormGroup;
  private _isSaving = signal(false);
  private _hasUnsavedChanges = signal(false);

  // Make Object available for template
  Object = Object;

  // Computed properties
  isSaving = this._isSaving.asReadonly();
  hasUnsavedChanges = this._hasUnsavedChanges.asReadonly();
  isLoading = this.settingsService.isLoading;
  error = this.settingsService.error;

  // Settings configuration
  settingsConfig: SettingConfiguration[] = [
    {
      id: 'theme',
      label: 'Theme',
      description: 'Choose your application theme',
      supportedScopes: ['user'], // User-only setting
      defaultScope: 'user',
      type: 'select',
      options: ThemeOptions,
      min: null,
      max: null
    },
    {
      id: 'stopwatchView',
      label: 'Stopwatch View',
      description: 'Choose how you want stopwatches to be rendered',
      supportedScopes: ['user'], // User-only setting
      defaultScope: 'user',
      type: 'select',
      options: stopwatchViewOptions,
      min: null,
      max: null
    },
    {
      id: 'defaultLapUnit',
      label: 'Default Lap Unit',
      description: 'Choose your units for laps',
      supportedScopes: ['user'], // User-only setting
      defaultScope: 'user',
      type: 'select',
      options: LapUnits,
      min: null,
      max: null
    },
    {
      id: 'defaultLapValue',
      label: 'Default Lap Value',
      description: 'Set the default value for laps',
      supportedScopes: ['user'], // User-only setting
      defaultScope: 'user',
      type: 'number',
      min: 0,
      max: 999999,
      step: 0.01
    }
    // Future settings can be added here with different scope configurations
  ];

  // Scope display configuration
  scopeConfig = {
    user: { label: 'Personal', color: '--mat-sys-primary', icon: 'person' },
    group: { label: 'Group', color: '--mat-sys-secondary', icon: 'group' },
    global: { label: 'Default', color: '--mat-sys-tertiary', icon: 'public' }
  } as const;

  constructor() {
    this.settingsForm = this.createForm();
    this.setupFormChangeDetection();
  }

  ngAfterViewInit(): void {
    this.loadCurrentSettings();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Creates the reactive form based on settings configuration
   */
  private createForm(): FormGroup {
    const formConfig: any = {};
    
    this.settingsConfig.forEach(config => {
      const validators = [];
      
      if (config.type === 'number') {
        validators.push(Validators.required);
        if (config.min !== null) validators.push(Validators.min(config.min));
        if (config.max !== null) validators.push(Validators.max(config.max));
      }
      
      // Initialize with null instead of empty string
      formConfig[config.id] = [null, validators];
    });

    return this.fb.group(formConfig);
  }

  /**
   * Sets up form change detection with debouncing
   */
  private setupFormChangeDetection(): void {
    this.settingsForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this._hasUnsavedChanges.set(this.settingsForm.dirty);
      });
  }

  /**
   * Loads current settings values into the form
   */
  private async loadCurrentSettings(): Promise<void> {
    try {
      // Wait for settings service to finish loading if it's still loading
      if (this.settingsService.isLoading()) {
        // Wait for loading to complete
        await new Promise<void>((resolve) => {
          const checkLoading = () => {
            if (!this.settingsService.isLoading()) {
              resolve();
            } else {
              setTimeout(checkLoading, 50);
            }
          };
          checkLoading();
        });
      }

      const formValues: any = {};
      
      for (const config of this.settingsConfig) {
        try {
          // For user-only settings, always use user scope
          const scope = config.supportedScopes.includes('user') ? 'user' : config.defaultScope;
          
          // Use the async repository method to get fresh data
          const value = await this.settingsService.getValueWithFallbackFromRepository(config.id, scope);
          
          if (value !== null && value !== undefined) {
            formValues[config.id] = value;
          }
        } catch (error) {
          console.error(`Error loading setting ${config.id}:`, error);
        }
      }
      
      // Patch all values at once
      if (Object.keys(formValues).length > 0) {
        this.settingsForm.patchValue(formValues, { emitEvent: false });
      }
      
      this.settingsForm.markAsPristine();
      this._hasUnsavedChanges.set(false);
      
    } catch (error) {
      console.error('Error loading current settings:', error);
      this.showError('Failed to load current settings');
    }
  }

  /**
   * Saves all form values to the appropriate scopes
   */
  async saveSettings(): Promise<void> {
    if (!this.settingsForm.valid || this._isSaving()) return;

    this._isSaving.set(true);

    try {
      const formValues = this.settingsForm.value;
      const savePromises: Promise<boolean>[] = [];

      for (const config of this.settingsConfig) {
        const oldValue = this.getEffectiveValue(config.id);
        const value = formValues[config.id];
        if (value !== undefined && value !== null && value !== '') {
          // Use the default scope for this setting (user for our current settings)
          const scope = config.defaultScope;
          savePromises.push(
            this.settingsService.set(config.id, value, scope)
          );
          this.analyticsService.trackSettingChange(config.id, oldValue, value);
        }
      }

      const results = await Promise.all(savePromises);
      const allSuccessful = results.every(result => result === true);

      if (allSuccessful) {
        this.settingsForm.markAsPristine();
        this._hasUnsavedChanges.set(false);
        this.showSuccess('Settings saved successfully!');
      } else {
        this.showError('Some settings could not be saved. Please try again.');
      }

    } catch (error) {
      console.error('Error saving settings:', error);
      this.showError('Failed to save settings. Please try again.');
    } finally {
      this._isSaving.set(false);
    }
  }

  /**
   * Resets form to last saved state
   */
  async resetForm(): Promise<void> {
    await this.loadCurrentSettings();
    this.settingsForm.markAsPristine();
    this._hasUnsavedChanges.set(false);
    this.showSuccess('Form reset to saved values');
  }

  /**
   * Resets a specific setting to system defaults
   */
  async resetSetting(settingId: SettingId): Promise<void> {
    const config = this.settingsConfig.find(c => c.id === settingId);
    if (!config) return;

    try {
      // If it's a user setting, delete the user preference to fall back to defaults
      if (config.supportedScopes.includes('user')) {
        await this.settingsService.resetUserSetting(settingId);
      }

      // Reload the form to show the new effective value
      await this.loadCurrentSettings();
      this.showSuccess(`${config.label} reset to default`);

    } catch (error) {
      console.error(`Error resetting setting ${settingId}:`, error);
      this.showError(`Failed to reset ${config.label}`);
    }
  }

  /**
   * Gets the effective value for a setting (considering scope hierarchy)
   */
  getEffectiveValue(settingId: SettingId): any {
    return this.settingsService.getEffectiveValue(settingId);
  }

  /**
   * Checks if a setting has been customized by the user
   */
  hasUserCustomization(settingId: SettingId): boolean {
    return this.settingsService.hasUserCustomization(settingId);
  }

  /**
   * Gets the supported scopes for a setting
   */
  getSupportedScopes(settingId: SettingId): SettingScope[] {
    const config = this.settingsConfig.find(c => c.id === settingId);
    return config?.supportedScopes || [];
  }

  /**
   * Clears any error state
   */
  clearError(): void {
    this.settingsService.clearError();
  }

  /**
   * Shows success message
   */
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  /**
   * Shows error message
   */
  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}