import { TZDate } from "../../models/date";
import { 
  StopWatchEventType, 
  UnitValue, 
  IStopwatchStateController,
  StopwatchEvent,
} from "../../models/sequence/interfaces";
import { StopwatchStateController } from "./stopwatch-state-controller";

interface StopwatchCache {
  // Expensive computations that don't change until events are added
  runningIntervals?: Array<{ start: number, end: number }>;
  
  // Base values for running stopwatch (historical portion only)
  elapsedTimeUpToLastEvent?: number;
  totalDurationUpToLastEvent?: number;
  lastEventTimestamp?: TZDate;
  isCurrentlyRunning?: boolean;
  
  // Complete values for stopped stopwatch
  completeElapsedTime?: number;
  completeTotalDuration?: number;
  
  // Cache for specific event calculations (key format: "eventId1-eventId2")
  durationBetweenEvents?: Map<string, number>;
  elapsedBetweenEvents?: Map<string, number>;
  
  // Cache validation
  sequenceLength: number;
}

/**
 * Cached implementation of StopwatchStateController that optimizes repeated calculations
 * by caching results and only recalculating when events are added to the sequence.
 */
export class CachedStopwatchStateController extends StopwatchStateController implements IStopwatchStateController {
  private cache: StopwatchCache = { sequenceLength: 0 };
  
  /**
   * Clears all cached values, forcing recalculation on next access
   */
  clearCache(): void {
    this.cache = { sequenceLength: this.state.sequence.length };
  }

  /**
   * Checks if the current cache is valid based on sequence length
   */
  private isCacheValid(): boolean {
    return this.cache.sequenceLength === this.state.sequence.length;
  }

  /**
   * Invalidates cache when state changes (called after adding events)
   */
  private invalidateCache(): void {
    this.cache = { sequenceLength: -1 };
  }

  /**
   * Updates the cache with current calculations - fixed to handle edge cases properly
   */
  private updateCache(): void {
    if (this.isCacheValid()) {
      return; // Cache is already up to date
    }

    this.clearCache();
    
    const events = this.state.sequence;
    const isRunning = this.isRunning();
    
    // Cache running intervals (expensive to compute)
    this.cache.runningIntervals = super.findRunningIntervals();
    this.cache.isCurrentlyRunning = isRunning;

    if (events.length === 0) {
      return;
    }

    if (isRunning) {
      // For running stopwatch, cache the historical portion
      const lastEvent = events[events.length - 1];
      this.cache.lastEventTimestamp = lastEvent.timestamp;
      
      // Calculate elapsed time up to the last event using corrected method
      this.cache.elapsedTimeUpToLastEvent = this.calculateElapsedTimeUpToEvent(events.length - 1);
      
      // Calculate total duration up to the last event
      const firstStartEvent = events.find(event => event.type === 'start');
      if (firstStartEvent) {
        this.cache.totalDurationUpToLastEvent = lastEvent.timestamp.durationFrom(firstStartEvent.timestamp);
      } else {
        this.cache.totalDurationUpToLastEvent = 0;
      }
    } else {
      // For stopped stopwatch, cache the complete values
      this.cache.completeElapsedTime = super.getElapsedTime();
      this.cache.completeTotalDuration = super.getTotalDuration();
    }
  }

  /**
   * Calculates elapsed time up to a specific event index using a simpler, more reliable approach
   */
  private calculateElapsedTimeUpToEvent(eventIndex: number): number {
    const events = this.state.sequence;
    const targetTimestamp = events[eventIndex].timestamp;
    
    // Iterate through events up to the target, tracking active periods
    let totalTime = 0;
    let currentRunStart: TZDate | null = null;
    
    for (let i = 0; i <= eventIndex; i++) {
      const event = events[i];
      
      if (event.type === 'start' || event.type === 'resume') {
        currentRunStart = event.timestamp;
      } else if (event.type === 'stop' && currentRunStart !== null) {
        // Add the duration of this completed active period
        totalTime += event.timestamp.durationFrom(currentRunStart);
        currentRunStart = null;
      }
    }
    
    // If we're still in an active period when we reach the target event,
    // add the partial duration from the start of the period to the target timestamp
    if (currentRunStart !== null) {
      totalTime += targetTimestamp.durationFrom(currentRunStart);
    }
    
    return totalTime;
  }

  /**
   * Gets a cached duration between two events
   */
  private getCachedDurationBetweenEvents(eventId1: string | number, eventId2: string | number): number | undefined {
    if (!this.cache.durationBetweenEvents) {
      this.cache.durationBetweenEvents = new Map();
    }

    const key = `${eventId1}-${eventId2}`;
    return this.cache.durationBetweenEvents.get(key);
  }

  /**
   * Caches a duration between two events
   */
  private setCachedDurationBetweenEvents(eventId1: string | number, eventId2: string | number, duration: number): void {
    if (!this.cache.durationBetweenEvents) {
      this.cache.durationBetweenEvents = new Map();
    }

    const key = `${eventId1}-${eventId2}`;
    this.cache.durationBetweenEvents.set(key, duration);
  }

  /**
   * Gets a cached elapsed time between two events
   */
  private getCachedElapsedBetweenEvents(eventId1: string | number | null, eventId2: string | number | null): number | undefined {
    if (!this.cache.elapsedBetweenEvents) {
      this.cache.elapsedBetweenEvents = new Map();
    }

    const key = `${eventId1}-${eventId2}`;
    return this.cache.elapsedBetweenEvents.get(key);
  }

