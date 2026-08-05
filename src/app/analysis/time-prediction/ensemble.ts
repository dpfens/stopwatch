/**
 * Ensemble and Adaptive Model Selection Strategies
 * 
 * Tier 4 strategies - combine multiple models for robust predictions.
 * 
 * - Ensemble: Combines predictions from multiple strategies using various weighting schemes
 * - Adaptive: Evaluates candidates and selects the best-performing one dynamically
 */

import { PredictionResult, ConfidenceInterval } from '../../models/sequence/analysis/strategy';
import {
    TimeCastingStrategy, 
} from './interface';
import { BaseCastingStrategy, BaseStrategyConfig } from './base';
import { mean, weightedMean } from './statistics';

// =============================================================================
// WEIGHTING SCHEMES
// =============================================================================

/**
 * A function that computes weights for ensemble members.
 */
export type EnsembleWeightingScheme = (
    predictions: PredictionResult[],
    strategies: TimeCastingStrategy[],
    historicalErrors?: number[][]
) => number[];

/**
 * Equal weights for all ensemble members.
 */
export const equalWeighting: EnsembleWeightingScheme = (predictions) => {
    return Array(predictions.length).fill(1 / predictions.length);
};

/**
 * Weight inversely proportional to confidence interval width.
 * Strategies with tighter intervals get more weight.
 */
export const inverseVarianceWeighting: EnsembleWeightingScheme = (predictions) => {
    const widths = predictions.map(p => 
        p.confidence.upperBound - p.confidence.lowerBound
    );
    
    // Inverse of width (add small epsilon to prevent division by zero)
    const inverseWidths = widths.map(w => 1 / (w + 1e-10));
    const sum = inverseWidths.reduce((a, b) => a + b, 0);
    
    return inverseWidths.map(w => w / sum);
};

/**
 * Weight based on historical prediction accuracy.
 * Requires historicalErrors to be provided.
 */
export const performanceWeighting: EnsembleWeightingScheme = (
    predictions,
    _strategies,
    historicalErrors
) => {
    if (!historicalErrors || historicalErrors.length === 0) {
        return equalWeighting(predictions, _strategies);
    }
    
    // Compute mean absolute error for each strategy
    const maes = historicalErrors.map(errors => 
        errors.length > 0 ? mean(errors.map(Math.abs)) : Infinity
    );
    
    // Inverse MAE weighting (better performance = higher weight)
    const inverseMaes = maes.map(mae => 1 / (mae + 1e-10));
    const sum = inverseMaes.reduce((a, b) => a + b, 0);
    
    return inverseMaes.map(w => w / sum);
};

/**
 * Softmax weighting based on negative confidence interval width.
 * Provides smoother weights than pure inverse variance.
 */
export const softmaxWeighting = (temperature: number = 1): EnsembleWeightingScheme => {
    return (predictions) => {
        const widths = predictions.map(p =>
            p.confidence.upperBound - p.confidence.lowerBound
        );
        
        // Negative width (smaller is better)
        const scores = widths.map(w => -w / temperature);
        const maxScore = Math.max(...scores);
        
        // Softmax with numerical stability
        const expScores = scores.map(s => Math.exp(s - maxScore));
        const sum = expScores.reduce((a, b) => a + b, 0);
        
        return expScores.map(e => e / sum);
    };
};

// =============================================================================
// CONFIDENCE INTERVAL COMBINATION METHODS
// =============================================================================

/**
 * Method for combining confidence intervals from multiple predictions.
 */
export type ConfidenceCombinationMethod = (
    predictions: PredictionResult[],
    weights: number[],
    combinedValue: number
) => ConfidenceInterval;

/**
 * Use the widest confidence interval bounds.
 * Conservative approach - never underestimates uncertainty.
 */
export const widestIntervalMethod: ConfidenceCombinationMethod = (predictions) => {
    const lower = Math.min(...predictions.map(p => p.confidence.lowerBound));
    const upper = Math.max(...predictions.map(p => p.confidence.upperBound));
    
    return {
        lowerBound: lower,
        upperBound: upper,
        confidenceLevel: Math.min(...predictions.map(p => p.confidence.confidenceLevel || 0.0))
    };
};

