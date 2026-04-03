# GVAS File Format Specification

## Overview

GVAS (Game Variable Attribute System) is Unreal Engine's binary save file format used for storing game state data. This document provides a complete specification for reading and writing GVAS files.

## File Structure

```
+------------------+
| Header           |
+------------------+
| Properties       |
+------------------+
| Trailing u32 (0) |
+------------------+
```

## Header Format

| Offset | Size | Type   | Description                    |
|--------|------|--------|--------------------------------|
| 0      | 4    | bytes  | Magic: "GVAS" (0x47 0x56 0x41 0x53) |
| 4      | 4    | u32    | Save game file version         |
| 8      | 4    | u32    | Package file version (UE4)     |
| 12     | 4    | u32    | Package file version (UE5, if save_game_version >= 3) |
| 16     | 2    | u16    | Engine version major           |
| 18     | 2    | u16    | Engine version minor           |
| 20     | 2    | u16    | Engine version patch           |
| 22     | 4    | u32    | Engine version changelist      |
| 26     | -    | string | Engine version branch string   |
| -      | 4    | u32    | Custom format version          |
| -      | 4    | u32    | Number of custom versions      |
| -      | N*20 | bytes  | Custom versions (GUID + u32 each) |
| -      | -    | string | Save game class name           |
| -      | 1    | u8     | Padding byte (0x00, if save_game_version >= 3) |

### Custom Version Entry (20 bytes each)

| Offset | Size | Type  | Description |
|--------|------|-------|-------------|
| 0      | 16   | bytes | GUID        |
| 16     | 4    | u32   | Version     |

## Property Format

Properties are the core data structure in GVAS files. Each property consists of a name, type name, metadata, and data.

### Property Structure

```
string: Property name
string: Property type name
u32:    DuplicateIndex (usually 0)
u32:    DataSize (size of data section)
u8:     HasPropertyGuid (0 or 1)
[GUID]: Property GUID (if HasPropertyGuid == 1)
[data]: Property-specific data
```

### Property Termination

Properties are terminated by a property with name "None" or an empty string.

## String Format

Strings are length-prefixed with null termination:

| Offset | Size | Type   | Description                    |
|--------|------|--------|--------------------------------|
| 0      | 4    | i32    | Length (including null terminator) |
| 4      | N    | bytes  | UTF-8 characters + null byte   |

**Empty strings:** Length is 0, no bytes follow.

**Wide strings:** If length is negative, the string is UTF-16LE. Absolute value of length is the character count (not byte count).

## FName Format

FName is used for type names and enum types:

| Offset | Size | Type   | Description                    |
|--------|------|--------|--------------------------------|
| 0      | 4    | u32    | Number (namespace index)       |
| 4      | -    | string | Name string                    |

## Property Types

### Primitive Types

#### BoolProperty
```
string: "BoolProperty"
u32:    DuplicateIndex (0)
u32:    DataSize (always 0)
u8:     Value (0x00 or 0x01)
u8:     HasPropertyGuid (0 or 1)
[GUID]: Property GUID (if HasPropertyGuid == 1)
```

#### IntProperty
```
string: "IntProperty"
u32:    DuplicateIndex
u32:    DataSize (patched after writing)
u8:     HasPropertyGuid
[GUID]: Property GUID (if HasPropertyGuid == 1)
i32:    Value (little-endian)
```

#### UInt32Property
```
string: "UInt32Property"
u32:    DuplicateIndex
u32:    DataSize
u8:     HasPropertyGuid
[GUID]: Property GUID (if HasPropertyGuid == 1)
u32:    Value (little-endian)
```

#### Int64Property
```
string: "Int64Property"
u32:    DuplicateIndex
u32:    DataSize
u8:     HasPropertyGuid
[GUID]: Property GUID (if HasPropertyGuid == 1)
i64:    Value (little-endian)
```

#### UInt64Property
```
string: "UInt64Property"
u32:    DuplicateIndex
u32:    DataSize
u8:     HasPropertyGuid
[GUID]: Property GUID (if HasPropertyGuid == 1)
u64:    Value (little-endian)
```

