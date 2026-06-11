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
			!window.PufferDesk.documents ||
			!window.PufferDesk.documents.createDocumentStore ||
			!window.PufferDesk.windows ||
			!window.PufferDesk.widgets ||
			!window.PufferDesk.desktop ||
			!window.PufferDesk.desktop.createDesktopIconManager ||
			!window.PufferDesk.desktop.createFolderManager ||
			!window.PufferDesk.desktop.createStickyNoteManager ||
			!window.PufferDesk.dragDrop ||
			!window.PufferDesk.dragDrop.createDragDropManager ||
			!window.PufferDesk.dragDrop.createDraggableRegistry ||
			!window.PufferDesk.dragDrop.createDropTargetRegistry ||
			!window.PufferDesk.dragDrop.createMoveService ||
			!window.PufferDesk.dragDrop.createMoveStateStore ||
			!window.PufferDesk.dragDrop.createMoveValidator ||
			!window.PufferDesk.notifications ||
			!window.PufferDesk.notifications.createStore ||
			!window.PufferDesk.notifications.createToastService ||
			!window.PufferDesk.notifications.createCenter ||
			!window.PufferDesk.services ||
			!window.PufferDesk.services.createSoundManager ||
			!window.PufferDesk.apps ||
			!window.PufferDesk.menuBar ||
			!window.PufferDesk.shell ||
			!window.PufferDesk.shell.createShellDialogs ||
			!window.PufferDesk.shell.createCommandRegistry ||
			!window.PufferDesk.shell.createMenuSchema ||
			!window.PufferDesk.shell.createMenuItemRenderer ||
			!window.PufferDesk.shell.createMenuController ||
			!window.PufferDesk.shell.createContextResolver ||
			!window.PufferDesk.shell.createContextMenuPermissionResolver ||
			!window.PufferDesk.shell.createContextMenuPositioner ||
			!window.PufferDesk.shell.createContextMenuKeyboardController ||
			!window.PufferDesk.shell.createContextMenuThemeAdapter ||
			!window.PufferDesk.shell.createContextMenuController ||
			!window.PufferDesk.shell.createSoundStatus ||
			!window.PufferDesk.shell.createShortcutController ||
			!window.PufferDesk.api ||
			!window.PufferDesk.api.createDesktopApi ||
			!window.PufferDesk.events
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
		const notificationStore = window.PufferDesk.notifications.createStore(config);
		window.PufferDesk.notificationStore = notificationStore;
		const soundManager = window.PufferDesk.services.createSoundManager(config);
		window.PufferDesk.sound = soundManager;
		window.PufferDesk.events.on('notifications:received', (event) => {
			const detail = event && event.detail ? event.detail : {};
			const snapshot = notificationStore && typeof notificationStore.getSnapshot === 'function'
				? notificationStore.getSnapshot()
				: {};

			if (detail.notification && detail.notification.sound === false) {
				return;
			}

			if (soundManager && typeof soundManager.playNotification === 'function') {
				soundManager.playNotification(detail.notification || {}, detail.preferences || snapshot.preferences || {});
			}
		});

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
		let launcher = null;
		let desktopIconManager = null;
		const moveStateStore = window.PufferDesk.dragDrop.createMoveStateStore(shell, {
			config,
			getDesktopIconManager: () => desktopIconManager,
			getFolderManager: () => folderManager,
			getLauncher: () => launcher
		});
		const dropTargetRegistry = window.PufferDesk.dragDrop.createDropTargetRegistry({
			events: window.PufferDesk.events
		});
		dropTargetRegistry.registerResolver((containerId) => moveStateStore.getContainer(containerId));
		const draggableRegistry = window.PufferDesk.dragDrop.createDraggableRegistry({
			events: window.PufferDesk.events
		});
		const moveValidator = window.PufferDesk.dragDrop.createMoveValidator({
			dropTargets: dropTargetRegistry,
			stateStore: moveStateStore
		});
		const moveService = window.PufferDesk.dragDrop.createMoveService({
			events: window.PufferDesk.events,
			stateStore: moveStateStore,
			validator: moveValidator
		});
		const dragDropManager = window.PufferDesk.dragDrop.createDragDropManager({
			draggables: draggableRegistry,
			events: window.PufferDesk.events,
			moveService,
			stateStore: moveStateStore
		});
		['desktop', 'folder-sidebar:favorites', 'dock', 'trash'].forEach((containerId) => {
			const container = moveStateStore.getContainer(containerId);
			if (container) {
				dropTargetRegistry.register(container);
			}
		});
		desktopIconManager = window.PufferDesk.desktop.createDesktopIconManager(shell, {
			canRenameIcon(detail) {
				return Boolean(
					config
					&& config.theme
					&& config.theme.family === 'redmond'
					&& detail
					&& detail.kind === 'app'
					&& detail.id === 'trash'
				);
			},
			canDropOnFolder(detail) {
				return Boolean(dragDropManager.canDropLegacy(detail, {
					emit: false,
					source: 'desktop'
				}));
			},
			onDropOnFolder(detail) {
				dragDropManager.dropLegacy(detail, {
					source: 'desktop'
				});
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
			dragDropManager,
			storageKey: config.storageKey || ''
		});
		const dialogs = window.PufferDesk.shell.createShellDialogs(shell);
		const documentStore = window.PufferDesk.documents.createDocumentStore(config);
		const stickyNoteManager = window.PufferDesk.desktop.createStickyNoteManager(shell, {
			config,
			dialogs,
			documentStore,
			storageKey: config.storageKey || ''
		});
		window.PufferDesk.stickyNoteManager = stickyNoteManager;
		launcher = window.PufferDesk.apps.createAppLauncher(shell, manager, config, {
			dragDropManager
		});
		folderManager = window.PufferDesk.desktop.createFolderManager(shell, launcher, config);
		if (typeof launcher.setFolderProvider === 'function') {
			launcher.setFolderProvider(folderManager);
		}
		const commands = window.PufferDesk.shell.createCommandRegistry(shell, {
			config,
			dialogs,
			folderManager,
			launcher,
			manager,
			reopenPolicy,
			desktopIconManager,
			stickyNoteManager,
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
			stickyNoteManager,
			widgetManager
		});
		const shortcutController = window.PufferDesk.shell.createShortcutController(shell, {
			commands,
			menuController
		});
		const desktopApi = window.PufferDesk.api.createDesktopApi({
			appLauncher: launcher,
			commandRegistry: commands,
			config,
			events: window.PufferDesk.events,
			nativeApps: window.PufferDesk.apps,
			notificationStore,
			shell,
			soundManager,
			windowManager: manager
		});
		const notificationToasts = window.PufferDesk.notifications.createToastService(shell, notificationStore, config);
		const notificationCenter = window.PufferDesk.notifications.createCenter(shell, notificationStore, config);
		const soundStatus = window.PufferDesk.shell.createSoundStatus(shell, config, {
			desktopApi,
			events: window.PufferDesk.events,
			soundManager
		});
		window.PufferDesk.soundStatus = soundStatus;
		if (typeof notificationStore.bindSystemNotifications === 'function') {
			notificationStore.bindSystemNotifications();
		}

		menuController.bind();
		contextMenuController.bind();
		shortcutController.bind();
		soundStatus.bind();
		folderManager.restoreSession();
		desktopIconManager.bindExistingIcons();
		desktopIconManager.restoreSession();
		folderManager.syncDesktopAppVisibility();
		widgetManager.bindExistingWidgets();
		widgetManager.restoreSession();
		stickyNoteManager.restore();
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
		window.PufferDesk.dragDrop.manager = dragDropManager;
		window.PufferDesk.dragDrop.moveService = moveService;
		window.PufferDesk.dragDrop.stateStore = moveStateStore;
		window.PufferDesk.dragDrop.targets = dropTargetRegistry;
		window.PufferDesk.dragDrop.draggables = draggableRegistry;
		window.PufferDesk.dragDropManager = dragDropManager;
		window.PufferDesk.desktopFolderManager = folderManager;
		window.PufferDesk.desktopIconManager = desktopIconManager;
		window.PufferDesk.stickyNoteManager = stickyNoteManager;
		window.PufferDesk.widgetManager = widgetManager;
		window.PufferDesk.shellDialogs = dialogs;
		window.PufferDesk.shortcutController = shortcutController;
		window.PufferDesk.menuController = menuController;
		window.PufferDesk.menuCommands = commands;
		window.PufferDesk.notificationCenter = notificationCenter;
		window.PufferDesk.notificationToasts = notificationToasts;
		window.PufferDesk.soundStatus = soundStatus;
		window.PufferDesk.desktop.api = desktopApi;
		window.PufferDesk.desktopApi = desktopApi;
		window.PufferDesk.events.emit('desktop:ready', {
			api: desktopApi,
			config,
			dragDropManager,
			notificationStore,
			shell,
			soundManager,
			stickyNoteManager
		});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot);
	} else {
		boot();
	}
})();
