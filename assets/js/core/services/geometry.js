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

	function readCssPixel(element, propertyName, fallback = 0) {
		if (!element || !propertyName || !window.getComputedStyle) {
			return fallback;
		}

		return readNumber(window.getComputedStyle(element).getPropertyValue(propertyName), fallback);
	}

	window.PufferDesk.geometry = Object.assign(window.PufferDesk.geometry || {}, {
		clamp,
		readCssPixel,
		readNumber
	});
	window.PufferDesk.services.geometry = window.PufferDesk.geometry;
})();
