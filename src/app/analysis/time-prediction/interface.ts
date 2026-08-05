/**
 * Core interfaces for time and distance casting (forecasting/nowcasting) strategies.
 * 
 * Design principles:
 * - Stateless functional signatures for core prediction
 * - Confidence intervals are first-class citizens
 * - Strategies can be composed and adapted
 */

import { PredictionResult } from "../../models/sequence/analysis/strategy";


/**
 * Diagnostic information about the prediction process.
 * Strategies may include additional fields beyond these.
 */
export interface PredictionDiagnostics {
    /** Number of data points used */
    sampleSize: number;
    /** Strategy-specific metadata */
    metadata?: Record<string, unknown>;
}

export interface PredictionResultWithDiagnostics extends PredictionResult {
    diagnostics: PredictionDiagnostics;
}

/**
 * Time-based prediction: Given elapsed times and distances, predict time at a target distance.
 */
export interface TimeCastingStrategy {
    /**
     * Predict the time to reach a target distance.
     * 
     * @param elapsedTimes - Cumulative elapsed times at each measurement point (ms)
     * @param elapsedDistances - Cumulative distances at each measurement point
     * @param targetDistance - The distance to predict time for
     * @returns Predicted time and confidence interval
     */
    predict(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetDistance: number
    ): PredictionResult;
    
    /** Human-readable name of the strategy */
    readonly name: string;
}

/**
 * Distance-based prediction: Given elapsed times and distances, predict distance at a target time.
 */
export interface DistanceCastingStrategy {
    /**
     * Predict the distance reached at a target time.
     * 
     * @param elapsedTimes - Cumulative elapsed times at each measurement point (ms)
     * @param elapsedDistances - Cumulative distances at each measurement point
     * @param targetTime - The time to predict distance for (ms)
     * @returns Predicted distance and confidence interval
     */
    predict(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetTime: number
    ): PredictionResult;
    
    /** Human-readable name of the strategy */
    readonly name: string;
}

/**
 * A strategy that can provide both time and distance predictions.
 */
export interface BidirectionalCastingStrategy extends TimeCastingStrategy, DistanceCastingStrategy {
    predictTime(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetDistance: number
    ): PredictionResult;
    
    predictDistance(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetTime: number
    ): PredictionResult;
}

/**
 * Configuration for strategies that support recency weighting.
 */
export interface RecencyWeightingConfig {
    enabled: boolean;
    /** Function that computes weight for observation at index i given total n observations */
    weightFunction: WeightFunction;
}

/**
 * A function that computes observation weights.
 * @param index - The index of the observation (0 = oldest)
 * @param total - Total number of observations
 * @returns Weight for this observation (should be positive)
 */
export type WeightFunction = (index: number, total: number) => number;

/**
 * Result of model fitting, used internally by strategies.
 */
export interface FitResult {
    /** Coefficients of the fitted model */
    coefficients: number[];
    /** Residual sum of squares */
    rss: number;
    /** Degrees of freedom */
    df: number;
    /** R-squared value */
    rSquared: number;
    /** Standard error of the estimate */
    standardError: number;
}

/**
 * Result of model selection when comparing multiple models.
 */
export interface ModelSelectionResult<T extends string = string> {
    /** The selected model identifier */
    selected: T;
    /** Scores for all candidate models (lower is better for information criteria) */
    scores: Record<T, number>;
    /** The criterion used for selection */
    criterion: string;
}