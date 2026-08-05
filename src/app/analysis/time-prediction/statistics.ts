/**
 * Statistical utilities for casting strategies.
 * 
 * Provides common operations like regression, weighted statistics,
 * and matrix operations needed by various strategies.
 */

import { FitResult, WeightFunction } from './interface';
import { uniformWeight } from './functions';

// =============================================================================
// BASIC STATISTICS
// =============================================================================

/**
 * Compute the arithmetic mean of an array.
 */
export function mean(values: number[]): number {
    if (values.length === 0) return NaN;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Compute the weighted mean of an array.
 */
export function weightedMean(values: number[], weights: number[]): number {
    if (values.length === 0 || values.length !== weights.length) return NaN;
    
    let sumWX = 0;
    let sumW = 0;
    for (let i = 0; i < values.length; i++) {
        sumWX += weights[i] * values[i];
        sumW += weights[i];
    }
    return sumW > 0 ? sumWX / sumW : NaN;
}

/**
 * Compute the variance of an array.
 * @param ddof - Delta degrees of freedom (0 for population, 1 for sample)
 */
export function variance(values: number[], ddof: number = 1): number {
    if (values.length <= ddof) return NaN;
    const m = mean(values);
    const sumSquares = values.reduce((sum, v) => sum + (v - m) ** 2, 0);
    return sumSquares / (values.length - ddof);
}

/**
 * Compute the weighted variance.
 * Uses frequency weights interpretation.
 */
export function weightedVariance(values: number[], weights: number[], ddof: number = 1): number {
    if (values.length <= ddof || values.length !== weights.length) return NaN;
    
    const wMean = weightedMean(values, weights);
    let sumW = 0;
    let sumWSquares = 0;
    
    for (let i = 0; i < values.length; i++) {
        sumW += weights[i];
        sumWSquares += weights[i] * (values[i] - wMean) ** 2;
    }
    
    // Bessel's correction for weighted variance
    const effectiveN = sumW;
    return sumWSquares / (effectiveN - ddof);
}

/**
 * Compute the standard deviation.
 */
export function standardDeviation(values: number[], ddof: number = 1): number {
    return Math.sqrt(variance(values, ddof));
}

/**
 * Compute the covariance between two arrays.
 */
export function covariance(x: number[], y: number[], ddof: number = 1): number {
    if (x.length !== y.length || x.length <= ddof) return NaN;
    
    const xMean = mean(x);
    const yMean = mean(y);
    
    let sum = 0;
    for (let i = 0; i < x.length; i++) {
        sum += (x[i] - xMean) * (y[i] - yMean);
    }
    
    return sum / (x.length - ddof);
}

/**
 * Compute Pearson correlation coefficient.
 */
export function correlation(x: number[], y: number[]): number {
    const cov = covariance(x, y, 0);
    const stdX = standardDeviation(x, 0);
    const stdY = standardDeviation(y, 0);
    
    if (stdX === 0 || stdY === 0) return NaN;
    return cov / (stdX * stdY);
}

// =============================================================================
// REGRESSION
// =============================================================================

/**
 * Ordinary Least Squares simple linear regression.
 * y = β₀ + β₁x
 * 
 * @returns FitResult with coefficients [intercept, slope]
 */
export function olsSimpleLinear(x: number[], y: number[]): FitResult {
    if (x.length !== y.length || x.length < 2) {
        throw new Error('OLS requires at least 2 matching observations');
    }
    
    const n = x.length;
    const xMean = mean(x);
    const yMean = mean(y);
    
    // Compute slope
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
        const dx = x[i] - xMean;
        numerator += dx * (y[i] - yMean);
        denominator += dx * dx;
    }
    
    if (denominator === 0) {
        // All x values are the same - no slope can be determined
        return {
            coefficients: [yMean, 0],
            rss: variance(y, 0) * n,
            df: n - 1,
            rSquared: 0,
            standardError: standardDeviation(y, 1)
        };
    }
    
    const slope = numerator / denominator;
    const intercept = yMean - slope * xMean;
    
    // Compute residuals and fit statistics
    let rss = 0;
    let tss = 0;
    for (let i = 0; i < n; i++) {
        const predicted = intercept + slope * x[i];
        const residual = y[i] - predicted;
        rss += residual * residual;
        tss += (y[i] - yMean) ** 2;
    }
    
    const df = n - 2; // Two parameters estimated
    const rSquared = tss > 0 ? 1 - rss / tss : 0;
    const standardError = df > 0 ? Math.sqrt(rss / df) : 0;
    
    return {
        coefficients: [intercept, slope],
        rss,
        df,
        rSquared,
        standardError
    };
}

