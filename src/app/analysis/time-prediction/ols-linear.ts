/**
 * Ordinary Least Squares (OLS) Linear Regression Strategy
 * 
 * Tier 1 strategy - detects systematic linear trends (fatigue, improvement).
 * Well-understood prediction intervals from regression theory.
 * 
 * When no trend exists, the slope approaches zero and predictions
 * converge to the mean.
 */
import { PredictionResult } from '../../models/sequence/analysis/strategy';
import { FitResult } from './interface';
import { BaseCastingStrategy, BaseStrategyConfig } from './base';
import { olsSimpleLinear, predictionStandardError, mean, variance } from './statistics';

/**
 * What to use as the independent variable (x) in regression.
 */
export type RegressionFeatureSpace = 
    | 'index'               // Segment number (1, 2, 3, ...)
    | 'cumulative-distance' // Distance covered so far
    | 'cumulative-time';    // Time elapsed so far

export interface OLSLinearConfig extends BaseStrategyConfig {
    /**
     * What to regress against.
     * - 'index': Segment paces vs segment number (detects progressive change)
     * - 'cumulative-distance': Paces vs distance covered (detects distance-related fatigue)
     * - 'cumulative-time': Paces vs time elapsed (detects time-related fatigue)
     * 
     * Default: 'index'
     */
    featureSpace?: RegressionFeatureSpace;
    
    /**
     * Whether to use heteroskedasticity-consistent (robust) standard errors.
     * Useful when variance of paces changes over time.
     * Default: false
     */
    robustSE?: boolean;
}

export class OLSLinearStrategy extends BaseCastingStrategy {
    public readonly name = 'OLS-Linear';
    
    private readonly featureSpace: RegressionFeatureSpace;
    private readonly robustSE: boolean;
    
    constructor(config: OLSLinearConfig = {}) {
        super({ ...config, minObservations: 3 });
        
        this.featureSpace = config.featureSpace ?? 'index';
        this.robustSE = config.robustSE ?? false;
    }
    
    public predictTime(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetDistance: number
    ): PredictionResult {
        this.validateInputs(elapsedTimes, elapsedDistances);
        
        // Get segment data
        const { segmentTimes, segmentDistances } = this.toSegments(elapsedTimes, elapsedDistances);
        const paces = this.computeSegmentPaces(elapsedTimes, elapsedDistances);
        
        // Build feature vector (x values)
        const x = this.buildFeatureVector(elapsedTimes, elapsedDistances, segmentTimes, segmentDistances);
        
        // Fit linear regression: pace = β₀ + β₁x
        const fit = olsSimpleLinear(x, paces);
        const [intercept, slope] = fit.coefficients;
        
        // Predict paces for future segments up to target distance
        const prediction = this.predictToDistance(
            elapsedTimes,
            elapsedDistances,
            segmentDistances,
            targetDistance,
            intercept,
            slope,
            fit
        );
        
        return prediction;
    }
    
    public override predictDistance(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetTime: number
    ): PredictionResult {
        this.validateInputs(elapsedTimes, elapsedDistances);
        
        // Get segment data
        const { segmentTimes, segmentDistances } = this.toSegments(elapsedTimes, elapsedDistances);
        const speeds = this.computeSegmentSpeeds(elapsedTimes, elapsedDistances);
        
        // Filter infinite speeds
        const validIndices: number[] = [];
        const validSpeeds: number[] = [];
        for (let i = 0; i < speeds.length; i++) {
            if (isFinite(speeds[i])) {
                validIndices.push(i);
                validSpeeds.push(speeds[i]);
            }
        }
        
        if (validSpeeds.length < this.minObservations) {
            return this.invertTimePrediction(elapsedTimes, elapsedDistances, targetTime);
        }
        
        // Build feature vector for valid observations
        const fullX = this.buildFeatureVector(elapsedTimes, elapsedDistances, segmentTimes, segmentDistances);
        const x = validIndices.map(i => fullX[i]);
        
        // Fit linear regression: speed = β₀ + β₁x
        const fit = olsSimpleLinear(x, validSpeeds);
        const [intercept, slope] = fit.coefficients;
        
        // Predict distance for target time
        return this.predictToTime(
            elapsedTimes,
            elapsedDistances,
            segmentTimes,
            targetTime,
            intercept,
            slope,
            fit
        );
    }
    
