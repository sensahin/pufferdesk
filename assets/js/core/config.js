(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};

	window.PufferDesk.config = {
		get() {
			return window.pufferDesk || {};
		},

		getApps() {
			const config = this.get();
			return Array.isArray(config.apps) ? config.apps : [];
		},

		getThemes() {
			const config = this.get();
			return Array.isArray(config.themes) ? config.themes : [];
		},

		getWidgets() {
			const config = this.get();
			return Array.isArray(config.widgets) ? config.widgets : [];
		},

		getLabels() {
			const config = this.get();

			return config.menu && config.menu.labels && typeof config.menu.labels === 'object'
				? config.menu.labels
				: {};
		},

		getLabel(key, fallback = '') {
			const labels = this.getLabels();
			const value = labels[key];

			return typeof value === 'string' && value ? value : fallback;
		},

		formatLabel(key, fallback = '', values = []) {
			let index = 0;
			const template = this.getLabel(key, fallback);

			return String(template).replace(/%d|%s/g, () => String(values[index++] ?? ''));
		}
	};
})();
