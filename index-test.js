// index-test.js - Test file for GVAS Editor
// Run with: bun index-test.js

import { parseGvas } from './gvas-parser.js';
import { serializeGvas } from './gvas-serializer.js';

// Create a sample GVAS file for testing
function createSampleGVAS() {
	const header = {
		saveGameVersion: 3,
		packageFileVersion: 1234,
		packageFileUE5Version: 1234,
		engineVersion: {
			major: 5,
			minor: 3,
			patch: 0,
			changelist: 0,
			branch: '5.3'
		},
		customFormatVersion: 0,
		saveGameClassName: 'MyGame.SaveGame'
	};

	const customVersions = [
		{ guid: '00000000-0000-0000-0000-000000000001', version: 1 }
	];

	const properties = {
		PlayerName: { type: 'StrProperty', value: 'Hero' },
		Score: { type: 'IntProperty', value: 1000 },
		Health: { type: 'FloatProperty', value: 100.0 },
		IsAlive: { type: 'BoolProperty', value: true },
		Level: { type: 'IntProperty', value: 5 },
		Inventory: {
			type: 'ArrayProperty',
			innerType: 'StrProperty',
			value: ['Sword', 'Shield', 'Potion']
		},
		Position: {
			type: 'StructProperty',
			structType: 'Vector',
			value: { x: 100.0, y: 200.0, z: 50.0 }
		},
		Stats: {
			type: 'MapProperty',
			keyType: 'StrProperty',
			valueType: 'IntProperty',
			value: [
				{ key: 'Strength', value: 15 },
				{ key: 'Agility', value: 10 },
				{ key: 'Intelligence', value: 8 }
			]
		},
		MaxHealth: { type: 'Int64Property', value: '999999' },
		DamageDealt: { type: 'UInt64Property', value: '1234567890' },
		Mana: { type: 'DoubleProperty', value: 50.5 },
		CharacterClass: { type: 'NameProperty', value: 'Warrior' },
		Status: { type: 'TextProperty', value: 'Ready for battle' }
	};

	return { header, customVersions, properties };
}

function runTests() {
	console.log('=== GVAS Editor Tests ===\n');

	// Test 1: Create and serialize sample data
	console.log('Test 1: Serialize sample GVAS data');
	const sampleData = createSampleGVAS();
const serialized = serializeGvas(sampleData);
	const parsed = parseGvas(serialized);
	console.log(`✓ Serialized to ${serialized.length} bytes`);
	console.log(`  First 16 bytes: ${Array.from(serialized.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);

	// Test 2: Parse the serialized data
	console.log('\nTest 2: Parse serialized GVAS data');
	console.log('✓ Parsed successfully');
		console.log(`  Save Game Version: ${parsed.header.saveGameVersion}`);
	console.log(`  Engine Version: ${parsed.header.engineVersion.major}.${parsed.header.engineVersion.minor}.${parsed.header.engineVersion.patch}`);
	console.log(`  Save Game Class: ${parsed.header.saveGameClassName}`);
	console.log(`  Properties count: ${Object.keys(parsed.properties).length}`);

	// Test 3: Verify property values
	console.log('\nTest 3: Verify property values');
	const props = parsed.properties;
	let allPassed = true;

	const checks = [
		{ name: 'PlayerName', expected: 'Hero', actual: props.PlayerName?.value },
		{ name: 'Score', expected: 1000, actual: props.Score?.value },
		{ name: 'Health', expected: 100.0, actual: props.Health?.value },
		{ name: 'IsAlive', expected: true, actual: props.IsAlive?.value },
		{ name: 'Level', expected: 5, actual: props.Level?.value },
		{ name: 'Inventory[0]', expected: 'Sword', actual: props.Inventory?.value?.[0] },
		{ name: 'Position.x', expected: 100.0, actual: props.Position?.value?.x },
		{ name: 'Stats.Strength', expected: 15, actual: props.Stats?.value?.find(e => e.key === 'Strength')?.value },
	];

	checks.forEach(check => {
		const passed = check.actual === check.expected;
		console.log(`  ${passed ? '✓' : '✗'} ${check.name}: ${check.actual} ${passed ? '' : `(expected ${check.expected})`}`);
		if (!passed) allPassed = false;
	});

	// Test 4: Round-trip test
	console.log('\nTest 4: Round-trip serialization');
	try {
		const reserialized = serializeGvas(parsed);
		const reparsed = parseGvas(reserialized);
		console.log(`✓ Round-trip successful (${reserialized.length} bytes)`);
	} catch (err) {
		console.log(`✗ Round-trip failed: ${err.message}`);
		allPassed = false;
	}

	// Test 5: Test with different property types
	console.log('\nTest 5: Test various property types');
	const typeChecks = [
		{ name: 'Int64Property', prop: props.MaxHealth, check: p => p?.type === 'Int64Property' && p?.value === '999999' },
		{ name: 'UInt64Property', prop: props.DamageDealt, check: p => p?.type === 'UInt64Property' && p?.value === '1234567890' },
		{ name: 'DoubleProperty', prop: props.Mana, check: p => p?.type === 'DoubleProperty' && Math.abs(p?.value - 50.5) < 0.001 },
		{ name: 'NameProperty', prop: props.CharacterClass, check: p => p?.type === 'NameProperty' && p?.value === 'Warrior' },
		{ name: 'TextProperty', prop: props.Status, check: p => p?.type === 'TextProperty' && p?.value === 'Ready for battle' },
	];

	typeChecks.forEach(tc => {
		const passed = tc.check(tc.prop);
		console.log(`  ${passed ? '✓' : '✗'} ${tc.name}`);
		if (!passed) allPassed = false;
	});

	console.log('\n=== Tests Complete ===');
	return allPassed;
}

// Run tests
	process.exit(runTests() ? 0 : 1);
