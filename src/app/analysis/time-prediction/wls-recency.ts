/**
 * Weighted Least Squares (WLS) with Recency Decay Strategy
 * 
 * Tier 1 strategy - combines trend detection of regression with
 * recency emphasis. More recent segments contribute more to the fit.
 * 
 * Addresses the limitation of OLS which weights all observations equally,
 * even when recent performance is more predictive.
 */
import { PredictionResult } from '../../models/sequence/analysis/strategy';
import { WeightFunction } from './interface';
import { BaseCastingStrategy, BaseStrategyConfig } from './base';
import { 
    exponentialDecayWeight, 
    linearDecayWeight, 
    inverseDecayWeight
} from './functions';
import { 
    wlsSimpleLinear, 
    weightedPredictionStandardError, 
    mean, 
    computeWeights 
} from './statistics';

export interface WLSRecencyConfig extends BaseStrategyConfig {
    /**
     * Weight function for observations.
     * Determines how much each observation contributes to the fit.
     * Default: exponentialDecayWeight(0.8)
     */
    weightFunction?: WeightFunction;
    
    /**
     * Minimum weight for the oldest observation (relative to newest).
     * Prevents complete dismissal of historical data.
     * Default: 0.1
     */
    minWeight?: number;
    
    /**
     * Feature space for regression (same as OLS).
     * Default: 'index'
     */
    featureSpace?: 'index' | 'cumulative-distance' | 'cumulative-time';
}

export class WLSRecencyStrategy extends BaseCastingStrategy {
    public readonly name = 'WLS-Recency';
    
    private readonly weightFunction: WeightFunction;
    private readonly minWeight: number;
    private readonly featureSpace: 'index' | 'cumulative-distance' | 'cumulative-time';
    
    constructor(config: WLSRecencyConfig = {}) {
        super({ ...config, minObservations: 3 });
        
        this.minWeight = config.minWeight ?? 0.1;
        this.featureSpace = config.featureSpace ?? 'index';
        
        // Default to exponential decay with minWeight floor
        this.weightFunction = config.weightFunction ?? this.createFlooredWeightFunction(
            exponentialDecayWeight(0.8),
            this.minWeight
        );
    }
    
    public predictTime(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetDistance: number
    ): PredictionResult {
        this.validateInputs(elapsedTimes, elapsedDistances);
        
        const { segmentTimes, segmentDistances } = this.toSegments(elapsedTimes, elapsedDistances);
        const paces = this.computeSegmentPaces(elapsedTimes, elapsedDistances);
        
        // Build feature vector and weights
        const x = this.buildFeatureVector(elapsedTimes, elapsedDistances, segmentTimes, segmentDistances);
        const weights = computeWeights(paces.length, this.weightFunction);
        
        // Weighted linear regression
        const fit = wlsSimpleLinear(x, paces, weights);
        const [intercept, slope] = fit.coefficients;
        
        // Predict time to target distance
        const lastObservedDistance = elapsedDistances[elapsedDistances.length - 1];
        const lastObservedTime = elapsedTimes[elapsedTimes.length - 1];
        
        if (targetDistance <= lastObservedDistance) {
            return this.interpolateTime(elapsedTimes, elapsedDistances, targetDistance, fit);
        }
        
        // Extrapolate
        const remainingDistance = targetDistance - lastObservedDistance;
        const avgSegmentDistance = mean(segmentDistances);
        const futureSegments = Math.ceil(remainingDistance / avgSegmentDistance);
        
        let predictedRemainingTime = 0;
        let varianceAccumulator = 0;
        
        for (let i = 1; i <= futureSegments; i++) {
            const xNew = this.getFeatureForFutureSegment(
                paces.length + i,
                lastObservedDistance + (i - 1) * avgSegmentDistance,
                lastObservedTime + predictedRemainingTime
            );
            
            const predictedPace = Math.max(0, intercept + slope * xNew);
            const segmentDist = i === futureSegments
                ? remainingDistance - (futureSegments - 1) * avgSegmentDistance
                : avgSegmentDistance;
            
            predictedRemainingTime += predictedPace * segmentDist;
            
            const se = weightedPredictionStandardError(xNew, x, weights, fit.standardError);
            varianceAccumulator += (se * segmentDist) ** 2;
        }
        
        const totalPredicted = lastObservedTime + predictedRemainingTime;
        const totalSE = Math.sqrt(varianceAccumulator);
        
        return this.buildPredictionResult(totalPredicted, totalSE, fit.df);
    }
    
