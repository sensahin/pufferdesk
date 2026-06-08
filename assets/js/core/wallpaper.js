(function () {
	'use strict';

	window.WPAdminOS = window.WPAdminOS || {};

	const cssDefaults = {
		'--aos-wallpaper-image': 'none',
		'--aos-wallpaper-position': 'center center',
		'--aos-wallpaper-repeat': 'no-repeat',
		'--aos-wallpaper-size': 'cover'
	};
	const menuContrastCachePrefix = 'wpAdminOS:wallpaper-menu-contrast:';

	function sanitizeContrast(value) {
		return value === 'dark' || value === 'light' || value === 'auto' ? value : '';
	}

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

	function getMenuContrast(wallpaper = {}) {
		const current = getCurrent(wallpaper);
		const preference = getPreference(wallpaper);

		return sanitizeContrast(wallpaper.menu_contrast)
			|| sanitizeContrast(current.menu_contrast)
			|| sanitizeContrast(preference.menu_contrast)
			|| 'auto';
	}

	function setMenuContrast(shell, contrast) {
		const next = sanitizeContrast(contrast) || 'auto';
		shell.dataset.aosMenuContrast = next;
	}

	function getCacheKey(wallpaper = {}) {
		const current = getCurrent(wallpaper);

		return `${menuContrastCachePrefix}${getPreferenceKey(getPreference(wallpaper))}:${current.url || ''}`;
	}

	function getCachedMenuContrast(key) {
		try {
			return sanitizeContrast(window.localStorage.getItem(key));
		} catch (error) {
			return '';
		}
	}

	function setCachedMenuContrast(key, contrast) {
		try {
			window.localStorage.setItem(key, contrast);
		} catch (error) {
			// localStorage can be unavailable in hardened browsers.
		}
	}

	function getRelativeLuminance(red, green, blue) {
		return [red, green, blue]
			.map((channel) => {
				const value = Math.max(0, Math.min(255, channel)) / 255;

				return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
			})
			.reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0);
	}

	function getRgbHue(red, green, blue) {
		const channels = [red, green, blue].map((channel) => Math.max(0, Math.min(255, channel)) / 255);
		const max = Math.max(...channels);
		const min = Math.min(...channels);
		const delta = max - min;

		if (delta <= 0) {
			return 0;
		}

		let hue = 0;
		if (max === channels[0]) {
			hue = ((channels[1] - channels[2]) / delta) % 6;
		} else if (max === channels[1]) {
			hue = ((channels[2] - channels[0]) / delta) + 2;
		} else {
			hue = ((channels[0] - channels[1]) / delta) + 4;
		}

		hue *= 60;

		return hue < 0 ? hue + 360 : hue;
	}

	function getRgbMenuContrast(red, green, blue) {
		const brightness = (red * 0.299) + (green * 0.587) + (blue * 0.114);
		const luminance = getRelativeLuminance(red, green, blue);
		const hue = getRgbHue(red, green, blue);

		if (brightness < 108 || luminance < 0.16) {
			const isWarmOrMagenta = luminance >= 0.18 && (hue <= 35 || hue >= 285);

			return isWarmOrMagenta ? 'dark' : 'light';
		}

		return 'dark';
	}

	function sampleImageMenuContrast(url, done) {
		const image = new Image();
		image.onload = () => {
			try {
				const width = 32;
				const height = 18;
				const canvas = document.createElement('canvas');
				const context = canvas.getContext('2d');
				const imageRatio = image.naturalWidth / image.naturalHeight;
				const canvasRatio = width / height;
				let sourceWidth = image.naturalWidth;
				let sourceHeight = image.naturalHeight;
				let sourceX = 0;
				let sourceY = 0;

				if (!context || !image.naturalWidth || !image.naturalHeight) {
					return;
				}

				canvas.width = width;
				canvas.height = height;

				if (imageRatio > canvasRatio) {
					sourceWidth = image.naturalHeight * canvasRatio;
					sourceX = (image.naturalWidth - sourceWidth) / 2;
				} else {
					sourceHeight = image.naturalWidth / canvasRatio;
					sourceY = (image.naturalHeight - sourceHeight) / 2;
				}

				context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);

				const sampleHeight = 3;
				const data = context.getImageData(0, 0, width, sampleHeight).data;
				let red = 0;
				let green = 0;
				let blue = 0;
				let count = 0;

				for (let index = 0; index < data.length; index += 4) {
					const alpha = data[index + 3] / 255;
					if (alpha < 0.05) {
						continue;
					}

					red += data[index] * alpha;
					green += data[index + 1] * alpha;
					blue += data[index + 2] * alpha;
					count += alpha;
				}

				if (count > 0) {
					done(getRgbMenuContrast(red / count, green / count, blue / count));
				}
			} catch (error) {
				// Canvas can be unavailable for cross-origin images; keep existing contrast.
			}
		};
		image.src = url;
	}

	function resolveAutoMenuContrast(shell, wallpaper = {}) {
		const current = getCurrent(wallpaper);
		if (!current.url) {
			return;
		}

		const key = getCacheKey(wallpaper);
		const cached = getCachedMenuContrast(key);
		if (cached) {
			setMenuContrast(shell, cached);
		}

		sampleImageMenuContrast(current.url, (contrast) => {
			setMenuContrast(shell, contrast);
			setCachedMenuContrast(key, contrast);
		});
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
		const menuContrast = getMenuContrast(wallpaper);
		shell.dataset.aosWallpaperType = preference.type || current.type || '';
		shell.dataset.aosWallpaperId = preference.id || current.id || '';
		setMenuContrast(shell, menuContrast);
		if (menuContrast === 'auto') {
			resolveAutoMenuContrast(shell, wallpaper);
		}

		return wallpaper;
	}

	function getPreferenceKey(preference = {}) {
		if (preference.type === 'upload') {
			return `upload:${Number.parseInt(preference.attachment_id, 10) || 0}`;
		}

		return `${preference.type || ''}:${preference.id || ''}`;
	}

	window.WPAdminOS.wallpaper = {
		apply,
		getCurrent,
		getPreference,
		getPreferenceKey
	};
})();
