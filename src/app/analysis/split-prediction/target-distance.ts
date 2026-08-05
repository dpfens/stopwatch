import { SplitDistancePredictor } from "../../models/sequence/analysis/interface";
import {
    MilestoneSystem,
    ScoredMilestoneSystem,
    getNextMilestones,
} from "./milestone-systems";
import { CompositeMilestonePredictor } from "./composite";

interface PredictOptions {
    maxCount?: number;
    maxDistance?: number;
    splitTimes?: number[];
    
    /**
     * Known target/finish distance. 
     * If provided, predictions will include the finish and stay within it.
     */
    targetDistance?: number;
}

/**
 * Standard race distances for auto-detection.
 */
const COMMON_RACE_DISTANCES = [
    100, 200, 400, 800, 1000, 1500, 1609.34, // Track + mile
    3000, 3218.69, // 3K + 2 miles
    5000, 8000, 10000, // 5K, 8K, 10K
    15000, 16093.4, // 15K, 10 mile
    21097.5, // Half marathon
    25000, 30000, // 25K, 30K
    42195, // Marathon
    50000, 80467, 100000, // 50K, 50 mile, 100K
];

/**
 * Predicts milestone splits to reach a target/finish distance.
 * 
 * Works in two modes:
 * 1. Target provided: Generate milestones from current position to target
 * 2. Target not provided: Attempt to infer likely target from current distance
 * 
 * Uses CompositeMilestonePredictor to determine appropriate milestone system.
 */
export class TargetDistancePredictor implements SplitDistancePredictor {
    private readonly milestonePredictor: CompositeMilestonePredictor;
    private readonly includeFinishLine: boolean;
    private readonly autoDetectTarget: boolean;

    /**
     * @param includeFinishLine - Whether to include the target distance itself in predictions
     * @param autoDetectTarget - Whether to attempt target inference when not provided
     */
    constructor(includeFinishLine: boolean = true, autoDetectTarget: boolean = true) {
        this.milestonePredictor = new CompositeMilestonePredictor();
        this.includeFinishLine = includeFinishLine;
        this.autoDetectTarget = autoDetectTarget;
    }

    isApplicable(splitDistances: number[], lapDistance?: number): boolean {
        return splitDistances.length >= 1;
    }

    predict(splitDistances: number[], lapDistance?: number, options?: PredictOptions): number[] {
        const currentDistance = splitDistances.length > 0
            ? splitDistances[splitDistances.length - 1]
            : 0;

        // Determine target distance
        let targetDistance = options?.targetDistance ?? options?.maxDistance;

        if (!targetDistance && this.autoDetectTarget) {
            targetDistance = this.inferTargetDistance(currentDistance, splitDistances, lapDistance);
        }

        if (!targetDistance) {
            // Fall back to milestone predictor without target
            return this.milestonePredictor.predict(splitDistances, lapDistance, options);
        }

        // Get the inferred milestone system
        const inference = this.milestonePredictor.inferSystem(
            splitDistances,
            lapDistance,
            { ...options, maxDistance: targetDistance }
        );

        if (!inference) {
            // No system inferred - just return target if applicable
            return this.includeFinishLine && targetDistance > currentDistance
                ? [targetDistance]
                : [];
        }

        // Generate milestones to target
        const predictions = this.generateMilestonesToTarget(
            inference.system,
            currentDistance,
            targetDistance,
            options?.maxCount
        );

        return predictions;
    }

    /**
     * Attempt to infer the target distance based on current progress.
     */
    private inferTargetDistance(
        currentDistance: number,
        splitDistances: number[],
        lapDistance?: number
    ): number | undefined {
        // 1. If we're close to a common race distance, assume that's the target
        for (const raceDistance of COMMON_RACE_DISTANCES) {
            const progress = currentDistance / raceDistance;
            
            // If we're 20-95% through a race distance, it's likely our target
            if (progress >= 0.2 && progress <= 0.95) {
                // Additional check: distance should be "reachable" 
                // (not way beyond current scale)
                if (raceDistance <= currentDistance * 5) {
                    return raceDistance;
                }
            }
        }

        // 2. If lap distance is set, target might be a round number of laps
        if (lapDistance && lapDistance > 0) {
            const lapsCompleted = currentDistance / lapDistance;
            
            // Common lap-based race lengths
            const commonLapCounts = [4, 8, 10, 12, 16, 20, 25, 50, 100];
            
            for (const lapCount of commonLapCounts) {
                const raceDistance = lapCount * lapDistance;
                const progress = currentDistance / raceDistance;
                
                if (progress >= 0.2 && progress <= 0.95) {
                    return raceDistance;
                }
            }
        }

        // 3. Look for a race distance just beyond current position
        for (const raceDistance of COMMON_RACE_DISTANCES) {
            if (raceDistance > currentDistance && raceDistance <= currentDistance * 3) {
                return raceDistance;
            }
        }

        return undefined;
    }

    /**
     * Generate milestones from current position to target.
     */
    private generateMilestonesToTarget(
        system: MilestoneSystem,
        currentDistance: number,
        targetDistance: number,
        maxCount?: number
    ): number[] {
        const predictions: number[] = [];
        const effectiveMax = maxCount ?? Infinity;

        // Get milestones from system
        let nextMilestones = getNextMilestones(
            system,
            currentDistance,
            effectiveMax,
            targetDistance
        );

        // Filter to only those before target
        for (const milestone of nextMilestones) {
            if (milestone >= targetDistance) {
                break;
            }
            predictions.push(milestone);
            if (predictions.length >= effectiveMax) {
                break;
            }
        }

        // Add finish line if requested and not already included
        if (this.includeFinishLine && predictions.length < effectiveMax) {
            const lastPrediction = predictions[predictions.length - 1];
            if (lastPrediction !== targetDistance) {
                predictions.push(targetDistance);
            }
        }

        return predictions;
    }

    /**
     * Get detailed inference including detected target.
     */
    getDetailedPrediction(
        splitDistances: number[],
        lapDistance?: number,
        options?: PredictOptions
    ): {
        predictions: number[];
        inferredTarget: number | null;
        system: ScoredMilestoneSystem | null;
    } {
        const currentDistance = splitDistances.length > 0
            ? splitDistances[splitDistances.length - 1]
            : 0;

        let targetDistance = options?.targetDistance ?? options?.maxDistance;
        let inferredTarget: number | null = null;

        if (!targetDistance && this.autoDetectTarget) {
            inferredTarget = this.inferTargetDistance(currentDistance, splitDistances, lapDistance) || null;
            targetDistance = inferredTarget ?? undefined;
        }

        const system = this.milestonePredictor.inferSystem(
            splitDistances,
            lapDistance,
            { ...options, maxDistance: targetDistance }
        );

        const predictions = this.predict(splitDistances, lapDistance, {
            ...options,
            targetDistance,
        });

        return {
            predictions,
            inferredTarget,
            system,
        };
    }
}