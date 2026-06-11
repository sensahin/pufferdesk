(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.shell = window.PufferDesk.shell || {};

	function normalizeId(id) {
		return String(id || '').trim();
	}

	function getEventName() {
		const names = window.PufferDesk.events && window.PufferDesk.events.names;

		return names && names.SHELL_TRANSIENT_SURFACE_OPENED
			? names.SHELL_TRANSIENT_SURFACE_OPENED
			: '';
	}

	function getEvents() {
		return window.PufferDesk.events || null;
	}

	function announce(id, detail = {}) {
		const surfaceId = normalizeId(id);
		const events = getEvents();
		const eventName = getEventName();

		if (!surfaceId || !eventName || !events || typeof events.emit !== 'function') {
			return null;
		}

		return events.emit(eventName, Object.assign({}, detail, {
			id: surfaceId
		}));
	}

	function closeOnOther(id, close) {
		const surfaceId = normalizeId(id);
		const events = getEvents();
		const eventName = getEventName();

		if (!surfaceId || !eventName || typeof close !== 'function' || !events || typeof events.on !== 'function') {
			return () => {};
		}

		return events.on(eventName, (event) => {
			const detail = event && event.detail ? event.detail : {};

			if (normalizeId(detail.id) && normalizeId(detail.id) !== surfaceId) {
				close(detail);
			}
		});
	}

	window.PufferDesk.shell.transientSurfaces = Object.freeze({
		announce,
		closeOnOther,
		eventName: getEventName()
	});
})();
