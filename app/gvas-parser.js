// GVAS (Unreal Engine Save Game) Parser
// Supports GVAS format version 3 (UE 5.5+ / UE 5.6)
// Also handles older GVAS versions (1, 2)
// Platform-neutral: accepts and works only with Uint8Array input.

// ---------------------------------------------------------------------------
// Text decoders (TextDecoder is available in all target environments)
// ---------------------------------------------------------------------------

const _utf8Decoder = new TextDecoder("utf-8");
const _utf16leDecoder = new TextDecoder("utf-16le");

// ---------------------------------------------------------------------------
// GvasReader — reads from a Uint8Array via DataView
// ---------------------------------------------------------------------------

class GvasReader {
	constructor(uint8) {
		this.buf = uint8;
		this._dv = new DataView(uint8.buffer, uint8.byteOffset, uint8.byteLength);
		this.pos = 0;
	}

	readU8() {
		return this.buf[this.pos++];
	}

	readU16() {
		const v = this._dv.getUint16(this.pos, true);
		this.pos += 2;
		return v;
	}

	readI32() {
		const v = this._dv.getInt32(this.pos, true);
		this.pos += 4;
		return v;
	}

	readU32() {
		const v = this._dv.getUint32(this.pos, true);
		this.pos += 4;
		return v;
	}

	readI64() {
		const v = this._dv.getBigInt64(this.pos, true);
		this.pos += 8;
		return v;
	}

	readU64() {
		const v = this._dv.getBigUint64(this.pos, true);
		this.pos += 8;
		return v;
	}

	readF32() {
		const v = this._dv.getFloat32(this.pos, true);
		this.pos += 4;
		return v;
	}

	readF64() {
		const v = this._dv.getFloat64(this.pos, true);
		this.pos += 8;
		return v;
	}

	readBytes(n) {
		const v = this.buf.subarray(this.pos, this.pos + n);
		this.pos += n;
		return v;
	}

	readGuid() {
		return this.readBytes(16);
	}

	readGuidStr() {
		const bytes = this.readGuid();
		const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
		return (
			hex.slice(0, 8) + "-" +
			hex.slice(8, 12) + "-" +
			hex.slice(12, 16) + "-" +
			hex.slice(16, 20) + "-" +
			hex.slice(20)
		);
	}

	// Length-prefixed string. Positive length → UTF-8, negative → UTF-16LE.
	readString() {
		const len = this.readI32();
		if (len === 0) return "";
		if (len > 0) {
			const bytes = this.buf.subarray(this.pos, this.pos + len - 1);
			this.pos += len;
			return _utf8Decoder.decode(bytes);
		}
		// UTF-16LE
		const charCount = -len;
		const bytes = this.buf.subarray(this.pos, this.pos + charCount * 2 - 2);
		this.pos += charCount * 2;
		return _utf16leDecoder.decode(bytes);
	}

	// FName = u32 number + length-prefixed string
	readFName() {
		const number = this.readU32();
		const name = this.readString();
		return { name, number };
	}

	eof() {
		return this.pos >= this.buf.length;
	}
}

// ---------------------------------------------------------------------------
// parseGvas — main entry point
// ---------------------------------------------------------------------------

export function parseGvas(uint8) {
	const r = new GvasReader(uint8);

	// --- Magic ---
	const magic = _utf8Decoder.decode(r.readBytes(4));
	if (magic !== "GVAS") {
		throw new Error(
			`Not a GVAS file (magic: ${JSON.stringify(magic)}, expected "GVAS")`,
		);
	}

	const saveGameVersion = r.readU32();
	const packageFileVersion = r.readU32();

	// GVAS v3 (UE 5.x) adds a separate UE5 package version field
	let packageFileUE5Version = 0;
	if (saveGameVersion >= 3) {
		packageFileUE5Version = r.readU32();
	}

	// Engine version
	const engineVersion = {
		major: r.readU16(),
		minor: r.readU16(),
		patch: r.readU16(),
		changelist: r.readU32(),
		branch: r.readString(),
	};

	// Custom format version (GVAS v2+)
	const customFormatVersion = r.readU32();

	// Custom versions: array of (GUID, version) pairs
	const customVersions = [];
	const customVersionCount = r.readU32();
	for (let i = 0; i < customVersionCount; i++) {
		const guid = r.readGuidStr();
		const version = r.readU32();
		customVersions.push({ guid, version });
	}

	// Save game class name
	const saveGameClassName = r.readString();

	// GVAS v3 has a 0x00 byte before properties begin.
	if (saveGameVersion >= 3) {
		const maybePadding = r.readU8();
		if (maybePadding !== 0) {
			r.pos -= 1; // Not padding — rewind
		}
	}

	// --- Properties ---
	const properties = readPropertyList(r, saveGameVersion);

	// Trailing zero u32
	if (r.pos + 4 <= r.buf.length) {
		r.readU32();
	}

	return {
		header: {
			saveGameVersion,
			packageFileVersion,
			packageFileUE5Version,
			engineVersion,
			customFormatVersion,
			saveGameClassName,
		},
		customVersions,
		properties,
	};
}

