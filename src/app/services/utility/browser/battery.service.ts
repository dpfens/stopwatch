import { computed, Injectable, signal } from "@angular/core";

/**
 * Battery Status API interface extending EventTarget
 * Provides information about the system's battery charge level.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/API/BatteryManager
 */
interface BatteryManager extends EventTarget {
  /** Indicates whether the battery is charging */
  readonly charging: boolean;
  /** The amount of time until the battery is charged, in seconds */
  readonly chargingTime: number;
  /** The amount of time until the battery is discharged, in seconds */
  readonly dischargingTime: number;
  /** The level of the battery (0 to 1.0) */
  readonly level: number;
  /** Event handler for when the charging state changes */
  onchargingchange: ((this: BatteryManager, ev: Event) => any) | null;
  /** Event handler for when the charging time changes */
  onchargingtimechange: ((this: BatteryManager, ev: Event) => any) | null;
  /** Event handler for when the discharging time changes */
  ondischargingtimechange: ((this: BatteryManager, ev: Event) => any) | null;
  /** Event handler for when the battery level changes */
  onlevelchange: ((this: BatteryManager, ev: Event) => any) | null;
}

/**
 * Service for monitoring device battery status and providing power-aware recommendations.
 * 
 * This service provides reactive access to battery information including:
 * - Battery charge level
 * - Charging status
 * - Time estimates for charging/discharging
 * - Power saving recommendations
 * 
 * All properties are reactive Angular signals that update when battery status changes.
 * Gracefully handles browsers that don't support the Battery Status API.
 * 
 * @example
 * ```typescript
 * constructor(private battery: BatteryService) {
 *   // React to low battery
 *   effect(() => {
 *     if (this.battery.isPowerSaveRecommended()) {
 *       this.enablePowerSaveMode();
 *     }
 *   });
 * 
 *   // Show battery status
 *   effect(() => {
 *     const info = this.battery.batteryInfo();
 *     this.updateBatteryUI(info);
 *   });
 * }
 * ```
 * 
 * @since 1.0.0
 */
@Injectable({
  providedIn: 'root'
})
export class BatteryService {
  /**
   * Internal signal holding the BatteryManager instance.
   * 
   * @private
   */
  private batteryManager = signal<BatteryManager | null>(null);
  
  /**
   * Reactive signal providing the current battery level as a percentage.
   * 
   * Converts the battery API's 0-1 level to a 0-100 percentage.
   * Returns 100 if battery API is not available (assumes plugged in).
   * 
   * @returns Signal<number> - Battery level percentage (0-100)
   */
  readonly level = computed(() => {
    const battery = this.batteryManager();
    return battery ? Math.round(battery.level * 100) : 100;
  });

  /**
   * Reactive signal indicating whether the device is currently charging.
   * 
   * Returns true if the battery API is not available (assumes plugged in).
   * 
   * @returns Signal<boolean> - true if charging or API unavailable
   */
  readonly isCharging = computed(() => {
    const battery = this.batteryManager();
    return battery ? battery.charging : true;
  });

  /**
   * Reactive signal providing estimated time until fully charged.
   * 
   * Returns the time in seconds, or 0 if not charging or API unavailable.
   * 
   * @returns Signal<number> - Charging time in seconds
   */
  readonly chargingTime = computed(() => {
    const battery = this.batteryManager();
    return battery?.chargingTime || 0;
  });

  /**
   * Reactive signal providing estimated time until battery is discharged.
   * 
   * Returns the time in seconds, or Infinity if charging or API unavailable.
   * 
   * @returns Signal<number> - Discharging time in seconds or Infinity
   */
  readonly dischargingTime = computed(() => {
    const battery = this.batteryManager();
    return battery?.dischargingTime || Infinity;
  });

  /**
   * Computed signal providing a categorized battery status.
   * 
   * Categorizes battery state into meaningful groups:
   * - 'charging': Device is plugged in
   * - 'high': >80% charge
   * - 'medium': 51-80% charge  
   * - 'low': 21-50% charge
   * - 'critical': ≤20% charge
   * 
   * @returns Signal<string> - Battery status category
   */
  readonly batteryStatus = computed(() => {
    const level = this.level();
    const charging = this.isCharging();
    
    if (charging) return 'charging';
    if (level > 80) return 'high';
    if (level > 50) return 'medium';
    if (level > 20) return 'low';
    return 'critical';
  });

  /**
   * Computed signal indicating whether power saving mode is recommended.
   * 
   * Recommends power saving when device is not charging and battery is below 30%.
   * Applications should reduce CPU-intensive operations when this returns true.
   * 
   * @returns Signal<boolean> - true if power saving is recommended
   */
  readonly isPowerSaveRecommended = computed(() => {
    return !this.isCharging() && this.level() < 30;
  });

  /**
   * Computed signal providing comprehensive battery information.
   * 
   * Aggregates all battery metrics into a single object for easy consumption.
   * 
   * @returns Signal<object> - Complete battery information
   * 
   * @example
   * ```typescript
   * const battery = this.batteryService.batteryInfo();
   * console.log(`Battery: ${battery.level}% (${battery.status})`);
   * ```
   */
  readonly batteryInfo = computed(() => ({
    level: this.level(),
    isCharging: this.isCharging(),
    status: this.batteryStatus(),
    chargingTime: this.chargingTime(),
    dischargingTime: this.dischargingTime(),
    powerSaveMode: this.isPowerSaveRecommended()
  }));

  /**
   * Initializes the battery service and sets up event listeners.
   * 
   * Attempts to access the Battery Status API and registers event handlers
   * for battery state changes. Gracefully handles API unavailability.
   * 
   * @constructor
   */
  constructor() {
    // Initialize battery API if available
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: BatteryManager) => {
        this.batteryManager.set(battery);
        
        // Update on battery events
        battery.addEventListener('levelchange', () => {
          this.batteryManager.set({...battery});
        });
        
        battery.addEventListener('chargingchange', () => {
          this.batteryManager.set({...battery});
        });
        
        battery.addEventListener('chargingtimechange', () => {
          this.batteryManager.set({...battery});
        });
        
        battery.addEventListener('dischargingtimechange', () => {
          this.batteryManager.set({...battery});
        });
      });
    }
  }
}
