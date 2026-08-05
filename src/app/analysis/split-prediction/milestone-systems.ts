export interface PredictOptions {
    maxCount?: number;
    maxDistance?: number;
}


/**
 * Defines a milestone system - a coherent set of checkpoint distances
 * used in a particular sport or measurement context.
 */
export interface MilestoneSystem {
    /** Identifier for this system */
    id: string;

    /** Human-readable name */
    name: string;

    /** 
     * The fundamental unit of this system in meters.
     * Milestones are typically multiples of this.
     */
    baseUnit: number;

    /**
     * Common milestone distances in meters.
     * These are the "round" numbers in this system.
     */
    milestones: number[];

    /**
     * Distance range where this system makes sense.
     * Helps filter inappropriate systems (e.g., don't use marathon
     * milestones for a 200m sprint).
     */
    applicableRange: {
        min: number;
        max: number;
    };

    /**
     * Expected pace range in seconds per meter.
     * Used for pace-based inference.
     */
    paceRange?: {
        min: number; // fastest (lowest sec/m)
        max: number; // slowest (highest sec/m)
    };

    /**
     * Lap distances that strongly suggest this system.
     */
    associatedLapDistances?: number[];
}

/**
 * Result of system inference with confidence scoring.
 */
export interface ScoredMilestoneSystem {
    system: MilestoneSystem;
    confidence: number; // 0-1
    reasons: string[];
}

// ============================================================================
// Standard Milestone Systems
// ============================================================================

export const METRIC_SHORT: MilestoneSystem = {
    id: 'metric-short',
    name: 'Metric (Track/Short)',
    baseUnit: 100,
    milestones: [100, 200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 1600, 2000],
    applicableRange: { min: 0, max: 3000 },
    paceRange: { min: 0.015, max: 0.06 }, // ~2:30-10:00/km
    associatedLapDistances: [200, 400],
};

export const METRIC_MEDIUM: MilestoneSystem = {
    id: 'metric-medium',
    name: 'Metric (Road/Medium)',
    baseUnit: 1000,
    milestones: [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000],
    applicableRange: { min: 1000, max: 15000 },
    paceRange: { min: 0.018, max: 0.09 }, // ~3:00-15:00/km
    associatedLapDistances: [1000],
};

export const METRIC_LONG: MilestoneSystem = {
    id: 'metric-long',
    name: 'Metric (Long Distance)',
    baseUnit: 5000,
    milestones: [5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 42195],
    applicableRange: { min: 5000, max: 100000 },
    paceRange: { min: 0.02, max: 0.12 }, // ~3:20-20:00/km
    associatedLapDistances: [],
};

export const IMPERIAL_MILES: MilestoneSystem = {
    id: 'imperial-miles',
    name: 'Imperial (Miles)',
    baseUnit: 1609.34,
    milestones: [
        1609.34,      // 1 mile
        3218.69,      // 2 miles
        4828.03,      // 3 miles
        5000,         // 5K (often mixed with imperial)
        6437.38,      // 4 miles
        8046.72,      // 5 miles
        10000,        // 10K
        16093.4,      // 10 miles
        21097.5,      // Half marathon
        42195,        // Marathon
    ],
    applicableRange: { min: 1000, max: 50000 },
    paceRange: { min: 0.018, max: 0.09 },
    associatedLapDistances: [1609.34],
};

export const IMPERIAL_QUARTER_MILES: MilestoneSystem = {
    id: 'imperial-quarter',
    name: 'Imperial (Quarter Miles)',
    baseUnit: 402.34,
    milestones: [
        402.34,   // 1/4 mile
        804.67,   // 1/2 mile
        1207.01,  // 3/4 mile
        1609.34,  // 1 mile
    ],
    applicableRange: { min: 0, max: 3000 },
    paceRange: { min: 0.015, max: 0.06 },
    associatedLapDistances: [],
};

export const SWIMMING_SHORT_COURSE: MilestoneSystem = {
    id: 'swimming-sc',
    name: 'Swimming (25m pool)',
    baseUnit: 25,
    milestones: [25, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 800, 1500],
    applicableRange: { min: 0, max: 2000 },
    paceRange: { min: 0.4, max: 1.5 }, // ~40-90 sec/100m
    associatedLapDistances: [25, 50],
};

