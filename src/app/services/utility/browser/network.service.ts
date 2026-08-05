import { Injectable, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { fromEvent, merge, startWith, map, distinctUntilChanged } from 'rxjs';

/**
 * Network Information API interface extending EventTarget
 * Provides information about the connection a device is using to communicate with the network.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation
 */
interface NetworkInformation extends EventTarget {
  /** The effective bandwidth estimate in megabits per second */
  readonly downlink: number;
  /** The maximum downlink speed, in megabits per second (Mbps), for the underlying connection technology */
  readonly downlinkMax?: number;
  /** The effective type of the connection meaning one of 'slow-2g', '2g', '3g', or '4g' */
  readonly effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  /** The estimated effective round-trip time of the current connection, in milliseconds */
  readonly rtt: number;
  /** Returns true if the user has set a reduced data usage option on the user agent */
  readonly saveData: boolean;
  /** The type of connection a device is using to communicate with the network */
  readonly type?: 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | undefined;
  /** Event handler for when connection information changes */
  onchange: ((this: NetworkInformation, ev: Event) => any) | null;
}

/**
 * Extended Navigator interface to include Network Information API properties
 */
declare global {
  interface Navigator {
    /** Standard Network Information API */
    readonly connection?: NetworkInformation;
    /** Mozilla-specific Network Information API */
    readonly mozConnection?: NetworkInformation;
    /** WebKit-specific Network Information API */
    readonly webkitConnection?: NetworkInformation;
  }
}

/**
 * Service for monitoring and providing reactive network connectivity state and quality metrics.
 * 
 * This service provides comprehensive network monitoring capabilities including:
 * - Basic online/offline detection
 * - Connection type and quality assessment
 * - Network performance metrics (downlink speed, RTT)
 * - Data saver mode detection
 * - Adaptive content recommendations based on network conditions
 * 
 * All properties are reactive Angular signals that automatically update when network conditions change.
 * 
 * @example
 * ```typescript
 * constructor(private networkState: NetworkStateService) {
 *   // React to network changes
 *   effect(() => {
 *     if (this.networkState.isOffline()) {
 *       this.showOfflineMessage();
 *     }
 *   });
 * 
 *   // Adjust video quality based on connection
 *   effect(() => {
 *     const quality = this.networkState.recommendedVideoQuality();
 *     this.videoPlayer.setQuality(quality);
 *   });
 * }
 * ```
 * 
 * @since 1.0.0
 */
@Injectable({
  providedIn: 'root'
})
export class NetworkStateService {
  /**
   * Reactive signal indicating whether the device is currently online.
   * 
   * Automatically updates when the browser's online/offline events fire.
   * Uses `navigator.onLine` as the source of truth.
   * 
   * @returns Signal<boolean> - true if online, false if offline
   */
  readonly isOnline = toSignal(
    merge(
      fromEvent(window, 'online'),
      fromEvent(window, 'offline')
    ).pipe(
      startWith(null),
      map(() => navigator.onLine),
      distinctUntilChanged()
    ),
    { initialValue: navigator.onLine }
  );

  /**
   * Reactive signal indicating whether the device is currently offline.
   * 
   * Computed from the inverse of `isOnline()`.
   * 
   * @returns Signal<boolean> - true if offline, false if online
   */
  readonly isOffline = computed(() => !this.isOnline());

  /** Private property holding the Network Information API connection object */
  private readonly connection = this.getConnection();

  /**
   * Reactive signal providing the current connection type.
   * 
   * Returns the type of network connection being used (wifi, cellular, ethernet, etc.).
   * Falls back to undefined if the Network Information API is not available.
   * 
   * @returns Signal<string> - Connection type or undefined
   */
  readonly connectionType = this.connection ? toSignal(
    merge(
      fromEvent(this.connection, 'change'),
      fromEvent(window, 'load')
    ).pipe(
      startWith(null),
      map(() => this.connection?.type || undefined),
      distinctUntilChanged()
    ),
    { initialValue: this.connection?.type || undefined }
  ) : signal<string | undefined>(undefined);

  /**
   * Reactive signal providing the effective connection type.
   * 
   * Returns a simplified classification of network speed: '4g', '3g', '2g', 'slow-2g'.
   * This is based on actual network performance rather than just the connection type.
   * 
   * @returns Signal<string> - Effective connection type or undefined
   */
  readonly effectiveType = this.connection ? toSignal(
    merge(
      fromEvent(this.connection, 'change'),
      fromEvent(window, 'load')
    ).pipe(
      startWith(null),
      map(() => this.connection?.effectiveType || undefined),
      distinctUntilChanged()
    ),
    { initialValue: this.connection?.effectiveType || undefined }
  ) : signal<string | undefined>(undefined);

  /**
   * Reactive signal providing the current downlink speed in Mbps.
   * 
   * Represents the effective bandwidth estimate in megabits per second.
   * Returns 0 if the Network Information API is not available.
   * 
   * @returns Signal<number> - Downlink speed in Mbps
   */
  readonly downlinkSpeed = this.connection ? toSignal(
    merge(
      fromEvent(this.connection, 'change'),
      fromEvent(window, 'load')
    ).pipe(
      startWith(null),
      map(() => this.connection?.downlink || 0),
      distinctUntilChanged()
    ),
    { initialValue: this.connection?.downlink || 0 }
  ) : signal(0);

  /**
   * Reactive signal providing the current round-trip time in milliseconds.
   * 
   * Represents the estimated effective round-trip time of the current connection.
   * Lower values indicate better network responsiveness.
   * 
   * @returns Signal<number> - RTT in milliseconds
   */
  readonly rtt = this.connection ? toSignal(
    merge(
      fromEvent(this.connection, 'change'),
      fromEvent(window, 'load')
    ).pipe(
      startWith(null),
      map(() => this.connection?.rtt || 0),
      distinctUntilChanged()
    ),
    { initialValue: this.connection?.rtt || 0 }
  ) : signal(0);

  /**
   * Reactive signal indicating whether data saver mode is enabled.
   * 
   * Returns true if the user has requested a reduced data usage option in their browser.
   * Applications should respect this by reducing data consumption when true.
   * 
   * @returns Signal<boolean> - true if data saver is enabled
   */
  readonly isDataSaverEnabled = this.connection ? toSignal(
    merge(
      fromEvent(this.connection, 'change'),
      fromEvent(window, 'load')
    ).pipe(
      startWith(null),
      map(() => this.connection?.saveData || false),
      distinctUntilChanged()
    ),
    { initialValue: this.connection?.saveData || false }
  ) : signal(false);

  /**
   * Computed signal providing an overall assessment of connection quality.
   * 
   * Analyzes effective connection type, downlink speed, and RTT to provide
   * a simplified quality rating: 'excellent', 'good', 'fair', 'poor', 'offline', or undefined.
   * 
   * Quality thresholds:
   * - excellent: 4G with >5Mbps downlink and <50ms RTT
   * - good: 4G or 3G with >2Mbps downlink
   * - fair: 3G or 2G connections
   * - poor: slow-2g connections
   * - offline: no connection
   * 
   * @returns Signal<string> - Connection quality assessment
   */
  readonly connectionQuality = computed(() => {
    const effective = this.effectiveType();
    const downlink = this.downlinkSpeed();
    const rtt = this.rtt();

    if (!this.isOnline()) return 'offline';
    if (effective === '4g' && downlink > 5 && rtt < 50) return 'excellent';
    if (effective === '4g' || (effective === '3g' && downlink > 2)) return 'good';
    if (effective === '3g' || effective === '2g') return 'fair';
    if (effective === 'slow-2g') return 'poor';
    
    // Fallback based on metrics if effectiveType is unknown
    if (downlink > 10 && rtt < 50) return 'excellent';
    if (downlink > 2 && rtt < 150) return 'good';
    if (downlink > 0.5 && rtt < 300) return 'fair';
    if (downlink > 0) return 'poor';
    
    return undefined;
  });

  /**
   * Computed signal recommending appropriate video quality based on network conditions.
   * 
   * Provides adaptive video quality recommendations to optimize user experience
   * while respecting bandwidth limitations:
   * - '1080p': Excellent connections with >10Mbps
   * - '720p': Excellent or good connections
   * - '480p': Fair connections
   * - '360p': Poor connections
   * - '240p': Very poor connections
   * - 'none': Offline
   * 
   * @returns Signal<string> - Recommended video quality setting
   */
  readonly recommendedVideoQuality = computed(() => {
    const quality = this.connectionQuality();
    const downlink = this.downlinkSpeed();
    
    if (quality === 'offline') return 'none';
    if (quality === 'excellent' && downlink > 10) return '1080p';
    if (quality === 'excellent' || quality === 'good') return '720p';
    if (quality === 'fair') return '480p';
    if (quality === 'poor') return '360p';
    return '240p';
  });

  /**
   * Computed signal indicating whether content should autoplay.
   * 
   * Considers connection quality and data saver settings to determine
   * if autoplay is appropriate. Returns false for poor connections,
   * offline state, or when data saver is enabled.
   * 
   * @returns Signal<boolean> - true if autoplay is recommended
   */
  readonly canAutoplay = computed(() => {
    return this.connectionQuality() !== 'offline' && 
           this.connectionQuality() !== 'poor' && 
           !this.isDataSaverEnabled();
  });

  /**
   * Computed signal providing a comprehensive network profile and recommendations.
   * 
   * Aggregates all network information into a single object for easy consumption.
   * Includes current metrics and adaptive recommendations for various content types.
   * 
   * @returns Signal<object> - Complete network profile with recommendations
   * 
   * @example
   * ```typescript
   * const profile = this.networkState.networkProfile();
   * if (profile.recommendations.prefetch) {
   *   this.prefetchNextPage();
   * }
   * ```
   */
  readonly networkProfile = computed(() => ({
    online: this.isOnline(),
    type: this.connectionType(),
    effectiveType: this.effectiveType(),
    quality: this.connectionQuality(),
    downlink: this.downlinkSpeed(),
    rtt: this.rtt(),
    dataSaver: this.isDataSaverEnabled(),
    recommendations: {
      videoQuality: this.recommendedVideoQuality(),
      autoplay: this.canAutoplay(),
      prefetch: this.connectionQuality() === 'excellent' || this.connectionQuality() === 'good',
      animations: this.connectionQuality() !== 'poor'
    }
  }));

  /**
   * Attempts to get the Network Information API connection object.
   * 
   * Checks for the standard API and vendor-prefixed versions (Mozilla, WebKit).
   * Returns undefined if the API is not supported by the browser.
   * 
   * @private
   * @returns NetworkInformation | undefined - Connection object or undefined
   */
  private getConnection(): NetworkInformation | undefined {
    return (navigator as any).connection || 
           (navigator as any).mozConnection || 
           (navigator as any).webkitConnection;
  }
}