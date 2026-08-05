import { IndexedDBStorageAdapter, IStorageRepository, IIndexOperations, IBulkOperations } from "../utilities/storage";
import { BaseRepository, StopwatchDatabase } from "./application";
import { 
  SettingId, 
  SettingScope, 
  SettingsEntry,
  TypedSettingsEntry,
  SettingValueMap,
  CreateSettingEntry,
  isSettingEntryOfType
} from "../models/settings/interfaces";
import { UniqueIdentifier } from "../models/sequence/interfaces";

/**
 * Repository for managing application settings with comprehensive type safety and IndexedDB operations.
 * 
 * This repository provides a complete interface for managing application settings across different scopes
 * (user, group, global) with full TypeScript type safety. It leverages IndexedDB for persistent storage
 * and provides both high-level convenience methods and low-level IndexedDB operations.
 * 
 * ## Key Features
 * - **Type Safety**: All setting operations are fully type-checked at compile time
 * - **Scoped Settings**: Support for user, group, and global setting scopes with fallback logic
 * - **Compound Keys**: Uses compound keys (settingKey_scope) for efficient storage and retrieval
 * - **Bulk Operations**: Efficient batch operations for handling multiple settings
 * - **Index Support**: Leverages IndexedDB indexes for fast queries by scope and key
 * - **Transaction Safety**: All operations use appropriate IndexedDB transactions
 * 
 * ## Setting Scopes
 * - **user**: User-specific settings (highest priority in fallback)
 * - **group**: Group-specific settings (requires explicit specification)
 * - **global**: Application-wide defaults (lowest priority in fallback)
 * 
 * ## Storage Architecture
 * Settings are stored using compound keys in the format `${settingKey}_${scope}` to ensure
 * uniqueness across different scopes while maintaining efficient querying capabilities.
 * 
 * @example Basic Operations
 * ```typescript
 * const repo = new SettingsRepository();
 * 
 * // Type-safe setting operations
 * await repo.set('defaultLapUnit', 'seconds', 'user'); // ✅ 'seconds' is valid
 * await repo.set('defaultLapValue', 42, 'user');       // ✅ 42 is a number
 * // await repo.set('defaultLapUnit', 42, 'user');     // ❌ TypeScript error
 * 
 * // Type-safe retrieval with automatic type inference
 * const lapUnit: string | null = await repo.getValue('defaultLapUnit', 'user');
 * const lapValue: number | null = await repo.getValue('defaultLapValue', 'user');
 * 
 * // Fallback logic: user -> global
 * const value = await repo.getValueWithFallback('defaultLapUnit'); // Tries user, then global
 * ```
 * 
 * @example Batch Operations
 * ```typescript
 * // Set multiple settings atomically
 * await repo.setMany([
 *   { key: 'defaultLapUnit', value: 'minutes', scope: 'user' },
 *   { key: 'defaultLapValue', value: 30, scope: 'user' }
 * ]);
 * 
 * // Query by scope
 * const userSettings = await repo.getByScope('user');
 * const globalDefaults = await repo.getByScope('global');
 * ```
 * 
 * @example Advanced Querying
 * ```typescript
 * // Get all entries for a specific setting across all scopes
 * const allLapUnits = await repo.getByKey('defaultLapUnit');
 * 
 * // Get hierarchy view of a setting
 * const hierarchy = await repo.getHierarchy('defaultLapUnit');
 * // Returns: { user?: string, global?: string, group?: string }
 * 
 * // Direct IndexedDB access for advanced operations
 * const cursor = await repo.getScopeCursor();
 * ```
 * 
 * @since 1.0.0
 * @author Doug Fenstermacher
 * 
 * @see {@link SettingsEntry} for the storage interface
 * @see {@link SettingValueMap} for type mappings
 * @see {@link IndexedDBStorageAdapter} for underlying storage operations
 */
export class SettingsRepository extends BaseRepository {
  /** The IndexedDB object store name for settings */
  private static readonly SETTINGS_STORE = "settings";
  
  /** Storage adapter for IndexedDB operations */
  private adapter: IndexedDBStorageAdapter<SettingsEntry>;
  
  /** Reference to the database instance */
  private database: StopwatchDatabase;

  /** 
   * Direct access to the basic CRUD repository for settings.
   * Provides standard create, read, update, delete operations.
   * 
   * @readonly
   */
  public readonly repository: IStorageRepository<SettingsEntry>;
  
  /** 
   * Direct access to index-based operations repository.
   * Enables efficient querying by indexed fields like scope and key.
   * 
   * @readonly
   */
  public readonly indexRepository: IIndexOperations<SettingsEntry>;
  
  /** 
   * Direct access to bulk operations repository.
   * Provides efficient batch operations for large datasets.
   * 
   * @readonly
   */
  public readonly bulkRepository: IBulkOperations<SettingsEntry>;

  /**
   * Creates a new SettingsRepository instance.
   * 
   * Initializes the repository with the provided database instance and sets up
   * the underlying IndexedDB adapter along with specialized repositories for
   * different operation types.
   * 
   * @example
   * ```typescript
   * const settingsRepo = new SettingsRepository();
   * ```
   */
  constructor() {
    super();
    this.database = new StopwatchDatabase(
        SettingsRepository.DB_NAME, 
        SettingsRepository.DB_VERSION
    );
    this.adapter = new IndexedDBStorageAdapter<SettingsEntry>(this.database);
    
    // Expose repositories for direct access
    this.repository = this.adapter.getRepository();
    this.indexRepository = this.adapter.getIndexRepository();
    this.bulkRepository = this.adapter.getBulkRepository();
  }

