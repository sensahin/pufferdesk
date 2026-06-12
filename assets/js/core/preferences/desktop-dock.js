(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};

	const defaults = window.PufferDesk.config.getSettingDefault('desktop_dock') || {};
	const allowed = window.PufferDesk.config.getSettingOptions('desktop_dock') || {};
	const workspaceSections = window.PufferDesk.session && window.PufferDesk.session.workspace
		? window.PufferDesk.session.workspace.sections || {}
		: {};
	const domEventNames = window.PufferDesk.events && window.PufferDesk.events.domNames ? window.PufferDesk.events.domNames : {};
	const fitStates = new WeakMap();
	const dockFitMinSize = 24;
	const verticalDockFitMinSize = 16;
	const taskbarFitMinSize = 30;
	const verticalDockMaxSize = 58;
	const taskbarMaxSize = 56;

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

	function getFitState(shell) {
		if (!fitStates.has(shell)) {
			fitStates.set(shell, {
				current: null,
				fitting: false,
				maxSize: 0,
				mutationObserver: null,
				pending: false,
				resizeObserver: null,
				raf: 0,
				revision: 0,
				signature: ''
			});
		}

		return fitStates.get(shell);
	}

	function isTaskbarLauncher(shell) {
		return Boolean(shell && shell.dataset && shell.dataset.pdkShellLauncher === 'taskbar');
	}

	function isVerticalDock(shell, preferences = {}) {
		return !isTaskbarLauncher(shell) && ['left', 'right'].includes(preferences.dock_position);
	}

	function getDesiredDockSize(shell, preferences = {}) {
		const size = normalizeRange(preferences.dock_size, 28, 72, defaults.dock_size);
		if (isVerticalDock(shell, preferences)) {
			return Math.min(size, verticalDockMaxSize);
		}

		return isTaskbarLauncher(shell) ? Math.min(size, taskbarMaxSize) : size;
	}

	function getDockIconSize(size) {
		return Math.max(12, Math.round(size * 0.56));
	}

	function getDockMinSize(shell, preferences = {}, desiredSize) {
		if (isTaskbarLauncher(shell)) {
			return Math.min(desiredSize, taskbarFitMinSize);
		}

		return Math.min(desiredSize, isVerticalDock(shell, preferences) ? verticalDockFitMinSize : dockFitMinSize);
	}

	function getDockMagnification(preferences = {}, fitScale = 1) {
		const magnification = normalizeRange(preferences.dock_magnification, 0, 24, defaults.dock_magnification);
		const strength = Math.max(0, Math.min(1, fitScale));
		const effectiveMagnification = magnification * strength;
		const lift = effectiveMagnification > 0
			? Math.round(Math.min(12, Math.max(2, effectiveMagnification / 2)))
			: 0;
		const scale = effectiveMagnification > 0
			? (1 + effectiveMagnification / 64).toFixed(3)
			: '1';

		return { lift, scale };
	}

	function applyDockSizeVariables(shell, preferences = {}, size, fitScale = 1) {
		const iconSize = getDockIconSize(size);
		const magnification = getDockMagnification(preferences, fitScale);

		shell.style.setProperty('--pdk-dock-item-size', `${size}px`);
		shell.style.setProperty('--pdk-dock-icon-size', `${iconSize}px`);
		shell.style.setProperty('--pdk-dock-tile-size', `${size}px`);
		shell.style.setProperty('--pdk-dock-hover-lift', `${magnification.lift}px`);
		shell.style.setProperty('--pdk-dock-hover-scale', magnification.scale);
		shell.style.setProperty('--pdk-dock-fit-scale', fitScale.toFixed(3));
	}

	function getNumericStyle(styles, property, fallback = 0) {
		const value = Number.parseFloat(styles.getPropertyValue(property));

		return Number.isFinite(value) ? value : fallback;
	}

	function getAxisGap(styles, vertical) {
		const property = vertical ? 'row-gap' : 'column-gap';
		const axisGap = getNumericStyle(styles, property, Number.NaN);

		if (Number.isFinite(axisGap)) {
			return axisGap;
		}

		return getNumericStyle(styles, 'gap', 0);
	}

	function getAxisPadding(styles, vertical) {
		return vertical
			? getNumericStyle(styles, 'padding-top', 0) + getNumericStyle(styles, 'padding-bottom', 0)
			: getNumericStyle(styles, 'padding-left', 0) + getNumericStyle(styles, 'padding-right', 0);
	}

	function getAxisBorder(styles, vertical) {
		return vertical
			? getNumericStyle(styles, 'border-top-width', 0) + getNumericStyle(styles, 'border-bottom-width', 0)
			: getNumericStyle(styles, 'border-left-width', 0) + getNumericStyle(styles, 'border-right-width', 0);
	}

	function getAxisMargin(element, vertical) {
		const styles = window.getComputedStyle(element);

		return vertical
			? getNumericStyle(styles, 'margin-top', 0) + getNumericStyle(styles, 'margin-bottom', 0)
			: getNumericStyle(styles, 'margin-left', 0) + getNumericStyle(styles, 'margin-right', 0);
	}

	function getAxisRectSize(rect, vertical) {
		return vertical ? rect.height : rect.width;
	}

	function getDockConstraintBase(dock, vertical) {
		const parent = dock.offsetParent instanceof window.HTMLElement
			? dock.offsetParent
			: dock.parentElement;
		const rect = parent ? parent.getBoundingClientRect() : null;
		const rectSize = rect ? getAxisRectSize(rect, vertical) : 0;

		if (rectSize > 0) {
			return rectSize;
		}

		return vertical ? window.innerHeight : window.innerWidth;
	}

	function resolveCssLength(value, base, styles) {
		const raw = String(value || '').trim();

		if (!raw || raw === 'none' || raw === 'auto') {
			return 0;
		}

		const numeric = Number.parseFloat(raw);
		if (Number.isFinite(numeric) && raw.endsWith('px')) {
			return numeric;
		}

		const expression = raw
			.replace(/var\((--[a-z0-9_-]+)(?:,\s*([^)]+))?\)/gi, (match, name, fallback = '0') => {
				const resolved = styles.getPropertyValue(name).trim();

				return resolved || fallback;
			})
			.replace(/calc\(/g, '')
			.replace(/\)/g, '');
		const terms = expression.match(/[+-]?\s*(?:\d*\.?\d+%|\d*\.?\d+px|\d*\.?\d+)/g);

		if (!terms) {
			return 0;
		}

		const total = terms.reduce((sum, term) => {
			const compact = term.replace(/\s+/g, '');
			const sign = compact.startsWith('-') ? -1 : 1;
			const magnitude = compact.replace(/^[+-]/, '');
			const parsed = Number.parseFloat(magnitude);

			if (!Number.isFinite(parsed)) {
				return sum;
			}
			if (magnitude.endsWith('%')) {
				return sum + sign * (base * parsed / 100);
			}

			return sum + sign * parsed;
		}, 0);

		return Number.isFinite(total) ? total : 0;
	}

	function getDockFlowChildren(dock, taskbar = false) {
		return Array.from(dock.children).filter((child) => {
			if (!(child instanceof window.HTMLElement)) {
				return false;
			}
			if (child.matches('.pdk-dock-end-anchor')) {
				return false;
			}
			if (taskbar && child.matches('.pdk-taskbar-status')) {
				return false;
			}

			const rect = child.getBoundingClientRect();
			return rect.width > 0 && rect.height > 0;
		});
	}

	function getDockMaxAvailable(dock, vertical, fallback) {
		const styles = window.getComputedStyle(dock);
		const maxProperty = vertical ? 'max-height' : 'max-width';
		const maxValue = resolveCssLength(styles.getPropertyValue(maxProperty), getDockConstraintBase(dock, vertical), styles);

		if (maxValue > 0 && maxValue < 100000) {
			return Math.max(0, maxValue - getAxisBorder(styles, vertical));
		}

		return fallback;
	}

	function estimateLinearDockMaxSize(dock, vertical, currentSize, maxAvailable) {
		if (!dock || currentSize <= 0 || maxAvailable <= 0) {
			return 0;
		}

		const dockStyles = window.getComputedStyle(dock);
		const directChildren = getDockFlowChildren(dock, false);
		let variableItems = 0;
		let fixedSpace = getAxisPadding(dockStyles, vertical);

		if (directChildren.length > 1) {
			fixedSpace += getAxisGap(dockStyles, vertical) * (directChildren.length - 1);
		}

		directChildren.forEach((child) => {
			if (child.matches('.pdk-dock-item, .pdk-dock-window-item')) {
				variableItems += 1;
				return;
			}
			if (child.matches('.pdk-dock-minimized-windows')) {
				const minimizedItems = Array.from(child.children).filter((item) => item.matches('.pdk-dock-window-item'));
				const minimizedStyles = window.getComputedStyle(child);

				variableItems += minimizedItems.length;
				if (minimizedItems.length > 1) {
					fixedSpace += getAxisGap(minimizedStyles, vertical) * (minimizedItems.length - 1);
				}
				return;
			}

			fixedSpace += getAxisRectSize(child.getBoundingClientRect(), vertical) + getAxisMargin(child, vertical);
		});

		if (!variableItems) {
			return 0;
		}

		return Math.max(0, Math.floor((maxAvailable - fixedSpace) / variableItems));
	}

	function getDockFitSignature(shell, dock, preferences = {}) {
		if (!shell || !dock) {
			return '';
		}

		const vertical = isVerticalDock(shell, preferences);
		const taskbar = isTaskbarLauncher(shell);
		const children = getDockFlowChildren(dock, taskbar).map((child) => {
			if (child.matches('.pdk-dock-minimized-windows')) {
				return `windows:${child.querySelectorAll('.pdk-dock-window-item').length}`;
			}
			if (child.matches('.pdk-dock-item')) {
				return `app:${child.dataset.pdkOpenApp || ''}:${child.dataset.pdkDockFixed || ''}`;
			}
			if (child.matches('.pdk-dock-window-item')) {
				return `window:${child.dataset.pdkRestoreWindowId || ''}`;
			}

			return child.className || child.tagName.toLowerCase();
		});
		const overflow = taskbar
			? getTaskbarOverflow(dock)
			: {
				available: getDockMaxAvailable(dock, vertical, getDockConstraintBase(dock, vertical))
			};

		return [
			shell.dataset.pdkTheme || '',
			shell.dataset.pdkShellLauncher || '',
			preferences.dock_position || '',
			Math.round(overflow.available || 0),
			children.join('|')
		].join('::');
	}

	function getCachedMaxSize(state, signature) {
		return state.signature === signature && state.maxSize > 0 ? state.maxSize : 0;
	}

	function getEstimatedMaxSize(shell, dock, preferences = {}, desiredSize = 0) {
		if (!shell || !dock || isTaskbarLauncher(shell)) {
			return 0;
		}

		const vertical = isVerticalDock(shell, preferences);
		const overflow = getDockOverflow(dock, vertical, false, desiredSize);

		return overflow.maxSize > 0 ? overflow.maxSize : 0;
	}

	function getTaskbarOverflow(dock) {
		const dockRect = dock.getBoundingClientRect();
		const status = dock.querySelector('.pdk-taskbar-status');
		const statusRect = status ? status.getBoundingClientRect() : null;
		const dockStyles = window.getComputedStyle(dock);
		const gap = Number.parseFloat(dockStyles.gap || dockStyles.columnGap || '0') || 0;
		const available = statusRect
			? Math.max(0, statusRect.left - dockRect.left - gap * 2)
			: dock.clientWidth;
		const flowChildren = Array.from(dock.children).filter((child) => {
			if (!(child instanceof window.HTMLElement)) {
				return false;
			}
			if (child.matches('.pdk-dock-end-anchor, .pdk-taskbar-status')) {
				return false;
			}

			const rect = child.getBoundingClientRect();
			return rect.width > 0 && rect.height > 0;
		});
		const needed = flowChildren.reduce((max, child) => {
			const rect = child.getBoundingClientRect();
			return Math.max(max, rect.right - dockRect.left);
		}, 0);

		return {
			available,
			needed
		};
	}

	function getDockOverflow(dock, vertical, taskbar = false, currentSize = 0) {
		if (!dock) {
			return { available: 0, needed: 0 };
		}
		if (taskbar) {
			return getTaskbarOverflow(dock);
		}

		const dockRect = dock.getBoundingClientRect();
		const children = getDockFlowChildren(dock, false);
		const needed = children.reduce((max, child) => {
			const rect = child.getBoundingClientRect();
			const extent = vertical ? rect.bottom - dockRect.top : rect.right - dockRect.left;

			return Math.max(max, extent);
		}, 0);
		const available = vertical ? dock.clientHeight : dock.clientWidth;
		const maxAvailable = getDockMaxAvailable(dock, vertical, available);

		return {
			available,
			maxAvailable,
			maxSize: estimateLinearDockMaxSize(dock, vertical, currentSize, maxAvailable),
			needed
		};
	}

	function finishStaleDockFit(state, shell) {
		state.fitting = false;
		if (state.pending) {
			state.pending = false;
			scheduleDockFit(shell);
		}
	}

	function isStaleDockFit(state, revision) {
		return revision !== state.revision;
	}

	function finishDockFit(state, shell, dock, compressed, signature = '', maxSize = 0, revision = state.revision) {
		if (isStaleDockFit(state, revision)) {
			finishStaleDockFit(state, shell);
			return;
		}

		dock.dataset.pdkDockFit = compressed ? 'compressed' : 'natural';
		if (signature) {
			state.signature = signature;
			state.maxSize = maxSize > 0 ? maxSize : 0;
		}
		state.fitting = false;
		if (state.pending) {
			state.pending = false;
			scheduleDockFit(shell);
		}
	}

	function refineDockFit(shell, dock, preferences, vertical, taskbar, desiredSize, minSize, nextSize, revision, attempt = 0) {
		const state = getFitState(shell);

		window.requestAnimationFrame(() => {
			if (isStaleDockFit(state, revision)) {
				finishStaleDockFit(state, shell);
				return;
			}

			const overflow = getDockOverflow(dock, vertical, taskbar, nextSize);

			if (overflow.available > 0 && overflow.needed > overflow.available + 1 && nextSize > minSize) {
				const fitRatio = overflow.available / overflow.needed;
				const adjustedRatio = taskbar ? Math.pow(fitRatio, 2) : fitRatio;
				const refinedSize = !taskbar && overflow.maxSize > 0
					? Math.max(minSize, Math.min(desiredSize, overflow.maxSize))
					: Math.max(minSize, Math.floor(nextSize * adjustedRatio));

				if (refinedSize < nextSize) {
					const refinedScale = desiredSize > 0 ? Math.min(1, refinedSize / desiredSize) : 1;
					applyDockSizeVariables(shell, preferences, refinedSize, refinedScale);

					if (attempt < 2) {
						refineDockFit(shell, dock, preferences, vertical, taskbar, desiredSize, minSize, refinedSize, revision, attempt + 1);
						return;
					}

					nextSize = refinedSize;
				}
			}

			const finalOverflow = getDockOverflow(dock, vertical, taskbar, nextSize);
			const signature = getDockFitSignature(shell, dock, preferences);
			finishDockFit(
				state,
				shell,
				dock,
				nextSize < desiredSize || (finalOverflow.available > 0 && finalOverflow.needed > finalOverflow.available + 1),
				signature,
				finalOverflow.maxSize || nextSize,
				revision
			);
		});
	}

	function measureAndFitDock(shell) {
		const state = getFitState(shell);
		const preferences = state.current;
		const dock = shell ? shell.querySelector('.pdk-dock') : null;

		if (!shell || !preferences || !dock) {
			return;
		}

		state.fitting = true;
		const revision = state.revision;
		const desiredSize = getDesiredDockSize(shell, preferences);
		const vertical = isVerticalDock(shell, preferences);
		const taskbar = isTaskbarLauncher(shell);
		const minSize = getDockMinSize(shell, preferences, desiredSize);
		const signature = getDockFitSignature(shell, dock, preferences);
		const cachedMaxSize = getCachedMaxSize(state, signature);
		const measuringSize = cachedMaxSize && desiredSize > cachedMaxSize ? cachedMaxSize : desiredSize;

		applyDockSizeVariables(shell, preferences, measuringSize, desiredSize > 0 ? Math.min(1, measuringSize / desiredSize) : 1);

		window.requestAnimationFrame(() => {
			if (isStaleDockFit(state, revision)) {
				finishStaleDockFit(state, shell);
				return;
			}

			const overflow = getDockOverflow(dock, vertical, taskbar, measuringSize);
			let nextSize = measuringSize;

			if (overflow.available > 0 && overflow.needed > overflow.available + 1) {
				const fitRatio = overflow.available / overflow.needed;
				const adjustedRatio = taskbar ? Math.pow(fitRatio, 3) : fitRatio;
				nextSize = !taskbar && overflow.maxSize > 0
					? Math.max(minSize, Math.min(desiredSize, overflow.maxSize))
					: Math.max(minSize, Math.floor(desiredSize * adjustedRatio));
			}

			const fitScale = desiredSize > 0 ? Math.min(1, nextSize / desiredSize) : 1;
			applyDockSizeVariables(shell, preferences, nextSize, fitScale);
			refineDockFit(shell, dock, preferences, vertical, taskbar, desiredSize, minSize, nextSize, revision);
		});
	}

	function scheduleDockFit(shell) {
		if (!shell || typeof window.requestAnimationFrame !== 'function') {
			return;
		}

		const state = getFitState(shell);
		if (state.fitting) {
			state.pending = true;
			return;
		}
		window.cancelAnimationFrame(state.raf);
		state.raf = window.requestAnimationFrame(() => {
			state.raf = 0;
			measureAndFitDock(shell);
		});
	}

	function bindResponsiveSizing(shell) {
		const state = getFitState(shell);
		const dock = shell ? shell.querySelector('.pdk-dock') : null;

		if (!shell || !dock || dock.dataset.pdkResponsiveSizingBound === '1') {
			return;
		}

		dock.dataset.pdkResponsiveSizingBound = '1';
		if (typeof window.MutationObserver === 'function') {
			state.mutationObserver = new window.MutationObserver(() => scheduleDockFit(shell));
			state.mutationObserver.observe(dock, { childList: true, subtree: true });
		}
		if (typeof window.ResizeObserver === 'function') {
			state.resizeObserver = new window.ResizeObserver(() => scheduleDockFit(shell));
			state.resizeObserver.observe(shell);
		}
		window.addEventListener('resize', () => scheduleDockFit(shell), { passive: true });
	}

	function apply(shell, preferences = {}) {
		if (!shell) {
			return normalize(preferences);
		}

		const current = normalize(preferences);
		const fitState = getFitState(shell);

		shell.dataset.pdkDockPosition = current.dock_position;
		shell.dataset.pdkDockAutoHide = current.auto_hide_dock ? '1' : '0';
		shell.dataset.pdkDockAnimateApps = current.animate_opening_apps ? '1' : '0';
		shell.dataset.pdkDockShowIndicators = current.show_open_indicators ? '1' : '0';
		shell.dataset.pdkMinimizeAnimation = current.minimize_animation;
		shell.dataset.pdkMinimizeIntoAppIcon = current.minimize_into_app_icon ? '1' : '0';
		shell.dataset.pdkWallpaperClick = current.wallpaper_click;
		shell.dataset.pdkShowWidgetsDesktop = current.show_widgets_desktop ? '1' : '0';
		shell.dataset.pdkDimWidgets = current.dim_widgets;

		fitState.current = current;
		fitState.revision += 1;
		const dock = shell.querySelector('.pdk-dock');
		const desiredSize = getDesiredDockSize(shell, current);
		const signature = getDockFitSignature(shell, dock, current);
		const cachedMaxSize = getCachedMaxSize(fitState, signature);
		const estimatedMaxSize = cachedMaxSize || getEstimatedMaxSize(shell, dock, current, desiredSize);
		const immediateSize = estimatedMaxSize && desiredSize > estimatedMaxSize ? estimatedMaxSize : desiredSize;
		applyDockSizeVariables(shell, current, immediateSize, desiredSize > 0 ? Math.min(1, immediateSize / desiredSize) : 1);
		bindResponsiveSizing(shell);
		scheduleDockFit(shell);
		shell.dispatchEvent(new window.CustomEvent(domEventNames.DESKTOP_DOCK_CHANGE, {
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

	function isFixedDockApp(app) {
		return Boolean(app && app.dock && typeof app.dock === 'object' && app.dock.fixed === true);
	}

	function isFixedDockItem(item) {
		return Boolean(item && item.dataset && item.dataset.pdkDockFixed);
	}

	function normalizeDockOrder(order = [], apps = []) {
		const availableApps = Array.isArray(apps) ? apps : [];
		const available = new Set(availableApps.filter((app) => !isFixedDockApp(app)).map(getAppId).filter(Boolean));
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

		return normalizeDockOrder(state[workspaceSections.DOCK_APPS] || [], config.apps || []);
	}

	function orderApps(apps = [], config = {}) {
		const availableApps = Array.isArray(apps) ? apps.filter(Boolean) : [];
		const fixedApps = availableApps.filter(isFixedDockApp);
		const regularApps = availableApps.filter((app) => !isFixedDockApp(app));
		const order = getDockOrder(config);
		if (!order.length) {
			return regularApps.concat(fixedApps);
		}

		const byId = new Map(regularApps.map((app) => [getAppId(app), app]));
		const ordered = [];

		order.forEach((appId) => {
			if (!byId.has(appId)) {
				return;
			}

			ordered.push(byId.get(appId));
			byId.delete(appId);
		});

		regularApps.forEach((app) => {
			const appId = getAppId(app);
			if (byId.has(appId)) {
				ordered.push(app);
			}
		});

		return ordered.concat(fixedApps);
	}

	function getDockItem(target) {
		return target && typeof target.closest === 'function'
			? target.closest('.pdk-dock-item, .pdk-dock-window-item')
			: null;
	}

	function getDockAppItem(target, dock) {
		const item = target && typeof target.closest === 'function'
			? target.closest('.pdk-dock-item[data-pdk-open-app]')
			: null;

		return item && dock && dock.contains(item) && !isFixedDockItem(item) ? item : null;
	}

	function getDockAppItems(dock) {
		if (!dock) {
			return [];
		}

		return Array.from(dock.children).filter((child) => (
			child.classList
			&& child.classList.contains('pdk-dock-item')
			&& child.dataset
			&& child.dataset.pdkOpenApp
			&& !isFixedDockItem(child)
		));
	}

	function getDockEndAnchor(dock) {
		return dock ? dock.querySelector('.pdk-dock-separator, .pdk-dock-minimized-windows, .pdk-dock-item[data-pdk-dock-fixed], [data-pdk-launcher-end-anchor]') : null;
	}

	function getDockOrderFromDom(dock) {
		return getDockAppItems(dock)
			.map((item) => item.dataset.pdkOpenApp || '')
			.filter(Boolean);
	}

	function arraysEqual(first = [], second = []) {
		return first.length === second.length && first.every((value, index) => value === second[index]);
	}

	function applyOrderToDock(shell, config = {}) {
		const dock = shell ? shell.querySelector('.pdk-dock') : null;
		const order = getDockOrder(config);
		if (!dock || !order.length) {
			return false;
		}

		const dockItems = getDockAppItems(dock);
		const byId = new Map(dockItems.map((item) => [item.dataset.pdkOpenApp || '', item]));
		const orderedItems = [];
		const dockEndAnchor = getDockEndAnchor(dock);

		order.forEach((appId) => {
			if (!byId.has(appId)) {
				return;
			}

			orderedItems.push(byId.get(appId));
			byId.delete(appId);
		});

		dockItems.forEach((item) => {
			const appId = item.dataset.pdkOpenApp || '';
			if (byId.has(appId)) {
				orderedItems.push(item);
			}
		});

		orderedItems.forEach((item) => {
			dock.insertBefore(item, dockEndAnchor || null);
		});

		return true;
	}

	function saveDockOrder(config = {}, sessionStore, order = []) {
		const normalized = normalizeDockOrder(order, config.apps || []);
		config.workspaceState = Object.assign({}, getWorkspaceState(config), {
			[workspaceSections.DOCK_APPS]: normalized
		});

		if (sessionStore && typeof sessionStore.saveSection === 'function') {
			sessionStore.saveSection(workspaceSections.DOCK_APPS, normalized);
			return true;
		}

		return false;
	}

	function createSessionStore(config = {}, options = {}) {
		const storageKey = options.storageKey || config.storageKey || '';

		return storageKey
			&& window.PufferDesk.session
			&& typeof window.PufferDesk.session.createSessionStore === 'function'
			? window.PufferDesk.session.createSessionStore(storageKey)
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
		const dock = shell ? shell.querySelector('.pdk-dock') : null;

		if (!dock || dock.dataset.pdkTooltipDismissalBound === '1') {
			return;
		}

		dock.dataset.pdkTooltipDismissalBound = '1';
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
		const dock = shell ? shell.querySelector('.pdk-dock') : null;
		const sessionStore = createSessionStore(config, options);
		const moveTolerance = 8;
		const layoutAnimationDuration = 170;
		let drag = null;

		if (!dock || dock.dataset.pdkDockReorderBound === '1') {
			return;
		}

		dock.dataset.pdkDockReorderBound = '1';
		applyOrderToDock(shell, config);

		function isVerticalDock() {
			const position = shell && shell.dataset ? shell.dataset.pdkDockPosition : 'bottom';

			return position === 'left' || position === 'right';
		}

		function getInsertBeforeItem(event) {
			const vertical = isVerticalDock();
			const coordinate = vertical ? event.clientY : event.clientX;
			const items = getDockAppItems(dock);

			return items.find((item) => {
				const rect = item.getBoundingClientRect();
				const center = vertical ? rect.top + (rect.height / 2) : rect.left + (rect.width / 2);

				return coordinate < center;
			}) || getDockEndAnchor(dock) || null;
		}

		function getLayoutAnimationItems() {
			return Array.from(dock.children).filter((child) => (
				child.classList
				&& (
					child.classList.contains('pdk-dock-item')
					|| child.classList.contains('pdk-dock-reorder-placeholder')
				)
			));
		}

		function animateDockLayout(update) {
			const firstRects = new Map();

			getLayoutAnimationItems().forEach((item) => {
				firstRects.set(item, item.getBoundingClientRect());
			});
			update();

			getLayoutAnimationItems().forEach((item) => {
				const firstRect = firstRects.get(item);
				if (!firstRect) {
					return;
				}

				const lastRect = item.getBoundingClientRect();
				const deltaX = firstRect.left - lastRect.left;
				const deltaY = firstRect.top - lastRect.top;

				if (!deltaX && !deltaY) {
					return;
				}

				window.clearTimeout(item.pdkDockLayoutAnimationTimer);
				item.style.transition = 'none';
				item.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

				window.requestAnimationFrame(() => {
					item.style.transition = `transform ${layoutAnimationDuration}ms cubic-bezier(0.22, 1, 0.36, 1)`;
					item.style.transform = '';
					item.pdkDockLayoutAnimationTimer = window.setTimeout(() => {
						item.style.transition = '';
						item.style.transform = '';
						delete item.pdkDockLayoutAnimationTimer;
					}, layoutAnimationDuration + 40);
				});
			});
		}

		function createPlaceholder(item) {
			const rect = item.getBoundingClientRect();
			const placeholder = document.createElement('span');

			placeholder.className = 'pdk-dock-reorder-placeholder';
			placeholder.setAttribute('aria-hidden', 'true');
			placeholder.style.width = `${rect.width}px`;
			placeholder.style.height = `${rect.height}px`;
			placeholder.style.flexBasis = `${isVerticalDock() ? rect.height : rect.width}px`;

			return placeholder;
		}

		function positionFloatingItem(event, animate = false) {
			if (!drag || !drag.item) {
				return;
			}

			drag.item.style.transition = animate
				? 'left 120ms cubic-bezier(0.22, 1, 0.36, 1), top 120ms cubic-bezier(0.22, 1, 0.36, 1), transform 120ms ease'
				: 'none';
			drag.item.style.left = `${Math.round(event.clientX - drag.offsetX)}px`;
			drag.item.style.top = `${Math.round(event.clientY - drag.offsetY)}px`;
		}

		function movePlaceholder(before) {
			if (!drag || !drag.placeholder) {
				return;
			}

			const currentNext = drag.placeholder.nextElementSibling;
			if (before === drag.placeholder || before === currentNext) {
				return;
			}

			animateDockLayout(() => {
				dock.insertBefore(drag.placeholder, before || getDockEndAnchor(dock) || null);
			});
		}

		function clearFloatingItemStyles(item) {
			if (!item) {
				return;
			}

			item.classList.remove('is-dock-reorder-pending', 'is-dock-reordering', 'pdk-dock-drag-proxy', 'is-tooltip-dismissed');
			item.style.height = '';
			item.style.left = '';
			item.style.position = '';
			item.style.top = '';
			item.style.transform = '';
			item.style.transition = '';
			item.style.width = '';
			item.style.zIndex = '';
			item.removeAttribute('data-pdk-dock-reorder-proxy');

			if (item.pdkDockOriginalAriaHidden === null) {
				item.removeAttribute('aria-hidden');
			} else if (typeof item.pdkDockOriginalAriaHidden === 'string') {
				item.setAttribute('aria-hidden', item.pdkDockOriginalAriaHidden);
			}
			delete item.pdkDockOriginalAriaHidden;
		}

		function startDrag(event) {
			const itemRect = drag.item.getBoundingClientRect();
			const placeholder = createPlaceholder(drag.item);

			drag.dragging = true;
			drag.offsetX = event.clientX - itemRect.left;
			drag.offsetY = event.clientY - itemRect.top;
			drag.placeholder = placeholder;
			drag.item.pdkDockOriginalAriaHidden = drag.item.getAttribute('aria-hidden');
			drag.item.setAttribute('aria-hidden', 'true');
			drag.item.classList.remove('is-dock-reorder-pending');
			drag.item.classList.add('is-dock-reordering', 'pdk-dock-drag-proxy', 'is-tooltip-dismissed');
			drag.item.dataset.pdkDockReorderProxy = '1';
			drag.item.style.width = `${itemRect.width}px`;
			drag.item.style.height = `${itemRect.height}px`;
			drag.item.style.left = `${Math.round(itemRect.left)}px`;
			drag.item.style.top = `${Math.round(itemRect.top)}px`;
			drag.item.style.zIndex = 'var(--pdk-layer-context-menu)';
			dock.insertBefore(placeholder, drag.item);
			shell.appendChild(drag.item);
			dock.classList.add('is-reordering');
			shell.dataset.pdkDockReordering = '1';
			positionFloatingItem(event);

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
					|| item.dataset.pdkDockLongPressOpen === '1'
				)
			);
		}

		function endDrag(event, shouldSave = true) {
			if (!drag) {
				return;
			}

			const didDrag = drag.dragging;
			const item = drag.item;
			const placeholder = drag.placeholder || null;
			const commit = didDrag && shouldSave && placeholder;

			if (event && typeof item.releasePointerCapture === 'function') {
				try {
					item.releasePointerCapture(event.pointerId);
				} catch (error) {
					// Pointer capture may already be released by the browser.
				}
			}

			if (didDrag && !shouldSave && drag.originalOrder.length) {
				config.workspaceState = Object.assign({}, getWorkspaceState(config), {
					[workspaceSections.DOCK_APPS]: drag.originalOrder
				});
				if (placeholder) {
					dock.insertBefore(item, placeholder);
				} else {
					dock.insertBefore(item, getDockEndAnchor(dock) || null);
				}
				clearFloatingItemStyles(item);
				if (placeholder) {
					placeholder.remove();
				}
				applyOrderToDock(shell, config);
				dock.classList.remove('is-reordering');
				delete shell.dataset.pdkDockReordering;
				drag = null;
				return;
			}

			function finish() {
				const changed = commit && !arraysEqual(drag.originalOrder, getDockOrderFromDom(dock));

				if (shouldSave && changed) {
					saveDockOrder(config, sessionStore, getDockOrderFromDom(dock));
				}

				clearFloatingItemStyles(item);
				if (placeholder) {
					placeholder.remove();
				}
				dock.classList.remove('is-reordering');
				delete shell.dataset.pdkDockReordering;
				drag = null;
			}

			if (commit && event) {
				const placeholderRect = placeholder.getBoundingClientRect();

				item.style.transition = 'left 120ms cubic-bezier(0.22, 1, 0.36, 1), top 120ms cubic-bezier(0.22, 1, 0.36, 1), transform 120ms ease';
				item.style.left = `${Math.round(placeholderRect.left)}px`;
				item.style.top = `${Math.round(placeholderRect.top)}px`;
				item.style.transform = 'scale(1)';
				window.setTimeout(() => {
					dock.insertBefore(item, placeholder);
					finish();
				}, 120);
			} else if (placeholder) {
				dock.insertBefore(item, placeholder);
				finish();
			} else {
				finish();
			}

			if (didDrag) {
				item.dataset.pdkDockReorderSuppressClick = '1';
				window.setTimeout(() => {
					if (item.dataset.pdkDockReorderSuppressClick === '1') {
						delete item.dataset.pdkDockReorderSuppressClick;
					}
				}, 450);
			}

			if (event && didDrag) {
				event.preventDefault();
				event.stopPropagation();
			}
		}

		dock.addEventListener('pointerdown', (event) => {
			if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
				return;
			}

			const item = getDockAppItem(event.target, dock);
			if (!item || item.closest('.pdk-dock-minimized-windows')) {
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
			if (
				!drag
				|| event.pointerId !== drag.pointerId
				|| (drag.dragging ? !shell.contains(drag.item) : !dock.contains(drag.item))
			) {
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

			positionFloatingItem(event);
			movePlaceholder(getInsertBeforeItem(event));
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
			const item = event.target && typeof event.target.closest === 'function'
				? event.target.closest('.pdk-dock-item[data-pdk-open-app]')
				: null;

			if (
				!item
				|| (
					item.dataset.pdkDockReorderSuppressClick !== '1'
					&& item.dataset.pdkDockReorderProxy !== '1'
				)
			) {
				return;
			}

			delete item.dataset.pdkDockReorderSuppressClick;
			event.preventDefault();
			event.stopPropagation();
		}, true);

		window.addEventListener(domEventNames.WORKSPACE_STATE_CHANGED, (event) => {
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

	window.PufferDesk.desktopDock = {
		apply,
		applyOrderToDock,
		bindTooltipDismissal,
		bindReordering,
		defaults,
		getDockOrder,
		isFixedDockApp,
		normalize,
		normalizeDockOrder,
		orderApps,
		refreshFit: scheduleDockFit
	};
})();
