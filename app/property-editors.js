// property-editors.js - Editor components for each property type

import { COMMON_KEYS, SETTING_BEHAVIORS, KEY_TO_KEYBOARD_MAP } from './types.js';

export function showComplexTypeInfo(node, container) {
	const info = document.createElement('div');
	info.className = 'complex-type-info';

	let typeDesc = '';
	if (node.type === 'ArrayProperty') {
		typeDesc = `Array of ${node.innerType} (${node.children.length} items)`;
	} else if (node.type === 'MapProperty') {
		typeDesc = `Map ${node.keyType} → ${node.valueType} (${node.children.length} entries)`;
	} else if (node.type === 'SetProperty') {
		typeDesc = `Set of ${node.innerType} (${node.children.length} items)`;
	} else if (node.type === 'StructProperty') {
		typeDesc = `Struct ${node.structType}`;
	}

	info.innerHTML = `
		<p><strong>Type:</strong> ${typeDesc}</p>
		<p class="hint">Expand the node in the tree view to see and edit its contents.</p>
	`;

	container.appendChild(info);
}

export function renderBoolEditor(node, container, onUpdate) {
	const field = document.createElement('div');
	field.className = 'property-field';

	const label = document.createElement('label');
	label.textContent = 'Value';

	const select = document.createElement('select');
	select.value = node.value;
	select.addEventListener('change', (e) => {
		onUpdate(node.path, e.target.value === 'true');
	});

	const trueOption = document.createElement('option');
	trueOption.value = 'true';
	trueOption.textContent = 'true';

	const falseOption = document.createElement('option');
	falseOption.value = 'false';
	falseOption.textContent = 'false';

	select.appendChild(trueOption);
	select.appendChild(falseOption);

	field.appendChild(label);
	field.appendChild(select);
	container.appendChild(field);
}

export function renderNumberEditor(node, container, type, onUpdate) {
	const field = document.createElement('div');
	field.className = 'property-field';

	const label = document.createElement('label');
	label.textContent = 'Value';

	const input = document.createElement('input');
	input.type = 'number';
	input.value = node.value;
	input.step = type === 'float' ? '0.0001' : '1';
	input.addEventListener('change', (e) => {
		const newValue = type === 'float' ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
		onUpdate(node.path, newValue);
	});

	field.appendChild(label);
	field.appendChild(input);
	container.appendChild(field);
}

export function renderStringEditor(node, container, onUpdate) {
	const field = document.createElement('div');
	field.className = 'property-field';

	const label = document.createElement('label');
	label.textContent = 'Value';

	const textarea = document.createElement('textarea');
	textarea.value = node.value || '';
	textarea.addEventListener('change', (e) => {
		onUpdate(node.path, e.target.value);
	});

	field.appendChild(label);
	field.appendChild(textarea);
	container.appendChild(field);
}

export function renderByteEditor(node, container, onUpdate) {
	const field = document.createElement('div');
	field.className = 'property-field';

	const label = document.createElement('label');
	label.textContent = node.enumType && node.enumType !== 'None' ? 'Enum Value' : 'Byte Value';

	if (node.enumType && node.enumType !== 'None') {
		const select = document.createElement('select');
		select.value = node.value;
		select.addEventListener('change', (e) => {
			onUpdate(node.path, e.target.value);
		});

		const option = document.createElement('option');
		option.value = node.value;
		option.textContent = node.value;
		select.appendChild(option);

		field.appendChild(label);
		field.appendChild(select);
	} else {
		const input = document.createElement('input');
		input.type = 'number';
		input.min = '0';
		input.max = '255';
		input.value = node.value;
		input.addEventListener('change', (e) => {
			onUpdate(node.path, parseInt(e.target.value, 10));
		});

		field.appendChild(label);
		field.appendChild(input);
	}

	container.appendChild(field);
}

export function renderEnumEditor(node, container, onUpdate) {
	const field = document.createElement('div');
	field.className = 'property-field';

	const label = document.createElement('label');
	label.textContent = `Enum Value (${node.enumType})`;

	const input = document.createElement('input');
	input.type = 'text';
	input.value = node.value || '';
	input.addEventListener('change', (e) => {
		onUpdate(node.path, e.target.value);
	});

	field.appendChild(label);
	field.appendChild(input);
	container.appendChild(field);
}

