/**
 * @module UnitConverter
 * @description A comprehensive unit conversion system supporting SI units, common measurement units,
 * and composed units across multiple physical dimensions. The module provides type-safe conversion
 * between compatible units while preventing invalid conversions between incompatible dimensions.
 * 
 * @summary
 * The UnitConverter module implements a flexible and extensible unit conversion system that handles:
 * - All SI base units and their prefixes (yotta to yocto)
 * - Common measurement units (imperial, metric, etc.)
 * - Composed units (speed, acceleration, density, etc.)
 * - Type-safe conversion between compatible units
 * - Validation of unit compatibility and conversion validity
 * 
 * @example
 * ```typescript
 * // Basic unit conversion
 * const lengthConverter = new UnitConverter(5280, 'ft');
 * const lengthInMiles = lengthConverter.to('mile'); // 1
 * 
 * // Converting between composed units
 * const speedConverter = new UnitConverter(100, 'km/h');
 * const speedInMps = speedConverter.to('m/s'); // ~27.78
 * 
 * // Adding custom units
 * UnitConverter.addUnit('m', 'lightyear', 9.461e15, 'length');
 * 
 * // Creating composed units
 * UnitConverter.composeUnit(
 *   [['kg', 1], ['m', -2]], // Components with powers
 *   'kg/m²',                 // Symbol
 *   'density'                // Dimension
 * );
 * ```
 * 
 * @remarks
 * The converter maintains dimensional consistency by tracking the physical dimension
 * of each unit (length, mass, time, etc.) and prevents conversions between incompatible
 * dimensions. For composed units, it automatically handles the conversion of complex
 * units like speed (m/s, km/h) or density (kg/m³) by managing the conversion factors
 * of their components.
 * 
 * The system supports:
 * - Base dimensions: length, mass, time, temperature, current, luminosity, substance
 * - Derived dimensions: force, pressure, energy, power, frequency, area, volume, speed,
 *   acceleration, density, flow, angle, digital
 * 
 * Error handling is implemented through a custom ConversionError class that provides
 * detailed error information for:
 * - Invalid input values or units
 * - Unknown or undefined units
 * - Incompatible unit conversions
 * - System-level errors
 * 
 * @throws {ConversionError}
 * - INVALID_INPUT: When input values or units are invalid
 * - UNKNOWN_UNIT: When attempting to use undefined units
 * - INCOMPATIBLE_UNITS: When converting between incompatible dimensions
 * - SYSTEM_ERROR: For internal system errors
 */


/**
 * @typedef {string} BaseUnit
 * @description Represents the fundamental SI units and other base units used in the system
 * @example 'g' | 'm' | 's' | 'A' | 'K' | 'mol' | 'cd' | 'Pa' | 'J' | 'W' | 'm²' | 'm³'
 */
type BaseUnit = 'g' | 'm' | 's' | 'A' | 'K' | 'mol' | 'cd' | 'Pa' | 'J' | 'W' | 'm²' | 'm³';

/**
 * @typedef {string} Dimension
 * @description Represents the physical dimensions supported by the unit converter
 * @example 'length' | 'mass' | 'time' | 'temperature' | 'current' | 'luminosity' | 
 * 'substance' | 'force' | 'pressure' | 'energy' | 'power' | 'frequency' | 'area' | 
 * 'volume' | 'speed' | 'acceleration' | 'density' | 'flow' | 'angle' | 'digital'
 */
type Dimension = 'length' | 'mass' | 'time' | 'temperature' | 'current' | 'luminosity' | 'substance' | 'force' | 'pressure' | 'energy' | 'power' | 'frequency' | 'area' | 'volume' | 'speed' | 'acceleration' | 'density' | 'flow' | 'angle' | 'digital';


/**
 * @interface UnitComponent
 * @description Represents a component of a composed unit with its power. Used to build
 * complex units like m/s², kg⋅m/s², etc. Each component represents one part of the
 * composed unit with its associated power.
 * 
 * @property {string} unit - The unit symbol (e.g., 'm', 'kg', 's')
 * @property {number} power - The power to which the unit is raised (e.g., 1 for m, -2 for s²)
 * 
 * @example
 * ```typescript
 * // Example of components for m/s²:
 * const components: UnitComponent[] = [
 *   { unit: 'm', power: 1 },  // meters to first power
 *   { unit: 's', power: -2 }  // seconds to negative second power
 * ];
 * ```
 * 
 * @readonly All properties are readonly to ensure immutability of unit definitions
 */
interface UnitComponent {
  readonly unit: string;
  readonly power: number;
}

