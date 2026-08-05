import { Injectable, inject } from '@angular/core';
import { ContextualStopwatchEntity, StopWatchEventType, UnitValue } from '../../../models/sequence/interfaces';
import { StopwatchService } from '../stopwatch.service';
import { TZDate } from '../../../models/date';
import { StopwatchStateController } from '../../../controllers/stopwatch/stopwatch-state-controller';
import { GroupService } from '../../group/group.service';

export interface BulkOperationResult {
  successful: ContextualStopwatchEntity[];
  failed: Array<{ stopwatch: ContextualStopwatchEntity; error: string }>;
  totalCount: number;
  successCount: number;
  failureCount: number;
}

export interface BulkEventOptions {
  eventType: StopWatchEventType;
  eventName?: string;
  unit?: UnitValue;
  description?: string;
}

/**
 * Service for performing bulk operations on multiple stopwatches
 */
@Injectable({
  providedIn: 'root'
})
export class StopwatchBulkOperationsService {
  private readonly stopwatchService = inject(StopwatchService);
  private readonly groupService = inject(GroupService);

  /**
   * Starts all provided stopwatches that are not currently running
   */
  async startAll(stopwatches: ContextualStopwatchEntity[]): Promise<BulkOperationResult> {
    const timestamp = new Date();
    
    return this.performBulkOperation(
      stopwatches,
      async (stopwatch) => {
        const controller = new StopwatchStateController(stopwatch.state);
        
        // Only start if not already running
        if (!controller.isRunning()) {
          controller.start(timestamp);
          
          // Update metadata
          const updatedStopwatch = {
            ...stopwatch,
            state: controller.getState(),
            metadata: {
              ...stopwatch.metadata,
              lastModification: { timestamp: TZDate.now() }
            }
          };
          
          await this.stopwatchService.update(updatedStopwatch);
          return updatedStopwatch;
        }
        
        throw new Error('Stopwatch is already running');
      }
    );
  }

  /**
   * Stops all provided stopwatches that are currently running
   */
  async stopAll(stopwatches: ContextualStopwatchEntity[]): Promise<BulkOperationResult> {
    const timestamp = new Date();
    
    return this.performBulkOperation(
      stopwatches,
      async (stopwatch) => {
        const controller = new StopwatchStateController(stopwatch.state);
        
        // Only stop if currently running
        if (controller.isRunning()) {
          controller.stop(timestamp);
          
          const updatedStopwatch = {
            ...stopwatch,
            state: controller.getState(),
            metadata: {
              ...stopwatch.metadata,
              lastModification: { timestamp: TZDate.now() }
            }
          };
          
          await this.stopwatchService.update(updatedStopwatch);
          return updatedStopwatch;
        }
        
        throw new Error('Stopwatch is not running');
      }
    );
  }

  /**
   * Resumes all provided stopwatches that are stopped
   */
  async resumeAll(stopwatches: ContextualStopwatchEntity[]): Promise<BulkOperationResult> {
    const timestamp = new Date();
    
    return this.performBulkOperation(
      stopwatches,
      async (stopwatch) => {
        const controller = new StopwatchStateController(stopwatch.state);
        
        if (!controller.isRunning() && controller.isActive()) {
          controller.resume(timestamp);
          
          const updatedStopwatch = {
            ...stopwatch,
            state: controller.getState(),
            metadata: {
              ...stopwatch.metadata,
              lastModification: { timestamp: TZDate.now() }
            }
          };
          
          await this.stopwatchService.update(updatedStopwatch);
          return updatedStopwatch;
        }
        
        throw new Error('Stopwatch cannot be resumed (not stopped or never started)');
      }
    );
  }

  /**
   * Resets all provided stopwatches that are active
   */
  async resetAll(stopwatches: ContextualStopwatchEntity[]): Promise<BulkOperationResult> {
    const timestamp = new Date();
    
    return this.performBulkOperation(
      stopwatches,
      async (stopwatch) => {
        const controller = new StopwatchStateController(stopwatch.state);
        
        if (controller.isActive()) {
          controller.reset(timestamp);
          
          const updatedStopwatch = {
            ...stopwatch,
            state: controller.getState(),
            metadata: {
              ...stopwatch.metadata,
              lastModification: { timestamp: TZDate.now() }
            }
          };
          
          await this.stopwatchService.update(updatedStopwatch);
          return updatedStopwatch;
        }
        
        throw new Error('Stopwatch is not active');
      }
    );
  }