/**
 * Weighted Least Squares simple linear regression.
 * Minimizes Σ wᵢ(yᵢ - β₀ - β₁xᵢ)²
 * 
 * @returns FitResult with coefficients [intercept, slope]
 */
export function wlsSimpleLinear(x: number[], y: number[], weights: number[]): FitResult {
    if (x.length !== y.length || x.length !== weights.length || x.length < 2) {
        throw new Error('WLS requires at least 2 matching observations with weights');
    }
    
    const n = x.length;
    
    // Weighted means
    const xWMean = weightedMean(x, weights);
    const yWMean = weightedMean(y, weights);
    
    // Weighted covariance and variance
    let sumW = 0;
    let covXY = 0;
    let varX = 0;
    
    for (let i = 0; i < n; i++) {
        const w = weights[i];
        sumW += w;
        covXY += w * (x[i] - xWMean) * (y[i] - yWMean);
        varX += w * (x[i] - xWMean) ** 2;
    }
    
    if (varX === 0) {
        return {
            coefficients: [yWMean, 0],
            rss: weightedVariance(y, weights, 0) * sumW,
            df: n - 1,
            rSquared: 0,
            standardError: Math.sqrt(weightedVariance(y, weights, 1))
        };
    }
    
    const slope = covXY / varX;
    const intercept = yWMean - slope * xWMean;
    
    // Compute weighted residuals and fit statistics
    let rss = 0;
    let tss = 0;
    for (let i = 0; i < n; i++) {
        const w = weights[i];
        const predicted = intercept + slope * x[i];
        const residual = y[i] - predicted;
        rss += w * residual * residual;
        tss += w * (y[i] - yWMean) ** 2;
    }
    
    const df = n - 2;
    const rSquared = tss > 0 ? 1 - rss / tss : 0;
    const standardError = df > 0 ? Math.sqrt(rss / df) : 0;
    
    return {
        coefficients: [intercept, slope],
        rss,
        df,
        rSquared,
        standardError
    };
}

/**
 * Multiple linear regression using normal equations.
 * y = Xβ, solve β = (X'X)⁻¹X'y
 * 
 * @param X - Design matrix (n × p) where each row is an observation
 * @param y - Response vector (n × 1)
 * @param weights - Optional weights for WLS
 */
export function olsMultiple(X: number[][], y: number[], weights?: number[]): FitResult {
    const n = X.length;
    const p = X[0]?.length ?? 0;
    
    if (n < p || y.length !== n) {
        throw new Error('Insufficient observations for number of parameters');
    }
    
    const w = weights ?? Array(n).fill(1);
    
    // Compute X'WX and X'Wy
    const XtWX: number[][] = Array(p).fill(null).map(() => Array(p).fill(0));
    const XtWy: number[] = Array(p).fill(0);
    
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < p; j++) {
            for (let k = 0; k < p; k++) {
                XtWX[j][k] += w[i] * X[i][j] * X[i][k];
            }
            XtWy[j] += w[i] * X[i][j] * y[i];
        }
    }
    
    // Solve using Cholesky decomposition for numerical stability
    const coefficients = solvePositiveDefinite(XtWX, XtWy);
    
    // Compute residuals
    let rss = 0;
    const yMean = weightedMean(y, w);
    let tss = 0;
    
    for (let i = 0; i < n; i++) {
        let predicted = 0;
        for (let j = 0; j < p; j++) {
            predicted += coefficients[j] * X[i][j];
        }
        rss += w[i] * (y[i] - predicted) ** 2;
        tss += w[i] * (y[i] - yMean) ** 2;
    }
    
    const df = n - p;
    const rSquared = tss > 0 ? 1 - rss / tss : 0;
    const standardError = df > 0 ? Math.sqrt(rss / df) : 0;
    
    return {
        coefficients,
        rss,
        df,
        rSquared,
        standardError
    };
}

/**
 * Polynomial regression of specified degree.
 * y = β₀ + β₁x + β₂x² + ... + βₖxᵏ
 */
