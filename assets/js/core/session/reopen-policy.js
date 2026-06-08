(function () {
	'use strict';

	window.WPAdminOS = window.WPAdminOS || {};
	window.WPAdminOS.session = window.WPAdminOS.session || {};

	window.WPAdminOS.session.createReopenPolicy = function createReopenPolicy(storageKey) {
		const keyBase = storageKey || 'wp-adminos';
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
