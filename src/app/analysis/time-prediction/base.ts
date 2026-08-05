/**
 * Abstract base class for casting strategies.
 * 
 * Provides common validation, transformation, and utility methods
 * that strategies can leverage.
 */

import { 
    BidirectionalCastingStrategy,
    WeightFunction
} from './interface';
import { 
    TransformPair, 
    ConfidenceIntervalMethod,
    tConfidenceInterval
} from './functions';
import { 
    diff, 
    olsSimpleLinear,
    wlsSimpleLinear,
    predictionStandardError,
    weightedPredictionStandardError
} from './statistics';
import { ConfidenceInterval, PredictionResult } from '../../models/sequence/analysis/strategy';

/**
 * Configuration options common to many strategies.
 */
export interface BaseStrategyConfig {
    /** Confidence level for prediction intervals (default: 0.95) */
    confidenceLevel?: number;
    
    /** Method for computing confidence intervals */
    confidenceMethod?: ConfidenceIntervalMethod;
    
    /** Minimum number of observations required to make predictions */
    minObservations?: number;
}

/**
 * Abstract base class providing common functionality for casting strategies.
 */
export abstract class BaseCastingStrategy implements BidirectionalCastingStrategy {
    public abstract readonly name: string;
    
    protected readonly confidenceLevel: number;
    protected readonly confidenceMethod: ConfidenceIntervalMethod;
    protected readonly minObservations: number;
    
    constructor(config: BaseStrategyConfig = {}) {
        this.confidenceLevel = config.confidenceLevel ?? 0.95;
        this.confidenceMethod = config.confidenceMethod ?? tConfidenceInterval;
        this.minObservations = config.minObservations ?? 2;
    }
    
    // =========================================================================
    // INTERFACE IMPLEMENTATIONS
    // =========================================================================
    
    /**
     * Predict time at target distance (TimeCastingStrategy interface).
     */
    public predict(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetDistance: number
    ): PredictionResult {
        return this.predictTime(elapsedTimes, elapsedDistances, targetDistance);
    }
    
    /**
     * Predict time to reach a target distance.
     * Subclasses must implement this.
     */
    public abstract predictTime(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetDistance: number
    ): PredictionResult;
    
    /**
     * Predict distance at a target time.
     * Default implementation inverts the time prediction.
     * Subclasses may override for better accuracy.
     */
    public predictDistance(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetTime: number
    ): PredictionResult {
        // Default: invert by predicting time at distances and finding where targetTime falls
        return this.invertTimePrediction(elapsedTimes, elapsedDistances, targetTime);
    }
    
    // =========================================================================
    // VALIDATION HELPERS
    // =========================================================================
    
    /**
     * Validate input arrays and throw if invalid.
     */
    protected validateInputs(
        elapsedTimes: number[],
        elapsedDistances: number[]
    ): void {
        if (elapsedTimes.length !== elapsedDistances.length) {
            throw new Error('Time and distance arrays must have the same length');
        }
        
        if (elapsedTimes.length < this.minObservations) {
            throw new Error(
                `Insufficient data: need at least ${this.minObservations} observations, ` +
                `got ${elapsedTimes.length}`
            );
        }
        
        // Check for non-negative values
        for (let i = 0; i < elapsedTimes.length; i++) {
            if (elapsedTimes[i] < 0) {
                throw new Error(`Negative time at index ${i}: ${elapsedTimes[i]}`);
            }
            if (elapsedDistances[i] < 0) {
                throw new Error(`Negative distance at index ${i}: ${elapsedDistances[i]}`);
            }
        }
        
        // Check for monotonicity (cumulative values should be non-decreasing)
        for (let i = 1; i < elapsedTimes.length; i++) {
            if (elapsedTimes[i] < elapsedTimes[i - 1]) {
                throw new Error(`Times are not monotonically increasing at index ${i}`);
            }
            if (elapsedDistances[i] < elapsedDistances[i - 1]) {
                throw new Error(`Distances are not monotonically increasing at index ${i}`);
            }
        }
    }
    
    /**
     * Check if we have enough data for predictions.
     */
    protected hasEnoughData(n: number): boolean {
        return n >= this.minObservations;
    }
    
    // =========================================================================
    // DATA TRANSFORMATION HELPERS
    // =========================================================================
    
