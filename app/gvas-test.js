import { readFileSync } from "fs";
import { parseGvas } from "./gvas-parser.js";
import { serializeGvas } from "./gvas-serializer.js";

const filePath = "GameSetting.sav";
// readFileSync returns a Node Buffer; copy into a plain Uint8Array so the
// parser receives exactly the type it advertises support for.
const original = new Uint8Array(readFileSync(filePath));

console.log(`Read ${original.length} bytes from ${filePath}`);

// Parse
const parsed = parseGvas(original);
console.log("Parsed OK");

// Serialize
const reserialized = serializeGvas(parsed);
console.log(`Serialized to ${reserialized.length} bytes`);

// Compare
if (original.length !== reserialized.length) {
	console.error(`FAIL: length mismatch — original ${original.length}, reserialized ${reserialized.length}`);

	// Find first diff
	const minLen = Math.min(original.length, reserialized.length);
	for (let i = 0; i < minLen; i++) {
		if (original[i] !== reserialized[i]) {
			console.error(`  first byte diff at offset 0x${i.toString(16)} (${i}): original=0x${original[i].toString(16).padStart(2, "0")} reserialized=0x${reserialized[i].toString(16).padStart(2, "0")}`);
			// Show context
			const ctxStart = Math.max(0, i - 8);
			const ctxEnd = Math.min(minLen, i + 24);
			const origHex = [...original.slice(ctxStart, ctxEnd)]
				.map((b, j) => ctxStart + j === i ? `[${b.toString(16).padStart(2, "0")}]` : b.toString(16).padStart(2, "0"))
				.join(" ");
			const reserHex = [...reserialized.slice(ctxStart, ctxEnd)]
				.map((b, j) => ctxStart + j === i ? `[${b.toString(16).padStart(2, "0")}]` : b.toString(16).padStart(2, "0"))
				.join(" ");
			console.error(`  original:     ${origHex}`);
			console.error(`  reserialized: ${reserHex}`);
			break;
		}
	}
	process.exit(1);
}

let diffCount = 0;
let firstDiff = -1;
for (let i = 0; i < original.length; i++) {
	if (original[i] !== reserialized[i]) {
		if (firstDiff === -1) firstDiff = i;
		diffCount++;
	}
}

if (diffCount > 0) {
	console.error(`FAIL: ${diffCount} byte(s) differ`);
	const i = firstDiff;
	console.error(`  first diff at offset 0x${i.toString(16)} (${i}): original=0x${original[i].toString(16).padStart(2, "0")} reserialized=0x${reserialized[i].toString(16).padStart(2, "0")}`);
	const ctxStart = Math.max(0, i - 8);
	const ctxEnd = Math.min(original.length, i + 24);
	const origHex = [...original.slice(ctxStart, ctxEnd)]
		.map((b, j) => ctxStart + j === i ? `[${b.toString(16).padStart(2, "0")}]` : b.toString(16).padStart(2, "0"))
		.join(" ");
	const reserHex = [...reserialized.slice(ctxStart, ctxEnd)]
		.map((b, j) => ctxStart + j === i ? `[${b.toString(16).padStart(2, "0")}]` : b.toString(16).padStart(2, "0"))
		.join(" ");
	console.error(`  original:     ${origHex}`);
	console.error(`  reserialized: ${reserHex}`);

	// Show ASCII context around the diff
	const asciiStart = Math.max(0, i - 32);
	const asciiEnd = Math.min(original.length, i + 32);
	const toAscii = (buf) => [...buf.slice(asciiStart, asciiEnd)]
		.map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : "."))
		.join("");
	console.error(`  original ascii: ${toAscii(original)}`);
	console.error(`  reser    ascii: ${toAscii(reserialized)}`);
	process.exit(1);
}

console.log("PASS: round-trip produces identical bytes");
