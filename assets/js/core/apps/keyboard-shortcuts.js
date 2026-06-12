(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};

	const shortcutContexts = window.PufferDesk.shell && window.PufferDesk.shell.shortcutContexts
		? window.PufferDesk.shell.shortcutContexts
		: {};
	const contextOrder = [
		'global',
		'desktop',
		'desktop-folders',
		'windows',
		'folders',
		'folder-tabs',
		'text-editing',
		'dialogs',
		'search',
		'other'
	];
	const contextLabelKeys = {
		dialogs: 'keyboard_shortcuts_dialogs',
		desktop: 'keyboard_shortcuts_desktop',
		'desktop-folders': 'keyboard_shortcuts_desktop_folders',
		'folder-tabs': 'keyboard_shortcuts_folder_tabs',
		folders: 'keyboard_shortcuts_folders',
		global: 'keyboard_shortcuts_global',
		other: 'keyboard_shortcuts_other',
		search: 'keyboard_shortcuts_search',
		'text-editing': 'keyboard_shortcuts_text_editing',
		windows: 'keyboard_shortcuts_windows'
	};

	function getLabels(config = {}) {
		const menu = config.menu && typeof config.menu === 'object' ? config.menu : {};

		return menu.labels && typeof menu.labels === 'object' ? menu.labels : {};
	}

	function getLabel(labels, key, fallback) {
		const value = labels[key];

		return typeof value === 'string' && value ? value : fallback;
	}

	function getContextLabel(labels, groupId) {
		return getLabel(labels, contextLabelKeys[groupId] || '', groupId);
	}

	function getShortcutController() {
		return window.PufferDesk.shortcutController
			&& typeof window.PufferDesk.shortcutController.getShortcuts === 'function'
			? window.PufferDesk.shortcutController
			: null;
	}

	function getShortcutItems() {
		const controller = getShortcutController();

		return controller ? controller.getShortcuts() : [];
	}

	function unique(values) {
		const seen = new Set();

		return values.filter((value) => {
			const normalized = String(value || '').trim();

			if (!normalized || seen.has(normalized)) {
				return false;
			}

			seen.add(normalized);
			return true;
		});
	}

	function normalizeItem(item) {
		const contexts = unique(Array.isArray(item.contexts) ? item.contexts : []);
		const action = String(item.action || item.label || item.title || item.command || '').trim();
		const shortcut = String(item.shortcut || '').trim();

		if (!action || !shortcut) {
			return null;
		}

		return {
			action,
			command: String(item.command || '').trim(),
			contexts,
			id: String(item.id || '').trim(),
			shortcut,
			source: String(item.source || '').trim()
		};
	}

	function mergeShortcutItems(items) {
		const merged = new Map();

		(Array.isArray(items) ? items : []).forEach((item) => {
			const normalized = normalizeItem(item);

			if (!normalized) {
				return;
			}

			const key = [normalized.command, normalized.shortcut].join('|');
			const existing = merged.get(key);

			if (existing) {
				existing.contexts = unique(existing.contexts.concat(normalized.contexts));
				if (existing.source === 'menu' && normalized.source !== 'menu') {
					existing.action = normalized.action;
					existing.id = normalized.id;
					existing.source = normalized.source;
				}
				return;
			}

			merged.set(key, normalized);
		});

		return Array.from(merged.values());
	}

	function getGroupId(item) {
		const contexts = new Set(item.contexts || []);

		if (contexts.has(shortcutContexts.INPUT_FOCUSED)) {
			return 'text-editing';
		}

		if (contexts.has(shortcutContexts.COMMAND_PALETTE)) {
			return 'search';
		}

		if (contexts.has(shortcutContexts.FOLDER_TAB)) {
			return 'folder-tabs';
		}

		if (contexts.has(shortcutContexts.FOLDER) && contexts.has(shortcutContexts.DESKTOP)) {
			return 'desktop-folders';
		}

		if (contexts.has(shortcutContexts.FOLDER)) {
			return 'folders';
		}

		if (contexts.has(shortcutContexts.WINDOW)) {
			return 'windows';
		}

		if (contexts.has(shortcutContexts.DESKTOP)) {
			return 'desktop';
		}

		if (contexts.has(shortcutContexts.MODAL)) {
			return 'dialogs';
		}

		return contexts.has(shortcutContexts.GLOBAL) ? 'global' : 'other';
	}

	function groupShortcuts(items) {
		const groups = new Map(contextOrder.map((id) => [id, []]));

		items.forEach((item) => {
			const groupId = getGroupId(item);

			if (!groups.has(groupId)) {
				groups.set(groupId, []);
			}

			groups.get(groupId).push(item);
		});

		groups.forEach((groupItems) => {
			groupItems.sort((first, second) => first.action.localeCompare(second.action));
		});

		return groups;
	}

	function matchesQuery(item, groupLabel, query) {
		if (!query) {
			return true;
		}

		return [
			item.action,
			item.command,
			item.shortcut,
			groupLabel
		].join(' ').toLowerCase().includes(query);
	}

	function createShortcutPill(shortcut) {
		const pill = document.createElement('kbd');
		pill.className = 'pdk-keyboard-shortcuts-key';
		pill.textContent = shortcut;

		return pill;
	}

	function closeParentWindow(root) {
		const win = root && typeof root.closest === 'function' ? root.closest('.pdk-window') : null;
		const api = window.PufferDesk.desktopApi || (window.PufferDesk.desktop && window.PufferDesk.desktop.api);

		if (api && api.windows && typeof api.windows.close === 'function' && api.windows.close(win)) {
			return true;
		}

		if (win) {
			win.remove();
			return true;
		}

		return false;
	}

	function bindOutsideClose(root) {
		let bound = false;

		function unbind() {
			if (!bound) {
				return;
			}

			document.removeEventListener('pointerdown', onPointerDown, true);
			bound = false;
		}

		function onPointerDown(event) {
			const win = root && typeof root.closest === 'function' ? root.closest('.pdk-window') : null;
			const target = event && event.target;

			if (!win || !win.isConnected) {
				unbind();
				return;
			}

			if (target && win.contains(target)) {
				return;
			}

			unbind();
			closeParentWindow(root);
		}

		window.setTimeout(() => {
			if (!root || !root.isConnected) {
				return;
			}

			document.addEventListener('pointerdown', onPointerDown, true);
			bound = true;
		}, 0);

		return unbind;
	}

	function createRow(item) {
		const row = document.createElement('div');
		const label = document.createElement('span');
		const keys = document.createElement('span');

		row.className = 'pdk-keyboard-shortcuts-row';
		label.className = 'pdk-keyboard-shortcuts-action';
		label.textContent = item.action;
		keys.className = 'pdk-keyboard-shortcuts-keys';
		keys.appendChild(createShortcutPill(item.shortcut));
		row.append(label, keys);

		return row;
	}

	window.PufferDesk.apps.createKeyboardShortcutsApp = function createKeyboardShortcutsApp(context = {}) {
		const config = context.config || (window.PufferDesk.config && typeof window.PufferDesk.config.get === 'function' ? window.PufferDesk.config.get() : {});
		const labels = getLabels(config);
		const root = document.createElement('div');
		const header = document.createElement('header');
		const title = document.createElement('h1');
		const closeButton = document.createElement('button');
		const searchWrap = document.createElement('div');
		const search = document.createElement('input');
		const clearSearchButton = document.createElement('button');
		const list = document.createElement('div');
		const empty = document.createElement('p');
		const shortcuts = mergeShortcutItems(getShortcutItems());
		let query = '';

		root.className = 'pdk-keyboard-shortcuts';
		header.className = 'pdk-keyboard-shortcuts-header';
		header.dataset.pdkDragHandle = '1';
		title.className = 'pdk-keyboard-shortcuts-title';
		title.textContent = getLabel(labels, 'keyboard_shortcuts_title', 'keyboard_shortcuts_title');

		closeButton.className = 'pdk-keyboard-shortcuts-close';
		closeButton.type = 'button';
		closeButton.setAttribute('aria-label', getLabel(labels, 'window_close', 'window_close'));
		closeButton.textContent = '×';
		closeButton.addEventListener('click', () => closeParentWindow(root));

		searchWrap.className = 'pdk-keyboard-shortcuts-search-wrap';
		search.className = 'pdk-keyboard-shortcuts-search';
		search.type = 'search';
		search.autocomplete = 'off';
		search.spellcheck = false;
		search.placeholder = getLabel(labels, 'keyboard_shortcuts_search_placeholder', 'keyboard_shortcuts_search_placeholder');
		search.setAttribute('aria-label', search.placeholder);

		clearSearchButton.className = 'pdk-keyboard-shortcuts-search-clear';
		clearSearchButton.type = 'button';
		clearSearchButton.hidden = true;
		clearSearchButton.setAttribute('aria-label', getLabel(labels, 'keyboard_shortcuts_clear_search', 'keyboard_shortcuts_clear_search'));
		clearSearchButton.textContent = '×';
		clearSearchButton.addEventListener('click', () => {
			search.value = '';
			query = '';
			clearSearchButton.hidden = true;
			render();
			search.focus();
		});

		list.className = 'pdk-keyboard-shortcuts-list';
		empty.className = 'pdk-keyboard-shortcuts-empty';
		empty.textContent = getLabel(labels, 'keyboard_shortcuts_no_results', 'keyboard_shortcuts_no_results');

		function render() {
			const groups = groupShortcuts(shortcuts);
			let rendered = 0;

			list.replaceChildren();
			contextOrder.forEach((groupId) => {
				const groupLabel = getContextLabel(labels, groupId);
				const rows = (groups.get(groupId) || []).filter((item) => matchesQuery(item, groupLabel, query));

				if (!rows.length) {
					return;
				}

				const section = document.createElement('section');
				const heading = document.createElement('h2');
				const body = document.createElement('div');

				section.className = 'pdk-keyboard-shortcuts-section';
				heading.className = 'pdk-keyboard-shortcuts-heading';
				heading.textContent = groupLabel;
				body.className = 'pdk-keyboard-shortcuts-group';
				rows.forEach((item) => body.appendChild(createRow(item)));
				section.append(heading, body);
				list.appendChild(section);
				rendered += rows.length;
			});

			empty.hidden = rendered > 0;
		}

		search.addEventListener('input', () => {
			query = search.value.trim().toLowerCase();
			clearSearchButton.hidden = !search.value;
			render();
		});

		header.append(title, closeButton);
		searchWrap.append(search, clearSearchButton);
		root.append(header, searchWrap, list, empty);
		render();
		window.setTimeout(() => search.focus(), 0);
		bindOutsideClose(root);

		return root;
	};
})();