#### FloatProperty
```
string: "FloatProperty"
u32:    DuplicateIndex
u32:    DataSize
u8:     HasPropertyGuid
[GUID]: Property GUID (if HasPropertyGuid == 1)
f32:    Value (little-endian)
```

#### DoubleProperty
```
string: "DoubleProperty"
u32:    DuplicateIndex
u32:    DataSize
u8:     HasPropertyGuid
[GUID]: Property GUID (if HasPropertyGuid == 1)
f64:    Value (little-endian)
```

#### StrProperty
```
string: "StrProperty"
u32:    DuplicateIndex
u32:    DataSize
u8:     HasPropertyGuid
[GUID]: Property GUID (if HasPropertyGuid == 1)
string: Value (if DataSize > 0)
```

#### NameProperty
```
string: "NameProperty"
u32:    DuplicateIndex
u32:    DataSize
u8:     HasPropertyGuid
[GUID]: Property GUID (if HasPropertyGuid == 1)
string: Value (if DataSize > 0)
```

#### TextProperty
```
string: "TextProperty"
u32:    DuplicateIndex
u32:    DataSize
u8:     HasPropertyGuid
[GUID]: Property GUID (if HasPropertyGuid == 1)
i32:    Flags
u8:     HistoryType (0 = Localized, 255 = None)
...:    History-specific data
```

HistoryType variants:
- **0 (Localized):** Three strings (key, source, etc.)
- **255 (None):** Optional i32 hasCultureInvariant + string

#### ByteProperty
```
string: "ByteProperty"
FName:  EnumType (or "None" for raw byte)
u32:    DuplicateIndex
u32:    DataSize
u8:     HasPropertyGuid
[GUID]: Property GUID (if HasPropertyGuid == 1)
u8:     Value (if EnumType.name == "None")
string: Value (if EnumType.name != "None")
```

#### EnumProperty
```
string: "EnumProperty"
FName:  EnumTypeName
FName:  EnumModule
FName:  UnderlyingType
u32:    DuplicateIndex
u32:    DataSize
u8:     HasPropertyGuid
[GUID]: Property GUID (if HasPropertyGuid == 1)
string: Value (if DataSize > 0)
```

### Container Types

#### ArrayProperty
```
string: "ArrayProperty"
FName:  InnerType
[if InnerType == "StructProperty"]:
  FName: StructName
  FName: StructModule
u32:    DuplicateIndex
u32:    DataSize
u8:     HasPropertyGuid
[GUID]: Property GUID (if HasPropertyGuid == 1)
u32:    Count
...:    Elements (count times)
```

Element serialization depends on inner type:
- **StructProperty:** Nested property list (terminated by "None")
- **ObjectProperty/SoftObjectProperty/StrProperty/NameProperty/EnumProperty:** string per element
- **IntProperty:** i32 per element
- **UInt32Property:** u32 per element
- **Int64Property:** i64 per element
- **UInt64Property:** u64 per element
- **FloatProperty:** f32 per element
- **DoubleProperty:** f64 per element
- **BoolProperty:** u8 (0 or 1) per element
- **ByteProperty:** u8 per element

#### MapProperty
```
string: "MapProperty"
FName:  KeyType
FName:  ValueType
u32:    DuplicateIndex
u32:    DataSize
u8:     HasPropertyGuid
[GUID]: Property GUID (if HasPropertyGuid == 1)
u32:    RemovedCount (usually 0)
u32:    Count
...:    Key-value pairs (count times)
```

Each key-value pair is serialized according to its type (see MapElement below).

#### SetProperty
```
string: "SetProperty"
FName:  InnerType
u32:    DuplicateIndex
u32:    DataSize
u8:     HasPropertyGuid
[GUID]: Property GUID (if HasPropertyGuid == 1)
u32:    RemovedCount (usually 0)
u32:    Count
...:    Elements (count times)
```

### Map/Set Element Types

| Type | Serialization |
|------|---------------|
| IntProperty | i32 |
| UInt32Property | u32 |
| Int64Property | i64 |
| UInt64Property | u64 |
| FloatProperty | f32 |
| DoubleProperty | f64 |
| BoolProperty | u8 (0 or 1) |
| StrProperty | string |
| NameProperty | string |
| ObjectProperty | string |
| EnumProperty | string |
| StructProperty | Nested property list |

