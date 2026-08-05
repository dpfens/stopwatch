/**
 * Generalized Progression Strategy
 * 
 * Tier 1.5 strategy - detects and models arithmetic, geometric, and harmonic
 * progression patterns in segment times/paces.
 * 
 * Mathematical foundation:
 * - Arithmetic: pace_n = pace_0 + n·d (constant capacity loss per segment)
 * - Geometric: pace_n = pace_0 · r^n (constant % degradation per segment)
 * - Harmonic: speed_n = speed_0 - n·Δ (constant deceleration in speed domain)
 * 
 * These are unified via the Box-Cox transformation family:
 * f(x; λ) = (x^λ - 1) / λ  when λ ≠ 0
 * f(x; 0) = ln(x)
 * 
 * Where λ = 1 → arithmetic, λ → 0 → geometric, λ = -1 → harmonic
 */
import { PredictionResult } from '../../models/sequence/analysis/strategy';
import { BaseCastingStrategy, BaseStrategyConfig } from './base';
import { 
    TransformPair,
    identityTransform,
    logTransform,
    reciprocalTransform,
    sqrtTransform,
    boxCoxTransform,
    ModelSelectionCriterion,
    bicCriterion,
    aiccCriterion
} from './functions';
import { 
    olsSimpleLinear, 
    predictionStandardError,
    mean,
} from './statistics';

/**
 * Predefined transformation types.
 */
export type ProgressionType = 'arithmetic' | 'geometric' | 'harmonic' | 'sqrt';

export interface GeneralizedProgressionConfig extends BaseStrategyConfig {
    /**
     * Candidate transformations to evaluate.
     * Can be predefined types or custom TransformPair objects.
     * Default: ['arithmetic', 'geometric', 'harmonic']
     */
    candidateTransforms?: (ProgressionType | TransformPair)[];
    
    /**
     * Model selection criterion function.
     * Default: AICc (corrected AIC for small samples)
     */
    selectionCriterion?: ModelSelectionCriterion;
    
    /**
     * For Box-Cox search: range of lambda values to consider.
     * Only used if 'box-cox-search' is in candidateTransforms.
     * Default: [-2, 2]
     */
    boxCoxLambdaRange?: [number, number];
    
    /**
     * Grid search step size for Box-Cox lambda.
     * Default: 0.25
     */
    boxCoxLambdaResolution?: number;
    
    /**
     * Whether to include diagnostic information in results.
     * Default: true
     */
    reportDiagnostics?: boolean;
}

interface TransformFitResult {
    transform: TransformPair;
    fit: {
        coefficients: number[];
        rss: number;
        df: number;
        rSquared: number;
        standardError: number;
    };
    selectionScore: number;
}

export class GeneralizedProgressionStrategy extends BaseCastingStrategy {
    public readonly name = 'GeneralizedProgression';
    
    private readonly candidateTransforms: TransformPair[];
    private readonly selectionCriterion: ModelSelectionCriterion;
    private readonly boxCoxLambdaRange: [number, number];
    private readonly boxCoxLambdaResolution: number;
    private readonly reportDiagnostics: boolean;
    
    // Cache for last fit results (useful for diagnostics)
    private lastFitResults: TransformFitResult[] | null = null;
    private lastSelectedTransform: TransformPair | null = null;
    
    constructor(config: GeneralizedProgressionConfig = {}) {
        super({ ...config, minObservations: 4 });
        
        this.selectionCriterion = config.selectionCriterion ?? aiccCriterion;
        this.boxCoxLambdaRange = config.boxCoxLambdaRange ?? [-2, 2];
        this.boxCoxLambdaResolution = config.boxCoxLambdaResolution ?? 0.25;
        this.reportDiagnostics = config.reportDiagnostics ?? true;
        
        // Convert string types to TransformPair objects
        const candidates = config.candidateTransforms ?? ['arithmetic', 'geometric', 'harmonic'];
        this.candidateTransforms = candidates.map(c => this.resolveTransform(c));
    }
    
