// types.js - Type definitions and constants for GVAS Editor

// Native struct type definitions
export const NATIVE_STRUCT_TYPES = new Set([
	'Vector', 'Rotator', 'Quat', 'LinearColor', 'Color',
	'IntPoint', 'IntVector', 'Vector2D', 'Box', 'Guid',
	'DateTime', 'Timespan', 'SoftClassPath', 'SoftObjectPath'
]);

// Native struct field definitions
export const NATIVE_STRUCT_FIELDS = {
	'Vector': [
		{ name: 'x', type: 'DoubleProperty' },
		{ name: 'y', type: 'DoubleProperty' },
		{ name: 'z', type: 'DoubleProperty' }
	],
	'Rotator': [
		{ name: 'pitch', type: 'DoubleProperty' },
		{ name: 'yaw', type: 'DoubleProperty' },
		{ name: 'roll', type: 'DoubleProperty' }
	],
	'Quat': [
		{ name: 'x', type: 'DoubleProperty' },
		{ name: 'y', type: 'DoubleProperty' },
		{ name: 'z', type: 'DoubleProperty' },
		{ name: 'w', type: 'DoubleProperty' }
	],
	'LinearColor': [
		{ name: 'r', type: 'FloatProperty' },
		{ name: 'g', type: 'FloatProperty' },
		{ name: 'b', type: 'FloatProperty' },
		{ name: 'a', type: 'FloatProperty' }
	],
	'Color': [
		{ name: 'r', type: 'ByteProperty' },
		{ name: 'g', type: 'ByteProperty' },
		{ name: 'b', type: 'ByteProperty' },
		{ name: 'a', type: 'ByteProperty' }
	],
	'IntPoint': [
		{ name: 'x', type: 'IntProperty' },
		{ name: 'y', type: 'IntProperty' }
	],
	'IntVector': [
		{ name: 'x', type: 'IntProperty' },
		{ name: 'y', type: 'IntProperty' },
		{ name: 'z', type: 'IntProperty' }
	],
	'Vector2D': [
		{ name: 'x', type: 'DoubleProperty' },
		{ name: 'y', type: 'DoubleProperty' }
	],
	'Box': [
		{ name: 'min', type: 'StructProperty', structType: 'Vector' },
		{ name: 'max', type: 'StructProperty', structType: 'Vector' }
	],
	'Guid': [
		{ name: 'guid', type: 'StrProperty' }
	],
	'DateTime': [
		{ name: 'ticks', type: 'Int64Property' }
	],
	'Timespan': [
		{ name: 'ticks', type: 'Int64Property' }
	],
	'SoftClassPath': [
		{ name: 'path', type: 'StrProperty' }
	],
	'SoftObjectPath': [
		{ name: 'path', type: 'StrProperty' }
	]
};

// Common keys for key binding
export const COMMON_KEYS = [
	'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
	'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
	'0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
	'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
	'Enter', 'Escape', 'Backspace', 'Tab', 'Space',
	'Left', 'Right', 'Up', 'Down',
	'Home', 'End', 'PageUp', 'PageDown', 'Insert', 'Delete',
	'Mouse1', 'Mouse2', 'Mouse3', 'Mouse4', 'Mouse5',
	'MouseX', 'MouseY', 'MouseScrollUp', 'MouseScrollDown',
	'NumPad0', 'NumPad1', 'NumPad2', 'NumPad3', 'NumPad4',
	'NumPad5', 'NumPad6', 'NumPad7', 'NumPad8', 'NumPad9',
	'NumPadDecimal', 'NumPadDivide', 'NumPadMultiply', 'NumPadSubtract', 'NumPadAdd',
	'LeftShift', 'RightShift', 'LeftCtrl', 'RightCtrl', 'LeftAlt', 'RightAlt',
	'LeftCmd', 'RightCmd', 'CapsLock', 'ScrollLock', 'NumLock',
	'Semicolon', 'Quote', 'Comma', 'Period', 'Slash', 'Backslash', 'Apostrophe',
	'LeftBracket', 'RightBracket', 'GraveAccent', 'Minus', 'Equals',
];