/**
 * Pool variances and compute combined interval.
 */
export const variancePoolingMethod: ConfidenceCombinationMethod = (
    predictions,
    weights,
    combinedValue
) => {
    // Estimate variance from each interval
    // Assuming symmetric intervals: width ≈ 2 * z * se
    const variances = predictions.map(p => {
        const width = p.confidence.upperBound - p.confidence.lowerBound;
        const se = width / (2 * 1.96); // Approximate for 95% CI
        return se * se;
    });
    
    // Weighted pooled variance
    const pooledVariance = weights.reduce(
        (sum, w, i) => sum + w * w * variances[i],
        0
    );
    
    const pooledSE = Math.sqrt(pooledVariance);
    const z = 1.96; // 95% CI
    
    return {
        lowerBound: combinedValue - z * pooledSE,
        upperBound: combinedValue + z * pooledSE,
        confidenceLevel: 0.95
    };
};

// =============================================================================
// ENSEMBLE STRATEGY
// =============================================================================

export interface EnsembleConfig extends BaseStrategyConfig {
    /**
     * Strategies to include in the ensemble.
     */
    strategies: TimeCastingStrategy[];
    
    /**
     * Weighting scheme for combining predictions.
     * Default: inverseVarianceWeighting
     */
    weightingScheme?: EnsembleWeightingScheme;
    
    /**
     * Method for combining confidence intervals.
     * Default: variancePoolingMethod
     */
    confidenceCombination?: ConfidenceCombinationMethod;
    
    /**
     * Whether to track historical prediction errors for adaptive weighting.
     * Default: false
     */
    trackErrors?: boolean;
    
    /**
     * Maximum number of historical errors to store per strategy.
     * Default: 20
     */
    maxHistorySize?: number;
}

export class EnsembleStrategy extends BaseCastingStrategy {
    public readonly name = 'Ensemble';
    
    private readonly strategies: TimeCastingStrategy[];
    private readonly weightingScheme: EnsembleWeightingScheme;
    private readonly confidenceCombination: ConfidenceCombinationMethod;
    private readonly trackErrors: boolean;
    private readonly maxHistorySize: number;
    
    private historicalErrors: number[][] = [];
    private lastWeights: number[] | null = null;
    
    constructor(config: EnsembleConfig) {
        super(config);
        
        if (!config.strategies || config.strategies.length === 0) {
            throw new Error('Ensemble requires at least one strategy');
        }
        
        this.strategies = config.strategies;
        this.weightingScheme = config.weightingScheme ?? inverseVarianceWeighting;
        this.confidenceCombination = config.confidenceCombination ?? variancePoolingMethod;
        this.trackErrors = config.trackErrors ?? false;
        this.maxHistorySize = config.maxHistorySize ?? 20;
        
        // Initialize error tracking
        this.historicalErrors = this.strategies.map(() => []);
    }
    
    public predictTime(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetDistance: number
    ): PredictionResult {
        // Get predictions from all strategies
        const predictions: PredictionResult[] = [];
        const validIndices: number[] = [];
        
        for (let i = 0; i < this.strategies.length; i++) {
            try {
                const pred = this.strategies[i].predict(
                    elapsedTimes,
                    elapsedDistances,
                    targetDistance
                );
                
                if (isFinite(pred.value)) {
                    predictions.push(pred);
                    validIndices.push(i);
                }
            } catch {
                // Strategy failed, skip it
                continue;
            }
        }
        
        if (predictions.length === 0) {
            throw new Error('All ensemble strategies failed');
        }
        
        // Compute weights
        const validStrategies = validIndices.map(i => this.strategies[i]);
        const validErrors = validIndices.map(i => this.historicalErrors[i]);
        
        const weights = this.weightingScheme(predictions, validStrategies, validErrors);
        this.lastWeights = weights;
        
        // Combine predictions
        const combinedValue = weightedMean(
            predictions.map(p => p.value),
            weights
        );
        
        // Combine confidence intervals
        const combinedCI = this.confidenceCombination(predictions, weights, combinedValue);
        
        return {
            value: combinedValue,
            confidence: combinedCI
        };
    }
    
