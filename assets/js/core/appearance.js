(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};

	const defaults = {
		mode: 'light',
		window_material: 'clear',
		accent_color: 'multicolor',
		highlight_color: 'automatic',
		icon_widget_style: 'default',
		folder_color: 'automatic',
		tint_windows: true
	};

	const allowed = {
		mode: ['auto', 'light', 'dark'],
		window_material: ['clear', 'tinted'],
		accent_color: ['multicolor', 'blue', 'purple', 'pink', 'red', 'orange', 'yellow', 'green', 'graphite'],
		highlight_color: ['automatic'],
		icon_widget_style: ['default', 'dark', 'clear', 'tinted'],
		folder_color: ['automatic']
	};

	const accentColors = {
		multicolor: {
			color: '#0a84ff',
			focus: 'rgba(10, 132, 255, 0.38)',
			highlight: 'rgba(10, 132, 255, 0.2)'
		},
		blue: {
			color: '#0a84ff',
			focus: 'rgba(10, 132, 255, 0.38)',
			highlight: 'rgba(10, 132, 255, 0.2)'
		},
		purple: {
			color: '#9b3fb0',
			focus: 'rgba(155, 63, 176, 0.34)',
			highlight: 'rgba(155, 63, 176, 0.18)'
		},
		pink: {
			color: '#f0449a',
			focus: 'rgba(240, 68, 154, 0.34)',
			highlight: 'rgba(240, 68, 154, 0.18)'
		},
		red: {
			color: '#ed333b',
			focus: 'rgba(237, 51, 59, 0.34)',
			highlight: 'rgba(237, 51, 59, 0.18)'
		},
		orange: {
			color: '#ff7a16',
			focus: 'rgba(255, 122, 22, 0.34)',
			highlight: 'rgba(255, 122, 22, 0.18)'
		},
		yellow: {
			color: '#ffc226',
			focus: 'rgba(255, 194, 38, 0.34)',
			highlight: 'rgba(255, 194, 38, 0.2)'
		},
		green: {
			color: '#58b947',
			focus: 'rgba(88, 185, 71, 0.34)',
			highlight: 'rgba(88, 185, 71, 0.18)'
		},
		graphite: {
			color: '#8e8e93',
			focus: 'rgba(142, 142, 147, 0.34)',
			highlight: 'rgba(142, 142, 147, 0.18)'
		}
	};

	let currentAppearance = Object.assign({}, defaults);
	let systemModeQuery = null;
	let systemModeBound = false;

	function getAllowedValue(key, value) {
		const next = String(value || '');

		return allowed[key] && allowed[key].includes(next) ? next : defaults[key];
	}

	function normalizeBoolean(value) {
		if (typeof value === 'boolean') {
			return value;
		}

		if (typeof value === 'number') {
			return value === 1;
		}

		return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
	}

	function normalize(appearance = {}) {
		return {
			mode: getAllowedValue('mode', appearance.mode),
			window_material: getAllowedValue('window_material', appearance.window_material),
			accent_color: getAllowedValue('accent_color', appearance.accent_color),
			highlight_color: getAllowedValue('highlight_color', appearance.highlight_color),
			icon_widget_style: getAllowedValue('icon_widget_style', appearance.icon_widget_style),
			folder_color: getAllowedValue('folder_color', appearance.folder_color),
			tint_windows: Object.prototype.hasOwnProperty.call(appearance, 'tint_windows')
				? normalizeBoolean(appearance.tint_windows)
				: defaults.tint_windows
		};
	}

	function getEffectiveMode(appearance) {
		if (appearance.mode !== 'auto') {
			return appearance.mode;
		}

		if (!systemModeQuery && typeof window.matchMedia === 'function') {
			systemModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
		}

		return systemModeQuery && systemModeQuery.matches ? 'dark' : 'light';
	}

	function applyAccent(shell, accentColor) {
		const accent = accentColors[accentColor] || accentColors.multicolor;

		shell.style.setProperty('--aos-accent', accent.color);
		shell.style.setProperty('--aos-focus-ring', accent.focus);
		shell.style.setProperty('--aos-highlight', accent.highlight);
	}

	function apply(shell, appearance = {}) {
		if (!shell) {
			return normalize(appearance);
		}

		currentAppearance = normalize(appearance);
		shell.dataset.aosAppearanceMode = currentAppearance.mode;
		shell.dataset.aosEffectiveAppearance = getEffectiveMode(currentAppearance);
		shell.dataset.aosWindowMaterial = currentAppearance.window_material;
		shell.dataset.aosAccentColor = currentAppearance.accent_color;
		shell.dataset.aosHighlightColor = currentAppearance.highlight_color;
		shell.dataset.aosIconWidgetStyle = currentAppearance.icon_widget_style;
		shell.dataset.aosFolderColor = currentAppearance.folder_color;
		shell.dataset.aosTintWindows = currentAppearance.tint_windows ? '1' : '0';
		applyAccent(shell, currentAppearance.accent_color);

		return currentAppearance;
	}

	function bindSystemMode(shell) {
		if (systemModeBound || typeof window.matchMedia !== 'function') {
			return;
		}

		systemModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const refresh = () => {
			if (currentAppearance.mode === 'auto') {
				apply(shell, currentAppearance);
			}
		};

		if (typeof systemModeQuery.addEventListener === 'function') {
			systemModeQuery.addEventListener('change', refresh);
		} else if (typeof systemModeQuery.addListener === 'function') {
			systemModeQuery.addListener(refresh);
		}

		systemModeBound = true;
	}

	window.AdminOSMode.appearance = {
		accentColors,
		apply,
		bindSystemMode,
		defaults,
		normalize
	};
})();
