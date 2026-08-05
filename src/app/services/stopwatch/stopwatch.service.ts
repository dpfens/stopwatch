import { Injectable, signal, WritableSignal, computed, PLATFORM_ID, inject, DestroyRef } from '@angular/core';
import { 
  ContextualStopwatchEntity, 
  StopwatchEntity, 
  UniqueIdentifier
} from '../../models/sequence/interfaces';
import { TZDate } from '../../models/date';
import { StopwatchRepository } from '../../repositories/stopwatch';
import { isPlatformBrowser } from '@angular/common';
import { SynchronizationService } from '../synchronization/synchronization.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MembershipService } from '../membership/membership.service';
import { StopwatchStateController } from '../../controllers/stopwatch/stopwatch-state-controller';
import { SettingsService } from '../settings/settings.service';

@Injectable({
  providedIn: 'root'
})
export class StopwatchService {
  platformId = inject(PLATFORM_ID);
  private repository = new StopwatchRepository();
  private membershipService = inject(MembershipService);
  private settingsService = inject(SettingsService);

  private destroyRef = inject(DestroyRef);
  private syncService = inject(SynchronizationService);
  
  private _instances: WritableSignal<ContextualStopwatchEntity[]> = signal<ContextualStopwatchEntity[]>([]);
  private _isLoading: WritableSignal<boolean> = signal<boolean>(false);
  private _error: WritableSignal<string | null> = signal<string | null>(null);
  
  // Public readonly signals
  instances = this._instances.asReadonly();
  isLoading = this._isLoading.asReadonly();
  error = this._error.asReadonly();
  
  // Computed signals for derived state
  instanceCount = computed(() => this.instances().length);
  hasInstances = computed(() => this.instances().length > 0);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadInstances();

      // SIMPLIFIED: Only listen for group structure changes that affect our data
      this.syncService.groupEvents$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(event => {
          if (event.action === 'updated') {
            // Only refresh if group metadata changed (title, description, etc.)
            this.refreshGroupMetadataForStopwatches();
          } else if (event.action === 'deleted') {
            // Remove deleted group from all stopwatches immediately
            this.handleGroupDeletion(event.groupId);
          }
        });
  
