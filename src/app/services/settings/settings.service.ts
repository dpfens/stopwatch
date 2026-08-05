import { Injectable, signal, WritableSignal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { 
  SettingsEntry,
  SettingId,
  SettingScope,
  SettingValueMap,
  TypedSettingsEntry,
  CreateSettingEntry
} from '../../models/settings/interfaces';
import { UniqueIdentifier } from '../../models/sequence/interfaces';
import { SettingsRepository } from '../../repositories/settings';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  platformId = inject(PLATFORM_ID);

  private repository = new SettingsRepository();
  
  private _instances: WritableSignal<SettingsEntry[]> = signal<SettingsEntry[]>([]);
  private _isLoading: WritableSignal<boolean> = signal<boolean>(false);
  private _error: WritableSignal<string | null> = signal<string | null>(null);
  
  // Public readonly signals
  instances = this._instances.asReadonly();
  isLoading = this._isLoading.asReadonly();
  error = this._error.asReadonly();
  
  // Computed signals for derived state
  instanceCount = computed(() => this.instances().length);
  hasInstances = computed(() => this.instances().length > 0);
  
  // Computed signals for scope-based views
  userSettings = computed(() => this.instances().filter(setting => setting.scope === 'user'));
  groupSettings = computed(() => this.instances().filter(setting => setting.scope === 'group'));
  globalSettings = computed(() => this.instances().filter(setting => setting.scope === 'global'));
  
  // Computed counts by scope
  userSettingsCount = computed(() => this.userSettings().length);
  groupSettingsCount = computed(() => this.groupSettings().length);
  globalSettingsCount = computed(() => this.globalSettings().length);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadInstances();
    }
  }

  /**
   * Loads all settings instances from the repository
   */
  async loadInstances(): Promise<void> {
    try {
      this._isLoading.set(true);
      this._error.set(null);
      
      const settingsEntries = await this.repository.getAll();
      
      this._instances.set(settingsEntries);
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to load settings');
      console.error('Error loading settings:', error);
    } finally {
      this._isLoading.set(false);
    }
  }

  // === Type-Safe Core Operations ===

  /**
   * Sets a setting value with full compile-time type safety
   */
  async set<K extends SettingId>(
    key: K, 
    value: SettingValueMap[K], 
    scope: SettingScope
  ): Promise<boolean> {
    try {
      this._error.set(null);
      
      await this.repository.set(key, value, scope);
      
      // Refresh instances to reflect the change
      await this.loadInstances();
      
      // Notify synchronization service if needed
      
      return true;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to set setting');
      console.error('Error setting value:', error);
      return false;
    }
  }

  /**
   * Gets a setting value with type safety (REACTIVE - uses in-memory data)
   */
  getValue<K extends SettingId>(key: K, scope: SettingScope): SettingValueMap[K] | null {
    const setting = this.instances().find(s => s.key === key && s.scope === scope);
    return setting ? setting.value as SettingValueMap[K] : null;
  }

  /**
   * Gets a setting value with intelligent fallback logic (REACTIVE - uses in-memory data)
   */
  getValueWithFallback<K extends SettingId>(
    key: K, 
    scope: SettingScope = 'user'
  ): SettingValueMap[K] | null {
    const instances = this.instances();
    
    // Try specified scope first
    const primarySetting = instances.find(s => s.key === key && s.scope === scope);
    if (primarySetting) {
      return primarySetting.value as SettingValueMap[K];
    }

    // Fallback hierarchy
    const fallbackOrder: SettingScope[] = scope === 'user' 
      ? ['global', 'group']
      : scope === 'global'
      ? ['user', 'group'] 
      : ['user', 'global'];

    for (const fallbackScope of fallbackOrder) {
      const fallbackSetting = instances.find(s => s.key === key && s.scope === fallbackScope);
      if (fallbackSetting) {
        return fallbackSetting.value as SettingValueMap[K];
      }
    }

    return null;
  }

  /**
   * Creates a new setting entry
   */
  async create<K extends SettingId>(
    key: K, 
    value: SettingValueMap[K], 
    scope: SettingScope
  ): Promise<string | null> {
    try {
      this._error.set(null);
      
      const id = await this.repository.create(key, value, scope);
      
      // Refresh instances to include the new setting
      await this.loadInstances();
      
      return id;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to create setting');
      console.error('Error creating setting:', error);
      return null;
    }
  }

  /**
   * Updates an existing setting
   */
  async update<K extends SettingId>(
    key: K, 
    value: SettingValueMap[K], 
    scope: SettingScope
  ): Promise<boolean> {
    try {
      this._error.set(null);
      
      await this.repository.update(key, value, scope);
      
      // Refresh instances to reflect the change
      await this.loadInstances();
      
      return true;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to update setting');
      console.error('Error updating setting:', error);
      return false;
    }
  }

  /**
   * Creates or updates a setting with operation result information
   */
  async upsert<K extends SettingId>(
    key: K, 
    value: SettingValueMap[K], 
    scope: SettingScope
  ): Promise<{ id: UniqueIdentifier; created: boolean } | null> {
    try {
      this._error.set(null);
      
      const result = await this.repository.upsert(key, value, scope);
      
      // Refresh instances to reflect the change
      await this.loadInstances();
      
      return result;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to upsert setting');
      console.error('Error upserting setting:', error);
      return null;
    }
  }

  /**
   * Sets multiple settings atomically
   */
  async setMany(settings: CreateSettingEntry<SettingId>[]): Promise<boolean> {
    try {
      this._error.set(null);
      
      await this.repository.setMany(settings);
      
      // Refresh instances to reflect all changes
      await this.loadInstances();
      
      return true;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to set multiple settings');
      console.error('Error setting multiple values:', error);
      return false;
    }
  }

  // === Query Operations ===

  /**
   * Gets settings by scope (reactive - uses in-memory data)
   */
  getByScope(scope: SettingScope): SettingsEntry[] {
    return this.instances().filter(setting => setting.scope === scope);
  }

  /**
   * Gets all entries for a specific setting key (reactive - uses in-memory data)
   */
  getByKey<K extends SettingId>(key: K): TypedSettingsEntry<K>[] {
    return this.instances()
      .filter(setting => setting.key === key) as TypedSettingsEntry<K>[];
  }

  /**
   * Gets a hierarchical view of setting values across all scopes (REACTIVE - uses in-memory data)
   */
  getHierarchy<K extends SettingId>(key: K): {
    global?: SettingValueMap[K];
    user?: SettingValueMap[K];
    group?: SettingValueMap[K];
  } {
    
    return {
      global: this.globalSettings().find(s => s.key === key)?.value as SettingValueMap[K],
      user: this.userSettings().find(s => s.key === key)?.value as SettingValueMap[K],
      group: this.groupSettings().find(s => s.key === key)?.value as SettingValueMap[K],
    };
  }

  /**
   * Gets a setting by its compound ID (reactive - uses in-memory data)
   */
  getById(id: UniqueIdentifier): SettingsEntry | null {
    return this.instances().find(setting => setting.id === id) || null;
  }

  /**
   * Checks if a setting exists by compound ID (reactive - uses in-memory data)
   */
  exists(id: UniqueIdentifier): boolean {
    return this.instances().some(setting => setting.id === id);
  }

  /**
   * Checks if a setting exists by key and scope (reactive - uses in-memory data)
   */
  existsByKeyAndScope(key: SettingId, scope: SettingScope): boolean {
    return this.instances().some(setting => 
      setting.key === key && setting.scope === scope
    );
  }

  // === Delete Operations ===

  /**
   * Deletes a setting by compound ID
   */
  async deleteById(id: UniqueIdentifier): Promise<boolean> {
    try {
      this._error.set(null);
      
      await this.repository.deleteById(id);
      
      // Remove from in-memory state
      const updatedInstances = this.instances().filter(setting => setting.id !== id);
      this._instances.set(updatedInstances);
      
      return true;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to delete setting');
      console.error('Error deleting setting:', error);
      return false;
    }
  }

  /**
   * Deletes all settings in a specific scope
   */
  async deleteByScope(scope: SettingScope): Promise<boolean> {
    try {
      this._error.set(null);
      
      await this.repository.deleteByScope(scope);
      
      // Remove from in-memory state
      const updatedInstances = this.instances().filter(setting => setting.scope !== scope);
      this._instances.set(updatedInstances);
      
      return true;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to delete settings by scope');
      console.error('Error deleting settings by scope:', error);
      return false;
    }
  }

  /**
   * Deletes all entries for a specific setting key
   */
  async deleteByKey(key: SettingId): Promise<boolean> {
    try {
      this._error.set(null);
      
      await this.repository.deleteByKey(key);
      
      // Remove from in-memory state
      const updatedInstances = this.instances().filter(setting => setting.key !== key);
      this._instances.set(updatedInstances);
      
      return true;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to delete settings by key');
      console.error('Error deleting settings by key:', error);
      return false;
    }
  }

  // === Utility Operations ===

  /**
   * Clears all settings
   */
  async clear(): Promise<boolean> {
    try {
      this._error.set(null);
      
      await this.repository.clear();
      
      // Clear in-memory state
      this._instances.set([]);
      
      return true;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to clear all settings');
      console.error('Error clearing settings:', error);
      return false;
    }
  }

  /**
   * Gets count by scope (reactive - uses in-memory data)
   */
  getCountByScope(scope: SettingScope): number {
    return this.instances().filter(setting => setting.scope === scope).length;
  }

  /**
   * Gets count by key (reactive - uses in-memory data)
   */
  getCountByKey(key: SettingId): number {
    return this.instances().filter(setting => setting.key === key).length;
  }

  /**
   * Gets unique setting keys in the system (reactive - uses in-memory data)
   */
  getUniqueKeys(): SettingId[] {
    const keys = new Set(this.instances().map(setting => setting.key));
    return Array.from(keys);
  }

  /**
   * Gets active scopes in the system (reactive - uses in-memory data)
   */
  getActiveScopes(): SettingScope[] {
    const scopes = new Set(this.instances().map(setting => setting.scope));
    return Array.from(scopes);
  }

  // === Convenience Methods ===

  /**
   * Gets effective value for a setting using fallback logic (reactive when possible)
   */
  getEffectiveValue<K extends SettingId>(key: K): SettingValueMap[K] | null {
    // First try user scope
    const userSetting = this.instances().find(s => s.key === key && s.scope === 'user');
    if (userSetting) {
      return userSetting.value as SettingValueMap[K];
    }

    // Then try global scope
    const globalSetting = this.instances().find(s => s.key === key && s.scope === 'global');
    if (globalSetting) {
      return globalSetting.value as SettingValueMap[K];
    }

    // Group scope requires explicit handling since we don't know which group
    return null;
  }

  /**
   * Checks if a setting has user customization (reactive - uses in-memory data)
   */
  hasUserCustomization(key: SettingId): boolean {
    return this.instances().some(setting => setting.key === key && setting.scope === 'user');
  }

  /**
   * Resets a user setting to use group/global defaults
   */
  async resetUserSetting(key: SettingId): Promise<boolean> {
    const userSetting = this.instances().find(s => s.key === key && s.scope === 'user');
    if (userSetting) {
      return await this.deleteById(userSetting.id);
    }
    return true; // Already reset
  }

  // === Error Management ===

  /**
   * Clears all error states
   */
  clearError(): void {
    this._error.set(null);
  }

  /**
   * Refreshes settings from repository (useful after external changes)
   */
  async refresh(): Promise<void> {
    await this.loadInstances();
  }

  // === Async Repository Methods (for when you need fresh data) ===

  /**
   * Gets a setting value directly from repository (NON-REACTIVE - bypasses cache)
   * Use this when you need the absolute latest data from storage
   */
  async getValueFromRepository<K extends SettingId>(
    key: K, 
    scope: SettingScope
  ): Promise<SettingValueMap[K] | null> {
    try {
      this._error.set(null);
      return await this.repository.getValue(key, scope);
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to get setting value');
      console.error('Error getting value:', error);
      return null;
    }
  }

  /**
   * Gets a setting value with fallback from repository (NON-REACTIVE - bypasses cache)
   */
  async getValueWithFallbackFromRepository<K extends SettingId>(
    key: K, 
    scope: SettingScope = 'user'
  ): Promise<SettingValueMap[K] | null> {
    try {
      this._error.set(null);
      return await this.repository.getValueWithFallback(key, scope);
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to get setting value with fallback');
      console.error('Error getting value with fallback:', error);
      return null;
    }
  }

  /**
   * Gets hierarchical view from repository (NON-REACTIVE - bypasses cache)
   */
  async getHierarchyFromRepository<K extends SettingId>(key: K): Promise<{
    global?: SettingValueMap[K];
    user?: SettingValueMap[K];
    group?: SettingValueMap[K];
  } | null> {
    try {
      this._error.set(null);
      return await this.repository.getHierarchy(key);
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to get setting hierarchy');
      console.error('Error getting hierarchy:', error);
      return null;
    }
  }
}