  /**
   * Adds an event to all running stopwatches
   */
  async addEventToAll(
    stopwatches: ContextualStopwatchEntity[], 
    options: BulkEventOptions
  ): Promise<BulkOperationResult> {
    const timestamp = new Date();
    
    return this.performBulkOperation(
      stopwatches,
      async (stopwatch) => {
        const controller = new StopwatchStateController(stopwatch.state);
        
        // For splits and laps, only add to running stopwatches
        if (['split', 'lap'].includes(options.eventType) && !controller.isRunning()) {
          throw new Error(`Cannot add ${options.eventType}: stopwatch is not running`);
        }

        // For laps, ensure stopwatch has lap configuration
        if (options.eventType === 'lap' && !stopwatch.state.lap) {
          throw new Error('Cannot add lap: stopwatch has no lap configuration');
        }
        
        const eventName = options.eventName || this.generateEventName(options.eventType, stopwatch);
        
        controller.addEvent(
          options.eventType,
          eventName,
          timestamp,
          options.description,
          options.unit
        );

        // For lap events, set the unit based on lap configuration
        if (options.eventType === 'lap' && stopwatch.state.lap) {
          const state = controller.getState();
          const lapEvents = state.sequence.filter(e => e.type === 'lap');
          const lastLapEvent = lapEvents[lapEvents.length - 1];
          
          if (lastLapEvent) {
            lastLapEvent.unit = {
              value: stopwatch.state.lap.value * lapEvents.length,
              unit: stopwatch.state.lap.unit
            };
          }
        }
        
        const updatedStopwatch = {
          ...stopwatch,
          state: controller.getState(),
          metadata: {
            ...stopwatch.metadata,
            lastModification: { timestamp: TZDate.now() }
          }
        };
        
        await this.stopwatchService.update(updatedStopwatch);
        return updatedStopwatch;
      }
    );
  }

  /**
   * Convenience method for adding splits to all running stopwatches
   */
  async splitAll(stopwatches: ContextualStopwatchEntity[]): Promise<BulkOperationResult> {
    return this.addEventToAll(stopwatches, { eventType: 'split' });
  }

  /**
   * Convenience method for adding laps to all running stopwatches
   */
  async lapAll(stopwatches: ContextualStopwatchEntity[]): Promise<BulkOperationResult> {
    return this.addEventToAll(stopwatches, { eventType: 'lap' });
  }

  /**
   * Deletes all selected stopwatches
   */
  async deleteAll(stopwatches: ContextualStopwatchEntity[]): Promise<BulkOperationResult> {
    return this.performBulkOperation(
      stopwatches,
      async (stopwatch) => {
        await this.stopwatchService.delete(stopwatch.id);
        return stopwatch;
      }
    );
  }

  /**
   * Duplicates/forks all selected stopwatches
   */
  async forkAll(stopwatches: ContextualStopwatchEntity[]): Promise<BulkOperationResult> {

    return this.performBulkOperation(
      stopwatches,
      async (stopwatch) => {
        const controller = new StopwatchStateController(stopwatch.state);
        
        const newInstance = {
          ...stopwatch,
          id: crypto.randomUUID(),
          annotation: {
            ...stopwatch.annotation,
            title: `${stopwatch.annotation.title} (Copy)`
          },
          state: controller.getState(),
          metadata: {
            ...stopwatch.metadata,
            creation: { timestamp: TZDate.now() },
            lastModification: { timestamp: TZDate.now() },
            clone: { source: stopwatch.id }
          }
        };
        
        const created = await this.stopwatchService.create(newInstance);
        if (!created) {
          throw new Error('Failed to create duplicate');
        }
        await Promise.all(
          stopwatch.groups.map(g => this.groupService.addMember(g.id, newInstance.id))
        );
        
        return created;
      }
    );
  }

