(function () {
	'use strict';

	window.WPAdminOS = window.WPAdminOS || {};
	window.WPAdminOS.services = window.WPAdminOS.services || {};

	window.WPAdminOS.services.api = {
		post(action, data = {}) {
			const config = window.WPAdminOS.config.get();

			if (!config.ajaxUrl || !config.nonce) {
				return Promise.reject(new Error('Settings service unavailable.'));
			}

			const form = new window.FormData();
			form.append('action', action);
			form.append('nonce', config.nonce);

			Object.keys(data).forEach((key) => {
				form.append(key, data[key]);
			});

			return window.fetch(config.ajaxUrl, {
				method: 'POST',
				credentials: 'same-origin',
				body: form
			}).then((response) => response.json());
		}
	};
})();
