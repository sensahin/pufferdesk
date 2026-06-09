(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.shell = window.PufferDesk.shell || {};

	window.PufferDesk.shell.bindSearch = function bindSearch(shell, launcher) {
		const searchInput = shell.querySelector('[data-pdk-search]');

		if (!searchInput) {
			return;
		}

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

		document.addEventListener('keydown', (event) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
				event.preventDefault();
				searchInput.focus();
			}
		});
	};
})();
