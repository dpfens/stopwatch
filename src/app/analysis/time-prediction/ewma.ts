/**
 * Exponentially Weighted Moving Average (EWMA) Strategy
 * 
 * Tier 1 strategy - robust, minimal assumptions, works with as few as 2 observations.
 * 
 * Emphasizes recent performance over historical data, which is typically most
 * predictive in athletic/stopwatch contexts where fatigue and conditions change.
 */

import { PredictionResult } from '../../models/sequence/analysis/strategy';
import { WeightFunction } from './interface';
import { BaseCastingStrategy, BaseStrategyConfig } from './base';
import { exponentialDecayWeight, uniformWeight } from './functions';
import { mean, weightedMean, weightedVariance, computeWeights } from './statistics';

export interface EWMAConfig extends BaseStrategyConfig {
    /**
     * Smoothing factor (0 < alpha ≤ 1).
     * Higher values give more weight to recent observations.
     * Default: 0.3
     */
    alpha?: number;
    
    /**
     * Whether to use adaptive alpha based on variance.
     * When enabled, alpha adjusts based on recent prediction errors.
     * Default: false
     */
    adaptive?: boolean;
    
    /**
     * Custom weight function. If provided, overrides alpha.
     * Allows for arbitrary weighting schemes.
     */
    weightFunction?: WeightFunction;
}

export class EWMAStrategy extends BaseCastingStrategy {
    public readonly name = 'EWMA';
    
    private readonly alpha: number;
    private readonly adaptive: boolean;
    private readonly weightFunction: WeightFunction;
    
    constructor(config: EWMAConfig = {}) {
        super({ ...config, minObservations: 2 });
        
        this.alpha = config.alpha ?? 0.3;
        this.adaptive = config.adaptive ?? false;
        
        if (this.alpha <= 0 || this.alpha > 1) {
            throw new Error('Alpha must be in (0, 1]');
        }
        
        // Use custom weight function if provided, otherwise derive from alpha
        this.weightFunction = config.weightFunction ?? exponentialDecayWeight(this.alpha);
    }
    
    public predictTime(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetDistance: number
    ): PredictionResult {
        this.validateInputs(elapsedTimes, elapsedDistances);
        
        // Compute segment paces
        const paces = this.computeSegmentPaces(elapsedTimes, elapsedDistances);
        const { segmentDistances } = this.toSegments(elapsedTimes, elapsedDistances);
        
        // Compute weights
        const n = paces.length;
        const weights = computeWeights(n, this.weightFunction);
        
        // Possibly adjust alpha adaptively
        const effectiveWeights = this.adaptive 
            ? this.computeAdaptiveWeights(paces, weights)
            : weights;
        
        // Compute weighted average pace
        const ewmaPace = weightedMean(paces, effectiveWeights);
        
        // Predict time for target distance
        const predicted = ewmaPace * targetDistance;
        
        // Compute prediction uncertainty
        const se = this.computePredictionSE(
            paces,
            segmentDistances,
            effectiveWeights,
            targetDistance
        );
        
        return this.buildPredictionResult(predicted, se, n - 1);
    }
    
    public override predictDistance(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetTime: number
    ): PredictionResult {
        this.validateInputs(elapsedTimes, elapsedDistances);
        
        // Compute segment speeds (inverse of paces)
        const speeds = this.computeSegmentSpeeds(elapsedTimes, elapsedDistances);
        const { segmentTimes } = this.toSegments(elapsedTimes, elapsedDistances);
        
        // Filter out infinite speeds
        const validSpeeds: number[] = [];
        const validTimes: number[] = [];
        for (let i = 0; i < speeds.length; i++) {
            if (isFinite(speeds[i])) {
                validSpeeds.push(speeds[i]);
                validTimes.push(segmentTimes[i]);
            }
        }
        
        if (validSpeeds.length < this.minObservations) {
            return this.naiveDistancePrediction(elapsedTimes, elapsedDistances, targetTime);
        }
        
        // Compute weights
        const n = validSpeeds.length;
        const weights = computeWeights(n, this.weightFunction);
        
        // Compute weighted average speed
        const ewmaSpeed = weightedMean(validSpeeds, weights);
        
        // Predict distance for target time
        const predicted = ewmaSpeed * targetTime;
        
        // Compute prediction uncertainty
        const speedVariance = weightedVariance(validSpeeds, weights);
        const se = Math.sqrt(speedVariance) * targetTime;
        
        return this.buildPredictionResult(predicted, se, n - 1);
    }
    
