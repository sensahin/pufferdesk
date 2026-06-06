(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};

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

		normalized.dock_size = normalizeRange(preferences.dock_size, 36, 72, defaults.dock_size);
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
		const tileSize = Math.max(30, Math.round(current.dock_size * 0.82));
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
		shell.dispatchEvent(new window.CustomEvent('adminOSMode:desktop-dock-change', {
			detail: current
		}));

		return current;
	}

	function getDockItem(target) {
		return target && typeof target.closest === 'function'
			? target.closest('.aos-dock-item, .aos-dock-window-item')
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

	window.AdminOSMode.desktopDock = {
		apply,
		bindTooltipDismissal,
		defaults,
		normalize
	};
})();