export function renderObjectEditor(node, container, onUpdate) {
	const field = document.createElement('div');
	field.className = 'property-field';

	const label = document.createElement('label');
	label.textContent = node.type === 'SoftObjectProperty' ? 'Asset Path' : 'Object Reference';

	const value = node.type === 'SoftObjectProperty' ? (node.value?.assetPath || '') : (node.value || '');

	const input = document.createElement('input');
	input.type = 'text';
	input.value = value;
	input.addEventListener('change', (e) => {
		if (node.type === 'SoftObjectProperty') {
			onUpdate(node.path, { assetPath: e.target.value, subPath: node.value?.subPath || '' });
		} else {
			onUpdate(node.path, e.target.value);
		}
	});

	field.appendChild(label);
	field.appendChild(input);
	container.appendChild(field);
}

export function renderGenericEditor(node, container, onUpdate) {
	const field = document.createElement('div');
	field.className = 'property-field';

	const label = document.createElement('label');
	label.textContent = 'Value (Raw)';

	const textarea = document.createElement('textarea');
	textarea.value = JSON.stringify(node.value, null, 2);
	textarea.addEventListener('change', (e) => {
		try {
			onUpdate(node.path, JSON.parse(e.target.value));
		} catch (err) {
			// Invalid JSON, ignore
		}
	});

	field.appendChild(label);
	field.appendChild(textarea);
	container.appendChild(field);
}

