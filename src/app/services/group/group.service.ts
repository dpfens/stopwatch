import { Injectable, signal, WritableSignal, computed, inject, PLATFORM_ID, DestroyRef } from '@angular/core';
import { 
  StopwatchGroup, 
  BaseStopwatchGroup, 
  UniqueIdentifier,
  GroupTraits,
  GroupTraitPreset,
  GroupTimingBehavior,
  GroupEvaluationBehavior
} from '../../models/sequence/interfaces';
import { TZDate } from '../../models/date';
import { GroupRepository } from '../../repositories/group';
import { StopwatchRepository } from '../../repositories/stopwatch';
import { isPlatformBrowser } from '@angular/common';
import { SynchronizationService } from '../synchronization/synchronization.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MembershipService } from '../membership/membership.service';
import { GroupPresets } from '../../utilities/constants';

@Injectable({
  providedIn: 'root'
})
export class GroupService {
  platformId = inject(PLATFORM_ID);

  private destroyRef = inject(DestroyRef);
  private syncService = inject(SynchronizationService);
  private membershipService = inject(MembershipService); // NEW

  private repository = new GroupRepository();
  private stopwatchRepository = new StopwatchRepository();
  
  private _instances: WritableSignal<StopwatchGroup[]> = signal<StopwatchGroup[]>([]);
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

