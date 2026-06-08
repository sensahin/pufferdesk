(function () {
	'use strict';

	window.WPAdminOS = window.WPAdminOS || {};

	window.WPAdminOS.config = {
		get() {
			return window.wpAdminOS || {};
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
		}
	};
})();