  /**
   * Creates a compound key for IndexedDB storage.
   * 
   * Combines a setting key and scope into a unique identifier using the format
   * `${settingKey}_${scope}`. This ensures each setting can have different values
   * across different scopes while maintaining uniqueness constraints.
   * 
   * @private
   * @param key - The setting identifier
   * @param scope - The scope for the setting (user, group, or global)
   * @returns The compound key string
   * 
   * @example
   * ```typescript
   * // Returns "defaultLapUnit_user"
   * const compoundKey = this.createCompoundKey('defaultLapUnit', 'user');
   * ```
   */
  private createCompoundKey(key: SettingId, scope: SettingScope): string {
    return `${key}_${scope}`;
  }

  // === Type-Safe Core Operations ===

  /**
   * Sets a setting value with full compile-time type safety.
   * 
   * Creates or updates a setting entry for the specified key, value, and scope.
   * The value type is automatically validated based on the setting key using
   * TypeScript's type system. This method uses upsert semantics - it will create
   * the setting if it doesn't exist or update it if it does.
   * 
   * @template K - The setting key type, automatically inferred from the key parameter
   * @param key - The setting identifier (must be a valid SettingId)
   * @param value - The setting value (type-checked against SettingValueMap[K])
   * @param scope - The scope for this setting (user, group, or global)
   * 
   * @returns Promise that resolves when the operation completes
   * 
   * @throws {Error} If the database operation fails
   * 
   * @example
   * ```typescript
   * // Valid operations (type-safe)
   * await repo.set('defaultLapUnit', 'seconds', 'user');  // ✅ string
   * await repo.set('defaultLapValue', 42, 'global');      // ✅ number
   * 
   * // Invalid operations (compile-time errors)
   * await repo.set('defaultLapUnit', 42, 'user');         // ❌ number not assignable to string
   * await repo.set('defaultLapValue', 'invalid', 'user'); // ❌ string not assignable to number
   * ```
   * 
   * @see {@link getValue} for retrieving setting values
   * @see {@link create} for create-only operations
   * @see {@link update} for update-only operations
   */
  public async set<K extends SettingId>(
    key: K, 
    value: SettingValueMap[K], 
    scope: SettingScope
  ): Promise<void> {
    const compoundKey = this.createCompoundKey(key, scope);
    
    const entry: TypedSettingsEntry<K> = {
      id: compoundKey,
      key,
      value,
      scope
    };

    const existing = await this.repository.getById(SettingsRepository.SETTINGS_STORE, compoundKey);
    
    if (existing) {
      await this.repository.update(SettingsRepository.SETTINGS_STORE, entry);
    } else {
      await this.repository.add(SettingsRepository.SETTINGS_STORE, entry);
    }
  }

  /**
   * Retrieves a setting value with full compile-time type safety.
   * 
   * Gets the value for a specific setting key and scope. The return type is
   * automatically inferred based on the setting key, ensuring type safety
   * throughout the application. Returns null if the setting doesn't exist.
   * 
   * @template K - The setting key type, automatically inferred from the key parameter
   * @param key - The setting identifier to retrieve
   * @param scope - The scope to search within
   * 
   * @returns Promise resolving to the setting value with correct type, or null if not found
   * 
   * @throws {Error} If the database operation fails
   * 
   * @example
   * ```typescript
   * // Return types are automatically inferred
   * const lapUnit: string | null = await repo.getValue('defaultLapUnit', 'user');
   * const lapValue: number | null = await repo.getValue('defaultLapValue', 'user');
   * 
   * // Use with type guards for safe access
   * const unit = await repo.getValue('defaultLapUnit', 'user');
   * if (unit !== null) {
   *   console.log(unit.toUpperCase()); // TypeScript knows this is a string
   * }
   * ```
   * 
   * @see {@link set} for setting values
   * @see {@link getValueWithFallback} for fallback logic across scopes
   * @see {@link getByKey} for getting all entries of a specific key
   */
  public async getValue<K extends SettingId>(
    key: K, 
    scope: SettingScope
  ): Promise<SettingValueMap[K] | null> {
    const compoundKey = this.createCompoundKey(key, scope);
    const entry = await this.repository.getById(SettingsRepository.SETTINGS_STORE, compoundKey);
    
    if (!entry) {
      return null;
    }
    
    // Type guard ensures we get the right type
    if (isSettingEntryOfType(entry, key)) {
      return entry.value;
    }
    
    // This should never happen if our data is consistent
    return entry.value as SettingValueMap[K];
  }

  /**
   * Retrieves a setting value with intelligent fallback logic across scopes.
   * 
   * Implements a cascading fallback system to find setting values across different scopes:
   * 1. First tries the specified scope
   * 2. If not user scope, tries user scope next
   * 3. Finally tries global scope as last resort
   * 
   * Note: Group scope requires explicit specification and won't be tried automatically
   * in the fallback chain to avoid unintended access to group-specific settings.
   * 
   * @template K - The setting key type, automatically inferred from the key parameter
   * @param key - The setting identifier to retrieve
   * @param scope - The initial scope to try (defaults to 'user')
   * 
   * @returns Promise resolving to the first found setting value with correct type, or null
   * 
   * @throws {Error} If any database operation fails
   * 
   * @example
   * ```typescript
   * // Try user scope first, then global
   * const lapUnit = await repo.getValueWithFallback('defaultLapUnit', 'user');
   * 
   * // Start with global scope, still falls back appropriately
   * const lapValue = await repo.getValueWithFallback('defaultLapValue', 'global');
   * 
   * // Group scope - only tries group, then user, then global
   * const groupSetting = await repo.getValueWithFallback('defaultLapUnit', 'group');
   * ```
   * 
   * @see {@link getValue} for single-scope retrieval
   * @see {@link getHierarchy} for viewing all scope values simultaneously
   */
  public async getValueWithFallback<K extends SettingId>(
    key: K, 
    scope: SettingScope = 'user'
  ): Promise<SettingValueMap[K] | null> {
    // Try specified scope first
    let value = await this.getValue(key, scope);
    if (value !== null) return value;

    // If not user scope, try user scope
    if (scope !== 'user') {
      value = await this.getValue(key, 'user');
      if (value !== null) return value;
    }

    // Finally try global scope
    if (scope !== 'global') {
      value = await this.getValue(key, 'global');
      if (value !== null) return value;
    }

    return null;
  }

