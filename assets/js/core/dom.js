(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	const runtimeConfig = window.PufferDesk.config && typeof window.PufferDesk.config.get === 'function'
		? window.PufferDesk.config.get()
		: (window.pufferDesk || {});
	const contracts = runtimeConfig.contracts && typeof runtimeConfig.contracts === 'object' ? runtimeConfig.contracts : {};
	const iconContract = contracts.icons && typeof contracts.icons === 'object' ? contracts.icons : {};
	const iconTypes = iconContract.types && typeof iconContract.types === 'object' ? iconContract.types : {};
	const defaultDashicon = typeof iconContract.defaultDashicon === 'string' && iconContract.defaultDashicon ? iconContract.defaultDashicon : 'dashicons-admin-generic';

	function escapeAttribute(value) {
		if (window.CSS && typeof window.CSS.escape === 'function') {
			return window.CSS.escape(String(value));
		}

		return String(value).replace(/"/g, '\\"');
	}

	function createElement(tagName, className, text) {
		const element = document.createElement(tagName);
		if (className) {
			element.className = className;
		}
		if (typeof text === 'string') {
			element.textContent = text;
		}

		return element;
	}

	function createDashicon(icon) {
		const dashicon = document.createElement('span');
		dashicon.className = `dashicons ${icon || defaultDashicon}`;
		dashicon.setAttribute('aria-hidden', 'true');

		return dashicon;
	}

	function getDashiconValue(value) {
		return typeof value === 'string' && value ? value : defaultDashicon;
	}

	function getDefaultDashicon() {
		return defaultDashicon;
	}

	function getThemeIconPackUrl() {
		const config = window.PufferDesk.config ? window.PufferDesk.config.get() : (window.pufferDesk || {});
		const iconPack = config.theme && config.theme.media && config.theme.media.icon_pack ? config.theme.media.icon_pack : null;
		return iconPack && iconPack.url ? String(iconPack.url) : '';
	}

	function normalizeIconName(name) {
		const value = typeof name === 'string' ? name.trim() : '';
		if (!/^[a-zA-Z0-9._-]+\.(svg|png|webp|jpe?g|gif)$/i.test(value)) {
			return '';
		}

		return value;
	}

	function trailingslash(value) {
		return value.endsWith('/') ? value : `${value}/`;
	}

	function normalizeIcon(icon) {
		if (icon && typeof icon === 'object' && icon.type === (iconTypes.IMAGE || 'image') && icon.url) {
			return {
				type: iconTypes.IMAGE || 'image',
				url: icon.url,
				alt: icon.alt || ''
			};
		}

		if (icon && typeof icon === 'object' && icon.type === (iconTypes.DASHICON || 'dashicon')) {
			return {
				type: iconTypes.DASHICON || 'dashicon',
				value: icon.value || icon.dashicon || defaultDashicon
			};
		}

		if (icon && typeof icon === 'object' && icon.type === (iconTypes.THEME || 'theme')) {
			const name = normalizeIconName(icon.name);
			const fallback = getDashiconValue(icon.fallback);
			const iconPackUrl = getThemeIconPackUrl();

			if (name && iconPackUrl) {
				return {
					type: iconTypes.IMAGE || 'image',
					url: `${trailingslash(iconPackUrl)}${encodeURIComponent(name)}`,
					alt: icon.alt || '',
					fallback
				};
			}

			return {
				type: iconTypes.DASHICON || 'dashicon',
				value: fallback
			};
		}

		return {
			type: iconTypes.DASHICON || 'dashicon',
			value: typeof icon === 'string' && icon ? icon : defaultDashicon
		};
	}

	function createIcon(icon) {
		const descriptor = normalizeIcon(icon);

		if (descriptor.type === (iconTypes.IMAGE || 'image')) {
			const image = document.createElement('img');
			image.className = 'pdk-icon-image';
			image.src = descriptor.url;
			image.alt = descriptor.alt;
			image.setAttribute('aria-hidden', 'true');
			image.loading = 'lazy';
			image.decoding = 'async';
			if (descriptor.fallback) {
				image.addEventListener(
					'error',
					() => {
						image.replaceWith(createDashicon(descriptor.fallback));
					},
					{ once: true }
				);
			}

			return image;
		}

		return createDashicon(descriptor.value);
	}

	window.PufferDesk.dom = {
		createDashicon,
		createElement,
		createIcon,
		escapeAttribute,
		getDefaultDashicon
	};
})();
