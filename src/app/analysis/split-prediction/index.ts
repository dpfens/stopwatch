import { SplitDistancePredictor } from "../../models/sequence/analysis/interface";

// Pattern-based predictors
import { FixedIntervalPredictor } from './fixed-interval';
import { DeltaSequencePredictor } from './delta-sequence';
import { LapRelativePredictor } from './lap-relative';
import { RatioFractionPredictor } from './ratio-fractional';
import { GCDPatternPredictor } from './gcd';

// Milestone-based predictors
import { LapBasedMilestonePredictor } from "./lap-based";
import { RoundNumberAffinityPredictor } from "./round-number-affinity";
import { PaceBasedMilestonePredictor } from "./pace-based";
import { CompositeMilestonePredictor } from "./composite";
import { TargetDistancePredictor } from "./target-distance";

import { MilestoneSystem, ScoredMilestoneSystem } from './milestone-systems';

// ============================================================================
// Public Options Interface (Business-Focused)
// ============================================================================

/**
 * Simple, business-focused options for split prediction.
 * No strategy configuration needed.
 */
export interface SplitPredictorOptions {
    /** Known lap distance in meters */
    lapDistance?: number;

    /** Target/finish distance in meters (e.g., 5000 for a 5K) */
    targetDistance?: number;

    /** Maximum number of splits to predict */
    maxCount?: number;

    /** Maximum distance to predict out to */
    maxDistance?: number;

    /** 
     * Split times in milliseconds (same length as splitDistances).
     * Enables pace-based inference for better accuracy.
     */
    splitTimes?: number[];

    /**
     * Prediction mode preference.
     * - 'auto': Automatically choose best approach (default)
     * - 'pattern': Prioritize pattern continuation from existing splits
     * - 'milestone': Prioritize milestone-based predictions
     * - 'target': Optimize for reaching target distance
     */
    mode?: 'auto' | 'pattern' | 'milestone' | 'target';

    /**
     * Minimum confidence threshold (0-1).
     * Predictions below this confidence are discarded.
     * Default: 0.3
     */
    minConfidence?: number;
}

/**
 * Extended result with metadata (optional, for debugging/UI).
 */
export interface SplitPredictionResult {
    /** Predicted split distances */
    predictions: number[];

    /** Confidence in the predictions (0-1) */
    confidence: number;

    /** Which strategy produced the result */
    strategy: string;

    /** Inferred milestone system, if applicable */
    inferredSystem?: ScoredMilestoneSystem;

    /** Inferred target distance, if auto-detected */
    inferredTarget?: number;

    /** Detailed reasoning (for debugging) */
    reasons?: string[];
}

// ============================================================================
// Main Facade
// ============================================================================

/**
 * Unified split distance predictor.
 * 
 * Automatically selects and combines the best prediction strategies
 * based on available data. Business logic developers can use this
 * without understanding the underlying algorithms.
 * 
 * @example
 * ```typescript
 * // Simplest usage
 * const next = SplitPredictor.predict([1000, 2000, 3000]);
 * // → [4000]
 * 
 * // With options
 * const upcoming = SplitPredictor.predict(
 *   [1000, 2000, 3000],
 *   { targetDistance: 10000, maxCount: 10 }
 * );
 * // → [4000, 5000, 6000, 7000, 8000, 9000, 10000]
 * 
 * // Instance-based for repeated use
 * const predictor = new SplitPredictor();
 * predictor.predict(splits, options);
 * ```
 */
export class SplitPredictor implements SplitDistancePredictor {
    // Pattern-based predictors
    private readonly fixedInterval: FixedIntervalPredictor;
    private readonly deltaSequence: DeltaSequencePredictor;
    private readonly lapRelative: LapRelativePredictor;
    private readonly ratioFraction: RatioFractionPredictor;
    private readonly gcdPattern: GCDPatternPredictor;

    // Milestone-based predictors
    private readonly compositeMilestone: CompositeMilestonePredictor;
    private readonly targetDistance: TargetDistancePredictor;

    constructor() {
        // Initialize all predictors with sensible defaults
        this.fixedInterval = new FixedIntervalPredictor();
        this.deltaSequence = new DeltaSequencePredictor();
        this.lapRelative = new LapRelativePredictor();
        this.ratioFraction = new RatioFractionPredictor();
        this.gcdPattern = new GCDPatternPredictor();

        this.compositeMilestone = new CompositeMilestonePredictor();
        this.targetDistance = new TargetDistancePredictor();
    }

    // ========================================================================
    // Static convenience methods
    // ========================================================================

    /**
     * Static method for one-off predictions.
     */
    static predict(
        splitDistances: number[],
        options?: SplitPredictorOptions
    ): number[] {
        const instance = new SplitPredictor();
        return instance.predict(splitDistances, options?.lapDistance, options);
    }

