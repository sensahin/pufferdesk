(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};

	const cssDefaults = {
		'--aos-wallpaper-image': 'none',
		'--aos-wallpaper-position': 'center center',
		'--aos-wallpaper-repeat': 'no-repeat',
		'--aos-wallpaper-size': 'cover'
	};

	function getPreference(wallpaper = {}) {
		if (wallpaper.preference && typeof wallpaper.preference === 'object') {
			return wallpaper.preference;
		}

		return wallpaper;
	}

	function getCurrent(wallpaper = {}) {
		if (wallpaper.current && typeof wallpaper.current === 'object') {
			return wallpaper.current;
		}

		return {};
	}

	function getCssVariables(wallpaper = {}) {
		if (wallpaper.css_variables && typeof wallpaper.css_variables === 'object') {
			return wallpaper.css_variables;
		}

		return {};
	}

	function apply(shell, wallpaper = {}) {
		if (!shell) {
			return wallpaper;
		}

		const cssVariables = Object.assign({}, cssDefaults, getCssVariables(wallpaper));
		Object.keys(cssDefaults).forEach((name) => {
			shell.style.setProperty(name, cssVariables[name] || cssDefaults[name]);
		});

		const preference = getPreference(wallpaper);
		const current = getCurrent(wallpaper);
		shell.dataset.aosWallpaperType = preference.type || current.type || '';
		shell.dataset.aosWallpaperId = preference.id || current.id || '';

		return wallpaper;
	}

	function getPreferenceKey(preference = {}) {
		if (preference.type === 'upload') {
			return `upload:${Number.parseInt(preference.attachment_id, 10) || 0}`;
		}

		return `${preference.type || ''}:${preference.id || ''}`;
	}

	window.AdminOSMode.wallpaper = {
		apply,
		getCurrent,
		getPreference,
		getPreferenceKey
	};
})();
