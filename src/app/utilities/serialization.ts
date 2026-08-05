/**
 * @module Serialization
 * @description
 * This module provides a type-safe framework for serializing and deserializing TypeScript class instances.
 * 
 * The serialization system allows you to:
 * - Convert class instances to a serializable format (JSON-compatible)
 * - Reconstruct class instances from serialized data
 * - Register class types with type-specific registries
 * - Use decorator-based registration for clean implementation
 * 
 * This is particularly useful for:
 * - Persisting complex object graphs to storage
 * - Transmitting objects over network APIs
 * - Converting between runtime objects and persistent storage formats
 * - Implementing save/load functionality
 * 
 * ## Basic Usage
 * 
 * ```typescript
 * // Create a type-specific registry
 * const myRegistry = new SerializableRegistry<MyBaseType>();
 * 
 * // Register classes with the registry
 * @myRegistry.registerDecorator('my-type')
 * class MyClass implements SerializableType<MyClass> {
 *   // Implementation...
 * }
 * 
 * // Serialize an instance
 * const instance = new MyClass();
 * const serialized = myRegistry.serialize(instance);
 * 
 * // Deserialize the instance
 * const restored = myRegistry.deserialize(serialized);
 * ```
 * 
 * @example
 * ```typescript
 * // Define interfaces
 * interface Shape extends SerializableType<Shape> {
 *   calculateArea(): number;
 * }
 * 
 * // Create registry
 * const shapeRegistry = new SerializableRegistry<Shape>();
 * 
 * // Implement class
 * @shapeRegistry.registerDecorator('circle')
 * class Circle implements Shape {
 *   radius: number = 1;
 *   
 *   calculateArea(): number {
 *     return Math.PI * this.radius * this.radius;
 *   }
 *   
 *   serialize(): SerializedForm<Shape> {
 *     return {
 *       type: 'circle',
 *       configuration: { radius: this.radius }
 *     };
 *   }
 *   
 *   deserialize(config?: Record<string, unknown>): Shape {
 *     if (config && config.radius !== undefined) {
 *       this.radius = config.radius;
 *     }
 *     return this;
 *   }
 * }
 * 
 * // Usage
 * const myCircle = new Circle();
 * myCircle.radius = 5;
 * 
 * const serialized = shapeRegistry.serialize(myCircle);
 * const json = JSON.stringify(serialized);
 * 
 * // Later...
 * const parsed = JSON.parse(json);
 * const restored = shapeRegistry.deserialize(parsed);
 * console.log(restored.calculateArea()); // 78.54...
 * ```
 * 
 * @author Doug Fenstermacher
 * @version 1.0.0
 */


/**
 * Represents the serialized form of a class instance.
 * @template T - The type of the class being serialized
 */
export interface SerializedForm<T> {
    /** Identifier for the concrete type */
    type: string;
    /** Configuration data needed to reconstruct the instance */
    configuration?: Record<string, unknown>;
  }
  
  /**
   * Interface that classes must implement to be serializable.
   * @template T - The type of the implementing class
   */
  export interface Serializable<T> {
    /**
     * Converts the instance to a serialized form that can be persisted.
     * @returns The serialized representation of this instance
     */
    serialize(): SerializedForm<T>;
  }
  
  /**
   * Interface for classes that can be deserialized from configuration data.
   * Classes implementing this interface should have a public constructor that takes no arguments.
   * @template T - The type of the implementing class
   */
  export interface Deserializable<T> {
    /**
     * Applies configuration data to restore the instance state.
     * @param configuration - The configuration data to apply
     * @returns The instance with configuration applied
     */
    deserialize(configuration?: Record<string, unknown>): T;
  }


  /**
 * Interface that defines a class that can be both serialized and deserialized.
 * @template T - The type of the implementing class
 */
export interface SerializableType<T> extends Serializable<T>, Deserializable<T> {}
  
/**
 * Registry that manages serializable class types of a specific base type.
 * The registry maintains a mapping between type identifiers and constructor functions,
 * and provides methods for serializing instances and deserializing data.
 * 
 * This class is designed to be instantiated once per type hierarchy, allowing
 * for strong type checking while supporting polymorphic serialization.
 * 
 * @template BaseType - The common base type for all classes in this registry
 */
export class SerializableRegistry<BaseType> {
    /** Map of type identifiers to constructor functions */
    private registry = new Map<string, new () => BaseType & SerializableType<BaseType>>();
  
    /**
     * Registers a class constructor with the registry.
     * 
     * @param type - The unique type identifier for this class
     * @param constructor - Constructor function for the class
     * @throws Error if type is already registered
     */
    private registerClass(type: string, constructor: new () => BaseType & SerializableType<BaseType>): void {
      if (this.registry.has(type)) {
        throw new Error(`Type "${type}" is already registered.`);
      }
      this.registry.set(type, constructor);
    }
  
    /**
     * Creates a decorator function for registering a class with this registry.
     * The decorated class must implement Serializable and Deserializable interfaces.
     * 
     * @param type - The unique type identifier for the class
     * @returns A class decorator function
     */
    register(type: string) {
      const registry = this;
      return function <T extends new (...args: any[]) => BaseType & SerializableType<BaseType>>(constructor: T) {
        registry.registerClass(type, constructor);
        return constructor;
      };
    }
  
    /**
     * Serializes an instance that implements the Serializable interface.
     * 
     * @param instance - The instance to serialize
     * @returns The serialized form of the instance, or undefined if instance is undefined
     */
    serialize(instance?: BaseType & Serializable<BaseType>): SerializedForm<BaseType> | undefined {
      if (!instance) return undefined;
      return instance.serialize();
    }


    /**
     * Deserializes data into a class instance.
     * 
     * @param data - The serialized form of the instance
     * @returns A new instance with configuration applied, or undefined if data is invalid
     * @throws Error if the specified type is not registered
     */
    deserialize(data?: SerializedForm<BaseType>): BaseType | undefined {
        if (!data || !data.type) return undefined;
        
        const Constructor = this.registry.get(data.type);
        if (!Constructor) {
        throw new Error(`No class registered for type "${data.type}"`);
        }
        
        const instance = new Constructor();
        return instance.deserialize(data.configuration);
    }
  
    /**
     * Checks if a type is registered in the registry.
     * 
     * @param type - The type identifier to check
     * @returns True if the type is registered, false otherwise
     */
    has(type: string): boolean {
      return this.registry.has(type);
    }

    clear(): void {
        this.registry.clear();
    }
  
    /**
     * Gets all registered type identifiers.
     * 
     * @returns Array of registered type identifiers
     */
    getRegisteredTypes(): string[] {
      return Array.from(this.registry.keys());
    }
}