  /**
   * Creates a new setting entry, failing if it already exists.
   * 
   * This method enforces strict creation semantics - it will throw an error
   * if a setting with the same key and scope already exists. Use this when
   * you want to ensure you're creating a new setting rather than potentially
   * overwriting an existing one.
   * 
   * @template K - The setting key type, automatically inferred from the key parameter
   * @param key - The setting identifier
   * @param value - The setting value (type-checked against SettingValueMap[K])
   * @param scope - The scope for this setting
   * 
   * @returns Promise resolving to the compound key of the created setting
   * 
   * @throws {Error} If a setting with the same key and scope already exists
   * @throws {Error} If the database operation fails
   * 
   * @example
   * ```typescript
   * // Create new settings
   * const id1 = await repo.create('defaultLapUnit', 'minutes', 'user');
   * const id2 = await repo.create('defaultLapValue', 30, 'global');
   * 
   * // This will throw an error if the setting already exists
   * try {
   *   await repo.create('defaultLapUnit', 'seconds', 'user'); // Throws if exists
   * } catch (error) {
   *   console.error('Setting already exists:', error.message);
   * }
   * ```
   * 
   * @see {@link set} for upsert semantics (create or update)
   * @see {@link update} for update-only operations
   */
  public async create<K extends SettingId>(
    key: K, 
    value: SettingValueMap[K], 
    scope: SettingScope
  ): Promise<string> {
    const compoundKey = this.createCompoundKey(key, scope);
    
    const existing = await this.repository.getById(SettingsRepository.SETTINGS_STORE, compoundKey);
    if (existing) {
      throw new Error(`Setting '${key}' already exists for scope '${scope}'`);
    }

    const entry: TypedSettingsEntry<K> = {
      id: compoundKey,
      key,
      value,
      scope
    };

    await this.repository.add(SettingsRepository.SETTINGS_STORE, entry);
    return compoundKey;
  }

  /**
   * Updates an existing setting entry, failing if it doesn't exist.
   * 
   * This method enforces strict update semantics - it will throw an error
   * if no setting with the specified key and scope exists. Use this when
   * you want to ensure you're updating an existing setting rather than
   * accidentally creating a new one.
   * 
   * @template K - The setting key type, automatically inferred from the key parameter
   * @param key - The setting identifier
   * @param value - The new setting value (type-checked against SettingValueMap[K])
   * @param scope - The scope of the setting to update
   * 
   * @returns Promise resolving to the compound key of the updated setting
   * 
   * @throws {Error} If no setting with the specified key and scope exists
   * @throws {Error} If the database operation fails
   * 
   * @example
   * ```typescript
   * // Update existing settings
   * await repo.update('defaultLapUnit', 'hours', 'user');
   * await repo.update('defaultLapValue', 60, 'global');
   * 
   * // This will throw an error if the setting doesn't exist
   * try {
   *   await repo.update('nonexistentSetting', 'value', 'user'); // Throws
   * } catch (error) {
   *   console.error('Setting not found:', error.message);
   * }
   * ```
   * 
   * @see {@link set} for upsert semantics (create or update)
   * @see {@link create} for create-only operations
   */
  public async update<K extends SettingId>(
    key: K, 
    value: SettingValueMap[K], 
    scope: SettingScope
  ): Promise<string> {
    const compoundKey = this.createCompoundKey(key, scope);
    
    const existing = await this.repository.getById(SettingsRepository.SETTINGS_STORE, compoundKey);
    if (!existing) {
      throw new Error(`Setting '${key}' does not exist for scope '${scope}'`);
    }

    const entry: TypedSettingsEntry<K> = {
      id: compoundKey,
      key,
      value,
      scope
    };

    await this.repository.update(SettingsRepository.SETTINGS_STORE, entry);
    return compoundKey;
  }

