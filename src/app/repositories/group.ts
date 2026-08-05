import { TZDate } from "../models/date";
import { StopwatchGroup, StopwatchGroupMembership, BaseStopwatchGroup, UniqueIdentifier, SerializedStopwatchGroup } from "../models/sequence/interfaces";
import { IndexedDBDatabase, IndexedDBStorageAdapter } from "../utilities/storage";
import { BaseRepository, StopwatchDatabase } from "./application";

/**
 * Adapter for managing StopwatchGroup instances in IndexedDB using the new storage API
 * @class GroupRepository
 */
export class GroupRepository extends BaseRepository {
  private static readonly GROUP_STORE = "groups";
  private static readonly GROUP_MEMBERSHIP_STORE = "groupMemberships";

  private adapter: IndexedDBStorageAdapter<SerializedStopwatchGroup>;
  private membershipAdapter: IndexedDBStorageAdapter<StopwatchGroupMembership>;
  private database: IndexedDBDatabase;

  /**
   * Creates a new GroupRepository
   * @param membershipAdapter - Optional existing GroupRepository to share database connection
   */
  constructor(membershipAdapter?: IndexedDBStorageAdapter<StopwatchGroupMembership>) {
    super();
    this.database = new StopwatchDatabase(
        GroupRepository.DB_NAME, 
        GroupRepository.DB_VERSION
      );
    this.adapter = new IndexedDBStorageAdapter<BaseStopwatchGroup>(this.database);
    this.membershipAdapter = membershipAdapter || new IndexedDBStorageAdapter<StopwatchGroupMembership>(this.database);
  }

  /**
   * Fetches all groups from the database
   * @returns A promise that resolves to an array of stopwatch groups
   */
  async getAll(): Promise<BaseStopwatchGroup[]> {
    const repo = this.adapter.getRepository();
    const persistentInstances = await repo.getAll(GroupRepository.GROUP_STORE);
    return persistentInstances.map(instance => this.fromPersistentInstance(instance));
  }

  /**
   * Fetches a group by ID
   * @param id - The ID of the group to fetch
   * @returns A promise that resolves to the group, or null if not found
   */
  async get(id: UniqueIdentifier): Promise<BaseStopwatchGroup | null> {
    const repo = this.adapter.getRepository();
    const persistentGroup = await repo.getById(GroupRepository.GROUP_STORE, id);
    
    if (!persistentGroup) {
      return null;
    }
    
    return this.fromPersistentInstance(persistentGroup);
  }

  async getByIds(ids: UniqueIdentifier[]): Promise<BaseStopwatchGroup[]> {
    const repo = this.adapter.getRepository();
    const instances = await repo.getByIds(GroupRepository.GROUP_STORE, ids);
    return instances.map(instance => this.fromPersistentInstance(instance));
  }

  /**
   * Creates a group
   * @param group - The group to create
   * @returns A promise that resolves to the ID of the created group
   */
  async create(group: StopwatchGroup): Promise<string> {
    const repo = this.adapter.getRepository();
    
    // Create a persistent version without the members array
    const persistentGroup: BaseStopwatchGroup = {
      id: group.id || this.generateId(),
      annotation: group.annotation,
      metadata: group.metadata,
      traits: group.traits
    };
    
    await repo.add(GroupRepository.GROUP_STORE, persistentGroup);
    
    // Now handle group memberships if members are provided
    if (group.members && group.members.length > 0) {
      await Promise.all(
        group.members.map(member => this.addMember(persistentGroup.id as string, member.id as string))
      )
    }
    
    return persistentGroup.id as string;
  }

  /**
   * Updates a group
   * @param group - The group to update
   * @returns A promise that resolves to the ID of the updated group
   */
  async update(group: StopwatchGroup): Promise<string> {
    const repo = this.adapter.getRepository();
    
    // Create a persistent version without the members array
    const persistentGroup: BaseStopwatchGroup = {
      id: group.id,
      annotation: group.annotation,
      metadata: group.metadata,
      traits: group.traits
    };
    
    await repo.update(GroupRepository.GROUP_STORE, persistentGroup);
    if (group.members && group.members.length > 0) {
      await this.clearGroupMembers(persistentGroup.id as string);
      await Promise.all(
        group.members.map(member => this.addMember(persistentGroup.id as string, member.id as string))
      )
    }
    
    return persistentGroup.id as string;
  }

  /**
   * Deletes a group from the database
   * @param id - The ID of the group to delete
   * @returns A promise that resolves when the operation is complete
   */
  async delete(id: UniqueIdentifier): Promise<void> {
    const repo = this.adapter.getRepository();
    
    // First remove all members from the group
    await this.clearGroupMembers(id);
    
    // Then delete the group itself
    await repo.delete(GroupRepository.GROUP_STORE, id);
  }