    public override predictDistance(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetTime: number
    ): PredictionResult {
        this.validateInputs(elapsedTimes, elapsedDistances);
        
        const { segmentTimes, segmentDistances } = this.toSegments(elapsedTimes, elapsedDistances);
        const speeds = this.computeSegmentSpeeds(elapsedTimes, elapsedDistances);
        
        // Filter valid speeds
        const validData = this.filterValidSpeeds(speeds, segmentTimes, segmentDistances);
        
        if (validData.speeds.length < this.minObservations) {
            return this.invertTimePrediction(elapsedTimes, elapsedDistances, targetTime);
        }
        
        // Build feature vector and weights for valid observations
        const x = this.buildFeatureVectorForValid(
            validData.indices,
            elapsedTimes,
            elapsedDistances,
            segmentTimes,
            segmentDistances
        );
        const weights = computeWeights(validData.speeds.length, this.weightFunction);
        
        // Weighted linear regression on speeds
        const fit = wlsSimpleLinear(x, validData.speeds, weights);
        const [intercept, slope] = fit.coefficients;
        
        const lastObservedTime = elapsedTimes[elapsedTimes.length - 1];
        const lastObservedDistance = elapsedDistances[elapsedDistances.length - 1];
        
        if (targetTime <= lastObservedTime) {
            return this.interpolateDistance(elapsedTimes, elapsedDistances, targetTime, fit);
        }
        
        // Extrapolate
        const remainingTime = targetTime - lastObservedTime;
        const avgSegmentTime = mean(segmentTimes);
        const futureSegments = Math.ceil(remainingTime / avgSegmentTime);
        
        let predictedRemainingDistance = 0;
        let varianceAccumulator = 0;
        
        for (let i = 1; i <= futureSegments; i++) {
            const xNew = this.getFeatureForFutureSegment(
                speeds.length + i,
                lastObservedDistance + predictedRemainingDistance,
                lastObservedTime + (i - 1) * avgSegmentTime
            );
            
            const predictedSpeed = Math.max(0, intercept + slope * xNew);
            const segmentTime = i === futureSegments
                ? remainingTime - (futureSegments - 1) * avgSegmentTime
                : avgSegmentTime;
            
            predictedRemainingDistance += predictedSpeed * segmentTime;
            
            const se = weightedPredictionStandardError(xNew, x, weights, fit.standardError);
            varianceAccumulator += (se * segmentTime) ** 2;
        }
        
        const totalPredicted = lastObservedDistance + predictedRemainingDistance;
        const totalSE = Math.sqrt(varianceAccumulator);
        
        return this.buildPredictionResult(totalPredicted, totalSE, fit.df);
    }
    
    /**
     * Create a weight function with a minimum floor.
     */
    private createFlooredWeightFunction(
        baseFn: WeightFunction,
        minWeight: number
    ): WeightFunction {
        return (index: number, total: number): number => {
            const baseWeight = baseFn(index, total);
            return Math.max(minWeight, baseWeight);
        };
    }
    
    /**
     * Build feature vector based on feature space.
     */
    private buildFeatureVector(
        elapsedTimes: number[],
        elapsedDistances: number[],
        segmentTimes: number[],
        segmentDistances: number[]
    ): number[] {
        const n = segmentTimes.length;
        
        switch (this.featureSpace) {
            case 'index':
                return Array.from({ length: n }, (_, i) => i + 1);
            case 'cumulative-distance':
                return this.cumulativeSum([0, ...segmentDistances.slice(0, -1)]);
            case 'cumulative-time':
                return this.cumulativeSum([0, ...segmentTimes.slice(0, -1)]);
        }
    }
    
    /**
     * Build feature vector for subset of valid observations.
     */
    private buildFeatureVectorForValid(
        validIndices: number[],
        elapsedTimes: number[],
        elapsedDistances: number[],
        segmentTimes: number[],
        segmentDistances: number[]
    ): number[] {
        const fullX = this.buildFeatureVector(elapsedTimes, elapsedDistances, segmentTimes, segmentDistances);
        return validIndices.map(i => fullX[i]);
    }
    
    /**
     * Get feature value for a future segment.
     */
    private getFeatureForFutureSegment(
        segmentIndex: number,
        cumulativeDistance: number,
        cumulativeTime: number
    ): number {
        switch (this.featureSpace) {
            case 'index':
                return segmentIndex;
            case 'cumulative-distance':
                return cumulativeDistance;
            case 'cumulative-time':
                return cumulativeTime;
        }
    }
    
