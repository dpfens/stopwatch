import { StopwatchEntity, SerializedStopwatchEntity, Objective, StopwatchGroupMembership, UniqueIdentifier } from "../models/sequence/interfaces";
import { TZDate } from "../models/date";
import { SerializableRegistry, SerializableType } from "../utilities/serialization";
import { registry } from "../models/sequence/objective";
import { IndexedDBStorageAdapter } from "../utilities/storage";
import { StopwatchEvent } from "../models/sequence/interfaces";
import { BaseRepository, StopwatchDatabase } from "./application";



/**
 * Adapter for managing Stopwatch instances in IndexedDB using the new storage API
 * @class StopwatchRepository
 */
export class StopwatchRepository extends BaseRepository {
  private static readonly objectiveRegistry: SerializableRegistry<Objective> = registry;
  private static readonly STOPWATCH_STORE = "stopwatches";
  private static readonly GROUP_MEMBERSHIP_STORE = "groupMemberships";

  private adapter: IndexedDBStorageAdapter<SerializedStopwatchEntity>;
  private membershipAdapter: IndexedDBStorageAdapter<StopwatchGroupMembership>;
  private database: StopwatchDatabase;

  /**
   * Creates a new StopwatchRepository
   */
  constructor() {
    super();
    this.database = new StopwatchDatabase(StopwatchRepository.DB_NAME, StopwatchRepository.DB_VERSION);
    this.adapter = new IndexedDBStorageAdapter<SerializedStopwatchEntity>(this.database);
    this.membershipAdapter = new IndexedDBStorageAdapter<StopwatchGroupMembership>(this.database);
  }

  /**
   * Fetches all stopwatches from the database
   * @returns A promise that resolves to an array of stopwatch instances
   */
  async getAll(): Promise<StopwatchEntity[]> {
    const repo = this.adapter.getRepository();
    const persistentInstances = await repo.getAll(StopwatchRepository.STOPWATCH_STORE);
    return persistentInstances.map(instance => StopwatchRepository.fromPersistentInstance(instance));
  }

  /**
   * Fetches a stopwatch by ID
   * @param id - The ID of the stopwatch to fetch
   * @returns A promise that resolves to the stopwatch instance, or null if not found
   */
  async get(id: UniqueIdentifier): Promise<StopwatchEntity | null> {
    const repo = this.adapter.getRepository();
    const persistentInstance = await repo.getById(StopwatchRepository.STOPWATCH_STORE, id);
    
    if (!persistentInstance) {
      return null;
    }
    
    return StopwatchRepository.fromPersistentInstance(persistentInstance);
  }

  async getByIds(id: UniqueIdentifier[]): Promise<StopwatchEntity[]> {
    const repo = this.adapter.getRepository();
    const persistentInstances = await repo.getByIds(StopwatchRepository.STOPWATCH_STORE, id);
    return persistentInstances.map(instance => StopwatchRepository.fromPersistentInstance(instance));
  }


  async idsByGroup(groupId: UniqueIdentifier): Promise<UniqueIdentifier[]> {
    const membershipRepo = this.membershipAdapter.getIndexRepository();
    
    // Get all memberships for this group
    const memberships = await membershipRepo.getAllByIndex(
      StopwatchRepository.GROUP_MEMBERSHIP_STORE,
      "groupId",
      IDBKeyRange.only(groupId)
    );
    return memberships.map(m => m.stopwatchId); 
  }

  /**
   * Fetches stopwatches by group ID
   * @param groupId - The ID of the group
   * @returns A promise that resolves to an array of stopwatch instances
   */
  async byGroup(groupId: UniqueIdentifier): Promise<StopwatchEntity[]> {
    const stopwatchRepo = this.adapter.getRepository();
    
    // Get all stopwatches for the membership records
    const stopwatchIds = await this.idsByGroup(groupId);
    const persistentInstances = await stopwatchRepo.getByIds(
      StopwatchRepository.STOPWATCH_STORE,
      stopwatchIds
    );
    
    return persistentInstances.map(instance => StopwatchRepository.fromPersistentInstance(instance));
  }

  /**
   * Create a stopwatch to the database
   * @param stopwatch - The stopwatch to create
   * @returns A promise that resolves to the ID of the created stopwatch
   */
  async create(stopwatch: StopwatchEntity): Promise<string> {
    const repo = this.adapter.getRepository();
    const serialized = StopwatchRepository.toPersistentInstance(stopwatch);
    
    serialized.id = serialized.id || this.generateId();
    await repo.add(StopwatchRepository.STOPWATCH_STORE, serialized);
    return serialized.id;
  }

