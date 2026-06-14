(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.desktop = window.PufferDesk.desktop || {};

	window.PufferDesk.desktop.createDesktopIconManager = function createDesktopIconManager(shell, options = {}) {
		const dom = window.PufferDesk.dom;
		const geometry = window.PufferDesk.geometry;
		const createDebouncedTask = window.PufferDesk.services.createDebouncedTask;
		const clamp = geometry.clamp;
		const readNumber = geometry.readNumber;
		const desktop = shell.querySelector('.pdk-desktop');
		const sessionStore = window.PufferDesk.session.createSessionStore(options.storageKey || '');
		const dragDropManager = options.dragDropManager || null;
		const workspaceSections = window.PufferDesk.session.workspace ? window.PufferDesk.session.workspace.sections || {} : {};
		const windowKinds = window.PufferDesk.session.workspace ? window.PufferDesk.session.workspace.windowKinds || {} : {};
		const folderWindowKind = windowKinds.FOLDER;
		const domEventNames = window.PufferDesk.events && window.PufferDesk.events.domNames ? window.PufferDesk.events.domNames : {};
		const dragDropConstants = window.PufferDesk.dragDrop && window.PufferDesk.dragDrop.constants ? window.PufferDesk.dragDrop.constants : {};
		const containerTypes = dragDropConstants.containerTypes || {};
		const itemTypes = dragDropConstants.itemTypes || {};
		const targetKinds = dragDropConstants.targetKinds || {};
		let restoreInProgress = false;
		let sessionSaveDisabled = false;
		let activeDropTarget = null;
		let currentSortMode = 'none';
		let currentIconSize = 'medium';
		const selectedIcons = new Set();
		let primarySelectedIcon = null;
		const iconSizes = [
			'large',
			'medium',
			'small'
		];
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
			'date-added': 'pdkDateAdded',
			'date-created': 'pdkDateCreated',
			'date-last-opened': 'pdkDateLastOpened',
			'date-modified': 'pdkDateModified',
			'last-modified-by': 'pdkLastModifiedBy',
			size: 'pdkSize'
		};
		const sessionSaveTask = createDebouncedTask(() => saveSession(), {
			shouldRun: () => Boolean(options.storageKey && !restoreInProgress && !sessionSaveDisabled),
			wait: 160
		});
		const clampToDesktopTask = createDebouncedTask(() => clampToDesktop(), {
			wait: 160
		});

		function getIconLayer(icon) {
			return icon.closest('.pdk-desktop-icon-layer') || desktop;
		}

		function getIcons() {
			return desktop ? Array.from(desktop.querySelectorAll('[data-pdk-desktop-icon]')) : [];
		}

		function getCssPixelValue(name, fallback) {
			return geometry && typeof geometry.readCssPixel === 'function'
				? geometry.readCssPixel(shell, name, fallback)
				: fallback;
		}

		function getGridMetric(overrides, key, cssName, fallback) {
			const overrideValue = overrides ? Number.parseFloat(overrides[key]) : Number.NaN;

			return Number.isFinite(overrideValue) ? overrideValue : getCssPixelValue(cssName, fallback);
		}

		function getVisibleIcons() {
			return getIcons().filter((icon) => !icon.hidden);
		}

		function getIconKey(icon) {
			if (!icon) {
				return '';
			}

			if (icon.dataset.pdkDesktopIconId) {
				return icon.dataset.pdkDesktopIconId;
			}

			const kind = icon.dataset.pdkDesktopIconKind || 'item';
			const id = icon.dataset.pdkOpenApp || icon.dataset.pdkOpenFolder || icon.dataset.pdkContextId || '';

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
				id: icon.dataset.pdkOpenApp || icon.dataset.pdkOpenFolder || icon.dataset.pdkContextId || '',
				kind: icon.dataset.pdkDesktopIconKind || 'item',
				key: getIconKey(icon)
			};
		}

		function getSelectedIconDetails() {
			return normalizeSelectedIcons().map((icon) => Object.assign(getIconDetail(icon), {
				context: icon.dataset.pdkContext || '',
				iconElement: icon,
				label: icon.dataset.pdkContextLabel || getIconCurrentLabel(icon) || getIconDefaultLabel(icon)
			}));
		}

		function isTextEditingTarget(target) {
			return Boolean(target && typeof target.closest === 'function' && target.closest('a, input, select, textarea, [contenteditable="true"], [contenteditable="plaintext-only"]'));
		}

		function normalizeSortMode(mode) {
			return sortModes.includes(mode) ? mode : 'none';
		}

		function normalizeIconSize(size) {
			return iconSizes.includes(size) ? size : 'medium';
		}

		function applyIconSize() {
			if (shell && shell.dataset) {
				shell.dataset.pdkDesktopIconSize = currentIconSize;
			}
		}

		function loadSortMode() {
			const stored = sessionStore.getSection(workspaceSections.DESKTOP_SORT, {});

			currentSortMode = normalizeSortMode(stored && typeof stored === 'object' ? stored.mode : stored);
			currentIconSize = normalizeIconSize(stored && typeof stored === 'object' ? stored.iconSize : '');
			applyIconSize();
			return currentSortMode;
		}

		function saveSortMode() {
			if (!options.storageKey || sessionSaveDisabled) {
				return;
			}

			sessionStore.saveSection(workspaceSections.DESKTOP_SORT, {
				iconSize: currentIconSize,
				mode: currentSortMode
			});
		}

		function getIconLabel(icon) {
			const label = icon.dataset.pdkContextLabel
				|| (icon.querySelector('.pdk-desktop-app-label') ? icon.querySelector('.pdk-desktop-app-label').textContent : '')
				|| '';

			return String(label).trim().toLowerCase();
		}

		function getIconLabelElement(icon) {
			return icon ? icon.querySelector('.pdk-desktop-app-label') : null;
		}

		function getIconDefaultLabel(icon) {
			return String(icon && icon.dataset ? icon.dataset.pdkDesktopIconDefaultLabel || icon.dataset.pdkContextLabel || '' : '').trim();
		}

		function getIconCurrentLabel(icon) {
			const label = getIconLabelElement(icon);

			return String(label && dom.getFullLabel ? dom.getFullLabel(label) : label ? label.textContent : '').trim();
		}

		function setIconLabelOverride(icon, label) {
			const labelElement = getIconLabelElement(icon);
			const nextLabel = String(label || '').trim();
			const defaultLabel = getIconDefaultLabel(icon);

			if (!icon || !labelElement || !nextLabel) {
				return false;
			}

			if (dom.setTruncatedLabelText) {
				dom.setTruncatedLabelText(labelElement, nextLabel);
			} else {
				labelElement.textContent = nextLabel;
			}
			icon.dataset.pdkContextLabel = nextLabel;
			icon.setAttribute('aria-label', nextLabel);

			if (defaultLabel && nextLabel === defaultLabel) {
				delete icon.dataset.pdkDesktopIconLabelOverride;
			} else {
				icon.dataset.pdkDesktopIconLabelOverride = '1';
			}

			return true;
		}

		function canRenameIcon(icon) {
			if (!icon || icon.hidden || icon.classList.contains('is-renaming')) {
				return false;
			}

			if (typeof options.canRenameIcon !== 'function') {
				return false;
			}

			return Boolean(options.canRenameIcon(Object.assign(getIconDetail(icon), {
				iconElement: icon
			})));
		}

		function getKindLabel(icon) {
			const kind = icon.dataset.pdkDesktopIconKind || 'item';
			if (kind === itemTypes.FOLDER) {
				return itemTypes.FOLDER;
			}
			if (kind === itemTypes.APP) {
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

		function getDropTargetDetail(targetIcon) {
			if (!targetIcon || !targetIcon.dataset) {
				return {
					id: '',
					kind: '',
					key: ''
				};
			}

			if (targetIcon.dataset.pdkFolderSidebarDropKind === 'favorites') {
				return {
					id: 'favorites',
					kind: targetKinds.FOLDER_SIDEBAR_FAVORITES,
					key: containerTypes.FOLDER_SIDEBAR_FAVORITES
				};
			}

			if (targetIcon.dataset.pdkFolderSidebarDropKind === itemTypes.FOLDER) {
				const folderId = targetIcon.dataset.pdkOpenFolder || targetIcon.dataset.pdkContextId || '';

				return {
					id: folderId,
					kind: itemTypes.FOLDER,
					key: folderId ? window.PufferDesk.dragDrop.models.createContainerId(containerTypes.FOLDER, folderId) : ''
				};
			}

			if (
				targetIcon.dataset.pdkDesktopIconKind === itemTypes.APP
				&& (
					targetIcon.dataset.pdkOpenApp === containerTypes.TRASH
					|| targetIcon.dataset.pdkContextId === containerTypes.TRASH
				)
			) {
				return {
					id: containerTypes.TRASH,
					kind: containerTypes.TRASH,
					key: containerTypes.TRASH
				};
			}

			if (targetIcon.classList && targetIcon.classList.contains('pdk-finder-pane')) {
				const win = targetIcon.closest(`.pdk-window[data-pdk-window-kind="${dom.escapeAttribute(folderWindowKind)}"]`);
				const folderId = win && win.dataset ? win.dataset.pdkFolderWindow || '' : '';

				return {
					id: folderId,
					kind: itemTypes.FOLDER,
					key: folderId ? window.PufferDesk.dragDrop.models.createContainerId(containerTypes.FOLDER, folderId) : ''
				};
			}

			if (targetIcon.classList && targetIcon.classList.contains('pdk-folder-launcher')) {
				const folderId = targetIcon.dataset.pdkOpenFolder || targetIcon.dataset.pdkContextId || '';

				return {
					id: folderId,
					kind: itemTypes.FOLDER,
					key: folderId ? window.PufferDesk.dragDrop.models.createContainerId(containerTypes.FOLDER, folderId) : ''
				};
			}

			return getIconDetail(targetIcon);
		}

		function getDropDetail(sourceIcon, targetIcon) {
			const source = getIconDetail(sourceIcon);
			const target = getDropTargetDetail(targetIcon);

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

		function getSourceIconsFromDragItems(dragItems = []) {
			return Array.isArray(dragItems)
				? dragItems.map((item) => item && item.icon).filter(Boolean)
				: [];
		}

		function getDropDetails(sourceIcons, targetIcon) {
			return (Array.isArray(sourceIcons) ? sourceIcons : [])
				.filter(Boolean)
				.map((sourceIcon) => getDropDetail(sourceIcon, targetIcon));
		}

		function canDropOnFolder(sourceIcon, targetIcon) {
			if (!sourceIcon || !targetIcon || sourceIcon === targetIcon) {
				return false;
			}

			if (targetIcon.hidden || ![itemTypes.FOLDER, targetKinds.FOLDER_SIDEBAR_FAVORITES, containerTypes.TRASH].includes(getDropTargetDetail(targetIcon).kind)) {
				return false;
			}

			if (typeof options.canDropOnFolder === 'function') {
				return Boolean(options.canDropOnFolder(getDropDetail(sourceIcon, targetIcon)));
			}

			return false;
		}

		function canDropIconsOnFolder(sourceIcons, targetIcon) {
			const icons = Array.isArray(sourceIcons) ? sourceIcons.filter(Boolean) : [];

			if (!icons.length || icons.includes(targetIcon)) {
				return false;
			}

			return icons.every((sourceIcon) => canDropOnFolder(sourceIcon, targetIcon));
		}

		function clearDropTarget() {
			if (activeDropTarget) {
				activeDropTarget.classList.remove('is-drop-target');
				activeDropTarget = null;
			}
		}

		function isSelectableIcon(icon) {
			if (!icon || icon.classList.contains('is-renaming')) {
				return false;
			}

			return !icon.hidden;
		}

		function setIconSelected(icon, selected) {
			if (!icon) {
				return;
			}

			icon.classList.toggle('is-selected', selected);
			icon.setAttribute('aria-pressed', selected ? 'true' : 'false');
			if (selected) {
				selectedIcons.add(icon);
				primarySelectedIcon = icon;
			} else {
				selectedIcons.delete(icon);
				if (primarySelectedIcon === icon) {
					primarySelectedIcon = null;
				}
			}
		}

		function normalizeSelectedIcons() {
			Array.from(selectedIcons).forEach((icon) => {
				if (!isSelectableIcon(icon) || !desktop.contains(icon)) {
					setIconSelected(icon, false);
				}
			});

			if (primarySelectedIcon && !selectedIcons.has(primarySelectedIcon)) {
				primarySelectedIcon = null;
			}

			return Array.from(selectedIcons);
		}

		function clearSelectedIcons() {
			normalizeSelectedIcons().forEach((icon) => setIconSelected(icon, false));
			primarySelectedIcon = null;
		}

		function selectOnlyIcon(icon) {
			if (!isSelectableIcon(icon)) {
				return;
			}

			normalizeSelectedIcons().forEach((selectedIcon) => {
				if (selectedIcon !== icon) {
					setIconSelected(selectedIcon, false);
				}
			});
			setIconSelected(icon, true);
		}

		function addIconToSelection(icon) {
			if (isSelectableIcon(icon)) {
				setIconSelected(icon, true);
			}
		}

		function toggleIconSelection(icon) {
			if (isSelectableIcon(icon)) {
				setIconSelected(icon, !selectedIcons.has(icon));
			}
		}

		function selectIconFromPlainAction(icon) {
			if (!isSelectableIcon(icon)) {
				return;
			}

			if (!selectedIcons.has(icon) || selectedIcons.size <= 1) {
				selectOnlyIcon(icon);
			} else {
				primarySelectedIcon = icon;
			}
		}

		function applySelectionFromBase(baseIcons, icons, mode = 'replace') {
			const nextIcons = icons instanceof Set
				? new Set(Array.from(icons).filter(isSelectableIcon))
				: new Set(Array.isArray(icons) ? icons.filter(isSelectableIcon) : []);
			const nextSelection = baseIcons instanceof Set ? new Set(baseIcons) : new Set();

			if (mode === 'replace') {
				getIcons().forEach((icon) => setIconSelected(icon, nextIcons.has(icon)));
				return;
			}

			if (mode === 'add') {
				nextIcons.forEach((icon) => nextSelection.add(icon));
				getIcons().forEach((icon) => setIconSelected(icon, nextSelection.has(icon)));
				return;
			}

			if (mode === 'toggle') {
				nextIcons.forEach((icon) => {
					if (nextSelection.has(icon)) {
						nextSelection.delete(icon);
					} else {
						nextSelection.add(icon);
					}
				});
				getIcons().forEach((icon) => setIconSelected(icon, nextSelection.has(icon)));
			}
		}

		function getSelectionMode(event) {
			if (event && (event.metaKey || event.ctrlKey)) {
				return 'toggle';
			}

			return event && event.shiftKey ? 'add' : 'replace';
		}

		function getPrimarySelectedIcon() {
			normalizeSelectedIcons();

			if (primarySelectedIcon && selectedIcons.has(primarySelectedIcon)) {
				return primarySelectedIcon;
			}

			return selectedIcons.values().next().value || null;
		}

		function rectsIntersect(first, second) {
			return !(
				first.right < second.left
				|| first.left > second.right
				|| first.bottom < second.top
				|| first.top > second.bottom
			);
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
			const selected = normalizeSelectedIcons();
			const selectedIcon = selected.length === 1 ? getPrimarySelectedIcon() : null;

			if (!selectedIcon || selectedIcon.hidden || selectedIcon.classList.contains('is-renaming')) {
				return false;
			}

			if (typeof options.onRenameIcon !== 'function') {
				return startInlineRenameIcon({
					iconElement: selectedIcon
				});
			}

			if (options.onRenameIcon(Object.assign(getIconDetail(selectedIcon), {
				iconElement: selectedIcon
			}))) {
				return true;
			}

			return startInlineRenameIcon({
				iconElement: selectedIcon
			});
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

		function getFolderDropTarget(sourceIcon, clientX, clientY, dragItems = null) {
			const sourceIcons = getSourceIconsFromDragItems(dragItems);
			const icons = sourceIcons.length ? sourceIcons : [sourceIcon].filter(Boolean);
			const desktopFolderTarget = getIcons().find((targetIcon) => {
				if (!canDropIconsOnFolder(icons, targetIcon)) {
					return false;
				}

				const rect = targetIcon.getBoundingClientRect();

				return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
			});
			let element = null;

			if (desktopFolderTarget) {
				return desktopFolderTarget;
			}

			if (typeof document.elementFromPoint === 'function') {
				const draggingIcons = getIcons().filter((icon) => icon.classList.contains('is-dragging'));
				const previousPointerEvents = draggingIcons.map((icon) => icon.style.pointerEvents);

				draggingIcons.forEach((icon) => {
					icon.style.pointerEvents = 'none';
				});
				element = document.elementFromPoint(clientX, clientY);
				draggingIcons.forEach((icon, index) => {
					icon.style.pointerEvents = previousPointerEvents[index] || '';
				});
			}

			const nextFolderItemTarget = element && typeof element.closest === 'function'
				? element.closest('.pdk-folder-launcher')
				: null;
			const nextSidebarTarget = element && typeof element.closest === 'function'
				? element.closest('[data-pdk-folder-sidebar-drop-kind]')
				: null;
			const nextPaneTarget = element && typeof element.closest === 'function'
				? element.closest('.pdk-finder-pane')
				: null;

			if (nextSidebarTarget && canDropIconsOnFolder(icons, nextSidebarTarget)) {
				return nextSidebarTarget;
			}

			if (nextFolderItemTarget && canDropIconsOnFolder(icons, nextFolderItemTarget)) {
				return nextFolderItemTarget;
			}

			if (nextPaneTarget && canDropIconsOnFolder(icons, nextPaneTarget)) {
				return nextPaneTarget;
			}

			return null;
		}

		function getGridMetrics(icon, overrides = {}) {
			const layer = getIconLayer(icon);
			const iconWidth = icon.offsetWidth || 74;
			const iconHeight = icon.offsetHeight || 94;
			const topInset = getGridMetric(overrides, 'topInset', '--pdk-desktop-icon-grid-top-inset', 24);
			const leftInset = getGridMetric(overrides, 'leftInset', '--pdk-desktop-icon-grid-left-inset', 24);
			const columnGap = getGridMetric(overrides, 'columnGap', '--pdk-desktop-icon-grid-column-gap', 10);
			const rowGap = getGridMetric(overrides, 'rowGap', '--pdk-desktop-icon-grid-row-gap', 14);
			const rowStep = iconHeight + rowGap;
			const columnStep = iconWidth + columnGap;
			const availableHeight = Math.max(rowStep, (layer ? layer.clientHeight : 0) - topInset);
			const rows = Math.max(1, Math.floor(availableHeight / rowStep));

			return {
				columnStep,
				iconHeight,
				iconWidth,
				layer,
				leftInset,
				rowStep,
				rows,
				topInset
			};
		}

		function getGridPosition(icon, row, column, metricsOverrides = {}) {
			const metrics = getGridMetrics(icon, metricsOverrides);
			const maxLeft = metrics.layer ? metrics.layer.clientWidth - metrics.iconWidth : 0;
			const maxTop = metrics.layer ? metrics.layer.clientHeight - metrics.iconHeight : 0;
			const left = metrics.leftInset + column * metrics.columnStep;
			const top = metrics.topInset + row * metrics.rowStep;

			return {
				left: clamp(left, 0, maxLeft),
				top: clamp(top, 0, maxTop)
			};
		}

		function getDefaultState(icon, index, metricsOverrides = {}) {
			const metrics = getGridMetrics(icon, metricsOverrides);
			const row = index % metrics.rows;
			const column = Math.floor(index / metrics.rows);

			return getGridPosition(icon, row, column, metricsOverrides);
		}

		function getNearestCell(icon, state) {
			const metrics = getGridMetrics(icon);
			const rawColumn = (state.left - metrics.leftInset) / metrics.columnStep;
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

		function setIconSize(size) {
			const nextIconSize = normalizeIconSize(size);

			if (nextIconSize === currentIconSize) {
				return;
			}

			currentIconSize = nextIconSize;
			applyIconSize();
			saveSortMode();

			if (currentSortMode === 'none') {
				clampToDesktop();
			} else {
				arrangeIcons(currentSortMode);
			}
		}

		function getStoredIconMap() {
			const stored = sessionStore.getSection(workspaceSections.DESKTOP_ICONS, []);
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

				const item = {
					id,
					kind: icon.dataset.pdkDesktopIconKind || 'item',
					state: readIconState(icon)
				};
				const currentLabel = getIconCurrentLabel(icon);
				const defaultLabel = getIconDefaultLabel(icon);

				if (icon.dataset.pdkDesktopIconLabelOverride === '1' && currentLabel && currentLabel !== defaultLabel) {
					item.label = currentLabel;
				}

				stored.set(id, item);
			});

			return Array.from(stored.values());
		}

		function saveSession() {
			if (!options.storageKey || restoreInProgress || sessionSaveDisabled) {
				return;
			}

			sessionStore.saveSection(workspaceSections.DESKTOP_ICONS, serializeIcons());
		}

		function scheduleSave() {
			sessionSaveTask.schedule();
		}

		function suppressNextClick(icon) {
			icon.dataset.pdkSuppressClick = '1';
			window.setTimeout(() => {
				delete icon.dataset.pdkSuppressClick;
			}, 0);
		}

		function findIconForRename(detail = {}) {
			if (detail.iconElement && desktop && desktop.contains(detail.iconElement)) {
				return detail.iconElement;
			}

			const key = detail.key || (detail.kind && detail.id ? `${detail.kind}:${detail.id}` : '');
			if (key) {
				const icon = getIcons().find((item) => getIconKey(item) === key);
				if (icon) {
					return icon;
				}
			}

			if (detail.id) {
				return getIcons().find((icon) => getIconDetail(icon).id === detail.id) || null;
			}

			return getPrimarySelectedIcon();
		}

		function startInlineRenameIcon(detail = {}) {
			const icon = findIconForRename(detail);
			const label = getIconLabelElement(icon);
			if (!icon || !label || label.dataset.pdkInlineRename === '1' || !canRenameIcon(icon)) {
				return false;
			}

			const originalLabel = getIconCurrentLabel(icon) || getIconDefaultLabel(icon);
			let finished = false;
			let blurRefocusTimer = 0;
			const renameMetrics = (() => {
				const iconRect = icon.getBoundingClientRect();
				const labelRect = label.getBoundingClientRect();

				if (!iconRect.width || !labelRect.width || !labelRect.height) {
					return null;
				}

				return {
					height: labelRect.height,
					left: labelRect.left - iconRect.left + (labelRect.width / 2),
					top: labelRect.top - iconRect.top,
					width: labelRect.width
				};
			})();

			if (renameMetrics) {
				icon.style.setProperty('--pdk-desktop-rename-left', `${renameMetrics.left.toFixed(2)}px`);
				icon.style.setProperty('--pdk-desktop-rename-top', `${renameMetrics.top.toFixed(2)}px`);
				icon.style.setProperty('--pdk-desktop-rename-width', `${Math.ceil(renameMetrics.width)}px`);
				icon.style.setProperty('--pdk-desktop-rename-height', `${Math.ceil(renameMetrics.height)}px`);
			}

			function cleanup() {
				window.clearTimeout(blurRefocusTimer);
				label.removeEventListener('blur', onBlur);
				label.removeEventListener('keydown', onKeyDown);
				label.removeEventListener('click', stopEditingEvent);
				label.removeEventListener('pointerdown', stopEditingEvent);
				document.removeEventListener('pointerdown', onDocumentPointerDown, true);
				label.removeAttribute('contenteditable');
				label.removeAttribute('spellcheck');
				delete label.dataset.pdkInlineRename;
				icon.classList.remove('is-renaming');
				icon.style.removeProperty('--pdk-desktop-rename-left');
				icon.style.removeProperty('--pdk-desktop-rename-top');
				icon.style.removeProperty('--pdk-desktop-rename-width');
				icon.style.removeProperty('--pdk-desktop-rename-height');
			}

			function finish(commit) {
				if (finished) {
					return;
				}

				finished = true;
				const nextLabel = String(label.textContent || '').trim();
				cleanup();

				if (commit) {
					setIconLabelOverride(icon, nextLabel || originalLabel);
					saveSession();
				} else {
					setIconLabelOverride(icon, originalLabel);
				}
			}

			function stopEditingEvent(event) {
				event.stopPropagation();
			}

			function onBlur() {
				window.clearTimeout(blurRefocusTimer);
				blurRefocusTimer = window.setTimeout(() => {
					blurRefocusTimer = 0;
					if (finished) {
						return;
					}
					if (!icon.isConnected || !label.isConnected) {
						finish(true);
						return;
					}
					if (document.activeElement === label || label.contains(document.activeElement)) {
						return;
					}
					label.focus({ preventScroll: true });
				}, 0);
			}

			function onDocumentPointerDown(event) {
				if (finished || (event.target && label.contains(event.target))) {
					return;
				}

				finish(true);
			}

			function onKeyDown(event) {
				if (event.key === 'Enter') {
					event.preventDefault();
					finish(true);
				} else if (event.key === 'Escape') {
					event.preventDefault();
					finish(false);
				} else if (event.key === 'Tab') {
					finish(true);
				}
			}

			icon.classList.add('is-renaming');
			icon.dataset.pdkSuppressClick = '1';
			label.dataset.pdkInlineRename = '1';
			if (dom.setEditableLabelText) {
				dom.setEditableLabelText(label, originalLabel);
			} else {
				label.textContent = originalLabel;
			}
			label.setAttribute('contenteditable', 'plaintext-only');
			label.setAttribute('spellcheck', 'false');
			label.addEventListener('blur', onBlur);
			label.addEventListener('keydown', onKeyDown);
			label.addEventListener('click', stopEditingEvent);
			label.addEventListener('pointerdown', stopEditingEvent);
			document.addEventListener('pointerdown', onDocumentPointerDown, true);
			label.focus({ preventScroll: true });

			const selection = window.getSelection();
			const range = document.createRange();
			range.selectNodeContents(label);
			if (selection) {
				selection.removeAllRanges();
				selection.addRange(range);
			}

			return true;
		}

		function getPointPosition(point, icon) {
			if (!point || !icon) {
				return null;
			}

			const layer = getIconLayer(icon);
			const clientX = Number.isFinite(point.clientX)
				? point.clientX
				: Number.isFinite(point.x)
					? point.x
					: null;
			const clientY = Number.isFinite(point.clientY)
				? point.clientY
				: Number.isFinite(point.y)
					? point.y
					: null;

			if (!layer || !Number.isFinite(clientX) || !Number.isFinite(clientY)) {
				return null;
			}

			const layerRect = layer.getBoundingClientRect();
			const iconWidth = icon.offsetWidth || 74;
			const iconHeight = icon.offsetHeight || 94;

			return {
				left: Math.round(clientX - layerRect.left - (iconWidth / 2)),
				top: Math.round(clientY - layerRect.top - (iconHeight / 2))
			};
		}

		function positionIcon(kind, id, pointOrPosition = null) {
			const icon = findIconForRename({
				id,
				kind
			});

			if (!icon || icon.hidden) {
				return false;
			}

			const position = pointOrPosition && Number.isFinite(pointOrPosition.left) && Number.isFinite(pointOrPosition.top)
				? pointOrPosition
				: getPointPosition(pointOrPosition, icon);
			const layer = getIconLayer(icon);
			const maxLeft = layer ? layer.clientWidth - icon.offsetWidth : 0;
			const maxTop = layer ? layer.clientHeight - icon.offsetHeight : 0;

			if (!layer || !position) {
				return false;
			}

			icon.style.left = `${clamp(position.left, 0, maxLeft)}px`;
			icon.style.top = `${clamp(position.top, 0, maxTop)}px`;

			if (currentSortMode === 'none') {
				saveSession();
			} else {
				arrangeIcons(currentSortMode);
			}

			return true;
		}

		function getDragItems(sourceIcon) {
			const selected = normalizeSelectedIcons();
			const dragIcons = selectedIcons.has(sourceIcon) ? selected : [sourceIcon];

			return dragIcons.filter(isSelectableIcon).map((icon) => {
				const layer = getIconLayer(icon);
				const layerRect = layer.getBoundingClientRect();
				const rect = icon.getBoundingClientRect();

				return {
					icon,
					layer,
					startLeft: rect.left - layerRect.left,
					startTop: rect.top - layerRect.top
				};
			});
		}

		function moveDragItems(items, deltaX, deltaY) {
			items.forEach((item) => {
				const maxLeft = item.layer.clientWidth - item.icon.offsetWidth;
				const maxTop = item.layer.clientHeight - item.icon.offsetHeight;

				item.icon.style.left = `${clamp(item.startLeft + deltaX, 0, maxLeft)}px`;
				item.icon.style.top = `${clamp(item.startTop + deltaY, 0, maxTop)}px`;
			});
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
			return Array.from(shell.querySelectorAll('.pdk-window'))
				.reduce((highest, win) => Math.max(highest, readElementZIndex(win)), 0);
		}

		function getDragElevationZIndex() {
			const menuLayer = readLayerIndex('--pdk-layer-menu', 10000);
			const platformDragLayer = Math.max(1, menuLayer - 1);

			return Math.max(getHighestWindowZIndex() + 1, platformDragLayer);
		}

		function setDragItemsDragging(items, dragging) {
			let dragElevation = null;

			items.forEach((item) => {
				if (dragging) {
					if (!item.icon.classList.contains('is-dragging')) {
						dragElevation = dragElevation === null ? getDragElevationZIndex() : dragElevation;
						item.icon.style.zIndex = String(dragElevation);
					}
					item.icon.classList.add('is-dragging');
				} else {
					item.icon.classList.remove('is-dragging');
					item.icon.style.zIndex = '';
				}
			});
		}

		function ensureMarquee() {
			let marquee = desktop.querySelector('.pdk-desktop-marquee');
			if (marquee) {
				return marquee;
			}

			marquee = document.createElement('div');
			marquee.className = 'pdk-desktop-marquee';
			marquee.setAttribute('aria-hidden', 'true');
			desktop.appendChild(marquee);

			return marquee;
		}

		function setMarqueeRect(marquee, rect) {
			marquee.style.left = `${rect.left}px`;
			marquee.style.top = `${rect.top}px`;
			marquee.style.width = `${rect.width}px`;
			marquee.style.height = `${rect.height}px`;
		}

		function getMarqueeRect(startX, startY, currentX, currentY, desktopRect) {
			const x1 = clamp(startX - desktopRect.left, 0, desktopRect.width);
			const y1 = clamp(startY - desktopRect.top, 0, desktopRect.height);
			const x2 = clamp(currentX - desktopRect.left, 0, desktopRect.width);
			const y2 = clamp(currentY - desktopRect.top, 0, desktopRect.height);
			const left = Math.min(x1, x2);
			const top = Math.min(y1, y2);

			return {
				bottom: Math.max(y1, y2),
				height: Math.abs(y2 - y1),
				left,
				right: Math.max(x1, x2),
				top,
				width: Math.abs(x2 - x1)
			};
		}

		function getIntersectingIcons(marqueeRect, desktopRect) {
			return getVisibleIcons().filter((icon) => {
				if (icon.classList.contains('is-renaming')) {
					return false;
				}

				const iconRect = icon.getBoundingClientRect();
				const relativeRect = {
					bottom: iconRect.bottom - desktopRect.top,
					left: iconRect.left - desktopRect.left,
					right: iconRect.right - desktopRect.left,
					top: iconRect.top - desktopRect.top
				};

				return rectsIntersect(marqueeRect, relativeRect);
			});
		}

		function startDesktopMarquee(event) {
			if (!desktop || event.button !== 0 || isTextEditingTarget(event.target)) {
				return;
			}

			const mode = getSelectionMode(event);
			const baseSelection = mode === 'replace' ? new Set() : new Set(normalizeSelectedIcons());
			const desktopRect = desktop.getBoundingClientRect();
			const startX = event.clientX;
			const startY = event.clientY;
			const marquee = ensureMarquee();
			let moved = false;

			if (mode === 'replace') {
				clearSelectedIcons();
			}
			focusDesktopKeyboardTarget();
			event.preventDefault();

			const move = (moveEvent) => {
				const deltaX = moveEvent.clientX - startX;
				const deltaY = moveEvent.clientY - startY;

				if (!moved && Math.abs(deltaX) + Math.abs(deltaY) < 4) {
					return;
				}

				moved = true;
				moveEvent.preventDefault();
				const rect = getMarqueeRect(startX, startY, moveEvent.clientX, moveEvent.clientY, desktopRect);
				setMarqueeRect(marquee, rect);
				marquee.classList.add('is-active');
				applySelectionFromBase(baseSelection, getIntersectingIcons(rect, desktopRect), mode);
			};

			const up = () => {
				window.removeEventListener('pointermove', move);
				window.removeEventListener('pointerup', up);
				window.removeEventListener('pointercancel', up);
				marquee.classList.remove('is-active');
				setMarqueeRect(marquee, {
					height: 0,
					left: 0,
					top: 0,
					width: 0
				});
			};

			window.addEventListener('pointermove', move);
			window.addEventListener('pointerup', up);
			window.addEventListener('pointercancel', up);
		}

		function makeDraggable(icon) {
			if (!desktop || icon.dataset.pdkDesktopIconBound === '1') {
				return;
			}

			icon.dataset.pdkDesktopIconBound = '1';
			icon.draggable = false;
			icon.setAttribute('aria-pressed', icon.classList.contains('is-selected') ? 'true' : 'false');
			icon.querySelectorAll('img').forEach((image) => {
				image.draggable = false;
			});

			icon.addEventListener('click', (event) => {
				if (icon.dataset.pdkSuppressClick === '1') {
					event.preventDefault();
					event.stopPropagation();
					delete icon.dataset.pdkSuppressClick;
					return;
				}

				if (event.metaKey || event.ctrlKey) {
					toggleIconSelection(icon);
				} else if (event.shiftKey) {
					addIconToSelection(icon);
				} else {
					selectIconFromPlainAction(icon);
				}
				focusDesktopKeyboardTarget();
			}, true);

			icon.addEventListener('contextmenu', (event) => {
				if (isTextEditingTarget(event.target)) {
					return;
				}

				selectIconFromPlainAction(icon);
				focusDesktopKeyboardTarget();
			}, true);

			icon.addEventListener('pointerdown', (event) => {
				if (event.button === 0 && event.ctrlKey && !event.metaKey && !event.shiftKey && !isTextEditingTarget(event.target)) {
					selectIconFromPlainAction(icon);
					focusDesktopKeyboardTarget();
					return;
				}

				if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.target.closest('a, input, select, textarea, [contenteditable="true"], [contenteditable="plaintext-only"]')) {
					return;
				}

				selectIconFromPlainAction(icon);
				focusDesktopKeyboardTarget();
				event.preventDefault();

				const startX = event.clientX;
				const startY = event.clientY;
				const dragItems = getDragItems(icon);
				let moved = false;
				let platformDragStarted = false;

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
					setDragItemsDragging(dragItems, true);
					if (!platformDragStarted && dragDropManager && typeof dragDropManager.startDragFromElement === 'function') {
						dragDropManager.startDragFromElement(icon, {
							source: containerTypes.DESKTOP
						});
						platformDragStarted = true;
					}

					moveDragItems(dragItems, deltaX, deltaY);
					const nextDropTarget = getFolderDropTarget(icon, moveEvent.clientX, moveEvent.clientY, dragItems);
					setDropTarget(nextDropTarget);
					if (platformDragStarted && dragDropManager) {
						if (nextDropTarget && typeof dragDropManager.hoverLegacy === 'function') {
							dragDropManager.hoverLegacy(getDropDetail(icon, nextDropTarget), {
								position: {
									clientX: moveEvent.clientX,
									clientY: moveEvent.clientY
								},
								source: containerTypes.DESKTOP
							});
						} else if (typeof dragDropManager.leave === 'function') {
							dragDropManager.leave();
						}
					}
				};

				const up = (upEvent) => {
					const dropTarget = activeDropTarget;
					window.removeEventListener('pointermove', move);
					window.removeEventListener('pointerup', up);
					window.removeEventListener('pointercancel', up);
					setDragItemsDragging(dragItems, false);
					clearDropTarget();

					if (typeof icon.releasePointerCapture === 'function' && icon.hasPointerCapture(upEvent.pointerId)) {
						icon.releasePointerCapture(upEvent.pointerId);
					}

					if (moved) {
						if (dropTarget && typeof options.onDropOnFolder === 'function') {
							const sourceIcons = getSourceIconsFromDragItems(dragItems);
							const dropDetails = getDropDetails(sourceIcons.length ? sourceIcons : [icon], dropTarget);
							options.onDropOnFolder(Object.assign({}, dropDetails[0] || getDropDetail(icon, dropTarget), {
								details: dropDetails
							}));
						} else if (platformDragStarted && dragDropManager && typeof dragDropManager.cancel === 'function') {
							dragDropManager.cancel('no-drop-target');
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

			desktop.querySelectorAll('.pdk-desktop-icon-layer').forEach((layer) => {
				layer.classList.add('is-managed');
			});
		}

		function bindExistingIcons() {
			bindDesktopSelection();
			markLayersManaged();
			getIcons().forEach((icon) => {
				const label = getIconLabelElement(icon);
				if (label && dom.setTruncatedLabelText && label.dataset.pdkInlineRename !== '1') {
					dom.setTruncatedLabelText(label, getIconCurrentLabel(icon));
				}
				makeDraggable(icon);
			});
		}

		function bindDesktopSelection() {
			if (!desktop || desktop.dataset.pdkDesktopSelectionBound === '1') {
				return;
			}

			desktop.dataset.pdkDesktopSelectionBound = '1';
			if (!desktop.hasAttribute('tabindex')) {
				desktop.setAttribute('tabindex', '-1');
			}
			desktop.addEventListener('pointerdown', (event) => {
				if (event.target === desktop) {
					startDesktopMarquee(event);
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
				const state = item ? item.state : null;

				if (item && typeof item.label === 'string' && item.label.trim()) {
					setIconLabelOverride(icon, item.label);
				}
				applyIconState(icon, state, index);
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

		function handleWorkspaceStateChanged(event) {
			const detail = event && event.detail && typeof event.detail === 'object' ? event.detail : {};
			if (!options.storageKey || detail.storageKey !== options.storageKey || restoreInProgress) {
				return;
			}

			restoreSession();
		}

		window.addEventListener('beforeunload', saveSession);
		window.addEventListener(domEventNames.WORKSPACE_STATE_CHANGED, handleWorkspaceStateChanged);
		window.addEventListener('resize', () => {
			clampToDesktopTask.schedule();
		});

		return {
			bindExistingIcons,
			disableSessionSave() {
				sessionSaveDisabled = true;
				sessionSaveTask.cancel();
				clampToDesktopTask.cancel();
			},
			getIconSize() {
				return currentIconSize;
			},
			getSortMode() {
				return currentSortMode;
			},
			getSelectedIconDetails,
			iconSizes: iconSizes.slice(),
			positionIcon,
			rebind,
			restoreSession,
			saveSession,
			setIconSize,
			setSortMode,
			startInlineRename: startInlineRenameIcon,
			sortModes: sortModes.slice()
		};
	};
})();
