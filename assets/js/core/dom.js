(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};

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
		dashicon.className = `dashicons ${icon || 'dashicons-admin-generic'}`;
		dashicon.setAttribute('aria-hidden', 'true');

		return dashicon;
	}

	function getDashiconValue(value) {
		return typeof value === 'string' && value ? value : 'dashicons-admin-generic';
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
		if (icon && typeof icon === 'object' && icon.type === 'image' && icon.url) {
			return {
				type: 'image',
				url: icon.url,
				alt: icon.alt || ''
			};
		}

		if (icon && typeof icon === 'object' && icon.type === 'dashicon') {
			return {
				type: 'dashicon',
				value: icon.value || icon.dashicon || 'dashicons-admin-generic'
			};
		}

		if (icon && typeof icon === 'object' && icon.type === 'theme') {
			const name = normalizeIconName(icon.name);
			const fallback = getDashiconValue(icon.fallback);
			const iconPackUrl = getThemeIconPackUrl();

			if (name && iconPackUrl) {
				return {
					type: 'image',
					url: `${trailingslash(iconPackUrl)}${encodeURIComponent(name)}`,
					alt: icon.alt || '',
					fallback
				};
			}

			return {
				type: 'dashicon',
				value: fallback
			};
		}

		return {
			type: 'dashicon',
			value: typeof icon === 'string' && icon ? icon : 'dashicons-admin-generic'
		};
	}

	function createIcon(icon) {
		const descriptor = normalizeIcon(icon);

		if (descriptor.type === 'image') {
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
		escapeAttribute
	};
})();
