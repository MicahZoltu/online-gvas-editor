// data-transform.js - Conversion between parser output and UI model

import { NATIVE_STRUCT_TYPES, NATIVE_STRUCT_FIELDS } from './types.js';

export function isPrimitiveType(type) {
	const primitiveTypes = [
		'BoolProperty',
		'IntProperty', 'UInt32Property', 'Int64Property', 'UInt64Property',
		'FloatProperty', 'DoubleProperty',
		'StrProperty', 'NameProperty', 'TextProperty',
		'ByteProperty',
		'EnumProperty',
		'ObjectProperty',
		'SoftObjectProperty'
	];
	return primitiveTypes.includes(type);
}

export function convertParsedToUI(parsed) {
	const header = parsed.header;

	const children = Object.entries(parsed.properties).map(([name, prop]) => {
		if (Array.isArray(prop)) {
			return prop.map(p => buildTreeNode(name, p, name));
		}
		return buildTreeNode(name, prop, name);
	}).flat();

	return {
		header: {
			magic: 'GVAS',
			saveGameVersion: header.saveGameVersion,
			packageVersion: header.packageFileVersion,
			packageVersionUE5: header.packageFileUE5Version || 0,
			engineVersion: `${header.engineVersion.major}.${header.engineVersion.minor}.${header.engineVersion.patch}`,
			engineBranch: header.engineVersion.branch,
			engineChangelist: header.engineVersion.changelist,
			customFormatVersion: header.customFormatVersion,
			customVersions: parsed.customVersions || [],
			saveGameClass: header.saveGameClassName
		},
		children: children,
		_raw: parsed
	};
}

function buildTreeNode(name, prop, path) {
	const node = {
		name: name,
		type: prop.type,
		value: prop.value,
		path: path,
		isLeaf: isPrimitiveType(prop.type),
		expanded: false
	};

	if (prop.innerType) node.innerType = prop.innerType;
	if (prop.structType) node.structType = prop.structType;
	if (prop.keyType) node.keyType = prop.keyType;
	if (prop.valueType) node.valueType = prop.valueType;
	if (prop.enumType) node.enumType = prop.enumType;
	if (prop._meta) node._meta = prop._meta;

	if (prop.type === 'ArrayProperty' && prop.innerType === 'StructProperty' && prop._meta?.structMeta?.structName) {
		node.structType = prop._meta.structMeta.structName.name;
	}

	if (!node.isLeaf) {
		if (prop.type === 'StructProperty') {
			node.children = getStructChildren(node);
		} else if (prop.type === 'ArrayProperty') {
			node.children = getArrayChildren(node);
		} else if (prop.type === 'MapProperty') {
			node.children = getMapChildren(node);
		} else if (prop.type === 'SetProperty') {
			node.children = getSetChildren(node);
		}
	}

	return node;
}

function getStructChildren(structNode) {
	const value = structNode.value;
	const structType = structNode.structType;

	if (NATIVE_STRUCT_TYPES.has(structType)) {
		const fields = NATIVE_STRUCT_FIELDS[structType];
		return fields.map(field => {
			const fieldValue = value[field.name];
			const node = {
				name: field.name,
				type: field.type,
				value: fieldValue,
				path: `${structNode.path}.${field.name}`,
				isLeaf: isPrimitiveType(field.type),
				expanded: false
			};
			if (field.structType) node.structType = field.structType;

			if (!node.isLeaf && field.structType) {
				node.children = getStructChildren({
					type: 'StructProperty',
					structType: field.structType,
					value: fieldValue,
					path: `${structNode.path}.${field.name}`
				});
			}
			return node;
		});
	}

	if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
		return Object.entries(value).map(([fieldName, fieldValue]) => {
			const node = {
				name: fieldName,
				type: fieldValue.type,
				value: fieldValue.value,
				path: `${structNode.path}.${fieldName}`,
				isLeaf: isPrimitiveType(fieldValue.type),
				expanded: false,
				_meta: fieldValue._meta
			};

			if (fieldValue.structType) node.structType = fieldValue.structType;
			if (fieldValue.innerType) node.innerType = fieldValue.innerType;
			if (fieldValue.keyType) node.keyType = fieldValue.keyType;
			if (fieldValue.valueType) node.valueType = fieldValue.valueType;
			if (fieldValue.enumType) node.enumType = fieldValue.enumType;

			if (!node.isLeaf) {
				if (fieldValue.type === 'StructProperty') {
					node.children = getStructChildren({
						type: 'StructProperty',
						structType: fieldValue.structType,
						value: fieldValue.value,
						path: `${structNode.path}.${fieldName}`,
						_meta: fieldValue._meta
					});
				} else if (fieldValue.type === 'ArrayProperty') {
					node.children = getArrayChildren({
						type: 'ArrayProperty',
						innerType: fieldValue.innerType,
						value: fieldValue.value,
						path: `${structNode.path}.${fieldName}`,
						_meta: fieldValue._meta
					});
				} else if (fieldValue.type === 'MapProperty') {
					node.children = getMapChildren({
						type: 'MapProperty',
						keyType: fieldValue.keyType,
						valueType: fieldValue.valueType,
						value: fieldValue.value,
						path: `${structNode.path}.${fieldName}`,
						_meta: fieldValue._meta
					});
				} else if (fieldValue.type === 'SetProperty') {
					node.children = getSetChildren({
						type: 'SetProperty',
						innerType: fieldValue.innerType,
						value: fieldValue.value,
						path: `${structNode.path}.${fieldName}`,
						_meta: fieldValue._meta
					});
				}
			}

			return node;
		});
	}

	return [];
}

