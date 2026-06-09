(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};

	window.PufferDesk.apps.createRecentItemsController = function createRecentItemsController(config = {}) {
		function add(item) {
			if (!window.PufferDesk.menuBar || typeof window.PufferDesk.menuBar.addRecentItem !== 'function') {
				return false;
			}

			window.PufferDesk.menuBar.addRecentItem(config, item);

			return true;
		}

		return {
			add
		};
	};
})();