// ---------------------------------------------------------------------------
// Property reading
// ---------------------------------------------------------------------------

function readPropertyList(r, ver) {
	const props = {};
	while (!r.eof()) {
		const name = r.readString();
		if (name === "None" || name === "") break;
		const value = readProperty(r, name, ver);
		if (name in props) {
			if (!Array.isArray(props[name])) props[name] = [props[name]];
			props[name].push(value);
		} else {
			props[name] = value;
		}
	}
	return props;
}

function readProperty(r, name, ver) {
	const typeName = r.readString();
	switch (typeName) {
		case "BoolProperty":       return readBoolProperty(r);
		case "IntProperty":        return readIntProperty(r);
		case "UInt32Property":     return readUInt32Property(r);
		case "Int64Property":      return readInt64Property(r);
		case "UInt64Property":     return readUInt64Property(r);
		case "FloatProperty":      return readFloatProperty(r);
		case "DoubleProperty":     return readDoubleProperty(r);
		case "StrProperty":        return readStrProperty(r);
		case "NameProperty":       return readNameProperty(r);
		case "TextProperty":       return readTextProperty(r);
		case "ObjectProperty":     return readObjectProperty(r);
		case "SoftObjectProperty": return readSoftObjectProperty(r);
		case "EnumProperty":       return readEnumProperty(r);
		case "ByteProperty":       return readByteProperty(r);
		case "ArrayProperty":      return readArrayProperty(r, ver);
		case "StructProperty":     return readStructProperty(r, ver);
		case "MapProperty":        return readMapProperty(r, ver);
		case "SetProperty":        return readSetProperty(r, ver);
		default:
			throw new Error(
				`Unknown property type "${typeName}" for "${name}" at offset 0x${r.pos.toString(16)}`,
			);
	}
}

// Common meta: u32 DuplicateIndex, u32 DataSize, u8 HasPropertyGuid [, GUID]
function readPropertyMeta(r) {
	const duplicateIndex = r.readU32();
	const dataSize = r.readU32();
	const hasPropertyGuid = r.readU8();
	let propertyGuid = null;
	if (hasPropertyGuid) propertyGuid = r.readGuidStr();
	return { duplicateIndex, dataSize, hasPropertyGuid: !!hasPropertyGuid, propertyGuid };
}

function readBoolProperty(r) {
	const duplicateIndex = r.readU32();
	const dataSize = r.readU32();
	const value = r.readU8() !== 0;
	const hasGuid = r.readU8();
	if (hasGuid) r.readGuidStr();
	return { type: "BoolProperty", value };
}

function readIntProperty(r)    { readPropertyMeta(r); return { type: "IntProperty",    value: r.readI32() }; }
function readUInt32Property(r) { readPropertyMeta(r); return { type: "UInt32Property", value: r.readU32() }; }
function readInt64Property(r)  { readPropertyMeta(r); return { type: "Int64Property",  value: r.readI64().toString() }; }
function readUInt64Property(r) { readPropertyMeta(r); return { type: "UInt64Property", value: r.readU64().toString() }; }
function readFloatProperty(r)  { readPropertyMeta(r); return { type: "FloatProperty",  value: r.readF32() }; }
function readDoubleProperty(r) { readPropertyMeta(r); return { type: "DoubleProperty", value: r.readF64() }; }