  /**
   * Updates a stopwatch to the database
   * @param stopwatch - The stopwatch to update
   * @returns A promise that resolves to the ID of the update stopwatch
   */
  async update(stopwatch: StopwatchEntity): Promise<string> {
    const repo = this.adapter.getRepository();
    const serialized = StopwatchRepository.toPersistentInstance(stopwatch);
    
    // If the stopwatch has an ID, update it; otherwise, add it
    await repo.update(StopwatchRepository.STOPWATCH_STORE, serialized);
    return stopwatch.id;
  }

  /**
   * Deletes a stopwatch from the database
   * @param id - The ID of the stopwatch to delete
   * @returns A promise that resolves when the operation is complete
   */
  async delete(id: UniqueIdentifier): Promise<void> {
    const stopwatchRepo = this.adapter.getRepository();
    const membershipRepo = this.membershipAdapter.getIndexRepository();
    
    // Delete the stopwatch
    await stopwatchRepo.delete(StopwatchRepository.STOPWATCH_STORE, id);
    
    // Find and delete all group memberships for this stopwatch
    const memberships = await membershipRepo.getAllByIndex(
      StopwatchRepository.GROUP_MEMBERSHIP_STORE,
      "stopwatchId",
      IDBKeyRange.only(id)
    );
    
    if (memberships.length > 0) {
      const membershipIds = memberships.map(m => m.id);
      await this.membershipAdapter.getRepository().deleteMany(
        StopwatchRepository.GROUP_MEMBERSHIP_STORE,
        membershipIds as (string | number)[]
      );
    }
  }

  /**
   * Converts a ContextualStopwatchEntity to a persistable SerializedStopwatchEntity format
   * using the SerializableRegistry<Objective> for objective serialization
   */
  public static toPersistentInstance(instance: StopwatchEntity): SerializedStopwatchEntity {
    // Create base persistent instance
    const persistent: SerializedStopwatchEntity = {
      id: instance.id,
      annotation: instance.annotation,
      state: {
        ...instance.state,
        // Ensure the sequence events have the right format
        sequence: instance.state.sequence.map((event: StopwatchEvent )=> ({
          ...event,
          // Ensure the timestamp is serialized properly
          timestamp: event.timestamp instanceof TZDate ? 
            event.timestamp : 
            TZDate.fromJSON(event.timestamp)
        }))
      },
      metadata: instance.metadata
    };

    // Serialize the objective if one exists
    if (instance.objective) {
      const serializedObjective = this.objectiveRegistry.serialize(instance.objective as Objective & SerializableType<Objective>);
      if (serializedObjective) {
        persistent.objective = {
          type: instance.objective.type,
          configuration: serializedObjective.configuration
        };
      }
    }

    return persistent;
  }

  /**
   * Restores a ContextualStopwatchEntity from a SerializedStopwatchEntity format
   * using the SerializableRegistry for objective deserialization
   */
  public static fromPersistentInstance(persistent: SerializedStopwatchEntity): StopwatchEntity {
    // Create base instance
    const instance: StopwatchEntity = {
      id: persistent.id,
      annotation: persistent.annotation,
      state: {
        ...persistent.state,
        // Convert serialized timestamps back to TZDate objects
        sequence: persistent.state.sequence.map((event: StopwatchEvent) => ({
          ...event,
          // Convert serialized TimeZonedDate to TZDate instance
          timestamp: event.timestamp instanceof TZDate ? 
            event.timestamp : 
            TZDate.fromJSON(event.timestamp),
          metadata: {
            creation: {
              timestamp: TZDate.fromJSON(event.metadata.creation.timestamp)
            },
            lastModification: {
              timestamp: TZDate.fromJSON(event.metadata.lastModification.timestamp)
            }
          }
            
        })),
      },
      metadata: {
        creation: {
          timestamp: TZDate.fromJSON(persistent.metadata.creation.timestamp)
        },
        lastModification: {
          timestamp: TZDate.fromJSON(persistent.metadata.lastModification.timestamp)
        }
      }
    };

    // Deserialize the objective if one exists
    if (persistent.objective) {
      instance.objective = this.objectiveRegistry.deserialize({
        type: persistent.objective.type,
        configuration: persistent.objective.configuration
      });
    }
    return instance;
  }
}