  /**
   * Caches an elapsed time between two events
   */
  private setCachedElapsedBetweenEvents(eventId1: string | number | null, eventId2: string | number | null, elapsed: number): void {
    if (!this.cache.elapsedBetweenEvents) {
      this.cache.elapsedBetweenEvents = new Map();
    }

    const key = `${eventId1}-${eventId2}`;
    this.cache.elapsedBetweenEvents.set(key, elapsed);
  }

  // Override methods that modify state to invalidate cache

  override start(timestamp: Date): void {
    super.start(timestamp);
    this.invalidateCache();
  }
  
  override stop(timestamp: Date): void {
    super.stop(timestamp);
    this.invalidateCache();
  }
  
  override reset(timestamp: Date): void {
    super.reset(timestamp);
    this.invalidateCache();
  }
  
  override resume(timestamp: Date): void {
    super.resume(timestamp);
    this.invalidateCache();
  }
  
  override addEvent(
    type: StopWatchEventType, 
    title: string, 
    timestamp: Date, 
    description: string = "", 
    unit?: UnitValue
  ): void {
    super.addEvent(type, title, timestamp, description, unit);
    this.invalidateCache();
  }

  override removeEvent(event: StopwatchEvent): void {
    super.removeEvent(event);
    this.invalidateCache();
  }

  // Override computation methods to use caching
  override getTotalDuration(): number {
    this.updateCache();

    if (!this.cache.isCurrentlyRunning) {
      // Stopwatch is stopped, return cached complete value
      return this.cache.completeTotalDuration ?? 0;
    }

    // Stopwatch is running, return cached base + current time difference
    if (this.cache.totalDurationUpToLastEvent !== undefined && this.cache.lastEventTimestamp) {
      const currentTime = new TZDate();
      const additionalTime = currentTime.durationFrom(this.cache.lastEventTimestamp);
      return this.cache.totalDurationUpToLastEvent + additionalTime;
    }

    // Fallback to parent implementation
    return super.getTotalDuration();
  }
  
  override getElapsedTime(): number {
    this.updateCache();
    if (!this.cache.isCurrentlyRunning) {
      // Stopwatch is stopped, return cached complete value
      return this.cache.completeElapsedTime ?? 0;
    }

    // Stopwatch is running, return cached base + current time difference
    if (this.cache.elapsedTimeUpToLastEvent !== undefined && this.cache.lastEventTimestamp) {
      const currentTime = new TZDate();
      const additionalTime = currentTime.durationFrom(this.cache.lastEventTimestamp);
      return this.cache.elapsedTimeUpToLastEvent + additionalTime;
    }

    // Fallback to parent implementation
    return super.getElapsedTime();
  }

  override getDurationBetweenEvents(eventId1: string | number, eventId2: string | number): number {
    // Check cache first
    const cached = this.getCachedDurationBetweenEvents(eventId1, eventId2);
    if (cached !== undefined) {
      return cached;
    }

    // Calculate and cache the result
    const result = super.getDurationBetweenEvents(eventId1, eventId2);
    if (result !== -1) {
      this.setCachedDurationBetweenEvents(eventId1, eventId2, result);
    }
    
    return result;
  }

  override getElapsedTimeBetweenEvents(startEventId: string | number | null, endEventId: string | number | null): number {
    // For specific event ranges (not involving current time), check cache
    if (startEventId !== null && endEventId !== null) {
      const cached = this.getCachedElapsedBetweenEvents(startEventId, endEventId);
      if (cached !== undefined) {
        return cached;
      }
    }

    // If asking for elapsed time from beginning to current moment and stopwatch is running,
    // use the optimized caching approach
    if (startEventId === null && endEventId === null && this.isRunning()) {
      return this.getElapsedTime();
    }

    // Calculate result using parent implementation
    const result = super.getElapsedTimeBetweenEvents(startEventId, endEventId);
    
    // Cache result only if it doesn't involve current time
    if (result !== -1 && startEventId !== null && endEventId !== null) {
      this.setCachedElapsedBetweenEvents(startEventId, endEventId, result);
    }

    return result;
  }

  /**
   * Override findRunningIntervals to use cached version
   */
  protected override findRunningIntervals(): Array<{ start: number, end: number }> {
    this.updateCache();
    return this.cache.runningIntervals ?? [];
  }

  /**
   * Gets cache statistics for debugging/monitoring
   */
  getCacheStats(): {
    isValid: boolean;
    sequenceLength: number;
    cachedIntervals: number;
    cachedDurations: number;
    cachedElapsedTimes: number;
    hasRunningCache: boolean;
    hasCompleteCache: boolean;
  } {
    return {
      isValid: this.isCacheValid(),
      sequenceLength: this.cache.sequenceLength,
      cachedIntervals: this.cache.runningIntervals?.length ?? 0,
      cachedDurations: this.cache.durationBetweenEvents?.size ?? 0,
      cachedElapsedTimes: this.cache.elapsedBetweenEvents?.size ?? 0,
      hasRunningCache: this.cache.elapsedTimeUpToLastEvent !== undefined,
      hasCompleteCache: this.cache.completeElapsedTime !== undefined
    };
  }
}