    /**
     * Static method with detailed results.
     */
    static predictWithDetails(
        splitDistances: number[],
        options?: SplitPredictorOptions
    ): SplitPredictionResult {
        const instance = new SplitPredictor();
        return instance.predictWithDetails(splitDistances, options);
    }

    // ========================================================================
    // SplitDistancePredictor interface
    // ========================================================================

    isApplicable(splitDistances: number[], lapDistance?: number): boolean {
        return splitDistances.length >= 1;
    }

    predict(
        splitDistances: number[],
        lapDistance?: number,
        options?: SplitPredictorOptions
    ): number[] {
        const result = this.predictWithDetails(splitDistances, {
            ...options,
            lapDistance: lapDistance ?? options?.lapDistance,
        });
        return result.predictions;
    }

    // ========================================================================
    // Detailed prediction (with metadata)
    // ========================================================================

    /**
     * Get predictions with full metadata about how they were generated.
     */
    predictWithDetails(
        splitDistances: number[],
        options?: SplitPredictorOptions
    ): SplitPredictionResult {
        const opts = this.normalizeOptions(options);

        // Route to appropriate strategy based on mode
        switch (opts.mode) {
            case 'pattern':
                return this.predictPattern(splitDistances, opts);
            case 'milestone':
                return this.predictMilestone(splitDistances, opts);
            case 'target':
                return this.predictToTarget(splitDistances, opts);
            case 'auto':
            default:
                return this.predictAuto(splitDistances, opts);
        }
    }

    // ========================================================================
    // Strategy implementations
    // ========================================================================

    /**
     * Auto mode: intelligently combine pattern and milestone approaches.
     */
    private predictAuto(
        splitDistances: number[],
        opts: Required<SplitPredictorOptions>
    ): SplitPredictionResult {
        // If target is specified, prioritize target-based prediction
        if (opts.targetDistance) {
            return this.predictToTarget(splitDistances, opts);
        }

        // Get predictions from both approaches
        const patternResult = this.predictPattern(splitDistances, opts);
        const milestoneResult = this.predictMilestone(splitDistances, opts);

        // Define confidence thresholds for "high confidence"
        const HIGH_CONFIDENCE_PATTERN = 0.7;
        const HIGH_CONFIDENCE_MILESTONE = 0.6;
        
        // Track which predictions to include
        const predictions: number[] = [];
        const reasons: string[] = [];
        let totalConfidence = 0;
        let predictionCount = 0;
        
        // Add pattern predictions if they meet confidence threshold
        if (patternResult.confidence >= HIGH_CONFIDENCE_PATTERN) {
            predictions.push(...patternResult.predictions);
            totalConfidence += patternResult.confidence;
            predictionCount++;
            if (patternResult.reasons) {
                reasons.push(...patternResult.reasons);
            }
            reasons.push(`Pattern detection (confidence: ${(patternResult.confidence * 100).toFixed(0)}%)`);
        }
        
        // Add milestone predictions if they meet confidence threshold
        if (milestoneResult.confidence >= HIGH_CONFIDENCE_MILESTONE) {
            // Only add unique predictions to avoid duplicates
            milestoneResult.predictions.forEach(prediction => {
                if (!predictions.some(p => Math.abs(p - prediction) < 0.0001)) {
                    predictions.push(prediction);
                }
            });
            totalConfidence += milestoneResult.confidence;
            predictionCount++;
            if (milestoneResult.reasons) {
                reasons.push(...milestoneResult.reasons);
            }
            reasons.push(`Milestone detection (confidence: ${(milestoneResult.confidence * 100).toFixed(0)}%)`);
        }
        
        // If we have predictions from both methods, calculate agreement and handle accordingly
        if (patternResult.predictions.length > 0 && milestoneResult.predictions.length > 0) {
            const agreement = this.checkAgreement(
                patternResult.predictions,
                milestoneResult.predictions
            );
            
            if (agreement > 0.8) {
                // Strong agreement - boost overall confidence
                reasons.push(`Strong cross-validation (${(agreement * 100).toFixed(0)}% agreement)`);
                // Already included both above if confident
            } else if (agreement < 0.3) {
                // Significant disagreement - include but flag
                reasons.push(`Warning: Prediction methods disagree (${(agreement * 100).toFixed(0)}% agreement)`);
            } else {
                // Moderate agreement
                reasons.push(`Moderate cross-validation (${(agreement * 100).toFixed(0)}% agreement)`);
            }
        }
        
        // If we have predictions, return combined result
        if (predictions.length > 0) {
            const averageConfidence = predictionCount > 0 ? totalConfidence / predictionCount : 0;
            
            // Sort predictions and remove any that are too close (potential duplicates from different methods)
            const sortedPredictions = predictions.sort((a, b) => a - b);
            const dedupedPredictions: number[] = [];
            const MERGE_THRESHOLD = 0.001; // Threshold for merging similar predictions
            
            sortedPredictions.forEach(prediction => {
                if (dedupedPredictions.length === 0) {
                    dedupedPredictions.push(prediction);
                } else {
                    const lastPrediction = dedupedPredictions[dedupedPredictions.length - 1];
                    if (Math.abs(prediction - lastPrediction) > MERGE_THRESHOLD) {
                        dedupedPredictions.push(prediction);
                    } else {
                        // Average nearby predictions
                        dedupedPredictions[dedupedPredictions.length - 1] = 
                            (lastPrediction + prediction) / 2;
                    }
                }
            });
            
            return {
                predictions: dedupedPredictions,
                confidence: averageConfidence,
                strategy: 'combined',
                reasons: reasons,
            };
        }
        
        // Fallback: if neither meets confidence threshold but one has predictions, use it
        if (patternResult.predictions.length > 0 || milestoneResult.predictions.length > 0) {
            const fallbackResult = patternResult.predictions.length > 0 ? patternResult : milestoneResult;
            return {
                ...fallbackResult,
                reasons: [
                    ...(fallbackResult.reasons ?? []),
                    'Used as fallback (did not meet confidence thresholds)'
                ],
            };
        }
        
        // No predictions possible
        return {
            predictions: [],
            confidence: 0,
            strategy: 'none',
            reasons: ['Insufficient data for prediction'],
        };
    }