      this.syncService.membershipEvents$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(event => {
          // Simply refresh the affected stopwatch's group list
          this.refreshStopwatchGroups(event.stopwatchId);
        });
    }
  }

  /**
   * Creates a blank stopwatch entity with default values
   */
  async blank(title: string, description: string): Promise<StopwatchEntity> {
    const now = TZDate.now();
    const lapUnit = this.settingsService.getValue('defaultLapUnit', 'user');
    const lapValue = this.settingsService.getValue('defaultLapValue', 'user');
    const lap = (lapValue && lapUnit) ? {value: lapValue, unit: lapUnit} : null;
    return {
      id: crypto.randomUUID(),
      annotation: {
        title, 
        description
      },
      state: { 
        sequence: [],
        lap
      },
      metadata: {
        creation: { timestamp: now },
        lastModification: { timestamp: now }
      }
    };
  }

  /**
   * Creates a contextual stopwatch entity from a base entity
   */
  private async createContextualEntity(entity: StopwatchEntity): Promise<ContextualStopwatchEntity> {
    // DELEGATED: Get groups from MembershipService
    const groups = await this.membershipService.getGroupsForStopwatch(entity.id);
    
    return {
      ...entity,
      groups,
    };
  }

  /**
   * Loads all instances from the repository
   */
  async loadInstances(): Promise<void> {
    try {
      this._isLoading.set(true);
      this._error.set(null);
      
      const entities = await this.repository.getAll();
      const contextualEntities = await Promise.all(
        entities.map(entity => this.createContextualEntity(entity))
      );
      
      this._instances.set(contextualEntities);
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to load stopwatches');
      console.error('Error loading stopwatches:', error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Gets a stopwatch by ID
   */
  async getById(id: UniqueIdentifier): Promise<ContextualStopwatchEntity | null> {
    // First check in-memory instances
    const existing = this.instances().find(inst => inst.id === id);
    if (existing) {
      return existing;
    }

    // If not found in memory, try loading from repository
    try {
      const entity = await this.repository.get(id);
      if (entity) {
        return await this.createContextualEntity(entity);
      }
      return null;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to get stopwatch');
      return null;
    }
  }

  /**
   * Creates a new stopwatch instance
   */
  async create(instance: StopwatchEntity): Promise<ContextualStopwatchEntity | null> {
    try {
      this._error.set(null);
      
      // Ensure we have an ID
      if (!instance.id) {
        instance.id = crypto.randomUUID();
      }
      
      // Update modification timestamp
      instance.metadata.lastModification = {
        timestamp: TZDate.now()
      };
      
      // Save to repository
      await this.repository.create(instance);
      
      // Create contextual entity
      const contextualEntity = await this.createContextualEntity(instance);
      
      // Update in-memory state
      this._instances.set([...this.instances(), contextualEntity]);
      
      return contextualEntity;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to create stopwatch');
      console.error('Error creating stopwatch:', error);
      return null;
    }
  }

  /**
   * Updates an existing stopwatch instance
   */
  async update(instance: ContextualStopwatchEntity): Promise<boolean> {
    try {
      this._error.set(null);
      
      // Update modification timestamp
      instance.metadata.lastModification = {
        timestamp: TZDate.now()
      };
      
      // Save to repository
      await this.repository.update(instance);
      this.syncService.notifyStopwatchUpdated(instance.id);
      
      // Update in-memory state
      const index = this.instances().findIndex(inst => inst.id === instance.id);
      if (index !== -1) {
        const instances = [...this.instances()];
        instances[index] = instance;
        this._instances.set(instances);
        return true;
      }
      
      return false;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to update stopwatch');
      console.error('Error updating stopwatch:', error);
      return false;
    }
  }

  /**
   * Deletes a stopwatch instance
   * IMPROVED: Now properly coordinates with MembershipService
   */
  async delete(id: UniqueIdentifier): Promise<boolean> {
    try {
      this._error.set(null);
      
      // CRITICAL: Notify BEFORE deletion
      this.syncService.notifyStopwatchDeleted(id);
      
      // DELEGATED: Let MembershipService handle membership cleanup
      await this.membershipService.removeAllMembershipsForStopwatch(id);
      
      // Delete from repository
      await this.repository.delete(id);
      
      // Update in-memory state
      const instances = this.instances().filter(inst => inst.id !== id);
      this._instances.set(instances);
      
      return true;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to delete stopwatch');
      console.error('Error deleting stopwatch:', error);
      return false;
    }
  }

  /**
   * DELEGATED: Add a stopwatch to a group
   * This method now simply delegates to MembershipService
   */
  async addToGroup(stopwatchId: UniqueIdentifier, groupId: UniqueIdentifier): Promise<boolean> {
    return await this.membershipService.addMember(groupId, stopwatchId);
  }

  /**
   * DELEGATED: Remove a stopwatch from a group
   * This method now simply delegates to MembershipService
   */
  async removeFromGroup(stopwatchId: UniqueIdentifier, groupId: UniqueIdentifier): Promise<boolean> {
    return await this.membershipService.removeMember(groupId, stopwatchId);
  }

  /**
   * DELEGATED: Set all group memberships for a stopwatch
   * This is the method the UI should use for batch updates
   */
  async setGroupMemberships(stopwatchId: UniqueIdentifier, groupIds: UniqueIdentifier[]): Promise<boolean> {
    return await this.membershipService.setMemberships(stopwatchId, groupIds);
  }

  /**
   * Gets stopwatches by group ID
   * SIMPLIFIED: This is mainly for backwards compatibility
   */
  async getByGroupId(groupId: UniqueIdentifier): Promise<ContextualStopwatchEntity[]> {
    try {
      // Get stopwatch IDs from MembershipService
      const stopwatchIds = await this.membershipService.getStopwatchIdsForGroup(groupId);
      
      // Get full stopwatch entities
      const entities = await this.repository.getByIds(stopwatchIds);
      return await Promise.all(
        entities.map(entity => this.createContextualEntity(entity))
      );
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to get stopwatches by group');
      console.error('Error getting stopwatches by group:', error);
      return [];
    }
  }

  /**
   * SIMPLIFIED: Refreshes group data for a specific stopwatch
   * Called when membership changes
   */
  private async refreshStopwatchGroups(stopwatchId: UniqueIdentifier): Promise<void> {
    const instance = this.instances().find(inst => inst.id === stopwatchId);
    if (!instance) return;

    try {
      // Get updated groups from MembershipService
      const groups = await this.membershipService.getGroupsForStopwatch(stopwatchId);
      
      // Update the instance with new groups
      const updatedInstance = { ...instance, groups };
      
      const index = this.instances().findIndex(inst => inst.id === stopwatchId);
      if (index !== -1) {
        const instances = [...this.instances()];
        instances[index] = updatedInstance;
        this._instances.set(instances);
      }
    } catch (error) {
      console.error('Error refreshing groups for stopwatch:', error);
    }
  }

  /**
   * NEW: Handles group deletion by removing deleted groups from stopwatch data
   */
  private handleGroupDeletion(groupId: UniqueIdentifier): void {
    const currentInstances = this.instances();
    let hasChanges = false;
    
    const updatedInstances = currentInstances.map(stopwatch => {
      const groupIndex = stopwatch.groups.findIndex(group => group.id === groupId);
      
      if (groupIndex !== -1) {
        hasChanges = true;
        
        // Remove the deleted group from this stopwatch's groups
        const updatedGroups = stopwatch.groups.filter(group => group.id !== groupId);
        
        return {
          ...stopwatch,
          groups: updatedGroups
        };
      }
      
      return stopwatch;
    });
    
    // Only update if there were actual changes
    if (hasChanges) {
      this._instances.set(updatedInstances);
    }
  }

  /**
   * NEW: Refreshes group metadata (title, description) without touching memberships
   */
  private async refreshGroupMetadataForStopwatches(): Promise<void> {
    // This could be optimized to only refresh specific groups, but for now
    // we'll do a full refresh since group updates should be less frequent
    await this.loadInstances();
  }

  /**
   * Clears all error states
   */
  clearError(): void {
    this._error.set(null);
  }

  isStopwatchRunning(sw: ContextualStopwatchEntity): boolean {
    const controller = new StopwatchStateController(sw.state);
    return controller.isActive() && controller.isRunning();
  }
    
  isStopwatchStopped(sw: ContextualStopwatchEntity): boolean {
    const controller = new StopwatchStateController(sw.state);
    return controller.isActive() && !controller.isRunning();
  }
    
  isStopwatchActive(sw: ContextualStopwatchEntity): boolean {
    const controller = new StopwatchStateController(sw.state);
    return controller.isActive();
  }
}