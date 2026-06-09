(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};

	const target = new EventTarget();

	function normalizeName(name) {
		return String(name || '').trim();
	}

	function normalizeHandler(handler) {
		return typeof handler === 'function' ? handler : null;
	}

	function on(name, handler, options = {}) {
		const eventName = normalizeName(name);
		const listener = normalizeHandler(handler);

		if (!eventName || !listener) {
			return () => {};
		}

		target.addEventListener(eventName, listener, options);

		return () => off(eventName, listener, options);
	}

	function once(name, handler, options = {}) {
		return on(name, handler, Object.assign({}, options, {
			once: true
		}));
	}

	function off(name, handler, options = {}) {
		const eventName = normalizeName(name);
		const listener = normalizeHandler(handler);

		if (!eventName || !listener) {
			return;
		}

		target.removeEventListener(eventName, listener, options);
	}

	function emit(name, detail = {}, options = {}) {
		const eventName = normalizeName(name);

		if (!eventName) {
			return null;
		}

		const event = new CustomEvent(eventName, {
			cancelable: Boolean(options.cancelable),
			detail: detail && typeof detail === 'object' ? detail : {}
		});

		target.dispatchEvent(event);

		return event;
	}

	function createScopedBus(scope) {
		const prefix = normalizeName(scope);

		function scopedName(name) {
			const eventName = normalizeName(name);
			return prefix && eventName ? `${prefix}:${eventName}` : eventName;
		}

		return {
			emit(name, detail = {}, options = {}) {
				return emit(scopedName(name), detail, options);
			},
			off(name, handler, options = {}) {
				return off(scopedName(name), handler, options);
			},
			on(name, handler, options = {}) {
				return on(scopedName(name), handler, options);
			},
			once(name, handler, options = {}) {
				return once(scopedName(name), handler, options);
			}
		};
	}

	window.PufferDesk.events = Object.assign(window.PufferDesk.events || {}, {
		createScopedBus,
		emit,
		off,
		on,
		once,
		target
	});
})();
