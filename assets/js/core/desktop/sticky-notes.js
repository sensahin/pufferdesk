(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.desktop = window.PufferDesk.desktop || {};

	function toNumber(value, fallback) {
		const parsed = Number.parseInt(value, 10);

		return Number.isFinite(parsed) ? parsed : fallback;
	}

	function getLabels(config = {}) {
		const documents = config.documents && typeof config.documents === 'object' ? config.documents : {};

		return documents.labels && typeof documents.labels === 'object' ? documents.labels : {};
	}

	window.PufferDesk.desktop.createStickyNoteManager = function createStickyNoteManager(shell, options = {}) {
		const config = options.config || (window.PufferDesk.config ? window.PufferDesk.config.get() : {});
		const labels = getLabels(config);
		const desktop = shell ? shell.querySelector('.pdk-desktop') : null;
		const documentStore = options.documentStore || (window.PufferDesk.documents ? window.PufferDesk.documents.createDocumentStore(config) : null);
		const dragDropManager = options.dragDropManager || window.PufferDesk.dragDropManager || null;
		const dragDropConstants = window.PufferDesk.dragDrop && window.PufferDesk.dragDrop.constants ? window.PufferDesk.dragDrop.constants : {};
		const dragDropModels = window.PufferDesk.dragDrop && window.PufferDesk.dragDrop.models ? window.PufferDesk.dragDrop.models : null;
		const containerTypes = dragDropConstants.containerTypes || {};
		const itemTypes = dragDropConstants.itemTypes || {};
		const virtualFilesystem = window.PufferDesk.virtualFilesystem && typeof window.PufferDesk.virtualFilesystem.create === 'function'
			? window.PufferDesk.virtualFilesystem.create(config)
			: null;
		const sessionStore = window.PufferDesk.session && typeof window.PufferDesk.session.createSessionStore === 'function'
			? window.PufferDesk.session.createSessionStore(options.storageKey || config.storageKey || '')
			: null;
		const geometry = window.PufferDesk.geometry || {};
		const createDebouncedTask = window.PufferDesk.services && window.PufferDesk.services.createDebouncedTask
			? window.PufferDesk.services.createDebouncedTask
			: null;
		const runningState = window.PufferDesk.apps && window.PufferDesk.apps.runningState
			? window.PufferDesk.apps.runningState
			: null;
		const appIds = window.PufferDesk.apps && window.PufferDesk.apps.ids ? window.PufferDesk.apps.ids : {};
		const contextTargets = window.PufferDesk.shell && window.PufferDesk.shell.contextMenuConstants
			? window.PufferDesk.shell.contextMenuConstants.targets || {}
			: {};
		const eventNames = window.PufferDesk.events && window.PufferDesk.events.names ? window.PufferDesk.events.names : {};
		const workspaceSections = window.PufferDesk.session && window.PufferDesk.session.workspace
			? window.PufferDesk.session.workspace.sections || {}
			: {};
		const domEventNames = window.PufferDesk.events && window.PufferDesk.events.domNames ? window.PufferDesk.events.domNames : {};
		const stickyFullscreenSourceId = 'sticky-note:active';
		const richText = window.PufferDesk.richText || null;
		const titlebarActions = window.PufferDesk.windows && window.PufferDesk.windows.titlebarActions
			? window.PufferDesk.windows.titlebarActions
			: null;
		const commandIds = window.PufferDesk.shell && window.PufferDesk.shell.commands ? window.PufferDesk.shell.commands : {};
		const menuLabels = config.menu && config.menu.labels && typeof config.menu.labels === 'object' ? config.menu.labels : {};
		const menuGroups = config.contracts && config.contracts.menuGroups && typeof config.contracts.menuGroups === 'object'
			? config.contracts.menuGroups
			: {};
		const menuGroupIds = menuGroups.ids && typeof menuGroups.ids === 'object' ? menuGroups.ids : {};
		const stickyResizeHandles = window.PufferDesk.windows && typeof window.PufferDesk.windows.createResizeHandleController === 'function'
			? window.PufferDesk.windows.createResizeHandleController({
				container: desktop,
				focusElement: bringToFront,
				isResizeDisabled: (noteElement) => noteElement.hidden
					|| noteElement.classList.contains('is-collapsed')
					|| noteElement.classList.contains('is-fullscreen'),
				onResizeStart: closeNoteOptionsMenu,
				onResizeEnd(noteElement, detail = {}) {
					if (!detail.changed) {
						return;
					}

					constrainNoteElement(noteElement);
					noteElement.dataset.pdkExpandedHeight = String(Math.max(getStickyExpandedMinHeight(), Math.round(noteElement.offsetHeight || 0)));
					saveLayout();
				},
				syncSafeArea: () => getStickySafeArea()
			})
			: null;
		const stickyNotesAppId = appIds.STICKY_NOTES;
		const stickySavePolicyAsk = 'ask-on-first-save';
		const noteMap = new Map();
		let knownDocuments = [];
		let layer = null;
		let openOptionsMenu = null;
		let restorePromise = null;
		let highestZ = 40;
		let transientNoteId = 0;
		let activeDocumentDropTarget = null;

		function isRedmondTheme() {
			const theme = config.theme && typeof config.theme === 'object' ? config.theme : {};

			return theme.family === 'redmond';
		}

		function isPufferDeskTheme() {
			const theme = config.theme && typeof config.theme === 'object' ? config.theme : {};
			const user = config.user && typeof config.user === 'object' ? config.user : {};

			return theme.family === 'pufferdesk' || theme.id === 'pufferdesk/default' || user.themeId === 'pufferdesk/default';
		}

		function getStickyKind() {
			return documentStore && documentStore.kinds ? documentStore.kinds.sticky : '';
		}

		function getStickySavePolicy() {
			const documents = config.documents && typeof config.documents === 'object' ? config.documents : {};
			const savePolicies = documents.savePolicies && typeof documents.savePolicies === 'object' ? documents.savePolicies : {};
			const policy = typeof savePolicies.stickyNote === 'string' ? savePolicies.stickyNote : '';

			return policy || 'default-location';
		}

		function shouldAskOnFirstSave() {
			return getStickySavePolicy() === stickySavePolicyAsk;
		}

		function isPersistedDocumentId(documentId) {
			const id = Number.parseInt(documentId, 10);

			return Number.isFinite(id) && id > 0;
		}

		function isUnsavedEntry(entry) {
			return Boolean(entry && entry.unsaved === true) || !isPersistedDocumentId(entry && entry.document ? entry.document.id : 0);
		}

		function createTransientDocument(overrides = {}) {
			transientNoteId -= 1;

			return Object.assign({
				authorId: Number.parseInt(config.userId, 10) || 0,
				color: 'yellow',
				content: '',
				created: new Date().toISOString(),
				format: 'html',
				id: transientNoteId,
				kind: getStickyKind(),
				modified: '',
				parentPath: '',
				path: '',
				title: getLabel('stickyNote')
			}, overrides);
		}

		function getStickyNotesApp() {
			const apps = Array.isArray(config.apps) ? config.apps : [];

			return apps.find((app) => app && app.id === stickyNotesAppId) || null;
		}

		function getStickyNotesAppLabel() {
			const app = getStickyNotesApp();

			return app && typeof app.label === 'string' && app.label ? app.label : getLabel('stickyNotes');
		}

		function getMenuLabel(key, fallback) {
			return typeof menuLabels[key] === 'string' && menuLabels[key] ? menuLabels[key] : (fallback || key);
		}

		function cloneMenuItem(item) {
			const next = item && typeof item === 'object' ? Object.assign({}, item) : item;
			if (next && Array.isArray(next.items)) {
				next.items = next.items.map(cloneMenuItem);
			}

			return next;
		}

		function createNewNoteMenuItem() {
			return {
				command: commandIds.DOCUMENT_NEW_STICKY_NOTE,
				icon: 'dashicons-sticky',
				id: 'sticky-notes-new-note',
				label: getMenuLabel('new_note', getLabel('newStickyNote'))
			};
		}

		function getStickyNotesActiveMenu(app) {
			const menu = app && app.menu && typeof app.menu === 'object' ? app.menu : null;
			if (!menu || !Array.isArray(menu.groups) || !commandIds.DOCUMENT_NEW_STICKY_NOTE) {
				return menu;
			}

			const fileGroupId = menuGroupIds.FILE || 'file';
			let hasFileGroup = false;
			let hasNewNoteItem = false;
			const groups = menu.groups.map((group) => {
				const nextGroup = Object.assign({}, group);
				const items = Array.isArray(group.items) ? group.items.map(cloneMenuItem) : [];

				if (group.id === fileGroupId) {
					hasFileGroup = true;
					hasNewNoteItem = items.some((item) => item && item.command === commandIds.DOCUMENT_NEW_STICKY_NOTE);
					nextGroup.items = hasNewNoteItem ? items : [createNewNoteMenuItem()].concat(items);
				} else {
					nextGroup.items = items;
				}

				return nextGroup;
			});

			if (!hasFileGroup) {
				groups.push({
					id: fileGroupId,
					items: [createNewNoteMenuItem()],
					label: getMenuLabel('file', 'File')
				});
			}

			return Object.assign({}, menu, {
				groups
			});
		}

		function dispatchActiveStickyNoteChange(entry) {
			const app = getStickyNotesApp();

			shell.dispatchEvent(new window.CustomEvent(domEventNames.ACTIVE_WINDOW_CHANGE, {
				detail: {
					appId: stickyNotesAppId,
					documentId: entry && entry.document ? entry.document.id : '',
					id: stickyNotesAppId,
					kind: 'app',
					menu: getStickyNotesActiveMenu(app),
					stickyNoteElement: entry && entry.element ? entry.element : null,
					title: getStickyNotesAppLabel(),
					windowless: true
				}
			}));
		}

		function getDialogs() {
			return options.dialogs || window.PufferDesk.shellDialogs || null;
		}

		function hasOpenNotes() {
			return Array.from(noteMap.values()).some((entry) => entry && entry.element && !entry.element.hidden);
		}

		function hasHiddenNotes() {
			return Array.from(noteMap.values()).some((entry) => entry && entry.element && entry.element.hidden);
		}

		function getFirstNoteEntry(options = {}) {
			const hiddenOnly = options.hiddenOnly === true;

			return Array.from(noteMap.values()).find((entry) => (
				entry
				&& entry.element
				&& (!hiddenOnly || entry.element.hidden)
			)) || null;
		}

		function syncRunningState() {
			if (runningState && typeof runningState.setExternal === 'function') {
				runningState.setExternal(stickyNotesAppId, hasOpenNotes(), {
					shell,
					source: 'sticky-notes'
				});
			}
		}

		function getLabel(key, fallback) {
			return typeof labels[key] === 'string' && labels[key] ? labels[key] : (fallback || key);
		}

		function clamp(value, min, max) {
			return geometry && typeof geometry.clamp === 'function'
				? geometry.clamp(value, min, max)
				: Math.min(Math.max(min, value), Math.max(min, max));
		}

		function getCssPixelValue(name, fallback) {
			if (geometry && typeof geometry.readCssPixel === 'function') {
				return geometry.readCssPixel(shell, name, fallback);
			}

			const styles = shell ? window.getComputedStyle(shell) : null;
			const raw = styles ? styles.getPropertyValue(name) : '';
			const parsed = Number.parseFloat(raw);

			return Number.isFinite(parsed) ? parsed : fallback;
		}

		function getStickyDimension(name, fallback) {
			const value = Math.round(getCssPixelValue(name, fallback));

			return Number.isFinite(value) && value > 0 ? value : fallback;
		}

		function getDefaultStickyWidth(redmond = isRedmondTheme()) {
			return getStickyDimension('--pdk-sticky-note-default-width', redmond ? 305 : 360);
		}

		function getDefaultStickyHeight(redmond = isRedmondTheme()) {
			return getStickyDimension('--pdk-sticky-note-default-height', redmond ? 254 : 285);
		}

		function getStickyMinWidth() {
			return getStickyDimension('--pdk-sticky-note-min-width', 180);
		}

		function getStickyMinHeight() {
			return getStickyDimension('--pdk-sticky-note-min-height', 140);
		}

		function getStickyExpandedMinHeight() {
			return Math.max(getStickyMinHeight(), getStickyDimension('--pdk-sticky-note-expanded-min-height', 140));
		}

		function getStickyCollapsedMinHeight() {
			return getStickyDimension('--pdk-sticky-note-collapsed-min-height', 24);
		}

		function getMenuBarHeight() {
			const menuBar = shell ? shell.querySelector('.pdk-menu-bar') : null;

			if (!menuBar || shell.dataset.pdkShellTopBar === 'none' || shell.dataset.pdkMenuBarHidden === '1') {
				return 0;
			}

			return Math.ceil(menuBar.getBoundingClientRect().height);
		}

		function getTopFullscreenEntry(preferredElement = null) {
			const entries = Array.from(noteMap.values()).filter((entry) => (
				entry
				&& entry.element
				&& !entry.element.hidden
			));

			if (preferredElement) {
				const preferred = entries.find((entry) => entry.element === preferredElement);

				return preferred && preferred.element.classList.contains('is-fullscreen') ? preferred : null;
			}

			const topEntry = entries.sort((first, second) => (
				toNumber(second.element.style.zIndex, 0) - toNumber(first.element.style.zIndex, 0)
			))[0] || null;

			return topEntry && topEntry.element.classList.contains('is-fullscreen') ? topEntry : null;
		}

		function syncStickyFullscreenSource(preferredElement = null) {
			const menuBar = window.PufferDesk.menuBar || null;
			if (!menuBar || typeof menuBar.setFullscreenSource !== 'function') {
				return false;
			}

			const entry = getTopFullscreenEntry(preferredElement);
			return menuBar.setFullscreenSource(shell, stickyFullscreenSourceId, Boolean(entry), {
				documentId: entry && entry.document ? String(entry.document.id) : '',
				source: 'sticky-note',
				stickyNoteElement: entry ? entry.element : null
			});
		}

		function getStickySafeTop(edge) {
			const absoluteTop = getCssPixelValue('--pdk-sticky-note-safe-top', Number.NaN);
			const desktopObjectTop = getCssPixelValue('--pdk-desktop-object-layer-top', Number.NaN);

			if (Number.isFinite(absoluteTop)) {
				return Math.max(0, absoluteTop);
			}

			if (Number.isFinite(desktopObjectTop)) {
				return Math.max(0, desktopObjectTop);
			}

			const topOffset = getCssPixelValue('--pdk-sticky-note-safe-top-offset', edge);

			return Math.max(0, getMenuBarHeight() + topOffset);
		}

		function getStickySafeArea() {
			const edge = Math.max(0, getCssPixelValue('--pdk-window-safe-edge', 8));

			return {
				bottom: edge,
				left: edge,
				right: edge,
				top: getStickySafeTop(edge)
			};
		}

		function getStickyFullscreenSafeArea() {
			const edge = Math.max(0, getCssPixelValue('--pdk-window-safe-edge', 8));

			return {
				bottom: edge,
				left: edge,
				right: edge,
				top: shell.dataset.pdkMenuBarHidden === '1' ? edge : getStickySafeTop(edge)
			};
		}

		function getNoteIndex(noteElement) {
			let index = 0;

			for (const entry of noteMap.values()) {
				if (entry && entry.element === noteElement) {
					return index;
				}

				index += 1;
			}

			return 0;
		}

		function getStickyBounds(noteElement) {
			const safeArea = getStickySafeArea();
			const desktopRect = desktop ? desktop.getBoundingClientRect() : { width: 1200, height: 800 };
			const width = noteElement ? Math.round(noteElement.offsetWidth || 0) : 0;
			const height = noteElement ? Math.round(noteElement.offsetHeight || 0) : 0;

			return {
				maxLeft: Math.max(safeArea.left, desktopRect.width - width - safeArea.right),
				maxTop: Math.max(safeArea.top, desktopRect.height - height - safeArea.bottom),
				minLeft: safeArea.left,
				minTop: safeArea.top
			};
		}

		function constrainNoteElement(noteElement) {
			if (!noteElement || !desktop || noteElement.classList.contains('is-fullscreen')) {
				return;
			}

			const bounds = getStickyBounds(noteElement);
			const nextLeft = clamp(toNumber(noteElement.style.left, noteElement.offsetLeft || bounds.minLeft), bounds.minLeft, bounds.maxLeft);
			const nextTop = clamp(toNumber(noteElement.style.top, noteElement.offsetTop || bounds.minTop), bounds.minTop, bounds.maxTop);

			noteElement.style.left = `${Math.round(nextLeft)}px`;
			noteElement.style.top = `${Math.round(nextTop)}px`;
		}

		function ensureLayer() {
			if (layer || !desktop) {
				return layer;
			}

			layer = desktop.querySelector('.pdk-sticky-note-layer');
			if (!layer) {
				layer = document.createElement('section');
				layer.className = 'pdk-sticky-note-layer';
				layer.setAttribute('aria-label', getLabel('stickyNote'));
				desktop.appendChild(layer);
			}

			return layer;
		}

		function getSavedNotes() {
			return sessionStore && typeof sessionStore.getSection === 'function'
				? sessionStore.getSection(workspaceSections.STICKY_NOTES, [])
				: [];
		}

		function getSavedState(documentId) {
			const savedNotes = getSavedNotes();
			const match = Array.isArray(savedNotes)
				? savedNotes.find((note) => Number.parseInt(note.id, 10) === Number.parseInt(documentId, 10))
				: null;

			return match && match.state && typeof match.state === 'object' ? Object.assign({}, match.state) : {};
		}

		function hasSavedState(documentId) {
			const savedNotes = getSavedNotes();

			return Array.isArray(savedNotes) && savedNotes.some((note) => (
				Number.parseInt(note.id, 10) === Number.parseInt(documentId, 10)
			));
		}

		function isStickyDocument(documentData) {
			return Boolean(
				documentData
				&& documentData.kind === getStickyKind()
				&& isPersistedDocumentId(documentData.id)
			);
		}

		function rememberDocument(documentData) {
			if (!isStickyDocument(documentData)) {
				return;
			}

			const documentId = Number.parseInt(documentData.id, 10);
			const nextDocument = Object.assign({}, documentData);
			const existingIndex = knownDocuments.findIndex((documentItem) => (
				Number.parseInt(documentItem && documentItem.id, 10) === documentId
			));

			if (existingIndex >= 0) {
				knownDocuments.splice(existingIndex, 1, nextDocument);
				return;
			}

			knownDocuments.push(nextDocument);
		}

		function rememberDocuments(documents) {
			knownDocuments = [];
			if (!Array.isArray(documents)) {
				return;
			}

			documents.forEach(rememberDocument);
		}

		function forgetDocument(documentId) {
			const id = Number.parseInt(documentId, 10);
			if (!Number.isFinite(id)) {
				return;
			}

			knownDocuments = knownDocuments.filter((documentItem) => (
				Number.parseInt(documentItem && documentItem.id, 10) !== id
			));
		}

		function getKnownDocument(documentId) {
			const id = Number.parseInt(documentId, 10);

			return knownDocuments.find((documentItem) => (
				Number.parseInt(documentItem && documentItem.id, 10) === id
			)) || null;
		}

		function getDefaultLeft(index = 0) {
			return 110 + (index % 5) * 34;
		}

		function getRightAnchoredLeft(width, right = 24) {
			const desktopRect = desktop ? desktop.getBoundingClientRect() : { width: 1200 };
			const safeArea = getStickySafeArea();
			const offset = Math.max(0, toNumber(right, 24));
			const maxLeft = Math.max(safeArea.left, desktopRect.width - width - safeArea.right);

			return clamp(desktopRect.width - width - offset, safeArea.left, maxLeft);
		}

		function getDefaultTop(index = 0) {
			return (isRedmondTheme() ? 76 : getStickySafeArea().top) + (index % 5) * 34;
		}

		function getDefaultState(index = 0, overrides = {}) {
			const redmond = isRedmondTheme();
			const width = toNumber(overrides.width, getDefaultStickyWidth(redmond));
			const hasRightAnchor = Object.prototype.hasOwnProperty.call(overrides, 'right') && !Object.prototype.hasOwnProperty.call(overrides, 'left');
			const left = hasRightAnchor ? getRightAnchoredLeft(width, overrides.right) : getDefaultLeft(index);

			return {
				height: toNumber(overrides.height, getDefaultStickyHeight(redmond)),
				left: toNumber(overrides.left, left),
				top: toNumber(overrides.top, getDefaultTop(index)),
				width,
				zIndex: toNumber(overrides.zIndex, highestZ + 1)
			};
		}

		function normalizeState(state = {}, index = 0) {
			const hasRightAnchor = Object.prototype.hasOwnProperty.call(state, 'right') && !Object.prototype.hasOwnProperty.call(state, 'left');
			const defaults = getDefaultState(index, state);
			const desktopRect = desktop ? desktop.getBoundingClientRect() : { width: 1200, height: 800 };
			const safeArea = getStickySafeArea();
			const minWidth = getStickyMinWidth();
			const minHeight = getStickyMinHeight();
			const collapsed = Boolean(state.collapsed);
			const expandedHeight = toNumber(state.expandedHeight, defaults.height);
			const restoreState = state.restore && typeof state.restore === 'object' ? state.restore : {};
			const width = clamp(toNumber(state.width, defaults.width), minWidth, Math.max(minWidth, desktopRect.width - safeArea.left - safeArea.right));
			const height = clamp(toNumber(state.height, defaults.height), minHeight, Math.max(minHeight, desktopRect.height - safeArea.top - safeArea.bottom));
			const maxLeft = Math.max(safeArea.left, desktopRect.width - width - safeArea.right);
			const maxTop = Math.max(safeArea.top, desktopRect.height - height - safeArea.bottom);
			const zIndex = toNumber(state.zIndex, defaults.zIndex);
			const top = toNumber(state.top, defaults.top);
			const restoreTop = toNumber(state.restoreTop, toNumber(restoreState.top, defaults.top));

			highestZ = Math.max(highestZ, zIndex);

			const normalized = {
				collapsed,
				expandedHeight,
				fullscreen: !collapsed && Boolean(state.fullscreen),
				height,
				hidden: Boolean(state.hidden),
				left: clamp(toNumber(state.left, defaults.left), safeArea.left, maxLeft),
				restoreHeight: toNumber(state.restoreHeight, toNumber(restoreState.height, expandedHeight)),
				restoreLeft: toNumber(state.restoreLeft, toNumber(restoreState.left, defaults.left)),
				restoreTop,
				restoreWidth: toNumber(state.restoreWidth, toNumber(restoreState.width, defaults.width)),
				top: clamp(top, safeArea.top, maxTop),
				width,
				zIndex
			};

			if (hasRightAnchor) {
				normalized.right = Math.max(0, toNumber(state.right, 24));
			}

			return normalized;
		}

		function normalizeCreateState(state = {}) {
			if (
				desktop
				&& Number.isFinite(state.clientX)
				&& Number.isFinite(state.clientY)
				&& typeof desktop.getBoundingClientRect === 'function'
			) {
				const rect = desktop.getBoundingClientRect();

				return Object.assign({}, state, {
					left: Math.round(state.clientX - rect.left),
					top: Math.round(state.clientY - rect.top)
				});
			}

			return state;
		}

		function getCreateParentPath(state = {}) {
			return typeof state.parentPath === 'string' ? state.parentPath.trim() : '';
		}

		function applyState(noteElement, state) {
			const collapsed = Boolean(state.collapsed);
			const fullscreen = !collapsed && Boolean(state.fullscreen);

			noteElement.style.zIndex = String(state.zIndex);
			noteElement.hidden = Boolean(state.hidden);
			noteElement.classList.toggle('is-collapsed', collapsed);
			noteElement.classList.toggle('is-fullscreen', fullscreen);
			syncStickyFullscreenSource();

			const fullscreenBounds = fullscreen ? getFullscreenBounds() : null;
			const nextLeft = fullscreenBounds ? fullscreenBounds.left : state.left;
			const nextTop = fullscreenBounds ? fullscreenBounds.top : state.top;
			const nextWidth = fullscreenBounds ? fullscreenBounds.width : state.width;
			const nextHeight = fullscreenBounds ? fullscreenBounds.height : state.height;

			noteElement.dataset.pdkRestoreLeft = `${toNumber(state.restoreLeft, state.left)}px`;
			noteElement.dataset.pdkRestoreTop = `${toNumber(state.restoreTop, state.top)}px`;
			noteElement.dataset.pdkRestoreWidth = `${toNumber(state.restoreWidth, state.width)}px`;
			noteElement.dataset.pdkRestoreHeight = `${toNumber(state.restoreHeight, state.expandedHeight || state.height || getDefaultStickyHeight())}px`;
			if (Number.isFinite(state.right)) {
				noteElement.dataset.pdkRightAnchor = String(Math.max(0, Math.round(state.right)));
			} else {
				delete noteElement.dataset.pdkRightAnchor;
			}
			noteElement.style.left = `${nextLeft}px`;
			noteElement.style.top = `${nextTop}px`;
			noteElement.style.width = `${nextWidth}px`;
			noteElement.style.height = state.collapsed
				? `${getCollapsedHeight(noteElement)}px`
				: `${nextHeight}px`;
			noteElement.dataset.pdkExpandedHeight = String(Math.max(getStickyExpandedMinHeight(), state.expandedHeight || state.height || getDefaultStickyHeight()));
		}

		function getCollapsedHeight(noteElement) {
			const chrome = noteElement ? noteElement.querySelector('.pdk-sticky-note-chrome') : null;
			const height = chrome ? Math.round(chrome.getBoundingClientRect().height) : 28;

			return Math.max(getStickyCollapsedMinHeight(), height);
		}

		function getFullscreenBounds() {
			const safeArea = getStickyFullscreenSafeArea();

			return {
				height: Math.max(getStickyMinHeight(), desktop.clientHeight - safeArea.top - safeArea.bottom),
				left: safeArea.left,
				top: safeArea.top,
				width: Math.max(getStickyMinWidth(), desktop.clientWidth - safeArea.left - safeArea.right)
			};
		}

		function readState(noteElement) {
			const collapsed = noteElement.classList.contains('is-collapsed');
			const expandedHeight = toNumber(noteElement.dataset.pdkExpandedHeight, Math.round(noteElement.offsetHeight || getDefaultStickyHeight()));
			const rightAnchor = toNumber(noteElement.dataset.pdkRightAnchor, null);
			const state = {
				collapsed,
				expandedHeight,
				fullscreen: noteElement.classList.contains('is-fullscreen'),
				height: collapsed ? expandedHeight : Math.round(noteElement.offsetHeight || 0),
				hidden: noteElement.hidden,
				restoreHeight: toNumber(noteElement.dataset.pdkRestoreHeight, expandedHeight),
				restoreLeft: toNumber(noteElement.dataset.pdkRestoreLeft, toNumber(noteElement.style.left, Math.round(noteElement.offsetLeft || 0))),
				restoreTop: toNumber(noteElement.dataset.pdkRestoreTop, toNumber(noteElement.style.top, Math.round(noteElement.offsetTop || 0))),
				restoreWidth: toNumber(noteElement.dataset.pdkRestoreWidth, Math.round(noteElement.offsetWidth || 0)),
				top: toNumber(noteElement.style.top, Math.round(noteElement.offsetTop || 0)),
				width: Math.round(noteElement.offsetWidth || 0),
				zIndex: toNumber(noteElement.style.zIndex, highestZ)
			};

			if (Number.isFinite(rightAnchor)) {
				state.right = Math.max(0, rightAnchor);
			} else {
				state.left = toNumber(noteElement.style.left, Math.round(noteElement.offsetLeft || 0));
			}

			return state;
		}

		function serializeNotes() {
			return Array.from(noteMap.values())
				.filter((entry) => entry && entry.document && isPersistedDocumentId(entry.document.id))
				.map((entry) => ({
					id: entry.document.id,
					state: readState(entry.element)
				}));
		}

		function saveLayout() {
			if (sessionStore && typeof sessionStore.saveSection === 'function') {
				sessionStore.saveSection(workspaceSections.STICKY_NOTES, serializeNotes());
			}
		}

		function bringToFront(noteElement) {
			highestZ += 1;
			noteElement.style.zIndex = String(highestZ);
			const entry = Array.from(noteMap.values()).find((item) => item && item.element === noteElement);
			if (entry) {
				dispatchActiveStickyNoteChange(entry);
			}
			syncStickyFullscreenSource(noteElement);
			saveLayout();
		}

		function readLayerIndex(name, fallback) {
			const styles = shell && typeof window.getComputedStyle === 'function'
				? window.getComputedStyle(shell)
				: null;
			const parsed = styles ? Number.parseFloat(styles.getPropertyValue(name)) : Number.NaN;

			return Number.isFinite(parsed) ? parsed : fallback;
		}

		function readElementZIndex(element) {
			if (!element) {
				return 0;
			}

			const inline = Number.parseFloat(element.style.zIndex);
			if (Number.isFinite(inline)) {
				return inline;
			}

			const styles = typeof window.getComputedStyle === 'function'
				? window.getComputedStyle(element)
				: null;
			const computed = styles ? Number.parseFloat(styles.zIndex) : Number.NaN;

			return Number.isFinite(computed) ? computed : 0;
		}

		function getHighestWindowZIndex() {
			return Array.from(shell.querySelectorAll('.pdk-window:not(.is-closed):not(.is-hidden)'))
				.reduce((highest, win) => Math.max(highest, readElementZIndex(win)), 0);
		}

		function elevateForDrag(noteElement) {
			const menuLayer = readLayerIndex('--pdk-layer-menu', 10000);
			const dragZ = Math.max(highestZ + 1, getHighestWindowZIndex() + 1, menuLayer - 1);

			highestZ = dragZ;
			if (layer) {
				layer.style.zIndex = String(dragZ);
			}
			noteElement.style.zIndex = String(dragZ);
			syncStickyFullscreenSource(noteElement);
		}

		function clearDocumentDropTarget() {
			if (activeDocumentDropTarget) {
				activeDocumentDropTarget.classList.remove('is-drop-target');
				activeDocumentDropTarget = null;
			}
		}

		function setDocumentDropTarget(target) {
			if (activeDocumentDropTarget === target) {
				return;
			}

			clearDocumentDropTarget();
			activeDocumentDropTarget = target || null;
			if (activeDocumentDropTarget) {
				activeDocumentDropTarget.classList.add('is-drop-target');
			}
		}

		function getDocumentSourceFolderId(entry) {
			const parentPath = entry && entry.document && typeof entry.document.parentPath === 'string'
				? entry.document.parentPath
				: '';

			return parentPath && virtualFilesystem && typeof virtualFilesystem.getFolderIdForPath === 'function'
				? virtualFilesystem.getFolderIdForPath(parentPath)
				: '';
		}

		function getDocumentSourceContainerId(entry) {
			const folderId = getDocumentSourceFolderId(entry);
			const desktopFolderId = virtualFilesystem && typeof virtualFilesystem.getFolderId === 'function'
				? virtualFilesystem.getFolderId('DESKTOP')
				: '';

			return folderId && folderId !== desktopFolderId && dragDropModels
				? dragDropModels.createContainerId(containerTypes.FOLDER, folderId)
				: containerTypes.DESKTOP || 'desktop';
		}

		function getStickyDocumentDragItem(entry) {
			const documentId = entry && entry.document ? Number.parseInt(entry.document.id, 10) : 0;

			if (!isPersistedDocumentId(documentId)) {
				return null;
			}

			return {
				id: `document-${documentId}`,
				label: entry.document.title || getLabel('stickyNote'),
				metadata: {
					documentId,
					parentPath: entry.document.parentPath || '',
					source: 'sticky-note',
					sourceFolderId: getDocumentSourceFolderId(entry)
				},
				sourceContainerId: getDocumentSourceContainerId(entry),
				type: itemTypes.DOCUMENT || 'document'
			};
		}

		function getFolderDropIdFromElement(element) {
			return element && element.dataset
				? element.dataset.pdkOpenFolder || element.dataset.pdkContextId || ''
				: '';
		}

		function getElementBelowNote(noteElement, clientX, clientY) {
			if (typeof document.elementFromPoint !== 'function' || !noteElement) {
				return null;
			}

			const previousPointerEvents = noteElement.style.pointerEvents;

			noteElement.style.pointerEvents = 'none';
			const element = document.elementFromPoint(clientX, clientY);
			noteElement.style.pointerEvents = previousPointerEvents || '';

			return element;
		}

		function getStickyNoteDropTarget(noteElement, entry, clientX, clientY) {
			if (!dragDropManager || !dragDropModels || typeof dragDropManager.validateDrop !== 'function') {
				return null;
			}

			const item = getStickyDocumentDragItem(entry);
			const element = getElementBelowNote(noteElement, clientX, clientY);
			const folderElement = element && typeof element.closest === 'function'
				? element.closest('.pdk-folder-launcher, [data-pdk-desktop-icon-kind="folder"]')
				: null;
			const pane = element && typeof element.closest === 'function'
				? element.closest('.pdk-finder-pane')
				: null;
			let targetElement = null;
			let folderId = '';

			if (!item || !element) {
				return null;
			}

			if (folderElement && !noteElement.contains(folderElement)) {
				targetElement = folderElement;
				folderId = getFolderDropIdFromElement(folderElement);
			} else if (pane) {
				const win = pane.closest('.pdk-window[data-pdk-window-kind="folder"]');

				targetElement = pane;
				folderId = win && win.dataset ? win.dataset.pdkFolderWindow || '' : '';
			}

			if (!targetElement || !folderId) {
				return null;
			}

			const toContainerId = dragDropModels.createContainerId(containerTypes.FOLDER, folderId);
			const move = {
				fromContainerId: item.sourceContainerId,
				item,
				toContainerId
			};
			const validation = dragDropManager.validateDrop(move, {
				emit: false
			});

			return validation && validation.valid ? {
				element: targetElement,
				move
			} : null;
		}

		function createIconButton(className, label, text) {
			const button = document.createElement('button');
			button.className = className;
			button.type = 'button';
			button.setAttribute('aria-label', label);
			button.textContent = text;

			return button;
		}

		function getFormatToolbarMarkup() {
			return '<span>B</span><span>I</span><span>U</span><span>ab</span><span class="dashicons dashicons-editor-ul"></span><span class="dashicons dashicons-format-image"></span>';
		}

		function createNoteContent(documentData) {
			if (richText && typeof richText.createEditor === 'function') {
				return richText.createEditor({
					className: 'pdk-sticky-note-content',
					html: documentData.content || '',
					label: documentData.title || getLabel('stickyNote'),
					placeholder: getLabel('stickyPlaceholder')
				});
			}

			const content = document.createElement('textarea');
			content.className = 'pdk-sticky-note-content';
			content.placeholder = getLabel('stickyPlaceholder');
			content.value = documentData.content || '';

			return content;
		}

		function editorHasContent(editor) {
			if (richText && typeof richText.hasContent === 'function') {
				return richText.hasContent(editor);
			}

			return Boolean(editor && String(editor.value || '').trim());
		}

		function createFormatToolbar(className) {
			const toolbar = richText && typeof richText.createToolbar === 'function'
				? richText.createToolbar({
					className,
					labels
				})
				: document.createElement('div');

			if (!toolbar.classList.contains(className)) {
				toolbar.classList.add(className);
			}
			toolbar.setAttribute('aria-label', getLabel('formatting'));
			if (!richText || typeof richText.createToolbar !== 'function') {
				toolbar.innerHTML = getFormatToolbarMarkup();
			}

			return toolbar;
		}

		function bindFormatToolbar(toolbar, entry) {
			if (!richText || typeof richText.bindToolbar !== 'function' || !toolbar || !entry || !entry.content) {
				return () => {};
			}

			return richText.bindToolbar(toolbar, entry.content, {
				labels
			});
		}

		function getStickyNoteColors() {
			return window.PufferDesk.documents && Array.isArray(window.PufferDesk.documents.stickyNoteColors)
				? window.PufferDesk.documents.stickyNoteColors
				: [ 'yellow' ];
		}

		function normalizeNoteColor(color) {
			return window.PufferDesk.documents && typeof window.PufferDesk.documents.normalizeStickyNoteColor === 'function'
				? window.PufferDesk.documents.normalizeStickyNoteColor(color)
				: 'yellow';
		}

		function applyNoteColor(entry, color) {
			if (!entry || !entry.element) {
				return;
			}

			entry.element.dataset.pdkStickyColor = normalizeNoteColor(color);
		}

		function updateNoteColor(entry, color) {
			const nextColor = normalizeNoteColor(color);

			if (!entry || !entry.document) {
				return Promise.resolve(false);
			}

			applyNoteColor(entry, nextColor);
			entry.document.color = nextColor;
			syncEntryDirtyState(entry);

			if (isUnsavedEntry(entry)) {
				return Promise.resolve(true);
			}

			if (!documentStore || typeof documentStore.update !== 'function') {
				return Promise.resolve(false);
			}

			return documentStore.update(entry.document.id, {
				color: nextColor
			}).then((documentData) => {
				entry.document = Object.assign({}, documentData, {
					content: entry.content ? entry.content.value : documentData.content
				});
				rememberDocument(entry.document);
				markEntrySaved(entry);
				applyNoteColor(entry, documentData.color);
				return true;
			}).catch(() => false);
		}

		function closeNoteOptionsMenu() {
			if (!openOptionsMenu) {
				return;
			}

			if (typeof openOptionsMenu.cleanup === 'function') {
				openOptionsMenu.cleanup();
			}

			if (openOptionsMenu.element) {
				openOptionsMenu.element.remove();
			}

			openOptionsMenu = null;
		}

		function openNotesListApp() {
			const desktopApi = window.PufferDesk.desktopApi || (window.PufferDesk.desktop && window.PufferDesk.desktop.api) || null;

			if (desktopApi && desktopApi.apps && typeof desktopApi.apps.open === 'function') {
				desktopApi.apps.open(stickyNotesAppId);
				return true;
			}

			return false;
		}

		function createOptionsMenuItem(className, label) {
			const button = document.createElement('button');
			const icon = document.createElement('span');
			const text = document.createElement('span');

			button.className = `pdk-sticky-note-options-item ${className}`;
			button.type = 'button';
			button.setAttribute('role', 'menuitem');
			icon.className = 'pdk-sticky-note-options-icon';
			text.className = 'pdk-sticky-note-options-label';
			text.textContent = label;
			button.append(icon, text);

			return button;
		}

		function createColorPalette(entry) {
			const palette = document.createElement('div');
			const colors = getStickyNoteColors();
			const currentColor = normalizeNoteColor(entry && entry.document ? entry.document.color : '');

			palette.className = 'pdk-sticky-note-options-palette';

			colors.forEach((color) => {
				const button = document.createElement('button');
				button.className = `pdk-sticky-note-options-swatch is-${color}`;
				button.type = 'button';
				button.dataset.pdkStickyColor = color;
				button.setAttribute('aria-label', color);
				button.setAttribute('aria-pressed', color === currentColor ? 'true' : 'false');
				button.addEventListener('click', () => {
					palette.querySelectorAll('.pdk-sticky-note-options-swatch').forEach((swatch) => {
						swatch.setAttribute('aria-pressed', swatch === button ? 'true' : 'false');
					});
					updateNoteColor(entry, color);
				});
				palette.appendChild(button);
			});

			return palette;
		}

		function toggleNoteOptionsMenu(entry, trigger) {
			if (!entry || !entry.element) {
				return;
			}

			if (openOptionsMenu && openOptionsMenu.trigger === trigger) {
				closeNoteOptionsMenu();
				return;
			}

			closeNoteOptionsMenu();

			const menu = document.createElement('div');
			const notesListButton = isRedmondTheme() ? createOptionsMenuItem('is-notes-list', getLabel('notesList')) : null;
			const deleteButton = createOptionsMenuItem('is-delete-note', getLabel('deleteNote'));

			menu.className = 'pdk-sticky-note-options';
			menu.setAttribute('role', 'menu');
			menu.append(createColorPalette(entry));
			if (notesListButton) {
				menu.appendChild(notesListButton);
			}
			menu.appendChild(deleteButton);
			entry.element.appendChild(menu);

			function onPointerDown(event) {
				if (menu.contains(event.target) || (trigger && trigger.contains(event.target))) {
					return;
				}

				closeNoteOptionsMenu();
			}

			function onKeyDown(event) {
				if (event.key === 'Escape') {
					closeNoteOptionsMenu();
				}
			}

			if (notesListButton) {
				notesListButton.addEventListener('click', () => {
					closeNoteOptionsMenu();
					openNotesListApp();
				});
			}
			deleteButton.addEventListener('click', () => {
				closeNoteOptionsMenu();
				confirmDiscardNote(entry);
			});
			document.addEventListener('pointerdown', onPointerDown, true);
			document.addEventListener('keydown', onKeyDown, true);
			openOptionsMenu = {
				cleanup() {
					document.removeEventListener('pointerdown', onPointerDown, true);
					document.removeEventListener('keydown', onKeyDown, true);
				},
				element: menu,
				trigger
			};
		}

		function getNoteContent(entry) {
			return entry && entry.content ? entry.content.value : '';
		}

		function getEntrySavedContent(entry) {
			return entry && typeof entry.savedContent === 'string' ? entry.savedContent : '';
		}

		function getEntrySavedColor(entry) {
			return normalizeNoteColor(entry && typeof entry.savedColor === 'string' ? entry.savedColor : '');
		}

		function syncEntryDirtyState(entry) {
			if (!entry || !entry.document) {
				return false;
			}

			entry.dirty = getNoteContent(entry) !== getEntrySavedContent(entry)
				|| normalizeNoteColor(entry.document.color) !== getEntrySavedColor(entry);

			return entry.dirty;
		}

		function hasUnsavedChanges(entry) {
			return syncEntryDirtyState(entry);
		}

		function markEntrySaved(entry) {
			if (!entry || !entry.document) {
				return;
			}

			entry.savedContent = getNoteContent(entry);
			entry.savedColor = normalizeNoteColor(entry.document.color);
			entry.dirty = false;
		}

		function syncLocalDocumentContent(entry) {
			if (!entry || !entry.document) {
				return;
			}

			entry.document.content = getNoteContent(entry);
			entry.document.modified = new Date().toISOString();
			syncEntryDirtyState(entry);
		}

		function getNoteText(entry) {
			if (!entry || !entry.content) {
				return '';
			}

			const value = typeof entry.content.innerText === 'string' && entry.content.innerText
				? entry.content.innerText
				: getNoteContent(entry).replace(/<[^>]*>/g, ' ');

			return String(value || '').replace(/\s+/g, ' ').trim();
		}

		function getSuggestedSaveTitle(entry) {
			const currentTitle = entry && entry.document && typeof entry.document.title === 'string' ? entry.document.title.trim() : '';
			const defaultTitle = getLabel('stickyNote');
			const textTitle = getNoteText(entry);

			if (currentTitle && currentTitle !== defaultTitle) {
				return currentTitle;
			}

			return textTitle ? textTitle.slice(0, 80) : defaultTitle;
		}

		function syncNoteElementDocumentMetadata(noteElement, documentData = {}) {
			if (!noteElement) {
				return;
			}

			const documentId = Number.parseInt(documentData.id, 10);
			const label = documentData.title || getLabel('stickyNote');

			noteElement.dataset.pdkContextId = Number.isFinite(documentId) ? String(documentId) : '';
			noteElement.dataset.pdkDocumentId = Number.isFinite(documentId) ? String(documentId) : '';
			noteElement.dataset.pdkDocumentKind = documentData.kind || getStickyKind();
			noteElement.dataset.pdkContextLabel = label;
			noteElement.setAttribute('aria-label', label);
		}

		function syncEntryDocument(entry, documentData) {
			if (!entry || !documentData) {
				return;
			}

			const oldId = Number.parseInt(entry.document && entry.document.id, 10);
			const newId = Number.parseInt(documentData.id, 10);

			if (Number.isFinite(oldId) && oldId !== newId) {
				noteMap.delete(oldId);
			}

			entry.document = documentData;
			entry.unsaved = false;

			if (entry.element) {
				syncNoteElementDocumentMetadata(entry.element, documentData);
			}

			if (Number.isFinite(newId)) {
				noteMap.set(newId, entry);
			}

			rememberDocument(documentData);
			markEntrySaved(entry);
		}

		function getSaveDialog() {
			const dialogs = getDialogs();

			return dialogs && typeof dialogs.saveDocument === 'function' ? dialogs : null;
		}

		function requestSaveMetadata(entry) {
			const dialogs = getSaveDialog();
			const fallbackParentPath = entry && entry.document && entry.document.parentPath ? entry.document.parentPath : '';
			const options = {
				kind: getStickyKind(),
				parentPath: fallbackParentPath,
				style: 'floating',
				title: getLabel('saveStickyNoteTitle'),
				value: getSuggestedSaveTitle(entry),
				variant: 'document-save'
			};

			if (dialogs) {
				return dialogs.saveDocument(options);
			}

			if (!window.prompt) {
				return Promise.resolve(null);
			}

			const title = window.prompt(getLabel('saveAs'), options.value);
			if (title === null) {
				return Promise.resolve(null);
			}

			return Promise.resolve({
				parentPath: fallbackParentPath,
				title
			});
		}

		function updateDocument(entry, options = {}) {
			if (!documentStore || !entry || !entry.document || !entry.content) {
				return Promise.resolve(false);
			}

			if (entry.pendingSave) {
				if (options.explicit === true && !isUnsavedEntry(entry)) {
					return entry.pendingSave.then(() => updateDocument(entry, options));
				}

				return entry.pendingSave;
			}

			syncLocalDocumentContent(entry);
			const content = getNoteContent(entry);
			const saveRequest = Promise.resolve().then(() => {
				if (isUnsavedEntry(entry)) {
					if (shouldAskOnFirstSave() && options.explicit !== true) {
						return false;
					}

					const metadataRequest = shouldAskOnFirstSave()
						? requestSaveMetadata(entry)
						: Promise.resolve({
							parentPath: entry.document.parentPath || '',
							title: entry.document.title || getLabel('stickyNote')
						});

					return metadataRequest.then((metadata) => {
						if (!metadata || !metadata.parentPath) {
							return false;
						}

						return documentStore.create({
							color: entry.document.color || '',
							content,
							kind: getStickyKind(),
							parentPath: metadata.parentPath,
							title: metadata.title || getLabel('stickyNote')
						}).then((documentData) => {
							syncEntryDocument(entry, documentData);
							saveLayout();
							return true;
						});
					});
				}

				const payload = {
					content,
					kind: getStickyKind()
				};

				if (shouldAskOnFirstSave() && entry.document.title) {
					payload.title = entry.document.title;
				}

				return documentStore.update(entry.document.id, payload).then((documentData) => {
					syncEntryDocument(entry, documentData);
					return true;
				});
			});

			entry.pendingSave = saveRequest.catch(() => false).finally(() => {
				entry.pendingSave = null;
			});

			return entry.pendingSave;
		}

		function canAutoSaveEntry(entry) {
			return Boolean(entry && (!isUnsavedEntry(entry) || !shouldAskOnFirstSave()));
		}

		function createSaveTask(entry) {
			let task = null;

			function runExplicitSave() {
				if (task && typeof task.cancel === 'function') {
					task.cancel();
				}

				return updateDocument(entry, {
					explicit: true
				});
			}

			function scheduleAutoSave() {
				if (!canAutoSaveEntry(entry)) {
					return false;
				}

				return updateDocument(entry, {
					explicit: false
				});
			}

			if (!createDebouncedTask) {
				return {
					run: runExplicitSave,
					schedule: scheduleAutoSave
				};
			}

			task = createDebouncedTask(() => updateDocument(entry, {
				explicit: false
			}), {
				shouldRun: () => canAutoSaveEntry(entry),
				wait: 520
			});

			return {
				cancel: task.cancel,
				run: runExplicitSave,
				schedule: task.schedule
			};
		}

		function saveAndCloseNote(entry) {
			if (!entry || !entry.saveTask || typeof entry.saveTask.run !== 'function') {
				return Promise.resolve(false);
			}

			return entry.saveTask.run().then((saved) => {
				if (!saved || !entry.document || !isPersistedDocumentId(entry.document.id)) {
					return false;
				}

				return hideNote(entry.document.id);
			});
		}

		function hideNote(documentId) {
			const entry = noteMap.get(Number.parseInt(documentId, 10));
			if (!entry) {
				return false;
			}

			entry.element.hidden = true;
			syncStickyFullscreenSource();
			saveLayout();
			syncRunningState();
			return true;
		}

		function showNote(documentId) {
			let entry = noteMap.get(Number.parseInt(documentId, 10));
			if (!entry) {
				const documentData = getKnownDocument(documentId);
				if (!documentData) {
					return false;
				}

				renderNote(documentData, getSavedState(documentId));
				entry = noteMap.get(Number.parseInt(documentId, 10));
				if (!entry) {
					return false;
				}
			}

			entry.element.hidden = false;
			entry.element.classList.remove('is-collapsed');
			entry.element.style.height = `${toNumber(entry.element.dataset.pdkExpandedHeight, getDefaultStickyHeight())}px`;
			constrainNoteElement(entry.element);
			bringToFront(entry.element);
			if (entry.element.classList.contains('is-fullscreen')) {
				const bounds = getFullscreenBounds();
				entry.element.style.left = `${bounds.left}px`;
				entry.element.style.top = `${bounds.top}px`;
				entry.element.style.width = `${bounds.width}px`;
				entry.element.style.height = `${bounds.height}px`;
			}
			entry.content.focus();
			syncRunningState();
			return true;
		}

		function deleteNote(documentId, options = {}) {
			const entry = noteMap.get(Number.parseInt(documentId, 10));

			if (entry && isUnsavedEntry(entry)) {
				return Promise.resolve(removeRenderedNote(documentId));
			}

			if (!documentStore) {
				return Promise.resolve(removeRenderedNote(documentId));
			}

			return documentStore.remove(documentId, options).then((deleted) => {
				if (deleted) {
					forgetDocument(documentId);
					removeRenderedNote(documentId);
				}
				return Boolean(deleted);
			});
		}

		function removeRenderedNote(documentId) {
			const entry = noteMap.get(Number.parseInt(documentId, 10));

			if (!entry) {
				return false;
			}

			closeNoteOptionsMenu();
			if (entry.saveTask && typeof entry.saveTask.cancel === 'function') {
				entry.saveTask.cancel();
			}
			if (typeof entry.formatCleanup === 'function') {
				entry.formatCleanup();
			}
			entry.element.remove();
			noteMap.delete(entry.document.id);
			syncStickyFullscreenSource();
			saveLayout();
			syncRunningState();

			return true;
		}

		function setCollapsed(entry, collapsed) {
			if (!entry || !entry.element) {
				return false;
			}

			if (collapsed) {
				entry.element.dataset.pdkExpandedHeight = String(Math.max(getStickyExpandedMinHeight(), Math.round(entry.element.offsetHeight || getDefaultStickyHeight())));
				entry.element.classList.remove('is-fullscreen');
				entry.element.classList.add('is-collapsed');
				entry.element.style.height = `${getCollapsedHeight(entry.element)}px`;
				syncStickyFullscreenSource(entry.element);
			} else {
				entry.element.classList.remove('is-collapsed');
				entry.element.style.height = `${toNumber(entry.element.dataset.pdkExpandedHeight, getDefaultStickyHeight())}px`;
			}

			saveLayout();
			return true;
		}

		function setFullscreen(entry, fullscreen) {
			if (!entry || !entry.element || !desktop) {
				return false;
			}

			if (fullscreen) {
				entry.element.dataset.pdkRestoreLeft = entry.element.style.left || '';
				entry.element.dataset.pdkRestoreTop = entry.element.style.top || '';
				entry.element.dataset.pdkRestoreWidth = entry.element.style.width || '';
				entry.element.dataset.pdkRestoreHeight = entry.element.style.height || '';
				entry.element.classList.remove('is-collapsed');
				entry.element.classList.add('is-fullscreen');
				syncStickyFullscreenSource(entry.element);
				const bounds = getFullscreenBounds();
				entry.element.style.left = `${bounds.left}px`;
				entry.element.style.top = `${bounds.top}px`;
				entry.element.style.width = `${bounds.width}px`;
				entry.element.style.height = `${bounds.height}px`;
			} else {
				entry.element.classList.remove('is-fullscreen');
				syncStickyFullscreenSource(entry.element);
				entry.element.style.left = entry.element.dataset.pdkRestoreLeft || entry.element.style.left;
				entry.element.style.top = entry.element.dataset.pdkRestoreTop || entry.element.style.top;
				entry.element.style.width = entry.element.dataset.pdkRestoreWidth || entry.element.style.width;
				entry.element.style.height = entry.element.dataset.pdkRestoreHeight || `${toNumber(entry.element.dataset.pdkExpandedHeight, getDefaultStickyHeight())}px`;
				constrainNoteElement(entry.element);
			}

			bringToFront(entry.element);
			saveLayout();
			return true;
		}

		function confirmDiscardNote(entry) {
			if (!entry || !entry.document) {
				return Promise.resolve(false);
			}

			if (entry.pendingSave && !isUnsavedEntry(entry)) {
				return entry.pendingSave.then(() => confirmDiscardNote(entry));
			}

			if (isUnsavedEntry(entry) && (!entry.content || !editorHasContent(entry.content))) {
				return deleteNote(entry.document.id);
			}

			if (!isUnsavedEntry(entry) && !hasUnsavedChanges(entry)) {
				return Promise.resolve(hideNote(entry.document.id));
			}

			const dialogs = getDialogs();
			const fallback = () => {
				if (window.confirm && !window.confirm(getLabel('deleteStickyNote'))) {
					return Promise.resolve(false);
				}

				return deleteNote(entry.document.id);
			};

			if (!dialogs || typeof dialogs.choose !== 'function') {
				return fallback();
			}

			return dialogs.choose({
				actions: [
					{
						default: true,
						id: 'save',
						label: getLabel('saveEllipsis'),
						variant: 'primary'
					},
					{
						id: 'delete',
						label: getLabel('deleteNote'),
						variant: 'danger'
					},
					{
						id: 'cancel',
						label: getLabel('cancel'),
						variant: 'cancel'
					}
				],
				cancelAction: 'cancel',
				icon: 'dashicons-sticky',
				message: getLabel('discardNoteMessage'),
				style: 'floating',
				title: getLabel('discardNoteTitle', 'discardNoteTitle'),
				variant: 'sticky-note-discard'
			}).then((action) => {
				if (action === 'delete') {
					return deleteNote(entry.document.id);
				}

				if (action === 'save') {
					return saveAndCloseNote(entry);
				}

				return false;
			});
		}

		function isChromeInteractiveTarget(target, root = null) {
			if (titlebarActions && typeof titlebarActions.isInteractiveTarget === 'function') {
				return titlebarActions.isInteractiveTarget(target, root);
			}

			return Boolean(
				target
				&& typeof target.closest === 'function'
				&& target.closest('button, input, select, textarea, a, [contenteditable="true"], [data-pdk-no-drag], [data-pdk-titlebar-dblclick-exclude]')
			);
		}

		function bindNoteTitlebarDoubleClick(entry, dragHandle) {
			const callback = () => {
				if (!entry || !entry.element) {
					return;
				}

				closeNoteOptionsMenu();
				if (isPufferDeskTheme()) {
					setCollapsed(entry, !entry.element.classList.contains('is-collapsed'));
					return;
				}

				setFullscreen(entry, !entry.element.classList.contains('is-fullscreen'));
			};

			if (titlebarActions && typeof titlebarActions.bindDoubleClick === 'function') {
				titlebarActions.bindDoubleClick(dragHandle, callback);
				return;
			}

			dragHandle.addEventListener('dblclick', (event) => {
				if (isChromeInteractiveTarget(event.target, dragHandle)) {
					return;
				}

				event.preventDefault();
				callback();
			});
		}

		function bindDrag(noteElement, dragHandle, entry) {
			let dragState = null;
			let currentDropTarget = null;
			let platformDragStarted = false;
			const dragThreshold = 3;

			bindNoteTitlebarDoubleClick(entry, dragHandle);

			function onPointerMove(event) {
				if (!dragState) {
					return;
				}

				const deltaX = event.clientX - dragState.clientX;
				const deltaY = event.clientY - dragState.clientY;
				if (!dragState.started) {
					if (Math.abs(deltaX) < dragThreshold && Math.abs(deltaY) < dragThreshold) {
						return;
					}

					dragState.started = true;
					noteElement.classList.add('is-dragging');
					delete noteElement.dataset.pdkRightAnchor;
					elevateForDrag(noteElement);
					if (dragDropManager && typeof dragDropManager.startDrag === 'function') {
						platformDragStarted = Boolean(dragDropManager.startDrag(getStickyDocumentDragItem(entry), {
							element: noteElement,
							source: 'sticky-note'
						}));
					}
				}

				const desktopRect = desktop.getBoundingClientRect();
				const safeArea = getStickySafeArea();
				const width = noteElement.offsetWidth;
				const height = noteElement.offsetHeight;
				const nextLeft = clamp(dragState.left + deltaX, safeArea.left, Math.max(safeArea.left, desktopRect.width - width - safeArea.right));
				const nextTop = clamp(dragState.top + deltaY, safeArea.top, Math.max(safeArea.top, desktopRect.height - height - safeArea.bottom));

				noteElement.style.left = `${Math.round(nextLeft)}px`;
				noteElement.style.top = `${Math.round(nextTop)}px`;

				currentDropTarget = getStickyNoteDropTarget(noteElement, entry, event.clientX, event.clientY);
				setDocumentDropTarget(currentDropTarget ? currentDropTarget.element : null);
				if (platformDragStarted && dragDropManager) {
					if (currentDropTarget && typeof dragDropManager.hover === 'function') {
						dragDropManager.hover(Object.assign({}, currentDropTarget.move, {
							position: {
								clientX: event.clientX,
								clientY: event.clientY
							}
						}));
					} else if (typeof dragDropManager.leave === 'function') {
						dragDropManager.leave();
					}
				}
			}

			function finishDrag(event, commitDrop) {
				if (!dragState) {
					return;
				}

				const didDrag = dragState.started;
				const dropTarget = currentDropTarget;
				dragState = null;
				currentDropTarget = null;
				noteElement.classList.remove('is-dragging');
				if (layer) {
					layer.style.zIndex = '';
				}
				clearDocumentDropTarget();
				if (didDrag && commitDrop && dropTarget && dragDropManager && typeof dragDropManager.completeDrop === 'function') {
					dragDropManager.completeDrop(Object.assign({}, dropTarget.move, {
						position: {
							clientX: event && Number.isFinite(event.clientX) ? event.clientX : 0,
							clientY: event && Number.isFinite(event.clientY) ? event.clientY : 0
						}
					}));
				} else if (platformDragStarted && dragDropManager && typeof dragDropManager.cancel === 'function') {
					dragDropManager.cancel('no-drop-target');
				}
				platformDragStarted = false;
				if (didDrag) {
					saveLayout();
				}
				window.removeEventListener('pointermove', onPointerMove);
				window.removeEventListener('pointerup', onPointerUp);
				window.removeEventListener('pointercancel', onPointerCancel);
			}

			function onPointerUp(event) {
				finishDrag(event, true);
			}

			function onPointerCancel(event) {
				finishDrag(event, false);
			}

			dragHandle.addEventListener('pointerdown', (event) => {
				if (event.button !== 0 || !desktop || isChromeInteractiveTarget(event.target, dragHandle)) {
					return;
				}

				event.preventDefault();
				bringToFront(noteElement);
				dragState = {
					clientX: event.clientX,
					clientY: event.clientY,
					left: noteElement.offsetLeft,
					started: false,
					top: noteElement.offsetTop
				};
				dragHandle.setPointerCapture(event.pointerId);
				window.addEventListener('pointermove', onPointerMove);
				window.addEventListener('pointerup', onPointerUp);
				window.addEventListener('pointercancel', onPointerCancel);
			});
		}

		function bindResizePersistence(noteElement) {
			if (typeof window.ResizeObserver !== 'function' || !createDebouncedTask) {
				return;
			}

			const resizeSave = createDebouncedTask(saveLayout, {
				wait: 300
			});
			const observer = new window.ResizeObserver(() => {
				resizeSave.schedule();
			});

			observer.observe(noteElement);
		}

		function renderNote(documentData, state = {}) {
			const nextLayer = ensureLayer();
			const documentId = Number.parseInt(documentData && documentData.id, 10);

			if (!nextLayer || !documentId) {
				return null;
			}

			rememberDocument(documentData);
			if (noteMap.has(documentId)) {
				const existing = noteMap.get(documentId);
				existing.document = documentData;
				existing.content.value = documentData.content || '';
				syncNoteElementDocumentMetadata(existing.element, documentData);
				markEntrySaved(existing);
				applyNoteColor(existing, documentData.color);
				applyState(existing.element, normalizeState(state, noteMap.size));
				syncRunningState();
				return existing.element;
			}

			const noteElement = document.createElement('article');
			const dragHandle = document.createElement('div');
			const actionGroup = document.createElement('div');
			const content = createNoteContent(documentData);
			const toolbar = createFormatToolbar('pdk-sticky-note-toolbar');
			const entry = {
				content,
				document: documentData,
				dirty: false,
				element: noteElement,
				formatCleanup: null,
				saveTask: null,
				savedColor: normalizeNoteColor(documentData.color),
				savedContent: content.value || '',
				unsaved: !isPersistedDocumentId(documentId) || documentData.unsaved === true
			};
			const createButton = createIconButton('pdk-sticky-note-button pdk-sticky-note-new', getLabel('newStickyNote'), '+');
			const discardButton = createIconButton('pdk-sticky-note-button pdk-sticky-note-discard', getLabel('discardNote'), '');
			const menuButton = createIconButton('pdk-sticky-note-button pdk-sticky-note-menu', getLabel('noteOptions'), '...');
			const fullscreenButton = createIconButton('pdk-sticky-note-button pdk-sticky-note-fullscreen', getLabel('fullscreenNote'), '');
			const collapseButton = createIconButton('pdk-sticky-note-button pdk-sticky-note-collapse', getLabel('hideNote'), '');
			const closeButton = createIconButton('pdk-sticky-note-button pdk-sticky-note-close', getLabel('close'), 'x');

			noteElement.className = 'pdk-sticky-note';
			noteElement.dataset.pdkContext = contextTargets.STICKY_NOTE;
			noteElement.dataset.pdkResizeMode = 'both';
			syncNoteElementDocumentMetadata(noteElement, documentData);
			applyNoteColor(entry, documentData.color);
			dragHandle.className = 'pdk-sticky-note-chrome';
			dragHandle.dataset.pdkStickyNoteDragHandle = '1';
			actionGroup.className = 'pdk-sticky-note-actions';
			content.dataset.pdkContextMenuDisabled = '1';
			content.dataset.pdkNativeContextMenu = '1';

			actionGroup.append(menuButton, fullscreenButton, collapseButton, closeButton);
			dragHandle.append(createButton, discardButton, actionGroup);
			noteElement.append(dragHandle, content, toolbar);
			nextLayer.appendChild(noteElement);
			noteMap.set(documentId, entry);
			entry.saveTask = createSaveTask(entry);

			applyState(noteElement, normalizeState(state, noteMap.size - 1));
			bindDrag(noteElement, dragHandle, entry);
			if (stickyResizeHandles) {
				stickyResizeHandles.ensureResizeHandles(noteElement);
			}
			entry.formatCleanup = bindFormatToolbar(toolbar, entry);
			bindResizePersistence(noteElement);
			syncRunningState();

			noteElement.addEventListener('pointerdown', () => bringToFront(noteElement));
			content.addEventListener('input', () => {
				syncLocalDocumentContent(entry);
				entry.saveTask.schedule();
			});
			content.addEventListener('blur', () => {
				if (canAutoSaveEntry(entry)) {
					updateDocument(entry, {
						explicit: false
					});
				}
			});
			createButton.addEventListener('click', () => {
				createStickyNote({
					left: noteElement.offsetLeft + 28,
					top: noteElement.offsetTop + 28
				});
			});
			discardButton.addEventListener('click', () => confirmDiscardNote(entry));
			fullscreenButton.addEventListener('click', () => setFullscreen(entry, !noteElement.classList.contains('is-fullscreen')));
			collapseButton.addEventListener('click', () => setCollapsed(entry, !noteElement.classList.contains('is-collapsed')));
			closeButton.addEventListener('click', () => hideNote(documentId));
			menuButton.addEventListener('click', () => toggleNoteOptionsMenu(entry, menuButton));

			return noteElement;
		}

		function createStickyNote(state = {}) {
			if (!documentStore || typeof documentStore.create !== 'function') {
				return Promise.resolve(null);
			}

			const parentPath = getCreateParentPath(state);

			if (shouldAskOnFirstSave()) {
				const documentData = createTransientDocument({
					parentPath,
					unsaved: true
				});
				const noteElement = renderNote(documentData, normalizeCreateState(state));
				if (noteElement) {
					showNote(documentData.id);
					saveLayout();
				}

				return Promise.resolve(documentData);
			}

			return documentStore.create({
				content: '',
				kind: getStickyKind(),
				parentPath,
				title: getLabel('stickyNote')
			}).then((documentData) => {
				const noteElement = renderNote(documentData, normalizeCreateState(state));
				if (noteElement) {
					showNote(documentData.id);
					saveLayout();
				}

				return documentData;
			});
		}

		function openStickyNotes(state = {}) {
			return restore().then(() => {
				const hiddenEntry = getFirstNoteEntry({
					hiddenOnly: true
				});
				const firstEntry = hiddenEntry || getFirstNoteEntry();

				if (firstEntry && firstEntry.document) {
					showNote(firstEntry.document.id);
					return firstEntry.document;
				}

				return createStickyNote(state);
			});
		}

		function restore() {
			if (restorePromise) {
				return restorePromise;
			}

			if (!documentStore || typeof documentStore.list !== 'function') {
				restorePromise = Promise.resolve([]);
				syncRunningState();
				return restorePromise;
			}

			restorePromise = documentStore.list(getStickyKind(), {
				includeAllFolders: true
			}).then((documents) => {
				rememberDocuments(documents);
				documents.forEach((documentData) => {
					if (hasSavedState(documentData.id)) {
						renderNote(documentData, getSavedState(documentData.id));
					}
				});

				syncRunningState();
				return documents;
			}).catch(() => {
				syncRunningState();
				return [];
			});

			return restorePromise;
		}

		function getNotes() {
			const documents = new Map();

			knownDocuments.forEach((documentData) => {
				if (isStickyDocument(documentData)) {
					documents.set(Number.parseInt(documentData.id, 10), Object.assign({}, documentData));
				}
			});

			Array.from(noteMap.values()).forEach((entry) => {
				syncLocalDocumentContent(entry);
				if (entry && entry.document) {
					documents.set(Number.parseInt(entry.document.id, 10), entry.document);
				}
			});

			return Array.from(documents.values());
		}

		function getNoteSnapshot(documentId) {
			const entry = noteMap.get(Number.parseInt(documentId, 10));

			return entry
				? {
					document: Object.assign({}, entry.document),
					element: entry.element,
					state: readState(entry.element)
				}
				: null;
		}

		function renameNote(documentId, title) {
			const id = Number.parseInt(documentId, 10);
			const nextTitle = typeof title === 'string' ? title.trim() : '';
			const entry = noteMap.get(id);

			if (!Number.isFinite(id) || !nextTitle) {
				return Promise.resolve(false);
			}

			if (entry && entry.document) {
				entry.document.title = nextTitle;
				syncNoteElementDocumentMetadata(entry.element, entry.document);
			}

			if (!isPersistedDocumentId(id) || !documentStore || typeof documentStore.update !== 'function') {
				return Promise.resolve(entry ? entry.document : false);
			}

			return documentStore.update(id, {
				title: nextTitle
			}).then((documentData) => {
				const liveEntry = noteMap.get(id);

				if (liveEntry && liveEntry.document) {
					liveEntry.document = Object.assign({}, liveEntry.document, documentData, {
						content: getNoteContent(liveEntry),
						title: documentData.title || nextTitle
					});
					syncNoteElementDocumentMetadata(liveEntry.element, liveEntry.document);
					syncEntryDirtyState(liveEntry);
				}

				return documentData;
			});
		}

		function duplicateStickyNote(documentId, options = {}) {
			const snapshot = getNoteSnapshot(documentId);
			const offset = Number.isFinite(options.offset) ? options.offset : 28;

			if (!snapshot) {
				return Promise.resolve(null);
			}

			if (!isPersistedDocumentId(documentId)) {
				const state = Object.assign({}, snapshot.state, options.state && typeof options.state === 'object' ? options.state : {});
				const documentData = createTransientDocument({
					color: snapshot.document.color || 'yellow',
					content: snapshot.document.content || getNoteContent(noteMap.get(Number.parseInt(documentId, 10))),
					parentPath: '',
					path: '',
					title: snapshot.document.title || getLabel('stickyNote'),
					unsaved: true
				});

				if (options.render !== false) {
					state.left = toNumber(state.left, snapshot.state.left || 110) + offset;
					state.top = toNumber(state.top, snapshot.state.top || getStickySafeArea().top) + offset;
					renderNote(documentData, state);
					showNote(documentData.id);
					saveLayout();
				}

				return Promise.resolve(documentData);
			}

			if (!documentStore || typeof documentStore.duplicate !== 'function') {
				return Promise.resolve(null);
			}

			return documentStore.duplicate(documentId, {
				parentPath: options.parentPath || snapshot.document.parentPath || ''
			}).then((documentData) => {
				const state = Object.assign({}, snapshot.state, options.state && typeof options.state === 'object' ? options.state : {});

				if (options.render !== false) {
					state.left = toNumber(state.left, snapshot.state.left || 110) + offset;
					state.top = toNumber(state.top, snapshot.state.top || getStickySafeArea().top) + offset;
					renderNote(documentData, state);
					showNote(documentData.id);
					saveLayout();
				}

				return documentData;
			});
		}

		if (window.PufferDesk.events && typeof window.PufferDesk.events.on === 'function' && eventNames.DOCUMENTS_CHANGED) {
			window.PufferDesk.events.on(eventNames.DOCUMENTS_CHANGED, (detail = {}) => {
				const documentData = detail && detail.document ? detail.document : null;
				const documentId = Number.parseInt(documentData && documentData.id ? documentData.id : detail.id, 10);
				const entry = noteMap.get(documentId);

				if (detail.type === 'delete') {
					forgetDocument(documentId);
					if (entry) {
						removeRenderedNote(documentId);
					}
					return;
				}

				if (!documentData) {
					return;
				}

				rememberDocument(documentData);
				if (!entry) {
					return;
				}

				entry.document = Object.assign({}, entry.document || {}, documentData, {
					content: getNoteContent(entry)
				});
				syncNoteElementDocumentMetadata(entry.element, entry.document);
			});
		}

		return {
			createStickyNote,
			deleteNote,
			duplicateStickyNote,
			getNoteSnapshot,
			getNotes,
			hasHiddenNotes,
			hasOpenNotes,
			hideNote,
			openStickyNotes,
			renameNote,
			removeRenderedNote,
			renderNote,
			restore,
			showNote
		};
	};
})();