    /**
     * Compute adaptive weights based on recent prediction errors.
     * When recent predictions have high error, trust recent data more (higher alpha).
     */
    private computeAdaptiveWeights(
        paces: number[],
        baseWeights: number[]
    ): number[] {
        if (paces.length < 3) {
            return baseWeights;
        }
        
        // Compute one-step-ahead prediction errors
        const errors: number[] = [];
        for (let i = 1; i < paces.length; i++) {
            // Predicted using EWMA up to i-1
            const subPaces = paces.slice(0, i);
            const subWeights = computeWeights(i, this.weightFunction);
            const predicted = weightedMean(subPaces, subWeights);
            errors.push(Math.abs(paces[i] - predicted) / predicted);
        }
        
        // Average recent error
        const recentErrorCount = Math.min(3, errors.length);
        const recentErrors = errors.slice(-recentErrorCount);
        const avgError = mean(recentErrors);
        
        // Adjust alpha based on error magnitude
        // Higher error → higher alpha (trust recent more)
        const errorAdjustment = Math.min(1, avgError * 2);
        const adaptedAlpha = Math.min(1, this.alpha + errorAdjustment * (1 - this.alpha));
        
        // Recompute weights with adapted alpha
        const adaptedWeightFn = exponentialDecayWeight(adaptedAlpha);
        return computeWeights(paces.length, adaptedWeightFn);
    }
    
    /**
     * Compute standard error for the prediction.
     */
    private computePredictionSE(
        paces: number[],
        segmentDistances: number[],
        weights: number[],
        targetDistance: number
    ): number {
        // Weighted variance of paces
        const paceVariance = weightedVariance(paces, weights);
        
        // Scale by target distance
        // SE = sqrt(variance) * targetDistance * sqrt(prediction variance factor)
        const paceStd = Math.sqrt(paceVariance);
        
        // Prediction variance increases with extrapolation
        const totalObservedDistance = segmentDistances.reduce((a, b) => a + b, 0);
        const extrapolationFactor = targetDistance > totalObservedDistance
            ? Math.sqrt(1 + (targetDistance - totalObservedDistance) / totalObservedDistance)
            : 1;
        
        return paceStd * targetDistance * extrapolationFactor;
    }
    
    /**
     * Naive distance prediction fallback.
     */
    private naiveDistancePrediction(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetTime: number
    ): PredictionResult {
        const lastTime = elapsedTimes[elapsedTimes.length - 1];
        const lastDistance = elapsedDistances[elapsedDistances.length - 1];
        const avgSpeed = lastDistance / lastTime;
        
        const predicted = avgSpeed * targetTime;
        const se = predicted * 0.1; // 10% uncertainty
        
        return this.buildPredictionResult(predicted, se, elapsedTimes.length - 1);
    }
}

/**
 * Factory function for creating EWMA strategy with common configurations.
 */
export const createEWMAStrategy = {
    /**
     * Default configuration, good for most cases.
     */
    default: () => new EWMAStrategy(),
    
    /**
     * High responsiveness - prioritizes very recent observations.
     */
    highResponsiveness: () => new EWMAStrategy({ alpha: 0.5 }),
    
    /**
     * Smooth - reduces noise by averaging more history.
     */
    smooth: () => new EWMAStrategy({ alpha: 0.15 }),
    
    /**
     * Adaptive - automatically adjusts based on prediction accuracy.
     */
    adaptive: () => new EWMAStrategy({ adaptive: true }),
    
    /**
     * Custom configuration.
     */
    custom: (config: EWMAConfig) => new EWMAStrategy(config)
};