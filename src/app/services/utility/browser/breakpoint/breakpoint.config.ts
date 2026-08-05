import { InjectionToken } from '@angular/core';

/**
 * Configuration object that defines breakpoint names and their corresponding minimum pixel widths.
 * 
 * @example
 * ```typescript
 * const customBreakpoints: BreakpointConfig = {
 *   mobile: 0,
 *   tablet: 768,
 *   desktop: 1024,
 *   ultrawide: 1920
 * };
 * ```
 */
export interface BreakpointConfig {
  /** Key-value pairs where key is breakpoint name and value is minimum width in pixels */
  [key: string]: number;
}

/**
 * Configuration object that maps device types to arrays of breakpoint names.
 * Used to categorize breakpoints into logical device groupings.
 * 
 * @example
 * ```typescript
 * const deviceTypes: DeviceTypeConfig = {
 *   mobile: ['xs', 'sm'],
 *   tablet: ['md'],
 *   desktop: ['lg', 'xl', 'xxl']
 * };
 * ```
 */
export interface DeviceTypeConfig {
  /** Array of breakpoint names that should be considered mobile devices */
  mobile: string[];
  /** Array of breakpoint names that should be considered tablet devices */
  tablet: string[];
  /** Array of breakpoint names that should be considered desktop devices */
  desktop: string[];
}

/**
 * Complete configuration object for the BreakpointService.
 * Combines breakpoint definitions with optional device type mappings.
 * 
 * @example
 * ```typescript
 * const config: BreakpointServiceConfig = {
 *   breakpoints: { xs: 0, sm: 600, md: 960 },
 *   deviceTypes: {
 *     mobile: ['xs'],
 *     tablet: ['sm'],
 *     desktop: ['md']
 *   }
 * };
 * ```
 */
export interface BreakpointServiceConfig {
  /** The breakpoint configuration defining names and minimum widths */
  breakpoints: BreakpointConfig;
  /** Optional device type mappings. If not provided, device type detection will be disabled */
  deviceTypes?: DeviceTypeConfig;
}

/**
 * Default Material Design inspired breakpoint configuration.
 * Provides a mobile-first approach with commonly used breakpoint names.
 * 
 * @remarks
 * - `xs`: Extra small devices (phones) - 0px and up
 * - `sm`: Small devices (landscape phones) - 600px and up  
 * - `md`: Medium devices (tablets) - 960px and up
 * - `lg`: Large devices (desktops) - 1280px and up
 * - `xl`: Extra large devices (large desktops) - 1920px and up
 */
export const DEFAULT_BREAKPOINTS: BreakpointConfig = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920,
} as const;

/**
 * Default device type mappings that work well with the default breakpoints.
 * Maps breakpoint names to logical device categories.
 * 
 * @remarks
 * - Mobile: Extra small and small devices (0-959px)
 * - Tablet: Medium devices (960-1279px)
 * - Desktop: Large and extra large devices (1280px+)
 */
export const DEFAULT_DEVICE_TYPES: DeviceTypeConfig = {
  mobile: ['xs', 'sm'],
  tablet: ['md'],
  desktop: ['lg', 'xl'],
};

/**
 * Complete default configuration combining default breakpoints and device types.
 * This is the configuration used when no custom configuration is provided.
 */
export const DEFAULT_BREAKPOINT_CONFIG: BreakpointServiceConfig = {
  breakpoints: DEFAULT_BREAKPOINTS,
  deviceTypes: DEFAULT_DEVICE_TYPES,
};

/**
 * Injection token for providing custom breakpoint configuration to the BreakpointService.
 * 
 * @example
 * ```typescript
 * // In your module or standalone component
 * providers: [
 *   {
 *     provide: BREAKPOINT_CONFIG,
 *     useValue: {
 *       breakpoints: { mobile: 0, desktop: 768 },
 *       deviceTypes: {
 *         mobile: ['mobile'],
 *         tablet: [],
 *         desktop: ['desktop']
 *       }
 *     }
 *   }
 * ]
 * ```
 */
export const BREAKPOINT_CONFIG = new InjectionToken<BreakpointServiceConfig>(
  'BREAKPOINT_CONFIG',
  {
    providedIn: 'root',
    factory: () => DEFAULT_BREAKPOINT_CONFIG,
  }
);

/**
 * Creates a custom breakpoint configuration with optional device type mappings.
 * Merges provided device types with defaults to ensure all device types are defined.
 * 
 * @param breakpoints - The breakpoint configuration defining names and minimum widths
 * @param deviceTypes - Optional partial device type configuration. Missing device types will use defaults
 * @returns Complete breakpoint service configuration
 * 
 * @example
 * ```typescript
 * const config = createBreakpointConfig(
 *   { small: 0, large: 1200 },
 *   { mobile: ['small'], desktop: ['large'] }
 * );
 * // Result: tablet will default to empty array from DEFAULT_DEVICE_TYPES
 * ```
 */
export function createBreakpointConfig(
  breakpoints: BreakpointConfig,
  deviceTypes?: Partial<DeviceTypeConfig>
): BreakpointServiceConfig {
  return {
    breakpoints,
    deviceTypes: {
      ...DEFAULT_DEVICE_TYPES,
      ...deviceTypes,
    },
  };
}

/**
 * Bootstrap CSS framework inspired breakpoint configuration.
 * Matches Bootstrap v5 breakpoint values for seamless integration.
 * 
 * @remarks
 * Breakpoint values:
 * - `xs`: 0px (implicit, covers 0-575px)
 * - `sm`: 576px and up
 * - `md`: 768px and up
 * - `lg`: 992px and up
 * - `xl`: 1200px and up
 * - `xxl`: 1400px and up
 * 
 * @see {@link https://getbootstrap.com/docs/5.3/layout/breakpoints/}
 */
export const BOOTSTRAP_BREAKPOINTS = createBreakpointConfig({
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400,
});

/**
 * Tailwind CSS framework inspired breakpoint configuration.
 * Matches Tailwind's default responsive breakpoints with custom device mappings.
 * 
 * @remarks
 * Breakpoint values:
 * - `sm`: 640px and up (small devices)
 * - `md`: 768px and up (medium devices)  
 * - `lg`: 1024px and up (large devices)
 * - `xl`: 1280px and up (extra large devices)
 * - `2xl`: 1536px and up (2x extra large devices)
 * 
 * Note: Tailwind doesn't have an explicit xs breakpoint (mobile-first by default)
 * 
 * @see {@link https://tailwindcss.com/docs/responsive-design}
 */
export const TAILWIND_BREAKPOINTS = createBreakpointConfig({
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
}, {
  mobile: ['sm'],
  tablet: ['md', 'lg'],
  desktop: ['xl', '2xl'],
});

/**
 * Simplified mobile-first breakpoint configuration with semantic naming.
 * Uses descriptive names that clearly indicate the intended device category.
 * 
 * @remarks
 * Ideal for projects that prefer semantic breakpoint names over size-based names.
 * Breakpoint values:
 * - `mobile`: 0px and up (phones)
 * - `tablet`: 768px and up (tablets) 
 * - `desktop`: 1024px and up (standard desktops)
 * - `wide`: 1440px and up (wide screens and large desktops)
 * 
 * @example
 * ```typescript
 * // Usage in component
 * isTabletOrLarger = this.breakpointService.isBreakpointUp('tablet');
 * ```
 */
export const CUSTOM_MOBILE_FIRST_BREAKPOINTS = createBreakpointConfig({
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
}, {
  mobile: ['mobile'],
  tablet: ['tablet'],
  desktop: ['desktop', 'wide'],
});