    public override predictDistance(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetTime: number
    ): PredictionResult {
        // Similar to predictTime but calls predictDistance on each strategy
        const predictions: PredictionResult[] = [];
        const validIndices: number[] = [];
        
        for (let i = 0; i < this.strategies.length; i++) {
            try {
                // Check if strategy supports predictDistance
                const strategy = this.strategies[i] as any;
                if (typeof strategy.predictDistance === 'function') {
                    const pred = strategy.predictDistance(
                        elapsedTimes,
                        elapsedDistances,
                        targetTime
                    );
                    
                    if (isFinite(pred.value)) {
                        predictions.push(pred);
                        validIndices.push(i);
                    }
                }
            } catch {
                continue;
            }
        }
        
        if (predictions.length === 0) {
            return this.invertTimePrediction(elapsedTimes, elapsedDistances, targetTime);
        }
        
        const validStrategies = validIndices.map(i => this.strategies[i]);
        const validErrors = validIndices.map(i => this.historicalErrors[i]);
        
        const weights = this.weightingScheme(predictions, validStrategies, validErrors);
        
        const combinedValue = weightedMean(
            predictions.map(p => p.value),
            weights
        );
        
        const combinedCI = this.confidenceCombination(predictions, weights, combinedValue);
        
        return {
            value: combinedValue,
            confidence: combinedCI
        };
    }
    
    /**
     * Record an actual observation for error tracking.
     * Call this after predictions are verified against actual values.
     */
    public recordActual(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetDistance: number,
        actualTime: number
    ): void {
        if (!this.trackErrors) return;
        
        for (let i = 0; i < this.strategies.length; i++) {
            try {
                const pred = this.strategies[i].predict(
                    elapsedTimes,
                    elapsedDistances,
                    targetDistance
                );
                
                const error = pred.value - actualTime;
                this.historicalErrors[i].push(error);
                
                // Trim history if needed
                if (this.historicalErrors[i].length > this.maxHistorySize) {
                    this.historicalErrors[i].shift();
                }
            } catch {
                // Strategy failed
            }
        }
    }
    
    /**
     * Get the weights used in the last prediction.
     */
    public getLastWeights(): number[] | null {
        return this.lastWeights;
    }
    
    /**
     * Get names and weights of strategies.
     */
    public getStrategyWeights(): { name: string; weight: number }[] {
        if (!this.lastWeights) return [];
        
        return this.strategies.map((s, i) => ({
            name: s.name,
            weight: this.lastWeights![i] ?? 0
        }));
    }
}

// =============================================================================
// ADAPTIVE MODEL SELECTOR
// =============================================================================

export interface AdaptiveSelectorConfig extends BaseStrategyConfig {
    /**
     * Candidate strategies to evaluate.
     */
    candidates: TimeCastingStrategy[];
    
    /**
     * Metric for evaluating strategy performance.
     * Default: 'mae' (mean absolute error)
     */
    selectionMetric?: 'mae' | 'rmse' | 'mape';
    
    /**
     * Number of recent segments to use for evaluation.
     * Default: 5
     */
    evaluationWindow?: number;
    
    /**
     * Minimum observations before selection (use fallback until then).
     * Default: 3
     */
    minObservationsBeforeSelection?: number;
    
    /**
     * Fallback strategy index to use before enough data.
     * Default: 0 (first candidate)
     */
    fallbackIndex?: number;
}

export class AdaptiveSelectorStrategy extends BaseCastingStrategy {
    public readonly name = 'AdaptiveSelector';
    
    private readonly candidates: TimeCastingStrategy[];
    private readonly selectionMetric: 'mae' | 'rmse' | 'mape';
    private readonly evaluationWindow: number;
    private readonly minObservationsBeforeSelection: number;
    private readonly fallbackIndex: number;
    
