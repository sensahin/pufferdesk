(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};

	function boot() {
		const shell = document.querySelector('[data-admin-os-shell]');

		if (!shell || shell.dataset.aosBooted === '1') {
			return;
		}

		if (
			!window.AdminOSMode.config ||
			!window.AdminOSMode.session ||
			!window.AdminOSMode.windows ||
			!window.AdminOSMode.widgets ||
			!window.AdminOSMode.apps ||
			!window.AdminOSMode.shell
		) {
			return;
		}

		shell.dataset.aosBooted = '1';

		const config = window.AdminOSMode.config.get();
		const manager = window.AdminOSMode.windows.createWindowManager(shell, {
			storageKey: config.storageKey || ''
		});
		const widgetManager = window.AdminOSMode.widgets.createWidgetManager(shell, {
			storageKey: config.storageKey || ''
		});
		const launcher = window.AdminOSMode.apps.createAppLauncher(shell, manager, config);

		widgetManager.bindExistingWidgets();
		widgetManager.restoreSession();
		manager.bindExistingWindows();
		manager.restoreSession((appId) => launcher.getWindowOptions(appId));
		launcher.bindShellClicks();
		window.AdminOSMode.shell.bindSearch(shell, launcher, config);
		window.AdminOSMode.shell.bindClock(shell, config);

		window.AdminOSMode.appLauncher = {
			openApp: launcher.openApp,
			openFolder: launcher.openFolder,
			openUrl: launcher.openUrl
		};
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot);
	} else {
		boot();
	}
})();
