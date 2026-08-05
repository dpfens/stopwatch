import { ObjectiveType, StopwatchState } from "./interfaces";
import { SerializableRegistry, SerializableType, SerializedForm } from "../../utilities/serialization";
import { StopwatchStateController } from "../../controllers/stopwatch/stopwatch-state-controller";

export interface Objective extends SerializableType<Objective> {
    type: ObjectiveType;
    title: string;
    description: string;
    evaluate(stopwatch: StopwatchState): number;
    compare(a: StopwatchState, b: StopwatchState): number;
}

/**
 * Returns true if the stopwatch has any active history.
 * Delegates to StopwatchStateController.isActive() as the single source of truth.
 */
function isActive(state: StopwatchState): boolean {
    return new StopwatchStateController(state).isActive();
}

/**
 * Compares activity status before delegating to objective-specific scoring.
 * Inactive stopwatches always sort last regardless of objective.
 * Returns positive if a is better, negative if b is better, 0 if equal.
 */
function compareWithActivityGuard(
    a: StopwatchState,
    b: StopwatchState,
    scoreFn: (state: StopwatchState) => number
): number {
    const aActive = isActive(a);
    const bActive = isActive(b);

    if (!aActive && !bActive) return 0;
    if (!aActive) return -1; // a is inactive, b wins
    if (!bActive) return 1;  // b is inactive, a wins

    return scoreFn(a) - scoreFn(b);
}

export const registry = new SerializableRegistry<Objective>();

@registry.register('time-minimization')
export class TimeMinimizationObjective implements Objective {
    type: ObjectiveType = 'time-minimization';
    title = 'Time Minimization';
    description = 'Minimize the total elapsed active time.';

    evaluate(stopwatch: StopwatchState): number {
        return new StopwatchStateController(stopwatch).getElapsedTime();
    }

    compare(a: StopwatchState, b: StopwatchState): number {
        return compareWithActivityGuard(a, b,
            state => -this.evaluate(state) // negate: lower time = better
        );
    }


    serialize(): SerializedForm<Objective> {
        return { type: 'time-minimization' };
    }

    deserialize(configuration?: Record<string, unknown>): Objective {
        return TimeMinimizationObjective.fromConfig(configuration);
    }

    static fromConfig(_configuration?: Record<string, unknown>): TimeMinimizationObjective {
        return new TimeMinimizationObjective();
    }
}

@registry.register('unit-accumulation')
export class UnitAccumulationObjective implements Objective {
    type: ObjectiveType = 'unit-accumulation';
    title = 'Unit Accumulation';
    description = 'Maximize the total units (e.g., distance) covered.';

    evaluate(stopwatch: StopwatchState): number {
        return stopwatch.sequence.reduce((acc, event) => {
            if (event.type === 'split' || event.type === 'lap' || event.type === 'stop') {
                return acc + (event.unit?.value ?? 0);
            }
            return acc;
        }, 0);
    }

    compare(a: StopwatchState, b: StopwatchState): number {
        return compareWithActivityGuard(a, b,
            state => this.evaluate(state)
        );
    }

    serialize(): SerializedForm<Objective> {
        return { type: 'unit-accumulation' };
    }

    deserialize(configuration?: Record<string, unknown>): Objective {
        return UnitAccumulationObjective.fromConfig(configuration);
    }

    static fromConfig(_configuration?: Record<string, unknown>): UnitAccumulationObjective {
        return new UnitAccumulationObjective();
    }
}

@registry.register('synchronicity')
export class SynchronicityObjective implements Objective {
    type: ObjectiveType = 'synchronicity';
    title = 'Synchronicity';
    description = 'Measure how well events align with target intervals.';

    targetInterval = 60;  // seconds
    tolerance = 5;        // percent — used to gate whether an interval counts as "on target"

    static fromConfig(configuration?: Record<string, unknown>): SynchronicityObjective {
        const objective = new SynchronicityObjective();
        if (configuration) {
            if (typeof configuration['targetInterval'] === 'number') {
                objective.targetInterval = configuration['targetInterval'];
            }
            if (typeof configuration['tolerance'] === 'number') {
                objective.tolerance = configuration['tolerance'];
            }
        }
        return objective;
    }

    evaluate(stopwatch: StopwatchState): number {
        if (stopwatch.sequence.length < 2) return 0;

        let totalDeviation = 0;
        let intervals = 0;

        for (let i = 1; i < stopwatch.sequence.length; i++) {
            const current = stopwatch.sequence[i];
            const previous = stopwatch.sequence[i - 1];

            if (
                (current.type === 'split' || current.type === 'stop') &&
                (previous.type === 'start' || previous.type === 'split' || previous.type === 'resume')
            ) {
                const intervalMs = Math.abs(current.timestamp.durationFrom(previous.timestamp));
                const targetMs = this.targetInterval * 1000;
                const deviationRatio = Math.abs(intervalMs - targetMs) / targetMs;

                const toleranceRatio = this.tolerance / 100;
                const effectiveDeviation = Math.max(0, deviationRatio - toleranceRatio);

                totalDeviation += effectiveDeviation;
                intervals++;
            }
        }

        if (intervals === 0) return 0;

        const avgDeviation = totalDeviation / intervals;
        return Math.max(0, 1 - avgDeviation);
    }

    compare(a: StopwatchState, b: StopwatchState): number {
        return compareWithActivityGuard(a, b,
            state => this.evaluate(state)
        );
    }

    serialize(): SerializedForm<Objective> {
        return {
            type: 'synchronicity',
            configuration: {
                targetInterval: this.targetInterval,
                tolerance: this.tolerance
            }
        };
    }

    deserialize(configuration?: Record<string, unknown>): Objective {
        return SynchronicityObjective.fromConfig(configuration);
    }
}