    private selectedIndex: number | null = null;
    private selectionScores: number[] | null = null;
    
    constructor(config: AdaptiveSelectorConfig) {
        super(config);
        
        if (!config.candidates || config.candidates.length === 0) {
            throw new Error('AdaptiveSelector requires at least one candidate');
        }
        
        this.candidates = config.candidates;
        this.selectionMetric = config.selectionMetric ?? 'mae';
        this.evaluationWindow = config.evaluationWindow ?? 5;
        this.minObservationsBeforeSelection = config.minObservationsBeforeSelection ?? 3;
        this.fallbackIndex = config.fallbackIndex ?? 0;
    }
    
    public predictTime(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetDistance: number
    ): PredictionResult {
        this.validateInputs(elapsedTimes, elapsedDistances);
        
        const n = elapsedTimes.length;
        
        // Use fallback if not enough data for evaluation
        if (n < this.minObservationsBeforeSelection + this.evaluationWindow) {
            this.selectedIndex = this.fallbackIndex;
            return this.candidates[this.fallbackIndex].predict(
                elapsedTimes,
                elapsedDistances,
                targetDistance
            );
        }
        
        // Evaluate candidates using cross-validation on recent segments
        const scores = this.evaluateCandidates(elapsedTimes, elapsedDistances);
        this.selectionScores = scores;
        
        // Select best candidate (lowest score)
        let bestScore = Infinity;
        let bestIndex = 0;
        
        for (let i = 0; i < scores.length; i++) {
            if (scores[i] < bestScore) {
                bestScore = scores[i];
                bestIndex = i;
            }
        }
        
        this.selectedIndex = bestIndex;
        
        // Make prediction with selected candidate
        return this.candidates[bestIndex].predict(
            elapsedTimes,
            elapsedDistances,
            targetDistance
        );
    }
    
    public override predictDistance(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetTime: number
    ): PredictionResult {
        this.validateInputs(elapsedTimes, elapsedDistances);
        
        const n = elapsedTimes.length;
        
        if (n < this.minObservationsBeforeSelection + this.evaluationWindow) {
            this.selectedIndex = this.fallbackIndex;
            const strategy = this.candidates[this.fallbackIndex] as any;
            
            if (typeof strategy.predictDistance === 'function') {
                return strategy.predictDistance(elapsedTimes, elapsedDistances, targetTime);
            }
            return this.invertTimePrediction(elapsedTimes, elapsedDistances, targetTime);
        }
        
        const scores = this.evaluateCandidates(elapsedTimes, elapsedDistances);
        this.selectionScores = scores;
        
        let bestScore = Infinity;
        let bestIndex = 0;
        
        for (let i = 0; i < scores.length; i++) {
            if (scores[i] < bestScore) {
                bestScore = scores[i];
                bestIndex = i;
            }
        }
        
        this.selectedIndex = bestIndex;
        
        const strategy = this.candidates[bestIndex] as any;
        if (typeof strategy.predictDistance === 'function') {
            return strategy.predictDistance(elapsedTimes, elapsedDistances, targetTime);
        }
        return this.invertTimePrediction(elapsedTimes, elapsedDistances, targetTime);
    }
    
    /**
     * Evaluate candidates using walk-forward validation.
     */
    private evaluateCandidates(
        elapsedTimes: number[],
        elapsedDistances: number[]
    ): number[] {
        const scores: number[] = [];
        const n = elapsedTimes.length;
        
        for (const candidate of this.candidates) {
            const errors: number[] = [];
            
            // Walk-forward validation: for each of the last `evaluationWindow` segments,
            // predict using data up to that point and compare to actual
            for (let i = n - this.evaluationWindow; i < n; i++) {
                const trainTimes = elapsedTimes.slice(0, i);
                const trainDistances = elapsedDistances.slice(0, i);
                const actualTime = elapsedTimes[i];
                const targetDistance = elapsedDistances[i];
                
                try {
                    const pred = candidate.predict(trainTimes, trainDistances, targetDistance);
                    const error = pred.value - actualTime;
                    errors.push(error);
                } catch {
                    errors.push(Infinity);
                }
            }
            
            // Compute score based on metric
            const score = this.computeScore(errors);
            scores.push(score);
        }
        
        return scores;
    }
    
