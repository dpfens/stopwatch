/**
 * Parameterized function types with static implementations.
 * 
 * Instead of magic strings like "exponential" or "linear", we use actual functions
 * that can be passed to strategies. This allows users to define custom behaviors
 * while providing sensible defaults.
 */

import { WeightFunction } from './interface';

// =============================================================================
// WEIGHT FUNCTIONS
// =============================================================================

/**
 * Creates an exponential decay weight function.
 * More recent observations receive exponentially higher weight.
 * 
 * @param alpha - Decay rate (0 < alpha ≤ 1). Higher = more emphasis on recent.
 */
export const exponentialDecayWeight = (alpha: number): WeightFunction => {
    if (alpha <= 0 || alpha > 1) {
        throw new Error('Alpha must be in (0, 1]');
    }
    return (index: number, total: number): number => {
        const recency = total - 1 - index; // 0 for most recent
        return Math.pow(alpha, recency);
    };
};

/**
 * Creates a linear decay weight function.
 * Weight decreases linearly from most recent to oldest.
 * 
 * @param minWeight - Minimum weight for oldest observation (default: 0.1)
 */
export const linearDecayWeight = (minWeight: number = 0.1): WeightFunction => {
    if (minWeight < 0 || minWeight > 1) {
        throw new Error('minWeight must be in [0, 1]');
    }
    return (index: number, total: number): number => {
        if (total <= 1) return 1;
        const position = index / (total - 1); // 0 = oldest, 1 = newest
        return minWeight + position * (1 - minWeight);
    };
};

/**
 * Creates an inverse (1/x) decay weight function.
 * Weight is inversely proportional to age.
 * 
 * @param offset - Offset to prevent division by zero (default: 1)
 */
export const inverseDecayWeight = (offset: number = 1): WeightFunction => {
    return (index: number, total: number): number => {
        const age = total - index; // 1 for most recent
        return 1 / (age + offset - 1);
    };
};

/**
 * Uniform weights - all observations weighted equally.
 */
export const uniformWeight: WeightFunction = (_index: number, _total: number): number => 1;

/**
 * Triangular weights - peaks at center observation.
 */
export const triangularWeight: WeightFunction = (index: number, total: number): number => {
    if (total <= 1) return 1;
    const center = (total - 1) / 2;
    const distance = Math.abs(index - center);
    return 1 - distance / (center + 1);
};

// =============================================================================
// TRANSFORMATION FUNCTIONS (for Generalized Progression)
// =============================================================================

/**
 * A transformation function and its inverse for the Box-Cox family.
 */
export interface TransformPair {
    /** Forward transformation */
    transform: (x: number) => number;
    /** Inverse transformation */
    inverse: (y: number) => number;
    /** Human-readable name */
    name: string;
    /** Lambda value in Box-Cox family (for reference) */
    lambda: number | null;
}

/**
 * Identity transformation (arithmetic/linear progression).
 * f(x) = x
 */
export const identityTransform: TransformPair = {
    transform: (x: number) => x,
    inverse: (y: number) => y,
    name: 'identity',
    lambda: 1
};

/**
 * Logarithmic transformation (geometric/multiplicative progression).
 * f(x) = ln(x)
 */
export const logTransform: TransformPair = {
    transform: (x: number) => {
        if (x <= 0) throw new Error('Log transform requires positive values');
        return Math.log(x);
    },
    inverse: (y: number) => Math.exp(y),
    name: 'logarithmic',
    lambda: 0
};

/**
 * Reciprocal transformation (harmonic progression).
 * f(x) = 1/x
 */
export const reciprocalTransform: TransformPair = {
    transform: (x: number) => {
        if (x === 0) throw new Error('Reciprocal transform requires non-zero values');
        return 1 / x;
    },
    inverse: (y: number) => {
        if (y === 0) throw new Error('Cannot invert zero');
        return 1 / y;
    },
    name: 'reciprocal',
    lambda: -1
};

/**
 * Square root transformation.
 * f(x) = √x
 */
export const sqrtTransform: TransformPair = {
    transform: (x: number) => {
        if (x < 0) throw new Error('Square root transform requires non-negative values');
        return Math.sqrt(x);
    },
    inverse: (y: number) => y * y,
    name: 'square-root',
    lambda: 0.5
};

/**
 * Creates a Box-Cox transformation for arbitrary lambda.
 * f(x; λ) = (x^λ - 1) / λ  when λ ≠ 0
 * f(x; 0) = ln(x)
 * 
 * @param lambda - The Box-Cox parameter
 */
export const boxCoxTransform = (lambda: number): TransformPair => {
    if (Math.abs(lambda) < 1e-10) {
        return { ...logTransform, lambda };
    }
    
    return {
        transform: (x: number) => {
            if (x <= 0) throw new Error('Box-Cox transform requires positive values');
            return (Math.pow(x, lambda) - 1) / lambda;
        },
        inverse: (y: number) => {
            const inner = y * lambda + 1;
            if (inner <= 0) {
                throw new Error('Box-Cox inverse: value out of range');
            }
            return Math.pow(inner, 1 / lambda);
        },
        name: `box-cox(λ=${lambda.toFixed(3)})`,
        lambda
    };
};

