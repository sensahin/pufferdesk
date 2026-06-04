(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};

	window.AdminOSMode.config = {
		get() {
			return window.adminOSMode || {};
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
