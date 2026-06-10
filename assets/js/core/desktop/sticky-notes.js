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
		const richText = window.PufferDesk.richText || null;
		const titlebarActions = window.PufferDesk.windows && window.PufferDesk.windows.titlebarActions
			? window.PufferDesk.windows.titlebarActions
			: null;
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
					noteElement.dataset.pdkExpandedHeight = String(Math.max(140, Math.round(noteElement.offsetHeight || 0)));
					saveLayout();
				},
				syncSafeArea: () => getStickySafeArea()
			})
			: null;
		const stickyNotesAppId = 'sticky-notes';
		const noteMap = new Map();
		let layer = null;
		let openOptionsMenu = null;
		let restorePromise = null;
		let highestZ = 40;

		function isRedmondTheme() {
			const theme = config.theme && typeof config.theme === 'object' ? config.theme : {};
			const user = config.user && typeof config.user === 'object' ? config.user : {};

			return theme.family === 'redmond' || theme.id === 'redmond/modern' || user.themeId === 'redmond/modern';
		}

		function getStickyKind() {
			return documentStore && documentStore.kinds ? documentStore.kinds.sticky : 'sticky_note';
		}

		function getStickyNotesApp() {
			const apps = Array.isArray(config.apps) ? config.apps : [];

			return apps.find((app) => app && app.id === stickyNotesAppId) || null;
		}

		function getStickyNotesAppLabel() {
			const app = getStickyNotesApp();

			return app && typeof app.label === 'string' && app.label ? app.label : getLabel('stickyNotes', 'Sticky Notes');
		}

		function dispatchActiveStickyNoteChange(entry) {
			const app = getStickyNotesApp();

			shell.dispatchEvent(new window.CustomEvent('pufferDesk:active-window-change', {
				detail: {
					appId: stickyNotesAppId,
					documentId: entry && entry.document ? entry.document.id : '',
					id: stickyNotesAppId,
					kind: 'app',
					menu: app && app.menu ? app.menu : null,
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

		function syncRunningState() {
			if (runningState && typeof runningState.setExternal === 'function') {
				runningState.setExternal(stickyNotesAppId, hasOpenNotes(), {
					shell,
					source: 'sticky-notes'
				});
			}
		}

		function getLabel(key, fallback) {
			return typeof labels[key] === 'string' && labels[key] ? labels[key] : fallback;
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

		function getMenuBarHeight() {
			const menuBar = shell ? shell.querySelector('.pdk-menu-bar') : null;

			if (!menuBar || shell.dataset.pdkShellTopBar === 'none') {
				return 0;
			}

			return Math.ceil(menuBar.getBoundingClientRect().height);
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
			const rawTop = toNumber(noteElement.style.top, noteElement.offsetTop || bounds.minTop);
			const migratedTop = noteElement.dataset.pdkStickyTopSnap === '1'
				? migrateLegacyDefaultTop(rawTop, getNoteIndex(noteElement))
				: rawTop;
			const nextTop = clamp(migratedTop, bounds.minTop, bounds.maxTop);

			noteElement.style.left = `${Math.round(nextLeft)}px`;
			noteElement.style.top = `${Math.round(nextTop)}px`;
			noteElement.dataset.pdkStickyTopSnap = '0';
		}

		function ensureLayer() {
			if (layer || !desktop) {
				return layer;
			}

			layer = desktop.querySelector('.pdk-sticky-note-layer');
			if (!layer) {
				layer = document.createElement('section');
				layer.className = 'pdk-sticky-note-layer';
				layer.setAttribute('aria-label', getLabel('stickyNote', 'Sticky Notes'));
				desktop.appendChild(layer);
			}

			return layer;
		}

		function getSavedNotes() {
			return sessionStore && typeof sessionStore.getSection === 'function'
				? sessionStore.getSection('stickyNotes', [])
				: [];
		}

		function getSavedState(documentId) {
			const savedNotes = getSavedNotes();
			const match = Array.isArray(savedNotes)
				? savedNotes.find((note) => Number.parseInt(note.id, 10) === Number.parseInt(documentId, 10))
				: null;

			return match && match.state && typeof match.state === 'object'
				? Object.assign({}, match.state, {
					_pdkFromSavedLayout: true
				})
				: {};
		}

		function getDefaultLeft(index = 0) {
			return 110 + (index % 5) * 34;
		}

		function getLegacyDefaultTop(index = 0) {
			return 76 + (index % 5) * 34;
		}

		function getPreviousSafeDefaultTop(index = 0) {
			return getMenuBarHeight() + Math.max(8, getCssPixelValue('--pdk-window-safe-edge', 8)) + (index % 5) * 34;
		}

		function getWindowSafeDefaultTop(index = 0) {
			return getMenuBarHeight() + Math.max(0, getCssPixelValue('--pdk-window-safe-edge', 8)) + (index % 5) * 34;
		}

		function getDesktopIconLayerDefaultTop(index = 0) {
			return getCssPixelValue('--pdk-desktop-icon-layer-top', getMenuBarHeight() + 8) + (index % 5) * 34;
		}

		function getDefaultTop(index = 0) {
			return (isRedmondTheme() ? 76 : getStickySafeArea().top) + (index % 5) * 34;
		}

		function isNearTop(value, target, tolerance = 2) {
			return Math.abs(value - target) <= tolerance;
		}

		function migrateLegacyDefaultTop(top, index = 0) {
			if (isRedmondTheme()) {
				return top;
			}

			if (isNearTop(top, getLegacyDefaultTop(index))) {
				return getDefaultTop(index);
			}

			if (
				[
					getPreviousSafeDefaultTop(index),
					getWindowSafeDefaultTop(index),
					getDesktopIconLayerDefaultTop(index)
				].some((candidate) => isNearTop(top, candidate, 12))
			) {
				return getDefaultTop(index);
			}

			return top;
		}

		function getDefaultState(index = 0, overrides = {}) {
			const redmond = isRedmondTheme();

			return {
				height: toNumber(overrides.height, redmond ? 254 : 285),
				left: toNumber(overrides.left, getDefaultLeft(index)),
				top: toNumber(overrides.top, getDefaultTop(index)),
				width: toNumber(overrides.width, redmond ? 305 : 360),
				zIndex: toNumber(overrides.zIndex, highestZ + 1)
			};
		}

		function normalizeState(state = {}, index = 0) {
			const defaults = getDefaultState(index, state);
			const desktopRect = desktop ? desktop.getBoundingClientRect() : { width: 1200, height: 800 };
			const safeArea = getStickySafeArea();
			const minWidth = 180;
			const minHeight = 140;
			const collapsed = Boolean(state.collapsed);
			const expandedHeight = toNumber(state.expandedHeight, defaults.height);
			const restoreState = state.restore && typeof state.restore === 'object' ? state.restore : {};
			const width = clamp(toNumber(state.width, defaults.width), minWidth, Math.max(minWidth, desktopRect.width - safeArea.left - safeArea.right));
			const height = clamp(toNumber(state.height, defaults.height), minHeight, Math.max(minHeight, desktopRect.height - safeArea.top - safeArea.bottom));
			const maxLeft = Math.max(safeArea.left, desktopRect.width - width - safeArea.right);
			const maxTop = Math.max(safeArea.top, desktopRect.height - height - safeArea.bottom);
			const zIndex = toNumber(state.zIndex, defaults.zIndex);
			const top = state._pdkFromSavedLayout
				? migrateLegacyDefaultTop(toNumber(state.top, defaults.top), index)
				: toNumber(state.top, defaults.top);
			const restoreTop = state._pdkFromSavedLayout
				? migrateLegacyDefaultTop(toNumber(state.restoreTop, toNumber(restoreState.top, defaults.top)), index)
				: toNumber(state.restoreTop, toNumber(restoreState.top, defaults.top));

			highestZ = Math.max(highestZ, zIndex);

			return {
				collapsed,
				expandedHeight,
				fromSavedLayout: Boolean(state._pdkFromSavedLayout),
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

		function applyState(noteElement, state) {
			const fullscreenBounds = state.fullscreen ? getFullscreenBounds() : null;
			const nextLeft = fullscreenBounds ? fullscreenBounds.left : state.left;
			const nextTop = fullscreenBounds ? fullscreenBounds.top : state.top;
			const nextWidth = fullscreenBounds ? fullscreenBounds.width : state.width;
			const nextHeight = fullscreenBounds ? fullscreenBounds.height : state.height;

			noteElement.dataset.pdkRestoreLeft = `${toNumber(state.restoreLeft, state.left)}px`;
			noteElement.dataset.pdkRestoreTop = `${toNumber(state.restoreTop, state.top)}px`;
			noteElement.dataset.pdkRestoreWidth = `${toNumber(state.restoreWidth, state.width)}px`;
			noteElement.dataset.pdkRestoreHeight = `${toNumber(state.restoreHeight, state.expandedHeight || state.height || 285)}px`;
			noteElement.dataset.pdkStickyTopSnap = state.fromSavedLayout ? '1' : '0';
			noteElement.style.left = `${nextLeft}px`;
			noteElement.style.top = `${nextTop}px`;
			noteElement.style.width = `${nextWidth}px`;
			noteElement.style.height = state.collapsed
				? `${getCollapsedHeight(noteElement)}px`
				: `${nextHeight}px`;
			noteElement.style.zIndex = String(state.zIndex);
			noteElement.hidden = Boolean(state.hidden);
			noteElement.dataset.pdkExpandedHeight = String(Math.max(140, state.expandedHeight || state.height || 285));
			noteElement.classList.toggle('is-collapsed', Boolean(state.collapsed));
			noteElement.classList.toggle('is-fullscreen', Boolean(state.fullscreen));
		}

		function getCollapsedHeight(noteElement) {
			const chrome = noteElement ? noteElement.querySelector('.pdk-sticky-note-chrome') : null;
			const height = chrome ? Math.round(chrome.getBoundingClientRect().height) : 28;

			return Math.max(24, height);
		}

		function getFullscreenBounds() {
			const safeArea = getStickySafeArea();

			return {
				height: Math.max(140, desktop.clientHeight - safeArea.top - safeArea.bottom),
				left: safeArea.left,
				top: safeArea.top,
				width: Math.max(180, desktop.clientWidth - safeArea.left - safeArea.right)
			};
		}

		function readState(noteElement) {
			const collapsed = noteElement.classList.contains('is-collapsed');
			const expandedHeight = toNumber(noteElement.dataset.pdkExpandedHeight, Math.round(noteElement.offsetHeight || 285));

			return {
				collapsed,
				expandedHeight,
				fullscreen: noteElement.classList.contains('is-fullscreen'),
				height: collapsed ? expandedHeight : Math.round(noteElement.offsetHeight || 0),
				hidden: noteElement.hidden,
				left: toNumber(noteElement.style.left, Math.round(noteElement.offsetLeft || 0)),
				restoreHeight: toNumber(noteElement.dataset.pdkRestoreHeight, expandedHeight),
				restoreLeft: toNumber(noteElement.dataset.pdkRestoreLeft, toNumber(noteElement.style.left, Math.round(noteElement.offsetLeft || 0))),
				restoreTop: toNumber(noteElement.dataset.pdkRestoreTop, toNumber(noteElement.style.top, Math.round(noteElement.offsetTop || 0))),
				restoreWidth: toNumber(noteElement.dataset.pdkRestoreWidth, Math.round(noteElement.offsetWidth || 0)),
				top: toNumber(noteElement.style.top, Math.round(noteElement.offsetTop || 0)),
				width: Math.round(noteElement.offsetWidth || 0),
				zIndex: toNumber(noteElement.style.zIndex, highestZ)
			};
		}

		function serializeNotes() {
			return Array.from(noteMap.values()).map((entry) => ({
				id: entry.document.id,
				state: readState(entry.element)
			}));
		}

		function saveLayout() {
			if (sessionStore && typeof sessionStore.saveSection === 'function') {
				sessionStore.saveSection('stickyNotes', serializeNotes());
			}
		}

		function bringToFront(noteElement) {
			highestZ += 1;
			noteElement.style.zIndex = String(highestZ);
			const entry = Array.from(noteMap.values()).find((item) => item && item.element === noteElement);
			if (entry) {
				dispatchActiveStickyNoteChange(entry);
			}
			saveLayout();
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
					label: documentData.title || getLabel('stickyNote', 'Sticky Note'),
					placeholder: getLabel('stickyPlaceholder', 'Take a note...')
				});
			}

			const content = document.createElement('textarea');
			content.className = 'pdk-sticky-note-content';
			content.placeholder = getLabel('stickyPlaceholder', 'Take a note...');
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
			toolbar.setAttribute('aria-label', getLabel('formatting', 'Formatting'));
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

			if (!documentStore || typeof documentStore.update !== 'function') {
				return Promise.resolve(false);
			}

			return documentStore.update(entry.document.id, {
				color: nextColor
			}).then((documentData) => {
				entry.document = Object.assign({}, documentData, {
					content: entry.content ? entry.content.value : documentData.content
				});
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
			const notesListButton = createOptionsMenuItem('is-notes-list', getLabel('notesList', 'Notes list'));
			const deleteButton = createOptionsMenuItem('is-delete-note', getLabel('deleteNote', 'Delete Note'));

			menu.className = 'pdk-sticky-note-options';
			menu.setAttribute('role', 'menu');
			menu.append(createColorPalette(entry), notesListButton, deleteButton);
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

			notesListButton.addEventListener('click', () => {
				closeNoteOptionsMenu();
				openNotesListApp();
			});
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

		function updateDocument(entry) {
			if (!documentStore || !entry || !entry.document || !entry.content) {
				return Promise.resolve(false);
			}

			const content = entry.content.value;

			return documentStore.update(entry.document.id, {
				content,
				kind: getStickyKind()
			}).then((documentData) => {
				entry.document = documentData;
				return true;
			}).catch(() => false);
		}

		function createSaveTask(entry) {
			if (!createDebouncedTask) {
				return {
					run: () => updateDocument(entry),
					schedule: () => updateDocument(entry)
				};
			}

			return createDebouncedTask(() => updateDocument(entry), {
				wait: 520
			});
		}

		function hideNote(documentId) {
			const entry = noteMap.get(Number.parseInt(documentId, 10));
			if (!entry) {
				return false;
			}

			entry.element.hidden = true;
			saveLayout();
			syncRunningState();
			return true;
		}

		function showNote(documentId) {
			const entry = noteMap.get(Number.parseInt(documentId, 10));
			if (!entry) {
				return false;
			}

			entry.element.hidden = false;
			entry.element.classList.remove('is-collapsed');
			entry.element.style.height = `${toNumber(entry.element.dataset.pdkExpandedHeight, 285)}px`;
			constrainNoteElement(entry.element);
			bringToFront(entry.element);
			entry.content.focus();
			syncRunningState();
			return true;
		}

		function deleteNote(documentId) {
			const entry = noteMap.get(Number.parseInt(documentId, 10));
			const removeElement = () => {
				if (entry) {
					closeNoteOptionsMenu();
					if (typeof entry.formatCleanup === 'function') {
						entry.formatCleanup();
					}
					entry.element.remove();
					noteMap.delete(entry.document.id);
					saveLayout();
					syncRunningState();
				}

				return true;
			};

			if (!documentStore) {
				return Promise.resolve(removeElement());
			}

			return documentStore.remove(documentId).then(removeElement);
		}

		function setCollapsed(entry, collapsed) {
			if (!entry || !entry.element) {
				return false;
			}

			if (collapsed) {
				entry.element.dataset.pdkExpandedHeight = String(Math.max(140, Math.round(entry.element.offsetHeight || 285)));
				entry.element.classList.remove('is-fullscreen');
				entry.element.classList.add('is-collapsed');
				entry.element.style.height = `${getCollapsedHeight(entry.element)}px`;
			} else {
				entry.element.classList.remove('is-collapsed');
				entry.element.style.height = `${toNumber(entry.element.dataset.pdkExpandedHeight, 285)}px`;
			}

			saveLayout();
			return true;
		}

		function setFullscreen(entry, fullscreen) {
			if (!entry || !entry.element || !desktop) {
				return false;
			}

			if (fullscreen) {
				const bounds = getFullscreenBounds();
				entry.element.dataset.pdkRestoreLeft = entry.element.style.left || '';
				entry.element.dataset.pdkRestoreTop = entry.element.style.top || '';
				entry.element.dataset.pdkRestoreWidth = entry.element.style.width || '';
				entry.element.dataset.pdkRestoreHeight = entry.element.style.height || '';
				entry.element.classList.remove('is-collapsed');
				entry.element.classList.add('is-fullscreen');
				entry.element.style.left = `${bounds.left}px`;
				entry.element.style.top = `${bounds.top}px`;
				entry.element.style.width = `${bounds.width}px`;
				entry.element.style.height = `${bounds.height}px`;
			} else {
				entry.element.classList.remove('is-fullscreen');
				entry.element.style.left = entry.element.dataset.pdkRestoreLeft || entry.element.style.left;
				entry.element.style.top = entry.element.dataset.pdkRestoreTop || entry.element.style.top;
				entry.element.style.width = entry.element.dataset.pdkRestoreWidth || entry.element.style.width;
				entry.element.style.height = entry.element.dataset.pdkRestoreHeight || `${toNumber(entry.element.dataset.pdkExpandedHeight, 285)}px`;
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

			if (!entry.content || !editorHasContent(entry.content)) {
				return deleteNote(entry.document.id);
			}

			const dialogs = getDialogs();
			const fallback = () => {
				if (window.confirm && !window.confirm(getLabel('deleteStickyNote', 'Delete this note?'))) {
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
						label: getLabel('saveEllipsis', 'Save...'),
						variant: 'primary'
					},
					{
						id: 'delete',
						label: getLabel('deleteNote', 'Delete Note'),
						variant: 'danger'
					},
					{
						id: 'cancel',
						label: getLabel('cancel', 'Cancel'),
						variant: 'cancel'
					}
				],
				cancelAction: 'cancel',
				icon: 'dashicons-sticky',
				message: getLabel('discardNoteMessage', 'Are you sure you want to discard this sticky note?'),
				style: 'floating',
				title: getLabel('discardNoteTitle', "If you don't save this note, its contents will be lost."),
				variant: 'sticky-note-discard'
			}).then((action) => {
				if (action === 'delete') {
					return deleteNote(entry.document.id);
				}

				if (action === 'save') {
					return entry.saveTask.run();
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
				}

				const desktopRect = desktop.getBoundingClientRect();
				const safeArea = getStickySafeArea();
				const width = noteElement.offsetWidth;
				const height = noteElement.offsetHeight;
				const nextLeft = clamp(dragState.left + deltaX, safeArea.left, Math.max(safeArea.left, desktopRect.width - width - safeArea.right));
				const nextTop = clamp(dragState.top + deltaY, safeArea.top, Math.max(safeArea.top, desktopRect.height - height - safeArea.bottom));

				noteElement.style.left = `${Math.round(nextLeft)}px`;
				noteElement.style.top = `${Math.round(nextTop)}px`;
			}

			function onPointerUp() {
				if (!dragState) {
					return;
				}

				const didDrag = dragState.started;
				dragState = null;
				noteElement.classList.remove('is-dragging');
				if (didDrag) {
					saveLayout();
				}
				window.removeEventListener('pointermove', onPointerMove);
				window.removeEventListener('pointerup', onPointerUp);
				window.removeEventListener('pointercancel', onPointerUp);
			}

			dragHandle.addEventListener('pointerdown', (event) => {
				if (event.button !== 0 || !desktop || isChromeInteractiveTarget(event.target, dragHandle)) {
					return;
				}

				event.preventDefault();
				bringToFront(noteElement);
				noteElement.dataset.pdkStickyTopSnap = '0';
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
				window.addEventListener('pointercancel', onPointerUp);
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

			if (noteMap.has(documentId)) {
				const existing = noteMap.get(documentId);
				existing.document = documentData;
				existing.content.value = documentData.content || '';
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
				element: noteElement,
				formatCleanup: null,
				saveTask: null
			};
			const createButton = createIconButton('pdk-sticky-note-button pdk-sticky-note-new', getLabel('newStickyNote', 'New Sticky Note'), '+');
			const discardButton = createIconButton('pdk-sticky-note-button pdk-sticky-note-discard', getLabel('discardNote', 'Discard Note'), '');
			const menuButton = createIconButton('pdk-sticky-note-button pdk-sticky-note-menu', getLabel('noteOptions', 'Note options'), '...');
			const fullscreenButton = createIconButton('pdk-sticky-note-button pdk-sticky-note-fullscreen', getLabel('fullscreenNote', 'Make Full Screen'), '');
			const collapseButton = createIconButton('pdk-sticky-note-button pdk-sticky-note-collapse', getLabel('hideNote', 'Hide Note'), '');
			const closeButton = createIconButton('pdk-sticky-note-button pdk-sticky-note-close', getLabel('close', 'Close'), 'x');

			noteElement.className = 'pdk-sticky-note';
			noteElement.dataset.pdkContext = 'sticky-note';
			noteElement.dataset.pdkContextMenuDisabled = '1';
			noteElement.dataset.pdkContextId = String(documentId);
			noteElement.dataset.pdkResizeMode = 'both';
			noteElement.setAttribute('aria-label', documentData.title || getLabel('stickyNote', 'Sticky Note'));
			applyNoteColor(entry, documentData.color);
			dragHandle.className = 'pdk-sticky-note-chrome';
			dragHandle.dataset.pdkStickyNoteDragHandle = '1';
			actionGroup.className = 'pdk-sticky-note-actions';

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
			content.addEventListener('input', () => entry.saveTask.schedule());
			content.addEventListener('blur', () => entry.saveTask.run());
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

			return documentStore.create({
				content: '',
				kind: getStickyKind(),
				title: getLabel('stickyNote', 'Sticky Note')
			}).then((documentData) => {
				const noteElement = renderNote(documentData, normalizeCreateState(state));
				if (noteElement) {
					showNote(documentData.id);
					saveLayout();
				}

				return documentData;
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

			restorePromise = documentStore.list(getStickyKind()).then((documents) => {
				documents.forEach((documentData) => {
					renderNote(documentData, getSavedState(documentData.id));
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
			return Array.from(noteMap.values()).map((entry) => entry.document);
		}

		return {
			createStickyNote,
			deleteNote,
			getNotes,
			hasOpenNotes,
			hideNote,
			renderNote,
			restore,
			showNote
		};
	};
})();