    /**
     * Pattern mode: use pattern-detection strategies.
     */
    private predictPattern(
        splitDistances: number[],
        opts: Required<SplitPredictorOptions>
    ): SplitPredictionResult {
        const candidates: Array<{
            predictions: number[];
            confidence: number;
            strategy: string;
        }> = [];

        const predictorOpts = {
            maxCount: opts.maxCount,
            maxDistance: opts.maxDistance ?? opts.targetDistance,
        };

        // Try each pattern predictor
        if (this.fixedInterval.isApplicable(splitDistances, opts.lapDistance)) {
            const predictions = this.fixedInterval.predict(
                splitDistances, opts.lapDistance, predictorOpts
            );
            if (predictions.length > 0) {
                candidates.push({
                    predictions,
                    confidence: 0.7, // Fixed interval is reliable when it works
                    strategy: 'fixed-interval',
                });
            }
        }

        if (this.deltaSequence.isApplicable(splitDistances, opts.lapDistance)) {
            const predictions = this.deltaSequence.predict(
                splitDistances, opts.lapDistance, predictorOpts
            );
            if (predictions.length > 0) {
                candidates.push({
                    predictions,
                    confidence: 0.75, // Delta sequence captures more complex patterns
                    strategy: 'delta-sequence',
                });
            }
        }

        if (opts.lapDistance && this.lapRelative.isApplicable(splitDistances, opts.lapDistance)) {
            const predictions = this.lapRelative.predict(
                splitDistances, opts.lapDistance, predictorOpts
            );
            if (predictions.length > 0) {
                candidates.push({
                    predictions,
                    confidence: 0.8, // Lap-relative is strong with lap distance
                    strategy: 'lap-relative',
                });
            }
        }

        if (opts.lapDistance && this.ratioFraction.isApplicable(splitDistances, opts.lapDistance)) {
            const predictions = this.ratioFraction.predict(
                splitDistances, opts.lapDistance, predictorOpts
            );
            if (predictions.length > 0) {
                candidates.push({
                    predictions,
                    confidence: 0.65,
                    strategy: 'ratio-fraction',
                });
            }
        }

        if (this.gcdPattern.isApplicable(splitDistances, opts.lapDistance)) {
            const predictions = this.gcdPattern.predict(
                splitDistances, opts.lapDistance, predictorOpts
            );
            if (predictions.length > 0) {
                candidates.push({
                    predictions,
                    confidence: 0.6,
                    strategy: 'gcd-pattern',
                });
            }
        }

        if (candidates.length === 0) {
            return {
                predictions: [],
                confidence: 0,
                strategy: 'pattern',
                reasons: ['No pattern detected in split distances'],
            };
        }

        // Find consensus or pick best
        return this.selectBestCandidate(candidates, opts.minConfidence);
    }

