(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.shell = window.PufferDesk.shell || {};

	window.PufferDesk.shell.createShortcutController = function createShortcutController(shell, context = {}) {
		const commands = context.commands || null;
		const menuController = context.menuController || null;
		const modifierSymbols = {
			alt: '⌥',
			ctrl: '⌃',
			meta: '⌘',
			shift: '⇧'
		};
		const modifierOrder = ['ctrl', 'alt', 'shift', 'meta'];
		const modifierAliases = {
			'⌘': 'meta',
			'⌥': 'alt',
			'⌃': 'ctrl',
			'⇧': 'shift',
			alt: 'alt',
			cmd: 'meta',
			command: 'meta',
			control: 'ctrl',
			ctrl: 'ctrl',
			meta: 'meta',
			option: 'alt',
			shift: 'shift'
		};
		const keyAliases = {
			' ': 'space',
			'⎋': 'escape',
			'↩': 'enter',
			'←': 'arrowleft',
			'↑': 'arrowup',
			'→': 'arrowright',
			'↓': 'arrowdown',
			del: 'delete',
			esc: 'escape',
			return: 'enter'
		};
		let bound = false;

		function normalizeModifier(modifier) {
			const key = String(modifier || '').trim().toLowerCase();
			return modifierAliases[key] || '';
		}

		function normalizeModifiers(modifiers) {
			const normalized = new Set();

			(Array.isArray(modifiers) ? modifiers : []).forEach((modifier) => {
				const next = normalizeModifier(modifier);
				if (next) {
					normalized.add(next);
				}
			});

			return modifierOrder.filter((modifier) => normalized.has(modifier));
		}

		function normalizeKey(key) {
			const normalized = String(key || '').trim().toLowerCase();

			if (!normalized) {
				return '';
			}

			return keyAliases[normalized] || normalized;
		}

		function parseTextShortcut(label) {
			const text = String(label || '').trim();
			const modifiers = [];
			let keyText = '';
			let hasSymbolModifier = false;

			if (!text || text === '>') {
				return null;
			}

			Array.from(text).forEach((character) => {
				const modifier = normalizeModifier(character);

				if (modifier) {
					modifiers.push(modifier);
					hasSymbolModifier = true;
				} else {
					keyText += character;
				}
			});

			if (!hasSymbolModifier && /[+\s]/.test(text)) {
				keyText = '';
				const tokens = text.split(/[+\s]+/).filter(Boolean);

				tokens.forEach((token) => {
					const modifier = normalizeModifier(token);
					if (modifier) {
						modifiers.push(modifier);
					} else {
						keyText = token;
					}
				});
			}

			const key = normalizeKey(keyText);
			if (!key) {
				return null;
			}

			return {
				allowInTextFields: false,
				key,
				label: text,
				modifiers: normalizeModifiers(modifiers),
				preventDefault: true
			};
		}

		function formatShortcut(shortcut) {
			const modifiers = normalizeModifiers(shortcut.modifiers);
			const key = normalizeKey(shortcut.key);
			const keyLabel = shortcut.keyLabel || shortcut.key || '';

			if (!key) {
				return '';
			}

			return modifiers.map((modifier) => modifierSymbols[modifier] || '').join('') + String(keyLabel).toUpperCase();
		}

		function normalizeShortcut(shortcut) {
			if (typeof shortcut === 'string') {
				return parseTextShortcut(shortcut);
			}

			if (!shortcut || typeof shortcut !== 'object') {
				return null;
			}

			const fromLabel = shortcut.label && !shortcut.key ? parseTextShortcut(shortcut.label) : null;
			const key = normalizeKey(shortcut.key || (fromLabel ? fromLabel.key : ''));
			const modifiers = normalizeModifiers(shortcut.modifiers && shortcut.modifiers.length ? shortcut.modifiers : (fromLabel ? fromLabel.modifiers : []));

			if (!key) {
				return null;
			}

			const normalized = {
				allowInTextFields: shortcut.allowInTextFields === true,
				key,
				keyLabel: shortcut.keyLabel || shortcut.key || (fromLabel ? fromLabel.keyLabel : ''),
				label: shortcut.label || '',
				modifiers,
				preventDefault: shortcut.preventDefault !== false
			};

			normalized.label = normalized.label || formatShortcut(normalized);

			return normalized;
		}

		function getEventKey(event) {
			return normalizeKey(event.key);
		}

		function hasMatchingModifiers(event, shortcut) {
			const modifiers = new Set(shortcut.modifiers);

			return Boolean(event.altKey) === modifiers.has('alt')
				&& Boolean(event.ctrlKey) === modifiers.has('ctrl')
				&& Boolean(event.metaKey) === modifiers.has('meta')
				&& Boolean(event.shiftKey) === modifiers.has('shift');
		}

		function isEditableTarget(target) {
			if (!target || typeof target.closest !== 'function') {
				return false;
			}

			return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'));
		}

		function flattenItems(items, result) {
			(Array.isArray(items) ? items : []).forEach((item) => {
				if (!item || item.type === 'separator' || !item.command || item.disabled) {
					return;
				}

				const shortcut = normalizeShortcut(item.shortcut);
				if (!shortcut) {
					return;
				}

				result.push({
					item,
					shortcut
				});
			});
		}

		function getShortcutItems() {
			const definition = menuController && typeof menuController.getMenuDefinition === 'function'
				? menuController.getMenuDefinition()
				: null;
			const result = [];

			if (!definition) {
				return result;
			}

			(Array.isArray(definition.groups) ? definition.groups : []).forEach((group) => {
				flattenItems(group.items, result);
			});

			if (definition.system && Array.isArray(definition.system.items)) {
				flattenItems(definition.system.items, result);
			}

			return result;
		}

		function findShortcut(event) {
			const eventKey = getEventKey(event);

			if (!eventKey) {
				return null;
			}

			return getShortcutItems().find((entry) => (
				entry.shortcut.key === eventKey
				&& hasMatchingModifiers(event, entry.shortcut)
				&& commands
				&& typeof commands.canExecute === 'function'
				&& commands.canExecute(entry.item)
			)) || null;
		}

		function onKeyDown(event) {
			if (event.defaultPrevented || event.isComposing) {
				return;
			}

			const match = findShortcut(event);
			if (!match || (isEditableTarget(event.target) && !match.shortcut.allowInTextFields)) {
				return;
			}

			if (match.shortcut.preventDefault) {
				event.preventDefault();
				event.stopPropagation();
			}

			if (menuController && typeof menuController.closePopover === 'function') {
				menuController.closePopover();
			}

			commands.execute(match.item);
			shell.dispatchEvent(new window.CustomEvent('pufferDesk:shortcut-execute', {
				detail: {
					command: match.item.command,
					key: match.shortcut.key,
					label: match.shortcut.label,
					modifiers: match.shortcut.modifiers
				}
			}));
		}

		function bind() {
			if (bound || !commands || !menuController) {
				return;
			}

			document.addEventListener('keydown', onKeyDown);
			bound = true;
		}

		return {
			bind,
			getShortcuts() {
				return getShortcutItems().map((entry) => ({
					command: entry.item.command,
					key: entry.shortcut.key,
					label: entry.shortcut.label,
					modifiers: entry.shortcut.modifiers
				}));
			},
			normalizeShortcut
		};
	};
})();
