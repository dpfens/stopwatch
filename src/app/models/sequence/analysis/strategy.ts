import { StopwatchState, ContextualStopwatchEntity, StopwatchAnalyticsTrait } from "../interfaces";
import { AnalysisInsight } from "./interface";

export interface ConfidenceInterval {
    lowerBound: number;
    upperBound: number;
    confidenceLevel?: number; // Optional: e.g., 0.95 for 95% CI
}

export interface PredictionResult {
    value: number;
    confidence: ConfidenceInterval;
}

// Time-based (predict time after target distance)
export interface TimeCastingStrategy {
    predict(
        elapsedTimes: number[],
        elapsedDistances: number[],
        targetDistance: number
    ): PredictionResult; // returns predicted remaining time
}

// Distance-based (predict distance after target time)
export interface DistanceCastingStrategy {
    predict(
        elapsedTimes: number[],
        elapsedDistances: [],
        targetTime: number
    ): PredictionResult; // returns predicted total distance
}