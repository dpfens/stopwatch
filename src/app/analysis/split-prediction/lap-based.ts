import { SplitDistancePredictor } from "../../models/sequence/analysis/interface";
import {
    MilestoneSystem,
    ScoredMilestoneSystem,
    ALL_MILESTONE_SYSTEMS,
    getNextMilestones,
} from "./milestone-systems";

interface PredictOptions {
    maxCount?: number;
    maxDistance?: number;
}

/**
 * Infers milestone system based on lap distance.
 * 
 * Lap distance is the strongest signal for activity type:
 * - 25m/50m → Swimming
 * - 200m/400m → Track running
 * - 500m/2000m → Rowing
 * - etc.
 * 
 * When lap distance matches a known sport, this predictor has high confidence.
 */
export class LapBasedMilestonePredictor implements SplitDistancePredictor {
    private readonly lapMappings: Map<number, { system: MilestoneSystem; confidence: number }[]>;
    private readonly tolerance: number;

    constructor(tolerance: number = 5) {
        this.tolerance = tolerance;
        this.lapMappings = this.buildLapMappings();
    }

    isApplicable(splitDistances: number[], lapDistance?: number): boolean {
        // Requires lap distance to function
        return lapDistance !== undefined && lapDistance > 0;
    }

    predict(splitDistances: number[], lapDistance?: number, options?: PredictOptions): number[] {
        if (!lapDistance || lapDistance <= 0) {
            return [];
        }

        const inference = this.inferSystem(lapDistance, splitDistances);
        
        if (!inference || inference.confidence < 0.3) {
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
     * Exposed for composition - allows other predictors to use this inference.
     */
    inferSystem(lapDistance: number, splitDistances: number[]): ScoredMilestoneSystem | null {
        const candidates = this.findMatchingSystems(lapDistance);

        if (candidates.length === 0) {
            return null;
        }

        // If only one match, use it
        if (candidates.length === 1) {
            return {
                system: candidates[0].system,
                confidence: candidates[0].confidence,
                reasons: [`Lap distance ${lapDistance}m matches ${candidates[0].system.name}`],
            };
        }

        // Multiple matches - use distance scale to disambiguate
        const currentDistance = splitDistances.length > 0
            ? splitDistances[splitDistances.length - 1]
            : 0;

        const scored = candidates.map(c => {
            let adjustedConfidence = c.confidence;
            const reasons = [`Lap distance ${lapDistance}m matches ${c.system.name}`];

            // Boost confidence if current distance is in applicable range
            const { min, max } = c.system.applicableRange;
            if (currentDistance >= min && currentDistance <= max) {
                adjustedConfidence *= 1.2;
                reasons.push(`Current distance ${currentDistance}m in applicable range`);
            } else if (currentDistance > max) {
                adjustedConfidence *= 0.5;
                reasons.push(`Current distance exceeds typical range`);
            }

            return {
                system: c.system,
                confidence: Math.min(adjustedConfidence, 1),
                reasons,
            };
        });

        // Return highest confidence
        scored.sort((a, b) => b.confidence - a.confidence);
        return scored[0];
    }

    private findMatchingSystems(
        lapDistance: number
    ): { system: MilestoneSystem; confidence: number }[] {
        const matches: { system: MilestoneSystem; confidence: number }[] = [];

        for (const [targetLap, systems] of this.lapMappings.entries()) {
            if (Math.abs(lapDistance - targetLap) <= this.tolerance) {
                matches.push(...systems);
            }
        }

        // Also check baseUnit matches (weaker signal)
        if (matches.length === 0) {
            for (const system of ALL_MILESTONE_SYSTEMS) {
                if (Math.abs(lapDistance - system.baseUnit) <= this.tolerance) {
                    matches.push({ system, confidence: 0.5 });
                }
                // Check if lap divides evenly into baseUnit
                else if (system.baseUnit % lapDistance < this.tolerance) {
                    matches.push({ system, confidence: 0.3 });
                }
            }
        }

        return matches;
    }

    private buildLapMappings(): Map<number, { system: MilestoneSystem; confidence: number }[]> {
        const mappings = new Map<number, { system: MilestoneSystem; confidence: number }[]>();

        for (const system of ALL_MILESTONE_SYSTEMS) {
            if (!system.associatedLapDistances) continue;

            for (const lap of system.associatedLapDistances) {
                const existing = mappings.get(lap) ?? [];
                existing.push({ system, confidence: 0.9 });
                mappings.set(lap, existing);
            }
        }

        return mappings;
    }
}