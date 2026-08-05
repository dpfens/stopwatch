/**
 * Kalman Filter Strategy
 * 
 * Tier 2 strategy - optimal for online/nowcasting scenarios.
 * 
 * Models a latent "true pace" that evolves with process noise,
 * observed with measurement noise. Naturally handles partial 
 * segment completion and provides optimal state estimates.
 * 
 * State space model:
 *   State evolution:    pace_t = pace_{t-1} + process_noise
 *   Observation:        observed_pace_t = pace_t + measurement_noise
 * 
 * Extended version includes trend (pace drift):
 *   [pace_t]     [1  1] [pace_{t-1}]     [process_noise_1]
 *   [drift_t]  = [0  1] [drift_{t-1}]  + [process_noise_2]
 */

import { PredictionResult } from '../../models/sequence/analysis/strategy';
import { BaseCastingStrategy, BaseStrategyConfig } from './base';
import { mean, variance } from './statistics';

export interface KalmanFilterConfig extends BaseStrategyConfig {
    /**
     * Process noise variance (Q).
     * Controls how much the true pace can change between segments.
     * Higher = more responsive to changes, noisier predictions.
     * Default: estimated from data
     */
    processNoise?: number | 'auto';
    
    /**
     * Measurement noise variance (R).
     * Controls how much we trust individual observations.
     * Higher = smoother predictions, slower response.
     * Default: estimated from data
     */
    measurementNoise?: number | 'auto';
    
    /**
     * Initial state estimate.
     * Default: first observed pace
     */
    initialState?: number | 'auto';
    
    /**
     * Initial state variance.
     * Higher = less confidence in initial estimate.
     * Default: estimated from data
     */
    initialVariance?: number | 'auto';
    
    /**
     * Whether to include trend (drift) in the state.
     * Allows modeling of systematic pace changes.
     * Default: false
     */
    includeTrend?: boolean;
    
    /**
     * Process noise for trend component (if includeTrend=true).
     * Default: processNoise / 10
     */
    trendProcessNoise?: number | 'auto';
}

interface KalmanState {
    mean: number;
    variance: number;
    trend?: number;
    trendVariance?: number;
}

export class KalmanFilterStrategy extends BaseCastingStrategy {
    public readonly name = 'KalmanFilter';
    
    private processNoise: number | 'auto';
    private measurementNoise: number | 'auto';
    private initialState: number | 'auto';
    private initialVariance: number | 'auto';
    private readonly includeTrend: boolean;
    private trendProcessNoise: number | 'auto';
    
    // Cached filter state for diagnostics
    private filterState: KalmanState | null = null;
    private stateHistory: KalmanState[] = [];
    
    constructor(config: KalmanFilterConfig = {}) {
        super({ ...config, minObservations: 2 });
        
        this.processNoise = config.processNoise ?? 'auto';
        this.measurementNoise = config.measurementNoise ?? 'auto';
        this.initialState = config.initialState ?? 'auto';
        this.initialVariance = config.initialVariance ?? 'auto';
        this.includeTrend = config.includeTrend ?? false;
        this.trendProcessNoise = config.trendProcessNoise ?? 'auto';
    }
    
    public predictTime(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetDistance: number
    ): PredictionResult {
        this.validateInputs(elapsedTimes, elapsedDistances);
        
        const paces = this.computeSegmentPaces(elapsedTimes, elapsedDistances);
        const { segmentDistances } = this.toSegments(elapsedTimes, elapsedDistances);
        
        // Filter valid paces
        const validPaces = paces.filter(p => p > 0 && isFinite(p));
        if (validPaces.length < this.minObservations) {
            return this.naivePrediction(elapsedTimes, elapsedDistances, targetDistance);
        }
        
        // Estimate noise parameters if auto
        const { Q, R, x0, P0 } = this.estimateParameters(validPaces);
        
        // Run Kalman filter
        const state = this.includeTrend
            ? this.runFilterWithTrend(validPaces, Q, R, x0, P0)
            : this.runFilter(validPaces, Q, R, x0, P0);
        
        this.filterState = state;
        
        // Predict future paces
        return this.predictToDistance(
            elapsedTimes,
            elapsedDistances,
            segmentDistances,
            targetDistance,
            state,
            Q
        );
    }
    
