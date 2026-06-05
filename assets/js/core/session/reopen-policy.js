(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};
	window.AdminOSMode.session = window.AdminOSMode.session || {};

	window.AdminOSMode.session.createReopenPolicy = function createReopenPolicy(storageKey) {
		const keyBase = storageKey || 'admin-os-mode';
		const skipWindowRestoreKey = `${keyBase}:skip-window-restore-once`;

		function getSessionStorage() {
			try {
				return window.sessionStorage;
			} catch (error) {
				return null;
			}
		}

		function skipWindowRestoreOnce() {
			const storage = getSessionStorage();
			if (!storage) {
				return false;
			}

			storage.setItem(skipWindowRestoreKey, '1');
			return true;
		}

		function consumeSkipWindowRestoreOnce() {
			const storage = getSessionStorage();
			if (!storage || storage.getItem(skipWindowRestoreKey) !== '1') {
				return false;
			}

			storage.removeItem(skipWindowRestoreKey);
			return true;
		}

		return {
			consumeSkipWindowRestoreOnce,
			skipWindowRestoreOnce
		};
	};
})();
