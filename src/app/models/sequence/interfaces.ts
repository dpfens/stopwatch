import { TimeZonedDate, TZDate } from "../date";

export interface ActionTracking {
    readonly timestamp: TZDate;
}

export interface SerializedActionTracking {
    readonly timestamp: TimeZonedDate;
}

export interface BaseCreationModificationDates {
    readonly creation: ActionTracking;
    lastModification: ActionTracking;
}

export interface SerializedBaseCreationModificationDates {
    readonly creation: SerializedActionTracking;
    lastModification: SerializedActionTracking;
}

interface CloneMetadata {
    source: UniqueIdentifier;
}


export interface CreationModificationDates extends BaseCreationModificationDates {
    clone?: CloneMetadata;
    finalized?: ActionTracking;
}

export interface SerializedCreationModificationDates extends SerializedBaseCreationModificationDates {
    clone?: CloneMetadata;
    finalized?: SerializedActionTracking;
}

export interface StopwatchMetadata extends CreationModificationDates {
    finalized?: ActionTracking;
}

export interface SerializedStopwatchMetadata extends SerializedCreationModificationDates {
    finalized?: SerializedActionTracking;
}


export type UniqueIdentifier = string | number;


export interface UniquelyIdentifiable {
    id: UniqueIdentifier;
}


export interface Annotatable {
    title: string;
    description: string;
}


type OperationalStopWatchEventType = 'start' | 'stop' | 'resume';
type UserOperationalStopwatchEventType = 'user_start' | 'user_stop' | 'user_resume';
export type PerformanceMonitoringStopWatchEventType = 'split' | 'lap' | 'interval';
export type StopWatchEventType = OperationalStopWatchEventType | UserOperationalStopwatchEventType | PerformanceMonitoringStopWatchEventType;

// Semantic tags for what the event represents
export type ProgressSemanticTag = 
    | 'accumulation' | 'convergence' | 'state-transition' 
    | 'saturation' | 'milestone' | 'acceleration' | 'deceleration';

export type QualitySemanticTag = 
    | 'drift' | 'equilibrium' | 'oscillation' 
    | 'variance' | 'compensation' | 'stability';

export type PerformanceSemanticTag = 
    | 'latency' | 'capacity' | 'threshold';

interface EventSemantics {
    progress?: ProgressSemanticTag[];
    quality?: QualitySemanticTag[];
    performance?: PerformanceSemanticTag[];
}


export type EventOriginationType = 'user' | 'computed';
export type EventQualification = 
    | 'actual'        // Actually happened and was captured in real-time
    | 'forecast'      // Predicted future event
    | 'interpolated'  // Estimated past event (filled a gap)
    | 'anomaly';      // Unusual/outlier event


export type StopwatchAnalyticsTrait = 
    | 'anomaly-detection'     // Flags unusual timing patterns or outliers
    | 'trend-analysis'        // Identifies patterns like negative splits or progressive improvements
    | 'interpolation'         // Fills gaps between recorded splits for incomplete data
    | 'forecasting'           // Predicts future performance based on current data
    | 'statistical-summary'   // Provides statistical insights (mean, median, variance, etc.)
    | 'threshold-alerting'    // Notifies when metrics cross defined thresholds
    | 'smoothing'             // Reduces noise in timing data to reveal underlying patterns
    | 'seasonality-detection' // Identifies cyclical patterns in recurring activities
    | 'benchmark-comparison'  // Compares performance against historical or reference data
    | 'performance-scoring';  // Generates a normalized score based on timing data

export interface AnalyticsConfiguration {
    trait: StopwatchAnalyticsTrait;
    parameters?: Record<string, unknown>; // Configurable parameters for each trait
}

export type ObjectiveType = 'unit-accumulation' | 'time-minimization' | 'synchronicity';

export interface Objective {
    /**
     * 
     */
    type: ObjectiveType;
    /**
     * Returns a human-readable name of the objective.
     */
    title: string;

    /**
     * Returns a human-readable description of the objective
     */
    description: string;
    /**
     * Evaluate a sequence of events are returns a score
     * Higher scores indicate better performance
     */
    evaluate(stopwatch: StopwatchState): number;

    /**
     * Compares two sequences of events and returns
     * positive if a is better, negative if b is better, 0 if equal
     */
    compare(a: StopwatchState, b: StopwatchState): number;
}

export interface UnitValue {
    value: number;
    unit?: string;
}

export interface TimeStampRange {
    lowerBound: TZDate;
    upperBound: TZDate;
}

export interface BaseEvent<T extends StopWatchEventType> extends UniquelyIdentifiable {
    annotation: Annotatable;
    metadata: BaseCreationModificationDates;
    type: T;
    origin: EventOriginationType;
    semantics: EventSemantics;
    qualification: EventQualification;
    unit?: UnitValue;
}

/**
 * Concrete events stored on a stopwatch
 */
export interface StopwatchEvent extends BaseEvent<StopWatchEventType> {
    timestamp: TZDate;
}

