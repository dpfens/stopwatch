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
    /** 
     * Split times in milliseconds corresponding to each split distance.
     * Required for pace-based inference.
     */
    splitTimes?: number[];
}

/**
 * Infers milestone system based on pace (speed) between splits.
 * 
 * Different activities have characteristic pace ranges:
 * - Swimming: 40-90 sec/100m
 * - Running: 3-10 min/km
 * - Cycling: 1-3 min/km
 * - Rowing: 1:40-2:30/500m
 * 
 * This predictor requires timing data to function.
 */
export class PaceBasedMilestonePredictor implements SplitDistancePredictor {
    private readonly minConfidence: number;

    constructor(minConfidence: number = 0.4) {
        this.minConfidence = minConfidence;
    }

    isApplicable(splitDistances: number[], lapDistance?: number): boolean {
        // This predictor requires timing data, which comes via options
        // We return true here and check for timing in predict()
        return splitDistances.length >= 2;
    }

    predict(splitDistances: number[], lapDistance?: number, options?: PredictOptions): number[] {
        if (splitDistances.length < 2 || !options?.splitTimes) {
            return [];
        }

        const inference = this.inferSystem(
            splitDistances,
            options.splitTimes,
            options.maxDistance
        );

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
     * Exposed for composition - infer system from pace data.
     */
    inferSystem(
        splitDistances: number[],
        splitTimes: number[],
        maxDistance?: number
    ): ScoredMilestoneSystem | null {
        if (splitDistances.length < 2 || splitTimes.length < splitDistances.length) {
            return null;
        }

        // Compute average pace (seconds per meter)
        const pace = this.computeAveragePace(splitDistances, splitTimes);

        if (pace === null || pace <= 0) {
            return null;
        }

        const currentDistance = splitDistances[splitDistances.length - 1];
        const candidates = getApplicableSystems(currentDistance, maxDistance);

        const scored = candidates
            .map(system => this.scorePaceMatch(system, pace, splitDistances))
            .filter(s => s.confidence > 0);

        if (scored.length === 0) {
            return null;
        }

        scored.sort((a, b) => b.confidence - a.confidence);
        return scored[0];
    }

    /**
     * Compute average pace across all splits (seconds per meter).
     */
    private computeAveragePace(
        splitDistances: number[],
        splitTimes: number[]
    ): number | null {
        const paces: number[] = [];

        for (let i = 1; i < splitDistances.length; i++) {
            const distanceDelta = splitDistances[i] - splitDistances[i - 1];
            const timeDelta = (splitTimes[i] - splitTimes[i - 1]) / 1000; // to seconds

            if (distanceDelta > 0 && timeDelta > 0) {
                paces.push(timeDelta / distanceDelta);
            }
        }

        if (paces.length === 0) {
            return null;
        }

        // Return median pace to be robust to outliers
        paces.sort((a, b) => a - b);
        const mid = Math.floor(paces.length / 2);
        return paces.length % 2 === 0
            ? (paces[mid - 1] + paces[mid]) / 2
            : paces[mid];
    }

    /**
     * Score how well the observed pace matches a system's expected pace range.
     */
    private scorePaceMatch(
        system: MilestoneSystem,
        pace: number,
        splitDistances: number[]
    ): ScoredMilestoneSystem {
        const reasons: string[] = [];

        if (!system.paceRange) {
            // System doesn't have pace data - give neutral score
            return {
                system,
                confidence: 0.3,
                reasons: ['No pace data for comparison'],
            };
        }

        const { min, max } = system.paceRange;

        // Check if pace is within range
        if (pace >= min && pace <= max) {
            // Compute how centered the pace is in the range
            const rangeSize = max - min;
            const positionInRange = (pace - min) / rangeSize;
            
            // Favor middle of range slightly
            const centeredness = 1 - Math.abs(positionInRange - 0.5) * 2;
            const confidence = 0.6 + 0.4 * centeredness;

            const paceDisplay = this.formatPace(pace, system);
            reasons.push(`Pace ${paceDisplay} matches ${system.name}`);

            return { system, confidence, reasons };
        }

        // Pace outside range - compute how far out
        let distanceOutside: number;
        if (pace < min) {
            distanceOutside = (min - pace) / min;
            reasons.push(`Pace faster than typical ${system.name} range`);
        } else {
            distanceOutside = (pace - max) / max;
            reasons.push(`Pace slower than typical ${system.name} range`);
        }

        // Decay confidence based on how far outside
        const confidence = Math.max(0, 0.4 - distanceOutside * 0.5);

        return { system, confidence, reasons };
    }

    /**
     * Format pace for human-readable display.
     */
    private formatPace(secPerMeter: number, system: MilestoneSystem): string {
        // Choose display unit based on system
        if (system.id.includes('swimming')) {
            // sec/100m
            const secPer100 = secPerMeter * 100;
            const min = Math.floor(secPer100 / 60);
            const sec = Math.round(secPer100 % 60);
            return `${min}:${sec.toString().padStart(2, '0')}/100m`;
        } else if (system.id.includes('rowing')) {
            // sec/500m
            const secPer500 = secPerMeter * 500;
            const min = Math.floor(secPer500 / 60);
            const sec = Math.round(secPer500 % 60);
            return `${min}:${sec.toString().padStart(2, '0')}/500m`;
        } else if (system.id.includes('cycling')) {
            // km/h
            const kmPerHour = (1 / secPerMeter) * 3.6;
            return `${kmPerHour.toFixed(1)} km/h`;
        } else {
            // min/km (default for running)
            const secPerKm = secPerMeter * 1000;
            const min = Math.floor(secPerKm / 60);
            const sec = Math.round(secPerKm % 60);
            return `${min}:${sec.toString().padStart(2, '0')}/km`;
        }
    }
}