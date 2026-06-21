(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.services = window.PufferDesk.services || {};

	function getSettingsLabel(path) {
		const config = window.PufferDesk.config && typeof window.PufferDesk.config.get === 'function'
			? window.PufferDesk.config.get()
			: {};
		const settings = config.settings && typeof config.settings === 'object' ? config.settings : {};
		const labels = settings.labels && typeof settings.labels === 'object' ? settings.labels : {};
		const value = String(path || '').split('.').reduce((current, key) => (
			current && Object.prototype.hasOwnProperty.call(current, key) ? current[key] : undefined
		), labels);

		return typeof value === 'string' && value ? value : path;
	}

	window.PufferDesk.services.api = {
		post(action, data = {}, options = {}) {
			const config = window.PufferDesk.config.get();

			if (!config.ajaxUrl || !config.nonce) {
				return Promise.reject(new Error(getSettingsLabel('status.serviceUnavailable')));
			}

			const keepalive = Boolean(options.keepalive);
			const form = keepalive ? new window.URLSearchParams() : new window.FormData();

			form.append('action', action);
			form.append('nonce', config.nonce);

			Object.keys(data).forEach((key) => {
				form.append(key, data[key]);
			});

			return window.fetch(config.ajaxUrl, {
				body: form,
				credentials: 'same-origin',
				keepalive,
				method: 'POST'
			}).then((response) => response.json());
		}
	};
})();
