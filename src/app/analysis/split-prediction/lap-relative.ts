import { SplitDistancePredictor } from "../../models/sequence/analysis/interface";
import { PredictOptions } from "./milestone-systems";

export class LapRelativePredictor implements SplitDistancePredictor {
    private readonly toleranceMeters: number;

    constructor(toleranceMeters: number = 10) {
        this.toleranceMeters = toleranceMeters;
    }

    isApplicable(splitDistances: number[], lapDistance?: number): boolean {
        // Requires lapDistance and at least 2 splits
        // Ideally needs splits spanning multiple laps to detect patterns
        return (
            lapDistance !== undefined &&
            lapDistance > 0 &&
            splitDistances.length >= 2
        );
    }

    predict(splitDistances: number[], lapDistance?: number, options?: PredictOptions): number[] {
        if (!lapDistance || lapDistance <= 0) {
            return []; // This technique requires lap distance
        }

        if (splitDistances.length < 2) {
            return [];
        }

        // Convert absolute distances to positions within their respective laps
        const lapPositions = splitDistances.map(d => d % lapDistance);
        
        // Find recurring positions (cluster similar positions together)
        const positionClusters = this.clusterPositions(lapPositions, lapDistance);
        
        if (positionClusters.length === 0) {
            return [];
        }

        // Determine which positions are "established" (appear multiple times)
        const establishedPositions = positionClusters
            .filter(cluster => cluster.count >= 2 || splitDistances.length < 4)
            .map(cluster => cluster.center)
            .sort((a, b) => a - b);

        if (establishedPositions.length === 0) {
            return [];
        }

        const predictions: number[] = [];
        let currentDistance = splitDistances[splitDistances.length - 1];
        const maxCount = options?.maxCount ?? 1;
        const maxDistance = options?.maxDistance ?? Infinity;

        while (predictions.length < maxCount) {
            const nextDistance = this.findNextPosition(
                currentDistance,
                lapDistance,
                establishedPositions
            );

            if (nextDistance === null || nextDistance > maxDistance) {
                break;
            }

            predictions.push(nextDistance);
            currentDistance = nextDistance;
        }

        return predictions;
    }

    private findNextPosition(
        currentDistance: number,
        lapDistance: number,
        establishedPositions: number[]
    ): number | null {
        const currentLapNumber = Math.floor(currentDistance / lapDistance);
        const currentLapPosition = currentDistance % lapDistance;

        // Look for next position in current lap
        for (const position of establishedPositions) {
            if (position > currentLapPosition + this.toleranceMeters) {
                return (currentLapNumber * lapDistance) + position;
            }
        }

        // Otherwise, predict first position in next lap
        // Handle position 0 (lap boundary) specially
        const firstPosition = establishedPositions[0];
        if (firstPosition < this.toleranceMeters) {
            // First established position is at lap boundary
            return (currentLapNumber + 1) * lapDistance;
        }

        return ((currentLapNumber + 1) * lapDistance) + firstPosition;
    }

    private clusterPositions(
        positions: number[], 
        lapDistance: number
    ): Array<{ center: number; count: number }> {
        const clusters: Array<{ values: number[]; center: number }> = [];

        for (const pos of positions) {
            let foundCluster = false;

            for (const cluster of clusters) {
                // Handle wrap-around near lap boundary
                const distance = this.circularDistance(pos, cluster.center, lapDistance);

                if (distance <= this.toleranceMeters) {
                    cluster.values.push(pos);
                    cluster.center = this.circularMean(cluster.values, lapDistance);
                    foundCluster = true;
                    break;
                }
            }

            if (!foundCluster) {
                clusters.push({ values: [pos], center: pos });
            }
        }

        return clusters.map(c => ({ 
            center: c.center, 
            count: c.values.length 
        }));
    }

    private circularDistance(a: number, b: number, period: number): number {
        const diff = Math.abs(a - b);
        return Math.min(diff, period - diff);
    }

    private circularMean(values: number[], period: number): number {
        // Use vector averaging for circular mean
        let sinSum = 0;
        let cosSum = 0;

        for (const v of values) {
            const angle = (v / period) * 2 * Math.PI;
            sinSum += Math.sin(angle);
            cosSum += Math.cos(angle);
        }

        const meanAngle = Math.atan2(sinSum, cosSum);
        let result = (meanAngle / (2 * Math.PI)) * period;

        if (result < 0) {
            result += period;
        }

        return result;
    }
}