  /**
   * Creates or updates a setting with detailed operation result information.
   * 
   * This method provides upsert functionality (insert or update) while also
   * returning information about whether a new setting was created or an
   * existing one was updated. This is useful for tracking changes and
   * providing user feedback.
   * 
   * @template K - The setting key type, automatically inferred from the key parameter
   * @param key - The setting identifier
   * @param value - The setting value (type-checked against SettingValueMap[K])
   * @param scope - The scope for this setting
   * 
   * @returns Promise resolving to an object containing the compound key and creation status
   * 
   * @throws {Error} If the database operation fails
   * 
   * @example
   * ```typescript
   * // Upsert with operation tracking
   * const result1 = await repo.upsert('defaultLapUnit', 'minutes', 'user');
   * if (result1.created) {
   *   console.log(`Created new setting: ${result1.id}`);
   * } else {
   *   console.log(`Updated existing setting: ${result1.id}`);
   * }
   * 
   * // Subsequent upsert of same setting
   * const result2 = await repo.upsert('defaultLapUnit', 'seconds', 'user');
   * console.log(result2.created); // false - it was updated
   * ```
   * 
   * @see {@link set} for simple upsert without operation details
   * @see {@link create} for create-only operations
   * @see {@link update} for update-only operations
   */
  public async upsert<K extends SettingId>(
    key: K, 
    value: SettingValueMap[K], 
    scope: SettingScope
  ): Promise<{
    id: UniqueIdentifier;
    created: boolean;
  }> {
    const compoundKey = this.createCompoundKey(key, scope);
    
    const entry: TypedSettingsEntry<K> = {
      id: compoundKey,
      key,
      value,
      scope
    };

    const existing = await this.repository.getById(SettingsRepository.SETTINGS_STORE, compoundKey);
    
    if (existing) {
      await this.repository.update(SettingsRepository.SETTINGS_STORE, entry);
      return { id: compoundKey, created: false };
    } else {
      await this.repository.add(SettingsRepository.SETTINGS_STORE, entry);
      return { id: compoundKey, created: true };
    }
  }

  /**
   * Sets multiple settings atomically in a single transaction.
   * 
   * Efficiently processes multiple setting operations together, automatically
   * determining whether each setting needs to be created or updated. All
   * operations are performed within appropriate database transactions to
   * ensure atomicity and consistency.
   * 
   * @param settings - Array of setting entries to create or update
   * 
   * @returns Promise that resolves when all operations complete successfully
   * 
   * @throws {Error} If any database operation fails (all changes are rolled back)
   * 
   * @example
   * ```typescript
   * // Set multiple settings at once
   * await repo.setMany([
   *   { key: 'defaultLapUnit', value: 'minutes', scope: 'user' },
   *   { key: 'defaultLapValue', value: 30, scope: 'user' },
   *   { key: 'defaultLapUnit', value: 'seconds', scope: 'global' }
   * ]);
   * 
   * // Mixed types are handled correctly with type safety
   * await repo.setMany([
   *   { key: 'defaultLapUnit', value: 'hours', scope: 'group' },    // string
   *   { key: 'defaultLapValue', value: 60, scope: 'group' }         // number
   * ]);
   * ```
   * 
   * @see {@link set} for single setting operations
   * @see {@link createMany} for create-only batch operations
   * @see {@link updateMany} for update-only batch operations
   */
  public async setMany(settings: CreateSettingEntry<SettingId>[]): Promise<void> {
    const entries: SettingsEntry[] = settings.map(setting => ({
      id: this.createCompoundKey(setting.key, setting.scope),
      key: setting.key,
      value: setting.value,
      scope: setting.scope
    }));

    // Check which ones exist to determine add vs update
    const existingIds = await this.repository.getByIds(SettingsRepository.SETTINGS_STORE, entries.map(e => e.id));
    const existingIdSet = new Set(existingIds.map(e => e.id));

    const toAdd = entries.filter(e => !existingIdSet.has(e.id));
    const toUpdate = entries.filter(e => existingIdSet.has(e.id));

    const operations: Promise<any>[] = [];
    
    if (toAdd.length > 0) {
      operations.push(this.repository.addMany(SettingsRepository.SETTINGS_STORE, toAdd));
    }
    
    if (toUpdate.length > 0) {
      operations.push(this.repository.updateMany(SettingsRepository.SETTINGS_STORE, toUpdate));
    }

    await Promise.all(operations);
  }

  // === Query Operations ===

  /**
   * Retrieves all settings for a specific scope using database indexes.
   * 
   * Efficiently queries all settings belonging to a particular scope (user, group, or global)
   * using IndexedDB's native indexing capabilities. This operation is optimized for
   * performance and can handle large numbers of settings efficiently.
   * 
   * @param scope - The scope to query (user, group, or global)
   * 
   * @returns Promise resolving to an array of all settings entries in the specified scope
   * 
   * @throws {Error} If the database query fails
   * 
   * @example
   * ```typescript
   * // Get all user-specific settings
   * const userSettings = await repo.getByScope('user');
   * userSettings.forEach(setting => {
   *   console.log(`${setting.key}: ${setting.value}`);
   * });
   * 
   * // Get global defaults
   * const globalDefaults = await repo.getByScope('global');
   * 
   * // Get group-specific settings
   * const groupSettings = await repo.getByScope('group');
   * ```
   * 
   * @see {@link getByKey} for querying by setting key across scopes
   * @see {@link getAll} for retrieving all settings regardless of scope
   * @see {@link countByScope} for counting settings in a scope
   */
  public async getByScope(scope: SettingScope): Promise<SettingsEntry[]> {
    return this.indexRepository.getAllByIndex(
      SettingsRepository.SETTINGS_STORE,
      "scope",
      IDBKeyRange.only(scope)
    );
  }

