import { SplitDistancePredictor } from "../../models/sequence/analysis/interface";
import {
    MilestoneSystem,
    ScoredMilestoneSystem,
    ALL_MILESTONE_SYSTEMS,
    getApplicableSystems,
    getNextMilestones,
} from "./milestone-systems";

interface PredictOptions {
    maxCount?: number;
    maxDistance?: number;
}

/**
 * Infers milestone system by scoring how well existing splits
 * align with each candidate system's "round numbers."
 * 
 * Based on the principle that people prefer round numbers
 * (Benford's Law adjacent) - if splits are at 1000, 2000, 3000,
 * that's strong evidence for a metric 1km system.
 */
export class RoundNumberAffinityPredictor implements SplitDistancePredictor {
    private readonly alignmentThreshold: number;
    private readonly minConfidence: number;

    /**
     * @param alignmentThreshold - Max distance from a milestone to count as aligned (meters)
     * @param minConfidence - Minimum confidence to make a prediction
     */
    constructor(alignmentThreshold: number = 20, minConfidence: number = 0.3) {
        this.alignmentThreshold = alignmentThreshold;
        this.minConfidence = minConfidence;
    }

    isApplicable(splitDistances: number[], lapDistance?: number): boolean {
        // Needs at least 2 splits to detect a pattern
        return splitDistances.length >= 2;
    }

    predict(splitDistances: number[], lapDistance?: number, options?: PredictOptions): number[] {
        if (splitDistances.length < 2) {
            return [];
        }

        const inference = this.inferSystem(splitDistances, options?.maxDistance);

        if (!inference || inference.confidence < this.minConfidence) {
            return [];
        }

        const currentDistance = splitDistances[splitDistances.length - 1];

        return getNextMilestones(
            inference.system,
            currentDistance,
            options?.maxCount ?? 1,
            options?.maxDistance
        );
    }

    /**
     * Exposed for composition - score all systems and return best match.
     */
    inferSystem(
        splitDistances: number[],
        maxDistance?: number
    ): ScoredMilestoneSystem | null {
        const currentDistance = splitDistances[splitDistances.length - 1];
        const candidates = getApplicableSystems(currentDistance, maxDistance);

        if (candidates.length === 0) {
            return null;
        }

        const scored = candidates.map(system => this.scoreSystem(system, splitDistances));

        // Sort by confidence descending
        scored.sort((a, b) => b.confidence - a.confidence);

        // Return best if it meets threshold
        if (scored[0].confidence >= this.minConfidence) {
            return scored[0];
        }

        return null;
    }

    /**
     * Score how well splits align with a milestone system.
     */
    private scoreSystem(
        system: MilestoneSystem,
        splitDistances: number[]
    ): ScoredMilestoneSystem {
        const reasons: string[] = [];
        let totalScore = 0;
        let maxPossibleScore = 0;

        // 1. Milestone alignment score
        const alignmentResult = this.computeAlignmentScore(system, splitDistances);
        totalScore += alignmentResult.score * 0.5;
        maxPossibleScore += 0.5;
        if (alignmentResult.alignedCount > 0) {
            reasons.push(
                `${alignmentResult.alignedCount}/${splitDistances.length} splits align with ${system.name} milestones`
            );
        }

        // 2. Base unit divisibility score
        const divisibilityResult = this.computeDivisibilityScore(system, splitDistances);
        totalScore += divisibilityResult.score * 0.3;
        maxPossibleScore += 0.3;
        if (divisibilityResult.score > 0.5) {
            reasons.push(`Splits divisible by ${system.baseUnit}m base unit`);
        }

        // 3. Distance scale appropriateness
        const scaleResult = this.computeScaleScore(system, splitDistances);
        totalScore += scaleResult.score * 0.2;
        maxPossibleScore += 0.2;
        if (scaleResult.score > 0.5) {
            reasons.push(`Distance scale appropriate for ${system.name}`);
        }

        const confidence = maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;

        return {
            system,
            confidence,
            reasons,
        };
    }

    /**
     * How many splits fall close to the system's defined milestones?
     */
    private computeAlignmentScore(
        system: MilestoneSystem,
        splitDistances: number[]
    ): { score: number; alignedCount: number } {
        let alignedCount = 0;

        for (const split of splitDistances) {
            const nearestMilestone = this.findNearestMilestone(system, split);
            if (nearestMilestone !== null) {
                const distance = Math.abs(split - nearestMilestone);
                if (distance <= this.alignmentThreshold) {
                    alignedCount++;
                }
            }
        }

        const score = splitDistances.length > 0 
            ? alignedCount / splitDistances.length 
            : 0;

        return { score, alignedCount };
    }

    /**
     * How well do splits divide evenly by the base unit?
     */
    private computeDivisibilityScore(
        system: MilestoneSystem,
        splitDistances: number[]
    ): { score: number } {
        if (splitDistances.length === 0) {
            return { score: 0 };
        }

        let totalRemainder = 0;

        for (const split of splitDistances) {
            // Compute how close to a multiple of baseUnit
            const remainder = split % system.baseUnit;
            const normalizedRemainder = Math.min(remainder, system.baseUnit - remainder);
            totalRemainder += normalizedRemainder / system.baseUnit;
        }

        const avgNormalizedRemainder = totalRemainder / splitDistances.length;
        const score = 1 - avgNormalizedRemainder * 2; // 0 remainder = 1.0, 0.5 remainder = 0

        return { score: Math.max(0, score) };
    }

    /**
     * Is the current distance scale appropriate for this system?
     */
    private computeScaleScore(
        system: MilestoneSystem,
        splitDistances: number[]
    ): { score: number } {
        if (splitDistances.length === 0) {
            return { score: 0.5 }; // Neutral
        }

        const currentDistance = splitDistances[splitDistances.length - 1];
        const { min, max } = system.applicableRange;

        // Perfect score if in the middle of the range
        const rangeSize = max - min;
        const positionInRange = (currentDistance - min) / rangeSize;

        if (positionInRange < 0) {
            // Below range - might grow into it
            return { score: Math.max(0, 0.5 + positionInRange) };
        } else if (positionInRange > 1) {
            // Above range - probably wrong system
            return { score: Math.max(0, 0.5 - (positionInRange - 1)) };
        } else {
            // In range - score based on being in a reasonable part
            // Slightly favor early/middle of range
            return { score: 0.5 + 0.5 * (1 - Math.abs(positionInRange - 0.3)) };
        }
    }

    /**
     * Find the nearest milestone in the system to a given distance.
     */
    private findNearestMilestone(system: MilestoneSystem, distance: number): number | null {
        let nearest: number | null = null;
        let nearestDistance = Infinity;

        // Check defined milestones
        for (const milestone of system.milestones) {
            const d = Math.abs(distance - milestone);
            if (d < nearestDistance) {
                nearestDistance = d;
                nearest = milestone;
            }
        }

        // Also check extrapolated milestones (multiples of base unit)
        const nearestMultiple = Math.round(distance / system.baseUnit) * system.baseUnit;
        const multipleDistance = Math.abs(distance - nearestMultiple);
        if (multipleDistance < nearestDistance) {
            nearest = nearestMultiple;
        }

        return nearest;
    }
}