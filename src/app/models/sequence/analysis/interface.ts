/**
 * ANALYSIS ARCHITECTURE MENTAL MODEL:
 * 
 * 
 * DATA = "WHAT?" 
 *     The analytical findings from examining that evidence
 *     Statistical results + render-ready summaries
 *     Examples: "2.3σ anomaly, severe", "declining -5%/session", "threshold breached 3x"
 * 
 * INSIGHT = "SO WHAT?" 
 *     User-facing interpretation of the analytical data
 *     Contextual, actionable, audience-specific
 *     Examples: "You're slowing down - try pacing", "Great improvement!", "Alert: SLA breach"
 */
import { Annotatable, BaseCreationModificationDates, PerformanceMonitoringStopWatchEventType, StopwatchAnalyticsTrait, TimeStampRange, UniqueIdentifier, UniquelyIdentifiable, UnitValue } from "../interfaces";

export interface SplitDistancePredictor {
    /**
     * Predicts the next split distance based on recorded split distances.
     * @param splitDistances - Array of recorded split distances in order
     * @param lapDistance - Optional known lap distance
     * @param options - Sepcify either the max number of split to predict, or the maxDistance to predict out
     * @returns Predicted split distances, or an empty array if prediction isn't possible
     */
    predict(
        splitDistances: number[], 
        lapDistance?: number,
        options?: { maxCount?: number; maxDistance?: number }
    ): number[];

    /**
     * Checks whether this predictor can meaningfully operate on the given data.
     * @param splitDistances - Array of recorded split distances in order
     * @param lapDistance - Optional known lap distance
     * @returns true if the predictor has enough data and required parameters
     */
    isApplicable(splitDistances: number[], lapDistance?: number): boolean;
}

export interface AnalysisResult<T extends StopwatchAnalyticsTrait> {
    trait: T;
    confidence: number;
    /**
     * DATA: "WHAT did we discover"
     * Contains the actual analytical findings (numbers, classifications, 
     * measurements) plus render-ready information for displaying to users.
     * This is the "meat" of the analysis - the computed results, statistical
     * values.
     * 
     * Examples:
     * - AnomalyData: anomalyScore=2.3, severity="high""
     * - TrendData: direction="improving", changeRate=5%, displaySummary="Getting 5% faster"
     * - ThresholdData: breachSeverity=0.8, breachCount=3, threshold exceeded by 15%
     */
    data: TraitDataMapping[T];
    metadata: BaseCreationModificationDates;
}

export interface AnomalyData {
    anomalyScore: number;
    expectedValue?: number;
    actualValue?: number;
    standardDeviations: number;
}

export interface TrendData {
    trendDirection: 'improving' | 'declining' | 'stable';
    trendStrength: number;
    changeRate?: number;
    correlation: number;
    pValue?: number;
}

export interface ThresholdData {
    threshold: {
        value: number;
        operator: 'greater' | 'less' | 'equal';
        unit?: string;
    };
    breachSeverity: number;
    breachCount: number;
}

export interface PerformanceScoreData {
    score: number;
    benchmarks?: {
        personal?: number;
        peer?: number;
        target?: number;
    };
    components: Record<string, number>; // Individual scoring factors
}

export interface StatisticalSummaryData {
    mean: number;
    median: number;
    standardDeviation: number;
    variance: number;
    min: number;
    max: number;
    quartiles: [number, number, number];
    outlierCount: number;
}

export interface ForecastData {
    predictions: {
        timeHorizon: number; // For laps: 0=current, 1=next, etc. For splits: ignored (identified by cumulativeUnit)
        eventType: PerformanceMonitoringStopWatchEventType;
        predictedDuration: number; // Cumulative time from lap start (for splits) or total lap time (for laps)
        cumulativeUnit?: UnitValue;  // Required for splits: identifies which checkpoint
        confidence: number;  // 0-1 score for this specific prediction
        confidenceInterval?: [number, number]; // lower-upper bound of predicted value
    }[];
    modelType: string;
}

export interface SmoothingData {
    smoothedValues: number[];
    algorithm: string;
    smoothingFactor: number;
}

export interface BenchmarkData {
    comparisonResults: Array<{
        benchmarkName: string;
        performanceRatio: number;
        deviation: number;
    }>;
}

export interface InterpolationData {
    interpolatedPoints: Array<{
        timestamp: number;
        value: number;
        confidence: number;
    }>;
    method: string;
}

export interface SeasonalityData {
    patterns: Array<{
        period: number; // in time units
        strength: number;
        phase: number;
    }>;
    dominantPeriod?: number;
}

