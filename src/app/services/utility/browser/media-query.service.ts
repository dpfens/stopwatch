import { Injectable, computed, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { fromEvent, merge, startWith, map, distinctUntilChanged } from 'rxjs';

/** Represents the user's preferred color scheme */
export type ColorScheme = 'light' | 'dark';

/** Represents the user's contrast preference */
export type ContrastPreference = 'no-preference' | 'more' | 'less' | 'custom';

/** Represents the user's motion preference for animations */
export type MotionPreference = 'no-preference' | 'reduce';

/**
 * A comprehensive service for detecting and reacting to media queries, device capabilities,
 * and user preferences in Angular applications.
 * 
 * This service provides reactive signals for various browser and device characteristics,
 * including accessibility preferences, device capabilities, and environmental factors.
 * All signals are automatically updated when the underlying media queries change.
 * 
 * @example
 * ```typescript
 * @Component({
 *   template: `
 *     <div [class.dark-theme]="mediaQuery.prefersDarkMode()">
 *       <button [disabled]="!mediaQuery.canHover()">Hover me</button>
 *     </div>
 *   `
 * })
 * export class MyComponent {
 *   constructor(public mediaQuery: MediaQueryService) {}
 * }
 * ```
 * 
 * @since Angular 20
 */
@Injectable({
  providedIn: 'root'
})
export class MediaQueryService {
  
  // ============================================================================
  // COLOR SCHEME DETECTION
  // ============================================================================
  
  /** @internal Media query for dark color scheme preference */
  private readonly colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  /**
   * Reactive signal that indicates whether the user prefers dark mode.
   * 
   * This signal automatically updates when the user changes their system's
   * color scheme preference or when the page loads.
   * 
   * @example
   * ```typescript
   * // In component
   * if (this.mediaQuery.prefersDarkMode()) {
   *   // Apply dark theme styles
   * }
   * ```
   */
  readonly prefersDarkMode = toSignal(
    merge(
      fromEvent<MediaQueryListEvent>(this.colorSchemeQuery, 'change'),
      fromEvent(window, 'load')
    ).pipe(
      startWith(null),
      map(() => this.colorSchemeQuery.matches),
      distinctUntilChanged()
    ),
    { initialValue: this.colorSchemeQuery.matches }
  );
  
  /**
   * Reactive signal that indicates whether the user prefers light mode.
   * 
   * This is a computed signal that's the inverse of `prefersDarkMode`.
   * 
   * @example
   * ```typescript
   * // In template
   * <div [class.light-theme]="mediaQuery.prefersLightMode()">
   * ```
   */
  readonly prefersLightMode = computed(() => !this.prefersDarkMode());
  
  /**
   * Reactive signal that returns the current color scheme preference.
   * 
   * @returns Either 'dark' or 'light' based on user preference
   * 
   * @example
   * ```typescript
   * // Switch on color scheme
   * switch (this.mediaQuery.colorScheme()) {
   *   case 'dark':
   *     // Apply dark theme
   *     break;
   *   case 'light':
   *     // Apply light theme
   *     break;
   * }
   * ```
   */
  readonly colorScheme = computed<ColorScheme>(() => 
    this.prefersDarkMode() ? 'dark' : 'light'
  );

  // ============================================================================
  // MOTION PREFERENCES
  // ============================================================================

  /** @internal Media query for reduced motion preference */
  private readonly motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  
  /**
   * Reactive signal that indicates whether the user prefers reduced motion.
   * 
   * This is important for accessibility - users with vestibular disorders
   * may prefer reduced animations and motion effects.
   * 
   * @example
   * ```typescript
   * // Conditionally apply animations
   * if (!this.mediaQuery.prefersReducedMotion()) {
   *   this.startAnimation();
   * }
   * ```
   */
  readonly prefersReducedMotion = toSignal(
    merge(
      fromEvent<MediaQueryListEvent>(this.motionQuery, 'change'),
      fromEvent(window, 'load')
    ).pipe(
      startWith(null),
      map(() => this.motionQuery.matches),
      distinctUntilChanged()
    ),
    { initialValue: this.motionQuery.matches }
  );
  
  /**
   * Reactive signal that returns the user's motion preference.
   * 
   * @returns Either 'reduce' or 'no-preference'
   * 
   * @example
   * ```typescript
   * // Set animation duration based on preference
   * const duration = this.mediaQuery.motionPreference() === 'reduce' ? 0 : 300;
   * ```
   */
  readonly motionPreference = computed<MotionPreference>(() =>
    this.prefersReducedMotion() ? 'reduce' : 'no-preference'
  );

  // ============================================================================
  // CONTRAST PREFERENCES
  // ============================================================================

  /** @internal Media query for higher contrast preference */
  private readonly contrastMoreQuery = window.matchMedia('(prefers-contrast: more)');
  
  /** @internal Media query for lower contrast preference */
  private readonly contrastLessQuery = window.matchMedia('(prefers-contrast: less)');
  
  /** @internal Media query for custom contrast preference */
  private readonly contrastCustomQuery = window.matchMedia('(prefers-contrast: custom)');
  
  /**
   * Reactive signal that indicates whether the user prefers more contrast.
   * 
   * Higher contrast can help users with visual impairments or in bright environments.
   * 
   * @example
   * ```typescript
   * // Apply high contrast styles
   * if (this.mediaQuery.prefersMoreContrast()) {
   *   element.classList.add('high-contrast');
   * }
   * ```
   */
  readonly prefersMoreContrast = toSignal(
    merge(
      fromEvent<MediaQueryListEvent>(this.contrastMoreQuery, 'change'),
      fromEvent(window, 'load')
    ).pipe(
      startWith(null),
      map(() => this.contrastMoreQuery.matches),
      distinctUntilChanged()
    ),
    { initialValue: this.contrastMoreQuery.matches }
  );

  /**
   * Reactive signal that indicates whether the user prefers less contrast.
   * 
   * Lower contrast might be preferred in low-light environments or by users
   * with certain visual sensitivities.
   * 
   * @example
   * ```typescript
   * // Apply low contrast styles
   * if (this.mediaQuery.prefersLessContrast()) {
   *   element.classList.add('low-contrast');
   * }
   * ```
   */
  readonly prefersLessContrast = toSignal(
    merge(
      fromEvent<MediaQueryListEvent>(this.contrastLessQuery, 'change'),
      fromEvent(window, 'load')
    ).pipe(
      startWith(null),
      map(() => this.contrastLessQuery.matches),
      distinctUntilChanged()
    ),
    { initialValue: this.contrastLessQuery.matches }
  );

  /**
   * Reactive signal that returns the user's contrast preference.
   * 
   * @returns One of 'more', 'less', 'custom', or 'no-preference'
   * 
   * @example
   * ```typescript
   * // Apply appropriate contrast theme
   * const contrastClass = `contrast-${this.mediaQuery.contrastPreference()}`;
   * element.classList.add(contrastClass);
   * ```
   */
  readonly contrastPreference = computed<ContrastPreference>(() => {
    if (this.contrastMoreQuery.matches) return 'more';
    if (this.contrastLessQuery.matches) return 'less';
    if (this.contrastCustomQuery.matches) return 'custom';
    return 'no-preference';
  });

  // ============================================================================
  // INPUT CAPABILITIES
  // ============================================================================

  /** @internal Media query for coarse pointer (touch) detection */
  private readonly touchQuery = window.matchMedia('(pointer: coarse)');
  
  /**
   * Reactive signal that indicates whether the device has touch capabilities.
   * 
   * This combines media query detection with feature detection for maximum reliability.
   * 
   * @example
   * ```typescript
   * // Show touch-friendly UI elements
   * if (this.mediaQuery.hasTouch()) {
   *   this.showTouchControls();
   * }
   * ```
   */
  readonly hasTouch = toSignal(
    merge(
      fromEvent<MediaQueryListEvent>(this.touchQuery, 'change'),
      fromEvent(window, 'load')
    ).pipe(
      startWith(null),
      map(() => this.touchQuery.matches || 'ontouchstart' in window),
      distinctUntilChanged()
    ),
    { initialValue: this.touchQuery.matches || 'ontouchstart' in window }
  );

  /** @internal Media query for hover capability detection */
  private readonly hoverQuery = window.matchMedia('(hover: hover)');
  
  /**
   * Reactive signal that indicates whether the device can hover.
   * 
   * This is useful for showing hover states only on devices that support them.
   * 
   * @example
   * ```typescript
   * // Only show hover effects on capable devices
   * <button [class.hover-enabled]="mediaQuery.canHover()">
   *   Hover me
   * </button>
   * ```
   */
  readonly canHover = toSignal(
    merge(
      fromEvent<MediaQueryListEvent>(this.hoverQuery, 'change'),
      fromEvent(window, 'load')
    ).pipe(
      startWith(null),
      map(() => this.hoverQuery.matches),
      distinctUntilChanged()
    ),
    { initialValue: this.hoverQuery.matches }
  );

  // ============================================================================
  // DISPLAY CHARACTERISTICS
  // ============================================================================

  /** @internal Media query for high-density display detection */
  private readonly retinaQuery = window.matchMedia(
    '(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)'
  );
  
  /**
   * Reactive signal that indicates whether the device has a high-density display.
   * 
   * High-density displays (like Retina displays) may benefit from higher resolution images
   * and different styling approaches.
   * 
   * @example
   * ```typescript
   * // Use high-resolution images on capable displays
   * const imageSrc = this.mediaQuery.isHighDensity() 
   *   ? 'image@2x.png' 
   *   : 'image.png';
   * ```
   */
  readonly isHighDensity = toSignal(
    merge(
      fromEvent<MediaQueryListEvent>(this.retinaQuery, 'change'),
      fromEvent(window, 'load')
    ).pipe(
      startWith(null),
      map(() => this.retinaQuery.matches || window.devicePixelRatio > 1.5),
      distinctUntilChanged()
    ),
    { initialValue: this.retinaQuery.matches || window.devicePixelRatio > 1.5 }
  );

  /**
   * Reactive signal containing the current device pixel ratio.
   * 
   * The device pixel ratio represents the ratio of physical pixels to CSS pixels.
   * A value greater than 1 indicates a high-density display.
   * 
   * @example
   * ```typescript
   * // Scale elements based on pixel ratio
   * const scale = Math.min(this.mediaQuery.devicePixelRatio(), 2);
   * element.style.transform = `scale(${scale})`;
   * ```
   */
  readonly devicePixelRatio = signal(window.devicePixelRatio);

  // ============================================================================
  // PRINT DETECTION
  // ============================================================================

  /** @internal Media query for print media detection */
  private readonly printQuery = window.matchMedia('print');
  
  /**
   * Reactive signal that indicates whether the page is being printed.
   * 
   * This can be used to hide interactive elements or show print-specific content.
   * 
   * @example
   * ```typescript
   * // Hide interactive elements when printing
   * <button *ngIf="!mediaQuery.isPrint()">
   *   Interactive Button
   * </button>
   * ```
   */
  readonly isPrint = toSignal(
    merge(
      fromEvent<MediaQueryListEvent>(this.printQuery, 'change'),
      fromEvent(window, 'beforeprint'),
      fromEvent(window, 'afterprint')
    ).pipe(
      startWith(null),
      map(() => this.printQuery.matches),
      distinctUntilChanged()
    ),
    { initialValue: this.printQuery.matches }
  );

  // ============================================================================
  // TRANSPARENCY PREFERENCES
  // ============================================================================

  /** @internal Media query for reduced transparency preference */
  private readonly transparencyQuery = window.matchMedia('(prefers-reduced-transparency: reduce)');
  
  /**
   * Reactive signal that indicates whether the user prefers reduced transparency.
   * 
   * Some users may prefer less transparent elements for better readability or
   * due to visual processing differences.
   * 
   * @example
   * ```typescript
   * // Adjust transparency based on preference
   * const opacity = this.mediaQuery.prefersReducedTransparency() ? 1 : 0.8;
   * element.style.opacity = opacity.toString();
   * ```
   */
  readonly prefersReducedTransparency = toSignal(
    merge(
      fromEvent<MediaQueryListEvent>(this.transparencyQuery, 'change'),
      fromEvent(window, 'load')
    ).pipe(
      startWith(null),
      map(() => this.transparencyQuery.matches),
      distinctUntilChanged()
    ),
    { initialValue: this.transparencyQuery.matches }
  );

  // ============================================================================
  // NETWORK STATUS
  // ============================================================================

  /**
   * Reactive signal that indicates whether the device is online.
   * 
   * This can be used to show offline indicators or enable offline functionality.
   * 
   * @example
   * ```typescript
   * // Show offline indicator
   * <div *ngIf="!mediaQuery.isOnline()" class="offline-banner">
   *   You are currently offline
   * </div>
   * ```
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
   * Reactive signal that returns the current connection type.
   * 
   * This uses the Network Information API when available to provide
   * information about the connection speed/type.
   * 
   * @returns Connection type string ('4g', '3g', '2g', 'slow-2g', etc.) or 'unknown'
   * 
   * @example
   * ```typescript
   * // Adjust image quality based on connection
   * const imageQuality = this.mediaQuery.connectionType() === 'slow-2g' ? 'low' : 'high';
   * ```
   */
  readonly connectionType = computed(() => {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return connection?.effectiveType || 'unknown';
  });

  // ============================================================================
  // COMPUTED AGGREGATES
  // ============================================================================

  /**
   * Reactive signal containing aggregated device capability information.
   * 
   * This computed signal provides a convenient way to access multiple
   * device characteristics in a single object.
   * 
   * @returns Object containing touch, hover, display, and network capabilities
   * 
   * @example
   * ```typescript
   * // Log all device capabilities
   * console.log('Device capabilities:', this.mediaQuery.deviceCapabilities());
   * 
   * // Use in template
   * <pre>{{ mediaQuery.deviceCapabilities() | json }}</pre>
   * ```
   */
  readonly deviceCapabilities = computed(() => ({
    touch: this.hasTouch(),
    hover: this.canHover(),
    highDensity: this.isHighDensity(),
    online: this.isOnline(),
    connectionType: this.connectionType(),
    pixelRatio: this.devicePixelRatio()
  }));

  /**
   * Reactive signal containing aggregated accessibility preference information.
   * 
   * This computed signal provides easy access to all user accessibility
   * preferences in a single object.
   * 
   * @returns Object containing color scheme, motion, contrast, and transparency preferences
   * 
   * @example
   * ```typescript
   * // Apply accessibility preferences
   * const prefs = this.mediaQuery.accessibilityPreferences();
   * this.applyTheme(prefs.colorScheme);
   * this.configureAnimations(prefs.motionPreference);
   * ```
   */
  readonly accessibilityPreferences = computed(() => ({
    colorScheme: this.colorScheme(),
    motionPreference: this.motionPreference(),
    contrastPreference: this.contrastPreference(),
    reducedTransparency: this.prefersReducedTransparency()
  }));

  /**
   * Reactive signal containing aggregated browser environment information.
   * 
   * This computed signal provides access to various browser and system
   * characteristics that don't change during the session.
   * 
   * @returns Object containing user agent, platform, language, and hardware information
   * 
   * @example
   * ```typescript
   * // Log environment info for debugging
   * console.log('Environment:', this.mediaQuery.environment());
   * 
   * // Adjust UI based on hardware
   * const cores = this.mediaQuery.environment().hardwareConcurrency;
   * if (cores < 4) {
   *   this.enablePerformanceMode();
   * }
   * ```
   */
  readonly environment = computed(() => ({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    language: navigator.language,
    languages: navigator.languages,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    hardwareConcurrency: navigator.hardwareConcurrency || 1
  }));

  /**
   * Reactive signal containing performance-related preferences and capabilities.
   * 
   * This computed signal aggregates information that might affect application
   * performance decisions, such as animation preferences and hardware capabilities.
   * 
   * @returns Object containing motion, transparency, connection, and hardware information
   * 
   * @example
   * ```typescript
   * // Adjust app performance based on preferences and capabilities
   * const perf = this.mediaQuery.performancePreferences();
   * if (perf.reducedMotion || perf.connectionType === 'slow-2g') {
   *   this.disableHeavyAnimations();
   * }
   * ```
   */
  readonly performancePreferences = computed(() => ({
    reducedMotion: this.prefersReducedMotion(),
    reducedTransparency: this.prefersReducedTransparency(),
    connectionType: this.connectionType(),
    hardwareConcurrency: this.environment().hardwareConcurrency
  }));

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Creates a reactive signal for a custom media query.
   * 
   * This utility method allows you to create reactive signals for any CSS media query,
   * extending the built-in capabilities of this service.
   * 
   * @param query - The CSS media query string to monitor
   * @returns A reactive signal that updates when the media query matches/unmatches
   * 
   * @example
   * ```typescript
   * // Monitor custom viewport size
   * readonly isLargeScreen = this.mediaQuery.createMediaQuery('(min-width: 1200px)');
   * 
   * // Monitor device orientation
   * readonly isLandscape = this.mediaQuery.createMediaQuery('(orientation: landscape)');
   * 
   * // Use in component
   * if (this.isLargeScreen()) {
   *   this.showDesktopLayout();
   * }
   * ```
   */
  createMediaQuery(query: string) {
    const mediaQuery = window.matchMedia(query);
    return toSignal(
      merge(
        fromEvent<MediaQueryListEvent>(mediaQuery, 'change'),
        fromEvent(window, 'load')
      ).pipe(
        startWith(null),
        map(() => mediaQuery.matches),
        distinctUntilChanged()
      ),
      { initialValue: mediaQuery.matches }
    );
  }

  /**
   * Creates reactive signals for multiple custom media queries at once.
   * 
   * This utility method allows you to efficiently create multiple media query signals
   * from a configuration object, useful for responsive design breakpoints.
   * 
   * @param queries - Object mapping names to CSS media query strings
   * @returns Object with the same keys, but values are reactive signals
   * 
   * @example
   * ```typescript
   * // Define responsive breakpoints
   * readonly breakpoints = this.mediaQuery.createMediaQueries({
   *   mobile: '(max-width: 767px)',
   *   tablet: '(min-width: 768px) and (max-width: 1023px)',
   *   desktop: '(min-width: 1024px)',
   *   retina: '(-webkit-min-device-pixel-ratio: 2)'
   * });
   * 
   * // Use in component
   * if (this.breakpoints.mobile()) {
   *   this.showMobileMenu();
   * }
   * ```
   */
  createMediaQueries(queries: Record<string, string>) {
    return Object.entries(queries).reduce((acc, [key, query]) => {
      acc[key] = this.createMediaQuery(query);
      return acc;
    }, {} as Record<string, ReturnType<typeof this.createMediaQuery>>);
  }
}