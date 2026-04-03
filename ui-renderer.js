// ui-renderer.js - Tree and detail panel rendering

import {
	showComplexTypeInfo,
	renderBoolEditor,
	renderNumberEditor,
	renderStringEditor,
	renderByteEditor,
	renderEnumEditor,
	renderObjectEditor,
	renderGenericEditor,
	renderKeyMappingEditor
} from './property-editors.js';

export function renderHeaderInfo(treeData, headerInfoEl) {
	headerInfoEl.style.display = 'block';
	const h = treeData.header;
	document.getElementById('headerMagic').textContent = h.magic;
	document.getElementById('headerSaveVersion').textContent = h.saveGameVersion;
	document.getElementById('headerPackageVersion').textContent = h.packageVersion;
	document.getElementById('headerEngineVersion').textContent = h.engineVersion;
	document.getElementById('headerSaveClass').textContent = h.saveGameClass;
}

export function renderTree(treeData, propertyTreeEl) {
	propertyTreeEl.innerHTML = '';

	if (treeData && treeData.children) {
		treeData.children.forEach(child => {
			renderTreeNode(child, propertyTreeEl, 0);
		});
	}
}

function renderTreeNode(node, container, depth) {
	const li = document.createElement('li');

	const item = createTreeItem(node);

	li.appendChild(item);

	if (!node.isLeaf && node.children) {
		const childrenUl = document.createElement('ul');
		childrenUl.className = 'tree-children';
		childrenUl.style.display = node.expanded ? 'block' : 'none';

		node.children.forEach(child => {
			renderTreeNode(child, childrenUl, depth + 1);
		});

		li.appendChild(childrenUl);
	}

	container.appendChild(li);
}

function createTreeItem(node) {
	const item = document.createElement('div');
	item.className = 'property-item';
	item.dataset.path = node.path;
	item.dataset.type = node.type;

	const toggle = document.createElement('span');
	toggle.className = 'expand-toggle' + (node.isLeaf ? ' leaf' : '');
	if (!node.isLeaf && node.expanded) {
		toggle.classList.add('expanded');
	}
	toggle.textContent = '▶';

	const typeIcon = document.createElement('span');
	typeIcon.className = 'type-icon';
	typeIcon.textContent = getTypeIcon(node.type);

	const name = document.createElement('span');
	name.className = 'name';
	name.textContent = node.name;

	const valuePreview = document.createElement('span');
	valuePreview.className = 'value-preview';
	valuePreview.textContent = previewValue(node);

	item.appendChild(toggle);
	item.appendChild(typeIcon);
	item.appendChild(name);
	item.appendChild(valuePreview);

	return item;
}

function getTypeIcon(type) {
	const icons = {
		'BoolProperty': '?',
		'IntProperty': '#',
		'Int64Property': '#',
		'UInt32Property': '#',
		'UInt64Property': '#',
		'FloatProperty': '~',
		'DoubleProperty': '~',
		'StrProperty': 'A',
		'NameProperty': 'N',
		'TextProperty': 'A',
		'ByteProperty': 'B',
		'EnumProperty': 'E',
		'ArrayProperty': '📋',
		'MapProperty': '🗺️',
		'SetProperty': '🔢',
		'StructProperty': '📦',
		'ObjectProperty': 'O',
		'SoftObjectProperty': 'O'
	};
	return icons[type] || '?';
}

function previewValue(node) {
	if (node.isLeaf) {
		if (node.type === 'StructProperty' && node.structType === 'EnhancedActionKeyMapping') {
			const keyName = node.value?.Key?.value?.KeyName?.value || 'Unbound';
			return keyName;
		}
		if (node.type === 'BoolProperty') {
			return node.value ? 'true' : 'false';
		} else if (typeof node.value === 'string') {
			return node.value.length > 20 ? node.value.substring(0, 20) + '...' : node.value;
		} else {
			return String(node.value);
		}
	} else {
		if (node.type === 'ArrayProperty') {
			return `Array[${node.children.length}]`;
		} else if (node.type === 'MapProperty') {
			return `Map[${node.children.length}]`;
		} else if (node.type === 'SetProperty') {
			return `Set[${node.children.length}]`;
		} else if (node.type === 'StructProperty') {
			return `Struct[${node.structType}]`;
		}
	}
	return '';
}