    /**
     * Build the feature vector based on configured feature space.
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
                // 1, 2, 3, ...
                return Array.from({ length: n }, (_, i) => i + 1);
            
            case 'cumulative-distance':
                // Cumulative distance at start of each segment
                const cumDist = [0];
                for (let i = 0; i < n - 1; i++) {
                    cumDist.push(cumDist[i] + segmentDistances[i]);
                }
                return cumDist;
            
            case 'cumulative-time':
                // Cumulative time at start of each segment
                const cumTime = [0];
                for (let i = 0; i < n - 1; i++) {
                    cumTime.push(cumTime[i] + segmentTimes[i]);
                }
                return cumTime;
            
            default:
                return Array.from({ length: n }, (_, i) => i + 1);
        }
    }
    
    /**
     * Predict total time to reach target distance.
     */
    private predictToDistance(
        elapsedTimes: number[],
        elapsedDistances: number[],
        segmentDistances: number[],
        targetDistance: number,
        intercept: number,
        slope: number,
        fit: FitResult
    ): PredictionResult {
        const lastObservedDistance = elapsedDistances[elapsedDistances.length - 1];
        const lastObservedTime = elapsedTimes[elapsedTimes.length - 1];
        
        if (targetDistance <= lastObservedDistance) {
            // Interpolation: use observed data
            return this.interpolateTime(elapsedTimes, elapsedDistances, targetDistance, fit);
        }
        
        // Extrapolation: predict pace for remaining distance
        const remainingDistance = targetDistance - lastObservedDistance;
        const n = segmentDistances.length;
        const avgSegmentDistance = mean(segmentDistances);
        
        // Estimate number of future segments
        const futureSegments = Math.ceil(remainingDistance / avgSegmentDistance);
        
        // Sum predicted paces for future segments
        let predictedRemainingTime = 0;
        let varianceAccumulator = 0;
        
        for (let i = 1; i <= futureSegments; i++) {
            const futureIndex = n + i;
            let xNew: number;
            
            switch (this.featureSpace) {
                case 'index':
                    xNew = futureIndex;
                    break;
                case 'cumulative-distance':
                    xNew = lastObservedDistance + (i - 1) * avgSegmentDistance;
                    break;
                case 'cumulative-time':
                    xNew = lastObservedTime + predictedRemainingTime;
                    break;
                default:
                    xNew = futureIndex;
            }
            
            const predictedPace = intercept + slope * xNew;
            const segmentDist = i === futureSegments 
                ? remainingDistance - (futureSegments - 1) * avgSegmentDistance
                : avgSegmentDistance;
            
            predictedRemainingTime += predictedPace * segmentDist;
            
            // Accumulate variance
            const x = this.buildFeatureVector(
                elapsedTimes, elapsedDistances,
                this.toSegments(elapsedTimes, elapsedDistances).segmentTimes,
                this.toSegments(elapsedTimes, elapsedDistances).segmentDistances
            );
            const se = predictionStandardError(xNew, x, fit.standardError);
            varianceAccumulator += (se * segmentDist) ** 2;
        }
        
        const totalPredicted = lastObservedTime + predictedRemainingTime;
        const totalSE = Math.sqrt(varianceAccumulator);
        
        return this.buildPredictionResult(totalPredicted, totalSE, fit.df);
    }
    
    /**
     * Predict total distance reached at target time.
     */
    private predictToTime(
        elapsedTimes: number[],
        elapsedDistances: number[],
        segmentTimes: number[],
        targetTime: number,
        intercept: number,
        slope: number,
        fit: FitResult
    ): PredictionResult {
        const lastObservedTime = elapsedTimes[elapsedTimes.length - 1];
        const lastObservedDistance = elapsedDistances[elapsedDistances.length - 1];
        
        if (targetTime <= lastObservedTime) {
            // Interpolation
            return this.interpolateDistance(elapsedTimes, elapsedDistances, targetTime, fit);
        }
        
        // Extrapolation
        const remainingTime = targetTime - lastObservedTime;
        const n = segmentTimes.length;
        const avgSegmentTime = mean(segmentTimes);
        
        // Estimate future segments
        const futureSegments = Math.ceil(remainingTime / avgSegmentTime);
        
        let predictedRemainingDistance = 0;
        let varianceAccumulator = 0;
        let cumulativeTime = lastObservedTime;
        
        for (let i = 1; i <= futureSegments; i++) {
            const futureIndex = n + i;
            let xNew: number;
            
            switch (this.featureSpace) {
                case 'index':
                    xNew = futureIndex;
                    break;
                case 'cumulative-time':
                    xNew = cumulativeTime;
                    break;
                case 'cumulative-distance':
                    xNew = lastObservedDistance + predictedRemainingDistance;
                    break;
                default:
                    xNew = futureIndex;
            }
            
            const predictedSpeed = intercept + slope * xNew;
            const segmentTime = i === futureSegments
                ? remainingTime - (futureSegments - 1) * avgSegmentTime
                : avgSegmentTime;
            
            predictedRemainingDistance += predictedSpeed * segmentTime;
            cumulativeTime += segmentTime;
            
            // Accumulate variance
            const x = this.buildFeatureVector(
                elapsedTimes, elapsedDistances,
                segmentTimes,
                this.toSegments(elapsedTimes, elapsedDistances).segmentDistances
            );
            const se = predictionStandardError(xNew, x, fit.standardError);
            varianceAccumulator += (se * segmentTime) ** 2;
        }
        
        const totalPredicted = lastObservedDistance + predictedRemainingDistance;
        const totalSE = Math.sqrt(varianceAccumulator);
        
        return this.buildPredictionResult(totalPredicted, totalSE, fit.df);
    }
    