  /**
   * Retrieves all entries for a specific setting key across all scopes.
   * 
   * Gets all instances of a particular setting key, regardless of scope, with
   * full type safety. This is useful for understanding how a setting is
   * configured across different scopes (user, group, global) and for
   * implementing hierarchical setting resolution.
   * 
   * @template K - The setting key type, automatically inferred from the key parameter
   * @param key - The setting identifier to search for
   * 
   * @returns Promise resolving to type-safe array of settings entries for the specified key
   * 
   * @throws {Error} If the database query fails
   * 
   * @example
   * ```typescript
   * // Get all instances of defaultLapUnit across all scopes
   * const lapUnitSettings = await repo.getByKey('defaultLapUnit');
   * lapUnitSettings.forEach(setting => {
   *   console.log(`${setting.scope}: ${setting.value}`); // Type-safe string values
   * });
   * 
   * // Get all instances of defaultLapValue (automatically typed as numbers)
   * const lapValueSettings = await repo.getByKey('defaultLapValue');
   * console.log(lapValueSettings[0].value * 2); // TypeScript knows this is a number
   * ```
   * 
   * @see {@link getByScope} for querying by scope
   * @see {@link getHierarchy} for a structured view of setting values by scope
   * @see {@link countByKey} for counting entries for a specific key
   */
  public async getByKey<K extends SettingId>(key: K): Promise<TypedSettingsEntry<K>[]> {
    const allSettings = await this.repository.getAll(SettingsRepository.SETTINGS_STORE);
    const filteredSettings = allSettings.filter(entry => entry.key === key);
    
    // Type assertion is safe here because we filtered by key
    return filteredSettings as TypedSettingsEntry<K>[];
  }

  /**
   * Retrieves a hierarchical view of setting values across all scopes.
   * 
   * Provides a structured representation of how a setting is configured across
   * different scopes, making it easy to understand the complete configuration
   * landscape for a particular setting. This is particularly useful for
   * debugging configuration issues and implementing administrative interfaces.
   * 
   * @template K - The setting key type, automatically inferred from the key parameter
   * @param key - The setting identifier to analyze
   * 
   * @returns Promise resolving to an object with optional scope-based values
   * 
   * @throws {Error} If the database query fails
   * 
   * @example
   * ```typescript
   * // Get complete hierarchy for a setting
   * const hierarchy = await repo.getHierarchy('defaultLapUnit');
   * console.log(hierarchy);
   * // Output: { user: 'minutes', global: 'seconds', group: 'hours' }
   * 
   * // Check specific scopes
   * if (hierarchy.user) {
   *   console.log(`User preference: ${hierarchy.user}`);
   * }
   * if (hierarchy.global) {
   *   console.log(`Global default: ${hierarchy.global}`);
   * }
   * 
   * // Implement custom fallback logic
   * const effectiveValue = hierarchy.user ?? hierarchy.global ?? 'default';
   * ```
   * 
   * @see {@link getByKey} for getting raw entries across scopes
   * @see {@link getValueWithFallback} for automatic fallback resolution
   */
  public async getHierarchy<K extends SettingId>(key: K): Promise<{
    global?: SettingValueMap[K];
    user?: SettingValueMap[K];
    group?: SettingValueMap[K];
  }> {
    const entries = await this.getByKey(key);
    const hierarchy: any = {};
    
    entries.forEach(entry => {
      hierarchy[entry.scope] = entry.value;
    });
    
    return hierarchy;
  }

  // === ID-based Operations ===

  /**
   * Retrieves a setting entry by its compound identifier.
   * 
   * Looks up a specific setting using its compound key (format: settingKey_scope).
   * This is the most direct way to access a specific setting entry when you
   * know its exact identifier.
   * 
   * @param id - The compound key identifier (e.g., "defaultLapUnit_user")
   * 
   * @returns Promise resolving to the settings entry or null if not found
   * 
   * @throws {Error} If the database query fails
   * 
   * @example
   * ```typescript
   * // Direct lookup by compound ID
   * const userLapUnit = await repo.getById('defaultLapUnit_user');
   * if (userLapUnit) {
   *   console.log(`User setting: ${userLapUnit.value}`);
   * }
   * 
   * // Get global default
   * const globalLapUnit = await repo.getById('defaultLapUnit_global');
   * ```
   * 
   * @see {@link getValue} for type-safe value retrieval by key and scope
   * @see {@link getByIds} for bulk retrieval by compound IDs
   */
  public async getById(id: UniqueIdentifier): Promise<SettingsEntry | null> {
    return this.repository.getById(SettingsRepository.SETTINGS_STORE, id);
  }

  /**
   * Retrieves multiple setting entries by their compound identifiers.
   * 
   * Efficiently fetches multiple specific settings using their compound keys.
   * This is optimized for bulk retrieval when you have a list of specific
   * setting identifiers to fetch.
   * 
   * @param ids - Array of compound key identifiers
   * 
   * @returns Promise resolving to an array of found settings entries (may be fewer than requested)
   * 
   * @throws {Error} If the database query fails
   * 
   * @example
   * ```typescript
   * // Bulk retrieval of specific settings
   * const settings = await repo.getByIds([
   *   'defaultLapUnit_user',
   *   'defaultLapValue_user',
   *   'defaultLapUnit_global'
   * ]);
   * 
   * console.log(`Found ${settings.length} settings`);
   * settings.forEach(setting => {
   *   console.log(`${setting.key} (${setting.scope}): ${setting.value}`);
   * });
   * ```
   * 
   * @see {@link getById} for single entry retrieval
   * @see {@link exists} for checking existence without retrieving data
   */
  public async getByIds(ids: UniqueIdentifier[]): Promise<SettingsEntry[]> {
    return this.repository.getByIds(SettingsRepository.SETTINGS_STORE, ids);
  }

