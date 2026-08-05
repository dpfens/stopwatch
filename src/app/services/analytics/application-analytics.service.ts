import { Injectable, inject } from '@angular/core';
import { GoogleAnalyticsService } from './google-analytics.service';
import { StopWatchEventType, UniqueIdentifier } from '../../models/sequence/interfaces';
import { SettingId } from '../../models/settings/interfaces';

/**
 * Helper service for tracking stopwatch app events with consistent structure
 */
@Injectable({
  providedIn: 'root'
})
export class ApplicationAnalyticsService {
  private ga = inject(GoogleAnalyticsService);

  // Stopwatch Events
  trackStopwatchCreate(stopwatchId: UniqueIdentifier): void {
    this.ga.trackEvent(
      { action: 'create', category: 'stopwatch' },
      { entity_id: stopwatchId }
    );
  }

  trackStopwatchDelete(stopwatchId: UniqueIdentifier): void {
    this.ga.trackEvent(
      { action: 'delete', category: 'stopwatch' },
      { entity_id: stopwatchId }
    );
  }

  trackStopwatchStart(stopwatchId: UniqueIdentifier, isForked: boolean = false): void {
    this.ga.trackEvent(
      { action: 'start', category: 'stopwatch' },
      { entity_id: stopwatchId, is_forked: isForked }
    );
  }

  trackStopwatchStop(stopwatchId: UniqueIdentifier): void {
    this.ga.trackEvent(
      { action: 'stop', category: 'stopwatch' },
      { entity_id: stopwatchId }
    );
  }

  trackStopwatchResume(stopwatchId: UniqueIdentifier): void {
    this.ga.trackEvent(
      { action: 'resume', category: 'stopwatch' },
      { entity_id: stopwatchId }
    );
  }

  trackStopwatchReset(stopwatchId: UniqueIdentifier): void {
    this.ga.trackEvent(
      { action: 'reset', category: 'stopwatch' },
      { entity_id: stopwatchId }
    );
  }

  trackStopwatchAddToGroup(stopwatchId: UniqueIdentifier, groupIds: UniqueIdentifier[]): void {
    this.ga.trackEvent(
      { action: 'add_to_group', category: 'stopwatch' },
      { 
        entity_id: stopwatchId,
        group_count: groupIds.length
      }
    );
  }

  trackStopwatchRemoveFromGroup(stopwatchId: UniqueIdentifier, groupIds: UniqueIdentifier[]): void {
    this.ga.trackEvent(
      { action: 'remove_from_group', category: 'stopwatch' },
      { 
        entity_id: stopwatchId,
        group_count: groupIds.length
      }
    );
  }

  trackStopwatchFork(originalId: UniqueIdentifier, newId: UniqueIdentifier): void {
    this.ga.trackEvent(
      { action: 'fork', category: 'stopwatch' },
      { 
        entity_id: newId,
        source_id: originalId
      }
    );
  }

  trackStopwatchShowSettings(stopwatchId: UniqueIdentifier): void {
    this.ga.trackEvent(
      { action: 'show_settings', category: 'stopwatch' },
      { entity_id: stopwatchId }
    );
  }

  trackStopwatchSaveSettings(stopwatchId: UniqueIdentifier, changedFields: string[]): void {
    this.ga.trackEvent(
      { action: 'save_settings', category: 'stopwatch', value: changedFields.length },
      { 
        entity_id: stopwatchId,
        fields_changed: changedFields.join(',')
      }
    );
  }

  // Split/Lap Events
  trackLapCreate(stopwatchId: UniqueIdentifier, lapNumber: number): void {
    this.ga.trackEvent(
      { action: 'create_lap', category: 'split' },
      { 
        stopwatch_id: stopwatchId,
        lap_number: lapNumber,
        split_type: 'lap'
      }
    );
  }

  trackLapDelete(stopwatchId: UniqueIdentifier, lapNumber: number): void {
    this.ga.trackEvent(
      { action: 'delete_lap', category: 'split' },
      { 
        stopwatch_id: stopwatchId,
        lap_number: lapNumber,
        split_type: 'lap'
      }
    );
  }

  trackSplitCreate(stopwatchId: UniqueIdentifier, splitNumber: number): void {
    this.ga.trackEvent(
      { action: 'create_split', category: 'split' },
      { 
        stopwatch_id: stopwatchId,
        split_number: splitNumber,
        split_type: 'split'
      }
    );
  }

  trackSplitDelete(stopwatchId: UniqueIdentifier, splitType: StopWatchEventType, splitNumber: number): void {
    this.ga.trackEvent(
      { action: 'delete_split', category: 'split' },
      { 
        stopwatch_id: stopwatchId,
        split_number: splitNumber,
        split_type: splitType
      }
    );
  }

  trackSplitShowSettings(stopwatchId: UniqueIdentifier): void {
    this.ga.trackEvent(
      { action: 'show_settings', category: 'split' },
      { stopwatch_id: stopwatchId }
    );
  }

