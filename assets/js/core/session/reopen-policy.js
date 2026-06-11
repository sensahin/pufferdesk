(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.session = window.PufferDesk.session || {};

	window.PufferDesk.session.createReopenPolicy = function createReopenPolicy(storageKey) {
		const storageKeys = window.PufferDesk.session.storageKeys || {};
		const skipWindowRestoreKey = typeof storageKeys.getReopenSkipKey === 'function'
			? storageKeys.getReopenSkipKey(storageKey)
			: storageKey;

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
