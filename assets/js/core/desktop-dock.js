(function () {
	'use strict';

	window.WPAdminOS = window.WPAdminOS || {};

	const defaults = {
		dock_size: 48,
		dock_magnification: 0,
		dock_position: 'bottom',
		minimize_animation: 'genie',
		minimize_into_app_icon: false,
		auto_hide_dock: false,
		animate_opening_apps: true,
		show_open_indicators: true,
		wallpaper_click: 'always',
		show_widgets_desktop: true,
		dim_widgets: 'automatic'
	};

	const allowed = {
		dock_position: ['left', 'bottom', 'right'],
		minimize_animation: ['genie', 'scale'],
		wallpaper_click: ['always', 'never'],
		dim_widgets: ['automatic', 'always', 'never']
	};

	function normalizeBoolean(value) {
		if (typeof value === 'boolean') {
			return value;
		}

		if (typeof value === 'number') {
			return value === 1;
		}

		return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
	}

	function normalizeRange(value, min, max, fallback) {
		const parsed = Number.parseFloat(value);

		if (!Number.isFinite(parsed)) {
			return fallback;
		}

		return Math.max(min, Math.min(max, Math.round(parsed)));
	}

	function getAllowedValue(key, value) {
		const next = String(value || '');

		return allowed[key] && allowed[key].includes(next) ? next : defaults[key];
	}

	function normalize(preferences = {}) {
		const normalized = Object.assign({}, defaults);

		normalized.dock_size = normalizeRange(preferences.dock_size, 28, 72, defaults.dock_size);
		normalized.dock_magnification = normalizeRange(preferences.dock_magnification, 0, 24, defaults.dock_magnification);

		Object.keys(allowed).forEach((key) => {
			normalized[key] = getAllowedValue(key, preferences[key]);
		});

		Object.keys(defaults).forEach((key) => {
			if (typeof defaults[key] === 'boolean' && Object.prototype.hasOwnProperty.call(preferences, key)) {
				normalized[key] = normalizeBoolean(preferences[key]);
			}
		});

		return normalized;
	}

	function apply(shell, preferences = {}) {
		if (!shell) {
			return normalize(preferences);
		}

		const current = normalize(preferences);
		const tileSize = current.dock_size;
		const iconSize = Math.max(18, Math.round(tileSize * 0.56));
		const lift = current.dock_magnification > 0
			? Math.round(4 + current.dock_magnification / 3)
			: 0;
		const scale = current.dock_magnification > 0
			? (1 + current.dock_magnification / 55).toFixed(3)
			: '1';

		shell.dataset.aosDockPosition = current.dock_position;
		shell.dataset.aosDockAutoHide = current.auto_hide_dock ? '1' : '0';
		shell.dataset.aosDockAnimateApps = current.animate_opening_apps ? '1' : '0';
		shell.dataset.aosDockShowIndicators = current.show_open_indicators ? '1' : '0';
		shell.dataset.aosMinimizeAnimation = current.minimize_animation;
		shell.dataset.aosMinimizeIntoAppIcon = current.minimize_into_app_icon ? '1' : '0';
		shell.dataset.aosWallpaperClick = current.wallpaper_click;
		shell.dataset.aosShowWidgetsDesktop = current.show_widgets_desktop ? '1' : '0';
		shell.dataset.aosDimWidgets = current.dim_widgets;

		shell.style.setProperty('--aos-dock-item-size', `${current.dock_size}px`);
		shell.style.setProperty('--aos-dock-icon-size', `${iconSize}px`);
		shell.style.setProperty('--aos-dock-tile-size', `${tileSize}px`);
		shell.style.setProperty('--aos-dock-hover-lift', `${lift}px`);
		shell.style.setProperty('--aos-dock-hover-scale', scale);
		shell.dispatchEvent(new window.CustomEvent('wpAdminOS:desktop-dock-change', {
			detail: current
		}));

		return current;
	}

	function isObject(value) {
		return value && typeof value === 'object' && !Array.isArray(value);
	}

	function getWorkspaceState(config = {}) {
		return isObject(config.workspaceState) ? config.workspaceState : {};
	}

	function getAppId(app) {
		return app && typeof app.id === 'string' ? app.id : '';
	}

	function normalizeDockOrder(order = [], apps = []) {
		const available = new Set((Array.isArray(apps) ? apps : []).map(getAppId).filter(Boolean));
		const seen = new Set();
		const normalized = [];

		(Array.isArray(order) ? order : []).forEach((appId) => {
			const id = typeof appId === 'string' ? appId : '';
			if (!id || seen.has(id) || (available.size && !available.has(id))) {
				return;
			}

			seen.add(id);
			normalized.push(id);
		});

		return normalized;
	}

	function getDockOrder(config = {}) {
		const state = getWorkspaceState(config);

		return normalizeDockOrder(state.dockApps || [], config.apps || []);
	}

	function orderApps(apps = [], config = {}) {
		const availableApps = Array.isArray(apps) ? apps.filter(Boolean) : [];
		const order = getDockOrder(config);
		if (!order.length) {
			return availableApps.slice();
		}

		const byId = new Map(availableApps.map((app) => [getAppId(app), app]));
		const ordered = [];

		order.forEach((appId) => {
			if (!byId.has(appId)) {
				return;
			}

			ordered.push(byId.get(appId));
			byId.delete(appId);
		});

		availableApps.forEach((app) => {
			const appId = getAppId(app);
			if (byId.has(appId)) {
				ordered.push(app);
			}
		});

		return ordered;
	}

	function getDockItem(target) {
		return target && typeof target.closest === 'function'
			? target.closest('.aos-dock-item, .aos-dock-window-item')
			: null;
	}

	function getDockAppItem(target, dock) {
		const item = target && typeof target.closest === 'function'
			? target.closest('.aos-dock-item[data-aos-open-app]')
			: null;

		return item && dock && dock.contains(item) ? item : null;
	}

	function getDockAppItems(dock) {
		if (!dock) {
			return [];
		}

		return Array.from(dock.children).filter((child) => (
			child.classList
			&& child.classList.contains('aos-dock-item')
			&& child.dataset
			&& child.dataset.aosOpenApp
		));
	}

	function getMinimizedWindowContainer(dock) {
		return dock ? dock.querySelector('.aos-dock-minimized-windows') : null;
	}

	function getDockOrderFromDom(dock) {
		return getDockAppItems(dock)
			.map((item) => item.dataset.aosOpenApp || '')
			.filter(Boolean);
	}

	function arraysEqual(first = [], second = []) {
		return first.length === second.length && first.every((value, index) => value === second[index]);
	}

	function applyOrderToDock(shell, config = {}) {
		const dock = shell ? shell.querySelector('.aos-dock') : null;
		const order = getDockOrder(config);
		if (!dock || !order.length) {
			return false;
		}

		const dockItems = getDockAppItems(dock);
		const byId = new Map(dockItems.map((item) => [item.dataset.aosOpenApp || '', item]));
		const orderedItems = [];
		const minimizedWindows = getMinimizedWindowContainer(dock);

		order.forEach((appId) => {
			if (!byId.has(appId)) {
				return;
			}

			orderedItems.push(byId.get(appId));
			byId.delete(appId);
		});

		dockItems.forEach((item) => {
			const appId = item.dataset.aosOpenApp || '';
			if (byId.has(appId)) {
				orderedItems.push(item);
			}
		});

		orderedItems.forEach((item) => {
			dock.insertBefore(item, minimizedWindows || null);
		});

		return true;
	}

	function saveDockOrder(config = {}, sessionStore, order = []) {
		const normalized = normalizeDockOrder(order, config.apps || []);
		config.workspaceState = Object.assign({}, getWorkspaceState(config), {
			dockApps: normalized
		});

		if (sessionStore && typeof sessionStore.saveSection === 'function') {
			sessionStore.saveSection('dockApps', normalized);
			return true;
		}

		return false;
	}

	function createSessionStore(config = {}, options = {}) {
		const storageKey = options.storageKey || config.storageKey || '';

		return storageKey
			&& window.WPAdminOS.session
			&& typeof window.WPAdminOS.session.createSessionStore === 'function'
			? window.WPAdminOS.session.createSessionStore(storageKey)
			: null;
	}

	function dismissTooltip(item, shouldBlur = false) {
		if (!item) {
			return;
		}

		item.classList.add('is-tooltip-dismissed');
		if (shouldBlur && typeof item.blur === 'function') {
			item.blur();
		}
	}

	function restoreTooltip(item) {
		if (item) {
			item.classList.remove('is-tooltip-dismissed');
		}
	}

	function bindTooltipDismissal(shell) {
		const dock = shell ? shell.querySelector('.aos-dock') : null;

		if (!dock || dock.dataset.aosTooltipDismissalBound === '1') {
			return;
		}

		dock.dataset.aosTooltipDismissalBound = '1';
		dock.addEventListener('pointerdown', (event) => {
			dismissTooltip(getDockItem(event.target));
		});
		dock.addEventListener('click', (event) => {
			dismissTooltip(getDockItem(event.target), true);
		});
		dock.addEventListener('keydown', (event) => {
			if (event.key !== 'Enter' && event.key !== ' ') {
				return;
			}

			dismissTooltip(getDockItem(event.target));
		});
		dock.addEventListener('pointerout', (event) => {
			const item = getDockItem(event.target);

			if (!item || (event.relatedTarget && item.contains(event.relatedTarget))) {
				return;
			}

			restoreTooltip(item);
		});
		dock.addEventListener('focusout', (event) => {
			restoreTooltip(getDockItem(event.target));
		});
		document.addEventListener('pointermove', (event) => {
			dock.querySelectorAll('.is-tooltip-dismissed').forEach((item) => {
				if (!item.contains(event.target)) {
					restoreTooltip(item);
				}
			});
		}, { passive: true });
	}

	function bindReordering(shell, config = {}, options = {}) {
		const dock = shell ? shell.querySelector('.aos-dock') : null;
		const sessionStore = createSessionStore(config, options);
		const moveTolerance = 8;
		let drag = null;

		if (!dock || dock.dataset.aosDockReorderBound === '1') {
			return;
		}

		dock.dataset.aosDockReorderBound = '1';
		applyOrderToDock(shell, config);

		function isVerticalDock() {
			const position = shell && shell.dataset ? shell.dataset.aosDockPosition : 'bottom';

			return position === 'left' || position === 'right';
		}

		function getInsertBeforeItem(event) {
			const vertical = isVerticalDock();
			const coordinate = vertical ? event.clientY : event.clientX;
			const items = getDockAppItems(dock).filter((item) => item !== drag.item);

			return items.find((item) => {
				const rect = item.getBoundingClientRect();
				const center = vertical ? rect.top + (rect.height / 2) : rect.left + (rect.width / 2);

				return coordinate < center;
			}) || getMinimizedWindowContainer(dock) || null;
		}

		function startDrag(event) {
			drag.dragging = true;
			drag.item.classList.remove('is-dock-reorder-pending');
			drag.item.classList.add('is-dock-reordering', 'is-tooltip-dismissed');
			dock.classList.add('is-reordering');
			shell.dataset.aosDockReordering = '1';

			if (typeof drag.item.setPointerCapture === 'function') {
				try {
					drag.item.setPointerCapture(event.pointerId);
				} catch (error) {
					// Pointer capture can fail if the browser already released the pointer.
				}
			}
		}

		function isDockMenuPressActive(item) {
			return Boolean(
				item
				&& item.classList
				&& (
					item.classList.contains('is-context-menu-active')
					|| item.dataset.aosDockLongPressOpen === '1'
				)
			);
		}

		function endDrag(event, shouldSave = true) {
			if (!drag) {
				return;
			}

			const didDrag = drag.dragging;
			const item = drag.item;
			const changed = didDrag && !arraysEqual(drag.originalOrder, getDockOrderFromDom(dock));

			if (didDrag && !shouldSave && drag.originalOrder.length) {
				config.workspaceState = Object.assign({}, getWorkspaceState(config), {
					dockApps: drag.originalOrder
				});
				applyOrderToDock(shell, config);
			}

			item.classList.remove('is-dock-reorder-pending', 'is-dock-reordering', 'is-tooltip-dismissed');
			dock.classList.remove('is-reordering');
			delete shell.dataset.aosDockReordering;

			if (didDrag) {
				item.dataset.aosDockReorderSuppressClick = '1';
				window.setTimeout(() => {
					if (item.dataset.aosDockReorderSuppressClick === '1') {
						delete item.dataset.aosDockReorderSuppressClick;
					}
				}, 450);
			}

			if (shouldSave && changed) {
				saveDockOrder(config, sessionStore, getDockOrderFromDom(dock));
			}

			if (event && didDrag) {
				event.preventDefault();
				event.stopPropagation();
			}

			drag = null;
		}

		dock.addEventListener('pointerdown', (event) => {
			if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
				return;
			}

			const item = getDockAppItem(event.target, dock);
			if (!item || item.closest('.aos-dock-minimized-windows')) {
				return;
			}

			if (isDockMenuPressActive(item)) {
				return;
			}

			drag = {
				dragging: false,
				item,
				originalOrder: getDockOrderFromDom(dock),
				pointerId: event.pointerId,
				startX: event.clientX,
				startY: event.clientY
			};
			item.classList.add('is-dock-reorder-pending');
		});

		window.addEventListener('pointermove', (event) => {
			if (!drag || event.pointerId !== drag.pointerId || !dock.contains(drag.item)) {
				return;
			}

			const deltaX = event.clientX - drag.startX;
			const deltaY = event.clientY - drag.startY;

			if (!drag.dragging && isDockMenuPressActive(drag.item)) {
				endDrag(null, false);
				return;
			}

			if (!drag.dragging && Math.abs(deltaX) + Math.abs(deltaY) <= moveTolerance) {
				return;
			}

			if (!drag.dragging) {
				startDrag(event);
			}

			dock.insertBefore(drag.item, getInsertBeforeItem(event));
			event.preventDefault();
		});

		window.addEventListener('pointerup', (event) => {
			if (!drag || event.pointerId !== drag.pointerId) {
				return;
			}

			endDrag(event, true);
		});

		window.addEventListener('pointercancel', (event) => {
			if (!drag || event.pointerId !== drag.pointerId) {
				return;
			}

			endDrag(event, false);
		});

		shell.addEventListener('click', (event) => {
			const item = getDockAppItem(event.target, dock);
			if (!item || item.dataset.aosDockReorderSuppressClick !== '1') {
				return;
			}

			delete item.dataset.aosDockReorderSuppressClick;
			event.preventDefault();
			event.stopPropagation();
		}, true);

		window.addEventListener('wpAdminOS:workspace-state-changed', (event) => {
			if (drag && drag.dragging) {
				return;
			}

			const state = event && event.detail && isObject(event.detail.state) ? event.detail.state : null;
			if (state) {
				config.workspaceState = state;
			}
			applyOrderToDock(shell, config);
		});
	}

	window.WPAdminOS.desktopDock = {
		apply,
		applyOrderToDock,
		bindTooltipDismissal,
		bindReordering,
		defaults,
		getDockOrder,
		normalize,
		normalizeDockOrder,
		orderApps
	};
})();