  private async clear(): Promise<void> {
    const groupRepo = this.adapter.getRepository();
    await groupRepo.clear(GroupRepository.GROUP_STORE);
  }

  private async clearAllMemberships(): Promise<void> {
    const membershipRepo = this.membershipAdapter.getRepository();
    await membershipRepo.clear(GroupRepository.GROUP_MEMBERSHIP_STORE);
  }
 
  /**
   * Clears all members from a group
   * @param groupId - The ID of the group
   * @returns A promise that resolves when the operation is complete
   */
  private async clearGroupMembers(groupId: UniqueIdentifier): Promise<void> {
    // Get the membership repository
    const indexRepo = this.membershipAdapter.getIndexRepository();
    const membershipRepo = this.membershipAdapter.getRepository();
    
    // Find all memberships for this group
    const memberships = await indexRepo.getAllByIndex(
        GroupRepository.GROUP_MEMBERSHIP_STORE,
        "groupId",
        IDBKeyRange.only(groupId)
    );
    
    // If there are memberships, delete them all at once
    if (memberships.length > 0) {
        const membershipIds = memberships.map(membership => membership.id as string);
        await membershipRepo.deleteMany(
        GroupRepository.GROUP_MEMBERSHIP_STORE, 
        membershipIds
        );
    }
  }

  /**
   * Fetches all group IDs that a stopwatch is a member of
   * @param stopwatchId - The ID of the stopwatch
   * @returns A promise that resolves to an array of group IDs
   */
  async byStopwatch(stopwatchId: UniqueIdentifier): Promise<UniqueIdentifier[]> {
    const membershipRepo = this.membershipAdapter.getIndexRepository();
      
    // Get all memberships for this stopwatch
    const memberships = await membershipRepo.getAllByIndex(
        GroupRepository.GROUP_MEMBERSHIP_STORE,
        "stopwatchId",
        IDBKeyRange.only(stopwatchId)
    );
      
    // Extract just the group IDs from the membership records
    return memberships.map(membership => membership.groupId);
  }

  /**
   * Adds a stopwatch to a group
   * @param stopwatchId - The ID of the stopwatch
   * @param groupId - The ID of the group
   * @returns A promise that resolves when the operation is complete
   */
  async addMember(groupId: UniqueIdentifier, stopwatchId: UniqueIdentifier): Promise<void> {
    const membershipRepo = this.membershipAdapter.getRepository();
    
    // Check if the membership already exists
    const indexRepo = this.membershipAdapter.getIndexRepository();
    const existingMemberships = await indexRepo.getAllByIndex(
      GroupRepository.GROUP_MEMBERSHIP_STORE,
      "stopwatchId",
      IDBKeyRange.only(stopwatchId)
    );
    
    const alreadyInGroup = existingMemberships.some(m => m.groupId === groupId);
    
    if (!alreadyInGroup) {
      const membership: StopwatchGroupMembership = {
        id: this.generateId(),
        stopwatchId,
        groupId
      };
      
      await membershipRepo.add(GroupRepository.GROUP_MEMBERSHIP_STORE, membership);
    }
  }

  /**
   * Removes a stopwatch from a group
   * @param stopwatchId - The ID of the stopwatch
   * @param groupId - The ID of the group
   * @returns A promise that resolves when the operation is complete
   */
  async removeMember(groupId: UniqueIdentifier, stopwatchId: UniqueIdentifier): Promise<void> {
    const indexRepo = this.membershipAdapter.getIndexRepository();
    const membershipRepo = this.membershipAdapter.getRepository();
    
    // Find the membership record
    const memberships = await indexRepo.getAllByIndex(
      GroupRepository.GROUP_MEMBERSHIP_STORE,
      "stopwatchId",
      IDBKeyRange.only(stopwatchId)
    );
    
    // Find and delete the specific membership for this group
    const membership = memberships.find(m => m.groupId === groupId);
    
    if (membership && membership.id) {
      await membershipRepo.delete(
        GroupRepository.GROUP_MEMBERSHIP_STORE, 
        membership.id
      );
    }
  }

  fromPersistentInstance(instance: SerializedStopwatchGroup): BaseStopwatchGroup {
    return {
      ...instance,
      metadata: {
        creation: {
          timestamp: TZDate.fromJSON(instance.metadata.creation.timestamp),
        },
        lastModification: {
          timestamp: TZDate.fromJSON(instance.metadata.lastModification.timestamp)
        }
      }
    };
  }
}