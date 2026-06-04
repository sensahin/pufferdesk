(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};
	window.AdminOSMode.shell = window.AdminOSMode.shell || {};

	window.AdminOSMode.shell.bindSearch = function bindSearch(shell, launcher) {
		const searchInput = shell.querySelector('[data-aos-search]');

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