function getArrayChildren(arrayNode) {
	const { value, innerType, _meta, structType } = arrayNode;

	if (innerType === 'StructProperty' && structType === 'EnhancedActionKeyMapping') {
		return (value || []).map((item, index) => {
			const path = `${arrayNode.path}[${index}]`;
			const actionPath = item.Action?.value || `Mapping ${index}`;
			const actionName = actionPath.split('/').pop() || `Mapping ${index}`;
			const keyName = item.Key?.value?.KeyName?.value || 'Unbound';

			return {
				name: actionName,
				displayName: `${actionName} (${keyName})`,
				type: 'StructProperty',
				structType: 'EnhancedActionKeyMapping',
				value: item,
				path: path,
				isLeaf: true,
				expanded: false,
				_meta: item._meta || _meta?.structMeta,
				_keyMappingIndex: index
			};
		});
	}

	return (value || []).map((item, index) => {
		const path = `${arrayNode.path}[${index}]`;

		if (innerType === 'StructProperty') {
			const node = {
				name: `[${index}]`,
				type: 'StructProperty',
				structType: item.structType || null,
				value: item,
				path: path,
				isLeaf: false,
				expanded: false,
				_meta: item._meta || _meta?.structMeta
			};
			node.children = getStructChildren(node);
			return node;
		} else {
			return {
				name: `[${index}]`,
				type: innerType,
				value: item,
				path: path,
				isLeaf: true
			};
		}
	});
}

function getMapChildren(mapNode) {
	const { value, keyType, valueType, _meta } = mapNode;

	return (value || []).map((entry, index) => {
		const keyPath = `${mapNode.path}["${entry.key}"]`;
		const isValueComplex = !isPrimitiveType(valueType);

		const node = {
			name: String(entry.key),
			type: valueType,
			value: entry.value,
			path: keyPath,
			isLeaf: !isValueComplex,
			expanded: false,
			_meta: _meta
		};

		if (isValueComplex) {
			if (valueType === 'StructProperty') {
				node.structType = _meta?.valueStructType;
				node.children = getStructChildren({
					type: 'StructProperty',
					structType: _meta?.valueStructType,
					value: entry.value,
					path: keyPath,
					_meta: _meta
				});
			} else if (valueType === 'ArrayProperty') {
				node.innerType = _meta?.valueInnerType;
				node.children = getArrayChildren({
					type: 'ArrayProperty',
					innerType: _meta?.valueInnerType,
					value: entry.value,
					path: keyPath,
					_meta: _meta
				});
			} else if (valueType === 'MapProperty') {
				node.keyType = _meta?.valueKeyType;
				node.valueType = _meta?.valueValueType;
				node.children = getMapChildren({
					type: 'MapProperty',
					keyType: _meta?.valueKeyType,
					valueType: _meta?.valueValueType,
					value: entry.value,
					path: keyPath,
					_meta: _meta
				});
			} else if (valueType === 'SetProperty') {
				node.innerType = _meta?.valueInnerType;
				node.children = getSetChildren({
					type: 'SetProperty',
					innerType: _meta?.valueInnerType,
					value: entry.value,
					path: keyPath,
					_meta: _meta
				});
			}
		}

		return node;
	});
}