    public override predictDistance(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetTime: number
    ): PredictionResult {
        this.validateInputs(elapsedTimes, elapsedDistances);
        
        const speeds = this.computeSegmentSpeeds(elapsedTimes, elapsedDistances);
        const { segmentTimes } = this.toSegments(elapsedTimes, elapsedDistances);
        
        const validSpeeds = speeds.filter(s => s > 0 && isFinite(s));
        if (validSpeeds.length < this.minObservations) {
            return this.invertTimePrediction(elapsedTimes, elapsedDistances, targetTime);
        }
        
        const { Q, R, x0, P0 } = this.estimateParameters(validSpeeds);
        
        const state = this.includeTrend
            ? this.runFilterWithTrend(validSpeeds, Q, R, x0, P0)
            : this.runFilter(validSpeeds, Q, R, x0, P0);
        
        return this.predictToTime(
            elapsedTimes,
            elapsedDistances,
            segmentTimes,
            targetTime,
            state,
            Q
        );
    }
    
    /**
     * Get the current filter state for diagnostics.
     */
    public getFilterState(): KalmanState | null {
        return this.filterState;
    }
    
    /**
     * Get the history of filter states.
     */
    public getStateHistory(): KalmanState[] {
        return [...this.stateHistory];
    }
    
    /**
     * Estimate Kalman filter parameters from data.
     */
    private estimateParameters(observations: number[]): {
        Q: number;
        R: number;
        x0: number;
        P0: number;
    } {
        const n = observations.length;
        
        // Initial state estimate
        const x0 = this.initialState === 'auto' 
            ? observations[0]
            : this.initialState;
        
        // Estimate observation variance
        const obsVariance = variance(observations);
        
        // Initial variance
        const P0 = this.initialVariance === 'auto'
            ? obsVariance
            : this.initialVariance;
        
        // Estimate process noise from innovations
        // Using the difference between consecutive observations
        const innovations: number[] = [];
        for (let i = 1; i < n; i++) {
            innovations.push(observations[i] - observations[i - 1]);
        }
        const innovationVariance = innovations.length > 1 
            ? variance(innovations)
            : obsVariance * 0.1;
        
        // Process noise (Q) and measurement noise (R) split
        // Heuristic: process accounts for ~30% of innovation variance
        const Q = this.processNoise === 'auto'
            ? Math.max(innovationVariance * 0.3, obsVariance * 0.01)
            : this.processNoise;
        
        const R = this.measurementNoise === 'auto'
            ? Math.max(innovationVariance * 0.7, obsVariance * 0.01)
            : this.measurementNoise;
        
        return { Q, R, x0, P0 };
    }
    
    /**
     * Run basic Kalman filter (constant pace model).
     */
    private runFilter(
        observations: number[],
        Q: number,
        R: number,
        x0: number,
        P0: number
    ): KalmanState {
        let x = x0;  // State estimate
        let P = P0;  // State variance
        
        this.stateHistory = [{ mean: x, variance: P }];
        
        for (const z of observations) {
            // Predict step
            const xPred = x;           // State transition: x_{t|t-1} = x_{t-1|t-1}
            const PPred = P + Q;       // Variance: P_{t|t-1} = P_{t-1|t-1} + Q
            
            // Update step
            const K = PPred / (PPred + R);  // Kalman gain
            x = xPred + K * (z - xPred);    // Updated state
            P = (1 - K) * PPred;            // Updated variance
            
            this.stateHistory.push({ mean: x, variance: P });
        }
        
        return { mean: x, variance: P };
    }
    
