(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};

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

	function appendTrafficDots(container) {
		for (let index = 0; index < 3; index += 1) {
			container.appendChild(document.createElement('span'));
		}
	}

	function createIconButton(action, title, icon) {
		const button = document.createElement('button');
		button.type = 'button';
		button.dataset[action] = '';
		button.title = title;

		const dashicon = document.createElement('span');
		dashicon.className = `dashicons ${icon}`;
		button.appendChild(dashicon);

		return button;
	}

	function createDashicon(icon) {
		const dashicon = document.createElement('span');
		dashicon.className = `dashicons ${icon || 'dashicons-admin-generic'}`;
		dashicon.setAttribute('aria-hidden', 'true');

		return dashicon;
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

		return {
			type: 'dashicon',
			value: typeof icon === 'string' && icon ? icon : 'dashicons-admin-generic'
		};
	}

	function createIcon(icon) {
		const descriptor = normalizeIcon(icon);

		if (descriptor.type === 'image') {
			const image = document.createElement('img');
			image.className = 'aos-icon-image';
			image.src = descriptor.url;
			image.alt = descriptor.alt;
			image.setAttribute('aria-hidden', 'true');
			image.loading = 'lazy';
			image.decoding = 'async';

			return image;
		}

		return createDashicon(descriptor.value);
	}

	window.AdminOSMode.dom = {
		appendTrafficDots,
		createDashicon,
		createElement,
		createIcon,
		createIconButton,
		escapeAttribute
	};
})();