  /**
   * Checks whether a setting exists by its compound identifier.
   * 
   * Efficiently determines if a specific setting exists without retrieving
   * the actual data. This is useful for conditional logic and validation
   * scenarios where you only need to know about existence.
   * 
   * @param id - The compound key identifier to check
   * 
   * @returns Promise resolving to true if the setting exists, false otherwise
   * 
   * @throws {Error} If the database query fails
   * 
   * @example
   * ```typescript
   * // Check if user has customized a setting
   * const hasUserPreference = await repo.exists('defaultLapUnit_user');
   * if (!hasUserPreference) {
   *   // Set default user preference
   *   await repo.set('defaultLapUnit', 'seconds', 'user');
   * }
   * 
   * // Validate settings before operations
   * const settingsToCheck = ['defaultLapUnit_user', 'defaultLapValue_user'];
   * const existenceResults = await Promise.all(
   *   settingsToCheck.map(id => repo.exists(id))
   * );
   * ```
   * 
   * @see {@link getById} for existence checking with data retrieval
   */
  public async exists(id: UniqueIdentifier): Promise<boolean> {
    const entry = await this.repository.getById(SettingsRepository.SETTINGS_STORE, id);
    return entry !== null;
  }

  /**
   * Deletes a setting by its compound identifier.
   * 
   * Permanently removes a specific setting from storage. This operation
   * cannot be undone, so use with caution. The setting will no longer
   * be available for queries or fallback resolution.
   * 
   * @param id - The compound key identifier of the setting to delete
   * 
   * @returns Promise that resolves when the deletion completes
   * 
   * @throws {Error} If the database operation fails
   * 
   * @example
   * ```typescript
   * // Delete a specific user setting (will fall back to global)
   * await repo.deleteById('defaultLapUnit_user');
   * 
   * // Delete global default (affects all users without user-specific setting)
   * await repo.deleteById('defaultLapUnit_global');
   * 
   * // Safe deletion with existence check
   * const settingId = 'defaultLapValue_user';
   * if (await repo.exists(settingId)) {
   *   await repo.deleteById(settingId);
   *   console.log('User setting deleted');
   * }
   * ```
   * 
   * @see {@link deleteByIds} for bulk deletion
   * @see {@link deleteByKey} for deleting all scopes of a setting
   * @see {@link deleteByScope} for deleting all settings in a scope
   */
  public async deleteById(id: UniqueIdentifier): Promise<void> {
    return this.repository.delete(SettingsRepository.SETTINGS_STORE, id);
  }

  /**
   * Deletes multiple settings by their compound identifiers.
   * 
   * Efficiently removes multiple specific settings from storage in a single
   * operation. All deletions are performed atomically to ensure consistency.
   * 
   * @param ids - Array of compound key identifiers to delete
   * 
   * @returns Promise that resolves when all deletions complete
   * 
   * @throws {Error} If any database operation fails (partial deletion possible)
   * 
   * @example
   * ```typescript
   * // Bulk delete specific settings
   * await repo.deleteByIds([
   *   'defaultLapUnit_user',
   *   'defaultLapValue_user',
   *   'obsoleteSetting_global'
   * ]);
   * 
   * // Reset user customizations for specific settings
   * const userCustomizations = await repo.getByScope('user');
   * const userIds = userCustomizations.map(setting => setting.id);
   * await repo.deleteByIds(userIds);
   * ```
   * 
   * @see {@link deleteById} for single setting deletion
   * @see {@link deleteByScope} for scope-based bulk deletion
   */
  public async deleteByIds(ids: UniqueIdentifier[]): Promise<void> {
    return this.repository.deleteMany(SettingsRepository.SETTINGS_STORE, ids);
  }

  /**
   * Deletes all settings within a specific scope.
   * 
   * Removes all settings belonging to a particular scope (user, group, or global).
   * This is useful for operations like user account deletion, group cleanup,
   * or resetting to defaults. Use with extreme caution as this affects
   * multiple settings simultaneously.
   * 
   * @param scope - The scope to clear (user, group, or global)
   * 
   * @returns Promise that resolves when all deletions in the scope complete
   * 
   * @throws {Error} If the database operations fail
   * 
   * @example
   * ```typescript
   * // Reset all user customizations
   * await repo.deleteByScope('user');
   * 
   * // Clear group-specific settings
   * await repo.deleteByScope('group');
   * 
   * // Reset to factory defaults (WARNING: deletes all global defaults)
   * await repo.deleteByScope('global');
   * 
   * // Safe scope clearing with confirmation
   * const userSettings = await repo.getByScope('user');
   * if (userSettings.length > 0) {
   *   console.log(`About to delete ${userSettings.length} user settings`);
   *   await repo.deleteByScope('user');
   * }
   * ```
   * 
   * @see {@link getByScope} for previewing what will be deleted
   * @see {@link deleteByKey} for deleting all scopes of a specific setting
   * @see {@link countByScope} for getting deletion impact metrics
   */
  public async deleteByScope(scope: SettingScope): Promise<void> {
    const entries = await this.getByScope(scope);
    const ids = entries.map(entry => entry.id);
    await this.deleteByIds(ids);
  }

  /**
   * Deletes all entries for a specific setting key across all scopes.
   * 
   * Completely removes a setting from the system by deleting all its instances
   * across user, group, and global scopes. This effectively removes the setting
   * from the application entirely. Use this when deprecating or removing
   * settings from the application.
   * 
   * @param key - The setting identifier to completely remove
   * 
   * @returns Promise that resolves when all instances of the setting are deleted
   * 
   * @throws {Error} If the database operations fail
   * 
   * @example
   * ```typescript
   * // Completely remove a deprecated setting
   * await repo.deleteByKey('obsoleteSetting');
   * 
   * // Remove a setting from all scopes (e.g., during feature removal)
   * await repo.deleteByKey('defaultLapUnit');
   * 
   * // Safe removal with impact assessment
   * const instances = await repo.getByKey('settingToRemove');
   * console.log(`Removing setting from ${instances.length} scopes`);
   * await repo.deleteByKey('settingToRemove');
   * ```
   * 
   * @see {@link getByKey} for previewing what will be deleted
   * @see {@link deleteByScope} for scope-specific deletion
   * @see {@link countByKey} for getting deletion impact metrics
   */
  public async deleteByKey(key: SettingId): Promise<void> {
    const entries = await this.getByKey(key);
    const ids = entries.map(entry => entry.id);
    await this.deleteByIds(ids);
  }

