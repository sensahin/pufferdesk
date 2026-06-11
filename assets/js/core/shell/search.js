(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.shell = window.PufferDesk.shell || {};

	window.PufferDesk.shell.bindSearch = function bindSearch(shell, launcher) {
		const searchInput = shell.querySelector('[data-pdk-search]');
		const transientSurfaces = window.PufferDesk.shell.transientSurfaces || null;

		if (!searchInput) {
			return;
		}

		function announceSearchFocus() {
			if (transientSurfaces && typeof transientSurfaces.announce === 'function') {
				transientSurfaces.announce('search');
			}
		}

		searchInput.addEventListener('focus', announceSearchFocus);
		searchInput.addEventListener('pointerdown', announceSearchFocus);
		searchInput.addEventListener('keydown', (event) => {
			if (event.key !== 'Enter') {
				return;
			}

			const app = launcher.runSearch(searchInput.value);
			if (app) {
				launcher.openApp(app.id);
				searchInput.value = '';
			}
		});
	};
})();
