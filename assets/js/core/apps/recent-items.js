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

		function list(count) {
			if (!window.PufferDesk.menuBar || typeof window.PufferDesk.menuBar.getRecentItems !== 'function') {
				return [];
			}

			const items = window.PufferDesk.menuBar.getRecentItems(config);
			const limit = Number.parseInt(count, 10);

			return Number.isFinite(limit) && limit >= 0 ? items.slice(0, limit) : items;
		}

		return {
			add,
			list
		};
	};
})();
