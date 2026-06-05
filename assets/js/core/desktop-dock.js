(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};

	const defaults = {
		dock_size: 48,
		dock_magnification: 0,
		dock_position: 'bottom',
		minimize_animation: 'genie',
		titlebar_double_click: 'zoom',
		minimize_into_app_icon: false,
		auto_hide_dock: false,
		animate_opening_apps: true,
		show_open_indicators: true,
		show_recent_apps: false,
		show_desktop_items: true,
		show_stage_manager_items: false,
		wallpaper_click: 'always',
		stage_manager: false,
		stage_manager_recent_apps: true,
		stage_manager_windows: 'all_at_once',
		show_widgets_desktop: true,
		show_widgets_stage_manager: false,
		dim_widgets: 'automatic',
		default_browser: 'system',
		prefer_tabs: 'in_full_screen',
		ask_keep_changes: false,
		close_windows_on_quit: true,
		edge_tiling: false,
		menu_bar_fill_screen: false,
		tile_modifier_key: true,
		tiled_windows_margins: false,
		auto_rearrange_spaces: true,
		switch_to_app_space: true,
		group_windows_by_app: false,
		separate_spaces: true,
		top_edge_mission_control: true
	};

	const allowed = {
		dock_position: ['left', 'bottom', 'right'],
		minimize_animation: ['genie', 'scale'],
		titlebar_double_click: ['zoom', 'minimize', 'nothing'],
		wallpaper_click: ['always', 'only_stage_manager', 'never'],
		stage_manager_windows: ['all_at_once', 'one_at_a_time'],
		dim_widgets: ['automatic', 'always', 'never'],
		default_browser: ['system'],
		prefer_tabs: ['never', 'in_full_screen', 'always']
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
		const iconSize = Math.max(18, Math.round(current.dock_size * 0.56));
		const tileSize = Math.max(28, current.dock_size - 2);
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
		shell.dataset.aosDockShowRecent = current.show_recent_apps ? '1' : '0';
		shell.dataset.aosTitlebarDoubleClick = current.titlebar_double_click;
		shell.dataset.aosMinimizeAnimation = current.minimize_animation;
		shell.dataset.aosMinimizeIntoAppIcon = current.minimize_into_app_icon ? '1' : '0';
		shell.dataset.aosWallpaperClick = current.wallpaper_click;
		shell.dataset.aosStageManager = current.stage_manager ? '1' : '0';
		shell.dataset.aosShowDesktopItems = current.show_desktop_items ? '1' : '0';
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

	window.AdminOSMode.desktopDock = {
		apply,
		defaults,
		normalize
	};
})();
