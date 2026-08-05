import { computed, Injectable, signal } from "@angular/core";

/**
 * Service for monitoring Core Web Vitals and performance metrics.
 * 
 * This service tracks key performance indicators including:
 * - First Contentful Paint (FCP)
 * - Largest Contentful Paint (LCP) 
 * - First Input Delay (FID)
 * - Cumulative Layout Shift (CLS)
 * - Time to First Byte (TTFB)
 * - Interaction to Next Paint (INP)
 * - Overall performance score
 * 
 * Uses the Performance Observer API to collect real-time metrics.
 * Provides a performance score based on Google's Core Web Vitals thresholds.
 * 
 * @example
 * ```typescript
 * constructor(private webVitals: WebVitalsService) {
 *   // Monitor performance score
 *   effect(() => {
 *     const vitals = this.webVitals.vitals();
 *     if (vitals.score && vitals.score < 70) {
 *       this.showPerformanceWarning();
 *     }
 *   });
 * }
 * ```
 * 
 * @see https://web.dev/vitals/
 * @since 1.0.0
 */
@Injectable({
  providedIn: 'root'
})
export class WebVitalsService {
  /**
   * Signal tracking First Contentful Paint timing.
   * 
   * FCP measures the time from navigation to when any part of the page's content
   * is rendered on the screen. Lower values indicate faster perceived loading.
   * 
   * @private
   */
  private readonly fcp = signal<number | null>(null);

  /**
   * Signal tracking Largest Contentful Paint timing.
   * 
   * LCP measures the time from navigation to when the largest content element
   * becomes visible. Good LCP scores are 2.5 seconds or less.
   * 
   * @private  
   */
  private readonly lcp = signal<number | null>(null);

  /**
   * Signal tracking First Input Delay.
   * 
   * FID measures the time from when a user first interacts with your site
   * to the time when the browser responds. Good FID scores are 100ms or less.
   * 
   * @private
   */
  private readonly fid = signal<number | null>(null);

  /**
   * Signal tracking Cumulative Layout Shift.
   * 
   * CLS measures visual stability by quantifying unexpected layout shifts.
   * Good CLS scores are 0.1 or less.
   * 
   * @private
   */
  private readonly cls = signal<number | null>(null);

  /**
   * Signal tracking Time to First Byte.
   * 
   * TTFB measures the time between the request for a resource and when
   * the first byte of a response begins to arrive.
   * 
   * @private
   */
  private readonly ttfb = signal<number | null>(null);

  /**
   * Signal tracking Interaction to Next Paint.
   * 
   * INP measures the latency of all click, tap, and keyboard interactions
   * with a page throughout its lifespan.
   * 
   * @private
   */
  private readonly inp = signal<number | null>(null);

  /**
   * Computed signal providing an overall performance score.
   * 
   * Calculates a score from 0-100 based on Core Web Vitals thresholds:
   * - LCP: Good ≤2.5s, Poor >4s
   * - FID: Good ≤100ms, Poor >300ms  
   * - CLS: Good ≤0.1, Poor >0.25
   * 
   * Returns null if insufficient metrics are available.
   * 
   * @returns Signal<number | null> - Performance score 0-100 or null
   */
  readonly performanceScore = computed(() => {
    const lcpValue = this.lcp();
    const fidValue = this.fid();
    const clsValue = this.cls();
    
    if (!lcpValue || !fidValue || !clsValue) return null;
    
    // Score based on Google's thresholds
    let score = 100;
    
    // LCP scoring (good < 2.5s, poor > 4s)
    if (lcpValue <= 2500) score += 0;
    else if (lcpValue <= 4000) score -= 10;
    else score -= 25;
    
    // FID scoring (good < 100ms, poor > 300ms)
    if (fidValue <= 100) score += 0;
    else if (fidValue <= 300) score -= 10;
    else score -= 25;
    
    // CLS scoring (good < 0.1, poor > 0.25)
    if (clsValue <= 0.1) score += 0;
    else if (clsValue <= 0.25) score -= 10;
    else score -= 25;
    
    return Math.max(0, Math.min(100, score));
  });

  /**
   * Computed signal providing all collected Web Vitals metrics.
   * 
   * Aggregates all performance metrics into a single object for monitoring
   * and analysis. Includes both raw metrics and calculated performance score.
   * 
   * @returns Signal<object> - Complete Web Vitals data
   * 
   * @example
   * ```typescript
   * const vitals = this.webVitals.vitals();
   * console.log(`LCP: ${vitals.lcp}ms, Score: ${vitals.score}`);
   * ```
   */
  readonly vitals = computed(() => ({
    fcp: this.fcp(),
    lcp: this.lcp(),
    fid: this.fid(),
    cls: this.cls(),
    ttfb: this.ttfb(),
    inp: this.inp(),
    score: this.performanceScore()
  }));

  /**
   * Initializes the Web Vitals service and starts performance observation.
   * 
   * Sets up Performance Observers to collect metrics in real-time.
   * Gracefully handles browsers that don't support specific APIs.
   * 
   * @constructor
   */
  constructor() {
    this.observeWebVitals();
  }

  /**
   * Sets up Performance Observers to collect Core Web Vitals metrics.
   * 
   * Creates observers for:
   * - Largest Contentful Paint (LCP)
   * - First Input Delay (FID) 
   * - Cumulative Layout Shift (CLS)
   * - First Contentful Paint (FCP)
   * - Navigation timing for TTFB
   * 
   * Each observer is wrapped in try-catch to handle API unavailability.
   * 
   * @private
   */
  private observeWebVitals() {
    if (!('PerformanceObserver' in window)) return;

    // Observe LCP
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        this.lcp.set(lastEntry.renderTime || lastEntry.loadTime);
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      // LCP not supported
    }

    // Observe FID
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const firstInput = entries[0] as any;
        if (firstInput) {
          this.fid.set(firstInput.processingStart - firstInput.startTime);
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      // FID not supported
    }

    // Observe CLS
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
            this.cls.set(clsValue);
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      // CLS not supported
    }

    // Get navigation timing metrics
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      this.ttfb.set(timing.responseStart - timing.requestStart);
    }

    // Get FCP from paint timing
    if ('PerformanceObserver' in window) {
      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (entry.name === 'first-contentful-paint') {
            this.fcp.set(entry.startTime);
          }
        }
      });
      try {
        paintObserver.observe({ type: 'paint', buffered: true });
      } catch (e) {
        // Paint timing not supported
      }
    }
  }
}