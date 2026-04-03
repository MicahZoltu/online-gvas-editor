// GVAS (Unreal Engine Save Game) Serializer
// Produces a Uint8Array from a data structure matching the output of parseGvas.
// Supports GVAS format version 3 (UE 5.5+ / UE 5.6) and older versions (1, 2).
// No external imports — works in both browser and Node.js.

// ---------------------------------------------------------------------------
// GvasWriter — growable little-endian binary buffer
// ---------------------------------------------------------------------------

class GvasWriter {
	constructor(initialCapacity = 4096) {
		this._buf = new ArrayBuffer(initialCapacity);
		this._view = new DataView(this._buf);
		this._u8 = new Uint8Array(this._buf);
		this._pos = 0;
	}

	// Ensure there's room for `n` more bytes, growing geometrically if needed.
	_ensure(n) {
		const needed = this._pos + n;
		if (needed <= this._buf.byteLength) return;
		let newCap = this._buf.byteLength;
		while (newCap < needed) newCap *= 2;
		const next = new ArrayBuffer(newCap);
		new Uint8Array(next).set(this._u8);
		this._buf = next;
		this._view = new DataView(this._buf);
		this._u8 = new Uint8Array(this._buf);
	}

	get pos() {
		return this._pos;
	}

	// Return a tightly-sized Uint8Array of everything written so far.
	toUint8Array() {
		return new Uint8Array(this._buf, 0, this._pos);
	}

	writeU8(v) {
		this._ensure(1);
		this._u8[this._pos++] = v & 0xff;
	}

	writeU16(v) {
		this._ensure(2);
		this._view.setUint16(this._pos, v, true);
		this._pos += 2;
	}

	writeI32(v) {
		this._ensure(4);
		this._view.setInt32(this._pos, v, true);
		this._pos += 4;
	}

	writeU32(v) {
		this._ensure(4);
		this._view.setUint32(this._pos, v >>> 0, true);
		this._pos += 4;
	}

	writeI64(v) {
		const big = typeof v === "bigint" ? v : BigInt(v);
		this._ensure(8);
		this._view.setBigInt64(this._pos, big, true);
		this._pos += 8;
	}

	writeU64(v) {
		const big = typeof v === "bigint" ? v : BigInt(v);
		this._ensure(8);
		this._view.setBigUint64(this._pos, big, true);
		this._pos += 8;
	}

	writeF32(v) {
		this._ensure(4);
		this._view.setFloat32(this._pos, v, true);
		this._pos += 4;
	}

	writeF64(v) {
		this._ensure(8);
		this._view.setFloat64(this._pos, v, true);
		this._pos += 8;
	}

	writeBytes(uint8arr) {
		const n = uint8arr.length;
		this._ensure(n);
		this._u8.set(uint8arr, this._pos);
		this._pos += n;
	}

	// Write a length-prefixed UTF-8 string (i32 length including null terminator,
	// then the bytes, then a 0x00 terminator).  An empty string writes i32(0).
	writeString(s) {
		if (s === "" || s == null) {
			this.writeI32(0);
			return;
		}
		const encoded = encodeUTF8(s);
		const len = encoded.length + 1; // +1 for null terminator
		this.writeI32(len);
		this.writeBytes(encoded);
		this.writeU8(0); // null terminator
	}

	// Write an FName (u32 number + length-prefixed string).
	writeFName(fname) {
		this.writeU32(fname.number);
		this.writeString(fname.name);
	}

	// Write a GUID from a "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" string.
	writeGuidStr(guidStr) {
		const hex = guidStr.replace(/-/g, "");
		const bytes = new Uint8Array(16);
		for (let i = 0; i < 16; i++) {
			bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
		}
		this.writeBytes(bytes);
	}

	// Patch a previously-written u32 at the given absolute offset.
	patchU32(offset, value) {
		this._view.setUint32(offset, value >>> 0, true);
	}
}

// ---------------------------------------------------------------------------
// UTF-8 encoding (TextEncoder is available in all target environments)
// ---------------------------------------------------------------------------

const _utf8Encoder = new TextEncoder();

function encodeUTF8(str) {
	return _utf8Encoder.encode(str);
}