// Setting behavior enum values
export const SETTING_BEHAVIORS = [
	{ value: 'EPlayerMappableKeySettingBehaviors::InheritSettingsFromAction', label: 'Inherit from Action' },
	{ value: 'EPlayerMappableKeySettingBehaviors::OverrideSettings', label: 'Override Settings' },
];

// Key to keyboard event mapping for key capture
export const KEY_TO_KEYBOARD_MAP = {
	'Backquote': 'GraveAccent', 'Backslash': 'Backslash', 'Comma': 'Comma',
	'Equal': 'Equals', 'IntlBackslash': 'Backslash', 'Minus': 'Minus',
	'Period': 'Period', 'Quote': 'Quote', 'Semicolon': 'Semicolon', 'Slash': 'Slash',
	'Backspace': 'Backspace', 'CapsLock': 'CapsLock', 'Delete': 'Delete',
	'Down': 'Down', 'End': 'End', 'Enter': 'Enter', 'Escape': 'Escape',
	'Home': 'Home', 'Insert': 'Insert', 'Left': 'Left', 'PageDown': 'PageDown',
	'PageUp': 'PageUp', 'Right': 'Right', 'ScrollLock': 'ScrollLock',
	'NumLock': 'NumLock', 'Space': 'Space', 'Tab': 'Tab', 'Up': 'Up',
	'F1': 'F1', 'F2': 'F2', 'F3': 'F3', 'F4': 'F4', 'F5': 'F5', 'F6': 'F6',
	'F7': 'F7', 'F8': 'F8', 'F9': 'F9', 'F10': 'F10', 'F11': 'F11', 'F12': 'F12',
	'Control': 'LeftCtrl', 'Shift': 'LeftShift', 'Alt': 'LeftAlt',
	'Digit0': '0', 'Digit1': '1', 'Digit2': '2', 'Digit3': '3', 'Digit4': '4',
	'Digit5': '5', 'Digit6': '6', 'Digit7': '7', 'Digit8': '8', 'Digit9': '9',
	'KeyA': 'A', 'KeyB': 'B', 'KeyC': 'C', 'KeyD': 'D', 'KeyE': 'E', 'KeyF': 'F',
	'KeyG': 'G', 'KeyH': 'H', 'KeyI': 'I', 'KeyJ': 'J', 'KeyK': 'K', 'KeyL': 'L',
	'KeyM': 'M', 'KeyN': 'N', 'KeyO': 'O', 'KeyP': 'P', 'KeyQ': 'Q', 'KeyR': 'R',
	'KeyS': 'S', 'KeyT': 'T', 'KeyU': 'U', 'KeyV': 'V', 'KeyW': 'W', 'KeyX': 'X',
	'KeyY': 'Y', 'KeyZ': 'Z',
	'Numpad0': 'NumPad0', 'Numpad1': 'NumPad1', 'Numpad2': 'NumPad2',
	'Numpad3': 'NumPad3', 'Numpad4': 'NumPad4', 'Numpad5': 'NumPad5',
	'Numpad6': 'NumPad6', 'Numpad7': 'NumPad7', 'Numpad8': 'NumPad8',
	'Numpad9': 'NumPad9', 'NumpadAdd': 'NumPadAdd', 'NumpadSubtract': 'NumPadSubtract',
	'NumpadMultiply': 'NumPadMultiply', 'NumpadDivide': 'NumPadDivide',
	'NumpadDecimal': 'NumPadDecimal',
	'Mouse0': 'Mouse1', 'Mouse1': 'Mouse2', 'Mouse2': 'Mouse3',
	'Mouse3': 'Mouse4', 'Mouse4': 'Mouse5',
};