export interface TraitDataMapping {
    'anomaly-detection': AnomalyData;
    'trend-analysis': TrendData;
    'threshold-alerting': ThresholdData;
    'performance-scoring': PerformanceScoreData;
    'statistical-summary': StatisticalSummaryData;
    'forecasting': ForecastData;
    'smoothing': SmoothingData;
    'benchmark-comparison': BenchmarkData;
    'interpolation': InterpolationData;
    'seasonality-detection': SeasonalityData;
}

export type AnomalyResult = AnalysisResult<'anomaly-detection'>;
export type TrendResult = AnalysisResult<'trend-analysis'>;
export type ThresholdResult = AnalysisResult<'threshold-alerting'>;
export type PerformanceScoreResult = AnalysisResult<'performance-scoring'>;
export type StatisticalSummaryResult = AnalysisResult<'statistical-summary'>;
export type ForecastResult = AnalysisResult<'forecasting'>;
export type SmoothingResult = AnalysisResult<'smoothing'>;
export type InterpolationResult = AnalysisResult<'interpolation'>;
export type SeasonalityDetectionResult = AnalysisResult<'seasonality-detection'>;


/**
 * 
 */
export interface AnalysisInsight<T extends StopwatchAnalyticsTrait> extends UniquelyIdentifiable {
    annotation: Annotatable;
    result: AnalysisResult<T>
    interpretation: {
        severity: 'low' | 'medium' | 'high';
        recommendations: string[];
        explanation: string;
        context: string; // 'coach-view', 'athlete-summary', etc.
    };
    interpreter: string; // Which interpretation strategy was used
}

// Different types of evidence that support insights
export type AnalysisEvidence = 
    | EventEvidence
    | IntervalEvidence  
    | SequenceEvidence
    | DistributedEvidence
    | AggregateEvidence;

// Points to specific events
export interface EventEvidence {
    type: 'event';
    eventIds: UniqueIdentifier[];
    context?: string; // "outlier", "threshold-breach", etc.
}

// References a time period
export interface IntervalEvidence {
    type: 'interval';
    timeRange: TimeStampRange;
    affectedEvents?: UniqueIdentifier[]; // Events within this range
    context?: string; // "trend-period", "stability-window", etc.
}

// References a sequence of events
export interface SequenceEvidence {
    type: 'sequence';
    eventSequence: UniqueIdentifier[];
    context?: string; // "declining-trend", "improvement-pattern", etc.
}

// References non-contiguous events with pattern
export interface DistributedEvidence {
    type: 'distributed';
    eventGroups: {
        pattern: string; // "every-4th", "odd-laps", "morning-sessions"
        eventIds: UniqueIdentifier[];
    }[];
}

// Applies to entire dataset or major portions
export interface AggregateEvidence {
    type: 'aggregate';
    scope: 'full-dataset' | 'recent' | 'historical';
    timeRange?: TimeStampRange;
    eventCount?: number;
}


export interface TraitEvidenceMapping {
    'anomaly-detection': EventEvidence;
    'trend-analysis': EventEvidence;
    'threshold-alerting': EventEvidence | IntervalEvidence;
    'performance-scoring': AggregateEvidence | IntervalEvidence;
    'statistical-summary': AggregateEvidence;
    'forecasting': IntervalEvidence; // The period being forecasted from
    'smoothing': IntervalEvidence | AggregateEvidence;
    'benchmark-comparison': AggregateEvidence | IntervalEvidence;
    'interpolation': SequenceEvidence; // The gaps being filled
    'seasonality-detection': AggregateEvidence;
}

export const isAnomalyResult = (result: AnalysisResult<any>): result is AnomalyResult => 
    result.trait === 'anomaly-detection';

export const isTrendResult = (result: AnalysisResult<any>): result is TrendResult => 
    result.trait === 'trend-analysis';

export const isThresholdResult = (result: AnalysisResult<any>): result is ThresholdResult => 
    result.trait === 'threshold-alerting';

export const isPerformanceScoreResult = (result: AnalysisResult<any>): result is PerformanceScoreResult => 
    result.trait == 'performance-scoring';

export const isStatisticalSummaryResult = (result: AnalysisResult<any>): result is StatisticalSummaryResult => 
    result.trait == 'statistical-summary';

export const isForecastResult = (result: AnalysisResult<any>): result is ForecastResult => 
    result.trait === 'forecasting';

export const isSmoothingResult = (result: AnalysisResult<any>): result is SmoothingResult => 
    result.trait === 'smoothing';

export const isInterpolationResult = (result: AnalysisResult<any>): result is InterpolationResult => 
    result.trait === 'interpolation';

export const isSeasonalityDetectionResult = (result: AnalysisResult<any>): result is SeasonalityDetectionResult => 
    result.trait == 'seasonality-detection';