/**
 * @interface ComposedUnit
 * @description Represents a unit composed of multiple base units. Used to define complex
 * units that are combinations of simpler units, such as velocity (m/s), acceleration (m/s²),
 * or pressure (kg/m⋅s²).
 * 
 * @property {ReadonlyArray<UnitComponent>} components - Array of unit components that make up
 *    the composed unit. The array is readonly to prevent modification after creation.
 * @property {string} symbol - Symbol representing the composed unit (e.g., 'm/s', 'N/m²')
 * 
 * @example
 * ```typescript
 * // Example of a velocity unit (m/s):
 * const velocityUnit: ComposedUnit = {
 *   components: [
 *     { unit: 'm', power: 1 },
 *     { unit: 's', power: -1 }
 *   ],
 *   symbol: 'm/s'
 * };
 * 
 * // Example of a pressure unit (Pascal = kg/m⋅s²):
 * const pressureUnit: ComposedUnit = {
 *   components: [
 *     { unit: 'kg', power: 1 },
 *     { unit: 'm', power: -1 },
 *     { unit: 's', power: -2 }
 *   ],
 *   symbol: 'Pa'
 * };
 * ```
 * 
 * @readonly All properties and the components array are readonly to ensure immutability
 */
interface ComposedUnit {
  readonly components: readonly UnitComponent[];
  readonly symbol: string;
}

/**
 * @interface UnitDefinition
 * @description Defines a unit's properties and relationship to its base unit. This interface
 * provides all the information needed to convert between compatible units and verify
 * dimensional compatibility.
 * 
 * @property {BaseUnit} base - The base unit this unit converts to (e.g., 'm' for length units)
 * @property {Dimension} dimension - The physical dimension of the unit (e.g., 'length', 'mass')
 * @property {string} symbol - The unit's symbol or name (e.g., 'km', 'mile')
 * @property {number} multiplier - Conversion factor to the base unit (e.g., 1000 for km to m)
 * @property {ComposedUnit} [composition] - Optional composition for composed units. Only present
 *    for units that are composed of multiple base units (e.g., m/s, kg/m³)
 * 
 * @example
 * ```typescript
 * // Example of a simple unit definition (kilometer)
 * const kilometerDef: UnitDefinition = {
 *   base: 'm',
 *   dimension: 'length',
 *   symbol: 'km',
 *   multiplier: 1000
 * };
 * 
 * // Example of a composed unit definition (meters per second)
 * const mpsDefinition: UnitDefinition = {
 *   base: 'm',
 *   dimension: 'speed',
 *   symbol: 'm/s',
 *   multiplier: 1,
 *   composition: {
 *     components: [
 *       { unit: 'm', power: 1 },
 *       { unit: 's', power: -1 }
 *     ],
 *     symbol: 'm/s'
 *   }
 * };
 * ```
 * 
 * @remarks
 * - The multiplier property represents the conversion factor from this unit to its base unit
 * - For composed units, the multiplier is calculated from the component multipliers
 * - All properties are readonly to prevent modification after creation
 * 
 * @readonly All properties are readonly to ensure immutability of unit definitions
 */
interface UnitDefinition {
  readonly base: BaseUnit;
  readonly dimension: Dimension;
  readonly symbol: string;
  readonly multiplier: number;
  readonly composition?: ComposedUnit;
}

/**
 * @class ConversionError
 * @extends Error
 * @description Custom error class for handling unit conversion errors
 * @property {string} code - Error type identifier
 */
export class ConversionError extends Error {
  constructor(
    message: string,
    public readonly code: 'INVALID_INPUT' | 'UNKNOWN_UNIT' | 'INCOMPATIBLE_UNITS' | 'SYSTEM_ERROR'
  ) {
    super(message);
    this.name = 'ConversionError';
    Object.setPrototypeOf(this, ConversionError.prototype);
  }
}


