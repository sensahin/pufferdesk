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
		const noteMap = new Map();
		let layer = null;
		let restorePromise = null;
		let highestZ = 40;

		function getStickyKind() {
			return documentStore && documentStore.kinds ? documentStore.kinds.sticky : 'sticky_note';
		}

		function getDialogs() {
			return options.dialogs || window.PufferDesk.shellDialogs || null;
		}

		function getLabel(key, fallback) {
			return typeof labels[key] === 'string' && labels[key] ? labels[key] : fallback;
		}

		function clamp(value, min, max) {
			return geometry && typeof geometry.clamp === 'function'
				? geometry.clamp(value, min, max)
				: Math.min(Math.max(min, value), Math.max(min, max));
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

			return match && match.state && typeof match.state === 'object' ? match.state : {};
		}

		function getDefaultState(index = 0, overrides = {}) {
			return {
				height: toNumber(overrides.height, 285),
				left: toNumber(overrides.left, 110 + (index % 5) * 34),
				top: toNumber(overrides.top, 76 + (index % 5) * 34),
				width: toNumber(overrides.width, 360),
				zIndex: toNumber(overrides.zIndex, highestZ + 1)
			};
		}

		function normalizeState(state = {}, index = 0) {
			const defaults = getDefaultState(index, state);
			const desktopRect = desktop ? desktop.getBoundingClientRect() : { width: 1200, height: 800 };
			const minWidth = 180;
			const minHeight = 140;
			const collapsed = Boolean(state.collapsed);
			const expandedHeight = toNumber(state.expandedHeight, defaults.height);
			const restoreState = state.restore && typeof state.restore === 'object' ? state.restore : {};
			const width = clamp(toNumber(state.width, defaults.width), minWidth, Math.max(minWidth, desktopRect.width - 24));
			const height = clamp(toNumber(state.height, defaults.height), minHeight, Math.max(minHeight, desktopRect.height - 24));
			const maxLeft = Math.max(8, desktopRect.width - width - 8);
			const maxTop = Math.max(8, desktopRect.height - height - 8);
			const zIndex = toNumber(state.zIndex, defaults.zIndex);

			highestZ = Math.max(highestZ, zIndex);

			return {
				collapsed,
				expandedHeight,
				fullscreen: !collapsed && Boolean(state.fullscreen),
				height,
				hidden: Boolean(state.hidden),
				left: clamp(toNumber(state.left, defaults.left), 8, maxLeft),
				restoreHeight: toNumber(state.restoreHeight, toNumber(restoreState.height, expandedHeight)),
				restoreLeft: toNumber(state.restoreLeft, toNumber(restoreState.left, defaults.left)),
				restoreTop: toNumber(state.restoreTop, toNumber(restoreState.top, defaults.top)),
				restoreWidth: toNumber(state.restoreWidth, toNumber(restoreState.width, defaults.width)),
				top: clamp(toNumber(state.top, defaults.top), 8, maxTop),
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
			const menuBar = shell ? shell.querySelector('.pdk-menu-bar') : null;
			const safeTop = menuBar && shell.dataset.pdkShellTopBar !== 'none'
				? Math.max(8, Math.round(menuBar.getBoundingClientRect().height) + 8)
				: 8;

			return {
				height: Math.max(140, desktop.clientHeight - safeTop - 8),
				left: 8,
				top: safeTop,
				width: Math.max(180, desktop.clientWidth - 16)
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
			bringToFront(entry.element);
			entry.content.focus();
			return true;
		}

		function deleteNote(documentId) {
			const entry = noteMap.get(Number.parseInt(documentId, 10));
			const removeElement = () => {
				if (entry) {
					entry.element.remove();
					noteMap.delete(entry.document.id);
					saveLayout();
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
			}

			bringToFront(entry.element);
			saveLayout();
			return true;
		}

		function confirmDiscardNote(entry) {
			const content = entry && entry.content ? String(entry.content.value || '') : '';
			if (!content.trim()) {
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
				message: getLabel('discardNoteMessage', 'Are you sure you want to discard this Stickies note?'),
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

		function bindDrag(noteElement, dragHandle) {
			let dragState = null;

			function onPointerMove(event) {
				if (!dragState) {
					return;
				}

				const desktopRect = desktop.getBoundingClientRect();
				const width = noteElement.offsetWidth;
				const height = noteElement.offsetHeight;
				const nextLeft = clamp(dragState.left + event.clientX - dragState.clientX, 8, Math.max(8, desktopRect.width - width - 8));
				const nextTop = clamp(dragState.top + event.clientY - dragState.clientY, 8, Math.max(8, desktopRect.height - height - 8));

				noteElement.style.left = `${Math.round(nextLeft)}px`;
				noteElement.style.top = `${Math.round(nextTop)}px`;
			}

			function onPointerUp() {
				if (!dragState) {
					return;
				}

				dragState = null;
				noteElement.classList.remove('is-dragging');
				saveLayout();
				window.removeEventListener('pointermove', onPointerMove);
				window.removeEventListener('pointerup', onPointerUp);
				window.removeEventListener('pointercancel', onPointerUp);
			}

			dragHandle.addEventListener('pointerdown', (event) => {
				if (event.button !== 0 || !desktop || event.target.closest('button')) {
					return;
				}

				bringToFront(noteElement);
				dragState = {
					clientX: event.clientX,
					clientY: event.clientY,
					left: noteElement.offsetLeft,
					top: noteElement.offsetTop
				};
				noteElement.classList.add('is-dragging');
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
				applyState(existing.element, normalizeState(state, noteMap.size));
				return existing.element;
			}

			const noteElement = document.createElement('article');
			const dragHandle = document.createElement('div');
			const actionGroup = document.createElement('div');
			const content = document.createElement('textarea');
			const toolbar = document.createElement('div');
			const entry = {
				content,
				document: documentData,
				element: noteElement,
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
			noteElement.dataset.pdkContextId = String(documentId);
			noteElement.setAttribute('aria-label', documentData.title || getLabel('stickyNote', 'Sticky Note'));
			dragHandle.className = 'pdk-sticky-note-chrome';
			dragHandle.dataset.pdkStickyNoteDragHandle = '1';
			actionGroup.className = 'pdk-sticky-note-actions';
			content.className = 'pdk-sticky-note-content';
			content.placeholder = getLabel('stickyPlaceholder', 'Take a note...');
			content.value = documentData.content || '';
			toolbar.className = 'pdk-sticky-note-toolbar';
			toolbar.setAttribute('aria-hidden', 'true');
			toolbar.innerHTML = '<span>B</span><span>I</span><span>U</span><span>ab</span><span class="dashicons dashicons-editor-ul"></span><span class="dashicons dashicons-format-image"></span>';

			actionGroup.append(menuButton, fullscreenButton, collapseButton, closeButton);
			dragHandle.append(createButton, discardButton, actionGroup);
			noteElement.append(dragHandle, content, toolbar);
			nextLayer.appendChild(noteElement);
			noteMap.set(documentId, entry);
			entry.saveTask = createSaveTask(entry);

			applyState(noteElement, normalizeState(state, noteMap.size - 1));
			bindDrag(noteElement, dragHandle);
			bindResizePersistence(noteElement);

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
			menuButton.addEventListener('click', () => {
				if (window.confirm && !window.confirm(getLabel('deleteStickyNote', 'Delete this note?'))) {
					return;
				}

				deleteNote(documentId);
			});

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
				return restorePromise;
			}

			restorePromise = documentStore.list(getStickyKind()).then((documents) => {
				documents.forEach((documentData) => {
					renderNote(documentData, getSavedState(documentData.id));
				});

				return documents;
			}).catch(() => []);

			return restorePromise;
		}

		function getNotes() {
			return Array.from(noteMap.values()).map((entry) => entry.document);
		}

		return {
			createStickyNote,
			deleteNote,
			getNotes,
			hideNote,
			renderNote,
			restore,
			showNote
		};
	};
})();
