import { SplitDistancePredictor } from "../../models/sequence/analysis/interface";
import { PredictOptions } from "./milestone-systems";

export class RatioFractionPredictor implements SplitDistancePredictor {
    // Common fractions athletes tend to use
    private readonly commonFractions = [
        1/8, 1/6, 1/5, 1/4, 1/3, 3/8, 2/5, 1/2, 
        3/5, 5/8, 2/3, 3/4, 4/5, 5/6, 7/8, 1
    ];
    
    private readonly fractionTolerance: number;

    constructor(fractionTolerance: number = 0.03) {
        this.fractionTolerance = fractionTolerance;
    }

    isApplicable(splitDistances: number[], lapDistance?: number): boolean {
        // Requires lapDistance and at least 2 splits
        return (
            lapDistance !== undefined &&
            lapDistance > 0 &&
            splitDistances.length >= 2
        );
    }

    predict(splitDistances: number[], lapDistance?: number, options?: PredictOptions): number[] {
        if (!lapDistance || lapDistance <= 0) {
            return [];
        }

        if (splitDistances.length < 2) {
            return [];
        }

        // Convert positions to fractions of lap
        const fractions = splitDistances.map(d => (d % lapDistance) / lapDistance);

        // Snap each fraction to nearest common fraction
        const snappedFractions = fractions
            .map(f => this.snapToCommonFraction(f))
            .filter((f): f is number => f !== null);

        if (snappedFractions.length < 2) {
            return [];
        }

        // Find which fractions appear consistently
        const fractionCounts = new Map<number, number>();
        for (const frac of snappedFractions) {
            fractionCounts.set(frac, (fractionCounts.get(frac) || 0) + 1);
        }

        // Keep fractions that appear more than once (or all if few samples)
        const establishedFractions = Array.from(fractionCounts.entries())
            .filter(([_, count]) => count >= 2 || splitDistances.length < 4)
            .map(([frac, _]) => frac)
            .sort((a, b) => a - b);

        if (establishedFractions.length === 0) {
            return [];
        }

        const predictions: number[] = [];
        let currentDistance = splitDistances[splitDistances.length - 1];
        const maxCount = options?.maxCount ?? 1;
        const maxDistance = options?.maxDistance ?? Infinity;

        while (predictions.length < maxCount) {
            const nextDistance = this.findNextFractionDistance(
                currentDistance,
                lapDistance,
                establishedFractions
            );

            if (nextDistance === null || nextDistance > maxDistance) {
                break;
            }

            predictions.push(nextDistance);
            currentDistance = nextDistance;
        }

        return predictions;
    }

    private findNextFractionDistance(
        currentDistance: number,
        lapDistance: number,
        establishedFractions: number[]
    ): number | null {
        const currentLapNumber = Math.floor(currentDistance / lapDistance);
        const currentFraction = (currentDistance % lapDistance) / lapDistance;

        // Find next fraction in current lap
        for (const fraction of establishedFractions) {
            if (fraction > currentFraction + this.fractionTolerance) {
                return (currentLapNumber * lapDistance) + (fraction * lapDistance);
            }
        }

        // Wrap to next lap
        const firstFraction = establishedFractions[0];
        const nextLapStart = (currentLapNumber + 1) * lapDistance;

        if (firstFraction < this.fractionTolerance) {
            return nextLapStart;
        }

        return nextLapStart + (firstFraction * lapDistance);
    }

    private snapToCommonFraction(value: number): number | null {
        // Handle wrap-around (value near 0 or 1)
        const normalized = value % 1;

        let bestFraction: number | null = null;
        let bestDistance = Infinity;

        for (const fraction of this.commonFractions) {
            const distance = Math.abs(normalized - fraction);
            const wrappedDistance = Math.abs(normalized - (fraction - 1)); // Handle near-zero

            const minDistance = Math.min(distance, wrappedDistance);

            if (minDistance < this.fractionTolerance && minDistance < bestDistance) {
                bestDistance = minDistance;
                bestFraction = fraction;
            }
        }

        return bestFraction;
    }
}
