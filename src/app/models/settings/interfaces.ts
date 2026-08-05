import { UniquelyIdentifiable } from "../sequence/interfaces";

/**
 * Type mapping for setting values - add new settings here
 */
export type SettingValueMap = {
  'defaultLapUnit': string;
  'defaultLapValue': number;
  'theme': 'light' | 'dark';
  'stopwatchView': 'grid' | 'list'
  // Add more settings as needed:
  // 'theme': 'light' | 'dark';
  // 'maxLaps': number;
  // 'notifications': boolean;
}

/**
 * Valid setting identifiers - automatically derived from the value map
 */
export type SettingId = keyof SettingValueMap;

/**
 * Valid scope types for settings, defining the hierarchical levels at which settings can be configured.
 * 
 * ## Scope Hierarchy (highest to lowest priority)
 * 1. **user** - Personal preferences that apply to all of the user's stopwatches
 * 2. **group** - Shared settings that apply to all stopwatches within a specific group
 * 3. **global** - Application-wide defaults used when no user or group setting exists
 * 
 * ## Scope Usage
 * - **`'user'`**: Individual user preferences (e.g., "I prefer lap times in minutes")
 * - **`'group'`**: Group-specific defaults (e.g., "Sprint training stopwatches default to seconds") 
 * - **`'global'`**: System-wide fallback defaults (e.g., "App default is seconds unless overridden")
 * 
 * Settings are resolved using fallback logic: user settings override group settings, 
 * which override global settings.
 * 
 * @example
 * ```typescript
 * // User Mary sets her personal preference
 * await repo.set('defaultLapUnit', 'minutes', 'user');
 * 
 * // Sprint Training group sets their default  
 * await repo.set('defaultLapUnit', 'seconds', 'group');
 * 
 * // App sets system default
 * await repo.set('defaultLapUnit', 'milliseconds', 'global');
 * 
 * // Mary's stopwatches will use 'minutes' (user scope wins)
 * // Sprint Training group members without user preference use 'seconds'
 * // Everyone else uses 'milliseconds'
 * ```
 */
export type SettingScope = 'user' | 'group' | 'global';

/**
 * Settings entry interface for storage
 * Note: Using `any` for value to avoid generic/union type complexity in storage layer
 */
export interface SettingsEntry extends UniquelyIdentifiable {
  key: SettingId;       // The setting identifier
  value: any;           // The actual setting value (typed at runtime)
  scope: SettingScope;  // The scope for this setting
}

/**
 * Type-safe settings entry for specific keys
 */
export type TypedSettingsEntry<K extends SettingId> = SettingsEntry & {
  key: K;
  value: SettingValueMap[K];
};

/**
 * Helper type for creating new setting entries
 */
export type CreateSettingEntry<K extends SettingId> = {
  key: K;
  value: SettingValueMap[K];
  scope: SettingScope;
};

/**
 * Type guard to check if a settings entry matches a specific key type
 */
export function isSettingEntryOfType<K extends SettingId>(
  entry: SettingsEntry, 
  key: K
): entry is TypedSettingsEntry<K> {
  return entry.key === key;
}