    public predictTime(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetDistance: number
    ): PredictionResult {
        this.validateInputs(elapsedTimes, elapsedDistances);
        
        const { segmentTimes, segmentDistances } = this.toSegments(elapsedTimes, elapsedDistances);
        const paces = this.computeSegmentPaces(elapsedTimes, elapsedDistances);
        
        // Filter out non-positive paces (required for some transforms)
        const validPaces = paces.filter(p => p > 0 && isFinite(p));
        if (validPaces.length < this.minObservations) {
            return this.naivePrediction(elapsedTimes, elapsedDistances, targetDistance);
        }
        
        // Feature vector (segment indices)
        const x = Array.from({ length: validPaces.length }, (_, i) => i + 1);
        
        // Evaluate all candidate transformations
        const fitResults = this.evaluateTransforms(x, validPaces);
        this.lastFitResults = fitResults;
        
        // Select best transformation
        const best = this.selectBestTransform(fitResults);
        this.lastSelectedTransform = best.transform;
        
        // Make prediction using selected transform
        return this.predictWithTransform(
            elapsedTimes,
            elapsedDistances,
            validPaces,
            segmentDistances,
            targetDistance,
            best
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
        
        // Filter valid speeds
        const validSpeeds = speeds.filter(s => s > 0 && isFinite(s));
        if (validSpeeds.length < this.minObservations) {
            return this.invertTimePrediction(elapsedTimes, elapsedDistances, targetTime);
        }
        
        const x = Array.from({ length: validSpeeds.length }, (_, i) => i + 1);
        
        // Evaluate transformations on speeds
        const fitResults = this.evaluateTransforms(x, validSpeeds);
        const best = this.selectBestTransform(fitResults);
        
        return this.predictDistanceWithTransform(
            elapsedTimes,
            elapsedDistances,
            validSpeeds,
            segmentTimes,
            targetTime,
            best
        );
    }
    
    /**
     * Get diagnostic information about the last prediction.
     */
    public getDiagnostics(): {
        selectedTransform: string;
        selectionScores: Record<string, number>;
        progressionRate: { type: string; value: number };
        rSquared: number;
    } | null {
        if (!this.lastFitResults || !this.lastSelectedTransform) {
            return null;
        }
        
        const best = this.lastFitResults.find(r => r.transform === this.lastSelectedTransform)!;
        const [intercept, slope] = best.fit.coefficients;
        
        // Interpret the progression rate
        let progressionType: string;
        let progressionValue: number;
        
        if (this.lastSelectedTransform.name === 'identity') {
            progressionType = 'additive';
            progressionValue = slope; // Units per segment
        } else if (this.lastSelectedTransform.name === 'logarithmic') {
            progressionType = 'multiplicative';
            progressionValue = Math.exp(slope); // Ratio per segment
        } else if (this.lastSelectedTransform.name === 'reciprocal') {
            progressionType = 'rate-based';
            progressionValue = slope; // Change in 1/pace per segment
        } else {
            progressionType = this.lastSelectedTransform.name;
            progressionValue = slope;
        }
        
        const scores: Record<string, number> = {};
        for (const result of this.lastFitResults) {
            scores[result.transform.name] = result.selectionScore;
        }
        
        return {
            selectedTransform: this.lastSelectedTransform.name,
            selectionScores: scores,
            progressionRate: { type: progressionType, value: progressionValue },
            rSquared: best.fit.rSquared
        };
    }
    
    /**
     * Resolve a progression type string to a TransformPair.
     */
    private resolveTransform(transform: ProgressionType | TransformPair): TransformPair {
        if (typeof transform === 'object') {
            return transform;
        }
        
        switch (transform) {
            case 'arithmetic':
                return identityTransform;
            case 'geometric':
                return logTransform;
            case 'harmonic':
                return reciprocalTransform;
            case 'sqrt':
                return sqrtTransform;
            default:
                throw new Error(`Unknown progression type: ${transform}`);
        }
    }
    
    /**
     * Evaluate all candidate transformations and fit models.
     */
    private evaluateTransforms(x: number[], y: number[]): TransformFitResult[] {
        const results: TransformFitResult[] = [];
        
        for (const transform of this.candidateTransforms) {
            try {
                // Transform y values
                const yTransformed = y.map(transform.transform);
                
                // Check for valid transformed values
                if (yTransformed.some(v => !isFinite(v))) {
                    continue;
                }
                
                // Fit linear regression in transformed space
                const fit = olsSimpleLinear(x, yTransformed);
                
                // Compute selection criterion score
                const score = this.selectionCriterion(
                    fit.rss,
                    y.length,
                    2 // intercept + slope
                );
                
                results.push({ transform, fit, selectionScore: score });
            } catch {
                // Transform failed (e.g., non-positive values for log)
                continue;
            }
        }
        
        if (results.length === 0) {
            // Fallback to identity transform
            const fit = olsSimpleLinear(x, y);
            const score = this.selectionCriterion(fit.rss, y.length, 2);
            results.push({ transform: identityTransform, fit, selectionScore: score });
        }
        
        return results;
    }
    
    /**
     * Select the best transformation based on selection criterion.
     */
    private selectBestTransform(results: TransformFitResult[]): TransformFitResult {
        return results.reduce((best, current) => 
            current.selectionScore < best.selectionScore ? current : best
        );
    }
    
    /**
     * Make time prediction using selected transformation.
     */
    private predictWithTransform(
        elapsedTimes: number[],
        elapsedDistances: number[],
        paces: number[],
        segmentDistances: number[],
        targetDistance: number,
        bestFit: TransformFitResult
    ): PredictionResult {
        const { transform, fit } = bestFit;
        const [intercept, slope] = fit.coefficients;
        
        const lastObservedDistance = elapsedDistances[elapsedDistances.length - 1];
        const lastObservedTime = elapsedTimes[elapsedTimes.length - 1];
        
        if (targetDistance <= lastObservedDistance) {
            // Interpolation
            return this.interpolateTime(elapsedTimes, elapsedDistances, targetDistance, fit);
        }
        
        // Extrapolation
        const remainingDistance = targetDistance - lastObservedDistance;
        const avgSegmentDistance = mean(segmentDistances);
        const futureSegments = Math.ceil(remainingDistance / avgSegmentDistance);
        const n = paces.length;
        
        let predictedRemainingTime = 0;
        let varianceAccumulator = 0;
        const x = Array.from({ length: n }, (_, i) => i + 1);
        
        for (let i = 1; i <= futureSegments; i++) {
            const xNew = n + i;
            
            // Predict in transformed space
            const predictedTransformed = intercept + slope * xNew;
            
            // Back-transform to get pace
            let predictedPace: number;
            try {
                predictedPace = transform.inverse(predictedTransformed);
            } catch {
                // Use last observed pace if back-transform fails
                predictedPace = paces[paces.length - 1];
            }
            
            // Ensure positive pace
            predictedPace = Math.max(0.001, predictedPace);
            
            const segmentDist = i === futureSegments
                ? remainingDistance - (futureSegments - 1) * avgSegmentDistance
                : avgSegmentDistance;
            
            predictedRemainingTime += predictedPace * segmentDist;
            
            // Estimate variance (in original space)
            const se = predictionStandardError(xNew, x, fit.standardError);
            
            // Approximate variance transformation using delta method
            const transformDerivative = this.estimateInverseDerivative(transform, predictedTransformed);
            const originalSE = se * Math.abs(transformDerivative);
            
            varianceAccumulator += (originalSE * segmentDist) ** 2;
        }
        
        const totalPredicted = lastObservedTime + predictedRemainingTime;
        const totalSE = Math.sqrt(varianceAccumulator);
        
        return this.buildPredictionResult(totalPredicted, totalSE, fit.df);
    }
    
    /**
     * Make distance prediction using selected transformation.
     */
    private predictDistanceWithTransform(
        elapsedTimes: number[],
        elapsedDistances: number[],
        speeds: number[],
        segmentTimes: number[],
        targetTime: number,
        bestFit: TransformFitResult
    ): PredictionResult {
        const { transform, fit } = bestFit;
        const [intercept, slope] = fit.coefficients;
        
        const lastObservedTime = elapsedTimes[elapsedTimes.length - 1];
        const lastObservedDistance = elapsedDistances[elapsedDistances.length - 1];
        
        if (targetTime <= lastObservedTime) {
            return this.interpolateDistance(elapsedTimes, elapsedDistances, targetTime, fit);
        }
        
        const remainingTime = targetTime - lastObservedTime;
        const avgSegmentTime = mean(segmentTimes);
        const futureSegments = Math.ceil(remainingTime / avgSegmentTime);
        const n = speeds.length;
        
        let predictedRemainingDistance = 0;
        let varianceAccumulator = 0;
        const x = Array.from({ length: n }, (_, i) => i + 1);
        
        for (let i = 1; i <= futureSegments; i++) {
            const xNew = n + i;
            const predictedTransformed = intercept + slope * xNew;
            
            let predictedSpeed: number;
            try {
                predictedSpeed = transform.inverse(predictedTransformed);
            } catch {
                predictedSpeed = speeds[speeds.length - 1];
            }
            
            predictedSpeed = Math.max(0.001, predictedSpeed);
            
            const segmentTime = i === futureSegments
                ? remainingTime - (futureSegments - 1) * avgSegmentTime
                : avgSegmentTime;
            
            predictedRemainingDistance += predictedSpeed * segmentTime;
            
            const se = predictionStandardError(xNew, x, fit.standardError);
            const transformDerivative = this.estimateInverseDerivative(transform, predictedTransformed);
            const originalSE = se * Math.abs(transformDerivative);
            
            varianceAccumulator += (originalSE * segmentTime) ** 2;
        }
        
        const totalPredicted = lastObservedDistance + predictedRemainingDistance;
        const totalSE = Math.sqrt(varianceAccumulator);
        
        return this.buildPredictionResult(totalPredicted, totalSE, fit.df);
    }
    
    /**
     * Estimate the derivative of the inverse transformation at a point.
     * Used for delta method variance propagation.
     */
    private estimateInverseDerivative(transform: TransformPair, y: number): number {
        const h = 1e-6;
        try {
            const f1 = transform.inverse(y + h);
            const f0 = transform.inverse(y - h);
            return (f1 - f0) / (2 * h);
        } catch {
            return 1; // Fallback to identity
        }
    }
    
    /**
     * Interpolate time within observed range.
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
                    return this.buildPredictionResult(
                        pace * targetDistance,
                        fit.standardError,
                        fit.df
                    );
                }
                
                const frac = (targetDistance - elapsedDistances[i-1]) / 
                            (elapsedDistances[i] - elapsedDistances[i-1]);
                const time = elapsedTimes[i-1] + frac * (elapsedTimes[i] - elapsedTimes[i-1]);
                
                return this.buildPredictionResult(time, fit.standardError * 0.5, fit.df);
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
        fit: { standardError: number; df: number }
    ): PredictionResult {
        for (let i = 0; i < elapsedTimes.length; i++) {
            if (elapsedTimes[i] >= targetTime) {
                if (i === 0) {
                    const speed = elapsedDistances[0] / elapsedTimes[0];
                    return this.buildPredictionResult(
                        speed * targetTime,
                        fit.standardError,
                        fit.df
                    );
                }
                
                const frac = (targetTime - elapsedTimes[i-1]) / 
                            (elapsedTimes[i] - elapsedTimes[i-1]);
                const distance = elapsedDistances[i-1] + frac * (elapsedDistances[i] - elapsedDistances[i-1]);
                
                return this.buildPredictionResult(distance, fit.standardError * 0.5, fit.df);
            }
        }
        
        throw new Error('Interpolation failed');
    }
}

/**
 * Factory functions for common configurations.
 */
export const createGeneralizedProgressionStrategy = {
    /**
     * Default: evaluates arithmetic, geometric, and harmonic progressions.
     */
    default: () => new GeneralizedProgressionStrategy(),
    
    /**
     * Arithmetic only: assumes linear progression in raw values.
     */
    arithmeticOnly: () => new GeneralizedProgressionStrategy({
        candidateTransforms: ['arithmetic']
    }),
    
    /**
     * Geometric only: assumes multiplicative progression.
     */
    geometricOnly: () => new GeneralizedProgressionStrategy({
        candidateTransforms: ['geometric']
    }),
    
    /**
     * Extended: includes square root transformation.
     */
    extended: () => new GeneralizedProgressionStrategy({
        candidateTransforms: ['arithmetic', 'geometric', 'harmonic', 'sqrt']
    }),
    
    /**
     * With custom Box-Cox lambda values.
     */
    withBoxCox: (lambdas: number[]) => new GeneralizedProgressionStrategy({
        candidateTransforms: [
            'arithmetic',
            'geometric', 
            'harmonic',
            ...lambdas.map(λ => boxCoxTransform(λ))
        ]
    }),
    
    /**
     * Using BIC for model selection (penalizes complexity more).
     */
    withBIC: () => new GeneralizedProgressionStrategy({
        selectionCriterion: bicCriterion
    }),
    
    /**
     * Custom configuration.
     */
    custom: (config: GeneralizedProgressionConfig) => new GeneralizedProgressionStrategy(config)
};