// =============================================================================
// MODEL SELECTION CRITERIA
// =============================================================================

/**
 * A function that scores a model fit for selection purposes.
 * Lower scores indicate better models.
 */
export type ModelSelectionCriterion = (
    rss: number,      // Residual sum of squares
    n: number,        // Number of observations
    k: number,        // Number of parameters (including intercept)
    logLikelihood?: number
) => number;

/**
 * Akaike Information Criterion (AIC).
 * AIC = 2k - 2ln(L) ≈ n·ln(RSS/n) + 2k
 */
export const aicCriterion: ModelSelectionCriterion = (rss: number, n: number, k: number): number => {
    if (rss <= 0 || n <= 0) return Infinity;
    return n * Math.log(rss / n) + 2 * k;
};

/**
 * Bayesian Information Criterion (BIC).
 * BIC = k·ln(n) - 2ln(L) ≈ n·ln(RSS/n) + k·ln(n)
 * Penalizes model complexity more heavily than AIC.
 */
export const bicCriterion: ModelSelectionCriterion = (rss: number, n: number, k: number): number => {
    if (rss <= 0 || n <= 0) return Infinity;
    return n * Math.log(rss / n) + k * Math.log(n);
};

/**
 * Corrected AIC (AICc) for small samples.
 * AICc = AIC + 2k(k+1)/(n-k-1)
 */
export const aiccCriterion: ModelSelectionCriterion = (rss: number, n: number, k: number): number => {
    if (n <= k + 1) return Infinity;
    const aic = aicCriterion(rss, n, k);
    return aic + (2 * k * (k + 1)) / (n - k - 1);
};

/**
 * Cross-validation score (leave-one-out).
 * Note: This is a placeholder signature; actual implementation requires the full model.
 */
export const crossValidationCriterion: ModelSelectionCriterion = (rss: number, n: number, _k: number): number => {
    // Approximation using PRESS-like adjustment
    // True LOO-CV requires refitting, but this gives a reasonable proxy
    if (n <= 0) return Infinity;
    return rss / n;
};

// =============================================================================
// CONFIDENCE INTERVAL METHODS
// =============================================================================

/**
 * Method for computing confidence intervals.
 */
export type ConfidenceIntervalMethod = (
    pointEstimate: number,
    standardError: number,
    degreesOfFreedom: number,
    confidenceLevel: number
) => { lower: number; upper: number };

/**
 * Normal approximation for confidence intervals.
 * Uses z-scores (appropriate for large samples).
 */
export const normalConfidenceInterval: ConfidenceIntervalMethod = (
    pointEstimate: number,
    standardError: number,
    _degreesOfFreedom: number,
    confidenceLevel: number
): { lower: number; upper: number } => {
    const alpha = 1 - confidenceLevel;
    const z = normalQuantile(1 - alpha / 2);
    const margin = z * standardError;
    return {
        lower: pointEstimate - margin,
        upper: pointEstimate + margin
    };
};

/**
 * t-distribution confidence intervals.
 * More appropriate for small samples.
 */
export const tConfidenceInterval: ConfidenceIntervalMethod = (
    pointEstimate: number,
    standardError: number,
    degreesOfFreedom: number,
    confidenceLevel: number
): { lower: number; upper: number } => {
    const alpha = 1 - confidenceLevel;
    const t = tQuantile(1 - alpha / 2, degreesOfFreedom);
    const margin = t * standardError;
    return {
        lower: pointEstimate - margin,
        upper: pointEstimate + margin
    };
};

// =============================================================================
// STATISTICAL HELPER FUNCTIONS
// =============================================================================

/**
 * Standard normal quantile function (inverse CDF).
 * Uses Abramowitz and Stegun approximation.
 */
export function normalQuantile(p: number): number {
    if (p <= 0 || p >= 1) {
        throw new Error('p must be in (0, 1)');
    }
    
    // Rational approximation for normal quantile
    const a = [
        -3.969683028665376e+01,
         2.209460984245205e+02,
        -2.759285104469687e+02,
         1.383577518672690e+02,
        -3.066479806614716e+01,
         2.506628277459239e+00
    ];
    const b = [
        -5.447609879822406e+01,
         1.615858368580409e+02,
        -1.556989798598866e+02,
         6.680131188771972e+01,
        -1.328068155288572e+01
    ];
    const c = [
        -7.784894002430293e-03,
        -3.223964580411365e-01,
        -2.400758277161838e+00,
        -2.549732539343734e+00,
         4.374664141464968e+00,
         2.938163982698783e+00
    ];
    const d = [
         7.784695709041462e-03,
         3.224671290700398e-01,
         2.445134137142996e+00,
         3.754408661907416e+00
    ];
    
    const pLow = 0.02425;
    const pHigh = 1 - pLow;
    
    let q: number;
    let r: number;
    
    if (p < pLow) {
        q = Math.sqrt(-2 * Math.log(p));
        return (((((c[0]*q + c[1])*q + c[2])*q + c[3])*q + c[4])*q + c[5]) /
               ((((d[0]*q + d[1])*q + d[2])*q + d[3])*q + 1);
    } else if (p <= pHigh) {
        q = p - 0.5;
        r = q * q;
        return (((((a[0]*r + a[1])*r + a[2])*r + a[3])*r + a[4])*r + a[5])*q /
               (((((b[0]*r + b[1])*r + b[2])*r + b[3])*r + b[4])*r + 1);
    } else {
        q = Math.sqrt(-2 * Math.log(1 - p));
        return -(((((c[0]*q + c[1])*q + c[2])*q + c[3])*q + c[4])*q + c[5]) /
                ((((d[0]*q + d[1])*q + d[2])*q + d[3])*q + 1);
    }
}