function readStrProperty(r) {
	const m = readPropertyMeta(r);
	return { type: "StrProperty", value: m.dataSize === 0 ? "" : r.readString() };
}

function readNameProperty(r) {
	const m = readPropertyMeta(r);
	return { type: "NameProperty", value: m.dataSize === 0 ? "" : r.readString() };
}

function readTextProperty(r) {
	const m = readPropertyMeta(r);
	const start = r.pos;
	const flags = r.readI32();
	const ht = r.readU8();
	let value = "";
	if (ht === 0) {
		r.readString(); const key = r.readString(); const src = r.readString();
		value = src || key;
	} else if (ht === 255 || ht === 0xff) {
		if (r.pos - start < m.dataSize) {
			if (r.readI32()) value = r.readString();
		}
	} else if (ht === -1) {
		if (m.dataSize > 5 && r.readI32()) value = r.readString();
	} else {
		value = `<TextProperty historyType=${ht}>`;
	}
	r.pos = start + m.dataSize;
	return { type: "TextProperty", value };
}

function readObjectProperty(r) {
	const m = readPropertyMeta(r);
	if (m.dataSize === 0) return { type: "ObjectProperty", value: null };
	const v = r.readString();
	return { type: "ObjectProperty", value: v || null };
}

function readSoftObjectProperty(r) {
	const m = readPropertyMeta(r);
	const start = r.pos;
	const assetPath = r.readString();
	const subPath = r.readString();
	r.pos = start + m.dataSize;
	return { type: "SoftObjectProperty", value: { assetPath, subPath } };
}

function readByteProperty(r) {
	const enumType = r.readFName();
	const m = readPropertyMeta(r);
	if (enumType.name === "None") {
		return { type: "ByteProperty", value: r.readU8(), _meta: { enumType } };
	}
	return { type: "ByteProperty", enumType: enumType.name, value: r.readString(), _meta: { enumType } };
}

function readEnumProperty(r) {
	const enumTypeName = r.readFName();
	const enumModule = r.readFName();
	const underlyingType = r.readFName();
	const m = readPropertyMeta(r);
	const _meta = { enumTypeName, enumModule, underlyingType };
	if (m.dataSize === 0) return { type: "EnumProperty", enumType: enumTypeName.name, value: null, _meta };
	return { type: "EnumProperty", enumType: enumTypeName.name, value: r.readString(), _meta };
}

function readArrayProperty(r, ver) {
	const innerTypeFName = r.readFName();
	const innerType = innerTypeFName.name;

	let structMeta = null;
	if (innerType === "StructProperty") {
		structMeta = { structName: r.readFName(), structModule: r.readFName() };
	}

	const m = readPropertyMeta(r);
	const count = r.readU32();
	const _meta = { innerTypeFName, structMeta };

	if (count === 0) return { type: "ArrayProperty", innerType, value: [], _meta };

	const elements = [];
	if (innerType === "StructProperty") {
		for (let i = 0; i < count; i++) elements.push(readPropertyList(r, ver));
	} else if (innerType === "ObjectProperty" || innerType === "SoftObjectProperty" || innerType === "StrProperty" || innerType === "NameProperty" || innerType === "EnumProperty") {
		for (let i = 0; i < count; i++) elements.push(r.readString());
	} else if (innerType === "IntProperty") {
		for (let i = 0; i < count; i++) elements.push(r.readI32());
	} else if (innerType === "UInt32Property") {
		for (let i = 0; i < count; i++) elements.push(r.readU32());
	} else if (innerType === "Int64Property") {
		for (let i = 0; i < count; i++) elements.push(r.readI64().toString());
	} else if (innerType === "UInt64Property") {
		for (let i = 0; i < count; i++) elements.push(r.readU64().toString());
	} else if (innerType === "FloatProperty") {
		for (let i = 0; i < count; i++) elements.push(r.readF32());
	} else if (innerType === "DoubleProperty") {
		for (let i = 0; i < count; i++) elements.push(r.readF64());
	} else if (innerType === "BoolProperty") {
		for (let i = 0; i < count; i++) elements.push(r.readU8() !== 0);
	} else if (innerType === "ByteProperty") {
		for (let i = 0; i < count; i++) elements.push(r.readU8());
	} else {
		const remaining = m.dataSize - 4;
		if (remaining > 0) r.pos += remaining;
		return { type: "ArrayProperty", innerType,
			value: `<unsupported inner type, ${count} elements, ${m.dataSize} bytes>`, _meta };
	}
	return { type: "ArrayProperty", innerType, value: elements, _meta };
}

