(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};

	const renderers = new Map();

	function normalizeNativeId(nativeId) {
		return String(nativeId || '').trim();
	}

	window.PufferDesk.apps.registerNativeAppRenderer = function registerNativeAppRenderer(nativeId, renderer) {
		const id = normalizeNativeId(nativeId);

		if (!id || typeof renderer !== 'function') {
			return false;
		}

		renderers.set(id, renderer);
		return true;
	};

	window.PufferDesk.apps.hasNativeAppRenderer = function hasNativeAppRenderer(nativeId) {
		return renderers.has(normalizeNativeId(nativeId));
	};

	window.PufferDesk.apps.getNativeAppWindowOptions = function getNativeAppWindowOptions(nativeId, context = {}, extraContext = {}) {
		const renderer = renderers.get(normalizeNativeId(nativeId));
		const mergedContext = Object.assign({}, context && typeof context === 'object' ? context : {}, extraContext && typeof extraContext === 'object' ? extraContext : {});
		const options = renderer ? renderer(mergedContext) : null;

		return options && typeof options === 'object' ? options : null;
	};
})();