export function polynomialRegression(
    x: number[], 
    y: number[], 
    degree: number,
    weights?: number[]
): FitResult {
    // Build design matrix with polynomial terms
    const X: number[][] = x.map(xi => {
        const row: number[] = [1]; // Intercept
        for (let d = 1; d <= degree; d++) {
            row.push(Math.pow(xi, d));
        }
        return row;
    });
    
    return olsMultiple(X, y, weights);
}

// =============================================================================
// MATRIX UTILITIES
// =============================================================================

/**
 * Solve Ax = b for positive definite A using Cholesky decomposition.
 */
function solvePositiveDefinite(A: number[][], b: number[]): number[] {
    const n = A.length;
    
    // Cholesky decomposition: A = LL'
    const L: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
            let sum = A[i][j];
            for (let k = 0; k < j; k++) {
                sum -= L[i][k] * L[j][k];
            }
            if (i === j) {
                if (sum <= 0) {
                    throw new Error('Matrix is not positive definite');
                }
                L[i][j] = Math.sqrt(sum);
            } else {
                L[i][j] = sum / L[j][j];
            }
        }
    }
    
    // Forward substitution: Ly = b
    const y: number[] = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
        let sum = b[i];
        for (let j = 0; j < i; j++) {
            sum -= L[i][j] * y[j];
        }
        y[i] = sum / L[i][i];
    }
    
    // Back substitution: L'x = y
    const x: number[] = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        let sum = y[i];
        for (let j = i + 1; j < n; j++) {
            sum -= L[j][i] * x[j];
        }
        x[i] = sum / L[i][i];
    }
    
    return x;
}

// =============================================================================
// PREDICTION INTERVALS
// =============================================================================

/**
 * Compute the standard error for a prediction at a new x value.
 * SE_pred = s * sqrt(1 + 1/n + (x - x̄)² / Σ(xᵢ - x̄)²)
 */
export function predictionStandardError(
    xNew: number,
    xData: number[],
    residualSE: number
): number {
    const n = xData.length;
    const xMean = mean(xData);
    
    let sumSquaredDeviations = 0;
    for (const x of xData) {
        sumSquaredDeviations += (x - xMean) ** 2;
    }
    
    if (sumSquaredDeviations === 0) {
        return residualSE * Math.sqrt(1 + 1/n);
    }
    
    const leverageTerm = (xNew - xMean) ** 2 / sumSquaredDeviations;
    return residualSE * Math.sqrt(1 + 1/n + leverageTerm);
}

/**
 * Compute the standard error for a prediction with weighted regression.
 */
export function weightedPredictionStandardError(
    xNew: number,
    xData: number[],
    weights: number[],
    residualSE: number
): number {
    const xWMean = weightedMean(xData, weights);
    
    let sumW = 0;
    let sumWSquaredDeviations = 0;
    for (let i = 0; i < xData.length; i++) {
        sumW += weights[i];
        sumWSquaredDeviations += weights[i] * (xData[i] - xWMean) ** 2;
    }
    
    if (sumWSquaredDeviations === 0) {
        return residualSE * Math.sqrt(1 + 1/sumW);
    }
    
    const leverageTerm = (xNew - xWMean) ** 2 / sumWSquaredDeviations;
    return residualSE * Math.sqrt(1 + 1/sumW + leverageTerm);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Compute weights from a weight function.
 */
export function computeWeights(n: number, weightFn: WeightFunction = uniformWeight): number[] {
    const weights: number[] = [];
    for (let i = 0; i < n; i++) {
        weights.push(weightFn(i, n));
    }
    return weights;
}

/**
 * Normalize weights to sum to 1.
 */
export function normalizeWeights(weights: number[]): number[] {
    const sum = weights.reduce((a, b) => a + b, 0);
    if (sum === 0) return weights.map(() => 1 / weights.length);
    return weights.map(w => w / sum);
}

/**
 * Compute the sum of squared differences between two arrays.
 */
export function sumSquaredDifferences(a: number[], b: number[]): number {
    if (a.length !== b.length) {
        throw new Error('Arrays must have the same length');
    }
    return a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0);
}

/**
 * Compute differences between consecutive elements.
 */
export function diff(values: number[]): number[] {
    const result: number[] = [];
    for (let i = 1; i < values.length; i++) {
        result.push(values[i] - values[i - 1]);
    }
    return result;
}

/**
 * Compute cumulative sum.
 */
export function cumsum(values: number[]): number[] {
    const result: number[] = [];
    let sum = 0;
    for (const v of values) {
        sum += v;
        result.push(sum);
    }
    return result;
}