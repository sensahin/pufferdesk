(function () {
	'use strict';

	window.WPAdminOS = window.WPAdminOS || {};

	function boot() {
		const shell = document.querySelector('[data-wp-adminos-shell]');

		if (!shell || shell.dataset.aosBooted === '1') {
			return;
		}

		if (
			!window.WPAdminOS.config ||
			!window.WPAdminOS.session ||
			!window.WPAdminOS.session.createReopenPolicy ||
			!window.WPAdminOS.windows ||
			!window.WPAdminOS.widgets ||
			!window.WPAdminOS.desktop ||
			!window.WPAdminOS.desktop.createDesktopIconManager ||
			!window.WPAdminOS.desktop.createFolderManager ||
			!window.WPAdminOS.apps ||
			!window.WPAdminOS.menuBar ||
			!window.WPAdminOS.shell ||
			!window.WPAdminOS.shell.createShellDialogs ||
			!window.WPAdminOS.shell.createCommandRegistry ||
			!window.WPAdminOS.shell.createMenuSchema ||
			!window.WPAdminOS.shell.createMenuItemRenderer ||
			!window.WPAdminOS.shell.createMenuController ||
			!window.WPAdminOS.shell.createContextMenuController ||
			!window.WPAdminOS.shell.createShortcutController
		) {
			return;
		}

		shell.dataset.aosBooted = '1';

		const config = window.WPAdminOS.config.get();
		if (window.WPAdminOS.appearance) {
			window.WPAdminOS.appearance.apply(shell, config.appearance || {});
			window.WPAdminOS.appearance.bindSystemMode(shell);
		}
		if (window.WPAdminOS.desktopDock) {
			window.WPAdminOS.desktopDock.apply(shell, config.desktopDock || {});
			window.WPAdminOS.desktopDock.bindTooltipDismissal(shell);
			if (typeof window.WPAdminOS.desktopDock.bindReordering === 'function') {
				window.WPAdminOS.desktopDock.bindReordering(shell, config, {
					storageKey: config.storageKey || ''
				});
			}
		}
		if (window.WPAdminOS.wallpaper) {
			window.WPAdminOS.wallpaper.apply(shell, config.wallpaper || {});
		}
		if (window.WPAdminOS.menuBar) {
			window.WPAdminOS.menuBar.apply(shell, config.menuBar || {});
			window.WPAdminOS.menuBar.bindAutoHide(shell);
		}

		const reopenPolicy = window.WPAdminOS.session.createReopenPolicy(config.storageKey || '');
		const skipWindowRestore = reopenPolicy.consumeSkipWindowRestoreOnce();
		const manager = window.WPAdminOS.windows.createWindowManager(shell, {
			preserveStoredWindowsUntilChange: skipWindowRestore,
			storageKey: config.storageKey || ''
		});
		const widgetManager = window.WPAdminOS.widgets.createWidgetManager(shell, {
			storageKey: config.storageKey || ''
		});
		let folderManager = null;
		const desktopIconManager = window.WPAdminOS.desktop.createDesktopIconManager(shell, {
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
			onRenameIcon(detail) {
				if (
					!folderManager
					|| !detail
					|| detail.kind !== 'folder'
					|| typeof folderManager.isUserFolder !== 'function'
					|| typeof folderManager.startInlineRename !== 'function'
					|| !folderManager.isUserFolder(detail.id)
				) {
					return false;
				}

				return folderManager.startInlineRename(detail.id);
			},
			storageKey: config.storageKey || ''
		});
		const launcher = window.WPAdminOS.apps.createAppLauncher(shell, manager, config);
		folderManager = window.WPAdminOS.desktop.createFolderManager(shell, launcher, config);
		if (typeof launcher.setFolderProvider === 'function') {
			launcher.setFolderProvider(folderManager);
		}
		const dialogs = window.WPAdminOS.shell.createShellDialogs(shell);
		const commands = window.WPAdminOS.shell.createCommandRegistry(shell, {
			config,
			dialogs,
			folderManager,
			launcher,
			manager,
			reopenPolicy,
			desktopIconManager,
			widgetManager
		});
		const menuController = window.WPAdminOS.shell.createMenuController(shell, config, {
			commands,
			desktopIconManager,
			launcher,
			manager,
			restoreWindows: !skipWindowRestore
		});
		const contextMenuController = window.WPAdminOS.shell.createContextMenuController(shell, config, {
			commands,
			desktopIconManager,
			folderManager,
			launcher,
			manager,
			widgetManager
		});
		const shortcutController = window.WPAdminOS.shell.createShortcutController(shell, {
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
			manager.restoreSession({
				getAppOptions: (appId) => launcher.getWindowOptions(appId),
				openFolder: (folderId, restoreOptions) => launcher.openFolder(folderId, restoreOptions)
			});
		}
		(Array.isArray(config.appLoginItems) ? config.appLoginItems : []).forEach((appId) => {
			if (typeof appId === 'string' && appId && typeof launcher.openApp === 'function') {
				launcher.openApp(appId);
			}
		});
		launcher.bindShellClicks();
		window.WPAdminOS.shell.bindSearch(shell, launcher, config);
		window.WPAdminOS.shell.bindClock(shell, config);

		window.WPAdminOS.appLauncher = {
			openAbout: launcher.openAbout,
			openApp: launcher.openApp,
			openFolder: launcher.openFolder,
			openFolderTab: launcher.openFolderTab,
			openFolderInfo: launcher.openFolderInfo,
			openTrash: launcher.openTrash,
			openSiteAbout: launcher.openSiteAbout,
			openUrl: launcher.openUrl
		};
		window.WPAdminOS.contextMenuController = contextMenuController;
		window.WPAdminOS.desktopFolderManager = folderManager;
		window.WPAdminOS.desktopIconManager = desktopIconManager;
		window.WPAdminOS.widgetManager = widgetManager;
		window.WPAdminOS.shellDialogs = dialogs;
		window.WPAdminOS.shortcutController = shortcutController;
		window.WPAdminOS.menuController = menuController;
		window.WPAdminOS.menuCommands = commands;
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot);
	} else {
		boot();
	}
})();