  // === Utility Operations ===

  /**
   * Retrieves all settings entries from storage.
   * 
   * Gets every setting in the database regardless of key or scope. This
   * operation should be used carefully with large datasets as it loads
   * all settings into memory. Useful for administrative interfaces,
   * backup operations, or comprehensive analysis.
   * 
   * @returns Promise resolving to an array of all settings entries
   * 
   * @throws {Error} If the database query fails
   * 
   * @example
   * ```typescript
   * // Get complete settings inventory
   * const allSettings = await repo.getAll();
   * console.log(`Total settings in system: ${allSettings.length}`);
   * 
   * // Analyze settings distribution
   * const byScope = allSettings.reduce((acc, setting) => {
   *   acc[setting.scope] = (acc[setting.scope] || 0) + 1;
   *   return acc;
   * }, {} as Record<SettingScope, number>);
   * 
   * console.log('Settings by scope:', byScope);
   * 
   * // Export all settings for backup
   * const backup = {
   *   timestamp: new Date().toISOString(),
   *   settings: allSettings
   * };
   * ```
   * 
   * @see {@link getByScope} for scope-specific queries
   * @see {@link getByKey} for key-specific queries
   * @see {@link count} for getting total count without loading data
   */
  public async getAll(): Promise<SettingsEntry[]> {
    return this.repository.getAll(SettingsRepository.SETTINGS_STORE);
  }

  /**
   * Permanently removes all settings from storage.
   * 
   * Deletes every setting entry in the database, effectively resetting the
   * settings system to empty state. This operation cannot be undone and
   * should only be used in development, testing, or explicit reset scenarios.
   * 
   * @returns Promise that resolves when all settings are deleted
   * 
   * @throws {Error} If the database operation fails
   * 
   * @example
   * ```typescript
   * // Complete settings reset (use with extreme caution)
   * await repo.clear();
   * console.log('All settings deleted');
   * 
   * // Safe clear with confirmation
   * const settingsCount = await repo.count();
   * if (settingsCount > 0 && confirm(`Delete all ${settingsCount} settings?`)) {
   *   await repo.clear();
   * }
   * 
   * // Development/testing scenario
   * if (process.env.NODE_ENV === 'development') {
   *   await repo.clear(); // Reset for clean testing state
   * }
   * ```
   * 
   * @see {@link deleteByScope} for scope-specific clearing
   * @see {@link count} for checking what will be deleted
   */
  public async clear(): Promise<void> {
    return this.repository.clear(SettingsRepository.SETTINGS_STORE);
  }

  /**
   * Gets the total number of settings entries in storage.
   * 
   * Returns a count of all settings across all keys and scopes without
   * loading the actual data into memory. This is efficient for metrics,
   * capacity planning, and user interface display purposes.
   * 
   * @returns Promise resolving to the total number of settings entries
   * 
   * @throws {Error} If the database query fails
   * 
   * @example
   * ```typescript
   * // Display settings summary
   * const totalCount = await repo.count();
   * const userCount = await repo.countByScope('user');
   * const globalCount = await repo.countByScope('global');
   * 
   * console.log(`Settings Summary:
   *   Total: ${totalCount}
   *   User Customizations: ${userCount}
   *   Global Defaults: ${globalCount}
   *   Other: ${totalCount - userCount - globalCount}
   * `);
   * 
   * // Capacity monitoring
   * if (totalCount > 1000) {
   *   console.warn('Large number of settings detected - consider cleanup');
   * }
   * ```
   * 
   * @see {@link countByScope} for scope-specific counts
   * @see {@link countByKey} for key-specific counts
   * @see {@link getAll} for actual data retrieval
   */
  public async count(): Promise<number> {
    const allSettings = await this.repository.getAll(SettingsRepository.SETTINGS_STORE);
    return allSettings.length;
  }

  /**
   * Gets the count of settings for a specific scope.
   * 
   * Efficiently counts all settings belonging to a particular scope without
   * loading the actual data. Useful for analytics, user interface displays,
   * and capacity management within specific scopes.
   * 
   * @param scope - The scope to count settings for
   * 
   * @returns Promise resolving to the number of settings in the specified scope
   * 
   * @throws {Error} If the database query fails
   * 
   * @example
   * ```typescript
   * // User customization metrics
   * const userCustomizations = await repo.countByScope('user');
   * console.log(`User has ${userCustomizations} custom settings`);
   * 
   * // Global defaults inventory
   * const globalDefaults = await repo.countByScope('global');
   * console.log(`${globalDefaults} global defaults configured`);
   * 
   * // Scope comparison
   * const scopes: SettingScope[] = ['user', 'group', 'global'];
   * const counts = await Promise.all(
   *   scopes.map(async scope => ({
   *     scope,
   *     count: await repo.countByScope(scope)
   *   }))
   * );
   * ```
   * 
   * @see {@link count} for total count across all scopes
   * @see {@link getByScope} for actual data retrieval
   * @see {@link countByKey} for key-specific counts
   */
  public async countByScope(scope: SettingScope): Promise<number> {
    const scopeSettings = await this.indexRepository.getAllByIndex(
      SettingsRepository.SETTINGS_STORE,
      "scope",
      IDBKeyRange.only(scope)
    );
    return scopeSettings.length;
  }