// Compute how many bytes writeString(s) would produce (for DataSize calc).
function stringByteLen(s) {
	if (s === "" || s == null) return 4; // just i32(0)
	return 4 + encodeUTF8(s).length + 1; // i32 + chars + null
}

// ---------------------------------------------------------------------------
// serializeGvas — main entry point
// ---------------------------------------------------------------------------

export function serializeGvas(data) {
	const w = new GvasWriter(65536);
	const h = data.header;

	// --- Magic ---
	w.writeBytes(new Uint8Array([0x47, 0x56, 0x41, 0x53])); // "GVAS"

	// --- Header fields ---
	w.writeU32(h.saveGameVersion);
	w.writeU32(h.packageFileVersion);

	if (h.saveGameVersion >= 3) {
		w.writeU32(h.packageFileUE5Version);
	}

	// Engine version
	const ev = h.engineVersion;
	w.writeU16(ev.major);
	w.writeU16(ev.minor);
	w.writeU16(ev.patch);
	w.writeU32(ev.changelist);
	w.writeString(ev.branch);

	// Custom format data
	w.writeU32(h.customFormatVersion);

	// Custom versions
	const cvs = data.customVersions;
	w.writeU32(cvs.length);
	for (const cv of cvs) {
		w.writeGuidStr(cv.guid);
		w.writeU32(cv.version);
	}

	// Save game class name
	w.writeString(h.saveGameClassName);

	// GVAS v3 padding byte before properties
	if (h.saveGameVersion >= 3) {
		w.writeU8(0);
	}

	// --- Properties ---
	writePropertyList(w, data.properties);

	// Trailing zero u32
	w.writeU32(0);

	return w.toUint8Array();
}

// ---------------------------------------------------------------------------
// Property list / property writers
// ---------------------------------------------------------------------------

function writePropertyList(w, props) {
	for (const name of Object.keys(props)) {
		const raw = props[name];
		// Handle the case where duplicate names were collapsed into an array.
		const entries = Array.isArray(raw) ? raw : [raw];
		for (const prop of entries) {
			w.writeString(name);
			writeProperty(w, prop);
		}
	}
	w.writeString("None");
}

function writeProperty(w, prop) {
	switch (prop.type) {
		case "BoolProperty":
			return writeBoolProperty(w, prop);
		case "IntProperty":
			return writeIntProperty(w, prop);
		case "UInt32Property":
			return writeUInt32Property(w, prop);
		case "Int64Property":
			return writeInt64Property(w, prop);
		case "UInt64Property":
			return writeUInt64Property(w, prop);
		case "FloatProperty":
			return writeFloatProperty(w, prop);
		case "DoubleProperty":
			return writeDoubleProperty(w, prop);
		case "StrProperty":
			return writeStrProperty(w, prop);
		case "NameProperty":
			return writeNameProperty(w, prop);
		case "TextProperty":
			return writeTextProperty(w, prop);
		case "ObjectProperty":
			return writeObjectProperty(w, prop);
		case "SoftObjectProperty":
			return writeSoftObjectProperty(w, prop);
		case "EnumProperty":
			return writeEnumProperty(w, prop);
		case "ByteProperty":
			return writeByteProperty(w, prop);
		case "ArrayProperty":
			return writeArrayProperty(w, prop);
		case "StructProperty":
			return writeStructProperty(w, prop);
		case "MapProperty":
			return writeMapProperty(w, prop);
		case "SetProperty":
			return writeSetProperty(w, prop);
		default:
			throw new Error(`Unknown property type "${prop.type}"`);
	}
}

// Helpers: write the DuplicateIndex(u32), placeholder DataSize(u32), HasPropertyGuid(u8).
// Returns the offset of the DataSize field so it can be patched later.
function writePropertyMetaStart(w, duplicateIndex) {
	w.writeU32(duplicateIndex || 0);
	const sizeOffset = w.pos;
	w.writeU32(0); // placeholder, patched later
	w.writeU8(0);  // hasPropertyGuid = 0 (we don't write GUIDs)
	return sizeOffset;
}

function patchDataSize(w, sizeOffset, dataStart) {
	w.patchU32(sizeOffset, w.pos - dataStart);
}

