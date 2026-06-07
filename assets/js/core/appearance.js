(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};

	const defaults = {
		mode: 'auto',
		window_material: 'clear',
		accent_color: 'multicolor',
		icon_widget_style: 'default'
	};

	const allowed = {
		mode: ['auto', 'light', 'dark'],
		window_material: ['clear', 'tinted'],
		accent_color: ['multicolor', 'blue', 'purple', 'pink', 'red', 'orange', 'yellow', 'green', 'graphite'],
		icon_widget_style: ['default', 'dark', 'clear', 'tinted']
	};

	function rgba(rgb, alpha) {
		return `rgba(${rgb.join(', ')}, ${alpha})`;
	}

	function defineAccent(color, rgb, options = {}) {
		const ink = options.ink || '#fff';

		return {
			color,
			hueShift: options.hueShift || '170deg',
			rgb: rgb.join(' '),
			ink,
			focus: rgba(rgb, options.focus || 0.34),
			highlight: rgba(rgb, options.highlight || 0.18),
			soft: rgba(rgb, options.soft || 0.16),
			medium: rgba(rgb, options.medium || 0.28),
			active: rgba(rgb, options.active || 0.82),
			activeStrong: `linear-gradient(180deg, ${rgba(rgb, options.activeTop || 0.92)}, ${rgba(rgb, options.activeBottom || 0.78)})`
		};
	}

	const accentColors = {
		multicolor: defineAccent('#2458ca', [36, 88, 202], {
			focus: 0.38,
			hueShift: '170deg',
			highlight: 0.2,
			soft: 0.16,
			medium: 0.28
		}),
		blue: defineAccent('#2458ca', [36, 88, 202], {
			focus: 0.38,
			hueShift: '170deg',
			highlight: 0.2
		}),
		purple: defineAccent('#9b3fb0', [155, 63, 176], {
			hueShift: '225deg'
		}),
		pink: defineAccent('#f0449a', [240, 68, 154], {
			hueShift: '285deg'
		}),
		red: defineAccent('#ed333b', [237, 51, 59], {
			hueShift: '320deg'
		}),
		orange: defineAccent('#ff7a16', [255, 122, 22], {
			hueShift: '340deg'
		}),
		yellow: defineAccent('#ffc226', [255, 194, 38], {
			hueShift: '0deg',
			highlight: 0.2,
			ink: '#2f2815'
		}),
		green: defineAccent('#58b947', [88, 185, 71], {
			hueShift: '80deg'
		}),
		graphite: defineAccent('#8e8e93', [142, 142, 147], {
			hueShift: '0deg'
		})
	};

	let currentAppearance = Object.assign({}, defaults);
	let systemModeQuery = null;
	let systemModeBound = false;

	function getAllowedValue(key, value) {
		const next = String(value || '');

		return allowed[key] && allowed[key].includes(next) ? next : defaults[key];
	}

	function normalize(appearance = {}) {
		return {
			mode: getAllowedValue('mode', appearance.mode),
			window_material: getAllowedValue('window_material', appearance.window_material),
			accent_color: getAllowedValue('accent_color', appearance.accent_color),
			icon_widget_style: getAllowedValue('icon_widget_style', appearance.icon_widget_style)
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
		shell.style.setProperty('--aos-accent-hue-shift', accent.hueShift);
		shell.style.setProperty('--aos-accent-rgb', accent.rgb);
		shell.style.setProperty('--aos-accent-ink', accent.ink);
		shell.style.setProperty('--aos-accent-soft', accent.soft);
		shell.style.setProperty('--aos-accent-medium', accent.medium);
		shell.style.setProperty('--aos-accent-active', accent.active);
		shell.style.setProperty('--aos-accent-active-strong', accent.activeStrong);
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
		shell.dataset.aosIconWidgetStyle = currentAppearance.icon_widget_style;
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