### Struct Types

#### StructProperty
```
string: "StructProperty"
FName:  StructType
FName:  StructModule
u32:    DuplicateIndex
u32:    DataSize
u8:     HasPropertyGuid
[GUID]: Property GUID (if HasPropertyGuid == 1)
...:    Struct data
```

Known struct types and their data formats:

| Struct Type | Data Format |
|-------------|-------------|
| Vector | f64 x, f64 y, f64 z (24 bytes) |
| Vector2D | f64 x, f64 y (16 bytes) |
| Rotator | f64 pitch, f64 yaw, f64 roll (24 bytes) |
| Quat | f64 x, f64 y, f64 z, f64 w (32 bytes) |
| LinearColor | f32 r, f32 g, f32 b, f32 a (16 bytes) |
| Color | u8 b, u8 g, u8 r, u8 a (4 bytes) |
| IntPoint | i32 x, i32 y (8 bytes) |
| IntVector | i32 x, i32 y, i32 z (12 bytes) |
| Box | f64 min.x, min.y, min.z, max.x, max.y, max.z (48 bytes) |
| Guid | 16 bytes raw |
| DateTime | i64 ticks |
| Timespan | i64 ticks |
| SoftClassPath | string |
| SoftObjectPath | string |

Custom structs contain nested properties terminated by "None".

### Object Types

#### ObjectProperty
```
string: "ObjectProperty"
u32:    DuplicateIndex
u32:    DataSize
u8:     HasPropertyGuid
[GUID]: Property GUID (if HasPropertyGuid == 1)
string: Object path (or i32(0) for null)
```

#### SoftObjectProperty
```
string: "SoftObjectProperty"
u32:    DuplicateIndex
u32:    DataSize
u8:     HasPropertyGuid
[GUID]: Property GUID (if HasPropertyGuid == 1)
string: AssetPath
string: SubPath
```

## GUID Format

GUIDs are 16 bytes stored as raw bytes.

String representation: `XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX` (hex, lowercase)

## Version-Specific Features

| Feature | Version |
|---------|---------|
| PackageFileUE5Version field | save_game_version >= 3 |
| Padding byte before properties | save_game_version >= 3 |
| Property GUID support | All versions (HasPropertyGuid flag) |
| FName-based type names | All versions |

## Reading Algorithm

```
1. Read and validate header (magic = "GVAS")
2. Read save_game_version, package_file_version
3. If save_game_version >= 3, read package_file_ue5_version
4. Read engine version (major, minor, patch, changelist, branch)
5. Read custom_format_version
6. Read custom_version_count, then custom_version_count GUID+version pairs
7. Read save_game_class_name
8. If save_game_version >= 3, read padding byte (should be 0x00)
9. Loop:
   a. Read property name
   b. If name == "None" or name == "", stop
   c. Read property type name
   d. Parse property based on type
   e. Store value
10. Read trailing u32 (should be 0)
```

## Writing Algorithm

```
1. Write magic "GVAS"
2. Write save_game_version, package_file_version
3. If save_game_version >= 3, write package_file_ue5_version
4. Write engine version fields
5. Write custom_format_version
6. Write custom_version_count, then custom_version_count GUID+version pairs
7. Write save_game_class_name
8. If save_game_version >= 3, write padding byte (0x00)
9. For each property:
   a. Write property name
   b. Write property type name
   c. Write metadata (DuplicateIndex, DataSize placeholder, HasPropertyGuid)
   d. Write property data
   e. Patch DataSize if needed
10. Write "None" property name to terminate
11. Write trailing u32 (0)
```

## Implementation Notes

1. **All integers are little-endian**
2. **DataSize is written as a placeholder and patched after writing data**
3. **Property GUIDs are optional (HasPropertyGuid flag)**
4. **Struct properties may contain nested properties**
5. **Arrays of structs contain nested property lists**
6. **Vector/Rotator/Quat use f64 (double precision) in UE5**
7. **Color uses BGRA byte order**
