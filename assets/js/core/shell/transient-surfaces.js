(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.shell = window.PufferDesk.shell || {};

	const EVENT_NAME = 'shell:transientSurfaceOpened';

	function normalizeId(id) {
		return String(id || '').trim();
	}

	function getEvents() {
		return window.PufferDesk.events || null;
	}

	function announce(id, detail = {}) {
		const surfaceId = normalizeId(id);
		const events = getEvents();

		if (!surfaceId || !events || typeof events.emit !== 'function') {
			return null;
		}

		return events.emit(EVENT_NAME, Object.assign({}, detail, {
			id: surfaceId
		}));
	}

	function closeOnOther(id, close) {
		const surfaceId = normalizeId(id);
		const events = getEvents();

		if (!surfaceId || typeof close !== 'function' || !events || typeof events.on !== 'function') {
			return () => {};
		}

		return events.on(EVENT_NAME, (event) => {
			const detail = event && event.detail ? event.detail : {};

			if (normalizeId(detail.id) && normalizeId(detail.id) !== surfaceId) {
				close(detail);
			}
		});
	}

	window.PufferDesk.shell.transientSurfaces = Object.freeze({
		announce,
		closeOnOther,
		eventName: EVENT_NAME
	});
})();
