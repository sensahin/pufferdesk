(function () {
	'use strict';

	window.WPAdminOS = window.WPAdminOS || {};
	window.WPAdminOS.services = window.WPAdminOS.services || {};

	window.WPAdminOS.services.storage = {
		getJSON(key) {
			if (!key) {
				return null;
			}

			try {
				const raw = window.localStorage.getItem(key);
				return raw ? JSON.parse(raw) : null;
			} catch (error) {
				return null;
			}
		},

		setJSON(key, value) {
			if (!key) {
				return false;
			}

			try {
				window.localStorage.setItem(key, JSON.stringify(value));
				return true;
			} catch (error) {
				return false;
			}
		},

		remove(key) {
			if (!key) {
				return;
			}

			try {
				window.localStorage.removeItem(key);
			} catch (error) {
				// localStorage can be unavailable in hardened browsers.
			}
		}
	};
})();
