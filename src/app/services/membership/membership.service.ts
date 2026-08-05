import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { UniqueIdentifier, BaseStopwatchGroup } from '../../models/sequence/interfaces';
import { GroupRepository } from '../../repositories/group';
import { SynchronizationService } from '../synchronization/synchronization.service';
import { StopwatchRepository } from '../../repositories/stopwatch';

/**
 * Dedicated service for managing stopwatch-group membership relationships.
 * This service is the single source of truth for all membership operations,
 * eliminating dual ownership between StopwatchService and GroupService.
 */
@Injectable({
  providedIn: 'root'
})
export class MembershipService {
  platformId = inject(PLATFORM_ID);
  private syncService = inject(SynchronizationService);
  private groupRepository = new GroupRepository();
  private stopwatchRepository = new StopwatchRepository();

  constructor() {
    // No event subscriptions - this service is the event source, not consumer
  }

  /**
   * Adds a stopwatch to a group.
   * This is the authoritative method for membership addition.
   */
  async addMember(groupId: UniqueIdentifier, stopwatchId: UniqueIdentifier): Promise<boolean> {
    try {
      // Check if membership already exists to avoid duplicates
      const existingGroups = await this.getGroupsForStopwatch(stopwatchId);
      if (existingGroups.some(g => g.id === groupId)) {
        console.log(`Stopwatch ${stopwatchId} is already a member of group ${groupId}`);
        return true; // Already exists, consider it success
      }

      // Add membership in repository
      await this.groupRepository.addMember(groupId, stopwatchId);
      
      // Emit the authoritative event
      this.syncService.notifyGroupMembershipChanged(groupId, stopwatchId, { 
        action: 'added'
      });
      
      console.log(`Added stopwatch ${stopwatchId} to group ${groupId}`);
      return true;
    } catch (error) {
      console.error('Error adding group member:', error);
      return false;
    }
  }

  /**
   * Removes a stopwatch from a group.
   * This is the authoritative method for membership removal.
   */
  async removeMember(groupId: UniqueIdentifier, stopwatchId: UniqueIdentifier): Promise<boolean> {
    try {
      // Remove membership in repository
      await this.groupRepository.removeMember(groupId, stopwatchId);
      
      // Emit the authoritative event
      this.syncService.notifyGroupMembershipChanged(groupId, stopwatchId, { 
        action: 'removed'
      });
      
      console.log(`Removed stopwatch ${stopwatchId} from group ${groupId}`);
      return true;
    } catch (error) {
      console.error('Error removing group member:', error);
      return false;
    }
  }

  /**
   * Sets the complete group membership for a stopwatch.
   * This efficiently handles multiple membership changes in a single operation.
   */
  async setMemberships(stopwatchId: UniqueIdentifier, targetGroupIds: UniqueIdentifier[]): Promise<boolean> {
    try {
      // Get current memberships
      const currentGroups = await this.getGroupsForStopwatch(stopwatchId);
      const currentGroupIds = currentGroups.map(g => g.id);
      
      // Calculate additions and removals
      const toAdd = targetGroupIds.filter(id => !currentGroupIds.includes(id));
      const toRemove = currentGroupIds.filter(id => !targetGroupIds.includes(id));
      
      console.log(`Setting memberships for stopwatch ${stopwatchId}:`, {
        current: currentGroupIds,
        target: targetGroupIds,
        toAdd,
        toRemove
      });

      // Perform removals
      for (const groupId of toRemove) {
        await this.groupRepository.removeMember(groupId, stopwatchId);
        this.syncService.notifyGroupMembershipChanged(groupId, stopwatchId, { 
          action: 'removed'
        });
      }

      // Perform additions
      for (const groupId of toAdd) {
        await this.groupRepository.addMember(groupId, stopwatchId);
        this.syncService.notifyGroupMembershipChanged(groupId, stopwatchId, { 
          action: 'added'
        });
      }

      return true;
    } catch (error) {
      console.error('Error setting memberships:', error);
      return false;
    }
  }

  /**
   * Gets all groups that a stopwatch belongs to.
   * This is the authoritative source for membership queries.
   */
  async getGroupsForStopwatch(stopwatchId: UniqueIdentifier): Promise<BaseStopwatchGroup[]> {
    try {
      const groupIds = await this.groupRepository.byStopwatch(stopwatchId);
      return await this.groupRepository.getByIds(groupIds);
    } catch (error) {
      console.error('Error getting groups for stopwatch:', error);
      return [];
    }
  }

  /**
   * Gets all stopwatch IDs that belong to a group.
   * This is the authoritative source for group member queries.
   */
  async getStopwatchIdsForGroup(groupId: UniqueIdentifier): Promise<UniqueIdentifier[]> {
    try {
      // This method should be added to GroupRepository
      return await this.stopwatchRepository.idsByGroup(groupId);
    } catch (error) {
      console.error('Error getting stopwatch IDs for group:', error);
      return [];
    }
  }

  /**
   * Removes all memberships for a stopwatch (called when stopwatch is deleted).
   * This ensures proper cleanup when stopwatches are deleted.
   */
  async removeAllMembershipsForStopwatch(stopwatchId: UniqueIdentifier): Promise<boolean> {
    try {
      const currentGroups = await this.getGroupsForStopwatch(stopwatchId);
      
      for (const group of currentGroups) {
        await this.groupRepository.removeMember(group.id, stopwatchId);
        this.syncService.notifyGroupMembershipChanged(group.id, stopwatchId, { 
          action: 'removed'
        });
      }
      
      console.log(`Removed all memberships for deleted stopwatch ${stopwatchId}`);
      return true;
    } catch (error) {
      console.error('Error removing all memberships for stopwatch:', error);
      return false;
    }
  }

  /**
   * Removes all memberships for a group (called when group is deleted).
   * This ensures proper cleanup when groups are deleted.
   */
  async removeAllMembershipsForGroup(groupId: UniqueIdentifier): Promise<boolean> {
    try {
      const stopwatchIds = await this.getStopwatchIdsForGroup(groupId);
      
      for (const stopwatchId of stopwatchIds) {
        await this.groupRepository.removeMember(groupId, stopwatchId);
        this.syncService.notifyGroupMembershipChanged(groupId, stopwatchId, { 
          action: 'removed'
        });
      }
      
      console.log(`Removed all memberships for deleted group ${groupId}`);
      return true;
    } catch (error) {
      console.error('Error removing all memberships for group:', error);
      return false;
    }
  }

  /**
   * Gets membership statistics for debugging and monitoring.
   */
  async getMembershipStats(): Promise<{
    totalMemberships: number;
    groupsWithMembers: number;
    stopwatchesWithGroups: number;
  }> {
    try {
      // This would require additional repository methods for efficient querying
      const allGroups = await this.groupRepository.getAll();
      let totalMemberships = 0;
      let groupsWithMembers = 0;
      const uniqueStopwatches = new Set<UniqueIdentifier>();

      for (const group of allGroups) {
        const memberIds = await this.getStopwatchIdsForGroup(group.id);
        if (memberIds.length > 0) {
          groupsWithMembers++;
          totalMemberships += memberIds.length;
          memberIds.forEach(id => uniqueStopwatches.add(id));
        }
      }

      return {
        totalMemberships,
        groupsWithMembers,
        stopwatchesWithGroups: uniqueStopwatches.size
      };
    } catch (error) {
      console.error('Error getting membership stats:', error);
      return {
        totalMemberships: 0,
        groupsWithMembers: 0,
        stopwatchesWithGroups: 0
      };
    }
  }
}