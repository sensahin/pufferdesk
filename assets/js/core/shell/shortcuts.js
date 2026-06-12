(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.shell = window.PufferDesk.shell || {};
	window.PufferDesk.shortcuts = window.PufferDesk.shortcuts || {};

	const shortcutContexts = window.PufferDesk.shell.shortcutContexts || {};
	const windowKinds = window.PufferDesk.session && window.PufferDesk.session.workspace
		? window.PufferDesk.session.workspace.windowKinds || {}
		: {};
	const folderWindowKind = windowKinds.FOLDER;
	const layerWeights = Object.freeze({
		custom: 1000,
		default: 0
	});
	const contextWeights = Object.freeze({
		[shortcutContexts.MODAL]: 90,
		[shortcutContexts.COMMAND_PALETTE]: 80,
		[shortcutContexts.INPUT_FOCUSED]: 70,
		[shortcutContexts.FOLDER_TAB]: 60,
		[shortcutContexts.FOLDER]: 50,
		[shortcutContexts.WINDOW]: 40,
		[shortcutContexts.DESKTOP]: 30,
		[shortcutContexts.GLOBAL]: 10
	});
	const modifierAliases = Object.freeze({
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
		primary: 'primary',
		secondary: 'secondary',
		shift: 'shift'
	});
	const modifierOrder = ['ctrl', 'alt', 'shift', 'meta'];
	const keyAliases = Object.freeze({
		' ': 'space',
		'⎋': 'escape',
		'↩': 'enter',
		'⌫': 'backspace',
		'⌦': 'delete',
		'←': 'arrowleft',
		'↑': 'arrowup',
		'→': 'arrowright',
		'↓': 'arrowdown',
		del: 'delete',
		esc: 'escape',
		return: 'enter'
	});
	const keyLabelKeys = Object.freeze({
		arrowdown: '↓',
		arrowleft: '←',
		arrowright: '→',
		arrowup: '↑',
		backspace: 'shortcut_key_backspace',
		delete: 'shortcut_key_delete',
		enter: 'shortcut_key_enter',
		escape: 'shortcut_key_escape',
		space: 'shortcut_key_space',
		tab: 'shortcut_key_tab'
	});
	const editableSelector = 'input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"]';
	const blockedShortcutLabelKeys = Object.freeze({
		f5: 'shortcut_reserved_browser_reload',
		'alt+arrowleft': 'shortcut_reserved_browser_back',
		'alt+arrowright': 'shortcut_reserved_browser_forward',
		'ctrl+r': 'shortcut_reserved_browser_reload',
		'meta+r': 'shortcut_reserved_browser_reload',
		'ctrl+l': 'shortcut_reserved_browser_location_bar',
		'meta+l': 'shortcut_reserved_browser_location_bar',
		'ctrl+h': 'shortcut_reserved_browser_history',
		'meta+h': 'shortcut_reserved_system_hide_application',
		'meta+alt+h': 'shortcut_reserved_system_hide_other_applications',
		'meta+q': 'shortcut_reserved_browser_quit_application',
		'ctrl+t': 'shortcut_reserved_browser_new_tab',
		'meta+t': 'shortcut_reserved_browser_new_tab',
		'ctrl+p': 'shortcut_reserved_browser_print',
		'meta+p': 'shortcut_reserved_browser_print',
		'ctrl+s': 'shortcut_reserved_browser_save_page',
		'meta+s': 'shortcut_reserved_browser_save_page',
		'ctrl+shift+n': 'shortcut_reserved_browser_private_window',
		'meta+shift+n': 'shortcut_reserved_browser_private_window',
		'ctrl+shift+t': 'shortcut_reserved_browser_reopen_closed_tab',
		'meta+shift+t': 'shortcut_reserved_browser_reopen_closed_tab',
		'ctrl+shift+i': 'shortcut_reserved_developer_tools',
		'meta+alt+i': 'shortcut_reserved_developer_tools',
		'ctrl+shift+j': 'shortcut_reserved_developer_tools_console',
		'meta+alt+j': 'shortcut_reserved_developer_tools_console',
		'ctrl+shift+c': 'shortcut_reserved_developer_tools_element_picker',
		'meta+shift+c': 'shortcut_reserved_developer_tools_element_picker',
		'ctrl+tab': 'shortcut_reserved_browser_next_tab',
		'ctrl+shift+tab': 'shortcut_reserved_browser_previous_tab',
		'meta+[': 'shortcut_reserved_browser_back',
		'meta+]': 'shortcut_reserved_browser_forward'
	});
	const riskyShortcutLabelKeys = Object.freeze({
		'meta+m': 'shortcut_reserved_system_minimize_window',
		'meta+space': 'shortcut_reserved_system_search',
		'meta+shift+3': 'shortcut_reserved_system_screenshot',
		'meta+shift+4': 'shortcut_reserved_system_screenshot',
		'meta+shift+5': 'shortcut_reserved_system_screenshot'
	});

	function getRuntimeConfig() {
		return window.PufferDesk.config && typeof window.PufferDesk.config.get === 'function'
			? window.PufferDesk.config.get()
			: {};
	}

	function getMenuLabels(config = getRuntimeConfig()) {
		const menu = config.menu && typeof config.menu === 'object' ? config.menu : {};

		return menu.labels && typeof menu.labels === 'object' ? menu.labels : {};
	}

	function getMenuLabel(labels, key, fallback = '') {
		const value = labels[key];

		return typeof value === 'string' && value ? value : fallback || key;
	}

	function formatMenuLabel(labels, key, fallback, replacements = []) {
		let template = getMenuLabel(labels, key, fallback);

		replacements.forEach((replacement, index) => {
			const value = String(replacement || '');
			template = template.replace(new RegExp(`%${index + 1}\\\\$s`, 'g'), value);
			template = template.replace('%s', value);
		});

		return template;
	}

	function getPlatform() {
		const navigatorObject = window.navigator || {};
		const userAgentData = navigatorObject.userAgentData || {};
		const platform = String(userAgentData.platform || navigatorObject.platform || navigatorObject.userAgent || '').toLowerCase();
		const isMac = /mac|iphone|ipad|ipod/.test(platform);
		const isWindows = /win/.test(platform);

		return {
			isLinux: !isMac && !isWindows,
			isMac,
			isWindows,
			name: isMac ? 'mac' : (isWindows ? 'windows' : 'linux'),
			primary: isMac ? 'meta' : 'ctrl',
			secondary: 'alt'
		};
	}

	function getPlatformCombo(definition, platform) {
		if (platform.isMac && definition.macCombo) {
			return definition.macCombo;
		}

		if (platform.isWindows && definition.winCombo) {
			return definition.winCombo;
		}

		if (platform.isLinux && definition.linuxCombo) {
			return definition.linuxCombo;
		}

		return definition.combo || '';
	}

	function normalizeKey(key) {
		const normalized = String(key || '').trim().toLowerCase();

		if (!normalized) {
			return '';
		}

		return keyAliases[normalized] || normalized;
	}

	function normalizeContext(context) {
		const normalized = String(context || '').trim().toLowerCase();
		const values = Object.keys(shortcutContexts).map((key) => shortcutContexts[key]);

		return values.includes(normalized) ? normalized : '';
	}

	function normalizeContexts(value) {
		const raw = Array.isArray(value)
			? value
			: (typeof value === 'string' && value ? [value] : []);
		const contexts = [];

		raw.forEach((context) => {
			const normalized = normalizeContext(context);
			if (normalized && !contexts.includes(normalized)) {
				contexts.push(normalized);
			}
		});

		return contexts.length ? contexts : [shortcutContexts.GLOBAL];
	}

	function resolveModifier(modifier, platform) {
		const normalized = modifierAliases[String(modifier || '').trim().toLowerCase()] || '';

		if (normalized === 'primary') {
			return platform.primary;
		}

		if (normalized === 'secondary') {
			return platform.secondary;
		}

		return normalized;
	}

	function normalizeModifiers(modifiers, platform) {
		const normalized = new Set();

		(Array.isArray(modifiers) ? modifiers : []).forEach((modifier) => {
			const next = resolveModifier(modifier, platform);
			if (next) {
				normalized.add(next);
			}
		});

		return modifierOrder.filter((modifier) => normalized.has(modifier));
	}

	function splitCombo(combo) {
		return String(combo || '')
			.trim()
			.split('+')
			.map((token) => token.trim())
			.filter(Boolean);
	}

	function parseTextShortcut(value, platform, options = {}) {
		const text = String(value || '').trim();
		const modifiers = [];
		let key = '';
		let hasSymbolModifier = false;

		if (!text || text === '>' || text === '›') {
			return null;
		}

		Array.from(text).forEach((character) => {
			const modifier = resolveModifier(character, platform);

			if (modifier) {
				modifiers.push(modifier);
				hasSymbolModifier = true;
			} else {
				key += character;
			}
		});

		if (!hasSymbolModifier && /[+\s]/.test(text)) {
			key = '';
			splitCombo(text).forEach((token) => {
				const modifier = resolveModifier(token, platform);
				if (modifier) {
					modifiers.push(modifier);
				} else {
					key = token;
				}
			});
		}

		const normalizedKey = normalizeKey(key || (!hasSymbolModifier && !/[+\s]/.test(text) ? text : ''));
		const normalizedModifiers = normalizeModifiers(modifiers, platform);

		if (!normalizedKey) {
			return null;
		}

		if (!normalizedModifiers.length && !options.allowBare) {
			return null;
		}

		return {
			key: normalizedKey,
			keyLabel: normalizedKey === normalizeKey(key) ? key : '',
			modifiers: normalizedModifiers
		};
	}

	function parseKeys(keys, platform, options = {}) {
		const tokens = Array.isArray(keys) ? keys : [];
		const modifiers = [];
		let key = '';

		tokens.forEach((token) => {
			const modifier = resolveModifier(token, platform);
			if (modifier) {
				modifiers.push(modifier);
				return;
			}

			key = token;
		});

		const normalizedModifiers = normalizeModifiers(modifiers, platform);
		const normalizedKey = normalizeKey(key);

		if (!normalizedKey || (!normalizedModifiers.length && !options.allowBare)) {
			return null;
		}

		return {
			key: normalizedKey,
			keyLabel: key,
			modifiers: normalizedModifiers
		};
	}

	function getCanonicalCombo(modifiers, key) {
		const ordered = normalizeModifiers(modifiers, {
			primary: 'ctrl',
			secondary: 'alt'
		});

		return ordered.concat([normalizeKey(key)]).filter(Boolean).join('+');
	}

	function getEventCombo(event) {
		const key = normalizeKey(event && event.key);

		if (!key || ['alt', 'control', 'ctrl', 'meta', 'shift'].includes(key)) {
			return '';
		}

		return getCanonicalCombo([
			event.ctrlKey ? 'ctrl' : '',
			event.altKey ? 'alt' : '',
			event.shiftKey ? 'shift' : '',
			event.metaKey ? 'meta' : ''
		], key);
	}

	function getKeyLabel(key, fallback = '') {
		const normalized = normalizeKey(key);

		if (!normalized) {
			return fallback;
		}

		if (keyLabelKeys[normalized]) {
			if (/^[←↑→↓]$/.test(keyLabelKeys[normalized])) {
				return keyLabelKeys[normalized];
			}

			return getMenuLabel(getMenuLabels(), keyLabelKeys[normalized]);
		}

		if (normalized.length === 1) {
			return normalized.toUpperCase();
		}

		return fallback || normalized.charAt(0).toUpperCase() + normalized.slice(1);
	}

	function getDisplayModifierOrder(platform) {
		return platform.isMac ? ['meta', 'alt', 'shift', 'ctrl'] : ['ctrl', 'alt', 'shift', 'meta'];
	}

	function formatShortcut(shortcut, platform = getPlatform()) {
		const normalized = normalizeShortcutDescriptor(shortcut, {
			allowBare: true,
			platform
		});

		if (!normalized) {
			if (typeof shortcut === 'string') {
				return shortcut;
			}

			return shortcut && typeof shortcut === 'object' && typeof shortcut.label === 'string' ? shortcut.label : '';
		}

		const modifiers = new Set(normalized.modifiers);
		const modifierLabels = {
			alt: platform.isMac ? '⌥' : getMenuLabel(getMenuLabels(), 'shortcut_modifier_alt'),
			ctrl: platform.isMac ? '⌃' : getMenuLabel(getMenuLabels(), 'shortcut_modifier_control'),
			meta: platform.isMac ? '⌘' : getMenuLabel(getMenuLabels(), 'shortcut_modifier_meta'),
			shift: platform.isMac ? '⇧' : getMenuLabel(getMenuLabels(), 'shortcut_modifier_shift')
		};
		const key = getKeyLabel(normalized.key, normalized.keyLabel || normalized.key);

		if (platform.isMac) {
			return getDisplayModifierOrder(platform)
				.filter((modifier) => modifiers.has(modifier))
				.map((modifier) => modifierLabels[modifier])
				.join('') + key;
		}

		return getDisplayModifierOrder(platform)
			.filter((modifier) => modifiers.has(modifier))
			.map((modifier) => modifierLabels[modifier])
			.concat([key])
			.join('+');
	}

	function getCommandItem(definition) {
		return {
			command: definition.command,
			icon: definition.icon || '',
			id: definition.id || '',
			label: definition.label || definition.id || definition.command,
			panel: definition.panel || '',
			payload: definition.payload && typeof definition.payload === 'object' ? definition.payload : {},
			shortcut: definition.rawShortcut || '',
			target: definition.target || '',
			title: definition.title || definition.label || '',
			url: definition.url || ''
		};
	}

	function normalizeShortcutDescriptor(shortcut, options = {}) {
		const platform = options.platform || getPlatform();
		const allowBare = options.allowBare === true;

		if (typeof shortcut === 'string') {
			return parseTextShortcut(shortcut, platform, { allowBare });
		}

		if (!shortcut || typeof shortcut !== 'object') {
			return null;
		}

		const combo = getPlatformCombo(shortcut, platform);
		const fromCombo = combo ? parseTextShortcut(combo, platform, { allowBare }) : null;
		const fromKeys = !fromCombo && Array.isArray(shortcut.keys) ? parseKeys(shortcut.keys, platform, { allowBare }) : null;
		const fromLabel = !fromCombo && !fromKeys && shortcut.label ? parseTextShortcut(shortcut.label, platform, { allowBare }) : null;
		const modifiers = shortcut.modifiers && shortcut.modifiers.length
			? normalizeModifiers(shortcut.modifiers, platform)
			: ((fromCombo || fromKeys || fromLabel) ? (fromCombo || fromKeys || fromLabel).modifiers : []);
		const key = normalizeKey(shortcut.key || ((fromCombo || fromKeys || fromLabel) ? (fromCombo || fromKeys || fromLabel).key : ''));

		if (!key || (!modifiers.length && !allowBare)) {
			return null;
		}

		return {
			key,
			keyLabel: shortcut.keyLabel || shortcut.key || ((fromCombo || fromKeys || fromLabel) ? (fromCombo || fromKeys || fromLabel).keyLabel : ''),
			modifiers: normalizeModifiers(modifiers, platform)
		};
	}

	function normalizeShortcutDefinition(definition, options = {}) {
		if (!definition || typeof definition !== 'object' || !definition.command) {
			return null;
		}

		const platform = options.platform || getPlatform();
		const shortcut = normalizeShortcutDescriptor(definition.shortcut || definition, {
			allowBare: definition.allowBare === true || options.allowBare === true,
			platform
		});

		if (!shortcut) {
			return null;
		}

		const contexts = normalizeContexts(definition.contexts || definition.context || (definition.shortcut && (definition.shortcut.contexts || definition.shortcut.context)));
		const normalized = {
			allowInTextFields: definition.allowInTextFields === true || (definition.shortcut && definition.shortcut.allowInTextFields === true),
			allowReserved: definition.allowReserved === true || (definition.shortcut && definition.shortcut.allowReserved === true),
			command: definition.command,
			contexts,
			enabledWhen: typeof definition.enabledWhen === 'function' ? definition.enabledWhen : null,
			icon: definition.icon || '',
			id: definition.id || `${definition.command}:${getCanonicalCombo(shortcut.modifiers, shortcut.key)}:${contexts.join('|')}`,
			key: shortcut.key,
			keyLabel: shortcut.keyLabel || definition.keyLabel || '',
			label: definition.label || '',
			layer: options.layer || definition.layer || 'default',
			modifiers: shortcut.modifiers,
			payload: definition.payload && typeof definition.payload === 'object' ? definition.payload : {},
			panel: definition.panel || '',
			preventDefault: definition.preventDefault !== false && (!definition.shortcut || definition.shortcut.preventDefault !== false),
			priority: Number.isFinite(definition.priority) ? definition.priority : 0,
			rawShortcut: definition.shortcut || definition.combo || definition.keys || '',
			reservedReason: definition.reservedReason || (definition.shortcut && definition.shortcut.reservedReason) || '',
			source: options.source || definition.source || 'default',
			target: definition.target || '',
			title: definition.title || definition.label || '',
			url: definition.url || ''
		};

		normalized.combo = getCanonicalCombo(normalized.modifiers, normalized.key);
		normalized.commandItem = getCommandItem(normalized);
		normalized.displayLabel = formatShortcut({
			key: normalized.key,
			keyLabel: normalized.keyLabel,
			modifiers: normalized.modifiers
		}, platform);

		return normalized;
	}

	function contextMatches(definition, executionContext) {
		const activeContexts = executionContext.contexts || new Set([shortcutContexts.GLOBAL]);

		return definition.contexts.some((context) => context === shortcutContexts.GLOBAL || activeContexts.has(context));
	}

	function contextsOverlap(first, second) {
		const firstContexts = normalizeContexts(first);
		const secondContexts = normalizeContexts(second);

		if (firstContexts.includes(shortcutContexts.GLOBAL) || secondContexts.includes(shortcutContexts.GLOBAL)) {
			return true;
		}

		return firstContexts.some((context) => (
			secondContexts.includes(context)
			|| (context === shortcutContexts.FOLDER && secondContexts.includes(shortcutContexts.WINDOW))
			|| (context === shortcutContexts.WINDOW && secondContexts.includes(shortcutContexts.FOLDER))
		));
	}

	function isWindowScoped(definition) {
		return definition.contexts.every((context) => [shortcutContexts.WINDOW, shortcutContexts.FOLDER, shortcutContexts.FOLDER_TAB, shortcutContexts.MODAL].includes(context));
	}

	function getReservedConflict(definition) {
		if (definition.combo === 'ctrl+w' || definition.combo === 'meta+w') {
			return isWindowScoped(definition) ? null : {
				blocking: true,
				message: getMenuLabel(getMenuLabels(), 'shortcut_reserved_window_scope'),
				type: 'browser-reserved'
			};
		}

		if ((definition.combo === 'ctrl+s' || definition.combo === 'meta+s') && definition.allowReserved) {
			return null;
		}

		if ((definition.combo === 'ctrl+n' || definition.combo === 'meta+n') && !isWindowScoped(definition)) {
			return {
				blocking: true,
				message: getMenuLabel(getMenuLabels(), 'shortcut_reserved_clear_scope'),
				type: 'browser-reserved'
			};
		}

		const labels = getMenuLabels();
		const blockedLabelKey = blockedShortcutLabelKeys[definition.combo];
		if (blockedLabelKey) {
			return {
				blocking: true,
				message: formatMenuLabel(labels, 'shortcut_reserved_for_format', 'shortcut_reserved_for_format', [
					formatShortcut(definition),
					getMenuLabel(labels, blockedLabelKey, blockedLabelKey)
				]),
				type: 'browser-reserved'
			};
		}

		const riskyLabelKey = riskyShortcutLabelKeys[definition.combo];
		if (riskyLabelKey && !definition.allowReserved) {
			return {
				blocking: false,
				message: formatMenuLabel(labels, 'shortcut_may_conflict_format', 'shortcut_may_conflict_format', [
					formatShortcut(definition),
					getMenuLabel(labels, riskyLabelKey, riskyLabelKey)
				]),
				type: 'os-risk'
			};
		}

		return null;
	}

	function createShortcutConflictChecker() {
		function check(definition, existingDefinitions = []) {
			const conflicts = [];
			const reserved = getReservedConflict(definition);

			if (reserved) {
				conflicts.push(Object.assign({
					definitionId: definition.id
				}, reserved));
			}

			existingDefinitions.forEach((existing) => {
				if (!existing || existing.id === definition.id || existing.combo !== definition.combo || !contextsOverlap(existing.contexts, definition.contexts)) {
					return;
				}

				if (existing.command === definition.command) {
					return;
				}

				conflicts.push({
					blocking: true,
					definitionId: definition.id,
					existingCommand: existing.command,
					existingId: existing.id,
					message: formatMenuLabel(getMenuLabels(), 'shortcut_conflicts_with_format', 'shortcut_conflicts_with_format', [
						formatShortcut(definition),
						existing.id || existing.command
					]),
					type: existing.source === definition.source ? 'duplicate-shortcut' : 'module-conflict'
				});
			});

			return conflicts;
		}

		return {
			check
		};
	}

	function createShortcutRegistry(options = {}) {
		const conflictChecker = options.conflictChecker || createShortcutConflictChecker();
		const definitions = new Map();
		const conflicts = [];

		function report(definition, nextConflicts) {
			nextConflicts.forEach((conflict) => {
				conflicts.push(Object.assign({
					combo: definition.combo,
					command: definition.command,
					source: definition.source
				}, conflict));

				if (conflict.type !== 'duplicate-equivalent' && window.console && typeof window.console.warn === 'function') {
					window.console.warn(getMenuLabel(getMenuLabels(), 'shortcut_conflict_console', 'shortcut_conflict_console'), conflict.message, {
						command: definition.command,
						id: definition.id,
						source: definition.source
					});
				}
			});
		}

		function getDefinitions() {
			return Array.from(definitions.values());
		}

		function register(rawDefinition, registerOptions = {}) {
			const definition = normalizeShortcutDefinition(rawDefinition, registerOptions);

			if (!definition) {
				return {
					conflicts: [],
					definition: null,
					registered: false
				};
			}

			const nextConflicts = conflictChecker.check(definition, getDefinitions());
			const blocking = nextConflicts.some((conflict) => conflict.blocking);

			if (nextConflicts.length) {
				report(definition, nextConflicts);
			}

			if (blocking) {
				return {
					conflicts: nextConflicts,
					definition,
					registered: false
				};
			}

			definitions.set(definition.id, definition);

			return {
				conflicts: nextConflicts,
				definition,
				registered: true
			};
		}

		function registerMany(items, registerOptions = {}) {
			return (Array.isArray(items) ? items : []).map((item) => register(item, registerOptions));
		}

		function removeSource(source) {
			Array.from(definitions.entries()).forEach(([id, definition]) => {
				if (definition.source === source) {
					definitions.delete(id);
				}
			});
		}

		function replaceSource(source, items, registerOptions = {}) {
			removeSource(source);
			return registerMany(items, Object.assign({}, registerOptions, {
				source
			}));
		}

		return {
			getConflicts() {
				return conflicts.slice();
			},
			getDefinitions,
			register,
			registerMany,
			removeSource,
			replaceSource
		};
	}

	function createShortcutSettings(config = {}, defaults = []) {
		const storageKeys = window.PufferDesk.session && window.PufferDesk.session.storageKeys ? window.PufferDesk.session.storageKeys : {};
		const storageKey = storageKeys && typeof storageKeys.getShortcutCustomKey === 'function'
			? storageKeys.getShortcutCustomKey(config.storageKey || '')
			: `${config.storageKey || 'pufferdesk'}:shortcuts:custom`;

		function getStorage() {
			try {
				return window.localStorage;
			} catch (error) {
				return null;
			}
		}

		function getDefaultDefinitions() {
			return defaults.map((definition) => Object.assign({}, definition, {
				contexts: Array.isArray(definition.contexts) ? definition.contexts.slice() : definition.contexts,
				payload: definition.payload && typeof definition.payload === 'object' ? Object.assign({}, definition.payload) : definition.payload
			}));
		}

		function getCustomDefinitions() {
			const storage = getStorage();

			if (!storage || !storageKey) {
				return [];
			}

			try {
				const parsed = JSON.parse(storage.getItem(storageKey) || '[]');

				return Array.isArray(parsed) ? parsed : [];
			} catch (error) {
				return [];
			}
		}

		function setCustomDefinitions(definitions) {
			const storage = getStorage();
			const customDefinitions = Array.isArray(definitions) ? definitions : [];

			if (!storage || !storageKey) {
				return false;
			}

			if (!customDefinitions.length) {
				storage.removeItem(storageKey);
				return true;
			}

			storage.setItem(storageKey, JSON.stringify(customDefinitions));
			return true;
		}

		function restoreDefaults() {
			return setCustomDefinitions([]);
		}

		return {
			getCustomDefinitions,
			getDefaultDefinitions,
			restoreDefaults,
			setCustomDefinitions,
			storageKey
		};
	}

	function getTargetElement(event) {
		const target = event && event.target;

		return target && target.nodeType === 1 ? target : (target && target.parentElement ? target.parentElement : null);
	}

	function isEditableTarget(target) {
		if (!target || typeof target.closest !== 'function') {
			return false;
		}

		return Boolean(target.closest(editableSelector));
	}

	function getWindowFromTarget(target) {
		return target && typeof target.closest === 'function' ? target.closest('.pdk-window:not(.is-closed)') : null;
	}

	function isModalTarget(target) {
		return Boolean(target && typeof target.closest === 'function' && target.closest('.pdk-dialog-layer, .pdk-menu-popover[role="dialog"], [aria-modal="true"]'));
	}

	function getDesktopSelectionDetail(context) {
		const manager = context.desktopIconManager || null;
		const constants = window.PufferDesk.shell && window.PufferDesk.shell.contextMenuConstants
			? window.PufferDesk.shell.contextMenuConstants.targets || {}
			: {};
		const selected = manager && typeof manager.getSelectedIconDetails === 'function' ? manager.getSelectedIconDetails() : [];
		const detail = {
			kind: constants.DESKTOP,
			type: constants.DESKTOP
		};

		if (selected.length === 1) {
			const item = selected[0];

			return Object.assign(detail, {
				iconElement: item.iconElement || null,
				id: item.id || '',
				kind: item.context || (item.kind === 'folder' ? constants.DESKTOP_FOLDER : constants.DESKTOP_APP),
				label: item.label || '',
				targetElement: item.iconElement || null,
				type: item.context || (item.kind === 'folder' ? constants.DESKTOP_FOLDER : constants.DESKTOP_APP)
			});
		}

		return detail;
	}

	function createShortcutExecutionContext(event, controllerContext = {}) {
		const target = getTargetElement(event);
		const manager = controllerContext.manager || null;
		const menuController = controllerContext.menuController || null;
		const activeDetail = menuController && typeof menuController.getActiveDetail === 'function'
			? menuController.getActiveDetail()
			: {};
		const targetWindow = getWindowFromTarget(target);
		const activeWindow = targetWindow || (activeDetail && activeDetail.windowElement) || (manager && typeof manager.getActiveWindow === 'function' ? manager.getActiveWindow() : null);
		const detail = activeWindow
			? Object.assign({}, activeDetail, {
				appId: activeWindow.dataset ? activeWindow.dataset.pdkAppWindow || activeDetail.appId || '' : activeDetail.appId || '',
				folderId: activeWindow.dataset ? activeWindow.dataset.pdkFolderWindow || activeWindow.dataset.pdkFolderInfoWindow || activeDetail.folderId || '' : activeDetail.folderId || '',
				id: activeWindow.dataset ? activeWindow.dataset.pdkFolderWindow || activeWindow.dataset.pdkFolderInfoWindow || activeWindow.dataset.pdkAppWindow || activeDetail.id || '' : activeDetail.id || '',
				kind: activeWindow.dataset ? activeWindow.dataset.pdkWindowKind || activeDetail.kind : activeDetail.kind,
				title: activeWindow.dataset ? activeWindow.dataset.pdkWindowTitle || activeDetail.title || '' : activeDetail.title || '',
				windowElement: activeWindow,
				windowId: activeWindow.dataset ? activeWindow.dataset.pdkWindowId || activeDetail.windowId || '' : activeDetail.windowId || ''
			})
			: getDesktopSelectionDetail(controllerContext);
		const editable = isEditableTarget(target);
		const modal = isModalTarget(target);
		const contexts = new Set([shortcutContexts.GLOBAL]);

		if (editable) {
			contexts.add(shortcutContexts.INPUT_FOCUSED);
		}

		if (modal) {
			contexts.add(shortcutContexts.MODAL);
		}

		if (activeWindow) {
			contexts.add(shortcutContexts.WINDOW);
			if (detail.folderId || detail.kind === folderWindowKind) {
				contexts.add(shortcutContexts.FOLDER);
			}
			if (target && typeof target.closest === 'function' && target.closest('[data-pdk-folder-tab]')) {
				contexts.add(shortcutContexts.FOLDER_TAB);
			}
		} else {
			contexts.add(shortcutContexts.DESKTOP);
		}

		if (target && typeof target.closest === 'function' && target.closest('[data-pdk-search]')) {
			contexts.add(shortcutContexts.COMMAND_PALETTE);
		}

		return {
			contexts,
			detail: Object.assign({}, detail, {
				event,
				eventTarget: target,
				shortcutContexts: Array.from(contexts)
			}),
			editable,
			event,
			keyCombo: getEventCombo(event),
			modal,
			target
		};
	}

	function getContextScore(definition) {
		return definition.contexts.reduce((score, context) => Math.max(score, contextWeights[context] || 0), 0);
	}

	function createShortcutResolver(options = {}) {
		const registry = options.registry || null;
		const commands = options.commands || null;

		function isInputSafe(definition, executionContext) {
			if (!executionContext.editable) {
				return true;
			}

			return definition.allowInTextFields === true || definition.contexts.includes(shortcutContexts.INPUT_FOCUSED);
		}

		function isEnabled(definition, executionContext) {
			if (definition.enabledWhen && !definition.enabledWhen(executionContext)) {
				return false;
			}

			return Boolean(
				commands
				&& typeof commands.canExecute === 'function'
				&& commands.canExecute(definition.commandItem, executionContext.detail)
			);
		}

		function resolve(event, executionContext) {
			const combo = executionContext.keyCombo;

			if (!combo || !registry) {
				return null;
			}

			const matches = registry.getDefinitions()
				.filter((definition) => (
					definition.combo === combo
					&& contextMatches(definition, executionContext)
					&& isInputSafe(definition, executionContext)
					&& isEnabled(definition, executionContext)
				))
				.sort((first, second) => {
					const layer = (layerWeights[second.layer] || 0) - (layerWeights[first.layer] || 0);
					if (layer) {
						return layer;
					}

					const priority = (second.priority || 0) - (first.priority || 0);
					if (priority) {
						return priority;
					}

					return getContextScore(second) - getContextScore(first);
				});

			return matches[0] || null;
		}

		return {
			resolve
		};
	}

	function createShortcutManager(shell, options = {}) {
		const commands = options.commands || null;
		const registry = options.registry || null;
		const resolver = options.resolver || createShortcutResolver({
			commands,
			registry
		});
		const menuController = options.menuController || null;
		const domEventNames = window.PufferDesk.events && window.PufferDesk.events.domNames ? window.PufferDesk.events.domNames : {};
		let bound = false;

		function execute(definition, executionContext) {
			if (!commands || typeof commands.execute !== 'function') {
				return false;
			}

			if (definition.preventDefault && executionContext.event) {
				executionContext.event.preventDefault();
				executionContext.event.stopPropagation();
			}

			if (menuController && typeof menuController.closePopover === 'function') {
				menuController.closePopover();
			}

			const didExecute = commands.execute(definition.commandItem, executionContext.detail);

			shell.dispatchEvent(new window.CustomEvent(domEventNames.SHORTCUT_EXECUTE, {
				detail: {
					command: definition.command,
					contexts: executionContext.detail.shortcutContexts || [],
					id: definition.id,
					key: definition.key,
					label: definition.displayLabel,
					modifiers: definition.modifiers
				}
			}));

			return didExecute;
		}

		function onKeyDown(event) {
			if (event.defaultPrevented || event.isComposing) {
				return;
			}

			const executionContext = createShortcutExecutionContext(event, options);
			const definition = resolver.resolve(event, executionContext);

			if (!definition) {
				return;
			}

			execute(definition, executionContext);
		}

		function bind() {
			if (bound || !commands || !registry) {
				return;
			}

			document.addEventListener('keydown', onKeyDown);
			bound = true;
		}

		function unbind() {
			if (!bound) {
				return;
			}

			document.removeEventListener('keydown', onKeyDown);
			bound = false;
		}

		return {
			bind,
			unbind
		};
	}

	function getDefaultShortcutDefinitions(config = {}) {
		const commandIds = (window.PufferDesk.shell && window.PufferDesk.shell.commands) || {};
		const appIds = window.PufferDesk.apps && window.PufferDesk.apps.ids ? window.PufferDesk.apps.ids : {};
		const labels = getMenuLabels(config);
		const contextTargets = window.PufferDesk.shell && window.PufferDesk.shell.contextMenuConstants
			? window.PufferDesk.shell.contextMenuConstants.targets || {}
			: {};
		const trashId = appIds.TRASH;
		const settingsId = appIds.OS_SETTINGS;

		return [
			{
				combo: 'primary+secondary+k',
				command: commandIds.SHELL_FOCUS_SEARCH,
				contexts: [shortcutContexts.GLOBAL],
				id: commandIds.SHELL_FOCUS_SEARCH,
				label: getMenuLabel(labels, 'search')
			},
			{
				combo: 'primary+,',
				command: commandIds.OPEN_APP,
				contexts: [shortcutContexts.GLOBAL],
				id: 'settings.open',
				label: getMenuLabel(labels, 'system_settings'),
				target: settingsId
			},
			{
				combo: 'primary+secondary+n',
				command: commandIds.FOLDER_CREATE,
				contexts: [shortcutContexts.DESKTOP, shortcutContexts.FOLDER],
				id: commandIds.FOLDER_CREATE,
				label: getMenuLabel(labels, 'new_folder')
			},
			{
				combo: 'primary+x',
				command: commandIds.CLIPBOARD_CUT,
				contexts: [shortcutContexts.DESKTOP, shortcutContexts.FOLDER],
				id: commandIds.CLIPBOARD_CUT,
				label: getMenuLabel(labels, 'cut')
			},
			{
				combo: 'primary+c',
				command: commandIds.CLIPBOARD_COPY,
				contexts: [shortcutContexts.DESKTOP, shortcutContexts.FOLDER],
				id: commandIds.CLIPBOARD_COPY,
				label: getMenuLabel(labels, 'copy')
			},
			{
				combo: 'primary+v',
				command: commandIds.CLIPBOARD_PASTE,
				contexts: [shortcutContexts.DESKTOP, shortcutContexts.FOLDER],
				id: commandIds.CLIPBOARD_PASTE,
				label: getMenuLabel(labels, 'paste')
			},
			{
				combo: 'delete',
				command: commandIds.FOLDER_DELETE_SELECTED,
				contexts: [shortcutContexts.FOLDER],
				id: commandIds.FOLDER_DELETE_SELECTED,
				label: getMenuLabel(labels, 'delete'),
				allowBare: true
			},
			{
				combo: 'delete',
				command: commandIds.FOLDER_DELETE,
				contexts: [shortcutContexts.DESKTOP],
				enabledWhen(executionContext) {
					const detail = executionContext.detail || {};

					return detail.type === contextTargets.DESKTOP_FOLDER && detail.id !== trashId;
				},
				id: 'desktop.delete-selected-folder',
				label: getMenuLabel(labels, 'move_to_trash'),
				allowBare: true
			},
			{
				allowReserved: true,
				combo: 'primary+w',
				command: commandIds.WINDOW_CLOSE,
				contexts: [shortcutContexts.WINDOW, shortcutContexts.FOLDER_TAB],
				id: commandIds.WINDOW_CLOSE,
				label: getMenuLabel(labels, 'window_close'),
				reservedReason: getMenuLabel(labels, 'shortcut_reserved_window_reason')
			},
			{
				allowReserved: true,
				combo: 'primary+m',
				command: commandIds.WINDOW_MINIMIZE,
				contexts: [shortcutContexts.WINDOW],
				id: commandIds.WINDOW_MINIMIZE,
				label: getMenuLabel(labels, 'window_minimize'),
				reservedReason: getMenuLabel(labels, 'shortcut_reserved_window_reason')
			},
			{
				combo: 'primary+shift+backspace',
				command: commandIds.TRASH_EMPTY,
				contexts: [shortcutContexts.DESKTOP, shortcutContexts.FOLDER],
				id: commandIds.TRASH_EMPTY,
				label: getMenuLabel(labels, 'empty_trash')
			}
		].filter((definition) => definition.command);
	}

	function flattenMenuShortcutItems(items, result, context, sourcePath) {
		(Array.isArray(items) ? items : []).forEach((item, index) => {
			if (!item || item.type === 'separator' || item.disabled) {
				return;
			}

			const path = `${sourcePath}.${index}`;
			if (item.command && item.shortcut) {
				result.push(Object.assign({}, item, {
					contexts: item.shortcut && item.shortcut.contexts ? item.shortcut.contexts : [context],
					id: `menu:${path}:${item.id || item.command || item.label}`,
					shortcut: item.shortcut,
					source: 'menu'
				}));
			}

			if (Array.isArray(item.items) && item.items.length) {
				flattenMenuShortcutItems(item.items, result, context, path);
			}
		});
	}

	function getMenuContext(menuController) {
		const detail = menuController && typeof menuController.getActiveDetail === 'function'
			? menuController.getActiveDetail()
			: {};

		if (!detail || !detail.kind || detail.kind === shortcutContexts.DESKTOP) {
			return shortcutContexts.DESKTOP;
		}

		if (detail.folderId || detail.kind === folderWindowKind) {
			return shortcutContexts.FOLDER;
		}

		return shortcutContexts.WINDOW;
	}

	function getMenuShortcutDefinitions(menuController) {
		const definition = menuController && typeof menuController.getMenuDefinition === 'function'
			? menuController.getMenuDefinition()
			: null;
		const result = [];
		const context = getMenuContext(menuController);

		if (!definition) {
			return result;
		}

		if (definition.system && Array.isArray(definition.system.items)) {
			flattenMenuShortcutItems(definition.system.items, result, shortcutContexts.GLOBAL, 'system');
		}

		(Array.isArray(definition.groups) ? definition.groups : []).forEach((group, index) => {
			flattenMenuShortcutItems(group.items, result, context, `group.${group.id || index}`);
		});

		return result;
	}

	window.PufferDesk.shortcuts.contexts = shortcutContexts;
	window.PufferDesk.shortcuts.createConflictChecker = createShortcutConflictChecker;
	window.PufferDesk.shortcuts.createManager = createShortcutManager;
	window.PufferDesk.shortcuts.createRegistry = createShortcutRegistry;
	window.PufferDesk.shortcuts.createResolver = createShortcutResolver;
	window.PufferDesk.shortcuts.createSettings = createShortcutSettings;
	window.PufferDesk.shortcuts.format = formatShortcut;
	window.PufferDesk.shortcuts.normalize = normalizeShortcutDefinition;

	window.PufferDesk.shell.shortcutContexts = shortcutContexts;
	window.PufferDesk.shell.formatShortcutLabel = formatShortcut;
	window.PufferDesk.shell.createShortcutController = function createShortcutController(shell, context = {}) {
		const config = context.config || (window.PufferDesk.config && typeof window.PufferDesk.config.get === 'function' ? window.PufferDesk.config.get() : {});
		const commands = context.commands || null;
		const menuController = context.menuController || null;
		const defaults = getDefaultShortcutDefinitions(config);
		const conflictChecker = createShortcutConflictChecker();
		const registry = createShortcutRegistry({
			conflictChecker
		});
		const settings = createShortcutSettings(config, defaults);
		const resolver = createShortcutResolver({
			commands,
			registry
		});
		const manager = createShortcutManager(shell, Object.assign({}, context, {
			commands,
			registry,
			resolver
		}));
		let bound = false;

		function refreshMenuShortcuts() {
			if (!menuController) {
				return [];
			}

			return registry.replaceSource('menu', getMenuShortcutDefinitions(menuController), {
				source: 'menu'
			});
		}

		registry.registerMany(settings.getDefaultDefinitions(), {
			source: 'default'
		});
		registry.registerMany(settings.getCustomDefinitions(), {
			layer: 'custom',
			source: 'custom'
		});

		function bind() {
			if (bound) {
				return;
			}

			refreshMenuShortcuts();
			if (shell && window.PufferDesk.events && window.PufferDesk.events.domNames) {
				shell.addEventListener(window.PufferDesk.events.domNames.ACTIVE_WINDOW_CHANGE, refreshMenuShortcuts);
			}
			manager.bind();
			bound = true;
		}

		function register(definition, options = {}) {
			return registry.register(definition, options);
		}

		return {
			bind,
			conflictChecker,
			formatShortcut,
			getConflicts: registry.getConflicts,
			getShortcuts() {
				return registry.getDefinitions().map((definition) => ({
					action: definition.label || definition.title || definition.command,
					command: definition.command,
					contexts: definition.contexts.slice(),
					id: definition.id,
					key: definition.key,
					label: definition.label || definition.title || definition.command,
					modifiers: definition.modifiers.slice(),
					shortcut: definition.displayLabel,
					source: definition.source,
					title: definition.title || definition.label || ''
				}));
			},
			manager,
			normalizeShortcut(definition) {
				return normalizeShortcutDefinition(definition);
			},
			refreshMenuShortcuts,
			register,
			registry,
			resolver,
			settings
		};
	};
})();
