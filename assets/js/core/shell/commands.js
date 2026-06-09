(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.shell = window.PufferDesk.shell || {};

	window.PufferDesk.shell.createCommandRegistry = function createCommandRegistry(shell, context = {}) {
		const dom = window.PufferDesk.dom;
		const launcher = context.launcher || null;
		const manager = context.manager || null;
		const widgetManager = context.widgetManager || null;
		const desktopIconManager = context.desktopIconManager || null;
		const folderManager = context.folderManager || null;
		const dialogs = context.dialogs || null;
		const reopenPolicy = context.reopenPolicy || null;
		const config = context.config && typeof context.config === 'object' ? context.config : {};
		const api = window.PufferDesk.services && window.PufferDesk.services.api ? window.PufferDesk.services.api : null;
		const apps = Array.isArray(config.apps) ? config.apps : [];
		const appMap = new Map(apps.map((app) => [app.id, app]));
		const labels = config.menu && config.menu.labels && typeof config.menu.labels === 'object' ? config.menu.labels : {};
		const appSurfaceManager = window.PufferDesk.apps && typeof window.PufferDesk.apps.createAppSurfaceManager === 'function'
			? window.PufferDesk.apps.createAppSurfaceManager(shell, config, {
				apps,
				desktopIconManager,
				folderManager,
				preserveUnknown: true
			})
			: null;
			const commands = new Map();
			const folderToolbarDisplayModes = new Set(['icon-text', 'icon-only', 'text-only']);
			const folderExplorerSortModes = new Set(['none', 'name', 'kind']);
			const folderExplorerViewModes = new Set(['extra-large-icons', 'large-icons', 'medium-icons', 'small-icons', 'list', 'details', 'tiles', 'content']);
			let activeDetail = { kind: 'desktop' };

		function getLabel(key, fallback) {
			const value = labels[key];

			return typeof value === 'string' && value ? value : fallback;
		}

		function formatLabel(key, fallback, values = []) {
			if (window.PufferDesk.config && typeof window.PufferDesk.config.formatFromLabels === 'function') {
				return window.PufferDesk.config.formatFromLabels(labels, key, fallback, values);
			}

			return getLabel(key, fallback);
		}

		function getTargetWindow(detail = activeDetail) {
			if (detail && detail.windowElement && detail.windowElement.classList && detail.windowElement.classList.contains('pdk-window')) {
				return detail.windowElement;
			}

			if (detail && detail.appId) {
				return shell.querySelector(`.pdk-window[data-pdk-app-window="${dom.escapeAttribute(detail.appId)}"]:not(.is-closed)`);
			}

			if (manager && typeof manager.getActiveWindow === 'function') {
				const activeWindow = manager.getActiveWindow();
				if (activeWindow) {
					return activeWindow;
				}
			}

			return null;
		}

		function getWindowById(windowId) {
			return windowId
				? shell.querySelector(`.pdk-window[data-pdk-window-id="${dom.escapeAttribute(windowId)}"]:not(.is-closed)`)
				: null;
		}

		function getTargetWindowFrame(detail = activeDetail) {
			const win = getTargetWindow(detail);

			return win ? win.querySelector('iframe.pdk-app-frame') : null;
		}

		function normalizeFolderToolbarDisplayMode(mode) {
			return folderToolbarDisplayModes.has(mode) ? mode : '';
		}

		function normalizeFolderExplorerSortMode(mode) {
			return folderExplorerSortModes.has(mode) ? mode : '';
		}

		function normalizeFolderExplorerViewMode(mode) {
			return folderExplorerViewModes.has(mode) ? mode : '';
		}

		function getFolderToolbarWindow(detail = activeDetail) {
			const win = getTargetWindow(detail);

			if (!win || !win.dataset || win.dataset.pdkWindowKind !== 'folder') {
				return null;
			}

			return win;
		}

		function getTargetWidget(detail = activeDetail) {
			if (detail && detail.widgetElement && detail.widgetElement.dataset && detail.widgetElement.dataset.pdkWidget) {
				return detail.widgetElement;
			}

			if (detail && detail.widgetId && widgetManager && typeof widgetManager.getWidget === 'function') {
				return widgetManager.getWidget(detail.widgetId);
			}

			return null;
		}

		function removeIframeParam(url) {
			if (!url) {
				return '';
			}

			try {
				const next = new URL(url, window.location.origin);
				next.searchParams.delete('pufferdesk_iframe');
				return next.toString();
			} catch (error) {
				return url;
			}
		}

		function getWindowBrowserUrl(detail = activeDetail, fallback = '') {
			const win = getTargetWindow(detail);
			let url = '';

			if (win) {
				const frame = win.querySelector('iframe.pdk-app-frame');

				if (frame) {
					try {
						url = frame.contentWindow && frame.contentWindow.location
							? frame.contentWindow.location.href
							: '';
					} catch (error) {
						url = '';
					}

					if (!url || url === 'about:blank') {
						url = frame.getAttribute('src') || '';
					}
				}

				if (!url && win.dataset) {
					url = win.dataset.pdkWindowUrl || '';
				}
			}

			return removeIframeParam(url || fallback);
		}

		function getPayload(item = {}) {
			return Object.assign({}, item.payload && typeof item.payload === 'object' ? item.payload : {}, {
				icon: item.icon || '',
				panel: item.panel || '',
				target: item.target || '',
				title: item.title || item.label || '',
				url: item.url || ''
			});
		}

		function register(id, command) {
			if (!id || !command || typeof command.run !== 'function') {
				return;
			}

			commands.set(id, command);
		}

		function canExecute(item, detail = activeDetail) {
			if (!item || item.disabled || !item.command) {
				return false;
			}

			const command = commands.get(item.command);
			if (!command) {
				return false;
			}

			if (typeof command.isEnabled === 'function') {
				return Boolean(command.isEnabled(getPayload(item), detail));
			}

			return true;
		}

		function execute(item, detail = activeDetail) {
			if (!canExecute(item, detail)) {
				return false;
			}

			const command = commands.get(item.command);
			const result = command.run(getPayload(item), detail);
			if (result && typeof result.catch === 'function') {
				result.catch((error) => {
					if (window.console && typeof window.console.error === 'function') {
						window.console.error('PufferDesk command failed.', error);
					}
				});
			}
			return true;
		}

		function setActiveDetail(detail = {}) {
			activeDetail = detail && typeof detail === 'object' ? detail : { kind: 'desktop' };
		}

		function refreshActiveMenu(detail = activeDetail) {
			shell.dispatchEvent(new window.CustomEvent('pufferDesk:active-window-change', {
				detail
			}));
		}

		function getAppTargetFromDetail(detail = {}) {
			const appId = detail && detail.appId ? detail.appId : '';
			return appId.startsWith('about-') ? appId.slice(6) : appId;
		}

		function getFolderTargetFromDetail(detail = {}) {
			return detail && detail.id ? detail.id : '';
		}

		function getFolderAppTargetFromDetail(detail = {}) {
			return detail && detail.id ? detail.id : '';
		}

		function getFolderIdFromPayload(payload = {}, detail = {}) {
			return payload.folderId || payload.target || (detail && detail.folderId) || getFolderTargetFromDetail(detail);
		}

		function getFolderTabIdFromPayload(payload = {}, detail = {}) {
			return payload.tabId || payload.target || (detail && detail.id) || '';
		}

		function getFolderCreateParentId(payload = {}, detail = {}) {
			if (payload.parentId) {
				return payload.parentId;
			}

			if (detail && detail.windowElement && detail.windowElement.dataset && detail.windowElement.dataset.pdkWindowKind === 'folder') {
				return detail.folderId || detail.windowElement.dataset.pdkFolderWindow || detail.id || '';
			}

			if (detail && (detail.type === 'folder-toolbar' || detail.kind === 'folder-toolbar')) {
				return detail.folderId || detail.id || '';
			}

			return '';
		}

		function getAppIdFromPayload(payload = {}, detail = {}) {
			return payload.target || payload.appId || getAppTargetFromDetail(detail) || (detail && detail.id) || '';
		}

		function isFixedDockApp(appId) {
			const app = appMap.get(appId);

			return Boolean(app && app.dock && typeof app.dock === 'object' && app.dock.fixed === true);
		}

		function normalizeAppLocations(locations = {}) {
			return appSurfaceManager ? appSurfaceManager.normalizeLocations(locations) : {};
		}

		function getAppLocation(appId) {
			const locations = normalizeAppLocations(config.appLocations || {});
			return locations[appId] || 'dock';
		}

		function applyAppLocations(locations = {}) {
			config.appLocations = normalizeAppLocations(locations);
			if (appSurfaceManager) {
				appSurfaceManager.render(config.appLocations);
			}
		}

		function saveAppLocations(nextLocations) {
			const previous = normalizeAppLocations(config.appLocations || {});
			applyAppLocations(nextLocations);

			if (!api || typeof api.post !== 'function') {
				return Promise.reject(new Error('Settings service unavailable.'));
			}

			return api.post('pufferdesk_save_app_locations', {
				locations: JSON.stringify(config.appLocations)
			}).then((result) => {
				if (!result || !result.success) {
					applyAppLocations(previous);
					throw new Error(result && result.data && result.data.message ? result.data.message : 'App locations could not be saved.');
				}

				applyAppLocations(result.data.appLocations || config.appLocations);
			}).catch((error) => {
				applyAppLocations(previous);
				throw error;
			});
		}

		function setAppDockPresence(appId, keepInDock) {
			const app = appMap.get(appId);
			const locations = normalizeAppLocations(config.appLocations || {});
			const current = getAppLocation(appId);

			if (!app) {
				return Promise.reject(new Error('App unavailable.'));
			}

			if (isFixedDockApp(appId)) {
				return Promise.reject(new Error(formatLabel('fixed_launcher_placement_format', 'App has a fixed %s placement.', [getLabel('launcher', 'Dock')])));
			}

			if (keepInDock) {
				locations[appId] = current === 'desktop' ? 'both' : current === 'hidden' ? 'dock' : current;
			} else {
				locations[appId] = current === 'both' ? 'desktop' : current === 'dock' ? 'hidden' : current;
			}

			return saveAppLocations(locations);
		}

		function normalizeAppLoginItems(items = config.appLoginItems || []) {
			const normalized = [];
			const seen = new Set();

			(Array.isArray(items) ? items : []).forEach((item) => {
				const appId = String(item || '');
				if (!appId || seen.has(appId) || !appMap.has(appId)) {
					return;
				}

				seen.add(appId);
				normalized.push(appId);
			});

			return normalized;
		}

		function saveAppLoginItems(items) {
			const previous = normalizeAppLoginItems(config.appLoginItems || []);
			config.appLoginItems = normalizeAppLoginItems(items);

			if (!api || typeof api.post !== 'function') {
				config.appLoginItems = previous;
				return Promise.reject(new Error('Settings service unavailable.'));
			}

			return api.post('pufferdesk_save_app_login_items', {
				items: JSON.stringify(config.appLoginItems)
			}).then((result) => {
				if (!result || !result.success) {
					config.appLoginItems = previous;
					throw new Error(result && result.data && result.data.message ? result.data.message : 'Login items could not be saved.');
				}

				config.appLoginItems = normalizeAppLoginItems(result.data.appLoginItems || config.appLoginItems);
			}).catch((error) => {
				config.appLoginItems = previous;
				throw error;
			});
		}

		function toggleAppLoginItem(appId) {
			const items = normalizeAppLoginItems(config.appLoginItems || []);
			const nextItems = items.includes(appId)
				? items.filter((item) => item !== appId)
				: items.concat(appId);

			return saveAppLoginItems(nextItems);
		}

		function getSystemActions() {
			return config.system && config.system.actions && typeof config.system.actions === 'object'
				? config.system.actions
				: {};
		}

		function getActionDefaults(actionKey) {
			const defaults = {
				logout: {
					cancelLabel: 'Cancel',
					confirmLabel: 'Log Out',
					countdownSeconds: 60,
					icon: 'power',
					message: 'If you do nothing, you will be logged out automatically in {seconds} seconds.',
					overlayMessage: 'Logging out...',
					reopenWindowsDefault: false,
					reopenWindowsLabel: 'Reopen windows when logging back in',
					title: 'Are you sure you want to log out?'
				},
				lock: {
					cancelLabel: 'Cancel',
					confirmLabel: 'Lock',
					countdownSeconds: 60,
					icon: 'power',
					message: 'You will be signed out and returned to the WordPress login screen.',
					overlayMessage: 'Locking PufferDesk...',
					reopenWindowsDefault: false,
					reopenWindowsLabel: 'Reopen windows when signing back in',
					title: 'Lock PufferDesk?'
				},
				sleep: {
					cancelLabel: 'Cancel',
					confirmLabel: 'Sleep',
					countdownSeconds: 60,
					icon: 'power',
					message: 'PufferDesk will close and Classic Admin will open.',
					overlayMessage: 'Putting PufferDesk to sleep...',
					reopenWindowsDefault: false,
					reopenWindowsLabel: 'Reopen windows when returning to PufferDesk',
					title: 'Sleep PufferDesk?'
				},
				shutdown: {
					cancelLabel: 'Cancel',
					confirmLabel: 'Shut down',
					countdownSeconds: 60,
					icon: 'power',
					message: 'PufferDesk will close and Classic Admin will open.',
					overlayMessage: 'Shutting down PufferDesk...',
					reopenWindowsDefault: false,
					reopenWindowsLabel: 'Reopen windows when returning to PufferDesk',
					title: 'Shut down PufferDesk?'
				},
				eraseContentSettings: {
					cancelLabel: 'Cancel',
					confirmLabel: 'Erase',
					message: 'This will reset PufferDesk settings, wallpaper, dock, windows, and layout for this WordPress account. WordPress site content will not be affected.',
					overlayMessage: 'Erasing PufferDesk settings...',
					title: 'Erase All Content and Settings?'
				},
				emptyTrash: {
					cancelLabel: 'Cancel',
					confirmLabel: 'Empty Trash',
					icon: 'dashicons-trash',
					message: 'This permanently deletes all trashed PufferDesk folder records. Apps and plugins are not deleted.',
					title: 'Empty Trash?'
				},
				restart: {
					cancelLabel: 'Cancel',
					confirmLabel: 'Restart',
					countdownSeconds: 60,
					icon: 'power',
					message: 'If you do nothing, PufferDesk will restart automatically in {seconds} seconds.',
					overlayMessage: 'Restarting PufferDesk...',
					reopenWindowsDefault: false,
					reopenWindowsLabel: 'Reopen windows after restarting',
					title: 'Are you sure you want to restart PufferDesk?'
				},
				switchClassic: {
					cancelLabel: 'Cancel',
					confirmLabel: 'Switch',
					countdownSeconds: 60,
					icon: 'dashicons-admin-site-alt3',
					message: 'If you do nothing, Classic Admin will open automatically in {seconds} seconds.',
					overlayMessage: 'Switching to Classic Admin...',
					reopenWindowsDefault: false,
					reopenWindowsLabel: 'Reopen windows when returning to PufferDesk',
					title: 'Are you sure you want to switch to Classic Admin?'
				}
			};

			return defaults[actionKey] || {};
		}

		function getActionConfig(actionKey) {
			const actions = getSystemActions();
			return Object.assign({}, getActionDefaults(actionKey), actions[actionKey] && typeof actions[actionKey] === 'object' ? actions[actionKey] : {});
		}

		function getShellUrl() {
			if (!config.shellUrl) {
				return null;
			}

			try {
				return new URL(config.shellUrl, window.location.href);
			} catch (error) {
				return null;
			}
		}

		function isCurrentShellUrl(shellUrl) {
			if (!shellUrl) {
				return true;
			}

			try {
				return new URL(window.location.href).href === shellUrl.href;
			} catch (error) {
				return false;
			}
		}

		function saveManagers() {
			if (manager && typeof manager.saveSession === 'function') {
				manager.saveSession();
			}

			if (widgetManager && typeof widgetManager.saveSession === 'function') {
				widgetManager.saveSession();
			}

			if (desktopIconManager && typeof desktopIconManager.saveSession === 'function') {
				desktopIconManager.saveSession();
			}

			if (folderManager && typeof folderManager.saveSession === 'function') {
				folderManager.saveSession();
			}
		}

		function disableSessionPersistence() {
			if (manager && typeof manager.disableSessionSave === 'function') {
				manager.disableSessionSave();
			}

			if (widgetManager && typeof widgetManager.disableSessionSave === 'function') {
				widgetManager.disableSessionSave();
			}

			if (desktopIconManager && typeof desktopIconManager.disableSessionSave === 'function') {
				desktopIconManager.disableSessionSave();
			}

			if (folderManager && typeof folderManager.disableSessionSave === 'function') {
				folderManager.disableSessionSave();
			}
		}

		function skipWindowRestoreOnce() {
			if (reopenPolicy && typeof reopenPolicy.skipWindowRestoreOnce === 'function') {
				reopenPolicy.skipWindowRestoreOnce();
			}
		}

		function getLocalStorage() {
			try {
				return window.localStorage;
			} catch (error) {
				return null;
			}
		}

		function getSessionStore() {
			if (config.storageKey && window.PufferDesk.session && window.PufferDesk.session.createSessionStore) {
				return window.PufferDesk.session.createSessionStore(config.storageKey);
			}

			return null;
		}

		function flushSessionStore() {
			const store = getSessionStore();
			if (!store || typeof store.flush !== 'function') {
				return Promise.resolve(false);
			}

			return store.flush();
		}

		function clearSessionStore() {
			disableSessionPersistence();

			const store = getSessionStore();
			if (store && typeof store.clear === 'function') {
				return store.clear();
			}

			return Promise.resolve(false);
		}

		function clearAllUserSessionStores() {
			disableSessionPersistence();

			const storage = getLocalStorage();
			const userId = Number.parseInt(config.userId, 10);
			let removed = false;

			if (storage && userId > 0) {
				const prefix = `pufferDesk:${userId}:`;
				const keys = [];

				for (let index = 0; index < storage.length; index += 1) {
					const key = storage.key(index);

					if (key && key.startsWith(prefix) && key.endsWith(':session')) {
						keys.push(key);
					}
				}

				keys.forEach((key) => {
					storage.removeItem(key);
					removed = true;
				});
			}

			const clearResult = clearSessionStore();
			if (clearResult && typeof clearResult.then === 'function') {
				clearResult.catch(() => {});
			}

			return removed || Boolean(clearResult);
		}

		function reloadShell() {
			const shellUrl = getShellUrl();

			if (shellUrl && !isCurrentShellUrl(shellUrl)) {
				window.location.href = shellUrl.href;
				return;
			}

			window.location.reload();
		}

		function refreshDesktop() {
			if (appSurfaceManager && typeof appSurfaceManager.render === 'function') {
				appSurfaceManager.render(config.appLocations || {});
				return;
			}

			if (folderManager && typeof folderManager.syncDesktopAppVisibility === 'function') {
				folderManager.syncDesktopAppVisibility();
			}
			if (folderManager && typeof folderManager.syncTrashSurfaceState === 'function') {
				folderManager.syncTrashSurfaceState();
			}
			if (desktopIconManager && typeof desktopIconManager.rebind === 'function') {
				desktopIconManager.rebind();
			}
		}

		async function confirmAction(actionConfig) {
			if (dialogs && typeof dialogs.confirmTimedAction === 'function') {
				return dialogs.confirmTimedAction(actionConfig);
			}

			const confirmed = window.confirm(`${actionConfig.title}\n\n${String(actionConfig.message || '').replace('{seconds}', actionConfig.countdownSeconds || 60)}`);
			return {
				confirmed,
				reason: confirmed ? 'confirm' : 'cancel',
				reopenWindows: true
			};
		}

		async function runTimedAction(actionKey, actionRunner) {
			const actionConfig = getActionConfig(actionKey);
			const result = await confirmAction(actionConfig);

			if (!result.confirmed) {
				return;
			}

			if (result.reopenWindows === false) {
				skipWindowRestoreOnce();
			}

			saveManagers();
			await flushSessionStore();

			if (dialogs && typeof dialogs.showBlockingOverlay === 'function') {
				dialogs.showBlockingOverlay(actionConfig.overlayMessage || '');
			}

			window.setTimeout(actionRunner, 180);
		}

		function restartShell() {
			return runTimedAction('restart', reloadShell);
		}

		function switchToClassicAdmin(payload, actionKey = 'switchClassic') {
			return runTimedAction(actionKey, () => {
				window.location.href = payload.url || payload.target || config.classicUrl;
			});
		}

		function logOut(payload, actionKey = 'logout') {
			return runTimedAction(actionKey, () => {
				window.location.href = payload.url || payload.target;
			});
		}

		async function eraseContentAndSettings() {
			const actionConfig = getActionConfig('eraseContentSettings');
			const confirmed = dialogs && typeof dialogs.confirm === 'function'
				? await dialogs.confirm(actionConfig)
				: window.confirm(`${actionConfig.title}\n\n${actionConfig.message}`);
			let overlay = null;

			if (!confirmed) {
				return;
			}

			if (!api || typeof api.post !== 'function') {
				throw new Error('Settings service unavailable.');
			}

			if (dialogs && typeof dialogs.showBlockingOverlay === 'function') {
				overlay = dialogs.showBlockingOverlay(actionConfig.overlayMessage || '');
			}

			try {
				const result = await api.post('pufferdesk_reset', {
					profile: 'erase_content_settings'
				});

				if (!result || !result.success) {
					const message = result && result.data && result.data.message
						? result.data.message
						: 'PufferDesk settings could not be reset.';
					throw new Error(message);
				}

				skipWindowRestoreOnce();
				if (result.data && result.data.client && result.data.client.clearAllUserSessions) {
					clearAllUserSessionStores();
				} else {
					clearSessionStore();
				}

				window.setTimeout(reloadShell, 180);
			} catch (error) {
				if (overlay && typeof overlay.close === 'function') {
					overlay.close();
				}

				throw error;
			}
		}

		register('noop', {
			run() {}
		});

		register('open-app', {
			isEnabled(payload) {
				return Boolean(launcher && typeof launcher.openApp === 'function' && payload.target);
			},
			run(payload) {
				launcher.openApp(payload.target);
			}
		});

		register('open-folder', {
			isEnabled(payload) {
				return Boolean(launcher && typeof launcher.openFolder === 'function' && payload.target);
			},
			run(payload) {
				launcher.openFolder(payload.target);
			}
		});

		register('open-folder-tab', {
			isEnabled(payload, detail) {
				return Boolean(launcher && typeof launcher.openFolderTab === 'function' && getFolderIdFromPayload(payload, detail));
			},
			run(payload, detail) {
				launcher.openFolderTab(getFolderIdFromPayload(payload, detail), {
					windowElement: detail && detail.windowElement ? detail.windowElement : null
				});
			}
		});

		register('open-folder-window', {
			isEnabled(payload, detail) {
				return Boolean(launcher && typeof launcher.openFolderWindow === 'function' && getFolderIdFromPayload(payload, detail));
			},
			run(payload, detail) {
				launcher.openFolderWindow(getFolderIdFromPayload(payload, detail), {
					windowElement: detail && detail.windowElement ? detail.windowElement : null
				});
			}
		});

			register('folder.create', {
				isEnabled(payload, detail) {
					const parentId = getFolderCreateParentId(payload, detail);

					return Boolean(
						folderManager
						&& typeof folderManager.createFolder === 'function'
						&& parentId !== 'trash'
					);
				},
				run(payload, detail) {
					const parentId = getFolderCreateParentId(payload, detail);
					const folder = folderManager.createFolder(getLabel('untitled_folder', 'untitled folder'), [], {
						parentId: parentId || 'desktop',
						point: detail && detail.contextPoint ? detail.contextPoint : null
					});
					if (folder && (!parentId || parentId === 'desktop') && typeof folderManager.startInlineRename === 'function') {
						folderManager.startInlineRename(folder.id);
					}
				}
		});

		register('folder.get-info', {
			isEnabled(payload, detail) {
				return Boolean(launcher && typeof launcher.openFolderInfo === 'function' && getFolderIdFromPayload(payload, detail));
			},
			run(payload, detail) {
				launcher.openFolderInfo(getFolderIdFromPayload(payload, detail));
			}
		});

		register('folder.refresh', {
			isEnabled(payload, detail) {
				return Boolean(launcher && typeof launcher.refreshFolderWindow === 'function' && getFolderIdFromPayload(payload, detail));
			},
			run(payload, detail) {
				launcher.refreshFolderWindow(getFolderIdFromPayload(payload, detail));
			}
		});

		register('desktop.refresh', {
			isEnabled() {
				return Boolean(appSurfaceManager || folderManager || desktopIconManager);
			},
			run() {
				refreshDesktop();
			}
		});

		register('folder-tab.close', {
			isEnabled(payload, detail) {
				return Boolean(launcher && typeof launcher.closeFolderTab === 'function' && getTargetWindow(detail) && getFolderTabIdFromPayload(payload, detail));
			},
			run(payload, detail) {
				launcher.closeFolderTab(getTargetWindow(detail), getFolderTabIdFromPayload(payload, detail));
			}
		});

		register('folder-tab.close-others', {
			isEnabled(payload, detail) {
				return Boolean(launcher && typeof launcher.closeOtherFolderTabs === 'function' && getTargetWindow(detail) && getFolderTabIdFromPayload(payload, detail));
			},
			run(payload, detail) {
				launcher.closeOtherFolderTabs(getTargetWindow(detail), getFolderTabIdFromPayload(payload, detail));
			}
		});

		register('folder-tab.close-right', {
			isEnabled(payload, detail) {
				return Boolean(launcher && typeof launcher.closeFolderTabsToRight === 'function' && getTargetWindow(detail) && getFolderTabIdFromPayload(payload, detail));
			},
			run(payload, detail) {
				launcher.closeFolderTabsToRight(getTargetWindow(detail), getFolderTabIdFromPayload(payload, detail));
			}
		});

		register('folder-tab.duplicate', {
			isEnabled(payload, detail) {
				return Boolean(launcher && typeof launcher.duplicateFolderTab === 'function' && getTargetWindow(detail) && getFolderTabIdFromPayload(payload, detail));
			},
			run(payload, detail) {
				launcher.duplicateFolderTab(getTargetWindow(detail), getFolderTabIdFromPayload(payload, detail));
			}
		});

		register('folder.rename', {
			isEnabled(payload, detail) {
				const folderId = getFolderIdFromPayload(payload, detail);
				return Boolean(
					folderManager
					&& typeof folderManager.isUserFolder === 'function'
					&& typeof folderManager.startInlineRename === 'function'
					&& folderManager.isUserFolder(folderId)
				);
			},
			run(payload, detail) {
				const folderId = getFolderIdFromPayload(payload, detail);
				folderManager.startInlineRename(folderId);
			}
		});

		register('folder.delete', {
			isEnabled(payload, detail) {
				const folderId = getFolderIdFromPayload(payload, detail);
				return Boolean(
					folderManager
					&& typeof folderManager.isUserFolder === 'function'
					&& typeof folderManager.moveFolderToTrash === 'function'
					&& folderManager.isUserFolder(folderId)
				);
			},
			async run(payload, detail) {
				const folderId = getFolderIdFromPayload(payload, detail);
				const folder = folderManager.getFolder(folderId);
				const folderLabel = folder && folder.label ? folder.label : getLabel('folder', 'Folder');
				const title = formatLabel('move_folder_to_trash_title_format', 'Move "%s" to Trash?', [folderLabel]);
				const confirmed = dialogs && typeof dialogs.confirm === 'function'
					? await dialogs.confirm({
						cancelLabel: getLabel('cancel', 'Cancel'),
						confirmLabel: getLabel('move_to_trash', 'Move to Trash'),
						message: getLabel('move_folder_to_trash_message', 'Only this PufferDesk folder will be moved. Apps and plugins inside it stay installed and available.'),
						title
					})
					: window.confirm(title);

				if (confirmed) {
					folderManager.moveFolderToTrash(folderId);
				}
			}
		});

		register('trash.restore', {
			isEnabled(payload) {
				return Boolean(folderManager && typeof folderManager.restoreTrashItem === 'function' && payload.target);
			},
			run(payload) {
				folderManager.restoreTrashItem(payload.target);
			}
		});

		register('trash.delete-immediately', {
			isEnabled(payload) {
				return Boolean(folderManager && typeof folderManager.deleteTrashItem === 'function' && payload.target);
			},
			async run(payload) {
				const confirmed = dialogs && typeof dialogs.confirm === 'function'
					? await dialogs.confirm({
						cancelLabel: getLabel('cancel', 'Cancel'),
						confirmLabel: getLabel('delete', 'Delete'),
						message: getLabel('delete_immediately_message', 'This permanently deletes the PufferDesk folder record. Apps and plugins are not deleted.'),
						title: getLabel('delete_immediately_title', 'Delete Immediately?')
					})
					: window.confirm(getLabel('delete_immediately_fallback_message', 'Delete this PufferDesk folder record immediately?'));

				if (confirmed) {
					folderManager.deleteTrashItem(payload.target);
				}
			}
		});

		register('trash.empty', {
			isEnabled() {
				return Boolean(
					folderManager
					&& typeof folderManager.emptyTrash === 'function'
					&& typeof folderManager.getTrashCount === 'function'
					&& folderManager.getTrashCount() > 0
				);
			},
			async run() {
				const actionConfig = getActionConfig('emptyTrash');
				let confirmed = false;

				if (dialogs && typeof dialogs.confirmActionDialog === 'function') {
					const result = await dialogs.confirmActionDialog(actionConfig);
					confirmed = Boolean(result && result.confirmed);
				} else if (dialogs && typeof dialogs.confirm === 'function') {
					confirmed = await dialogs.confirm(actionConfig);
				} else {
					confirmed = window.confirm('Empty Trash?');
				}

				if (confirmed) {
					folderManager.emptyTrash();
				}
			}
		});

		register('folder.add-app', {
			isEnabled(payload, detail) {
				const appId = payload.target || getFolderAppTargetFromDetail(detail);
				const folderId = payload.folderId || '';

				return Boolean(folderManager && appId && folderId && typeof folderManager.addAppToFolder === 'function' && folderManager.isUserFolder(folderId));
			},
			run(payload, detail) {
				folderManager.addAppToFolder(payload.target || getFolderAppTargetFromDetail(detail), payload.folderId);
			}
		});

		register('folder.remove-app', {
			isEnabled(payload, detail) {
				const appId = payload.target || getFolderAppTargetFromDetail(detail);
				const folderId = payload.folderId || (detail && detail.folderId) || '';

				return Boolean(folderManager && appId && folderId && typeof folderManager.removeAppFromFolder === 'function' && folderManager.isUserFolder(folderId));
			},
			run(payload, detail) {
				folderManager.removeAppFromFolder(payload.target || getFolderAppTargetFromDetail(detail), payload.folderId || (detail && detail.folderId) || '');
			}
		});

		register('folder.toolbar-display', {
			isEnabled(payload, detail) {
				return Boolean(getFolderToolbarWindow(detail) && normalizeFolderToolbarDisplayMode(payload.mode));
			},
			run(payload, detail) {
				const win = getFolderToolbarWindow(detail);
				const mode = normalizeFolderToolbarDisplayMode(payload.mode);
				const toolbar = win ? win.querySelector('.pdk-finder-toolbar') : null;

				if (!win || !mode) {
					return;
				}

				win.dataset.pdkFolderToolbarDisplay = mode;

				if (toolbar) {
					toolbar.dataset.pdkFolderToolbarDisplay = mode;
				}

				win.dispatchEvent(new window.CustomEvent('pufferDesk:folder-toolbar-display-change', {
					detail: {
						mode
					}
				}));
				refreshActiveMenu(Object.assign({}, activeDetail, detail || {}, {
					toolbarDisplay: mode,
					windowElement: win
				}));
			}
		});

		register('folder.set-sort-mode', {
			isEnabled(payload, detail) {
				return Boolean(
					launcher
					&& typeof launcher.setFolderSortMode === 'function'
					&& getFolderIdFromPayload(payload, detail)
					&& normalizeFolderExplorerSortMode(payload.mode)
				);
			},
			run(payload, detail) {
				launcher.setFolderSortMode(getFolderIdFromPayload(payload, detail), payload.mode, {
					windowElement: detail && detail.windowElement ? detail.windowElement : null
				});
				refreshActiveMenu(Object.assign({}, activeDetail, detail || {}, {
					folderSortMode: payload.mode
				}));
			}
		});

		register('folder.set-view-mode', {
			isEnabled(payload, detail) {
				return Boolean(
					launcher
					&& typeof launcher.setFolderViewMode === 'function'
					&& getFolderIdFromPayload(payload, detail)
					&& normalizeFolderExplorerViewMode(payload.mode)
				);
			},
			run(payload, detail) {
				launcher.setFolderViewMode(getFolderIdFromPayload(payload, detail), payload.mode, {
					windowElement: detail && detail.windowElement ? detail.windowElement : null
				});
				refreshActiveMenu(Object.assign({}, activeDetail, detail || {}, {
					folderViewMode: payload.mode
				}));
			}
		});

		register('open-about', {
			isEnabled(payload, detail) {
				return Boolean(launcher && typeof launcher.openAbout === 'function' && (payload.target || getAppTargetFromDetail(detail)));
			},
			run(payload, detail) {
				launcher.openAbout(payload.target || getAppTargetFromDetail(detail));
			}
		});

		register('open-site-about', {
			isEnabled() {
				return Boolean(launcher && typeof launcher.openSiteAbout === 'function');
			},
			run() {
				launcher.openSiteAbout();
			}
		});

		register('settings.open-panel', {
			isEnabled(payload) {
				return Boolean(launcher && typeof launcher.openSettingsPanel === 'function' && payload.panel);
			},
			run(payload) {
				launcher.openSettingsPanel(payload.panel);
			}
		});

		register('app.keep-in-dock', {
			isEnabled(payload, detail) {
				const appId = getAppIdFromPayload(payload, detail);

				return Boolean(api && appSurfaceManager && appMap.has(appId) && !isFixedDockApp(appId));
			},
			run(payload, detail) {
				return setAppDockPresence(getAppIdFromPayload(payload, detail), true);
			}
		});

		register('app.remove-from-dock', {
			isEnabled(payload, detail) {
				const appId = getAppIdFromPayload(payload, detail);

				return Boolean(api && appSurfaceManager && appMap.has(appId) && !isFixedDockApp(appId));
			},
			run(payload, detail) {
				return setAppDockPresence(getAppIdFromPayload(payload, detail), false);
			}
		});

		register('app.toggle-login-item', {
			isEnabled(payload, detail) {
				return Boolean(api && appMap.has(getAppIdFromPayload(payload, detail)));
			},
			run(payload, detail) {
				return toggleAppLoginItem(getAppIdFromPayload(payload, detail));
			}
		});

		register('open-url', {
			isEnabled(payload) {
				return Boolean(launcher && typeof launcher.openUrl === 'function' && (payload.url || payload.target));
			},
			run(payload) {
				launcher.openUrl(payload.url || payload.target, payload.title, payload.icon);
			}
		});

		register('navigate-url', {
			isEnabled(payload) {
				return Boolean(payload.url || payload.target);
			},
			run(payload) {
				window.location.href = payload.url || payload.target;
			}
		});

		register('open-external-url', {
			isEnabled(payload) {
				return Boolean(payload.url || payload.target);
			},
			run(payload) {
				window.open(payload.url || payload.target, '_blank', 'noopener');
			}
		});

		register('recent-items.clear', {
			isEnabled() {
				return Boolean(window.PufferDesk.menuBar && typeof window.PufferDesk.menuBar.clearRecentItems === 'function');
			},
			run() {
				window.PufferDesk.menuBar.clearRecentItems(config);
			}
		});

		register('shell.restart', {
			isEnabled() {
				return Boolean(config.shellUrl || window.location.href);
			},
			run() {
				return restartShell();
			}
		});

		register('shell.switch-classic', {
			isEnabled(payload) {
				return Boolean(payload.url || payload.target || config.classicUrl);
			},
			run(payload) {
				return switchToClassicAdmin(payload);
			}
		});

		register('shell.lock', {
			isEnabled(payload) {
				return Boolean(payload.url || payload.target || config.logoutUrl);
			},
			run(payload) {
				return logOut({
					target: payload.target || payload.url || config.logoutUrl
				}, 'lock');
			}
		});

		register('shell.sleep', {
			isEnabled(payload) {
				return Boolean(payload.url || payload.target || config.classicUrl);
			},
			run(payload) {
				return switchToClassicAdmin(payload, 'sleep');
			}
		});

		register('shell.shutdown', {
			isEnabled(payload) {
				return Boolean(payload.url || payload.target || config.classicUrl);
			},
			run(payload) {
				return switchToClassicAdmin(payload, 'shutdown');
			}
		});

		register('user.logout', {
			isEnabled(payload) {
				return Boolean(payload.url || payload.target);
			},
			run(payload) {
				return logOut(payload);
			}
		});

		register('session.reset-layout', {
			isEnabled() {
				return Boolean(config.storageKey && window.PufferDesk.session && window.PufferDesk.session.createSessionStore);
			},
			run() {
				skipWindowRestoreOnce();
				return clearSessionStore().finally(reloadShell);
			}
		});

		register('desktop.sort-icons', {
			isEnabled(payload) {
				return Boolean(desktopIconManager && typeof desktopIconManager.setSortMode === 'function' && payload.mode);
			},
			run(payload) {
				desktopIconManager.setSortMode(payload.mode);
				refreshActiveMenu(activeDetail);
			}
		});

		register('system.erase-content-settings', {
			isEnabled() {
				return Boolean(api && typeof api.post === 'function');
			},
			run() {
				return eraseContentAndSettings();
			}
		});

		register('widget.hide', {
			isEnabled(payload, detail) {
				return Boolean(widgetManager && typeof widgetManager.hideWidget === 'function' && getTargetWidget(detail));
			},
			run(payload, detail) {
				widgetManager.hideWidget(getTargetWidget(detail));
			}
		});

		register('window.focus', {
			isEnabled(payload, detail) {
				return Boolean(manager && typeof manager.focusWindow === 'function' && getTargetWindow(detail));
			},
			run(payload, detail) {
				manager.focusWindow(getTargetWindow(detail));
			}
		});

		register('window.focus-id', {
			isEnabled(payload) {
				return Boolean(manager && typeof manager.focusWindow === 'function' && getWindowById(payload.target));
			},
			run(payload) {
				manager.focusWindow(getWindowById(payload.target));
			}
		});

		register('window.close', {
			isEnabled(payload, detail) {
				return Boolean(manager && typeof manager.closeWindow === 'function' && getTargetWindow(detail));
			},
			run(payload, detail) {
				const win = getTargetWindow(detail);
				manager.closeWindow(win, win ? win.dataset.pdkAppWindow : '');
			}
		});

		register('window.minimize', {
			isEnabled(payload, detail) {
				return Boolean(manager && typeof manager.minimizeWindow === 'function' && getTargetWindow(detail));
			},
			run(payload, detail) {
				manager.minimizeWindow(getTargetWindow(detail));
			}
		});

		register('window.open-browser-tab', {
			isEnabled(payload, detail) {
				return Boolean(getWindowBrowserUrl(detail, payload.url || payload.target));
			},
			run(payload, detail) {
				window.open(getWindowBrowserUrl(detail, payload.url || payload.target), '_blank', 'noopener');
			}
		});

		register('window.reload', {
			isEnabled(payload, detail) {
				return Boolean(getTargetWindowFrame(detail));
			},
			run(payload, detail) {
				const frame = getTargetWindowFrame(detail);
				const src = frame ? frame.getAttribute('src') : '';

				if (!frame) {
					return;
				}

				try {
					if (frame.contentWindow && frame.contentWindow.location) {
						frame.contentWindow.location.reload();
						return;
					}
				} catch (error) {
					// Fall back to resetting the iframe source when direct reload is blocked.
				}

				if (src) {
					frame.setAttribute('src', src);
				}
			}
		});

		register('window.history-back', {
			isEnabled(payload, detail) {
				return Boolean(getTargetWindowFrame(detail));
			},
			run(payload, detail) {
				const frame = getTargetWindowFrame(detail);

				try {
					if (frame && frame.contentWindow && frame.contentWindow.history) {
						frame.contentWindow.history.back();
					}
				} catch (error) {}
			}
		});

		register('window.history-forward', {
			isEnabled(payload, detail) {
				return Boolean(getTargetWindowFrame(detail));
			},
			run(payload, detail) {
				const frame = getTargetWindowFrame(detail);

				try {
					if (frame && frame.contentWindow && frame.contentWindow.history) {
						frame.contentWindow.history.forward();
					}
				} catch (error) {}
			}
		});

		register('window.hide', {
			isEnabled(payload, detail) {
				return Boolean(manager && typeof manager.minimizeWindow === 'function' && getTargetWindow(detail));
			},
			run(payload, detail) {
				manager.minimizeWindow(getTargetWindow(detail));
			}
		});

		register('window.hide-others', {
			isEnabled(payload, detail) {
				return Boolean(manager && typeof manager.hideOtherWindows === 'function' && getTargetWindow(detail));
			},
			run(payload, detail) {
				manager.hideOtherWindows(getTargetWindow(detail));
			}
		});

		register('window.show-all', {
			isEnabled() {
				return Boolean(manager && typeof manager.showAllWindows === 'function' && typeof manager.hasHiddenWindows === 'function' && manager.hasHiddenWindows());
			},
			run() {
				manager.showAllWindows();
			}
		});

		register('window.toggle-maximize', {
			isEnabled(payload, detail) {
				return Boolean(manager && typeof manager.toggleMaximizeWindow === 'function' && getTargetWindow(detail));
			},
			run(payload, detail) {
				manager.toggleMaximizeWindow(getTargetWindow(detail));
			}
		});

		return {
			canExecute,
			execute,
			register,
			setActiveDetail
		};
	};
})();