      // SIMPLIFIED: Only listen for stopwatch metadata changes
      this.syncService.stopwatchEvents$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (event.action === 'updated') {
          // Pass the specific stopwatch ID for surgical update
          this.refreshStopwatchMetadataInGroups(event.stopwatchId);
        } else if (event.action === 'deleted') {
          this.handleStopwatchDeletion(event.stopwatchId);
        }
      });

      // SIMPLIFIED: Only listen for membership changes, don't manage them
      this.syncService.membershipEvents$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(event => {
          // Simply refresh the affected group's member list
          this.refreshGroupMembers(event.groupId);
        });
    }
  }

  /**
   * Creates a blank group with default traits
   */
  blank(title: string, description: string, preset: GroupTraitPreset = 'normal'): StopwatchGroup {
    const now = TZDate.now();
    return {
      id: crypto.randomUUID(),
      annotation: {
        title,
        description
      },
      traits: this.getTraitsFromPreset(preset),
      metadata: {
        creation: { timestamp: now },
        lastModification: { timestamp: now }
      },
      members: []
    };
  }

  clone(group: StopwatchGroup): StopwatchGroup {
    const now = TZDate.now();
    const metadata = {
      creation: {timestamp: now},
      lastModification: { timestamp: now },
      clone: { source: group.id }
    };
    return {
      ...group,
      annotation: {
        ...group.annotation,
        title: group.annotation.title + ' (copy)' 
      },
      id: crypto.randomUUID(),
      metadata,
      members: []
    };
  }

  /**
   * Gets default traits based on preset
   */
  private getTraitsFromPreset(preset: GroupTraitPreset): GroupTraits {    
    return GroupPresets[preset];
  }

  /**
   * Creates a contextual group entity from a base entity
   */
  private async createContextualGroup(baseGroup: BaseStopwatchGroup): Promise<StopwatchGroup> {
    // DELEGATED: Get stopwatch IDs from MembershipService
    const stopwatchIds = await this.membershipService.getStopwatchIdsForGroup(baseGroup.id);
    
    // Get full stopwatch entities
    const stopwatchEntities = await this.stopwatchRepository.getByIds(stopwatchIds);
    
    // Convert to contextual entities
    const members = await Promise.all(
      stopwatchEntities.map(async (entity) => {
        // DELEGATED: Get groups from MembershipService
        const groups = await this.membershipService.getGroupsForStopwatch(entity.id);
        
        return {
          ...entity,
          groups,
        };
      })
    );
    
    return {
      ...baseGroup,
      members
    };
  }

  /**
   * Loads all instances from the repository
   */
  async loadInstances(): Promise<void> {
    try {
      this._isLoading.set(true);
      this._error.set(null);
      
      const baseGroups = await this.repository.getAll();
      const contextualGroups = await Promise.all(
        baseGroups.map(group => this.createContextualGroup(group))
      );
      
      this._instances.set(contextualGroups);
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to load groups');
      console.error('Error loading groups:', error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Gets a group by ID
   */
  async getById(id: UniqueIdentifier): Promise<StopwatchGroup | null> {
    // First check in-memory instances
    const existing = this.instances().find(inst => inst.id === id);
    if (existing) {
      return existing;
    }

    // If not found in memory, try loading from repository
    try {
      const baseGroup = await this.repository.get(id);
      if (baseGroup) {
        return await this.createContextualGroup(baseGroup);
      }
      return null;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to get group');
      return null;
    }
  }

  /**
   * Creates a new group
   */
  async create(group: StopwatchGroup): Promise<StopwatchGroup | null> {
    try {
      this._error.set(null);
      
      // Ensure we have an ID
      if (!group.id) {
        group.id = crypto.randomUUID();
      }
      
      // Update modification timestamp
      group.metadata.lastModification = {
        timestamp: TZDate.now()
      };
      
      // Save to repository
      await this.repository.create(group);
      
      // Update in-memory state
      this._instances.set([...this.instances(), group]);
      
      return group;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to create group');
      console.error('Error creating group:', error);
      return null;
    }
  }

  /**
   * Updates an existing group
   */
  async update(group: StopwatchGroup): Promise<boolean> {
    try {
      this._error.set(null);
      
      // Update modification timestamp
      group.metadata.lastModification = {
        timestamp: TZDate.now()
      };
      
      // Save to repository
      await this.repository.update(group);
      this.syncService.notifyGroupUpdated(group.id);
      
      // Update in-memory state
      const index = this.instances().findIndex(inst => inst.id === group.id);
      if (index !== -1) {
        const instances = [...this.instances()];
        instances[index] = group;
        this._instances.set(instances);
        return true;
      }
      
      return false;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to update group');
      console.error('Error updating group:', error);
      return false;
    }
  }

  /**
   * Deletes a group
   * IMPROVED: Now properly coordinates with MembershipService
   */
  async delete(id: UniqueIdentifier): Promise<boolean> {
    try {
      this._error.set(null);
      
      // CRITICAL: Notify BEFORE deletion
      this.syncService.notifyGroupDeleted(id);
      
      // DELEGATED: Let MembershipService handle membership cleanup
      await this.membershipService.removeAllMembershipsForGroup(id);
      
      // Delete from repository
      await this.repository.delete(id);
      
      // Update in-memory state
      const instances = this.instances().filter(inst => inst.id !== id);
      this._instances.set(instances);
      
      return true;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to delete group');
      console.error('Error deleting group:', error);
      return false;
    }
  }

  /**
   * DELEGATED: Add a stopwatch to this group
   * This method now simply delegates to MembershipService
   */
  async addMember(groupId: UniqueIdentifier, stopwatchId: UniqueIdentifier): Promise<boolean> {
    return await this.membershipService.addMember(groupId, stopwatchId);
  }

  /**
   * DELEGATED: Remove a stopwatch from this group
   * This method now simply delegates to MembershipService
   */
  async removeMember(groupId: UniqueIdentifier, stopwatchId: UniqueIdentifier): Promise<boolean> {
    return await this.membershipService.removeMember(groupId, stopwatchId);
  }

  /**
   * DELEGATED: Gets groups that a stopwatch belongs to
   * This method now simply delegates to MembershipService
   */
  async getGroupsForStopwatch(stopwatchId: UniqueIdentifier): Promise<BaseStopwatchGroup[]> {
    return await this.membershipService.getGroupsForStopwatch(stopwatchId);
  }

  /**
   * SIMPLIFIED: Refreshes a specific group from the repository
   * Now only refreshes the group data, membership is handled by events
   */
  async refreshGroup(groupId: UniqueIdentifier): Promise<void> {
    try {
      const baseGroup = await this.repository.get(groupId);
      if (!baseGroup) return;
      
      const contextualGroup = await this.createContextualGroup(baseGroup);
      
      const index = this.instances().findIndex(inst => inst.id === groupId);
      if (index !== -1) {
        const instances = [...this.instances()];
        instances[index] = contextualGroup;
        this._instances.set(instances);
      } else {
        // Group not in memory, add it
        this._instances.set([...this.instances(), contextualGroup]);
      }
    } catch (error) {
      console.error('Error refreshing group:', error);
    }
  }

  /**
   * Updates group traits
   */
  async updateTraits(groupId: UniqueIdentifier, traits: GroupTraits): Promise<boolean> {
    const group = this.instances().find(g => g.id === groupId);
    if (!group) return false;
    
    const updatedGroup = {
      ...group,
      traits,
      metadata: {
        ...group.metadata,
        lastModification: { timestamp: TZDate.now() }
      }
    };
    
    return await this.update(updatedGroup);
  }

  /**
   * Gets groups by timing behavior
   */
  getGroupsByTimingBehavior(behavior: GroupTimingBehavior): StopwatchGroup[] {
    return this.instances().filter(group => group.traits.timing === behavior);
  }

  /**
   * Gets groups that have specific evaluation behavior
   */
  getGroupsByEvaluationBehavior(behavior: GroupEvaluationBehavior): StopwatchGroup[] {
    return this.instances().filter(group => 
      group.traits.evaluation.includes(behavior)
    );
  }

  /**
   * Clears all error states
   */
  clearError(): void {
    this._error.set(null);
  }

  /**
   * Gets available trait presets
   */
  getAvailablePresets(): { value: GroupTraitPreset; display: string; description: string }[] {
    return [
      {
        value: 'normal',
        display: 'Normal',
        description: 'Independent timing and evaluation'
      },
      {
        value: 'competition',
        display: 'Competition',
        description: 'Synchronized timing with comparative evaluation'
      },
      {
        value: 'workflow',
        display: 'Workflow',
        description: 'Sequential timing with cumulative evaluation'
      },
      {
        value: 'billing',
        display: 'Billing',
        description: 'Independent timing with cumulative and proportional evaluation'
      }
    ];
  }

  /**
   * SIMPLIFIED: Refreshes member list for a specific group
   * Called when membership changes
   */
  private async refreshGroupMembers(groupId: UniqueIdentifier): Promise<void> {
    const group = this.instances().find(inst => inst.id === groupId);
    if (!group) return;

    try {
      // Get updated member list from MembershipService
      const stopwatchIds = await this.membershipService.getStopwatchIdsForGroup(groupId);
      const stopwatchEntities = await this.stopwatchRepository.getByIds(stopwatchIds);
      
      // Convert to contextual entities
      const members = await Promise.all(
        stopwatchEntities.map(async (entity) => {
          const groups = await this.membershipService.getGroupsForStopwatch(entity.id);
          return {
            ...entity,
            groups
          };
        })
      );
      
      // Update the group with new members
      const updatedGroup = { ...group, members };
      
      const index = this.instances().findIndex(inst => inst.id === groupId);
      if (index !== -1) {
        const instances = [...this.instances()];
        instances[index] = updatedGroup;
        this._instances.set(instances);
      }
    } catch (error) {
      console.error('Error refreshing group members:', error);
    }
  }

  /**
   * NEW: Handles stopwatch deletion by removing deleted stopwatch from group members
   */
  private handleStopwatchDeletion(stopwatchId: UniqueIdentifier): void {
    const currentInstances = this.instances();
    let hasChanges = false;
    
    const updatedInstances = currentInstances.map(group => {
      const memberIndex = group.members.findIndex(member => member.id === stopwatchId);
      
      if (memberIndex !== -1) {
        hasChanges = true;
        
        // Remove the deleted stopwatch from this group's members
        const updatedMembers = group.members.filter(member => member.id !== stopwatchId);
        
        return {
          ...group,
          members: updatedMembers
        };
      }
      
      return group;
    });
    
    // Only update if there were actual changes
    if (hasChanges) {
      this._instances.set(updatedInstances);
    }
  }

  /**
   * NEW: Refreshes stopwatch metadata (title, description) without touching memberships
   */
  private async refreshStopwatchMetadataInGroups(stopwatchId?: UniqueIdentifier): Promise<void> {
    if (!stopwatchId) {
      // Fallback to full refresh if no specific stopwatch ID
      await this.loadInstances();
      return;
    }

    try {
      // Get the updated stopwatch entity
      const updatedStopwatch = await this.stopwatchRepository.get(stopwatchId);
      if (!updatedStopwatch) return;

      const currentInstances = this.instances();
      let hasChanges = false;
      
      const updatedInstances = currentInstances.map(group => {
        // Find if this group contains the updated stopwatch
        const memberIndex = group.members.findIndex(member => member.id === stopwatchId);
        
        if (memberIndex !== -1) {
          hasChanges = true;
          
          // Update just the metadata of this stopwatch
          const updatedMembers = [...group.members];
          updatedMembers[memberIndex] = {
            ...updatedMembers[memberIndex],
            annotation: updatedStopwatch.annotation,
            metadata: updatedStopwatch.metadata,
            state: updatedStopwatch.state // In case state changed too
          };
          
          return {
            ...group, // Keep same group reference
            members: updatedMembers
          };
        }
        
        return group; // No changes, return same reference
      });
      
      // Only update signal if there were actual changes
      if (hasChanges) {
        this._instances.set(updatedInstances);
      }
    } catch (error) {
      console.error('Error refreshing stopwatch metadata:', error);
      // Fallback to full refresh on error
      await this.loadInstances();
    }
  }
}