    /**
     * Convert cumulative data to segment (incremental) data.
     * Returns arrays of segment times and segment distances.
     */
    protected toSegments(
        elapsedTimes: number[],
        elapsedDistances: number[]
    ): { segmentTimes: number[]; segmentDistances: number[] } {
        return {
            segmentTimes: diff([0, ...elapsedTimes]),
            segmentDistances: diff([0, ...elapsedDistances])
        };
    }
    
    /**
     * Compute pace (time per unit distance) for each segment.
     */
    protected computeSegmentPaces(
        elapsedTimes: number[],
        elapsedDistances: number[]
    ): number[] {
        const { segmentTimes, segmentDistances } = this.toSegments(elapsedTimes, elapsedDistances);
        
        const paces: number[] = [];
        for (let i = 0; i < segmentTimes.length; i++) {
            if (segmentDistances[i] > 0) {
                paces.push(segmentTimes[i] / segmentDistances[i]);
            } else if (segmentTimes[i] === 0) {
                // Both zero - skip or use previous pace
                paces.push(paces.length > 0 ? paces[paces.length - 1] : 0);
            } else {
                // Distance is zero but time is positive - infinite pace
                paces.push(Infinity);
            }
        }
        return paces;
    }
    
    /**
     * Compute speed (distance per unit time) for each segment.
     */
    protected computeSegmentSpeeds(
        elapsedTimes: number[],
        elapsedDistances: number[]
    ): number[] {
        const { segmentTimes, segmentDistances } = this.toSegments(elapsedTimes, elapsedDistances);
        
        const speeds: number[] = [];
        for (let i = 0; i < segmentTimes.length; i++) {
            if (segmentTimes[i] > 0) {
                speeds.push(segmentDistances[i] / segmentTimes[i]);
            } else if (segmentDistances[i] === 0) {
                speeds.push(speeds.length > 0 ? speeds[speeds.length - 1] : 0);
            } else {
                speeds.push(Infinity);
            }
        }
        return speeds;
    }
    
    // =========================================================================
    // CONFIDENCE INTERVAL HELPERS
    // =========================================================================
    
    /**
     * Build a confidence interval from a point estimate and standard error.
     */
    protected buildConfidenceInterval(
        pointEstimate: number,
        standardError: number,
        degreesOfFreedom: number
    ): ConfidenceInterval {
        const { lower, upper } = this.confidenceMethod(
            pointEstimate,
            standardError,
            degreesOfFreedom,
            this.confidenceLevel
        );
        
        return {
            lowerBound: lower,
            upperBound: upper,
            confidenceLevel: this.confidenceLevel
        };
    }
    
    /**
     * Build a prediction result with properly computed confidence interval.
     */
    protected buildPredictionResult(
        pointEstimate: number,
        standardError: number,
        degreesOfFreedom: number
    ): PredictionResult {
        return {
            value: pointEstimate,
            confidence: this.buildConfidenceInterval(
                pointEstimate,
                standardError,
                degreesOfFreedom
            )
        };
    }
    
    /**
     * Transform a confidence interval using a transformation's inverse.
     * Note: This produces asymmetric intervals, which is mathematically correct.
     */
    protected transformConfidenceInterval(
        ci: ConfidenceInterval,
        transform: TransformPair
    ): ConfidenceInterval {
        return {
            lowerBound: transform.inverse(ci.lowerBound),
            upperBound: transform.inverse(ci.upperBound),
            confidenceLevel: ci.confidenceLevel
        };
    }
    
    // =========================================================================
    // REGRESSION HELPERS
    // =========================================================================
    
    /**
     * Perform simple linear regression and make a prediction.
     */
    protected linearPrediction(
        x: number[],
        y: number[],
        xNew: number,
        weights?: number[]
    ): PredictionResult {
        const fit = weights 
            ? wlsSimpleLinear(x, y, weights)
            : olsSimpleLinear(x, y);
        
        const [intercept, slope] = fit.coefficients;
        const predicted = intercept + slope * xNew;
        
        const se = weights
            ? weightedPredictionStandardError(xNew, x, weights, fit.standardError)
            : predictionStandardError(xNew, x, fit.standardError);
        
        return this.buildPredictionResult(predicted, se, fit.df);
    }
    