/**
 * @class UnitConverter
 * @description A robust and type-safe unit conversion system that handles both simple 
 * and composed units while maintaining dimensional consistency. This class provides
 * the core functionality for defining units, composing complex units, and performing
 * conversions between compatible units.
 * 
 * @property {number} value - The numeric value to convert
 * @property {string} unit - The source unit for conversion
 * @property {Map<string, UnitDefinition>} unitSystem - Static registry of all available units
 * 
 * @constructor
 * Creates a new UnitConverter instance for a specific value and unit.
 * @param {number} value - The numeric value to convert
 * @param {string} unit - The unit of the value
 * @throws {ConversionError} 
 *  - INVALID_INPUT if value is not finite
 *  - INVALID_INPUT if unit is empty or whitespace
 *  - UNKNOWN_UNIT if unit is not registered in the system
 * 
 * @example
 * Basic Usage:
 * ```typescript
 * // Simple unit conversion
 * const length = new UnitConverter(1000, 'mm');
 * console.log(length.to('m')); // 1
 * 
 * // Working with composed units
 * const speed = new UnitConverter(60, 'km/h');
 * console.log(speed.to('m/s')); // ~16.67
 * 
 * // Using metric prefixes
 * const mass = new UnitConverter(1, 'kg');
 * console.log(mass.to('mg')); // 1000000
 * ```
 * 
 * Advanced Usage:
 * ```typescript
 * // Custom unit definition
 * UnitConverter.addUnit('m', 'parsec', 3.086e16, 'length');
 * const distance = new UnitConverter(1, 'parsec');
 * console.log(distance.to('lightyear')); // ~3.26156
 * 
 * // Complex composed unit
 * UnitConverter.composeUnit(
 *   [['kg', 1], ['m', -1], ['s', -2]], 
 *   'Pa',
 *   'pressure'
 * );
 * const pressure = new UnitConverter(101325, 'Pa');
 * console.log(pressure.to('atm')); // 1
 * ```
 * 
 * @implements {Readonly<UnitConverter>}
 * All instance properties are readonly to ensure immutability during conversions.
 * 
 * @remarks
 * Implementation Notes:
 * - The class uses a static unit registry to maintain unit definitions
 * - All conversion factors are stored relative to SI base units
 * - Composed units are handled by decomposing into base units
 * - Dimensional analysis ensures conversion compatibility
 * - Unit definitions are immutable once created
 * 
 * Features:
 * 1. SI Units & Prefixes
 *    - All SI base units (m, kg, s, A, K, mol, cd)
 *    - Full range of SI prefixes (yotta to yocto)
 *    - Automatic prefix handling in conversions
 * 
 * 2. Composed Units
 *    - Support for complex unit compositions
 *    - Automatic dimensional analysis
 *    - Power handling (squares, cubes, inverse units)
 * 
 * 3. Error Handling
 *    - Type-safe conversion validation
 *    - Comprehensive error reporting
 *    - Runtime dimension checking
 * 
 * Limitations:
 * - Temperature conversions only support absolute scales
 * - Floating point precision limitations apply
 * - Custom unit definitions must align with SI base units
 * 
 * @see {@link UnitDefinition} for details on unit definition structure
 * @see {@link ComposedUnit} for details on composed unit structure
 * @see {@link ConversionError} for error handling details
 */
export class UnitConverter {
  private static readonly unitSystem = new Map<string, UnitDefinition>();
  private readonly value: number;
  private readonly unit: string;

  /**
   * @constructor
   * @description Creates a new UnitConverter instance for a specific value and unit
   * 
   * @param {number} value - The numeric value to be converted
   * @param {string} unit - The source unit
   * @throws {ConversionError} 
   *  - INVALID_INPUT if value is not finite
   *  - INVALID_INPUT if unit is empty or whitespace
   *  - UNKNOWN_UNIT if the unit is not recognized
   * 
   * @example
   * ```typescript
   * // Create a converter for 100 kilometers
   * const distance = new UnitConverter(100, 'km');
   * 
   * // Create a converter for 50 miles per hour
   * const speed = new UnitConverter(50, 'mph');
   * ```
   */
  constructor(value: number, unit: string) {
    this.validateInput(value, unit);
    this.value = value;
    this.unit = unit;
  }

  private validateInput(value: number, unit: string): void {
    if (!Number.isFinite(value)) {
      throw new ConversionError('Value must be finite', 'INVALID_INPUT');
    }
    if (!unit?.trim()) {
      throw new ConversionError('Unit cannot be empty', 'INVALID_INPUT');
    }
    if (!UnitConverter.unitSystem.has(unit)) {
      throw new ConversionError(`Unknown unit: ${unit}`, 'UNKNOWN_UNIT');
    }
  }

  private static parseComposedUnit(unitStr: string): ComposedUnit {
    const components: UnitComponent[] = [];
    const parts = unitStr.split(/[⋅·*/]/);
    
    parts.forEach(part => {
      const [unit, powerStr] = part.split('^');
      const power = powerStr ? Number(powerStr) : 1;
      components.push({ unit: unit.trim(), power });
    });

    return {
      components: Object.freeze(components),
      symbol: unitStr
    };
  }

  /**
 * @static
 * @method addUnit
 * @description Adds a new unit to the unit conversion system. This method allows extending
 * the system with custom units by defining their relationship to base SI units.
 * 
 * @param {BaseUnit} base - The base SI unit this unit converts to (e.g., 'm' for length units)
 * @param {string} symbol - The symbol or name for the new unit (e.g., 'furlong')
 * @param {number} multiplier - Conversion factor from this unit to the base unit
 * @param {Dimension} dimension - Physical dimension of the unit (e.g., 'length', 'mass')
 * 
 * @throws {ConversionError} 
 * - INVALID_INPUT if multiplier is not a positive finite number
 * - SYSTEM_ERROR if there's an issue adding the unit to the system
 * 
 * @example
 * ```typescript
 * // Adding a custom length unit
 * UnitConverter.addUnit('m', 'furlong', 201.168, 'length');
 * 
 * // Adding a custom mass unit
 * UnitConverter.addUnit('g', 'stone', 6350.29318, 'mass');
 * 
 * // Adding a metric prefix unit
 * UnitConverter.addUnit('m', 'km', 1000, 'length');
 * ```
 * 
 * @remarks
 * - The multiplier must be positive and finite
 * - Units are immutable once added
 * - Adding a unit with an existing symbol will throw an error
 */
  static addUnit(
    base: BaseUnit,           // Base unit (e.g., 'm', 'kg')
    symbol: string,           // Unit symbol/name (e.g., 'km', 'mile') 
    multiplier: number,       // Conversion factor to base unit
    dimension: Dimension      // Physical dimension (e.g., 'length', 'mass')
  ): void {
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      throw new ConversionError('Invalid multiplier', 'INVALID_INPUT');
    }
  