export const SWIMMING_LONG_COURSE: MilestoneSystem = {
    id: 'swimming-lc',
    name: 'Swimming (50m pool)',
    baseUnit: 50,
    milestones: [50, 100, 150, 200, 250, 300, 400, 500, 800, 1000, 1500],
    applicableRange: { min: 0, max: 2000 },
    paceRange: { min: 0.4, max: 1.5 },
    associatedLapDistances: [50],
};

export const ROWING: MilestoneSystem = {
    id: 'rowing',
    name: 'Rowing',
    baseUnit: 500,
    milestones: [500, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 6000],
    applicableRange: { min: 500, max: 10000 },
    paceRange: { min: 0.1, max: 0.3 }, // ~1:40-2:30/500m
    associatedLapDistances: [500, 1000, 2000],
};

export const CYCLING_SHORT: MilestoneSystem = {
    id: 'cycling-short',
    name: 'Cycling (Track/Short)',
    baseUnit: 250,
    milestones: [250, 500, 750, 1000, 2000, 3000, 4000],
    applicableRange: { min: 0, max: 5000 },
    paceRange: { min: 0.005, max: 0.02 }, // ~30-60 km/h
    associatedLapDistances: [250, 333.33, 400],
};

export const CYCLING_ROAD: MilestoneSystem = {
    id: 'cycling-road',
    name: 'Cycling (Road)',
    baseUnit: 10000,
    milestones: [10000, 20000, 30000, 40000, 50000, 75000, 100000],
    applicableRange: { min: 5000, max: 250000 },
    paceRange: { min: 0.003, max: 0.015 },
    associatedLapDistances: [],
};

// ============================================================================
// System Collections
// ============================================================================

/**
 * All available milestone systems, ordered by general popularity/likelihood.
 */
export const ALL_MILESTONE_SYSTEMS: MilestoneSystem[] = [
    METRIC_SHORT,
    METRIC_MEDIUM,
    METRIC_LONG,
    IMPERIAL_MILES,
    IMPERIAL_QUARTER_MILES,
    SWIMMING_SHORT_COURSE,
    SWIMMING_LONG_COURSE,
    ROWING,
    CYCLING_SHORT,
    CYCLING_ROAD,
];

/**
 * Running-specific systems.
 */
export const RUNNING_SYSTEMS: MilestoneSystem[] = [
    METRIC_SHORT,
    METRIC_MEDIUM,
    METRIC_LONG,
    IMPERIAL_MILES,
    IMPERIAL_QUARTER_MILES,
];

/**
 * Get systems applicable to a given distance range.
 */
export function getApplicableSystems(
    currentDistance: number,
    targetDistance?: number
): MilestoneSystem[] {
    const maxDistance = targetDistance ?? currentDistance * 3;
    
    return ALL_MILESTONE_SYSTEMS.filter(system => 
        system.applicableRange.min <= maxDistance &&
        system.applicableRange.max >= currentDistance
    );
}

/**
 * Find systems associated with a specific lap distance.
 */
export function getSystemsByLapDistance(
    lapDistance: number,
    tolerance: number = 5
): MilestoneSystem[] {
    return ALL_MILESTONE_SYSTEMS.filter(system =>
        system.associatedLapDistances?.some(
            lap => Math.abs(lap - lapDistance) <= tolerance
        )
    );
}

/**
 * Get the next milestone(s) after a given distance for a system.
 */
export function getNextMilestones(
    system: MilestoneSystem,
    currentDistance: number,
    count: number = 1,
    maxDistance?: number
): number[] {
    const results: number[] = [];
    
    for (const milestone of system.milestones) {
        if (milestone > currentDistance) {
            if (maxDistance !== undefined && milestone > maxDistance) {
                break;
            }
            results.push(milestone);
            if (results.length >= count) {
                break;
            }
        }
    }
    
    // If we need more, extrapolate using baseUnit
    if (results.length < count) {
        const lastMilestone = system.milestones[system.milestones.length - 1];
        let next = lastMilestone + system.baseUnit;
        
        while (results.length < count) {
            if (next > currentDistance) {
                if (maxDistance !== undefined && next > maxDistance) {
                    break;
                }
                results.push(next);
            }
            next += system.baseUnit;
        }
    }
    
    return results;
}