  /**
   * Generic method for performing bulk operations with error handling
   */
  private async performBulkOperation(
    stopwatches: ContextualStopwatchEntity[],
    operation: (stopwatch: ContextualStopwatchEntity) => Promise<ContextualStopwatchEntity>
  ): Promise<BulkOperationResult> {
    const results: BulkOperationResult = {
      successful: [],
      failed: [],
      totalCount: stopwatches.length,
      successCount: 0,
      failureCount: 0
    };

    // Execute operations in parallel for better performance
    const promises = stopwatches.map(async (stopwatch) => {
      try {
        const result = await operation(stopwatch);
        results.successful.push(result);
        results.successCount++;
      } catch (error) {
        results.failed.push({
          stopwatch,
          error: error instanceof Error ? error.message : String(error)
        });
        results.failureCount++;
      }
    });

    await Promise.allSettled(promises);
    
    return results;
  }

  /**
   * Generates a default event name for bulk operations
   */
  private generateEventName(eventType: StopWatchEventType, stopwatch: ContextualStopwatchEntity): string {
    const controller = new StopwatchStateController(stopwatch.state);
    const existingEvents = controller.getEvents(eventType).length;
    return `${eventType} #${existingEvents + 1}`;
  }

  /**
   * Gets summary statistics for selected stopwatches
   */
  getSelectionSummary(stopwatches: ContextualStopwatchEntity[]): {
    total: number;
    running: number;
    stopped: number;
    inactive: number;
    hasLapConfig: number;
  } {
    return {
      total: stopwatches.length,
      running: stopwatches.filter(sw => this.stopwatchService.isStopwatchRunning(sw)).length,
      stopped: stopwatches.filter(sw => this.stopwatchService.isStopwatchStopped(sw)).length,
      inactive: stopwatches.filter(sw => !this.stopwatchService.isStopwatchActive(sw)).length,
      hasLapConfig: stopwatches.filter(sw => !!sw.state.lap).length
    };
  }

  // Computed command availability based on selected stopwatches
  canStartAny = (instances: ContextualStopwatchEntity[]) => {
    return instances.length > 0 && instances.some(sw => !this.stopwatchService.isStopwatchActive(sw));
  }

  canStartAll = (instances: ContextualStopwatchEntity[]) => {
    return instances.length > 0 && instances.every(sw => !this.stopwatchService.isStopwatchActive(sw));
  }
  
  // Stop actions
  canStopAny = (instances: ContextualStopwatchEntity[]) => {
    return instances.length > 0 && instances.some(sw => this.stopwatchService.isStopwatchRunning(sw));
  }

  canStopAll = (instances: ContextualStopwatchEntity[]) => {
    return instances.length > 0 && instances.every(sw => this.stopwatchService.isStopwatchRunning(sw));
  }

  // Resume actions
  canResumeAny = (instances: ContextualStopwatchEntity[]) => {
    return instances.length > 0 && instances.some(sw => this.stopwatchService.isStopwatchStopped(sw));
  }

  canResumeAll = (instances: ContextualStopwatchEntity[]) => {
    return instances.length > 0 && instances.every(sw => this.stopwatchService.isStopwatchStopped(sw));
  }

  // Reset actions
  canResetAny = (instances: ContextualStopwatchEntity[]) => {
    return instances.length > 0 && instances.some(sw => this.stopwatchService.isStopwatchActive(sw));
  }

  canResetAll = (instances: ContextualStopwatchEntity[]) => {
    return instances.length > 0 && instances.every(sw => this.stopwatchService.isStopwatchActive(sw));
  }

  // Split actions
  canSplitAny = (instances: ContextualStopwatchEntity[]) => {
    return instances.length > 0 && instances.some(sw => this.stopwatchService.isStopwatchRunning(sw));
  }

  canSplitAll = (instances: ContextualStopwatchEntity[]) => {
    return instances.length > 0 && instances.every(sw => this.stopwatchService.isStopwatchRunning(sw));
  }

  // Lap actions
  canLapAny = (instances: ContextualStopwatchEntity[]) => {
    return instances.length > 0 && 
          instances.some(sw => this.stopwatchService.isStopwatchRunning(sw) && !!sw.state.lap);
  }

  canLapAll = (instances: ContextualStopwatchEntity[]) => {
    return instances.length > 0 && 
          instances.every(sw => this.stopwatchService.isStopwatchRunning(sw) && !!sw.state.lap);
  }
}