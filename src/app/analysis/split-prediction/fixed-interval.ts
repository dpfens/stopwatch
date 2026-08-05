import { SplitDistancePredictor } from "../../models/sequence/analysis/interface";
import { PredictOptions } from "./milestone-systems";

export class FixedIntervalPredictor implements SplitDistancePredictor {
    private readonly tolerancePercent: number;

    constructor(tolerancePercent: number = 0.05) {
        this.tolerancePercent = tolerancePercent;
    }

    isApplicable(splitDistances: number[], lapDistance?: number): boolean {
        // Requires at least 2 splits to compute a delta
        // Does NOT require lapDistance
        return splitDistances.length >= 2;
    }

    predict(splitDistances: number[], lapDistance?: number, options?: PredictOptions): number[] {
        if (splitDistances.length < 2) {
            return [];
        }

        const deltas = this.computeDeltas(splitDistances);
        const dominantInterval = this.findDominantInterval(deltas);

        if (dominantInterval === null) {
            return [];
        }

        const predictions: number[] = [];
        let lastDistance = splitDistances[splitDistances.length - 1];
        const maxCount = options?.maxCount ?? 1;
        const maxDistance = options?.maxDistance ?? Infinity;

        while (predictions.length < maxCount) {
            const nextDistance = lastDistance + dominantInterval;
            if (nextDistance > maxDistance) {
                break;
            }
            predictions.push(nextDistance);
            lastDistance = nextDistance;
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

    private findDominantInterval(deltas: number[]): number | null {
        if (deltas.length === 0) {
            return null;
        }

        // Group deltas by similarity within tolerance
        const clusters: number[][] = [];

        for (const delta of deltas) {
            let foundCluster = false;

            for (const cluster of clusters) {
                const clusterAvg = cluster.reduce((a, b) => a + b, 0) / cluster.length;
                const tolerance = clusterAvg * this.tolerancePercent;

                if (Math.abs(delta - clusterAvg) <= tolerance) {
                    cluster.push(delta);
                    foundCluster = true;
                    break;
                }
            }

            if (!foundCluster) {
                clusters.push([delta]);
            }
        }

        // Find the largest cluster
        const largestCluster = clusters.reduce((a, b) => 
            a.length >= b.length ? a : b
        );

        // Require at least 50% of deltas to match for confidence
        if (largestCluster.length < deltas.length * 0.5) {
            return null;
        }

        // Return the average of the dominant cluster
        return largestCluster.reduce((a, b) => a + b, 0) / largestCluster.length;
    }
}