// ---- Simple properties ----

function writeBoolProperty(w, prop) {
	w.writeString("BoolProperty");
	w.writeU32(0); // duplicateIndex
	w.writeU32(0); // dataSize (always 0 for BoolProperty)
	w.writeU8(prop.value ? 1 : 0); // value stored in header
	w.writeU8(0); // hasPropertyGuid
}

function writeIntProperty(w, prop) {
	w.writeString("IntProperty");
	const sizeOff = writePropertyMetaStart(w);
	const start = w.pos;
	w.writeI32(prop.value);
	patchDataSize(w, sizeOff, start);
}

function writeUInt32Property(w, prop) {
	w.writeString("UInt32Property");
	const sizeOff = writePropertyMetaStart(w);
	const start = w.pos;
	w.writeU32(prop.value);
	patchDataSize(w, sizeOff, start);
}

function writeInt64Property(w, prop) {
	w.writeString("Int64Property");
	const sizeOff = writePropertyMetaStart(w);
	const start = w.pos;
	w.writeI64(prop.value);
	patchDataSize(w, sizeOff, start);
}

function writeUInt64Property(w, prop) {
	w.writeString("UInt64Property");
	const sizeOff = writePropertyMetaStart(w);
	const start = w.pos;
	w.writeU64(prop.value);
	patchDataSize(w, sizeOff, start);
}

function writeFloatProperty(w, prop) {
	w.writeString("FloatProperty");
	const sizeOff = writePropertyMetaStart(w);
	const start = w.pos;
	w.writeF32(prop.value);
	patchDataSize(w, sizeOff, start);
}

function writeDoubleProperty(w, prop) {
	w.writeString("DoubleProperty");
	const sizeOff = writePropertyMetaStart(w);
	const start = w.pos;
	w.writeF64(prop.value);
	patchDataSize(w, sizeOff, start);
}

function writeStrProperty(w, prop) {
	w.writeString("StrProperty");
	const sizeOff = writePropertyMetaStart(w);
	const start = w.pos;
	if (prop.value === "" || prop.value == null) {
		// dataSize stays 0
	} else {
		w.writeString(prop.value);
	}
	patchDataSize(w, sizeOff, start);
}

function writeNameProperty(w, prop) {
	w.writeString("NameProperty");
	const sizeOff = writePropertyMetaStart(w);
	const start = w.pos;
	if (prop.value === "" || prop.value == null) {
		// dataSize stays 0
	} else {
		w.writeString(prop.value);
	}
	patchDataSize(w, sizeOff, start);
}

function writeTextProperty(w, prop) {
	w.writeString("TextProperty");
	const sizeOff = writePropertyMetaStart(w);
	const start = w.pos;
	// Minimal TextProperty: flags=0, historyType=255 (None), hasCultureInvariant=0 or 1
	if (prop._raw) {
		// If the parser stored raw bytes, write them back verbatim.
		w.writeBytes(prop._raw);
	} else {
		// Reconstruct a simple FTextHistory::None with optional CultureInvariant string
		w.writeI32(0); // flags
		w.writeU8(255); // historyType = None
		if (prop.value) {
			w.writeI32(1); // hasCultureInvariant
			w.writeString(prop.value);
		} else {
			w.writeI32(0);
		}
	}
	patchDataSize(w, sizeOff, start);
}

function writeObjectProperty(w, prop) {
	w.writeString("ObjectProperty");
	const sizeOff = writePropertyMetaStart(w);
	const start = w.pos;
	if (prop.value != null && prop.value !== "") {
		w.writeString(prop.value);
	} else {
		// Null object reference: write i32(0)
		w.writeI32(0);
	}
	patchDataSize(w, sizeOff, start);
}

function writeSoftObjectProperty(w, prop) {
	w.writeString("SoftObjectProperty");
	const sizeOff = writePropertyMetaStart(w);
	const start = w.pos;
	const val = prop.value || {};
	w.writeString(val.assetPath || "");
	w.writeString(val.subPath || "");
	patchDataSize(w, sizeOff, start);
}

// ---- Enum / Byte ----

