(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};

	const defaults = window.PufferDesk.config.getSettingDefault('appearance') || {};
	const allowed = window.PufferDesk.config.getSettingOptions('appearance') || {};

	function defineAccent(color, rgb, options = {}) {
		const ink = options.ink || '#fff';
		const rgbValue = rgb.join(' ');

		return {
			activeAlpha: options.active || 0.82,
			activeBottomAlpha: options.activeBottom || 0.78,
			activeTopAlpha: options.activeTop || 0.92,
			color,
			focusAlpha: options.focus || 0.34,
			focusRgb: options.focusRgb ? options.focusRgb.join(' ') : rgbValue,
			highlightAlpha: options.highlight || 0.18,
			hueShift: options.hueShift || '170deg',
			ink,
			mediumAlpha: options.medium || 0.28,
			rgb: rgbValue,
			softAlpha: options.soft || 0.16
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

		shell.style.setProperty('--pdk-accent', accent.color);
		shell.style.setProperty('--pdk-accent-hue-shift', accent.hueShift);
		shell.style.setProperty('--pdk-accent-rgb', accent.rgb);
		shell.style.setProperty('--pdk-accent-ink', accent.ink);
		shell.style.setProperty('--pdk-accent-soft-alpha', String(accent.softAlpha));
		shell.style.setProperty('--pdk-accent-medium-alpha', String(accent.mediumAlpha));
		shell.style.setProperty('--pdk-accent-active-alpha', String(accent.activeAlpha));
		shell.style.setProperty('--pdk-accent-active-strong-start-alpha', String(accent.activeTopAlpha));
		shell.style.setProperty('--pdk-accent-active-strong-end-alpha', String(accent.activeBottomAlpha));
		shell.style.setProperty('--pdk-focus-ring-rgb', accent.focusRgb);
		shell.style.setProperty('--pdk-focus-ring-alpha', String(accent.focusAlpha));
		shell.style.setProperty('--pdk-highlight-alpha', String(accent.highlightAlpha));
	}

	function apply(shell, appearance = {}) {
		if (!shell) {
			return normalize(appearance);
		}

		currentAppearance = normalize(appearance);
		shell.dataset.pdkAppearanceMode = currentAppearance.mode;
		shell.dataset.pdkEffectiveAppearance = getEffectiveMode(currentAppearance);
		shell.dataset.pdkWindowMaterial = currentAppearance.window_material;
		shell.dataset.pdkAccentColor = currentAppearance.accent_color;
		shell.dataset.pdkIconWidgetStyle = currentAppearance.icon_widget_style;
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

	window.PufferDesk.appearance = {
		accentColors,
		apply,
		bindSystemMode,
		defaults,
		normalize
	};
})();