    /**
     * Compute score from errors based on selection metric.
     */
    private computeScore(errors: number[]): number {
        const validErrors = errors.filter(e => isFinite(e));
        
        if (validErrors.length === 0) {
            return Infinity;
        }
        
        switch (this.selectionMetric) {
            case 'mae':
                return mean(validErrors.map(Math.abs));
            
            case 'rmse':
                return Math.sqrt(mean(validErrors.map(e => e * e)));
            
            case 'mape':
                // Need actual values for MAPE, approximate with relative error
                return mean(validErrors.map(e => Math.abs(e)));
            
            default:
                return mean(validErrors.map(Math.abs));
        }
    }
    
    /**
     * Get the currently selected strategy.
     */
    public getSelectedStrategy(): { index: number; name: string } | null {
        if (this.selectedIndex === null) return null;
        
        return {
            index: this.selectedIndex,
            name: this.candidates[this.selectedIndex].name
        };
    }
    
    /**
     * Get selection scores for all candidates.
     */
    public getSelectionScores(): { name: string; score: number }[] | null {
        if (!this.selectionScores) return null;
        
        return this.candidates.map((c, i) => ({
            name: c.name,
            score: this.selectionScores![i]
        }));
    }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

import { EWMAStrategy } from './ewma';
import { OLSLinearStrategy } from './ols-linear';
import { WLSRecencyStrategy } from './wls-recency';
import { GeneralizedProgressionStrategy } from './generalized-progression';
import { KalmanFilterStrategy } from './kalman';

/**
 * Factory functions for common ensemble configurations.
 */
export const createEnsembleStrategy = {
    /**
     * Default ensemble with core strategies.
     */
    default: () => new EnsembleStrategy({
        strategies: [
            new EWMAStrategy(),
            new OLSLinearStrategy(),
            new WLSRecencyStrategy()
        ]
    }),
    
    /**
     * Comprehensive ensemble with all major strategies.
     */
    comprehensive: () => new EnsembleStrategy({
        strategies: [
            new EWMAStrategy(),
            new OLSLinearStrategy(),
            new WLSRecencyStrategy(),
            new GeneralizedProgressionStrategy(),
            new KalmanFilterStrategy()
        ],
        trackErrors: true
    }),
    
    /**
     * Equal-weighted ensemble.
     */
    equalWeighted: (strategies: TimeCastingStrategy[]) => new EnsembleStrategy({
        strategies,
        weightingScheme: equalWeighting
    }),
    
    /**
     * Performance-weighted ensemble (requires error tracking).
     */
    performanceWeighted: (strategies: TimeCastingStrategy[]) => new EnsembleStrategy({
        strategies,
        weightingScheme: performanceWeighting,
        trackErrors: true
    }),
    
    /**
     * Custom configuration.
     */
    custom: (config: EnsembleConfig) => new EnsembleStrategy(config)
};

/**
 * Factory functions for adaptive selector.
 */
export const createAdaptiveSelectorStrategy = {
    /**
     * Default with core strategies.
     */
    default: () => new AdaptiveSelectorStrategy({
        candidates: [
            new EWMAStrategy(),
            new OLSLinearStrategy(),
            new WLSRecencyStrategy(),
            new GeneralizedProgressionStrategy()
        ]
    }),
    
    /**
     * With RMSE as selection metric.
     */
    withRMSE: (candidates: TimeCastingStrategy[]) => new AdaptiveSelectorStrategy({
        candidates,
        selectionMetric: 'rmse'
    }),
    
    /**
     * Custom configuration.
     */
    custom: (config: AdaptiveSelectorConfig) => new AdaptiveSelectorStrategy(config)
};