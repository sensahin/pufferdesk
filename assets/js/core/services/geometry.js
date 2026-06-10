(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.services = window.PufferDesk.services || {};

	function readNumber(value, fallback = null) {
		const parsed = Number.parseFloat(value);

		return Number.isFinite(parsed) ? parsed : fallback;
	}

	function clamp(value, min, max) {
		return Math.min(Math.max(min, value), Math.max(min, max));
	}

	function resolveCssPixelValue(element, value, fallback) {
		const probe = document.createElement('div');
		let parsed = fallback;

		probe.style.cssText = 'contain:strict;height:0;left:-9999px;overflow:hidden;position:absolute;top:-9999px;visibility:hidden;';
		probe.style.width = value;
		if (!probe.style.width) {
			return fallback;
		}

		element.appendChild(probe);
		parsed = readNumber(window.getComputedStyle(probe).width, fallback);
		probe.remove();

		return parsed;
	}

	function readCssPixel(element, propertyName, fallback = 0) {
		if (!element || !propertyName || !window.getComputedStyle) {
			return fallback;
		}

		const raw = window.getComputedStyle(element).getPropertyValue(propertyName).trim();
		const parsed = readNumber(raw, Number.NaN);

		if (Number.isFinite(parsed)) {
			return parsed;
		}

		if (!raw || typeof document === 'undefined' || !document.createElement || typeof element.appendChild !== 'function') {
			return fallback;
		}

		return resolveCssPixelValue(element, raw, fallback);
	}

	window.PufferDesk.geometry = Object.assign(window.PufferDesk.geometry || {}, {
		clamp,
		readCssPixel,
		readNumber
	});
	window.PufferDesk.services.geometry = window.PufferDesk.geometry;
})();