export function handleNodeClick(node, propertyTreeEl, onSelect) {
	if (!node.isLeaf) {
		node.expanded = !node.expanded;

		const item = document.querySelector(`.property-item[data-path="${CSS.escape(node.path)}"]`);
		if (item) {
			const toggle = item.querySelector('.expand-toggle');
			if (toggle) {
				toggle.classList.toggle('expanded', node.expanded);
			}

			const li = item.parentElement;
			const childrenUl = li.querySelector('.tree-children');
			if (childrenUl) {
				childrenUl.style.display = node.expanded ? 'block' : 'none';
			}
		}
	}

	onSelect(node.path);
}

export function selectProperty(path, propertyTreeEl, emptyStateEl, propertyDetailEl, detailNameEl, detailMetaEl, detailContentEl, treeData, onUpdate) {
	document.querySelectorAll('.property-item').forEach(item => {
		item.classList.toggle('selected', item.dataset.path === path);
	});

	emptyStateEl.style.display = 'none';
	propertyDetailEl.classList.add('active');

	renderPropertyDetail(path, treeData, detailNameEl, detailMetaEl, detailContentEl, onUpdate);
}

function renderPropertyDetail(path, treeData, detailNameEl, detailMetaEl, detailContentEl, onUpdate) {
	const node = getPropertyByPath(treeData, path);

	if (!node) {
		return;
	}

	detailNameEl.textContent = node.name;
	detailMetaEl.textContent = `${node.type}${node.structType ? ` (${node.structType})` : ''}`;

	detailContentEl.innerHTML = '';

	if (node.type === 'StructProperty' && node.structType === 'EnhancedActionKeyMapping') {
		renderKeyMappingEditor(node, detailContentEl, onUpdate);
		return;
	}

	if (!node.isLeaf) {
		showComplexTypeInfo(node, detailContentEl);
		return;
	}

	if (node.type === 'BoolProperty') {
		renderBoolEditor(node, detailContentEl, onUpdate);
	} else if (node.type === 'IntProperty' || node.type === 'Int64Property' || node.type === 'UInt32Property' || node.type === 'UInt64Property') {
		renderNumberEditor(node, detailContentEl, 'number', onUpdate);
	} else if (node.type === 'FloatProperty' || node.type === 'DoubleProperty') {
		renderNumberEditor(node, detailContentEl, 'float', onUpdate);
	} else if (node.type === 'StrProperty' || node.type === 'NameProperty' || node.type === 'TextProperty') {
		renderStringEditor(node, detailContentEl, onUpdate);
	} else if (node.type === 'ByteProperty') {
		renderByteEditor(node, detailContentEl, onUpdate);
	} else if (node.type === 'EnumProperty') {
		renderEnumEditor(node, detailContentEl, onUpdate);
	} else if (node.type === 'ObjectProperty' || node.type === 'SoftObjectProperty') {
		renderObjectEditor(node, detailContentEl, onUpdate);
	} else {
		renderGenericEditor(node, detailContentEl, onUpdate);
	}
}

function getPropertyByPath(treeData, path) {
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

function parsePath(path) {
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

export function updateTreeItemPreview(path, treeData) {
	const item = document.querySelector(`.property-item[data-path="${CSS.escape(path)}"]`);
	if (item) {
		const node = getPropertyByPath(treeData, path);
		const previewEl = item.querySelector('.value-preview');
		if (previewEl && node) {
			previewEl.textContent = previewValue(node);
		}
	}
}
