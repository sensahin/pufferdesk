(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};
	window.AdminOSMode.session = window.AdminOSMode.session || {};

	window.AdminOSMode.session.createSessionStore = function createSessionStore(storageKey) {
		const storage = window.AdminOSMode.services.storage;

		function isObject(value) {
			return value && typeof value === 'object' && !Array.isArray(value);
		}

		function normalizeSession(session) {
			if (!isObject(session)) {
				return {
					version: 2,
					updatedAt: Date.now(),
					windows: [],
					widgets: []
				};
			}

			return Object.assign({
				version: 2,
				updatedAt: Date.now(),
				windows: [],
				widgets: []
			}, session, {
				version: 2,
				windows: Array.isArray(session.windows) ? session.windows : [],
				widgets: Array.isArray(session.widgets) ? session.widgets : []
			});
		}

		return {
			load() {
				return normalizeSession(storage.getJSON(storageKey));
			},

			save(session) {
				const next = normalizeSession(session);
				next.updatedAt = Date.now();

				return storage.setJSON(storageKey, next);
			},

			getSection(section, fallback) {
				const session = this.load();
				return Object.prototype.hasOwnProperty.call(session, section) ? session[section] : fallback;
			},

			saveSection(section, value) {
				const session = this.load();
				session[section] = value;
				session.updatedAt = Date.now();

				return storage.setJSON(storageKey, session);
			},

			clear() {
				storage.remove(storageKey);
			}
		};
	};

	window.AdminOSMode.windows = window.AdminOSMode.windows || {};
	window.AdminOSMode.windows.createSessionStore = window.AdminOSMode.session.createSessionStore;
})();