export function renderKeyMappingEditor(node, container, onUpdate) {
	const editor = document.createElement('div');
	editor.className = 'keymapping-editor';

	const data = node.value;
	const actionPath = data.Action?.value || 'Unknown';
	const actionName = actionPath.split('/').pop() || 'Unknown';
	const currentKey = data.Key?.value?.KeyName?.value || 'Unbound';
	const settingBehavior = data.SettingBehavior?.value || 'EPlayerMappableKeySettingBehaviors::InheritSettingsFromAction';

	const actionField = createKeyMappingField('Action (Read-only)', actionPath, true);
	editor.appendChild(actionField);

	const keyField = document.createElement('div');
	keyField.className = 'keymapping-field';

	const keyLabel = document.createElement('label');
	keyLabel.textContent = 'Bound Key';
	keyField.appendChild(keyLabel);

	const keyWrapper = document.createElement('div');
	keyWrapper.className = 'key-binding-wrapper';

	const keySelect = document.createElement('select');
	keySelect.className = 'key-selector';
	COMMON_KEYS.forEach(key => {
		const option = document.createElement('option');
		option.value = key;
		option.textContent = key;
		if (key === currentKey) option.selected = true;
		keySelect.appendChild(option);
	});

	const captureBtn = document.createElement('button');
	captureBtn.className = 'btn btn-primary capture-key-btn';
	captureBtn.textContent = 'Press Key...';
	captureBtn.disabled = false;

	keyWrapper.appendChild(keySelect);
	keyWrapper.appendChild(captureBtn);
	keyField.appendChild(keyWrapper);
	editor.appendChild(keyField);

	const triggersField = document.createElement('div');
	triggersField.className = 'keymapping-field';

	const triggersLabel = document.createElement('label');
	triggersLabel.textContent = 'Triggers (Read-only)';
	triggersField.appendChild(triggersLabel);

	const triggersValue = data.Triggers?.value || [];
	const triggersDisplay = document.createElement('div');
	triggersDisplay.className = 'triggers-display';
	if (triggersValue.length === 0) {
		triggersDisplay.textContent = '(none)';
	} else {
		triggersValue.forEach(trigger => {
			const triggerItem = document.createElement('div');
			triggerItem.className = 'trigger-item';
			triggerItem.textContent = trigger;
			triggersDisplay.appendChild(triggerItem);
		});
	}
	triggersField.appendChild(triggersDisplay);
	editor.appendChild(triggersField);

	const modifiersField = document.createElement('div');
	modifiersField.className = 'keymapping-field';

	const modifiersLabel = document.createElement('label');
	modifiersLabel.textContent = 'Input Modifiers (Read-only)';
	modifiersField.appendChild(modifiersLabel);

	const modifiersValue = data.Modifiers?.value || [];
	const modifiersDisplay = document.createElement('div');
	modifiersDisplay.className = 'triggers-display';
	if (modifiersValue.length === 0) {
		modifiersDisplay.textContent = '(none)';
	} else {
		modifiersValue.forEach(mod => {
			const modItem = document.createElement('div');
			modItem.className = 'trigger-item';
			modItem.textContent = mod;
			modifiersDisplay.appendChild(modItem);
		});
	}
	modifiersField.appendChild(modifiersDisplay);
	editor.appendChild(modifiersField);

	const behaviorField = document.createElement('div');
	behaviorField.className = 'keymapping-field';

	const behaviorLabel = document.createElement('label');
	behaviorLabel.textContent = 'Setting Behavior';
	behaviorField.appendChild(behaviorLabel);

	const behaviorSelect = document.createElement('select');
	behaviorSelect.className = 'behavior-selector';
	SETTING_BEHAVIORS.forEach(behavior => {
		const option = document.createElement('option');
		option.value = behavior.value;
		option.textContent = behavior.label;
		if (behavior.value === settingBehavior) option.selected = true;
		behaviorSelect.appendChild(option);
	});

	behaviorSelect.addEventListener('change', (e) => {
		updateKeyMappingSettingBehavior(node.path, e.target.value, onUpdate);
	});

	behaviorField.appendChild(behaviorSelect);
	editor.appendChild(behaviorField);

	const settingsValue = data.PlayerMappableKeySettings?.value;
	if (settingsValue !== null && settingsValue !== undefined) {
		const settingsField = createKeyMappingField('Player Mappable Key Settings (Read-only)', settingsValue, true);
		editor.appendChild(settingsField);
	}

	keySelect.addEventListener('change', (e) => {
		updateKeyMappingKey(node.path, e.target.value, onUpdate);
	});

	let isCapturing = false;
	captureBtn.addEventListener('click', () => {
		if (isCapturing) return;
		isCapturing = true;
		captureBtn.textContent = 'Press a key...';
		captureBtn.disabled = true;

		const captureHandler = (e) => {
			e.preventDefault();
			e.stopPropagation();

			let keyName = null;

			if (e.key === 'Shift') { keyName = 'LeftShift'; }
			else if (e.key === 'Control') { keyName = 'LeftCtrl'; }
			else if (e.key === 'Alt') { keyName = 'LeftAlt'; }
			else if (e.key === 'Meta') { keyName = 'LeftCmd'; }
			else if (e.code.startsWith('Numpad')) {
				keyName = KEY_TO_KEYBOARD_MAP[e.code];
			}
			else if (e.key.length === 1) {
				if (e.key.match(/[a-zA-Z]/)) { keyName = e.key.toUpperCase(); }
				else if (e.key.match(/[0-9]/)) { keyName = e.key; }
				else {
					const SYMBOL_MAP = {
						';': 'Semicolon',
						"'": 'Quote',
						',': 'Comma',
						'.': 'Period',
						'/': 'Slash',
						'\\': 'Backslash',
						'`': 'GraveAccent',
						'[': 'LeftBracket',
						']': 'RightBracket',
						'-': 'Minus',
						'=': 'Equals',
					};
					keyName = SYMBOL_MAP[e.key];
				}
			}
			else {
				keyName = KEY_TO_KEYBOARD_MAP[e.code] || KEY_TO_KEYBOARD_MAP[e.key];
			}

			if (keyName && COMMON_KEYS.includes(keyName)) {
				updateKeyMappingKey(node.path, keyName, onUpdate);
				keySelect.value = keyName;
				endCapture();
			}
		};

		const endCapture = () => {
			document.removeEventListener('keydown', captureHandler);
			isCapturing = false;
			captureBtn.textContent = 'Press Key...';
			captureBtn.disabled = false;
		};

		document.addEventListener('keydown', captureHandler);
		setTimeout(endCapture, 10000);
	});

	container.appendChild(editor);
}

function createKeyMappingField(labelText, value, readOnly = false) {
	const field = document.createElement('div');
	field.className = 'keymapping-field';

	const label = document.createElement('label');
	label.textContent = labelText;
	field.appendChild(label);

	const input = document.createElement('input');
	input.type = 'text';
	input.value = value;
	if (readOnly) {
		input.readOnly = true;
		input.className = 'readonly-input';
	}
	field.appendChild(input);

	return field;
}

function updateKeyMappingKey(path, newKey, onUpdate) {
	onUpdate(path, (treeData) => {
		const node = getPropertyByPath(treeData, path);
		if (node && node.value && node.value.Key && node.value.Key.value) {
			node.value.Key.value.KeyName.value = newKey;
		}
	});
}

function updateKeyMappingSettingBehavior(path, newBehavior, onUpdate) {
	onUpdate(path, (treeData) => {
		const node = getPropertyByPath(treeData, path);
		if (node && node.value && node.value.SettingBehavior) {
			node.value.SettingBehavior.value = newBehavior;
		}
	});
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