    /**
     * Perform linear regression in a transformed space.
     */
    protected transformedLinearPrediction(
        x: number[],
        y: number[],
        xNew: number,
        transform: TransformPair,
        weights?: number[]
    ): PredictionResult {
        // Transform y values
        const yTransformed = y.map(transform.transform);
        
        // Fit in transformed space
        const fit = weights
            ? wlsSimpleLinear(x, yTransformed, weights)
            : olsSimpleLinear(x, yTransformed);
        
        const [intercept, slope] = fit.coefficients;
        const predictedTransformed = intercept + slope * xNew;
        
        // Compute CI in transformed space
        const se = weights
            ? weightedPredictionStandardError(xNew, x, weights, fit.standardError)
            : predictionStandardError(xNew, x, fit.standardError);
        
        const ciTransformed = this.buildConfidenceInterval(
            predictedTransformed,
            se,
            fit.df
        );
        
        // Back-transform point estimate and CI
        const predicted = transform.inverse(predictedTransformed);
        const ci = this.transformConfidenceInterval(ciTransformed, transform);
        
        return {
            value: predicted,
            confidence: ci
        };
    }
    
    // =========================================================================
    // INVERSION HELPERS
    // =========================================================================
    
    /**
     * Invert a time prediction to get distance prediction.
     * Uses bisection search to find the distance where predicted time = targetTime.
     */
    protected invertTimePrediction(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetTime: number
    ): PredictionResult {
        // Use observed range to set search bounds
        const maxObservedDistance = elapsedDistances[elapsedDistances.length - 1];
        const maxObservedTime = elapsedTimes[elapsedTimes.length - 1];
        
        // Estimate search range based on average pace
        const avgPace = maxObservedTime / maxObservedDistance;
        const estimatedDistance = targetTime / avgPace;
        
        // Search bounds: expand beyond estimate to be safe
        let lowerDist = 0;
        let upperDist = Math.max(estimatedDistance * 2, maxObservedDistance * 2);
        
        // Binary search for the distance where predicted time = targetTime
        const tolerance = 0.001;
        const maxIterations = 50;
        
        for (let i = 0; i < maxIterations; i++) {
            const midDist = (lowerDist + upperDist) / 2;
            const prediction = this.predictTime(elapsedTimes, elapsedDistances, midDist);
            
            if (Math.abs(prediction.value - targetTime) < tolerance) {
                // Convert time CI to distance CI (approximately)
                const timeCIWidth = prediction.confidence.upperBound - prediction.confidence.lowerBound;
                const distCIWidth = (timeCIWidth / avgPace);
                
                return {
                    value: midDist,
                    confidence: {
                        lowerBound: midDist - distCIWidth / 2,
                        upperBound: midDist + distCIWidth / 2,
                        confidenceLevel: prediction.confidence.confidenceLevel
                    }
                };
            }
            
            if (prediction.value < targetTime) {
                lowerDist = midDist;
            } else {
                upperDist = midDist;
            }
        }
        
        // Return best estimate if convergence not achieved
        const finalDist = (lowerDist + upperDist) / 2;
        return {
            value: finalDist,
            confidence: {
                lowerBound: lowerDist,
                upperBound: upperDist,
                confidenceLevel: this.confidenceLevel
            }
        };
    }
    
    // =========================================================================
    // FALLBACK PREDICTIONS
    // =========================================================================
    
    /**
     * Simple average-based prediction as a fallback.
     */
    protected naivePrediction(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetDistance: number
    ): PredictionResult {
        const avgPace = elapsedTimes[elapsedTimes.length - 1] / 
                        elapsedDistances[elapsedDistances.length - 1];
        
        const predicted = avgPace * targetDistance;
        
        // Use standard deviation of segment paces for uncertainty
        const paces = this.computeSegmentPaces(elapsedTimes, elapsedDistances);
        const paceStd = paces.length > 1 
            ? Math.sqrt(paces.reduce((sum, p) => sum + (p - avgPace) ** 2, 0) / (paces.length - 1))
            : avgPace * 0.1; // Default 10% uncertainty
        
        const se = paceStd * targetDistance;
        
        return this.buildPredictionResult(predicted, se, paces.length - 1);
    }
}

/**
 * Mixin type for strategies that support weighted observations.
 */
export interface WeightedStrategyMixin {
    readonly weightFunction: WeightFunction;
}

/**
 * Mixin type for strategies that use transformations.
 */
export interface TransformableStrategyMixin {
    readonly transform: TransformPair;
}