/**
 * Student's t quantile function (inverse CDF).
 * Uses approximation for moderate degrees of freedom.
 */
export function tQuantile(p: number, df: number): number {
    if (df <= 0) {
        throw new Error('Degrees of freedom must be positive');
    }
    if (p <= 0 || p >= 1) {
        throw new Error('p must be in (0, 1)');
    }
    
    // For large df, use normal approximation
    if (df > 1000) {
        return normalQuantile(p);
    }
    
    // For df=1 (Cauchy), use closed form
    if (df === 1) {
        return Math.tan(Math.PI * (p - 0.5));
    }
    
    // For df=2, use closed form
    if (df === 2) {
        return (2 * p - 1) / Math.sqrt(2 * p * (1 - p));
    }
    
    // General case: Newton-Raphson iteration
    // Start with normal approximation
    let x = normalQuantile(p);
    
    // Refine using Newton-Raphson
    for (let i = 0; i < 10; i++) {
        const fx = tCDF(x, df) - p;
        const fpx = tPDF(x, df);
        if (Math.abs(fpx) < 1e-15) break;
        const delta = fx / fpx;
        x -= delta;
        if (Math.abs(delta) < 1e-10) break;
    }
    
    return x;
}

/**
 * Student's t probability density function.
 */
function tPDF(x: number, df: number): number {
    const c = gammaLn((df + 1) / 2) - gammaLn(df / 2) - 0.5 * Math.log(df * Math.PI);
    return Math.exp(c - ((df + 1) / 2) * Math.log(1 + x * x / df));
}

/**
 * Student's t cumulative distribution function.
 * Uses regularized incomplete beta function.
 */
function tCDF(x: number, df: number): number {
    const t2 = x * x;
    const p = regularizedIncompleteBeta(df / 2, 0.5, df / (df + t2));
    return x >= 0 ? 1 - 0.5 * p : 0.5 * p;
}

/**
 * Log gamma function using Lanczos approximation.
 */
function gammaLn(z: number): number {
    const g = 7;
    const c = [
        0.99999999999980993,
        676.5203681218851,
        -1259.1392167224028,
        771.32342877765313,
        -176.61502916214059,
        12.507343278686905,
        -0.13857109526572012,
        9.9843695780195716e-6,
        1.5056327351493116e-7
    ];
    
    if (z < 0.5) {
        return Math.log(Math.PI / Math.sin(Math.PI * z)) - gammaLn(1 - z);
    }
    
    z -= 1;
    let x = c[0];
    for (let i = 1; i < g + 2; i++) {
        x += c[i] / (z + i);
    }
    
    const t = z + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/**
 * Regularized incomplete beta function I_x(a,b).
 * Uses continued fraction expansion.
 */
function regularizedIncompleteBeta(a: number, b: number, x: number): number {
    if (x === 0) return 0;
    if (x === 1) return 1;
    
    const lnBeta = gammaLn(a) + gammaLn(b) - gammaLn(a + b);
    const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a;
    
    // Use continued fraction
    const maxIterations = 200;
    const epsilon = 1e-14;
    
    let f = 1;
    let c = 1;
    let d = 0;
    
    for (let m = 0; m <= maxIterations; m++) {
        let numerator: number;
        if (m === 0) {
            numerator = 1;
        } else if (m % 2 === 0) {
            const k = m / 2;
            numerator = (k * (b - k) * x) / ((a + 2 * k - 1) * (a + 2 * k));
        } else {
            const k = (m - 1) / 2;
            numerator = -((a + k) * (a + b + k) * x) / ((a + 2 * k) * (a + 2 * k + 1));
        }
        
        d = 1 + numerator * d;
        if (Math.abs(d) < 1e-30) d = 1e-30;
        d = 1 / d;
        
        c = 1 + numerator / c;
        if (Math.abs(c) < 1e-30) c = 1e-30;
        
        const cd = c * d;
        f *= cd;
        
        if (Math.abs(cd - 1) < epsilon) break;
    }
    
    return front * (f - 1);
}