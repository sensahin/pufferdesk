(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};
	window.AdminOSMode.windows = window.AdminOSMode.windows || {};

	window.AdminOSMode.windows.createSessionStore = function createSessionStore(storageKey) {
		const storage = window.AdminOSMode.services.storage;

		return {
			load() {
				return storage.getJSON(storageKey);
			},

			save(session) {
				return storage.setJSON(storageKey, session);
			},

			clear() {
				storage.remove(storageKey);
			}
		};
	};
})();