    /**
     * Run Kalman filter with trend (linear drift model).
     * State: [pace, trend]'
     */
    private runFilterWithTrend(
        observations: number[],
        Q: number,
        R: number,
        x0: number,
        P0: number
    ): KalmanState {
        // State vector: [pace, trend]
        let x = [x0, 0];  // Initial pace, zero trend
        
        // Covariance matrix
        const Qtrend = this.trendProcessNoise === 'auto' ? Q / 10 : this.trendProcessNoise;
        let P = [
            [P0, 0],
            [0, Qtrend * 10]  // Higher initial uncertainty for trend
        ];
        
        // State transition matrix
        const F = [
            [1, 1],
            [0, 1]
        ];
        
        // Process noise covariance
        const Qmat = [
            [Q, 0],
            [0, Qtrend]
        ];
        
        // Observation matrix
        const H = [1, 0];
        
        this.stateHistory = [{ 
            mean: x[0], 
            variance: P[0][0],
            trend: x[1],
            trendVariance: P[1][1]
        }];
        
        for (const z of observations) {
            // Predict step
            const xPred = [
                F[0][0] * x[0] + F[0][1] * x[1],
                F[1][0] * x[0] + F[1][1] * x[1]
            ];
            
            // P_pred = F * P * F' + Q
            const PPred = this.matrixAdd(
                this.matrixMultiply(this.matrixMultiply(F, P), this.transpose(F)),
                Qmat
            );
            
            // Update step
            // S = H * P_pred * H' + R (scalar for single observation)
            const S = H[0] * PPred[0][0] * H[0] + H[1] * PPred[1][1] * H[1] + R;
            
            // K = P_pred * H' / S (column vector)
            const K = [
                (PPred[0][0] * H[0] + PPred[0][1] * H[1]) / S,
                (PPred[1][0] * H[0] + PPred[1][1] * H[1]) / S
            ];
            
            // Innovation
            const innovation = z - (H[0] * xPred[0] + H[1] * xPred[1]);
            
            // Updated state
            x = [
                xPred[0] + K[0] * innovation,
                xPred[1] + K[1] * innovation
            ];
            
            // Updated covariance: P = (I - K*H) * P_pred
            const KH = [
                [K[0] * H[0], K[0] * H[1]],
                [K[1] * H[0], K[1] * H[1]]
            ];
            const IminusKH = [
                [1 - KH[0][0], -KH[0][1]],
                [-KH[1][0], 1 - KH[1][1]]
            ];
            P = this.matrixMultiply(IminusKH, PPred);
            
            this.stateHistory.push({
                mean: x[0],
                variance: P[0][0],
                trend: x[1],
                trendVariance: P[1][1]
            });
        }
        
        return {
            mean: x[0],
            variance: P[0][0],
            trend: x[1],
            trendVariance: P[1][1]
        };
    }
    
    /**
     * Predict time to reach target distance.
     */
    private predictToDistance(
        elapsedTimes: number[],
        elapsedDistances: number[],
        segmentDistances: number[],
        targetDistance: number,
        state: KalmanState,
        Q: number
    ): PredictionResult {
        const lastObservedDistance = elapsedDistances[elapsedDistances.length - 1];
        const lastObservedTime = elapsedTimes[elapsedTimes.length - 1];
        
        if (targetDistance <= lastObservedDistance) {
            return this.interpolateTime(elapsedTimes, elapsedDistances, targetDistance, state);
        }
        
        const remainingDistance = targetDistance - lastObservedDistance;
        const avgSegmentDistance = mean(segmentDistances);
        const futureSegments = Math.ceil(remainingDistance / avgSegmentDistance);
        
        let predictedRemainingTime = 0;
        let currentPace = state.mean;
        let currentVariance = state.variance;
        let currentTrend = state.trend ?? 0;
        let varianceAccumulator = 0;
        
        for (let i = 1; i <= futureSegments; i++) {
            // Predict state evolution
            if (this.includeTrend) {
                currentPace += currentTrend;
            }
            currentVariance += Q;
            
            const segmentDist = i === futureSegments
                ? remainingDistance - (futureSegments - 1) * avgSegmentDistance
                : avgSegmentDistance;
            
            const effectivePace = Math.max(0.001, currentPace);
            predictedRemainingTime += effectivePace * segmentDist;
            varianceAccumulator += currentVariance * segmentDist * segmentDist;
        }
        
        const totalPredicted = lastObservedTime + predictedRemainingTime;
        const totalSE = Math.sqrt(varianceAccumulator);
        
        return this.buildPredictionResult(totalPredicted, totalSE, elapsedTimes.length - 1);
    }
    
    /**
     * Predict distance at target time.
     */
    private predictToTime(
        elapsedTimes: number[],
        elapsedDistances: number[],
        segmentTimes: number[],
        targetTime: number,
        state: KalmanState,
        Q: number
    ): PredictionResult {
        const lastObservedTime = elapsedTimes[elapsedTimes.length - 1];
        const lastObservedDistance = elapsedDistances[elapsedDistances.length - 1];
        
        if (targetTime <= lastObservedTime) {
            return this.interpolateDistance(elapsedTimes, elapsedDistances, targetTime, state);
        }
        
        const remainingTime = targetTime - lastObservedTime;
        const avgSegmentTime = mean(segmentTimes);
        const futureSegments = Math.ceil(remainingTime / avgSegmentTime);
        
        let predictedRemainingDistance = 0;
        let currentSpeed = state.mean;
        let currentVariance = state.variance;
        let currentTrend = state.trend ?? 0;
        let varianceAccumulator = 0;
        
        for (let i = 1; i <= futureSegments; i++) {
            if (this.includeTrend) {
                currentSpeed += currentTrend;
            }
            currentVariance += Q;
            
            const segmentTime = i === futureSegments
                ? remainingTime - (futureSegments - 1) * avgSegmentTime
                : avgSegmentTime;
            
            const effectiveSpeed = Math.max(0.001, currentSpeed);
            predictedRemainingDistance += effectiveSpeed * segmentTime;
            varianceAccumulator += currentVariance * segmentTime * segmentTime;
        }
        
        const totalPredicted = lastObservedDistance + predictedRemainingDistance;
        const totalSE = Math.sqrt(varianceAccumulator);
        
        return this.buildPredictionResult(totalPredicted, totalSE, elapsedTimes.length - 1);
    }
    
