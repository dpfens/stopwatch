# UnitConverter

A robust, type-safe unit conversion library supporting SI units, common measurement units, and composed units across multiple physical dimensions.

## Overview

UnitConverter provides a comprehensive solution for handling unit conversions while maintaining dimensional consistency. It supports all SI base units with their prefixes, common imperial and metric units, and complex composed units like speed, acceleration, and pressure.

## Features

- **SI Units & Prefixes**: Full support for all SI base units (m, kg, s, A, K, mol, cd) with prefixes from yotta (Y) to yocto (y)
- **Common Units**: Extensive collection of everyday measurement units (feet, pounds, gallons, etc.)
- **Composed Units**: Support for complex units like speed (m/s), acceleration (m/s²), and pressure (Pa)
- **Type Safety**: Strong typing and runtime validation ensure conversions maintain dimensional consistency
- **Immutable Design**: Thread-safe operations with immutable unit definitions
- **Extensible**: Easy addition of custom units and unit compositions

## Usage

### Basic Conversions

```typescript
// Initialize the unit system
UnitConverter.initializeAllUnits();

// Length conversion
const length = new UnitConverter(5280, 'ft');
console.log(length.to('mile')); // 1

// Mass conversion
const mass = new UnitConverter(1000, 'g');
console.log(mass.to('kg')); // 1

// Time conversion
const time = new UnitConverter(24, 'h');
console.log(time.to('day')); // 1
```

### Working with SI Prefixes

```typescript
const distance = new UnitConverter(1, 'km');
console.log(distance.to('m')); // 1000
console.log(distance.to('cm')); // 100000
console.log(distance.to('mm')); // 1000000

const microDistance = new UnitConverter(1000000, 'μm');
console.log(microDistance.to('m')); // 1
```

### Composed Units

```typescript
// Speed conversion
const speed = new UnitConverter(100, 'km/h');
console.log(speed.to('m/s')); // ~27.78
console.log(speed.to('mph')); // ~62.14

// Acceleration
const acceleration = new UnitConverter(9.81, 'm/s²');
console.log(acceleration.to('ft/s²')); // ~32.19

// Pressure
const pressure = new UnitConverter(1, 'atm');
console.log(pressure.to('Pa')); // 101325
console.log(pressure.to('psi')); // ~14.696
```

### Custom Units

```typescript
// Adding a custom length unit
UnitConverter.addUnit('m', 'lightyear', 9.461e15, 'length');

// Using the custom unit
const distance = new UnitConverter(1, 'lightyear');
console.log(distance.to('km')); // 9.461e12

// Creating a custom composed unit
UnitConverter.composeUnit(
  [['kg', 1], ['m', -3]], // Components with powers
  'kg/m³',                 // Symbol
  'density'                // Dimension
);
```

### Discovering Available Units

```typescript
// List all length units
const lengthUnits = UnitConverter.listUnits('length');
console.log(lengthUnits);
// [
//   { symbol: 'Å', dimension: 'length', base: 'm', multiplier: 1e-10 },
//   { symbol: 'cm', dimension: 'length', base: 'm', multiplier: 0.01 },
//   ...
// ]

// List all available units
const allUnits = UnitConverter.listUnits();
```

## Supported Dimensions

The library supports conversions across multiple physical dimensions:

- Length (meters, feet, miles, etc.)
- Mass (grams, pounds, tonnes, etc.)
- Time (seconds, hours, days, etc.)
- Temperature (Kelvin, Celsius, Fahrenheit)
- Current (amperes)
- Luminosity (candela)
- Substance (moles)
- Force (newtons, pound-force)
- Pressure (pascal, psi, atmospheres)
- Energy (joules, calories, BTU)
- Power (watts, horsepower)
- Area (square meters, acres, hectares)
- Volume (cubic meters, liters, gallons)
- Speed (m/s, km/h, mph)
- Acceleration (m/s², ft/s², g)
- Density (kg/m³, g/cm³)
- Flow (m³/s, L/min, gpm)
- Angle (radians, degrees)
- Digital (bits, bytes)

## Error Handling

The library provides comprehensive error handling through the `ConversionError` class:

```typescript
try {
  const invalid = new UnitConverter(1, 'invalidUnit');
} catch (error) {
  if (error instanceof ConversionError) {
    console.log(error.code); // 'UNKNOWN_UNIT'
    console.log(error.message); // 'Unknown unit: invalidUnit'
  }
}
```

Error codes include:
- `INVALID_INPUT`: Invalid numeric values or unit strings
- `UNKNOWN_UNIT`: Undefined or unsupported units
- `INCOMPATIBLE_UNITS`: Attempting to convert between incompatible dimensions
- `SYSTEM_ERROR`: Internal system errors

## Limitations

- Temperature conversions only support absolute scales
- Floating-point precision limitations apply to calculations
- Custom unit definitions must align with SI base units
- Unit system must be initialized before use

## Best Practices

1. **Initialize Early**: Call `initializeAllUnits()` at application startup
2. **Use Type Safety**: Leverage TypeScript's type system for early error detection
3. **Handle Errors**: Always implement proper error handling for conversions
4. **Validate Units**: Use `listUnits()` to verify unit availability
5. **Maintain Precision**: Be aware of floating-point limitations in calculations