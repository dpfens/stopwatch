import { SplitDistancePredictor } from "../../models/sequence/analysis/interface";
import {
    MilestoneSystem,
    ScoredMilestoneSystem,
    getNextMilestones,
} from "./milestone-systems";
import { LapBasedMilestonePredictor } from "./lap-based";
import { RoundNumberAffinityPredictor } from "./round-number-affinity";
import { PaceBasedMilestonePredictor } from "./pace-based";

interface PredictOptions {
    maxCount?: number;
    maxDistance?: number;
    splitTimes?: number[];
}

interface WeightedInference {
    inference: ScoredMilestoneSystem;
    weight: number;
    source: string;
}

/**
 * Composite milestone predictor that combines multiple inference strategies:
 * 
 * 1. Lap-based (highest weight when available) - uses lap distance mapping
 * 2. Round number affinity (medium weight) - scores alignment with systems
 * 3. Pace-based (medium weight when timing available) - uses speed inference
 * 
 * The composite aggregates confidence-weighted votes to pick the best system.
 */
export class CompositeMilestonePredictor implements SplitDistancePredictor {
    private readonly lapPredictor: LapBasedMilestonePredictor;
    private readonly roundNumberPredictor: RoundNumberAffinityPredictor;
    private readonly pacePredictor: PaceBasedMilestonePredictor;

    private readonly minConfidence: number;

    /** Weight multipliers for each signal source */
    private readonly weights = {
        lap: 1.5,        // Lap distance is strongest signal
        roundNumber: 1.0,
        pace: 1.2,       // Pace is quite reliable when available
    };

    constructor(minConfidence: number = 0.3) {
        this.lapPredictor = new LapBasedMilestonePredictor();
        this.roundNumberPredictor = new RoundNumberAffinityPredictor();
        this.pacePredictor = new PaceBasedMilestonePredictor();
        this.minConfidence = minConfidence;
    }

    isApplicable(splitDistances: number[], lapDistance?: number): boolean {
        // Can work with just splits (round number affinity)
        // or with lap distance or timing data
        return splitDistances.length >= 1;
    }

    predict(splitDistances: number[], lapDistance?: number, options?: PredictOptions): number[] {
        const inference = this.inferSystem(splitDistances, lapDistance, options);

        if (!inference || inference.confidence < this.minConfidence) {
            return [];
        }

        const currentDistance = splitDistances.length > 0
            ? splitDistances[splitDistances.length - 1]
            : 0;

        return getNextMilestones(
            inference.system,
            currentDistance,
            options?.maxCount ?? 1,
            options?.maxDistance
        );
    }

    /**
     * Aggregate inferences from all sub-predictors to find best system.
     */
    inferSystem(
        splitDistances: number[],
        lapDistance?: number,
        options?: PredictOptions
    ): ScoredMilestoneSystem | null {
        const weightedInferences: WeightedInference[] = [];

        // 1. Lap-based inference (if lap distance provided)
        if (lapDistance && lapDistance > 0) {
            const lapInference = this.lapPredictor.inferSystem(lapDistance, splitDistances);
            if (lapInference && lapInference.confidence > 0) {
                weightedInferences.push({
                    inference: lapInference,
                    weight: this.weights.lap,
                    source: 'lap',
                });
            }
        }

        // 2. Round number affinity (if enough splits)
        if (splitDistances.length >= 2) {
            const roundInference = this.roundNumberPredictor.inferSystem(
                splitDistances,
                options?.maxDistance
            );
            if (roundInference && roundInference.confidence > 0) {
                weightedInferences.push({
                    inference: roundInference,
                    weight: this.weights.roundNumber,
                    source: 'roundNumber',
                });
            }
        }

        // 3. Pace-based inference (if timing provided)
        if (options?.splitTimes && splitDistances.length >= 2) {
            const paceInference = this.pacePredictor.inferSystem(
                splitDistances,
                options.splitTimes,
                options?.maxDistance
            );
            if (paceInference && paceInference.confidence > 0) {
                weightedInferences.push({
                    inference: paceInference,
                    weight: this.weights.pace,
                    source: 'pace',
                });
            }
        }

        if (weightedInferences.length === 0) {
            return null;
        }

        // Aggregate by system
        return this.aggregateInferences(weightedInferences);
    }

    /**
     * Combine weighted inferences, handling agreement and disagreement.
     */
    private aggregateInferences(
        inferences: WeightedInference[]
    ): ScoredMilestoneSystem {
        // Group by system ID
        const bySystem = new Map<string, WeightedInference[]>();

        for (const wi of inferences) {
            const id = wi.inference.system.id;
            const existing = bySystem.get(id) ?? [];
            existing.push(wi);
            bySystem.set(id, existing);
        }

        // Score each system by weighted confidence sum
        const systemScores: { system: MilestoneSystem; score: number; reasons: string[] }[] = [];

        for (const [systemId, wis] of bySystem.entries()) {
            let totalWeightedConfidence = 0;
            let totalWeight = 0;
            const reasons: string[] = [];

            for (const wi of wis) {
                totalWeightedConfidence += wi.inference.confidence * wi.weight;
                totalWeight += wi.weight;
                reasons.push(...wi.inference.reasons.map(r => `[${wi.source}] ${r}`));
            }

            // Bonus for agreement across sources
            const agreementBonus = wis.length > 1 ? 0.1 * (wis.length - 1) : 0;
            if (wis.length > 1) {
                reasons.push(`Agreement across ${wis.length} inference sources`);
            }

            const avgWeightedConfidence = totalWeightedConfidence / totalWeight;
            const finalScore = Math.min(1, avgWeightedConfidence + agreementBonus);

            systemScores.push({
                system: wis[0].inference.system,
                score: finalScore,
                reasons,
            });
        }

        // Sort by score descending
        systemScores.sort((a, b) => b.score - a.score);

        const best = systemScores[0];

        return {
            system: best.system,
            confidence: best.score,
            reasons: best.reasons,
        };
    }

    /**
     * Get detailed inference results for debugging/UI.
     */
    getDetailedInference(
        splitDistances: number[],
        lapDistance?: number,
        options?: PredictOptions
    ): {
        selectedSystem: ScoredMilestoneSystem | null;
        allInferences: WeightedInference[];
    } {
        const weightedInferences: WeightedInference[] = [];

        if (lapDistance && lapDistance > 0) {
            const lapInference = this.lapPredictor.inferSystem(lapDistance, splitDistances);
            if (lapInference) {
                weightedInferences.push({
                    inference: lapInference,
                    weight: this.weights.lap,
                    source: 'lap',
                });
            }
        }

        if (splitDistances.length >= 2) {
            const roundInference = this.roundNumberPredictor.inferSystem(
                splitDistances,
                options?.maxDistance
            );
            if (roundInference) {
                weightedInferences.push({
                    inference: roundInference,
                    weight: this.weights.roundNumber,
                    source: 'roundNumber',
                });
            }
        }

        if (options?.splitTimes && splitDistances.length >= 2) {
            const paceInference = this.pacePredictor.inferSystem(
                splitDistances,
                options.splitTimes,
                options?.maxDistance
            );
            if (paceInference) {
                weightedInferences.push({
                    inference: paceInference,
                    weight: this.weights.pace,
                    source: 'pace',
                });
            }
        }

        const selectedSystem = weightedInferences.length > 0
            ? this.aggregateInferences(weightedInferences)
            : null;

        return {
            selectedSystem,
            allInferences: weightedInferences,
        };
    }
}