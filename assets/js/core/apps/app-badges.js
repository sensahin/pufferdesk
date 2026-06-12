(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};

	const defaultTones = ['attention', 'neutral', 'update'];

	function getAllowedTones() {
		const config = window.PufferDesk.config;

		return config && typeof config.getContractList === 'function'
			? config.getContractList('appBadgeTones', defaultTones)
			: defaultTones;
	}

	function getBadge(source) {
		if (source && source.badge && typeof source.badge === 'object') {
			return source.badge;
		}

		return source && typeof source === 'object' ? source : null;
	}

	function normalize(source) {
		const badge = getBadge(source);
		if (!badge) {
			return null;
		}

		const text = typeof badge.text === 'string' || typeof badge.text === 'number'
			? String(badge.text).trim()
			: '';
		if (!text || text === '0') {
			return null;
		}

		const tone = typeof badge.tone === 'string' && getAllowedTones().includes(badge.tone)
			? badge.tone
			: 'attention';

		return {
			ariaLabel: typeof badge.ariaLabel === 'string'
				? badge.ariaLabel.trim()
				: (typeof badge.aria_label === 'string' ? badge.aria_label.trim() : ''),
			text,
			tone
		};
	}

	function formatLabel(key, fallback, values = []) {
		if (window.PufferDesk.config && typeof window.PufferDesk.config.formatLabel === 'function') {
			return window.PufferDesk.config.formatLabel(key, fallback, values);
		}

		let valueIndex = 0;
		return String(fallback || '').replace(/%(\d+)\$[sd]/g, (match, position) => {
			const index = Number(position) - 1;
			return String(values[index] ?? '');
		}).replace(/%d|%s/g, () => String(values[valueIndex++] ?? ''));
	}

	function getAriaLabel(label, source) {
		const badge = normalize(source);
		const appLabel = label || '';

		return badge && badge.ariaLabel
			? formatLabel('app_badge_aria_label_format', '', [appLabel, badge.ariaLabel])
			: appLabel;
	}

	function createElement(source) {
		const dom = window.PufferDesk.dom || null;
		const badge = normalize(source);
		if (!badge) {
			return null;
		}

		const element = dom && typeof dom.createElement === 'function'
			? dom.createElement('span', `pdk-app-badge pdk-app-badge-${badge.tone}`, badge.text)
			: document.createElement('span');

		if (!dom || typeof dom.createElement !== 'function') {
			element.className = `pdk-app-badge pdk-app-badge-${badge.tone}`;
			element.textContent = badge.text;
		}
		element.setAttribute('aria-hidden', 'true');

		return element;
	}

	window.PufferDesk.apps.badges = Object.assign(window.PufferDesk.apps.badges || {}, {
		createElement,
		getAriaLabel,
		normalize
	});
})();
