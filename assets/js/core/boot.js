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
			!window.AdminOSMode.shell ||
			!window.AdminOSMode.shell.createCommandRegistry ||
			!window.AdminOSMode.shell.createMenuSchema ||
			!window.AdminOSMode.shell.createMenuController
		) {
			return;
		}

		shell.dataset.aosBooted = '1';

		const config = window.AdminOSMode.config.get();
		if (window.AdminOSMode.appearance) {
			window.AdminOSMode.appearance.apply(shell, config.appearance || {});
			window.AdminOSMode.appearance.bindSystemMode(shell);
		}

		const manager = window.AdminOSMode.windows.createWindowManager(shell, {
			storageKey: config.storageKey || ''
		});
		const widgetManager = window.AdminOSMode.widgets.createWidgetManager(shell, {
			storageKey: config.storageKey || ''
		});
		const launcher = window.AdminOSMode.apps.createAppLauncher(shell, manager, config);
		const menuController = window.AdminOSMode.shell.createMenuController(shell, config, {
			launcher,
			manager
		});

		menuController.bind();
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
		window.AdminOSMode.menuController = menuController;
		window.AdminOSMode.menuCommands = menuController.commands;
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot);
	} else {
		boot();
	}
})();