    /**
     * Interpolate time within observed range.
     */
    private interpolateTime(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetDistance: number,
        state: KalmanState
    ): PredictionResult {
        for (let i = 0; i < elapsedDistances.length; i++) {
            if (elapsedDistances[i] >= targetDistance) {
                if (i === 0) {
                    const pace = elapsedTimes[0] / elapsedDistances[0];
                    const time = pace * targetDistance;
                    return this.buildPredictionResult(time, Math.sqrt(state.variance), i);
                }
                
                const frac = (targetDistance - elapsedDistances[i-1]) / 
                            (elapsedDistances[i] - elapsedDistances[i-1]);
                const time = elapsedTimes[i-1] + frac * (elapsedTimes[i] - elapsedTimes[i-1]);
                
                return this.buildPredictionResult(time, Math.sqrt(state.variance) * 0.5, i);
            }
        }
        throw new Error('Interpolation failed');
    }
    
    /**
     * Interpolate distance within observed range.
     */
    private interpolateDistance(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetTime: number,
        state: KalmanState
    ): PredictionResult {
        for (let i = 0; i < elapsedTimes.length; i++) {
            if (elapsedTimes[i] >= targetTime) {
                if (i === 0) {
                    const speed = elapsedDistances[0] / elapsedTimes[0];
                    const distance = speed * targetTime;
                    return this.buildPredictionResult(distance, Math.sqrt(state.variance), i);
                }
                
                const frac = (targetTime - elapsedTimes[i-1]) / 
                            (elapsedTimes[i] - elapsedTimes[i-1]);
                const distance = elapsedDistances[i-1] + frac * (elapsedDistances[i] - elapsedDistances[i-1]);
                
                return this.buildPredictionResult(distance, Math.sqrt(state.variance) * 0.5, i);
            }
        }
        throw new Error('Interpolation failed');
    }
    
    // Matrix utilities for 2x2 matrices
    private matrixMultiply(A: number[][], B: number[][]): number[][] {
        return [
            [A[0][0]*B[0][0] + A[0][1]*B[1][0], A[0][0]*B[0][1] + A[0][1]*B[1][1]],
            [A[1][0]*B[0][0] + A[1][1]*B[1][0], A[1][0]*B[0][1] + A[1][1]*B[1][1]]
        ];
    }
    
    private matrixAdd(A: number[][], B: number[][]): number[][] {
        return [
            [A[0][0] + B[0][0], A[0][1] + B[0][1]],
            [A[1][0] + B[1][0], A[1][1] + B[1][1]]
        ];
    }
    
    private transpose(A: number[][]): number[][] {
        return [
            [A[0][0], A[1][0]],
            [A[0][1], A[1][1]]
        ];
    }
}

/**
 * Factory functions for common Kalman filter configurations.
 */
export const createKalmanFilterStrategy = {
    /**
     * Default: auto-estimated parameters.
     */
    default: () => new KalmanFilterStrategy(),
    
    /**
     * With trend: models systematic pace drift.
     */
    withTrend: () => new KalmanFilterStrategy({ includeTrend: true }),
    
    /**
     * Smooth: trusts observations less (higher measurement noise).
     */
    smooth: () => new KalmanFilterStrategy({ measurementNoise: 'auto' }),
    
    /**
     * Responsive: trusts observations more, responds quickly to changes.
     */
    responsive: (Q: number = 0.1) => new KalmanFilterStrategy({ 
        processNoise: Q,
        measurementNoise: 0.01
    }),
    
    /**
     * Custom configuration.
     */
    custom: (config: KalmanFilterConfig) => new KalmanFilterStrategy(config)
};