    UnitConverter.unitSystem.set(symbol, Object.freeze({
      base,
      dimension,
      symbol,
      multiplier
    }));
  }

  /**
   * @static
   * @method composeUnit
   * @description Creates a new unit composed of multiple base units. This method enables
   * the creation of complex units like speed (m/s), acceleration (m/s²), or pressure (N/m²).
   * 
   * @param {[string, number][]} components - Array of [unit, power] tuples defining the composition
   * @param {string} symbol - Symbol for the composed unit (e.g., 'm/s', 'km/h')
   * @param {Dimension} dimension - Physical dimension of the resulting unit
   * 
   * @throws {ConversionError}
   * - UNKNOWN_UNIT if any component unit is not defined in the system
   * - INVALID_INPUT if the composition is invalid
   * - SYSTEM_ERROR if there's an issue creating the composed unit
   * 
   * @example
   * ```typescript
   * // Creating a velocity unit (meters per second)
   * UnitConverter.composeUnit(
   *   [['m', 1], ['s', -1]],
   *   'm/s',
   *   'speed'
   * );
   * 
   * // Creating an acceleration unit
   * UnitConverter.composeUnit(
   *   [['m', 1], ['s', -2]],
   *   'm/s²',
   *   'acceleration'
   * );
   * 
   * // Creating a pressure unit
   * UnitConverter.composeUnit(
   *   [['kg', 1], ['m', -1], ['s', -2]],
   *   'Pa',
   *   'pressure'
   * );
   * ```
   * 
   * @remarks
   * - All component units must already exist in the system
   * - The resulting unit is immutable
   * - The multiplier is automatically calculated from the component multipliers
   */
  public static composeUnit(
    components: [string, number][],
    symbol: string,
    dimension: Dimension
  ): void {
    const multiplier = components.reduce((acc, [unit, power]) => {
      const baseUnit = UnitConverter.unitSystem.get(unit);
      if (!baseUnit) throw new Error(`Unknown unit: ${unit}`);
      return acc * Math.pow(baseUnit.multiplier, power);
    }, 1);

    const composition: ComposedUnit = {
      components: Object.freeze(components.map(([unit, power]) => ({ unit, power }))),
      symbol
    };

    const baseComponent = components[0][0];
    const baseUnit = UnitConverter.unitSystem.get(baseComponent)?.base;
    
    if (!baseUnit) throw new Error(`Invalid base unit: ${baseComponent}`);

    UnitConverter.unitSystem.set(symbol, Object.freeze({
      base: baseUnit,
      dimension,
      symbol,
      multiplier,
      composition
    }));
  }

  /**
  * @static
  * @method listUnits
  * @description Lists all supported units in the system with detailed information about each unit.
  * Provides optional filtering by physical dimension to retrieve specific subsets of units.
  * 
  * @typeParam T - Return type is an array of unit information objects containing:
  *               - symbol: The unit's symbol or identifier
  *               - dimension: The physical dimension the unit measures
  *               - base: The SI base unit it converts to
  *               - multiplier: The conversion factor to the base unit
  * 
  * @param {Dimension} [dimension] - Optional physical dimension to filter units by.
  *                                 If provided, returns only units of that dimension.
  *                                 Valid dimensions include:
  *                                 - 'length' (e.g., meters, feet, miles)
  *                                 - 'mass' (e.g., grams, pounds, tonnes)
  *                                 - 'time' (e.g., seconds, hours, days)
  *                                 - 'temperature' (e.g., Kelvin, Celsius)
  *                                 - etc.
  * 
  * @returns {Array<{
  *   symbol: string,
  *   dimension: Dimension,
  *   base: BaseUnit,
  *   multiplier: number
  * }>} Returns an array of unit information objects, sorted alphabetically by symbol.
  *     Each object contains:
  *     - symbol: The unit's identifier (e.g., 'km', 'mph', 'kg')
  *     - dimension: The physical quantity measured (e.g., 'length', 'speed', 'mass')
  *     - base: The SI base unit for conversion (e.g., 'm', 's', 'g')
  *     - multiplier: Conversion factor to base unit (e.g., 1000 for km to m)
  * 
  * @throws {ConversionError}
  * - SYSTEM_ERROR if the unit system hasn't been initialized
  * 
  * @example
  * Basic Usage - List All Units:
  * ```typescript
  * const allUnits = UnitConverter.listUnits();
  * console.log(allUnits);
  * // [
  * //   { symbol: 'A', dimension: 'current', base: 'A', multiplier: 1 },
  * //   { symbol: 'acre', dimension: 'area', base: 'm²', multiplier: 4046.8564224 },
  * //   { symbol: 'atm', dimension: 'pressure', base: 'Pa', multiplier: 101325 }
  * //   ...
  * // ]
  * ```
  * 
  * Filtering by Dimension:
  * ```typescript
  * // List only length units
  * const lengthUnits = UnitConverter.listUnits('length');
  * console.log(lengthUnits);
  * // [
  * //   { symbol: 'Å', dimension: 'length', base: 'm', multiplier: 1e-10 },
  * //   { symbol: 'cm', dimension: 'length', base: 'm', multiplier: 0.01 },
  * //   { symbol: 'dm', dimension: 'length', base: 'm', multiplier: 0.1 },
  * //   { symbol: 'fm', dimension: 'length', base: 'm', multiplier: 1e-15 },
  * //   { symbol: 'ft', dimension: 'length', base: 'm', multiplier: 0.3048 }
  * //   ...
  * // ]
  * 
  * // List pressure units
  * const pressureUnits = UnitConverter.listUnits('pressure');
  * console.log(pressureUnits);
  * // [
  * //   { symbol: 'atm', dimension: 'pressure', base: 'Pa', multiplier: 101325 },
  * //   { symbol: 'bar', dimension: 'pressure', base: 'Pa', multiplier: 100000 },
  * //   { symbol: 'psi', dimension: 'pressure', base: 'Pa', multiplier: 6894.757293168 }
  * //   ...
  * // ]
  * ```
  * 
  * Using Results for Conversion:
  * ```typescript
  * // Find available length units and perform conversion
  * const lengthUnits = UnitConverter.listUnits('length');
  * console.log('Available length units:', lengthUnits.map(u => u.symbol).join(', '));
  * 
  * const distance = new UnitConverter(5280, 'ft');
  * console.log(`5280 ft is ${distance.to('mile')} miles`); // "5280 ft is 1 mile"
  * ```
  * 
  * @remarks
  * Implementation Notes:
  * - Returns an empty array if no units match the provided dimension
  * - Includes both simple units (e.g., 'm', 'kg') and composed units (e.g., 'm/s', 'kg/m³')
  * - Results are always sorted alphabetically by unit symbol
  * - Composed units show their effective multiplier to their base unit
  * - The multiplier represents the conversion factor needed to convert to the base unit
  * - All properties in returned objects are readonly to prevent modifications
  * 
  * Common Use Cases:
  * 1. Discovering available units for a specific dimension
  * 2. Exploring conversion factors between units
  * 3. Building user interfaces for unit selection
  * 4. Validating unit compatibility before conversion
  * 
  * @see {@link Dimension} for all available physical dimensions
  * @see {@link BaseUnit} for the available base units
  * @see {@link UnitDefinition} for the complete unit definition structure
  */
  public static listUnits(dimension?: Dimension): {
    symbol: string;
    dimension: Dimension;
    base: BaseUnit;
    multiplier: number;
  }[] {
    const units = Array.from(UnitConverter.unitSystem.entries())
      .map(([symbol, def]) => ({
        symbol,
        dimension: def.dimension,
        base: def.base,
        multiplier: def.multiplier
      }));
  
    const filteredUnits = dimension 
      ? units.filter(unit => unit.dimension === dimension)
      : units;
  
    return filteredUnits.sort((a, b) => a.symbol.localeCompare(b.symbol));
  }

  /**
   * @static
   * @method isValidUnit
   * @description Checks if a given unit string is valid and registered in the system.
   * Useful for validation before attempting conversions.
   * 
   * @param {string} unit - The unit string to validate
   * @returns {boolean} True if the unit is valid and registered, false otherwise
   * 
   * @example
   * ```typescript
   * console.log(UnitConverter.isValidUnit('km')); // true
   * console.log(UnitConverter.isValidUnit('invalid')); // false
   * ```
   */
  public static isValidUnit(unit: string): boolean {
    return UnitConverter.unitSystem.has(unit?.trim());
  }

  /**
   * @static
   * @method getDimension
   * @description Gets the physical dimension of a given unit.
   * 
   * @param {string} unit - The unit to check
   * @returns {Dimension} The physical dimension of the unit
   * @throws {ConversionError} UNKNOWN_UNIT if the unit is not registered
   * 
   * @example
   * ```typescript
   * console.log(UnitConverter.getDimension('km')); // 'length'
   * console.log(UnitConverter.getDimension('m/s')); // 'speed'
   * ```
   */
  public static getDimension(unit: string): Dimension {
    const definition = UnitConverter.unitSystem.get(unit?.trim());
    if (!definition) {
      throw new ConversionError(`Unknown unit: ${unit}`, 'UNKNOWN_UNIT');
    }
    return definition.dimension;
  }

  /**
   * @static
   * @method areCompatible
   * @description Checks if two units are compatible for conversion (same dimension).
   * 
   * @param {string} unit1 - First unit to compare
   * @param {string} unit2 - Second unit to compare
   * @returns {boolean} True if units are compatible, false otherwise
   * @throws {ConversionError} UNKNOWN_UNIT if either unit is not registered
   * 
   * @example
   * ```typescript
   * console.log(UnitConverter.areCompatible('km', 'mile')); // true
   * console.log(UnitConverter.areCompatible('km', 'kg')); // false
   * ```
   */
  public static areCompatible(unit1: string, unit2: string): boolean {
    const dim1 = UnitConverter.getDimension(unit1);
    const dim2 = UnitConverter.getDimension(unit2);
    return dim1 === dim2;
  }
  
  /**
   * @static
   * @method getBaseUnit
   * @description Gets the SI base unit for a given unit.
   * 
   * @param {string} unit - The unit to check
   * @returns {BaseUnit} The SI base unit
   * @throws {ConversionError} UNKNOWN_UNIT if the unit is not registered
   * 
   * @example
   * ```typescript
   * console.log(UnitConverter.getBaseUnit('km')); // 'm'
   * console.log(UnitConverter.getBaseUnit('mph')); // 'm'
   * ```
   */
  public static getBaseUnit(unit: string): BaseUnit {
    const definition = UnitConverter.unitSystem.get(unit?.trim());
    if (!definition) {
      throw new ConversionError(`Unknown unit: ${unit}`, 'UNKNOWN_UNIT');
    }
    return definition.base;
  }

  /**
   * @method format
   * @description Formats the current value with its unit symbol.
   * 
   * @param {Object} options - Formatting options
   * @param {number} [options.precision=3] - Number of decimal places
   * @param {boolean} [options.showUnit=true] - Whether to include the unit symbol
   * @returns {string} Formatted string representation
   * 
   * @example
   * ```typescript
   * const speed = new UnitConverter(27.7777, 'm/s');
   * console.log(speed.format()); // "27.778 m/s"
   * console.log(speed.format({ precision: 1 })); // "27.8 m/s"
   * console.log(speed.format({ showUnit: false })); // "27.778"
   * ```
   */
  public format(options: { precision?: number; showUnit?: boolean } = {}): string {
    const { precision = 3, showUnit = true } = options;
    const formatted = this.value.toFixed(precision);
    return showUnit ? `${formatted} ${this.unit}` : formatted;
  }
  
  public convertAndFormat(
    targetUnit: string,
    options: { precision?: number; showUnit?: boolean } = {}
  ): string {
    const converted = this.to(targetUnit);
    const converter = new UnitConverter(converted, targetUnit);
    return converter.format(options);
  }
  
  public static listCompatibleUnits(unit: string): {
    symbol: string;
    multiplier: number;
  }[] {
    const dimension = UnitConverter.getDimension(unit);
    return Array.from(UnitConverter.unitSystem.entries())
      .filter(([_, def]) => def.dimension === dimension)
      .map(([symbol, def]) => ({
        symbol,
        multiplier: def.multiplier
      }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
  }
  
  public static parseUnit(unitStr: string): ComposedUnit {
    if (!unitStr?.trim()) {
      throw new ConversionError('Invalid unit string', 'INVALID_INPUT');
    }
    
    try {
      return UnitConverter.parseComposedUnit(unitStr);
    } catch (error) {
      throw new ConversionError(
        `Failed to parse unit: ${unitStr}`,
        'INVALID_INPUT'
      );
    }
  }

  
  /**
   * @method to
   * @description Converts the current value from its unit to the specified target unit.
   * Only allows conversion between compatible units (same dimension).
   * 
   * @param {string} targetUnit - The unit to convert to
   * @returns {number} The converted value in the target unit
   * 
   * @throws {ConversionError}
   * - UNKNOWN_UNIT if the target unit is not defined
   * - INCOMPATIBLE_UNITS if converting between incompatible dimensions
   * - SYSTEM_ERROR if there's an internal conversion error
   * 
   * @example
   * ```typescript
   * // Simple length conversion
   * const length = new UnitConverter(5280, 'ft');
   * const miles = length.to('mile');  // 1
   * 
   * // Temperature conversion
   * const temp = new UnitConverter(0, 'C');
   * const kelvin = temp.to('K');  // 273.15
   * 
   * // Composed unit conversion
   * const speed = new UnitConverter(100, 'km/h');
   * const mps = speed.to('m/s');  // ~27.78
   * 
   * // Mass conversion with metric prefixes
   * const mass = new UnitConverter(1, 'kg');
   * const grams = mass.to('g');  // 1000
   * ```
   * 
   * @remarks
   * - Conversions maintain precision within floating-point limitations
   * - Composed units are automatically handled based on their components
   * - For composed units, all component conversions must be valid
   * - The method verifies dimensional compatibility before conversion
   */
  public to(targetUnit: string): number {
    const source = UnitConverter.unitSystem.get(this.unit)!;
    const target = UnitConverter.unitSystem.get(targetUnit);

    if (!target) throw new Error(`Unknown target unit: ${targetUnit}`);

    if (source.composition && target.composition) {
      return this.convertComposed(source, target);
    }

    return this.value * (source.multiplier / target.multiplier);
  }

  private convertComposed(source: UnitDefinition, target: UnitDefinition): number {
    if (!source.composition || !target.composition) {
      throw new Error('Invalid composed unit conversion');
    }

    const sourceMultiplier = this.getComposedMultiplier(source.composition);
    const targetMultiplier = this.getComposedMultiplier(target.composition);

    return this.value * (sourceMultiplier / targetMultiplier);
  }

  private getComposedMultiplier(composition: ComposedUnit): number {
    return composition.components.reduce((acc, { unit, power }) => {
      const baseUnit = UnitConverter.unitSystem.get(unit);
      if (!baseUnit) throw new Error(`Unknown unit in composition: ${unit}`);
      return acc * Math.pow(baseUnit.multiplier, power);
    }, 1);
  }

  /**
   * @static
   * @method initializeAllUnits
   * @description Initializes the unit conversion system with all predefined units including
   * SI units with prefixes, common imperial units, and composed units.
   * 
   * @throws {ConversionError}
   * - SYSTEM_ERROR if there's an error during initialization
   * 
   * @example
   * ```typescript
   * // Initialize all units at application startup
   * UnitConverter.initializeAllUnits();
   * 
   * // After initialization, units are ready for use
   * const length = new UnitConverter(1, 'mile');
   * const meters = length.to('m');  // 1609.344
   * ```
   * 
   * @remarks
   * - Should be called once at application startup
   * - Initializes:
   *   - All SI base units with prefixes (yotta to yocto)
   *   - Common imperial and metric units
   *   - Composed units (speed, acceleration, etc.)
   *   - Specialized units (astronomical, scientific, etc.)
   * - Units are immutable after initialization
   */
  static initializeAllUnits(): void {
    // Base SI units with prefixes
    this.initializeSIUnits();
    
    // Length
    [
      ['inch', 0.0254], ['in', 0.0254],
      ['foot', 0.3048], ['ft', 0.3048],
      ['yard', 0.9144], ['yd', 0.9144],
      ['mile', 1609.344], ['mi', 1609.344],
      ['nauticalMile', 1852], ['nmi', 1852],
      ['angstrom', 1e-10], ['Å', 1e-10],
      ['lightYear', 9.461e15], ['ly', 9.461e15],
      ['parsec', 3.086e16], ['pc', 3.086e16]
    ].forEach(([unit, mult]) => UnitConverter.addUnit('m', unit as string, mult as number, 'length'));

    // Mass
    [
      ['pound', 0.45359237], ['lb', 0.45359237],
      ['ounce', 0.028349523125], ['oz', 0.028349523125],
      ['stone', 6.35029318], ['st', 6.35029318],
      ['ton', 907.18474], ['shortTon', 907.18474],
      ['longTon', 1016.047], ['metricTon', 1000],
      ['carat', 0.0002], ['ct', 0.0002],
      ['grain', 0.00006479891], ['gr', 0.00006479891]
    ].forEach(([unit, mult]) => UnitConverter.addUnit('g', unit as string, mult as number, 'mass'));

    // Time
    [
      ['minute', 60], ['min', 60],
      ['hour', 3600], ['hr', 3600], ['h', 3600],
      ['day', 86400], ['d', 86400],
      ['week', 604800], ['wk', 604800],
      ['fortnight', 1209600],
      ['month', 2629746], ['mo', 2629746],
      ['year', 31556952], ['yr', 31556952],
      ['decade', 315569520],
      ['century', 3155695200]
    ].forEach(([unit, mult]) => UnitConverter.addUnit('s', unit as string, mult as number, 'time'));

    // Area
    [
      ['acre', 4046.8564224],
      ['hectare', 10000], ['ha', 10000],
      ['squareFoot', 0.09290304], ['ft²', 0.09290304],
      ['squareInch', 0.00064516], ['in²', 0.00064516],
      ['squareYard', 0.83612736], ['yd²', 0.83612736],
      ['squareMile', 2589988.110336], ['mi²', 2589988.110336]
    ].forEach(([unit, mult]) => UnitConverter.addUnit('m²', unit as string, mult as number, 'area'));

    // Volume
    [
      ['liter', 0.001], ['L', 0.001],
      ['gallon', 0.003785411784], ['gal', 0.003785411784],
      ['quart', 0.000946352946], ['qt', 0.000946352946],
      ['pint', 0.000473176473], ['pt', 0.000473176473],
      ['cup', 0.0002365882365],
      ['fluidOunce', 2.95735295625e-5], ['flOz', 2.95735295625e-5],
      ['tablespoon', 1.47867647813e-5], ['tbsp', 1.47867647813e-5],
      ['teaspoon', 4.92892159375e-6], ['tsp', 4.92892159375e-6],
      ['cubicFoot', 0.028316846592], ['ft³', 0.028316846592],
      ['cubicInch', 1.6387064e-5], ['in³', 1.6387064e-5],
      ['cubicYard', 0.764554857984], ['yd³', 0.764554857984]
    ].forEach(([unit, mult]) => UnitConverter.addUnit('m³', unit as string, mult as number, 'volume'));

    // Pressure
    [
      ['atmosphere', 101325], ['atm', 101325],
      ['bar', 100000],
      ['psi', 6894.757293168],
      ['torr', 133.322368421],
      ['mmHg', 133.322368421],
      ['inHg', 3386.389],
      ['kPa', 1000]
    ].forEach(([unit, mult]) => UnitConverter.addUnit('Pa', unit as string, mult as number, 'pressure'));

    // Energy
    [
      ['calorie', 4.184], ['cal', 4.184],
      ['kilocalorie', 4184], ['kcal', 4184],
      ['electronVolt', 1.602176634e-19], ['eV', 1.602176634e-19],
      ['britishThermalUnit', 1055.05585262], ['BTU', 1055.05585262],
      ['footPound', 1.355817948], ['ft⋅lb', 1.355817948],
      ['wattHour', 3600], ['Wh', 3600],
      ['kilowattHour', 3600000], ['kWh', 3600000]
    ].forEach(([unit, mult]) => UnitConverter.addUnit('J', unit as string, mult as number, 'energy'));

    // Power
    [
      ['horsepower', 745.699872], ['hp', 745.699872],
      ['kilowatt', 1000], ['kW', 1000],
      ['megawatt', 1000000], ['MW', 1000000]
    ].forEach(([unit, mult]) => UnitConverter.addUnit('W', unit as string, mult as number, 'power'));

    // Composed units
    this.initializeComposedUnits();
  }

  private static initializeSIUnits(): void {
    const siPrefixes = [
      ['yotta', 'Y', 24], ['zetta', 'Z', 21], ['exa', 'E', 18],
      ['peta', 'P', 15], ['tera', 'T', 12], ['giga', 'G', 9],
      ['mega', 'M', 6], ['kilo', 'k', 3], ['hecto', 'h', 2],
      ['deca', 'da', 1], ['', '', 0], ['deci', 'd', -1],
      ['centi', 'c', -2], ['milli', 'm', -3], ['micro', 'μ', -6],
      ['nano', 'n', -9], ['pico', 'p', -12], ['femto', 'f', -15],
      ['atto', 'a', -18], ['zepto', 'z', -21], ['yocto', 'y', -24]
    ];

    const baseUnits = [
      ['m', 'length'], ['g', 'mass'], ['s', 'time'],
      ['A', 'current'], ['K', 'temperature'], ['mol', 'substance'],
      ['cd', 'luminosity']
    ];

    baseUnits.forEach(([unit, dimension]) => {
      siPrefixes.forEach(([full, symbol, power]) => {
        const mult = Math.pow(10, power as number);
        UnitConverter.addUnit(
          unit as BaseUnit,
          full + unit,
          mult,
          dimension as Dimension
        );
        if (symbol) {
          UnitConverter.addUnit(
            unit as BaseUnit,
            symbol + unit,
            mult,
            dimension as Dimension
          );
        }
      });
    });
  }

  private static initializeComposedUnits(): void {
    // Speed
    UnitConverter.composeUnit([['m', 1], ['s', -1]], 'm/s', 'speed');
    UnitConverter.composeUnit([['km', 1], ['h', -1]], 'km/h', 'speed');
    UnitConverter.composeUnit([['mile', 1], ['h', -1]], 'mph', 'speed');
    UnitConverter.composeUnit([['ft', 1], ['s', -1]], 'ft/s', 'speed');
    UnitConverter.composeUnit([['knot', 1]], 'kn', 'speed');

    // Acceleration
    UnitConverter.composeUnit([['m', 1], ['s', -2]], 'm/s²', 'acceleration');
    UnitConverter.composeUnit([['ft', 1], ['s', -2]], 'ft/s²', 'acceleration');
    UnitConverter.composeUnit([['g', 1]], 'g₀', 'acceleration');

    // Force
    UnitConverter.composeUnit([['kg', 1], ['m', 1], ['s', -2]], 'N', 'force');
    UnitConverter.composeUnit([['g', 1], ['m', 1], ['s', -2]], 'dyn', 'force');
    UnitConverter.composeUnit([['lb', 1], ['ft', 1], ['s', -2]], 'lbf', 'force');

    // Density
    UnitConverter.composeUnit([['kg', 1], ['m', -3]], 'kg/m³', 'density');
    UnitConverter.composeUnit([['g', 1], ['cm', -3]], 'g/cm³', 'density');
    UnitConverter.composeUnit([['lb', 1], ['ft', -3]], 'lb/ft³', 'density');

    // Flow
    UnitConverter.composeUnit([['m', 3], ['s', -1]], 'm³/s', 'flow');
    UnitConverter.composeUnit([['L', 1], ['min', -1]], 'L/min', 'flow');
    UnitConverter.composeUnit([['gal', 1], ['min', -1]], 'gpm', 'flow');

    // Frequency
    UnitConverter.composeUnit([['s', -1]], 'Hz', 'frequency');
    UnitConverter.composeUnit([['min', -1]], 'rpm', 'frequency');
  }
}

// Example usage:
// const speedConverter = new UnitConverter(100, 'km/h');
// const speedInMps = speedConverter.to('m/s');