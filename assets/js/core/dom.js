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

	function normalizeLabelText(text) {
		return String(text || '').replace(/\s+/g, ' ').trim();
	}

	function clampPositiveInteger(value, fallback) {
		const number = Number.parseInt(value, 10);

		return Number.isFinite(number) && number > 0 ? number : fallback;
	}

	function middleTruncateText(text, maxLength) {
		const value = normalizeLabelText(text);
		const limit = clampPositiveInteger(maxLength, 18);
		const marker = '...';
		if (value.length <= limit) {
			return value;
		}

		if (limit <= marker.length + 2) {
			return `${value.slice(0, Math.max(1, limit - marker.length))}${marker}`;
		}

		const available = limit - marker.length;
		const headLength = Math.max(3, Math.ceil(available * 0.52));
		const tailLength = Math.max(3, available - headLength);
		const adjustedHeadLength = Math.max(1, available - tailLength);
		const head = value.slice(0, adjustedHeadLength).trimEnd();
		const tail = value.slice(-tailLength).trimStart();

		return `${head}${marker}${tail}`;
	}

	function splitMiddleTruncatedLabel(text, options = {}) {
		const value = normalizeLabelText(text);
		const firstLineMax = Math.min(15, clampPositiveInteger(options.firstLineMax, 15));
		const secondLineMax = clampPositiveInteger(options.secondLineMax, 14);
		const breakIndex = Math.min(value.length, firstLineMax);
		const firstLine = value.slice(0, breakIndex).trimEnd();
		const secondLine = value.slice(breakIndex).trimStart();

		if (!value) {
			return [''];
		}

		if (!secondLine) {
			return [firstLine || value];
		}

		return [
			firstLine || value.slice(0, firstLineMax).trim(),
			middleTruncateText(secondLine, secondLineMax)
		];
	}

	function createLabelLine(text, index) {
		const line = document.createElement('span');
		line.className = `pdk-truncated-label-line pdk-truncated-label-line-${index + 1}`;
		line.setAttribute('aria-hidden', 'true');
		line.textContent = text;

		return line;
	}

	function getFullLabel(element) {
		if (!element) {
			return '';
		}

		return normalizeLabelText(element.dataset && element.dataset.pdkLabelFull
			? element.dataset.pdkLabelFull
			: element.textContent);
	}

	function setTruncatedLabelText(element, text, options = {}) {
		if (!element) {
			return null;
		}

		const value = normalizeLabelText(text);
		const lines = splitMiddleTruncatedLabel(value, options).slice(0, 2);

		element.classList.add('pdk-truncated-label');
		element.dataset.pdkLabelFull = value;
		element.title = value;
		element.replaceChildren(...lines.map(createLabelLine));

		return element;
	}

	function createTruncatedLabel(className, text, options = {}) {
		return setTruncatedLabelText(createElement('span', className), text, options);
	}

	function setEditableLabelText(element, text) {
		if (!element) {
			return null;
		}

		element.textContent = normalizeLabelText(text);
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
		createTruncatedLabel,
		createIcon,
		escapeAttribute,
		getDefaultDashicon,
		getFullLabel,
		setEditableLabelText,
		setTruncatedLabelText
	};
})();
