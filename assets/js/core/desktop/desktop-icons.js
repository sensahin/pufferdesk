(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};
	window.AdminOSMode.desktop = window.AdminOSMode.desktop || {};

	window.AdminOSMode.desktop.createDesktopIconManager = function createDesktopIconManager(shell, options = {}) {
		const dom = window.AdminOSMode.dom;
		const desktop = shell.querySelector('.aos-desktop');
		const sessionStore = window.AdminOSMode.session.createSessionStore(options.storageKey || '');
		let restoreInProgress = false;
		let sessionSaveDisabled = false;
		let saveTimer = null;
		let dragZIndex = 20;
		let activeDropTarget = null;
		let currentSortMode = 'none';
		let selectedIcon = null;
		const sortModes = [
			'none',
			'snap-to-grid',
			'name',
			'kind',
			'last-modified-by',
			'date-last-opened',
			'date-added',
			'date-modified',
			'date-created',
			'size'
		];
		const sortDatasetKeys = {
			'date-added': 'aosDateAdded',
			'date-created': 'aosDateCreated',
			'date-last-opened': 'aosDateLastOpened',
			'date-modified': 'aosDateModified',
			'last-modified-by': 'aosLastModifiedBy',
			size: 'aosSize'
		};

		function readNumber(value) {
			const parsed = Number.parseFloat(value);
			return Number.isFinite(parsed) ? parsed : null;
		}

		function clamp(value, min, max) {
			return Math.min(Math.max(min, value), Math.max(min, max));
		}

		function getIconLayer(icon) {
			return icon.closest('.aos-desktop-icon-layer') || desktop;
		}

		function getIcons() {
			return desktop ? Array.from(desktop.querySelectorAll('[data-aos-desktop-icon]')) : [];
		}

		function getVisibleIcons() {
			return getIcons().filter((icon) => !icon.hidden);
		}

		function getIconKey(icon) {
			if (!icon) {
				return '';
			}

			if (icon.dataset.aosDesktopIconId) {
				return icon.dataset.aosDesktopIconId;
			}

			const kind = icon.dataset.aosDesktopIconKind || 'item';
			const id = icon.dataset.aosOpenApp || icon.dataset.aosOpenFolder || icon.dataset.aosContextId || '';

			return id ? `${kind}:${id}` : '';
		}

		function getIconDetail(icon) {
			if (!icon || !icon.dataset) {
				return {
					id: '',
					kind: '',
					key: ''
				};
			}

			return {
				id: icon.dataset.aosOpenApp || icon.dataset.aosOpenFolder || icon.dataset.aosContextId || '',
				kind: icon.dataset.aosDesktopIconKind || 'item',
				key: getIconKey(icon)
			};
		}

		function isTextEditingTarget(target) {
			return Boolean(target && typeof target.closest === 'function' && target.closest('a, input, select, textarea, [contenteditable="true"], [contenteditable="plaintext-only"]'));
		}

		function normalizeSortMode(mode) {
			return sortModes.includes(mode) ? mode : 'none';
		}

		function loadSortMode() {
			const stored = sessionStore.getSection('desktopSort', {});

			currentSortMode = normalizeSortMode(stored && typeof stored === 'object' ? stored.mode : stored);
			return currentSortMode;
		}

		function saveSortMode() {
			if (!options.storageKey || sessionSaveDisabled) {
				return;
			}

			sessionStore.saveSection('desktopSort', {
				mode: currentSortMode
			});
		}

		function getIconLabel(icon) {
			const label = icon.dataset.aosContextLabel
				|| (icon.querySelector('.aos-desktop-app-label') ? icon.querySelector('.aos-desktop-app-label').textContent : '')
				|| '';

			return String(label).trim().toLowerCase();
		}

		function getKindLabel(icon) {
			const kind = icon.dataset.aosDesktopIconKind || 'item';
			if (kind === 'folder') {
				return 'folder';
			}
			if (kind === 'app') {
				return 'application';
			}

			return kind;
		}

		function getIconSortValue(icon, mode) {
			if (mode === 'name') {
				return getIconLabel(icon);
			}

			if (mode === 'kind') {
				return getKindLabel(icon);
			}

			const key = sortDatasetKeys[mode];
			const value = key && icon.dataset ? icon.dataset[key] || '' : '';

			if (mode === 'size') {
				const parsed = Number.parseFloat(value);
				return Number.isFinite(parsed) ? parsed : 0;
			}

			if (mode && mode.startsWith('date-')) {
				const parsed = Date.parse(value);
				return Number.isFinite(parsed) ? parsed : 0;
			}

			return String(value).trim().toLowerCase();
		}

		function compareValues(first, second) {
			if (typeof first === 'number' || typeof second === 'number') {
				return (first || 0) - (second || 0);
			}

			return String(first || '').localeCompare(String(second || ''), undefined, {
				numeric: true,
				sensitivity: 'base'
			});
		}

		function compareIcons(mode) {
			return (first, second) => {
				const primary = compareValues(getIconSortValue(first, mode), getIconSortValue(second, mode));
				if (primary !== 0) {
					return primary;
				}

				const name = compareValues(getIconLabel(first), getIconLabel(second));
				if (name !== 0) {
					return name;
				}

				return compareValues(getIconKey(first), getIconKey(second));
			};
		}

		function getDropDetail(sourceIcon, targetIcon) {
			const source = getIconDetail(sourceIcon);
			const target = getIconDetail(targetIcon);

			return {
				sourceIcon,
				sourceId: source.id,
				sourceKey: source.key,
				sourceKind: source.kind,
				targetIcon,
				targetId: target.id,
				targetKey: target.key,
				targetKind: target.kind
			};
		}

		function canDropOnFolder(sourceIcon, targetIcon) {
			if (!sourceIcon || !targetIcon || sourceIcon === targetIcon) {
				return false;
			}

			if (targetIcon.hidden || targetIcon.dataset.aosDesktopIconKind !== 'folder') {
				return false;
			}

			if (typeof options.canDropOnFolder === 'function') {
				return Boolean(options.canDropOnFolder(getDropDetail(sourceIcon, targetIcon)));
			}

			return false;
		}

		function clearDropTarget() {
			if (activeDropTarget) {
				activeDropTarget.classList.remove('is-drop-target');
				activeDropTarget = null;
			}
		}

		function clearSelectedIcon() {
			if (selectedIcon) {
				selectedIcon.classList.remove('is-selected');
				selectedIcon.setAttribute('aria-pressed', 'false');
				selectedIcon = null;
			}
		}

		function selectIcon(icon) {
			if (!icon || icon.classList.contains('is-renaming')) {
				return;
			}

			if (selectedIcon && selectedIcon !== icon) {
				clearSelectedIcon();
			}

			selectedIcon = icon;
			selectedIcon.classList.add('is-selected');
			selectedIcon.setAttribute('aria-pressed', 'true');
		}

		function focusDesktopKeyboardTarget() {
			if (!desktop || typeof desktop.focus !== 'function') {
				return;
			}

			if (!desktop.hasAttribute('tabindex')) {
				desktop.setAttribute('tabindex', '-1');
			}

			desktop.focus({ preventScroll: true });
		}

		function renameSelectedIcon() {
			if (!selectedIcon || selectedIcon.hidden || selectedIcon.classList.contains('is-renaming')) {
				return false;
			}

			if (typeof options.onRenameIcon !== 'function') {
				return false;
			}

			return Boolean(options.onRenameIcon(Object.assign(getIconDetail(selectedIcon), {
				iconElement: selectedIcon
			})));
		}

		function setDropTarget(target) {
			if (activeDropTarget === target) {
				return;
			}

			clearDropTarget();
			activeDropTarget = target || null;
			if (activeDropTarget) {
				activeDropTarget.classList.add('is-drop-target');
			}
		}

		function getFolderDropTarget(sourceIcon, clientX, clientY) {
			return getIcons().find((targetIcon) => {
				if (!canDropOnFolder(sourceIcon, targetIcon)) {
					return false;
				}

				const rect = targetIcon.getBoundingClientRect();

				return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
			}) || null;
		}

		function getDefaultState(icon, index) {
			const layer = getIconLayer(icon);
			const iconWidth = icon.offsetWidth || 74;
			const iconHeight = icon.offsetHeight || 94;
			const topInset = 24;
			const rightInset = 24;
			const columnGap = 10;
			const rowGap = 14;
			const rowStep = iconHeight + rowGap;
			const columnStep = iconWidth + columnGap;
			const availableHeight = Math.max(rowStep, (layer ? layer.clientHeight : 0) - topInset);
			const rows = Math.max(1, Math.floor(availableHeight / rowStep));
			const row = index % rows;
			const column = Math.floor(index / rows);
			const left = (layer ? layer.clientWidth : 0) - rightInset - iconWidth - column * columnStep;
			const top = topInset + row * rowStep;

			return {
				left: Math.max(0, left),
				top
			};
		}

		function getGridMetrics(icon) {
			const layer = getIconLayer(icon);
			const iconWidth = icon.offsetWidth || 74;
			const iconHeight = icon.offsetHeight || 94;
			const topInset = 24;
			const rightInset = 24;
			const columnGap = 10;
			const rowGap = 14;
			const rowStep = iconHeight + rowGap;
			const columnStep = iconWidth + columnGap;
			const availableHeight = Math.max(rowStep, (layer ? layer.clientHeight : 0) - topInset);
			const rows = Math.max(1, Math.floor(availableHeight / rowStep));

			return {
				columnStep,
				iconHeight,
				iconWidth,
				layer,
				rightInset,
				rowStep,
				rows,
				topInset
			};
		}

		function getGridPosition(icon, row, column) {
			const metrics = getGridMetrics(icon);
			const maxLeft = metrics.layer ? metrics.layer.clientWidth - metrics.iconWidth : 0;
			const maxTop = metrics.layer ? metrics.layer.clientHeight - metrics.iconHeight : 0;
			const left = (metrics.layer ? metrics.layer.clientWidth : 0) - metrics.rightInset - metrics.iconWidth - column * metrics.columnStep;
			const top = metrics.topInset + row * metrics.rowStep;

			return {
				left: clamp(left, 0, maxLeft),
				top: clamp(top, 0, maxTop)
			};
		}

		function getNearestCell(icon, state) {
			const metrics = getGridMetrics(icon);
			const rawColumn = ((metrics.layer ? metrics.layer.clientWidth : 0) - metrics.rightInset - metrics.iconWidth - state.left) / metrics.columnStep;
			const rawRow = (state.top - metrics.topInset) / metrics.rowStep;

			return {
				column: Math.max(0, Math.round(rawColumn)),
				row: clamp(Math.round(rawRow), 0, metrics.rows - 1)
			};
		}

		function getNearestAvailableCell(icon, preferred, occupied, iconCount) {
			const metrics = getGridMetrics(icon);
			const maxRadius = Math.max(metrics.rows, iconCount + 4);
			let best = null;

			for (let radius = 0; radius <= maxRadius; radius += 1) {
				for (let row = Math.max(0, preferred.row - radius); row <= Math.min(metrics.rows - 1, preferred.row + radius); row += 1) {
					for (let column = Math.max(0, preferred.column - radius); column <= preferred.column + radius + iconCount; column += 1) {
						const key = `${row}:${column}`;
						if (occupied.has(key)) {
							continue;
						}

						const distance = Math.abs(row - preferred.row) + Math.abs(column - preferred.column);
						if (!best || distance < best.distance) {
							best = {
								column,
								distance,
								row
							};
						}
					}
				}

				if (best) {
					occupied.add(`${best.row}:${best.column}`);
					return best;
				}
			}

			const fallback = {
				column: Math.floor(occupied.size / metrics.rows),
				row: occupied.size % metrics.rows
			};
			occupied.add(`${fallback.row}:${fallback.column}`);

			return fallback;
		}

		function readIconState(icon) {
			const layerRect = getIconLayer(icon).getBoundingClientRect();
			const rect = icon.getBoundingClientRect();

			return {
				left: readNumber(icon.style.left) ?? Math.round(rect.left - layerRect.left),
				top: readNumber(icon.style.top) ?? Math.round(rect.top - layerRect.top)
			};
		}

		function applyIconState(icon, state, index) {
			const layer = getIconLayer(icon);
			const defaults = getDefaultState(icon, index);
			const next = Object.assign({}, defaults, state && typeof state === 'object' ? state : {});
			const maxLeft = layer ? layer.clientWidth - icon.offsetWidth : next.left;
			const maxTop = layer ? layer.clientHeight - icon.offsetHeight : next.top;

			icon.style.left = `${clamp(next.left, 0, maxLeft)}px`;
			icon.style.top = `${clamp(next.top, 0, maxTop)}px`;
		}

		function snapIconsToGrid(icons = getVisibleIcons()) {
			const occupied = new Set();

			icons
				.map((icon) => ({
					icon,
					state: readIconState(icon)
				}))
				.sort((first, second) => first.state.top - second.state.top || first.state.left - second.state.left)
				.forEach((item) => {
					const cell = getNearestAvailableCell(item.icon, getNearestCell(item.icon, item.state), occupied, icons.length);
					applyIconState(item.icon, getGridPosition(item.icon, cell.row, cell.column), 0);
				});
		}

		function arrangeIcons(mode = currentSortMode, save = true) {
			const nextMode = normalizeSortMode(mode);
			const icons = getVisibleIcons();

			if (!icons.length || nextMode === 'none') {
				if (save) {
					saveSession();
				}
				return;
			}

			if (nextMode === 'snap-to-grid') {
				snapIconsToGrid(icons);
			} else {
				icons
					.slice()
					.sort(compareIcons(nextMode))
					.forEach((icon, index) => {
						applyIconState(icon, null, index);
					});
			}

			if (save) {
				saveSession();
			}
		}

		function setSortMode(mode) {
			currentSortMode = normalizeSortMode(mode);
			saveSortMode();
			arrangeIcons(currentSortMode);
		}

		function getStoredIconMap() {
			const stored = sessionStore.getSection('desktopIcons', []);
			const map = new Map();

			if (!Array.isArray(stored)) {
				return map;
			}

			stored.forEach((item) => {
				if (!item || typeof item !== 'object' || !item.id) {
					return;
				}

				map.set(item.id, item);
			});

			return map;
		}

		function serializeIcons() {
			const stored = getStoredIconMap();

			getIcons().forEach((icon) => {
				const id = getIconKey(icon);
				if (!id) {
					return;
				}

				stored.set(id, {
					id,
					kind: icon.dataset.aosDesktopIconKind || 'item',
					state: readIconState(icon)
				});
			});

			return Array.from(stored.values());
		}

		function saveSession() {
			if (!options.storageKey || restoreInProgress || sessionSaveDisabled) {
				return;
			}

			sessionStore.saveSection('desktopIcons', serializeIcons());
		}

		function scheduleSave() {
			if (!options.storageKey || restoreInProgress || sessionSaveDisabled) {
				return;
			}

			window.clearTimeout(saveTimer);
			saveTimer = window.setTimeout(saveSession, 160);
		}

		function suppressNextClick(icon) {
			icon.dataset.aosSuppressClick = '1';
			window.setTimeout(() => {
				delete icon.dataset.aosSuppressClick;
			}, 0);
		}

		function makeDraggable(icon) {
			if (!desktop || icon.dataset.aosDesktopIconBound === '1') {
				return;
			}

			icon.dataset.aosDesktopIconBound = '1';
			icon.draggable = false;
			icon.setAttribute('aria-pressed', icon.classList.contains('is-selected') ? 'true' : 'false');
			icon.querySelectorAll('img').forEach((image) => {
				image.draggable = false;
			});

			icon.addEventListener('click', (event) => {
				if (icon.dataset.aosSuppressClick === '1') {
					event.preventDefault();
					event.stopPropagation();
					delete icon.dataset.aosSuppressClick;
					return;
				}

				selectIcon(icon);
				focusDesktopKeyboardTarget();
			}, true);

			icon.addEventListener('pointerdown', (event) => {
				if (event.button !== 0 || event.ctrlKey || event.metaKey || event.target.closest('a, input, select, textarea, [contenteditable="true"], [contenteditable="plaintext-only"]')) {
					return;
				}

				selectIcon(icon);
				focusDesktopKeyboardTarget();
				event.preventDefault();

				const layer = getIconLayer(icon);
				const layerRect = layer.getBoundingClientRect();
				const rect = icon.getBoundingClientRect();
				const startX = event.clientX;
				const startY = event.clientY;
				const startLeft = rect.left - layerRect.left;
				const startTop = rect.top - layerRect.top;
				let moved = false;

				icon.style.left = `${startLeft}px`;
				icon.style.top = `${startTop}px`;
				icon.style.zIndex = String(++dragZIndex);

				if (typeof icon.setPointerCapture === 'function') {
					icon.setPointerCapture(event.pointerId);
				}

				const move = (moveEvent) => {
					const deltaX = moveEvent.clientX - startX;
					const deltaY = moveEvent.clientY - startY;

					if (!moved && Math.abs(deltaX) + Math.abs(deltaY) < 4) {
						return;
					}

					moved = true;
					moveEvent.preventDefault();
					icon.classList.add('is-dragging');

					const maxLeft = layer.clientWidth - icon.offsetWidth;
					const maxTop = layer.clientHeight - icon.offsetHeight;

					icon.style.left = `${clamp(startLeft + deltaX, 0, maxLeft)}px`;
					icon.style.top = `${clamp(startTop + deltaY, 0, maxTop)}px`;
					setDropTarget(getFolderDropTarget(icon, moveEvent.clientX, moveEvent.clientY));
				};

				const up = (upEvent) => {
					const dropTarget = activeDropTarget;
					window.removeEventListener('pointermove', move);
					window.removeEventListener('pointerup', up);
					window.removeEventListener('pointercancel', up);
					icon.classList.remove('is-dragging');
					clearDropTarget();

					if (typeof icon.releasePointerCapture === 'function' && icon.hasPointerCapture(upEvent.pointerId)) {
						icon.releasePointerCapture(upEvent.pointerId);
					}

					if (moved) {
						if (dropTarget && typeof options.onDropOnFolder === 'function') {
							options.onDropOnFolder(getDropDetail(icon, dropTarget));
						}

						suppressNextClick(icon);
						if (currentSortMode === 'none') {
							scheduleSave();
						} else {
							arrangeIcons(currentSortMode);
						}
					}
				};

				window.addEventListener('pointermove', move);
				window.addEventListener('pointerup', up);
				window.addEventListener('pointercancel', up);
			});
		}

		function markLayersManaged() {
			if (!desktop) {
				return;
			}

			desktop.querySelectorAll('.aos-desktop-icon-layer').forEach((layer) => {
				layer.classList.add('is-managed');
			});
		}

		function bindExistingIcons() {
			bindDesktopSelection();
			markLayersManaged();
			getIcons().forEach(makeDraggable);
		}

		function bindDesktopSelection() {
			if (!desktop || desktop.dataset.aosDesktopSelectionBound === '1') {
				return;
			}

			desktop.dataset.aosDesktopSelectionBound = '1';
			if (!desktop.hasAttribute('tabindex')) {
				desktop.setAttribute('tabindex', '-1');
			}
			desktop.addEventListener('pointerdown', (event) => {
				if (event.target === desktop) {
					clearSelectedIcon();
					focusDesktopKeyboardTarget();
				}
			});
			desktop.addEventListener('keydown', (event) => {
				if (
					event.defaultPrevented
					|| event.key !== 'Enter'
					|| event.altKey
					|| event.ctrlKey
					|| event.metaKey
					|| event.shiftKey
					|| isTextEditingTarget(event.target)
				) {
					return;
				}

				if (renameSelectedIcon()) {
					event.preventDefault();
					event.stopPropagation();
				}
			});
		}

		function restoreSession() {
			loadSortMode();
			const icons = getIcons();
			if (!icons.length) {
				return;
			}

			const stored = getStoredIconMap();
			restoreInProgress = true;

			icons.forEach((icon, index) => {
				const id = getIconKey(icon);
				const item = id ? stored.get(id) : null;

				applyIconState(icon, item ? item.state : null, index);
			});

			restoreInProgress = false;
			arrangeIcons(currentSortMode, false);
		}

		function rebind() {
			bindExistingIcons();
			restoreSession();
		}

		function clampToDesktop() {
			if (currentSortMode !== 'none') {
				arrangeIcons(currentSortMode);
				return;
			}

			getVisibleIcons().forEach((icon, index) => {
				applyIconState(icon, readIconState(icon), index);
			});
			scheduleSave();
		}

		window.addEventListener('beforeunload', saveSession);
		window.addEventListener('resize', () => {
			window.clearTimeout(saveTimer);
			saveTimer = window.setTimeout(clampToDesktop, 160);
		});

		return {
			bindExistingIcons,
			disableSessionSave() {
				sessionSaveDisabled = true;
				window.clearTimeout(saveTimer);
			},
			getSortMode() {
				return currentSortMode;
			},
			rebind,
			restoreSession,
			saveSession,
			setSortMode,
			sortModes: sortModes.slice()
		};
	};
})();
