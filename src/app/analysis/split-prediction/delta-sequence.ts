import { SplitDistancePredictor } from "../../models/sequence/analysis/interface";
import { PredictOptions } from "./milestone-systems";

export class DeltaSequencePredictor implements SplitDistancePredictor {
    private readonly tolerancePercent: number;
    private readonly maxCycleLength: number;
    private readonly minMatchRate: number;

    constructor(tolerancePercent: number = 0.05, maxCycleLength: number = 8, minMatchRate = 0.8) {
        this.tolerancePercent = tolerancePercent;
        this.maxCycleLength = maxCycleLength;
        this.minMatchRate = minMatchRate;
    }

    isApplicable(splitDistances: number[], lapDistance?: number): boolean {
        // Requires at least 3 splits (2 deltas) to detect any pattern
        // Works better with more data; ideally 2x the cycle length
        // Does NOT require lapDistance
        return splitDistances.length >= 3;
    }

    predict(splitDistances: number[], lapDistance?: number, options?: PredictOptions): number[] {
        if (splitDistances.length < 3) {
            return []; // Need at least 3 splits to detect a pattern in deltas
        }

        const deltas = this.computeDeltas(splitDistances);

        // Try to find a repeating cycle in the deltas
        const cycle = this.detectCycle(deltas);

        if (cycle === null) {
            return [];
        }

        const predictions: number[] = [];
        let lastDistance = splitDistances[splitDistances.length - 1];
        let cyclePosition = deltas.length % cycle.length;
        const maxCount = options?.maxCount ?? 1;
        const maxDistance = options?.maxDistance ?? Infinity;

        while (predictions.length < maxCount) {
            const nextDelta = cycle[cyclePosition];
            const nextDistance = lastDistance + nextDelta;

            if (nextDistance > maxDistance) {
                break;
            }

            predictions.push(nextDistance);
            lastDistance = nextDistance;
            cyclePosition = (cyclePosition + 1) % cycle.length;
        }

        return predictions;
    }

    private computeDeltas(distances: number[]): number[] {
        const deltas: number[] = [];
        for (let i = 1; i < distances.length; i++) {
            deltas.push(distances[i] - distances[i - 1]);
        }
        return deltas;
    }

    private detectCycle(deltas: number[]): number[] | null {
        if (deltas.length < 2) {
            return null;
        }

        // Try cycle lengths from 1 to maxCycleLength
        for (let cycleLen = 1; cycleLen <= Math.min(this.maxCycleLength, Math.floor(deltas.length / 2)); cycleLen++) {
            const candidate = deltas.slice(0, cycleLen);

            if (this.validateCycle(deltas, candidate)) {
                return this.refineCycle(deltas, candidate);
            }
        }

        return null;
    }

    private validateCycle(deltas: number[], candidate: number[]): boolean {
        let matchCount = 0;
        let totalComparisons = 0;

        for (let i = 0; i < deltas.length; i++) {
            const expectedDelta = candidate[i % candidate.length];
            const actualDelta = deltas[i];
            const tolerance = expectedDelta * this.tolerancePercent;

            totalComparisons++;
            if (Math.abs(actualDelta - expectedDelta) <= tolerance) {
                matchCount++;
            }
        }

        return totalComparisons >= 2 && (matchCount / totalComparisons) >= this.minMatchRate;
    }

    private refineCycle(deltas: number[], candidate: number[]): number[] {
        // Average matching deltas to get a refined cycle
        const refined: number[] = [];

        for (let i = 0; i < candidate.length; i++) {
            const matchingDeltas: number[] = [];

            for (let j = i; j < deltas.length; j += candidate.length) {
                matchingDeltas.push(deltas[j]);
            }

            refined.push(
                matchingDeltas.reduce((a, b) => a + b, 0) / matchingDeltas.length
            );
        }

        return refined;
    }
}
