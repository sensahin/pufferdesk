(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};

	function boot() {
		const shell = document.querySelector('[data-pufferdesk-shell]');

		if (!shell || shell.dataset.pdkBooted === '1') {
			return;
		}

		if (
			!window.PufferDesk.config ||
			!window.PufferDesk.session ||
			!window.PufferDesk.session.createReopenPolicy ||
			!window.PufferDesk.windows ||
			!window.PufferDesk.widgets ||
			!window.PufferDesk.desktop ||
			!window.PufferDesk.desktop.createDesktopIconManager ||
			!window.PufferDesk.desktop.createFolderManager ||
			!window.PufferDesk.apps ||
			!window.PufferDesk.menuBar ||
			!window.PufferDesk.shell ||
			!window.PufferDesk.shell.createShellDialogs ||
			!window.PufferDesk.shell.createCommandRegistry ||
			!window.PufferDesk.shell.createMenuSchema ||
			!window.PufferDesk.shell.createMenuItemRenderer ||
			!window.PufferDesk.shell.createMenuController ||
			!window.PufferDesk.shell.createContextMenuController ||
			!window.PufferDesk.shell.createShortcutController
		) {
			return;
		}

		shell.dataset.pdkBooted = '1';

		const config = window.PufferDesk.config.get();
		if (window.PufferDesk.appearance) {
			window.PufferDesk.appearance.apply(shell, config.appearance || {});
			window.PufferDesk.appearance.bindSystemMode(shell);
		}
		if (window.PufferDesk.desktopDock) {
			window.PufferDesk.desktopDock.apply(shell, config.desktopDock || {});
			window.PufferDesk.desktopDock.bindTooltipDismissal(shell);
			if (typeof window.PufferDesk.desktopDock.bindReordering === 'function') {
				window.PufferDesk.desktopDock.bindReordering(shell, config, {
					storageKey: config.storageKey || ''
				});
			}
		}
		if (window.PufferDesk.wallpaper) {
			window.PufferDesk.wallpaper.apply(shell, config.wallpaper || {});
		}
		if (window.PufferDesk.menuBar) {
			window.PufferDesk.menuBar.apply(shell, config.menuBar || {});
			window.PufferDesk.menuBar.bindAutoHide(shell);
		}

		const reopenPolicy = window.PufferDesk.session.createReopenPolicy(config.storageKey || '');
		const skipWindowRestore = reopenPolicy.consumeSkipWindowRestoreOnce();
		const manager = window.PufferDesk.windows.createWindowManager(shell, {
			preserveStoredWindowsUntilChange: skipWindowRestore,
			storageKey: config.storageKey || ''
		});
		const widgetManager = window.PufferDesk.widgets.createWidgetManager(shell, {
			storageKey: config.storageKey || ''
		});
		let folderManager = null;
		const desktopIconManager = window.PufferDesk.desktop.createDesktopIconManager(shell, {
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
		const launcher = window.PufferDesk.apps.createAppLauncher(shell, manager, config);
		folderManager = window.PufferDesk.desktop.createFolderManager(shell, launcher, config);
		if (typeof launcher.setFolderProvider === 'function') {
			launcher.setFolderProvider(folderManager);
		}
		const dialogs = window.PufferDesk.shell.createShellDialogs(shell);
		const commands = window.PufferDesk.shell.createCommandRegistry(shell, {
			config,
			dialogs,
			folderManager,
			launcher,
			manager,
			reopenPolicy,
			desktopIconManager,
			widgetManager
		});
		const menuController = window.PufferDesk.shell.createMenuController(shell, config, {
			commands,
			desktopIconManager,
			launcher,
			manager,
			restoreWindows: !skipWindowRestore
		});
		const contextMenuController = window.PufferDesk.shell.createContextMenuController(shell, config, {
			commands,
			desktopIconManager,
			folderManager,
			launcher,
			manager,
			widgetManager
		});
		const shortcutController = window.PufferDesk.shell.createShortcutController(shell, {
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
		window.PufferDesk.shell.bindSearch(shell, launcher, config);
		window.PufferDesk.shell.bindClock(shell, config);

		window.PufferDesk.appLauncher = {
			openAbout: launcher.openAbout,
			openApp: launcher.openApp,
			openFolder: launcher.openFolder,
			openFolderTab: launcher.openFolderTab,
			openFolderInfo: launcher.openFolderInfo,
			openTrash: launcher.openTrash,
			openSiteAbout: launcher.openSiteAbout,
			openUrl: launcher.openUrl
		};
		window.PufferDesk.contextMenuController = contextMenuController;
		window.PufferDesk.desktopFolderManager = folderManager;
		window.PufferDesk.desktopIconManager = desktopIconManager;
		window.PufferDesk.widgetManager = widgetManager;
		window.PufferDesk.shellDialogs = dialogs;
		window.PufferDesk.shortcutController = shortcutController;
		window.PufferDesk.menuController = menuController;
		window.PufferDesk.menuCommands = commands;
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot);
	} else {
		boot();
	}
})();