export interface SerializedStopwatchEvent extends Omit<StopwatchEvent, 'timestamp' | 'metadata'> {
    timestamp: TimeZonedDate;
    metadata: SerializedBaseCreationModificationDates;
}

export interface StopwatchState {
    sequence: StopwatchEvent[];
    lap: UnitValue | null;
}

export interface SerializedStopwatchState {
    sequence: SerializedStopwatchEvent[];
    lap?: UnitValue | null;
}

export interface BaseStopwatchEntity extends UniquelyIdentifiable {
    id: string;
    annotation: Annotatable;
    state: StopwatchState;
    metadata: StopwatchMetadata;
}

export interface StopwatchEntity extends BaseStopwatchEntity {
    objective?: Objective;
}


export interface ContextualStopwatchEntity extends StopwatchEntity {
    groups: BaseStopwatchGroup[];
}

export interface SerializedStopwatchEntity extends Omit<BaseStopwatchEntity, 'metadata' | 'analytics'> {
    objective?: {
        type: ObjectiveType;
        configuration?: Record<string, unknown>
    };
    metadata: SerializedStopwatchMetadata;
}

export type GroupTimingBehavior = 
    | 'parallel'        // Stopwatches run simultaneously (e.g., team members working on the same task)
    | 'sequential'      // Stopwatches run in a defined order (e.g., relay race or assembly line)
    | 'independent'     // No timing constraints
    | 'synchronized'    // Start/stop together
    | 'overlapping';    // Partial temporal overlap (e.g., shift handoffs)

export type GroupEvaluationBehavior =
    | 'independent'     // No relation of evaluation
    | 'comparative'     // Ranked/compared against each other
    | 'cumulative'      // Summed for totals
    | 'threshold'       // Measured against targets/SLAs
    | 'proportional'    // Analyzed as percentages of whole
    | 'trending';       // Tracked for patterns over time

export interface GroupTraits {
    timing: GroupTimingBehavior;
    evaluation: GroupEvaluationBehavior[];
    analytics: AnalyticsConfiguration[];
}

export type GroupTraitPreset = 
    | 'normal'
    | 'competition'
    | 'workflow'
    | 'billing';

export interface BaseStopwatchGroup extends UniquelyIdentifiable {
    annotation: Annotatable;
    metadata: CreationModificationDates;
    traits: GroupTraits;
}

export interface SerializedStopwatchGroup extends Omit<BaseStopwatchGroup, 'metadata'> {
    metadata: SerializedCreationModificationDates;
}

export interface StopwatchGroup extends BaseStopwatchGroup {
    members: ContextualStopwatchEntity[];
}

/**
 * Interface for group membership records
 */
export interface StopwatchGroupMembership extends UniquelyIdentifiable {
    stopwatchId: UniqueIdentifier;
    groupId: UniqueIdentifier;
}


/**
 * Interface definition for the stopwatch controller
 */
export interface IStopwatchStateController {
    // Core functionality
    start(timestamp: Date): void;
    stop(timestamp: Date): void;
    reset(timestamp: Date): void;
    resume(timestamp: Date): void;
    
    // Event management
    addEvent(type: StopWatchEventType, title: string, timestamp: Date, description?: string, unit?: UnitValue): void;
    removeEvent(event: StopwatchEvent): void;
    
    // Time measurement
    getTotalDuration(): number;         // Get total wall clock duration since first start in milliseconds
    getElapsedTime(): number;           // Get elapsed active time since start (excluding stops)
    
    // Event retrieval
    getEvents(type?: StopWatchEventType): StopwatchEvent[];
    
    // Event analysis
    getDurationBetweenEvents(eventId1: string | number, eventId2: string | number): number;                         // Wall clock time between events
    getElapsedTimeBetweenEvents(startEventId: string | number | null, endEventId: string | number | null): number;  // Active time between events
    getLastEvent(type?: StopWatchEventType): StopwatchEvent | undefined;
    getState(): StopwatchState;
    
    setLap(value: UnitValue | null): void;
    getLap(): UnitValue | null;
    
    // State information
    isRunning(): boolean;
    isActive(): boolean;
}

export interface IAnnotatableController {
    getAnnotation(): Annotatable;
    updateAnnotation(title: string, description: string): void;
}

export interface IContextualStopwatchController extends IAnnotatableController {
    // Metadata
    getMetadata(): CreationModificationDates;
    
    // Objective handling
    setObjective(objective: Objective): void;
    getObjective(): Objective | undefined;
    evaluatePerformance(): number | undefined;
}

export interface SelectOption<T> {
  value: T;
  display: string;
  description?: string;
}

export interface SelectOptGroup<T> {
    display: string;
    options: SelectOption<T>[];
}

export interface VisibleSplit {
    duration: Intl.Duration;
    event: StopwatchEvent;
    unit?: UnitValue;
    difference?: number; // Difference from previous lap in milliseconds
}