    /**
     * Filter out invalid (infinite) speeds.
     */
    private filterValidSpeeds(
        speeds: number[],
        segmentTimes: number[],
        segmentDistances: number[]
    ): { speeds: number[]; indices: number[]; times: number[]; distances: number[] } {
        const result = {
            speeds: [] as number[],
            indices: [] as number[],
            times: [] as number[],
            distances: [] as number[]
        };
        
        for (let i = 0; i < speeds.length; i++) {
            if (isFinite(speeds[i])) {
                result.speeds.push(speeds[i]);
                result.indices.push(i);
                result.times.push(segmentTimes[i]);
                result.distances.push(segmentDistances[i]);
            }
        }
        
        return result;
    }
    
    /**
     * Compute cumulative sum.
     */
    private cumulativeSum(values: number[]): number[] {
        const result: number[] = [];
        let sum = 0;
        for (const v of values) {
            sum += v;
            result.push(sum);
        }
        return result;
    }
    
    /**
     * Interpolate time for distance within observed range.
     */
    private interpolateTime(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetDistance: number,
        fit: { standardError: number; df: number }
    ): PredictionResult {
        for (let i = 0; i < elapsedDistances.length; i++) {
            if (elapsedDistances[i] >= targetDistance) {
                if (i === 0) {
                    const pace = elapsedTimes[0] / elapsedDistances[0];
                    const time = pace * targetDistance;
                    return this.buildPredictionResult(time, fit.standardError, fit.df);
                }
                
                const d0 = elapsedDistances[i - 1];
                const d1 = elapsedDistances[i];
                const t0 = elapsedTimes[i - 1];
                const t1 = elapsedTimes[i];
                
                const frac = (targetDistance - d0) / (d1 - d0);
                const time = t0 + frac * (t1 - t0);
                const se = fit.standardError * Math.sqrt(frac * (1 - frac) + 0.1);
                
                return this.buildPredictionResult(time, se, fit.df);
            }
        }
        
        throw new Error('Target distance out of interpolation range');
    }
    
    /**
     * Interpolate distance for time within observed range.
     */
    private interpolateDistance(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetTime: number,
        fit: { standardError: number; df: number }
    ): PredictionResult {
        for (let i = 0; i < elapsedTimes.length; i++) {
            if (elapsedTimes[i] >= targetTime) {
                if (i === 0) {
                    const speed = elapsedDistances[0] / elapsedTimes[0];
                    const distance = speed * targetTime;
                    return this.buildPredictionResult(distance, fit.standardError, fit.df);
                }
                
                const t0 = elapsedTimes[i - 1];
                const t1 = elapsedTimes[i];
                const d0 = elapsedDistances[i - 1];
                const d1 = elapsedDistances[i];
                
                const frac = (targetTime - t0) / (t1 - t0);
                const distance = d0 + frac * (d1 - d0);
                const se = fit.standardError * Math.sqrt(frac * (1 - frac) + 0.1);
                
                return this.buildPredictionResult(distance, se, fit.df);
            }
        }
        
        throw new Error('Target time out of interpolation range');
    }
}

/**
 * Factory functions for common WLS-Recency configurations.
 */
export const createWLSRecencyStrategy = {
    /**
     * Default: exponential decay with minWeight floor.
     */
    default: () => new WLSRecencyStrategy(),
    
    /**
     * Linear decay: oldest observation gets minWeight, newest gets 1.
     */
    linearDecay: (minWeight: number = 0.1) => new WLSRecencyStrategy({
        weightFunction: linearDecayWeight(minWeight),
        minWeight
    }),
    
    /**
     * Exponential decay with configurable rate.
     */
    exponentialDecay: (alpha: number = 0.8, minWeight: number = 0.1) => new WLSRecencyStrategy({
        weightFunction: exponentialDecayWeight(alpha),
        minWeight
    }),
    
    /**
     * Inverse decay: weight = 1/age.
     */
    inverseDecay: (minWeight: number = 0.1) => new WLSRecencyStrategy({
        weightFunction: inverseDecayWeight(),
        minWeight
    }),
    
    /**
     * Custom weight function.
     */
    custom: (weightFn: WeightFunction, config: Omit<WLSRecencyConfig, 'weightFunction'> = {}) => 
        new WLSRecencyStrategy({ ...config, weightFunction: weightFn })
};