  /**
   * Gets the count of settings for a specific key across all scopes.
   * 
   * Counts how many times a particular setting appears across different
   * scopes. This is useful for understanding setting coverage and identifying
   * settings that might be over-configured or under-configured across scopes.
   * 
   * @param key - The setting identifier to count occurrences for
   * 
   * @returns Promise resolving to the number of entries for the specified key
   * 
   * @throws {Error} If the database query fails
   * 
   * @example
   * ```typescript
   * // Setting coverage analysis
   * const lapUnitCoverage = await repo.countByKey('defaultLapUnit');
   * console.log(`defaultLapUnit configured in ${lapUnitCoverage} scopes`);
   * 
   * // Find settings that exist in multiple scopes
   * const keys: SettingId[] = ['defaultLapUnit', 'defaultLapValue'];
   * const coverage = await Promise.all(
   *   keys.map(async key => ({
   *     key,
   *     scopes: await repo.countByKey(key)
   *   }))
   * );
   * 
   * const multiScopeSettings = coverage.filter(item => item.scopes > 1);
   * console.log('Settings with scope conflicts:', multiScopeSettings);
   * ```
   * 
   * @see {@link count} for total count across all settings
   * @see {@link getByKey} for actual data retrieval
   * @see {@link countByScope} for scope-specific counts
   */
  public async countByKey(key: SettingId): Promise<number> {
    const keySettings = await this.indexRepository.getAllByIndex(
      SettingsRepository.SETTINGS_STORE,
      "key",
      IDBKeyRange.only(key)
    );
    return keySettings.length;
  }

  // === Advanced Operations ===

  /**
   * Performs custom bulk operations on settings using the underlying bulk repository.
   * 
   * Provides direct access to efficient bulk processing capabilities for advanced
   * scenarios that require custom transaction logic or specialized processing.
   * Operations are automatically chunked and processed in separate transactions
   * to avoid browser limitations.
   * 
   * @template R - The return type of the operation function
   * @param entries - Array of settings entries to process
   * @param operation - Custom operation function to execute on each chunk
   * @param chunkSize - Optional chunk size for processing (defaults to 100)
   * 
   * @returns Promise resolving to an array of results from all chunk operations
   * 
   * @throws {Error} If any chunk operation fails
   * 
   * @example
   * ```typescript
   * // Custom bulk validation and transformation
   * const allSettings = await repo.getAll();
   * const results = await repo.bulkOperation(
   *   allSettings,
   *   async (tx, chunk) => {
   *     const store = tx.objectStore('settings');
   *     const validatedChunk = [];
   * 
   *     for (const setting of chunk) {
   *       // Custom validation logic
   *       if (isValidSetting(setting)) {
   *         // Transform and update
   *         const transformed = transformSetting(setting);
   *         await IndexedDBUtils.wrapRequest(store.put(transformed));
   *         validatedChunk.push(transformed);
   *       }
   *     }
   * 
   *     return validatedChunk;
   *   },
   *   50 // Process in chunks of 50
   * );
   * 
   * console.log(`Processed ${results.flat().length} valid settings`);
   * ```
   * 
   * @see {@link setMany} for standard bulk upserts
   * @see {@link IndexedDBStorageAdapter.getBulkRepository} for direct bulk access
   */
  public async bulkOperation<R>(
    entries: SettingsEntry[],
    operation: (tx: IDBTransaction, chunk: SettingsEntry[]) => Promise<R[]>,
    chunkSize?: number
  ): Promise<R[]> {
    return this.bulkRepository.bulkOperation(
      SettingsRepository.SETTINGS_STORE,
      "readwrite",
      entries,
      operation,
      chunkSize
    );
  }

  /**
   * Opens a cursor on the scope index for manual iteration.
   * 
   * Provides low-level cursor access for advanced iteration scenarios where
   * you need fine-grained control over data traversal. This is useful for
   * implementing custom pagination, streaming operations, or specialized
   * data processing algorithms.
   * 
   * @returns Promise resolving to an IndexedDB cursor positioned at the first entry
   * 
   * @throws {Error} If the cursor operation fails
   * 
   * @example
   * ```typescript
   * // Manual cursor iteration for memory-efficient processing
   * const cursor = await repo.getScopeCursor();
   * const scopeDistribution = new Map<SettingScope, number>();
   * 
   * while (cursor) {
   *   const scope = cursor.key as SettingScope;
   *   scopeDistribution.set(scope, (scopeDistribution.get(scope) || 0) + 1);
   *   
   *   const nextCursor = await new Promise<IDBCursor | null>((resolve) => {
   *     cursor.continue();
   *     cursor.onsuccess = () => resolve(cursor.result);
   *   });
   *   
   *   cursor = nextCursor;
   * }
   * 
   * console.log('Scope distribution:', Object.fromEntries(scopeDistribution));
   * ```
   * 
   * @see {@link getByScope} for simple scope-based queries
   * @see {@link IndexedDBIndexRepository.keyCursor} for cursor implementation details
   */
  public async getScopeCursor(): Promise<IDBCursor> {
    return this.indexRepository.keyCursor(
      SettingsRepository.SETTINGS_STORE,
      "scope"
    );
  }
}