function writeByteProperty(w, prop) {
	w.writeString("ByteProperty");
	// FName enumType
	const meta = prop._meta;
	if (meta && meta.enumType) {
		w.writeFName(meta.enumType);
	} else if (prop.enumType && prop.enumType !== "None") {
		w.writeFName({ number: 0, name: prop.enumType });
	} else {
		w.writeFName({ number: 0, name: "None" });
	}
	const sizeOff = writePropertyMetaStart(w);
	const start = w.pos;
	if (prop.enumType && prop.enumType !== "None") {
		w.writeString(prop.value);
	} else if (typeof prop.value === "string") {
		w.writeString(prop.value);
	} else {
		w.writeU8(prop.value);
	}
	patchDataSize(w, sizeOff, start);
}

function writeEnumProperty(w, prop) {
	w.writeString("EnumProperty");
	const meta = prop._meta;
	if (meta) {
		w.writeFName(meta.enumTypeName);
		w.writeFName(meta.enumModule);
		w.writeFName(meta.underlyingType);
	} else {
		// Fallback: reconstruct plausible FNames
		w.writeFName({ number: 0, name: prop.enumType || "" });
		w.writeFName({ number: 0, name: "" });
		w.writeFName({ number: 0, name: "ByteProperty" });
	}
	const sizeOff = writePropertyMetaStart(w);
	const start = w.pos;
	if (prop.value != null) {
		w.writeString(prop.value);
	}
	patchDataSize(w, sizeOff, start);
}

// ---- Array ----

function writeArrayProperty(w, prop) {
	w.writeString("ArrayProperty");
	const innerType = prop.innerType;
	const meta = prop._meta;

	// FName innerType
	if (meta && meta.innerTypeFName) {
		w.writeFName(meta.innerTypeFName);
	} else {
		w.writeFName({ number: 0, name: innerType });
	}

	// Struct array metadata
	if (innerType === "StructProperty") {
		if (meta && meta.structMeta) {
			w.writeFName(meta.structMeta.structName);
			w.writeFName(meta.structMeta.structModule);
		} else {
			w.writeFName({ number: 0, name: "" });
			w.writeFName({ number: 0, name: "" });
		}
	}

	// DuplicateIndex + DataSize placeholder + HasGuid
	const sizeOff = writePropertyMetaStart(w);
	const start = w.pos;

	const elements = prop.value;
	const count = Array.isArray(elements) ? elements.length : 0;
	w.writeU32(count);

	if (count > 0 && Array.isArray(elements)) {
		if (innerType === "StructProperty") {
			for (const elem of elements) {
				writePropertyList(w, elem);
			}
		} else if (innerType === "ObjectProperty" || innerType === "SoftObjectProperty") {
			for (const elem of elements) w.writeString(elem);
		} else if (innerType === "StrProperty" || innerType === "NameProperty") {
			for (const elem of elements) w.writeString(elem);
		} else if (innerType === "IntProperty") {
			for (const elem of elements) w.writeI32(elem);
		} else if (innerType === "UInt32Property") {
			for (const elem of elements) w.writeU32(elem);
		} else if (innerType === "Int64Property") {
			for (const elem of elements) w.writeI64(elem);
		} else if (innerType === "UInt64Property") {
			for (const elem of elements) w.writeU64(elem);
		} else if (innerType === "FloatProperty") {
			for (const elem of elements) w.writeF32(elem);
		} else if (innerType === "DoubleProperty") {
			for (const elem of elements) w.writeF64(elem);
		} else if (innerType === "BoolProperty") {
			for (const elem of elements) w.writeU8(elem ? 1 : 0);
		} else if (innerType === "ByteProperty") {
			for (const elem of elements) w.writeU8(elem);
		} else if (innerType === "EnumProperty") {
			for (const elem of elements) w.writeString(elem);
		}
	}

	patchDataSize(w, sizeOff, start);
}

// ---- Struct ----

