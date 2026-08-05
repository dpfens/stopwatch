import { DestroyRef, inject, Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { UniqueIdentifier } from '../../models/sequence/interfaces';

/**
 * Supported entity types for synchronization events.
 */
export type SyncEntityType = 'group' | 'stopwatch' | 'membership';

/**
 * Supported action types for synchronization events.
 */
export type SyncActionType = 'updated' | 'deleted' | 'changed';

/**
 * Base interface for all synchronization events.
 */
interface BaseSyncEvent {
  /** The type of entity that was modified */
  entity: SyncEntityType;
  /** The action that was performed on the entity */
  action: SyncActionType;
  /** Optional additional data for the event */
  data?: any;
}

/**
 * Event emitted when a group is updated or deleted.
 */
export interface GroupSyncEvent extends BaseSyncEvent {
  entity: 'group';
  action: 'updated' | 'deleted';
  /** The unique identifier of the affected group */
  groupId: UniqueIdentifier;
}

/**
 * Event emitted when a stopwatch is updated or deleted.
 */
export interface StopwatchSyncEvent extends BaseSyncEvent {
  entity: 'stopwatch';
  action: 'updated' | 'deleted';
  /** The unique identifier of the affected stopwatch */
  stopwatchId: UniqueIdentifier;
}

/**
 * Event emitted when group membership changes (add/remove member).
 */
export interface MembershipSyncEvent extends BaseSyncEvent {
  entity: 'membership';
  action: 'changed';
  /** The unique identifier of the affected group */
  groupId: UniqueIdentifier;
  /** The unique identifier of the affected stopwatch */
  stopwatchId: UniqueIdentifier;
}

/**
 * Union type of all possible synchronization events.
 * 
 * This discriminated union provides strong typing and IntelliSense support
 * when handling different event types.
 */
export type SyncEvent = GroupSyncEvent | StopwatchSyncEvent | MembershipSyncEvent;

/**
 * Service responsible for coordinating data synchronization between related services.
 * 
 * This service implements an event-driven architecture pattern to prevent tight coupling
 * between services that manage related data. Events are strongly typed using discriminated
 * unions to provide better developer experience and type safety.
 * 
 * @example
 * ```typescript
 * // Strongly typed event handling
 * this.syncService.events$.subscribe(event => {
 *   switch (event.entity) {
 *     case 'group':
 *       // TypeScript knows this has groupId and action is 'updated' | 'deleted'
 *       if (event.action === 'updated') {
 *         this.refreshGroup(event.groupId);
 *       }
 *       break;
 *     case 'stopwatch':
 *       // TypeScript knows this has stopwatchId
 *       this.refreshStopwatchGroups(event.stopwatchId);
 *       break;
 *     case 'membership':
 *       // TypeScript knows this has both groupId and stopwatchId
 *       this.refreshMembership(event.groupId, event.stopwatchId);
 *       break;
 *   }
 * });
 * ```
 * 
 * @public
 */
@Injectable({
  providedIn: 'root'
})
export class SynchronizationService {
  /** Internal subject for emitting synchronization events */
  private eventSubject = new Subject<SyncEvent>();
  
  /** Observable stream of synchronization events that services can subscribe to */
  events$ = this.eventSubject.asObservable();
  
  /** Angular DestroyRef for proper cleanup */
  private destroyRef = inject(DestroyRef);
  
  /**
   * Initializes the synchronization service and sets up proper cleanup.
   */
  constructor() {
    // Clean up the subject when the service is destroyed
    this.destroyRef.onDestroy(() => {
      this.eventSubject.complete();
    });
  }
  
  /**
   * Emits a synchronization event to all subscribing services.
   * 
   * This is the core method that broadcasts events across the application.
   * Services should prefer using the specific notify methods rather than
   * calling this directly for better type safety.
   * 
   * @param event - The strongly-typed synchronization event to emit
   */
  emit(event: SyncEvent): void {
    this.eventSubject.next(event);
  }
  
  /**
   * Notifies all services that a group's membership has changed.
   * 
   * This event should be emitted when:
   * - A stopwatch is added to a group
   * - A stopwatch is removed from a group
   * 
   * @param groupId - The unique identifier of the group that was modified
   * @param stopwatchId - The unique identifier of the stopwatch that was added/removed
   * @param data - Optional additional data about the membership change
   * 
   * @example
   * ```typescript
   * await this.repository.addMember(groupId, stopwatchId);
   * this.syncService.notifyGroupMembershipChanged(groupId, stopwatchId);
   * ```
   */
  notifyGroupMembershipChanged(
    groupId: UniqueIdentifier, 
    stopwatchId: UniqueIdentifier,
    data?: any
  ): void {
    this.emit({
      entity: 'membership',
      action: 'changed',
      groupId,
      stopwatchId,
      data
    });
  }

  /**
   * Notifies all services that a group has been updated.
   * 
   * This event should be emitted when group properties are modified
   * (excluding membership changes, which have their own event type).
   * 
   * @param groupId - The unique identifier of the group that was updated
   * @param data - Optional additional data about what was updated
   * 
   * @example
   * ```typescript
   * await this.repository.update(updatedGroup);
   * this.syncService.notifyGroupUpdated(groupId, { traits: updatedTraits });
   * ```
   */
  notifyGroupUpdated(groupId: UniqueIdentifier, data?: any): void {
    this.emit({
      entity: 'group',
      action: 'updated',
      groupId,
      data
    });
  }
  
  /**
   * Notifies all services that a group has been deleted.
   * 
   * Services should listen for this event to clean up group references
   * and update their UI accordingly.
   * 
   * @param groupId - The unique identifier of the group that was deleted
   * @param data - Optional additional data about the deletion
   * 
   * @example
   * ```typescript
   * await this.repository.delete(groupId);
   * this.syncService.notifyGroupDeleted(groupId);
   * ```
   */
  notifyGroupDeleted(groupId: UniqueIdentifier, data?: any): void {
    this.emit({
      entity: 'group',
      action: 'deleted',
      groupId,
      data
    });
  }
  
  /**
   * Notifies all services that a stopwatch has been updated.
   * 
   * Services managing groups containing this stopwatch should refresh
   * their member data in response to this event.
   * 
   * @param stopwatchId - The unique identifier of the stopwatch that was updated
   * @param data - Optional additional data about what was updated
   * 
   * @example
   * ```typescript
   * await this.repository.update(updatedStopwatch);
   * this.syncService.notifyStopwatchUpdated(stopwatchId, { sequence: newSequence });
   * ```
   */
  notifyStopwatchUpdated(stopwatchId: UniqueIdentifier, data?: any): void {
    this.emit({
      entity: 'stopwatch',
      action: 'updated',
      stopwatchId,
      data
    });
  }
  
  /**
   * Notifies all services that a stopwatch has been deleted.
   * 
   * This should typically be emitted BEFORE the actual deletion to allow
   * other services to perform cleanup while the stopwatch is still accessible.
   * 
   * @param stopwatchId - The unique identifier of the stopwatch that was deleted
   * @param data - Optional additional data about the deletion
   * 
   * @example
   * ```typescript
   * this.syncService.notifyStopwatchDeleted(stopwatchId);
   * await this.repository.delete(stopwatchId);
   * ```
   */
  notifyStopwatchDeleted(stopwatchId: UniqueIdentifier, data?: any): void {
    this.emit({
      entity: 'stopwatch',
      action: 'deleted',
      stopwatchId,
      data
    });
  }

  // Convenience methods for filtering events by entity type

  /**
   * Returns an observable that only emits group-related events.
   * 
   * @example
   * ```typescript
   * this.syncService.groupEvents$.subscribe(event => {
   *   // event is strongly typed as GroupSyncEvent
   *   console.log(`Group ${event.groupId} was ${event.action}`);
   * });
   * ```
   */
  get groupEvents$() {
    return this.events$.pipe(
      filter((event): event is GroupSyncEvent => event.entity === 'group')
    );
  }

  /**
   * Returns an observable that only emits stopwatch-related events.
   * 
   * @example
   * ```typescript
   * this.syncService.stopwatchEvents$.subscribe(event => {
   *   // event is strongly typed as StopwatchSyncEvent
   *   console.log(`Stopwatch ${event.stopwatchId} was ${event.action}`);
   * });
   * ```
   */
  get stopwatchEvents$() {
    return this.events$.pipe(
      filter((event): event is StopwatchSyncEvent => event.entity === 'stopwatch')
    );
  }

  /**
   * Returns an observable that only emits membership-related events.
   * 
   * @example
   * ```typescript
   * this.syncService.membershipEvents$.subscribe(event => {
   *   // event is strongly typed as MembershipSyncEvent
   *   console.log(`Membership changed: group ${event.groupId}, stopwatch ${event.stopwatchId}`);
   * });
   * ```
   */
  get membershipEvents$() {
    return this.events$.pipe(
      filter((event): event is MembershipSyncEvent => event.entity === 'membership')
    );
  }
}