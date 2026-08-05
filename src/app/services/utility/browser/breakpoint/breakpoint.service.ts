/**
 * @fileoverview
 * Reactive breakpoint detection system for Angular applications.
 * 
 * This module provides a comprehensive solution for responsive design implementation using Angular signals.
 * It automatically detects viewport changes and provides reactive breakpoint information, device type
 * categorization, and orientation tracking.
 * 
 * ## Key Features
 * - **Reactive Signals**: All breakpoint information is provided as Angular signals that update automatically
 * - **Device Type Detection**: Categorizes viewports into mobile, tablet, and desktop based on breakpoint ranges  
 * - **Flexible Configuration**: Supports custom breakpoint definitions via dependency injection
 * - **Predefined Configs**: Includes Bootstrap, Tailwind, and Material Design inspired configurations
 * - **Performance Optimized**: Uses distinctUntilChanged to prevent unnecessary updates
 * 
 * ## Basic Usage
 * ```typescript
 * @Component({...})
 * export class MyComponent {
 *   private breakpointService = inject(BreakpointService);
 *   
 *   // Simple device detection
 *   isMobile = this.breakpointService.isMobile;
 *   isDesktop = this.breakpointService.isDesktop;
 *   
 *   // Breakpoint-specific checks
 *   isLargeScreen = this.breakpointService.isBreakpointUp('lg');
 *   showSidebar = computed(() => !this.isMobile());
 * }
 * ```
 * 
 * ## Configuration
 * The service can be configured using the `BREAKPOINT_CONFIG` injection token:
 * 
 * ```typescript
 * // Using predefined configuration
 * import { BOOTSTRAP_BREAKPOINTS } from './breakpoint.config';
 * 
 * @NgModule({
 *   providers: [
 *     { provide: BREAKPOINT_CONFIG, useValue: BOOTSTRAP_BREAKPOINTS }
 *   ]
 * })
 * 
 * // Custom configuration
 * providers: [
 *   {
 *     provide: BREAKPOINT_CONFIG,
 *     useValue: {
 *       breakpoints: { mobile: 0, tablet: 768, desktop: 1024 },
 *       deviceTypes: {
 *         mobile: ['mobile'],
 *         tablet: ['tablet'], 
 *         desktop: ['desktop']
 *       }
 *     }
 *   }
 * ]
 * ```
 * 
 * ## Available Configurations
 * - `DEFAULT_BREAKPOINT_CONFIG`: Material Design inspired (default)
 * - `BOOTSTRAP_BREAKPOINTS`: Bootstrap v5 compatible breakpoints
 * - `TAILWIND_BREAKPOINTS`: Tailwind CSS compatible breakpoints
 * - `CUSTOM_MOBILE_FIRST_BREAKPOINTS`: Semantic naming approach
 * 
 * @see {@link BreakpointService} for detailed API documentation
 * @see {@link ./breakpoint.config} for configuration options and predefined setups
 */

import { Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { fromEvent, startWith, map, distinctUntilChanged } from 'rxjs';
import { 
  BREAKPOINT_CONFIG, 
  BreakpointConfig 
} from './breakpoint.config';

/**
 * Represents the type of device based on screen size categorization.
 * Used for high-level device detection and responsive behavior.
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';

/**
 * A comprehensive breakpoint detection service for Angular applications.
 * 
 * Provides reactive signals for:
 * - Current breakpoint detection
 * - Device type categorization  
 * - Screen orientation and dimensions
 * - Flexible breakpoint range checking
 * - Dynamic configuration updates
 * 
 * @remarks
 * This service uses Angular signals for reactive state management and automatically
 * updates when the browser window is resized. All breakpoint checks are computed
 * reactively and will trigger change detection when viewport changes occur.
 * 
 * The service supports custom breakpoint configurations through dependency injection
 * and provides several predefined configurations (Bootstrap, Tailwind, etc.).
 * 
 * @example
 * Basic usage in a component:
 * ```typescript
 * @Component({...})
 * export class MyComponent {
 *   private breakpointService = inject(BreakpointService);
 *   
 *   // Reactive signals
 *   isMobile = this.breakpointService.isMobile;
 *   currentBreakpoint = this.breakpointService.currentBreakpoint;
 *   isLargeScreen = this.breakpointService.isBreakpointUp('lg');
 * }
 * ```
 * 
 * @example
 * Custom configuration:
 * ```typescript
 * // In your module providers
 * providers: [
 *   {
 *     provide: BREAKPOINT_CONFIG,
 *     useValue: {
 *       breakpoints: { mobile: 0, desktop: 768 },
 *       deviceTypes: { mobile: ['mobile'], tablet: [], desktop: ['desktop'] }
 *     }
 *   }
 * ]
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class BreakpointService {
  /** 
   * Injected breakpoint configuration.
   * @private
   */
  private readonly config = inject(BREAKPOINT_CONFIG);
  
  /**
   * Reactive signal tracking the current window width in pixels.
   * Updates automatically on window resize events with debouncing via distinctUntilChanged.
   * @private
   */
  private readonly windowWidth = toSignal(
    fromEvent(window, 'resize').pipe(
      startWith(null),
      map(() => window.innerWidth),
      distinctUntilChanged()
    ),
    { initialValue: window.innerWidth }
  );

  /**
   * Reactive signal tracking the current window height in pixels.
   * Updates automatically on window resize events with debouncing via distinctUntilChanged.
   * @private
   */
  private readonly windowHeight = toSignal(
    fromEvent(window, 'resize').pipe(
      startWith(null),
      map(() => window.innerHeight),
      distinctUntilChanged()
    ),
    { initialValue: window.innerHeight }
  );

  /**
   * Exposes the current breakpoint configuration as a writable signal.
   * Can be updated at runtime using {@link updateBreakpoints}.
   * 
   * @example
   * ```typescript
   * const breakpoints = this.breakpointService.breakpoints();
   * console.log(breakpoints); // { xs: 0, sm: 600, md: 960, ... }
   * ```
   */
  readonly breakpoints = signal(this.config.breakpoints);

  /**
   * Computed signal containing all breakpoint names from the current configuration.
   * Updates automatically when breakpoints configuration changes.
   * 
   * @returns Array of breakpoint names (e.g., ['xs', 'sm', 'md', 'lg', 'xl'])
   * 
   * @example
   * ```typescript
   * const names = this.breakpointService.breakpointNames();
   * // Use for generating dynamic UI or validation
   * ```
   */
  readonly breakpointNames = computed(() => Object.keys(this.breakpoints()));
  
  /**
   * Computed signal that returns the name of the currently active breakpoint.
   * Updates reactively when the window width changes.
   * 
   * @returns The name of the current breakpoint or 'unknown' if no match is found
   * 
   * @remarks
   * Uses a mobile-first approach: returns the largest breakpoint whose minimum width
   * is less than or equal to the current window width.
   * 
   * @example
   * ```typescript
   * // Window width: 800px, breakpoints: {xs: 0, sm: 600, md: 960}
   * const current = this.breakpointService.currentBreakpoint();
   * console.log(current); // 'sm'
   * ```
   */
  readonly currentBreakpoint = computed(() => {
    const width = this.windowWidth();
    const breakpoints = this.breakpoints();
    const entries = Object.entries(breakpoints).sort((a, b) => b[1] - a[1]);
    
    for (const [name, minWidth] of entries) {
      if (width >= minWidth) {
        return name;
      }
    }
    
    return entries[entries.length - 1]?.[0] || 'unknown';
  });

  /**
   * Computed signal that returns the current device type based on the active breakpoint.
   * Returns undefined if no device type configuration is provided.
   * 
   * @returns The current device type or undefined if device types are not configured
   * 
   * @remarks
   * Device type is determined by checking which device type array contains the current breakpoint.
   * If the current breakpoint appears in multiple device type arrays, the first match is returned.
   * 
   * @example
   * ```typescript
   * const deviceType = this.breakpointService.deviceType();
   * if (deviceType === 'mobile') {
   *   // Show mobile-specific UI
   * }
   * ```
   */
  readonly deviceType = computed<DeviceType | undefined>(() => {
    const current = this.currentBreakpoint();
    const deviceTypes = this.config.deviceTypes;
    
    if (!deviceTypes) return undefined;
    
    for (const [type, breakpoints] of Object.entries(deviceTypes)) {
      if (breakpoints.includes(current)) {
        return type as DeviceType;
      }
    }
    
    return undefined;
  });

  /**
   * Computed signal that returns the current screen orientation.
   * 
   * @returns 'portrait' if height ≥ width, 'landscape' if width > height
   * 
   * @example
   * ```typescript
   * const orientation = this.breakpointService.orientation();
   * const showSidebar = orientation === 'landscape';
   * ```
   */
  readonly orientation = computed<'portrait' | 'landscape'>(() => 
    this.windowWidth() > this.windowHeight() ? 'landscape' : 'portrait'
  );

  /**
   * Computed signal that returns true when the screen is in portrait orientation.
   * Convenience wrapper around {@link orientation}.
   * 
   * @returns True if in portrait mode (height ≥ width)
   */
  readonly isPortrait = computed(() => this.orientation() === 'portrait');

  /**
   * Computed signal that returns true when the screen is in landscape orientation.
   * Convenience wrapper around {@link orientation}.
   * 
   * @returns True if in landscape mode (width > height)
   */
  readonly isLandscape = computed(() => this.orientation() === 'landscape');

  /**
   * Computed signal that returns the current aspect ratio of the viewport.
   * 
   * @returns The aspect ratio as width divided by height
   * 
   * @example
   * ```typescript
   * const ratio = this.breakpointService.aspectRatio();
   * const isWidescreen = ratio > 1.77; // 16:9 ratio
   * ```
   */
  readonly aspectRatio = computed(() => 
    this.windowWidth() / this.windowHeight()
  );

  /**
   * Computed signal that returns comprehensive viewport dimension information.
   * 
   * @returns Object containing width, height, and aspect ratio
   * 
   * @example
   * ```typescript
   * const { width, height, aspectRatio } = this.breakpointService.dimensions();
   * console.log(`Viewport: ${width}x${height}, ratio: ${aspectRatio.toFixed(2)}`);
   * ```
   */
  readonly dimensions = computed(() => ({
    width: this.windowWidth(),
    height: this.windowHeight(),
    aspectRatio: this.aspectRatio()
  }));

  /**
   * Creates a computed signal that checks if the current breakpoint matches the specified name.
   * 
   * @param name - The breakpoint name to check
   * @returns A computed signal that returns true when the current breakpoint matches the specified name
   * 
   * @example
   * ```typescript
   * const isMedium = this.breakpointService.isBreakpoint('md');
   * 
   * // In template
   * @if (isMedium()) {
   *   <div>Medium breakpoint content</div>
   * }
   * ```
   */
  readonly isBreakpoint = (name: string) => computed(() => 
    this.currentBreakpoint() === name
  );

  /**
   * Creates a computed signal that checks if the current viewport is at or above the specified breakpoint.
   * Implements a "mobile-first" media query equivalent.
   * 
   * @param name - The breakpoint name to check
   * @returns A computed signal that returns true when viewport width ≥ breakpoint minimum width
   * 
   * @example
   * ```typescript
   * const isTabletUp = this.breakpointService.isBreakpointUp('md');
   * 
   * // Equivalent to CSS: @media (min-width: 960px)
   * ```
   */
  readonly isBreakpointUp = (name: string) => computed(() => {
    const breakpoints = this.breakpoints();
    const targetWidth = breakpoints[name];
    return targetWidth !== undefined && this.windowWidth() >= targetWidth;
  });

  /**
   * Creates a computed signal that checks if the current viewport is below the next breakpoint.
   * Implements a "desktop-first" media query equivalent.
   * 
   * @param name - The breakpoint name to check
   * @returns A computed signal that returns true when viewport width < next breakpoint width
   * 
   * @remarks
   * Returns false if the breakpoint doesn't exist or if it's the largest breakpoint.
   * 
   * @example
   * ```typescript
   * const isMediumDown = this.breakpointService.isBreakpointDown('md');
   * 
   * // Equivalent to CSS: @media (max-width: 1279px) assuming lg starts at 1280px
   * ```
   */
  readonly isBreakpointDown = (name: string) => computed(() => {
    const breakpoints = this.breakpoints();
    const breakpointNames = Object.keys(breakpoints).sort((a, b) => breakpoints[a] - breakpoints[b]);
    const currentIndex = breakpointNames.indexOf(name);
    
    if (currentIndex === -1 || currentIndex === breakpointNames.length - 1) {
      return false;
    }
    
    const nextBreakpointWidth = breakpoints[breakpointNames[currentIndex + 1]];
    return this.windowWidth() < nextBreakpointWidth;
  });

  /**
   * Creates a computed signal that checks if the current viewport falls between two breakpoints.
   * Useful for targeting specific breakpoint ranges.
   * 
   * @param minBreakpoint - The minimum breakpoint name (inclusive)
   * @param maxBreakpoint - The maximum breakpoint name (exclusive)
   * @returns A computed signal that returns true when viewport is within the specified range
   * 
   * @example
   * ```typescript
   * const isTabletOnly = this.breakpointService.isBreakpointBetween('md', 'lg');
   * 
   * // True when: md ≤ viewport < lg
   * // Equivalent to CSS: @media (min-width: 960px) and (max-width: 1279px)
   * ```
   */
  readonly isBreakpointBetween = (minBreakpoint: string, maxBreakpoint: string) => computed(() => {
    const breakpoints = this.breakpoints();
    const minWidth = breakpoints[minBreakpoint];
    const maxWidth = breakpoints[maxBreakpoint];
    const currentWidth = this.windowWidth();
    
    if (minWidth === undefined || maxWidth === undefined) {
      return false;
    }
    
    return currentWidth >= minWidth && currentWidth < maxWidth;
  });

  /**
   * Computed signal that returns true when the current device type is 'mobile'.
   * Convenience wrapper around {@link deviceType}.
   * 
   * @returns True if current device type is mobile, false otherwise
   */
  readonly isMobile = computed(() => this.deviceType() === 'mobile');

  /**
   * Computed signal that returns true when the current device type is 'tablet'.
   * Convenience wrapper around {@link deviceType}.
   * 
   * @returns True if current device type is tablet, false otherwise
   */
  readonly isTablet = computed(() => this.deviceType() === 'tablet');

  /**
   * Computed signal that returns true when the current device type is 'desktop'.
   * Convenience wrapper around {@link deviceType}.
   * 
   * @returns True if current device type is desktop, false otherwise
   */
  readonly isDesktop = computed(() => this.deviceType() === 'desktop');

  /**
   * Creates a computed signal that checks if the current viewport width falls within a custom pixel range.
   * Useful for breakpoint-agnostic width checking.
   * 
   * @param minWidth - The minimum width in pixels (inclusive)
   * @param maxWidth - The maximum width in pixels (exclusive). If undefined, no upper limit is applied
   * @returns A computed signal that returns true when viewport width is within the specified range
   * 
   * @example
   * ```typescript
   * const isNarrowRange = this.breakpointService.isWidthBetween(400, 800);
   * const isWideScreen = this.breakpointService.isWidthBetween(1920); // 1920px and up
   * ```
   */
  readonly isWidthBetween = (minWidth: number, maxWidth?: number) => computed(() => {
    const width = this.windowWidth();
    const meetsMin = width >= minWidth;
    const meetsMax = maxWidth === undefined || width < maxWidth;
    return meetsMin && meetsMax;
  });

  /**
   * Updates the breakpoint configuration at runtime.
   * Useful for dynamic theming, user preferences, or configuration changes.
   * 
   * @param newBreakpoints - The new breakpoint configuration to apply
   * 
   * @remarks
   * This will cause all computed signals to recalculate based on the new configuration.
   * Device type mappings remain unchanged - only breakpoint values are updated.
   * 
   * @example
   * ```typescript
   * // Switch to a custom breakpoint set
   * this.breakpointService.updateBreakpoints({
   *   small: 0,
   *   large: 1000
   * });
   * ```
   */
  updateBreakpoints(newBreakpoints: BreakpointConfig): void {
    this.breakpoints.set(newBreakpoints);
  }

  /**
   * Computed signal that returns comprehensive information about all breakpoints.
   * Provides active, up, down, and minimum width information for each breakpoint.
   * 
   * @returns Object with breakpoint names as keys and status information as values
   * 
   * @remarks
   * This is useful for debugging, building dynamic UIs, or when you need complete
   * breakpoint state information. Each breakpoint entry contains:
   * - `active`: true if this is the current breakpoint
   * - `up`: true if viewport is at or above this breakpoint
   * - `down`: true if viewport is below the next breakpoint
   * - `minWidth`: the minimum pixel width for this breakpoint
   * 
   * @example
   * ```typescript
   * const allBreakpoints = this.breakpointService.allBreakpoints();
   * // {
   * //   xs: { active: false, up: true, down: false, minWidth: 0 },
   * //   sm: { active: true, up: true, down: true, minWidth: 600 },
   * //   md: { active: false, up: false, down: false, minWidth: 960 }
   * // }
   * 
   * // Usage in template for debugging
   * @for (item of allBreakpoints() | keyvalue; track item.key) {
   *   <div>{{item.key}}: {{item.value.active ? 'ACTIVE' : 'inactive'}}</div>
   * }
   * ```
   */
  readonly allBreakpoints = computed(() => {
    const current = this.currentBreakpoint();
    const breakpoints = this.breakpoints();
    const width = this.windowWidth();
    const breakpointNames = Object.keys(breakpoints).sort((a, b) => breakpoints[a] - breakpoints[b]);
    
    return Object.keys(breakpoints).reduce((acc, name) => {
      // Calculate down value directly to avoid signal nesting issues
      const currentIndex = breakpointNames.indexOf(name);
      const isDown = currentIndex !== -1 && 
                    currentIndex < breakpointNames.length - 1 && 
                    width < breakpoints[breakpointNames[currentIndex + 1]];
      
      acc[name] = {
        active: current === name,
        up: width >= breakpoints[name],
        down: isDown,
        minWidth: breakpoints[name]
      };
      return acc;
    }, {} as Record<string, {
      active: boolean;
      up: boolean;
      down: boolean;
      minWidth: number;
    }>);
  });

  /**
   * Gets the minimum pixel width for a specific breakpoint.
   * 
   * @param name - The breakpoint name to look up
   * @returns The minimum width in pixels, or undefined if the breakpoint doesn't exist
   * 
   * @example
   * ```typescript
   * const mdWidth = this.breakpointService.getBreakpointValue('md');
   * console.log(mdWidth); // 960 (with default config)
   * ```
   */
  getBreakpointValue(name: string): number | undefined {
    return this.breakpoints()[name];
  }

  /**
   * Gets the name of the next larger breakpoint after the specified one.
   * 
   * @param name - The current breakpoint name
   * @returns The next breakpoint name, or undefined if this is the largest breakpoint
   * 
   * @example
   * ```typescript
   * const next = this.breakpointService.getNextBreakpoint('md');
   * console.log(next); // 'lg' (with default config)
   * 
   * const lastNext = this.breakpointService.getNextBreakpoint('xl');
   * console.log(lastNext); // undefined (xl is the largest)
   * ```
   */
  getNextBreakpoint(name: string): string | undefined {
    const breakpoints = this.breakpoints();
    const sortedNames = Object.keys(breakpoints).sort((a, b) => breakpoints[a] - breakpoints[b]);
    const currentIndex = sortedNames.indexOf(name);
    return currentIndex !== -1 && currentIndex < sortedNames.length - 1 
      ? sortedNames[currentIndex + 1] 
      : undefined;
  }

  /**
   * Gets the name of the next smaller breakpoint before the specified one.
   * 
   * @param name - The current breakpoint name
   * @returns The previous breakpoint name, or undefined if this is the smallest breakpoint
   * 
   * @example
   * ```typescript
   * const prev = this.breakpointService.getPreviousBreakpoint('md');
   * console.log(prev); // 'sm' (with default config)
   * 
   * const firstPrev = this.breakpointService.getPreviousBreakpoint('xs');
   * console.log(firstPrev); // undefined (xs is the smallest)
   * ```
   */
  getPreviousBreakpoint(name: string): string | undefined {
    const breakpoints = this.breakpoints();
    const sortedNames = Object.keys(breakpoints).sort((a, b) => breakpoints[a] - breakpoints[b]);
    const currentIndex = sortedNames.indexOf(name);
    return currentIndex > 0 ? sortedNames[currentIndex - 1] : undefined;
  }
}