    /**
     * Interpolate time for a distance within observed range.
     */
    private interpolateTime(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetDistance: number,
        fit: FitResult
    ): PredictionResult {
        // Find bracketing observations
        for (let i = 0; i < elapsedDistances.length; i++) {
            if (elapsedDistances[i] >= targetDistance) {
                if (i === 0) {
                    // Before first observation
                    const pace = elapsedTimes[0] / elapsedDistances[0];
                    const time = pace * targetDistance;
                    const se = fit.standardError * targetDistance / elapsedDistances[0];
                    return this.buildPredictionResult(time, se, fit.df);
                }
                
                // Linear interpolation between observations i-1 and i
                const d0 = elapsedDistances[i - 1];
                const d1 = elapsedDistances[i];
                const t0 = elapsedTimes[i - 1];
                const t1 = elapsedTimes[i];
                
                const frac = (targetDistance - d0) / (d1 - d0);
                const time = t0 + frac * (t1 - t0);
                
                // Interpolation has lower uncertainty than extrapolation
                const se = fit.standardError * Math.sqrt(frac * (1 - frac));
                
                return this.buildPredictionResult(time, se, fit.df);
            }
        }
        
        // Should not reach here if called correctly
        throw new Error('Target distance out of range for interpolation');
    }
    
    /**
     * Interpolate distance for a time within observed range.
     */
    private interpolateDistance(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetTime: number,
        fit: FitResult
    ): PredictionResult {
        for (let i = 0; i < elapsedTimes.length; i++) {
            if (elapsedTimes[i] >= targetTime) {
                if (i === 0) {
                    const speed = elapsedDistances[0] / elapsedTimes[0];
                    const distance = speed * targetTime;
                    const se = fit.standardError * targetTime / elapsedTimes[0];
                    return this.buildPredictionResult(distance, se, fit.df);
                }
                
                const t0 = elapsedTimes[i - 1];
                const t1 = elapsedTimes[i];
                const d0 = elapsedDistances[i - 1];
                const d1 = elapsedDistances[i];
                
                const frac = (targetTime - t0) / (t1 - t0);
                const distance = d0 + frac * (d1 - d0);
                const se = fit.standardError * Math.sqrt(frac * (1 - frac));
                
                return this.buildPredictionResult(distance, se, fit.df);
            }
        }
        
        throw new Error('Target time out of range for interpolation');
    }
    
    /**
     * Get the fitted trend slope for diagnostic purposes.
     */
    public getTrend(elapsedTimes: number[], elapsedDistances: number[]): {
        slope: number;
        intercept: number;
        rSquared: number;
        interpretation: 'improving' | 'declining' | 'stable';
    } {
        this.validateInputs(elapsedTimes, elapsedDistances);
        
        const { segmentTimes, segmentDistances } = this.toSegments(elapsedTimes, elapsedDistances);
        const paces = this.computeSegmentPaces(elapsedTimes, elapsedDistances);
        const x = this.buildFeatureVector(elapsedTimes, elapsedDistances, segmentTimes, segmentDistances);
        
        const fit = olsSimpleLinear(x, paces);
        const [intercept, slope] = fit.coefficients;
        
        // Determine if slope is significant
        // Using a rough threshold of |slope| > 0.01 * mean(paces)
        const meanPace = mean(paces);
        const slopeThreshold = 0.01 * meanPace;
        
        let interpretation: 'improving' | 'declining' | 'stable';
        if (slope > slopeThreshold) {
            interpretation = 'declining'; // Pace increasing = getting slower
        } else if (slope < -slopeThreshold) {
            interpretation = 'improving'; // Pace decreasing = getting faster
        } else {
            interpretation = 'stable';
        }
        
        return { slope, intercept, rSquared: fit.rSquared, interpretation };
    }
}

/**
 * Factory functions for common OLS configurations.
 */
export const createOLSLinearStrategy = {
    /**
     * Default: regress against segment index.
     */
    default: () => new OLSLinearStrategy(),
    
    /**
     * Distance-based: detects distance-related fatigue.
     */
    distanceBased: () => new OLSLinearStrategy({ featureSpace: 'cumulative-distance' }),
    
    /**
     * Time-based: detects time-related fatigue.
     */
    timeBased: () => new OLSLinearStrategy({ featureSpace: 'cumulative-time' }),
    
    /**
     * Robust: uses heteroskedasticity-consistent standard errors.
     */
    robust: () => new OLSLinearStrategy({ robustSE: true }),
    
    /**
     * Custom configuration.
     */
    custom: (config: OLSLinearConfig) => new OLSLinearStrategy(config)
};