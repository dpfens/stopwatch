import { SplitDistancePredictor } from "../../models/sequence/analysis/interface";


interface PredictOptions {
    maxCount?: number;
    maxDistance?: number;
}

/**
 * A more sophisticated GCD predictor that identifies which positions on the 
 * GCD grid are actually used, then predicts the next used position.
 * 
 * Example: splits at [200, 600, 1000] 
 * - GCD = 200, grid = [200, 400, 600, 800, 1000, ...]
 * - Used positions (mod pattern): [1, 3, 5] (odd multiples)
 * - Predicts: 1400 (next odd multiple), not 1200
 */
export class GCDPatternPredictor implements SplitDistancePredictor {
    private readonly minIntervalMeters: number;
    private readonly roundingTolerance: number;

    constructor(minIntervalMeters: number = 50, roundingTolerance: number = 1) {
        this.minIntervalMeters = minIntervalMeters;
        this.roundingTolerance = roundingTolerance;
    }

    isApplicable(splitDistances: number[], lapDistance?: number): boolean {
        return splitDistances.length >= 2;
    }

    predict(splitDistances: number[], lapDistance?: number, options?: PredictOptions): number[] {
        if (splitDistances.length < 2) {
            return [];
        }

        const roundedDistances = splitDistances.map(d => this.roundToTolerance(d));
        const gcd = this.computeGCD(roundedDistances);

        if (gcd < this.minIntervalMeters) {
            return [];
        }

        // Convert distances to grid indices
        const gridIndices = roundedDistances.map(d => Math.round(d / gcd));

        // Find the pattern in grid usage (deltas between indices)
        const indexDeltas = this.computeDeltas(gridIndices);
        
        if (indexDeltas.length === 0) {
            return [];
        }

        // Detect if there's a repeating pattern in index deltas
        const pattern = this.detectPattern(indexDeltas);
        
        const predictions: number[] = [];
        let lastIndex = gridIndices[gridIndices.length - 1];
        let patternPosition = indexDeltas.length % pattern.length;
        const maxCount = options?.maxCount ?? 1;
        const maxDistance = options?.maxDistance ?? Infinity;

        while (predictions.length < maxCount) {
            const nextIndexDelta = pattern[patternPosition];
            const nextIndex = lastIndex + nextIndexDelta;
            const nextDistance = nextIndex * gcd;

            if (nextDistance > maxDistance) {
                break;
            }

            predictions.push(nextDistance);
            lastIndex = nextIndex;
            patternPosition = (patternPosition + 1) % pattern.length;
        }

        return predictions;
    }

    private computeDeltas(values: number[]): number[] {
        const deltas: number[] = [];
        for (let i = 1; i < values.length; i++) {
            deltas.push(values[i] - values[i - 1]);
        }
        return deltas;
    }

    private roundToTolerance(value: number): number {
        if (this.roundingTolerance <= 1) {
            return Math.round(value);
        }
        return Math.round(value / this.roundingTolerance) * this.roundingTolerance;
    }

    private computeGCD(values: number[]): number {
        const positiveInts = values
            .map(v => Math.abs(Math.round(v)))
            .filter(v => v > 0);

        if (positiveInts.length === 0) {
            return 0;
        }

        return positiveInts.reduce((a, b) => this.gcd(a, b));
    }

    private gcd(a: number, b: number): number {
        a = Math.abs(a);
        b = Math.abs(b);

        while (b !== 0) {
            const temp = b;
            b = a % b;
            a = temp;
        }

        return a;
    }

    private detectPattern(deltas: number[]): number[] {
        if (deltas.length === 0) {
            return [1]; // Default: every grid position
        }

        // Try to find a repeating cycle
        for (let cycleLen = 1; cycleLen <= Math.floor(deltas.length / 2); cycleLen++) {
            const candidate = deltas.slice(0, cycleLen);
            
            let matches = true;
            for (let i = 0; i < deltas.length; i++) {
                if (deltas[i] !== candidate[i % cycleLen]) {
                    matches = false;
                    break;
                }
            }

            if (matches) {
                return candidate;
            }
        }

        // No exact cycle found - check if all deltas are the same
        const allSame = deltas.every(d => d === deltas[0]);
        if (allSame) {
            return [deltas[0]];
        }

        // Fall back to using the full sequence as the pattern
        // (or just use mode of deltas for robustness)
        const deltaCounts = new Map<number, number>();
        for (const d of deltas) {
            deltaCounts.set(d, (deltaCounts.get(d) || 0) + 1);
        }

        const mostCommonDelta = [...deltaCounts.entries()]
            .sort((a, b) => b[1] - a[1])[0][0];

        return [mostCommonDelta];
    }
}