function writeStructProperty(w, prop) {
	w.writeString("StructProperty");
	const structType = prop.structType;
	const meta = prop._meta;

	// FName structType, FName structModule
	if (meta && meta.structTypeFName) {
		w.writeFName(meta.structTypeFName);
	} else {
		w.writeFName({ number: 0, name: structType });
	}
	if (meta && meta.structModuleFName) {
		w.writeFName(meta.structModuleFName);
	} else {
		w.writeFName({ number: 0, name: "" });
	}

	const sizeOff = writePropertyMetaStart(w);
	const start = w.pos;

	const val = prop.value;

	switch (structType) {
		case "Vector":
			w.writeF64(val.x); w.writeF64(val.y); w.writeF64(val.z);
			break;
		case "Rotator":
			w.writeF64(val.pitch); w.writeF64(val.yaw); w.writeF64(val.roll);
			break;
		case "Quat":
			w.writeF64(val.x); w.writeF64(val.y); w.writeF64(val.z); w.writeF64(val.w);
			break;
		case "LinearColor":
			w.writeF32(val.r); w.writeF32(val.g); w.writeF32(val.b); w.writeF32(val.a);
			break;
		case "Color":
			w.writeU8(val.b); w.writeU8(val.g); w.writeU8(val.r); w.writeU8(val.a);
			break;
		case "IntPoint":
			w.writeI32(val.x); w.writeI32(val.y);
			break;
		case "IntVector":
			w.writeI32(val.x); w.writeI32(val.y); w.writeI32(val.z);
			break;
		case "Vector2D":
			w.writeF64(val.x); w.writeF64(val.y);
			break;
		case "Box":
			w.writeF64(val.min.x); w.writeF64(val.min.y); w.writeF64(val.min.z);
			w.writeF64(val.max.x); w.writeF64(val.max.y); w.writeF64(val.max.z);
			break;
		case "Guid":
			w.writeGuidStr(val);
			break;
		case "DateTime":
		case "Timespan":
			w.writeI64(val);
			break;
		case "SoftClassPath":
		case "SoftObjectPath":
			w.writeString(val);
			break;
		default:
			// Generic struct: property list
			writePropertyList(w, val);
			break;
	}

	patchDataSize(w, sizeOff, start);
}

// ---- Map ----

function writeMapProperty(w, prop) {
	w.writeString("MapProperty");
	const meta = prop._meta;
	if (meta && meta.keyTypeFName) {
		w.writeFName(meta.keyTypeFName);
	} else {
		w.writeFName({ number: 0, name: prop.keyType });
	}
	if (meta && meta.valueTypeFName) {
		w.writeFName(meta.valueTypeFName);
	} else {
		w.writeFName({ number: 0, name: prop.valueType });
	}

	const sizeOff = writePropertyMetaStart(w);
	const start = w.pos;

	const entries = prop.value || [];
	w.writeU32(0); // removedCount
	w.writeU32(entries.length);
	for (const entry of entries) {
		writeMapElement(w, entry.key, prop.keyType);
		writeMapElement(w, entry.value, prop.valueType);
	}

	patchDataSize(w, sizeOff, start);
}

function writeMapElement(w, val, typeName) {
	switch (typeName) {
		case "IntProperty":
			w.writeI32(val); break;
		case "UInt32Property":
			w.writeU32(val); break;
		case "Int64Property":
			w.writeI64(val); break;
		case "UInt64Property":
			w.writeU64(val); break;
		case "FloatProperty":
			w.writeF32(val); break;
		case "DoubleProperty":
			w.writeF64(val); break;
		case "StrProperty":
		case "NameProperty":
		case "ObjectProperty":
		case "EnumProperty":
			w.writeString(val); break;
		case "BoolProperty":
			w.writeU8(val ? 1 : 0); break;
		case "StructProperty":
			writePropertyList(w, val); break;
		default:
			throw new Error(`Unsupported map element type "${typeName}"`);
	}
}

// ---- Set ----

function writeSetProperty(w, prop) {
	w.writeString("SetProperty");
	const meta = prop._meta;
	if (meta && meta.innerTypeFName) {
		w.writeFName(meta.innerTypeFName);
	} else {
		w.writeFName({ number: 0, name: prop.innerType });
	}

	const sizeOff = writePropertyMetaStart(w);
	const start = w.pos;

	const elements = prop.value || [];
	w.writeU32(0); // removedCount
	w.writeU32(elements.length);
	for (const elem of elements) {
		writeMapElement(w, elem, prop.innerType);
	}

	patchDataSize(w, sizeOff, start);
}