function readStructProperty(r, ver) {
	const structTypeFName = r.readFName();
	const structModuleFName = r.readFName();
	const structType = structTypeFName.name;
	const _meta = { structTypeFName, structModuleFName };

	const m = readPropertyMeta(r);
	const start = r.pos;
	let value;

	switch (structType) {
		case "Vector":
			value = { x: r.readF64(), y: r.readF64(), z: r.readF64() };
			break;
		case "Rotator":
			value = { pitch: r.readF64(), yaw: r.readF64(), roll: r.readF64() };
			break;
		case "Quat":
			value = { x: r.readF64(), y: r.readF64(), z: r.readF64(), w: r.readF64() };
			break;
		case "LinearColor":
			value = { r: r.readF32(), g: r.readF32(), b: r.readF32(), a: r.readF32() };
			break;
		case "Color":
			value = { b: r.readU8(), g: r.readU8(), r: r.readU8(), a: r.readU8() };
			break;
		case "IntPoint":
			value = { x: r.readI32(), y: r.readI32() };
			break;
		case "IntVector":
			value = { x: r.readI32(), y: r.readI32(), z: r.readI32() };
			break;
		case "Vector2D":
			value = { x: r.readF64(), y: r.readF64() };
			break;
		case "Box":
			value = { min: { x: r.readF64(), y: r.readF64(), z: r.readF64() }, max: { x: r.readF64(), y: r.readF64(), z: r.readF64() } };
			break;
		case "Guid":
			value = r.readGuidStr();
			break;
		case "DateTime": case "Timespan":
			value = r.readI64().toString();
			break;
		case "SoftClassPath": case "SoftObjectPath":
			value = r.readString();
			break;
		default:
			value = m.dataSize > 0 ? readPropertyList(r, ver) : {};
			break;
	}

	// Ensure we consumed exactly dataSize bytes for native struct types
	if (r.pos - start < m.dataSize) r.pos = start + m.dataSize;

	return { type: "StructProperty", structType, value, _meta };
}

function readMapProperty(r, ver) {
	const keyTypeFName = r.readFName();
	const valueTypeFName = r.readFName();
	const keyType = keyTypeFName.name;
	const valueType = valueTypeFName.name;

	readPropertyMeta(r);
	const removedCount = r.readU32();
	const count = r.readU32();
	const entries = [];
	for (let i = 0; i < count; i++) {
		entries.push({
			key: readMapElement(r, keyType, ver),
			value: readMapElement(r, valueType, ver),
		});
	}
	return { type: "MapProperty", keyType, valueType, value: entries,
		_meta: { keyTypeFName, valueTypeFName } };
}

function readMapElement(r, typeName, ver) {
	switch (typeName) {
		case "IntProperty":    
			return r.readI32();
		case "UInt32Property": 
			return r.readU32();
		case "Int64Property":  
			return r.readI64().toString();
		case "UInt64Property": 
			return r.readU64().toString();
		case "FloatProperty":  
			return r.readF32();
		case "DoubleProperty": 
			return r.readF64();
		case "BoolProperty":   
			return r.readU8() !== 0;
		case "StrProperty":
		case "NameProperty":
		case "ObjectProperty":
		case "EnumProperty":
			return r.readString();
		case "StructProperty":
			return readPropertyList(r, ver);
		default:
			throw new Error(`Unsupported map element type "${typeName}" at 0x${r.pos.toString(16)}`);
	}
}

function readSetProperty(r, ver) {
	const innerTypeFName = r.readFName();
	const innerType = innerTypeFName.name;
	readPropertyMeta(r);
	const removedCount = r.readU32();
	const count = r.readU32();
	const elements = [];
	for (let i = 0; i < count; i++) elements.push(readMapElement(r, innerType, ver));
	return { type: "SetProperty", innerType, value: elements, _meta: { innerTypeFName } };
}