    /**
     * Milestone mode: use milestone-based strategies.
     */
    private predictMilestone(
        splitDistances: number[],
        opts: Required<SplitPredictorOptions>
    ): SplitPredictionResult {
        const milestoneOpts = {
            maxCount: opts.maxCount,
            maxDistance: opts.maxDistance ?? opts.targetDistance,
            splitTimes: opts.splitTimes,
        };

        const predictions = this.compositeMilestone.predict(
            splitDistances,
            opts.lapDistance,
            milestoneOpts
        );

        const inference = this.compositeMilestone.inferSystem(
            splitDistances,
            opts.lapDistance,
            milestoneOpts
        );

        return {
            predictions,
            confidence: inference?.confidence ?? 0,
            strategy: 'milestone',
            inferredSystem: inference ?? undefined,
            reasons: inference?.reasons,
        };
    }

    /**
     * Target mode: predict splits to reach target distance.
     */
    private predictToTarget(
        splitDistances: number[],
        opts: Required<SplitPredictorOptions>
    ): SplitPredictionResult {
        const targetOpts = {
            maxCount: opts.maxCount,
            maxDistance: opts.maxDistance,
            splitTimes: opts.splitTimes,
            targetDistance: opts.targetDistance || opts.maxDistance,
        };

        const detailed = this.targetDistance.getDetailedPrediction(
            splitDistances,
            opts.lapDistance,
            targetOpts
        );

        return {
            predictions: detailed.predictions,
            confidence: detailed.system?.confidence ?? 0.5,
            strategy: 'target',
            inferredSystem: detailed.system ?? undefined,
            inferredTarget: detailed.inferredTarget ?? undefined,
            reasons: detailed.system?.reasons,
        };
    }

    // ========================================================================
    // Helper methods
    // ========================================================================

    private normalizeOptions(options?: SplitPredictorOptions): Required<SplitPredictorOptions> {
        return {
            lapDistance: options?.lapDistance,
            targetDistance: options?.targetDistance,
            maxCount: options?.maxCount ?? 1,
            maxDistance: options?.maxDistance,
            splitTimes: options?.splitTimes,
            mode: options?.mode ?? 'auto',
            minConfidence: options?.minConfidence ?? 0.3,
        } as Required<SplitPredictorOptions>;
    }

    private selectBestCandidate(
        candidates: Array<{ predictions: number[]; confidence: number; strategy: string }>,
        minConfidence: number
    ): SplitPredictionResult {
        // Filter by minimum confidence
        const viable = candidates.filter(c => c.confidence >= minConfidence);

        if (viable.length === 0) {
            // Return best below threshold with note
            candidates.sort((a, b) => b.confidence - a.confidence);
            return {
                predictions: candidates[0].predictions,
                confidence: candidates[0].confidence,
                strategy: candidates[0].strategy,
                reasons: [`Below confidence threshold (${candidates[0].confidence.toFixed(2)} < ${minConfidence})`],
            };
        }

        // Check for consensus among top candidates
        if (viable.length > 1) {
            const agreement = this.findConsensus(viable.map(v => v.predictions));
            if (agreement) {
                return {
                    predictions: agreement.predictions,
                    confidence: Math.min(1, viable[0].confidence + 0.1),
                    strategy: 'consensus',
                    reasons: [`${viable.length} strategies agree`],
                };
            }
        }

        // Return highest confidence
        viable.sort((a, b) => b.confidence - a.confidence);
        return {
            predictions: viable[0].predictions,
            confidence: viable[0].confidence,
            strategy: viable[0].strategy,
        };
    }

    private findConsensus(
        predictionSets: number[][]
    ): { predictions: number[] } | null {
        if (predictionSets.length < 2) {
            return null;
        }

        // Check if first predictions are similar
        const tolerance = 0.02; // 2% tolerance
        const firstPredictions = predictionSets.map(p => p[0]).filter(p => p !== undefined);

        if (firstPredictions.length < 2) {
            return null;
        }

        const avg = firstPredictions.reduce((a, b) => a + b, 0) / firstPredictions.length;
        const allClose = firstPredictions.every(
            p => Math.abs(p - avg) / avg <= tolerance
        );

        if (allClose) {
            // Use median
            const sorted = [...firstPredictions].sort((a, b) => a - b);
            const median = sorted[Math.floor(sorted.length / 2)];
            return { predictions: [median] };
        }

        return null;
    }

    private checkAgreement(predictions1: number[], predictions2: number[]): number {
        if (predictions1.length === 0 || predictions2.length === 0) {
            return 0;
        }

        // Check how many predictions are close
        const tolerance = 0.05; // 5% tolerance
        let matches = 0;
        const total = Math.min(predictions1.length, predictions2.length);

        for (let i = 0; i < total; i++) {
            const diff = Math.abs(predictions1[i] - predictions2[i]);
            const avg = (predictions1[i] + predictions2[i]) / 2;
            if (diff / avg <= tolerance) {
                matches++;
            }
        }

        return matches / total;
    }
}

// ============================================================================
// Default export for convenience
// ============================================================================

export default SplitPredictor;