function getSetChildren(setNode) {
	const { value, innerType, _meta } = setNode;

	return (value || []).map((item, index) => {
		const path = `${setNode.path}[${index}]`;

		if (innerType === 'StructProperty') {
			const node = {
				name: `[${index}]`,
				type: 'StructProperty',
				structType: item.structType || null,
				value: item,
				path: path,
				isLeaf: false,
				expanded: false,
				_meta: item._meta || _meta
			};
			node.children = getStructChildren(node);
			return node;
		} else {
			return {
				name: `[${index}]`,
				type: innerType,
				value: item,
				path: path,
				isLeaf: true
			};
		}
	});
}

export function deepClone(obj) {
	return JSON.parse(JSON.stringify(obj));
}

export function parsePath(path) {
	const parts = [];
	let current = '';
	let i = 0;

	while (i < path.length) {
		const char = path[i];

		if (char === '[') {
			if (current) parts.push(current);
			current = '';

			const closeBracket = path.indexOf(']', i);
			const indexStr = path.substring(i + 1, closeBracket);

			if (indexStr.startsWith('"') && indexStr.endsWith('"')) {
				parts.push(indexStr.slice(1, -1));
			} else {
				parts.push(parseInt(indexStr, 10));
			}

			i = closeBracket + 1;

			if (i < path.length && path[i] === '.') i++;
		} else if (char === '.') {
			if (current) parts.push(current);
			current = '';
			i++;
		} else {
			current += char;
			i++;
		}
	}

	if (current) parts.push(current);
	return parts;
}

export function getPropertyByPath(treeData, path) {
	if (!path) return null;

	const parts = parsePath(path);

	if (parts.length === 0) return null;

	let current = treeData.children?.find(child => child.name === parts[0]);
	if (!current) return null;

	for (let i = 1; i < parts.length; i++) {
		const part = parts[i];
		if (!current.children) return null;

		current = findChildByPathSegment(current, part);
		if (!current) return null;
	}

	return current;
}

function findChildByPathSegment(node, segment) {
	if (!node.children) return null;

	return node.children.find(child => {
		if (typeof segment === 'number') {
			if (node.structType === 'EnhancedActionKeyMapping') {
				return child._keyMappingIndex === segment;
			}
			return child.name === `[${segment}]`;
		} else {
			return child.name === segment;
		}
	});
}

export function convertUItoSerialized(uiData) {
	const header = uiData.header;
	const properties = treeToFlatProperties(uiData);

	return {
		header: {
			saveGameVersion: header.saveGameVersion,
			packageFileVersion: header.packageVersion,
			packageFileUE5Version: header.packageVersionUE5 || 0,
			engineVersion: parseEngineVersion(header.engineVersion, header.engineBranch, header.engineChangelist),
			customFormatVersion: header.customFormatVersion || 0,
			saveGameClassName: header.saveGameClass
		},
		customVersions: header.customVersions || [],
		properties: properties
	};
}

function parseEngineVersion(versionStr, branch, changelist) {
	const parts = versionStr.split('.');
	return {
		major: parseInt(parts[0] || '5', 10),
		minor: parseInt(parts[1] || '3', 10),
		patch: parseInt(parts[2] || '0', 10),
		changelist: changelist || 0,
		branch: branch || ''
	};
}

function treeToFlatProperties(uiData) {
	const properties = {};

	if (!uiData.children) return properties;

	uiData.children.forEach(child => {
		properties[child.name] = extractPropertyValue(child);
	});

	return properties;
}

function extractPropertyValue(node) {
	const result = { type: node.type, value: node.value };

	if (node.innerType) result.innerType = node.innerType;
	if (node.structType) result.structType = node.structType;
	if (node.keyType) result.keyType = node.keyType;
	if (node.valueType) result.valueType = node.valueType;
	if (node.enumType) result.enumType = node.enumType;
	if (node._meta) result._meta = node._meta;

	if (!node.isLeaf && node.children) {
		if (node.type === 'ArrayProperty') {
			result.value = node.children.map(child => {
				if (child.isLeaf) {
					return child.value;
				} else {
					return extractPropertyValue(child);
				}
			});
		} else if (node.type === 'StructProperty') {
			const structValue = {};
			node.children.forEach(child => {
				if (child.isLeaf) {
					structValue[child.name] = { type: child.type, value: child.value };
				} else {
					structValue[child.name] = extractPropertyValue(child);
				}
			});
			result.value = structValue;
		} else if (node.type === 'MapProperty') {
			result.value = node.children.map(child => {
				return {
					key: child.name,
					value: child.isLeaf ? child.value : extractPropertyValue(child).value
				};
			});
		} else if (node.type === 'SetProperty') {
			result.value = node.children.map(child => {
				if (child.isLeaf) {
					return child.value;
				} else {
					return extractPropertyValue(child);
				}
			});
		}
	}

	return result;
}