  trackSplitSaveSettings(stopwatchId: UniqueIdentifier, changedFields: string[]): void {
    this.ga.trackEvent(
      { action: 'save_settings', category: 'split', value: changedFields.length },
      { 
        stopwatch_id: stopwatchId,
        fields_changed: changedFields.join(',')
      }
    );
  }

  // Group Events
  trackGroupCreate(groupId: UniqueIdentifier, initialStopwatchCount: number = 0): void {
    this.ga.trackEvent(
      { action: 'create', category: 'group' },
      { 
        entity_id: groupId,
        stopwatch_count: initialStopwatchCount
      }
    );
  }

  trackGroupDelete(groupId: UniqueIdentifier, stopwatchCount: number): void {
    this.ga.trackEvent(
      { action: 'delete', category: 'group', value: stopwatchCount },
      { 
        entity_id: groupId,
        stopwatch_count: stopwatchCount
      }
    );
  }

  trackGroupFork(originalId: UniqueIdentifier, newId: UniqueIdentifier, stopwatchCount: number): void {
    this.ga.trackEvent(
      { action: 'fork', category: 'group' },
      { 
        entity_id: newId,
        source_id: originalId,
        stopwatch_count: stopwatchCount
      }
    );
  }

  trackGroupShowSettings(groupId: UniqueIdentifier): void {
    this.ga.trackEvent(
      { action: 'show_settings', category: 'group' },
      { entity_id: groupId }
    );
  }

  trackGroupSaveSettings(groupId: UniqueIdentifier, changedFields: string[]): void {
    this.ga.trackEvent(
      { action: 'save_settings', category: 'group', value: changedFields.length },
      { 
        entity_id: groupId,
        fields_changed: changedFields.join(',')
      }
    );
  }

  // Bulk Actions
  trackBulkStart(stopwatchIds: UniqueIdentifier[], source: 'manual' | 'group', groupId?: UniqueIdentifier): void {
    this.ga.trackEvent(
      { action: 'start', category: 'bulk', value: stopwatchIds.length },
      { 
        stopwatch_count: stopwatchIds.length,
        source: source,
        ...(groupId && { group_id: groupId })
      }
    );
  }

  trackBulkStop(stopwatchIds: UniqueIdentifier[], source: 'manual' | 'group', groupId?: UniqueIdentifier): void {
    this.ga.trackEvent(
      { action: 'stop', category: 'bulk', value: stopwatchIds.length },
      { 
        stopwatch_count: stopwatchIds.length,
        source: source,
        ...(groupId && { group_id: groupId })
      }
    );
  }

  trackBulkResume(stopwatchIds: UniqueIdentifier[], source: 'manual' | 'group', groupId?: UniqueIdentifier): void {
    this.ga.trackEvent(
      { action: 'resume', category: 'bulk', value: stopwatchIds.length },
      { 
        stopwatch_count: stopwatchIds.length,
        source: source,
        ...(groupId && { group_id: groupId })
      }
    );
  }

  trackBulkReset(stopwatchIds: UniqueIdentifier[], source: 'manual' | 'group', groupId?: UniqueIdentifier): void {
    this.ga.trackEvent(
      { action: 'reset', category: 'bulk', value: stopwatchIds.length },
      { 
        stopwatch_count: stopwatchIds.length,
        source: source,
        ...(groupId && { group_id: groupId })
      }
    );
  }

  trackBulkDelete(stopwatchIds: UniqueIdentifier[], source: 'manual' | 'group', groupId?: UniqueIdentifier): void {
    this.ga.trackEvent(
      { action: 'delete', category: 'bulk', value: stopwatchIds.length },
      { 
        stopwatch_count: stopwatchIds.length,
        source: source,
        ...(groupId && { group_id: groupId })
      }
    );
  }

  trackBulkFork(originalIds: UniqueIdentifier[], newIds: UniqueIdentifier[], source: 'manual' | 'group', groupId?: UniqueIdentifier): void {
    this.ga.trackEvent(
      { action: 'fork', category: 'bulk', value: originalIds.length },
      { 
        stopwatch_count: originalIds.length,
        source: source,
        ...(groupId && { group_id: groupId })
      }
    );
  }

  // Global Settings
  trackSettingChange(settingType: SettingId, 
                     oldValue: string | number | null, 
                     newValue: string | number): void {
    this.ga.trackEvent(
      { action: 'change', category: 'settings', label: settingType },
      { 
        setting_type: settingType,
        old_value: String(oldValue),
        new_value: String(newValue)
      }
    );
  }

  // User Properties (call once on app load)
  setUserProperties(totalStopwatches: number, totalGroups: number): void {
    this.ga.setUserProperties({
      stopwatch_count: totalStopwatches,
      group_count: totalGroups,
      is_power_user: totalStopwatches > 10 || totalGroups > 3
    });
  }
}