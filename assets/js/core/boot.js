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
			!window.AdminOSMode.session.createReopenPolicy ||
			!window.AdminOSMode.windows ||
			!window.AdminOSMode.widgets ||
			!window.AdminOSMode.desktop ||
			!window.AdminOSMode.desktop.createDesktopIconManager ||
			!window.AdminOSMode.desktop.createFolderManager ||
			!window.AdminOSMode.apps ||
			!window.AdminOSMode.menuBar ||
			!window.AdminOSMode.shell ||
			!window.AdminOSMode.shell.createShellDialogs ||
			!window.AdminOSMode.shell.createCommandRegistry ||
			!window.AdminOSMode.shell.createMenuSchema ||
			!window.AdminOSMode.shell.createMenuItemRenderer ||
			!window.AdminOSMode.shell.createMenuController ||
			!window.AdminOSMode.shell.createContextMenuController ||
			!window.AdminOSMode.shell.createShortcutController
		) {
			return;
		}

		shell.dataset.aosBooted = '1';

		const config = window.AdminOSMode.config.get();
		if (window.AdminOSMode.appearance) {
			window.AdminOSMode.appearance.apply(shell, config.appearance || {});
			window.AdminOSMode.appearance.bindSystemMode(shell);
		}
		if (window.AdminOSMode.desktopDock) {
			window.AdminOSMode.desktopDock.apply(shell, config.desktopDock || {});
			window.AdminOSMode.desktopDock.bindTooltipDismissal(shell);
		}
		if (window.AdminOSMode.wallpaper) {
			window.AdminOSMode.wallpaper.apply(shell, config.wallpaper || {});
		}
		if (window.AdminOSMode.menuBar) {
			window.AdminOSMode.menuBar.apply(shell, config.menuBar || {});
			window.AdminOSMode.menuBar.bindAutoHide(shell);
		}

		const reopenPolicy = window.AdminOSMode.session.createReopenPolicy(config.storageKey || '');
		const skipWindowRestore = reopenPolicy.consumeSkipWindowRestoreOnce();
		const manager = window.AdminOSMode.windows.createWindowManager(shell, {
			preserveStoredWindowsUntilChange: skipWindowRestore,
			storageKey: config.storageKey || ''
		});
		const widgetManager = window.AdminOSMode.widgets.createWidgetManager(shell, {
			storageKey: config.storageKey || ''
		});
		let folderManager = null;
		const desktopIconManager = window.AdminOSMode.desktop.createDesktopIconManager(shell, {
			canDropOnFolder(detail) {
				return Boolean(
					folderManager
					&& detail.sourceKind === 'app'
					&& detail.targetKind === 'folder'
					&& typeof folderManager.isUserFolder === 'function'
					&& folderManager.isUserFolder(detail.targetId)
				);
			},
			onDropOnFolder(detail) {
				if (folderManager && typeof folderManager.addAppToFolder === 'function') {
					folderManager.addAppToFolder(detail.sourceId, detail.targetId);
				}
			},
			storageKey: config.storageKey || ''
		});
		const launcher = window.AdminOSMode.apps.createAppLauncher(shell, manager, config);
		folderManager = window.AdminOSMode.desktop.createFolderManager(shell, launcher, config);
		if (typeof launcher.setFolderProvider === 'function') {
			launcher.setFolderProvider(folderManager);
		}
		const dialogs = window.AdminOSMode.shell.createShellDialogs(shell);
		const commands = window.AdminOSMode.shell.createCommandRegistry(shell, {
			config,
			dialogs,
			folderManager,
			launcher,
			manager,
			reopenPolicy,
			desktopIconManager,
			widgetManager
		});
		const menuController = window.AdminOSMode.shell.createMenuController(shell, config, {
			commands,
			desktopIconManager,
			launcher,
			manager,
			restoreWindows: !skipWindowRestore
		});
		const contextMenuController = window.AdminOSMode.shell.createContextMenuController(shell, config, {
			commands,
			desktopIconManager,
			folderManager,
			launcher,
			manager,
			widgetManager
		});
		const shortcutController = window.AdminOSMode.shell.createShortcutController(shell, {
			commands,
			menuController
		});

		menuController.bind();
		contextMenuController.bind();
		shortcutController.bind();
		folderManager.restoreSession();
		desktopIconManager.bindExistingIcons();
		desktopIconManager.restoreSession();
		folderManager.syncDesktopAppVisibility();
		widgetManager.bindExistingWidgets();
		widgetManager.restoreSession();
		manager.bindExistingWindows();
		if (!manager.isPreservingStoredWindows()) {
			manager.restoreSession((appId) => launcher.getWindowOptions(appId));
		}
		launcher.bindShellClicks();
		window.AdminOSMode.shell.bindSearch(shell, launcher, config);
		window.AdminOSMode.shell.bindClock(shell, config);

		window.AdminOSMode.appLauncher = {
			openAbout: launcher.openAbout,
			openApp: launcher.openApp,
			openFolder: launcher.openFolder,
			openFolderInfo: launcher.openFolderInfo,
			openSiteAbout: launcher.openSiteAbout,
			openUrl: launcher.openUrl
		};
		window.AdminOSMode.contextMenuController = contextMenuController;
		window.AdminOSMode.desktopFolderManager = folderManager;
		window.AdminOSMode.desktopIconManager = desktopIconManager;
		window.AdminOSMode.shellDialogs = dialogs;
		window.AdminOSMode.shortcutController = shortcutController;
		window.AdminOSMode.menuController = menuController;
		window.AdminOSMode.menuCommands = commands;
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot);
	} else {
		boot();
	}
})();
