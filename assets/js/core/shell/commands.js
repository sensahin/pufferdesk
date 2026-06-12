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
		const stickyNoteManager = context.stickyNoteManager || null;
		const clipboard = context.clipboard || window.PufferDesk.clipboard || null;
		const dialogs = context.dialogs || null;
		const reopenPolicy = context.reopenPolicy || null;
		const config = context.config && typeof context.config === 'object' ? context.config : {};
		const api = window.PufferDesk.services && window.PufferDesk.services.api ? window.PufferDesk.services.api : null;
		const apps = Array.isArray(config.apps) ? config.apps : [];
		const appMap = new Map(apps.map((app) => [app.id, app]));
		const labels = config.menu && config.menu.labels && typeof config.menu.labels === 'object' ? config.menu.labels : {};
		const notificationLabels = config.notifications && config.notifications.labels && typeof config.notifications.labels === 'object'
			? config.notifications.labels
			: {};
		const notificationSourceIds = config.notifications && config.notifications.sourceIds && typeof config.notifications.sourceIds === 'object'
			? config.notifications.sourceIds
			: {};
		const settingsConfig = config.settings && typeof config.settings === 'object' ? config.settings : {};
		const settingsLabels = settingsConfig.labels && typeof settingsConfig.labels === 'object' ? settingsConfig.labels : {};
		const commandIds = (window.PufferDesk.shell && window.PufferDesk.shell.commands) || {};
		const appIds = window.PufferDesk.apps && window.PufferDesk.apps.ids ? window.PufferDesk.apps.ids : {};
		const contextTargets = window.PufferDesk.shell.contextMenuConstants
			? window.PufferDesk.shell.contextMenuConstants.targets || {}
			: {};
		const windowKinds = window.PufferDesk.session && window.PufferDesk.session.workspace
			? window.PufferDesk.session.workspace.windowKinds || {}
			: {};
		const folderWindowKind = windowKinds.FOLDER;
		const dragDropConstants = window.PufferDesk.dragDrop && window.PufferDesk.dragDrop.constants ? window.PufferDesk.dragDrop.constants : {};
		const containerTypes = dragDropConstants.containerTypes || {};
		const domEventNames = window.PufferDesk.events && window.PufferDesk.events.domNames ? window.PufferDesk.events.domNames : {};
		const storageKeys = window.PufferDesk.session && window.PufferDesk.session.storageKeys
			? window.PufferDesk.session.storageKeys
			: {};
		const appSurfaceManager = window.PufferDesk.apps && typeof window.PufferDesk.apps.createAppSurfaceManager === 'function'
			? window.PufferDesk.apps.createAppSurfaceManager(shell, config, {
				apps,
				desktopIconManager,
				folderManager,
				preserveUnknown: true
			})
			: null;
		const appPreferences = window.PufferDesk.apps && typeof window.PufferDesk.apps.createAppPreferenceStore === 'function'
			? window.PufferDesk.apps.createAppPreferenceStore(config, {
				api,
				apps,
				appSurfaceManager
			})
			: null;
		const commands = new Map();
		const folderViewModes = window.PufferDesk.apps && window.PufferDesk.apps.folderViewModes
			? window.PufferDesk.apps.folderViewModes
			: null;
		let activeDetail = { kind: contextTargets.DESKTOP };

		function getLabel(key, fallback) {
			const value = labels[key];

			return typeof value === 'string' && value ? value : (fallback || key);
		}

		function formatLabel(key, fallback, values = []) {
			const templateFallback = Array.isArray(fallback) ? key : fallback;
			const templateValues = Array.isArray(fallback) ? fallback : values;

			if (window.PufferDesk.config && typeof window.PufferDesk.config.formatFromLabels === 'function') {
				return window.PufferDesk.config.formatFromLabels(labels, key, templateFallback || key, templateValues);
			}

			return getLabel(key, templateFallback);
		}

		function playSoundEvent(key, fallback) {
			const soundEvents = window.PufferDesk.services && window.PufferDesk.services.soundEvents
				? window.PufferDesk.services.soundEvents
				: null;

			return soundEvents && typeof soundEvents.play === 'function'
				? soundEvents.play(key, fallback)
				: false;
		}

		function notifyCommandError(error) {
			playSoundEvent('appError', 'app.error');

			if (window.PufferDesk.notificationStore && typeof window.PufferDesk.notificationStore.notify === 'function') {
				window.PufferDesk.notificationStore.notify({
					message: error && error.message ? error.message : getNotificationLabel('commandFailedMessage'),
					sound: false,
					source: getNotificationSourceId('PUFFERDESK'),
					sourceLabel: getNotificationLabel('pufferdeskSource'),
					title: getNotificationLabel('commandFailedTitle'),
					toast: true,
					type: 'error'
				});
			}
		}

		function getNotificationLabel(key) {
			const value = notificationLabels[key];

			return typeof value === 'string' && value ? value : key;
		}

		function getNotificationSourceId(key) {
			const value = notificationSourceIds[key];

			return typeof value === 'string' && value ? value : key;
		}

		function getSettingsLabel(path) {
			const value = String(path || '').split('.').reduce((current, key) => (
				current && Object.prototype.hasOwnProperty.call(current, key) ? current[key] : undefined
			), settingsLabels);

			return typeof value === 'string' && value ? value : path;
		}

		function getSettingsDomainAction(domainKey) {
			return window.PufferDesk.config && typeof window.PufferDesk.config.getSettingAction === 'function'
				? window.PufferDesk.config.getSettingAction(domainKey)
				: '';
		}

		function getSearchInput() {
			return shell.querySelector('[data-pdk-search]');
		}

		function getTargetWindow(detail = activeDetail) {
			if (detail && detail.windowless === true) {
				return null;
			}

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
			return folderViewModes && typeof folderViewModes.normalizeToolbarDisplayMode === 'function'
				? folderViewModes.normalizeToolbarDisplayMode(mode, '')
				: '';
		}

		function normalizeFolderExplorerSortMode(mode) {
			return folderViewModes && typeof folderViewModes.normalizeExplorerSortMode === 'function'
				? folderViewModes.normalizeExplorerSortMode(mode, '')
				: '';
		}

		function getFolderLayoutFromDetail(detail = activeDetail) {
			const win = getTargetWindow(detail);

			return win && win.dataset && win.dataset.pdkFolderLayout === 'file-explorer' ? 'file-explorer' : 'finder';
		}

		function normalizeFolderExplorerGroupMode(mode, detail = activeDetail) {
			return folderViewModes && typeof folderViewModes.normalizeExplorerGroupMode === 'function'
				? folderViewModes.normalizeExplorerGroupMode(mode, '', getFolderLayoutFromDetail(detail))
				: '';
		}

		function normalizeFolderExplorerViewMode(mode) {
			if (folderViewModes && typeof folderViewModes.isKnown === 'function') {
				return folderViewModes.isKnown(mode) ? mode : '';
			}

			return '';
		}

		function getFolderToolbarWindow(detail = activeDetail) {
			const win = getTargetWindow(detail);

			if (!win || !win.dataset || win.dataset.pdkWindowKind !== folderWindowKind) {
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
			const iframeQueryKey = window.PufferDesk.config.getRouterQueryKey('iframe');

			if (!url) {
				return '';
			}

			if (!iframeQueryKey) {
				return url;
			}

			try {
				const next = new URL(url, window.location.origin);
				next.searchParams.delete(iframeQueryKey);
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
			let result = null;

			try {
				result = command.run(getPayload(item), detail);
			} catch (error) {
				if (window.console && typeof window.console.error === 'function') {
					window.console.error(getNotificationLabel('commandFailedTitle'), error);
				}
				notifyCommandError(error);
				return true;
			}

			if (result && typeof result.catch === 'function') {
				result.catch((error) => {
					if (window.console && typeof window.console.error === 'function') {
						window.console.error(getNotificationLabel('commandFailedTitle'), error);
					}
					notifyCommandError(error);
				});
			}
			return true;
		}

		function setActiveDetail(detail = {}) {
			activeDetail = detail && typeof detail === 'object' ? detail : { kind: contextTargets.DESKTOP };
		}

		function refreshActiveMenu(detail = activeDetail) {
			shell.dispatchEvent(new window.CustomEvent(domEventNames.ACTIVE_WINDOW_CHANGE, {
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

		function uniqueIds(ids) {
			return Array.from(new Set((Array.isArray(ids) ? ids : [])
				.map((id) => String(id || '').trim())
				.filter(Boolean)));
		}

		function canMoveFolderToTrash(folderId) {
			return Boolean(
				folderManager
				&& typeof folderManager.isUserFolder === 'function'
				&& typeof folderManager.moveFolderToTrash === 'function'
				&& folderManager.isUserFolder(folderId)
			);
		}

		function getSelectedDesktopFolderIds(targetId) {
			if (!desktopIconManager || typeof desktopIconManager.getSelectedIconDetails !== 'function') {
				return [];
			}

			const ids = uniqueIds(desktopIconManager.getSelectedIconDetails()
				.filter((item) => item && (item.kind === 'folder' || item.context === contextTargets.DESKTOP_FOLDER))
				.map((item) => item.id))
				.filter(canMoveFolderToTrash);

			return ids.length > 1 && ids.includes(targetId) ? ids : [];
		}

		function getSelectedFolderWindowFolderIds(targetId, detail = {}) {
			if (!launcher || typeof launcher.getSelectedFolderItems !== 'function') {
				return [];
			}

			const win = detail && detail.windowElement ? detail.windowElement : null;
			const parentFolderId = detail && detail.folderId
				? detail.folderId
				: win && win.dataset
					? win.dataset.pdkFolderWindow || ''
					: '';
			if (!parentFolderId) {
				return [];
			}

			const ids = uniqueIds(launcher.getSelectedFolderItems(parentFolderId, win)
				.filter((item) => item && item.type === 'folder')
				.map((item) => item.id))
				.filter(canMoveFolderToTrash);

			return ids.length > 1 && ids.includes(targetId) ? ids : [];
		}

		function getFolderIdsForTrash(payload = {}, detail = {}) {
			const targetId = getFolderIdFromPayload(payload, detail);

			if (!targetId || !canMoveFolderToTrash(targetId)) {
				return [];
			}

			const selectedIds = (detail && (detail.type === contextTargets.FOLDER || detail.kind === contextTargets.FOLDER))
				? getSelectedFolderWindowFolderIds(targetId, detail)
				: getSelectedDesktopFolderIds(targetId);

			return selectedIds.length ? selectedIds : [targetId];
		}

		function getFolderTabIdFromPayload(payload = {}, detail = {}) {
			return payload.tabId || payload.target || (detail && detail.id) || '';
		}

		function getDocumentIdFromPayload(payload = {}, detail = {}) {
			const raw = payload.documentId || payload.target || (detail && detail.trashItemId) || (detail && detail.id) || '';
			const direct = Number.parseInt(raw, 10);
			const match = String(raw || '').match(/(\d+)$/);

			if (Number.isFinite(direct) && direct > 0) {
				return direct;
			}

			return match ? Number.parseInt(match[1], 10) || 0 : 0;
		}

		function getSidebarFavoriteItemFromPayload(payload = {}, detail = {}) {
			const commandPayload = payload && typeof payload === 'object' ? payload : {};
			const contextDetail = detail && typeof detail === 'object' ? detail : {};
			const dataset = contextDetail.metadata && contextDetail.metadata.dataset && typeof contextDetail.metadata.dataset === 'object'
				? contextDetail.metadata.dataset
				: contextDetail.targetElement && contextDetail.targetElement.dataset
					? contextDetail.targetElement.dataset
					: {};
			const type = commandPayload.type
				|| commandPayload.itemType
				|| dataset.pdkFolderSidebarFavoriteType
				|| contextDetail.itemType
				|| (contextDetail.type === contextTargets.DOCUMENT ? 'document' : '')
				|| (contextDetail.type === contextTargets.FOLDER || contextDetail.type === contextTargets.DESKTOP_FOLDER ? 'folder' : '');
			const targetId = commandPayload.targetId
				|| commandPayload.documentId
				|| commandPayload.folderId
				|| dataset.pdkFolderSidebarTargetId
				|| commandPayload.target
				|| (type === 'document' ? getDocumentIdFromPayload(commandPayload, contextDetail) : getFolderIdFromPayload(commandPayload, contextDetail));

			return {
				icon: commandPayload.icon || '',
				id: commandPayload.favoriteId || commandPayload.id || (contextDetail.type === contextTargets.FOLDER_SIDEBAR ? contextDetail.id : ''),
				label: commandPayload.label || contextDetail.label || '',
				targetId,
				type
			};
		}

		function getFolderCreateParentId(payload = {}, detail = {}) {
			if (payload.parentId) {
				return payload.parentId;
			}

			if (payload.target) {
				return payload.target;
			}

			if (detail && detail.windowElement && detail.windowElement.dataset && detail.windowElement.dataset.pdkWindowKind === folderWindowKind) {
				return detail.folderId || detail.windowElement.dataset.pdkFolderWindow || detail.id || '';
			}

			if (detail && (detail.type === contextTargets.FOLDER_TOOLBAR || detail.kind === contextTargets.FOLDER_TOOLBAR)) {
				return detail.folderId || detail.id || '';
			}

			return '';
		}

		function getAppIdFromPayload(payload = {}, detail = {}) {
			return payload.target || payload.appId || getAppTargetFromDetail(detail) || (detail && detail.id) || '';
		}

		function isFixedDockApp(appId) {
			return Boolean(appPreferences && appPreferences.isFixedDockApp(appId));
		}

		function setAppDockPresence(appId, keepInDock) {
			if (!appPreferences) {
				return Promise.reject(new Error(getSettingsLabel('status.serviceUnavailable')));
			}

			return appPreferences.setDockPresence(appId, keepInDock, {
				errorText: getSettingsLabel('status.appLocationsSaveError'),
				fixedMessage: formatLabel('fixed_launcher_placement_format', [getLabel('launcher')]),
				unavailableText: getLabel('app_unavailable')
			});
		}

		function toggleAppLoginItem(appId) {
			if (!appPreferences) {
				return Promise.reject(new Error(getSettingsLabel('status.serviceUnavailable')));
			}

			return appPreferences.toggleLoginItem(appId, {
				errorText: getSettingsLabel('status.loginItemsSaveError')
			});
		}

		function getSystemActions() {
			return config.system && config.system.actions && typeof config.system.actions === 'object'
				? config.system.actions
				: {};
		}

		function getActionDefaults() {
			return {};
		}

		function getActionConfig(actionKey) {
			const actions = getSystemActions();
			return Object.assign({}, getActionDefaults(actionKey), actions[actionKey] && typeof actions[actionKey] === 'object' ? actions[actionKey] : {});
		}

		function getDialogConfig() {
			return config.dialogs && typeof config.dialogs === 'object' ? config.dialogs : {};
		}

		function getConfirmationPolicy(policyKey) {
			const dialogsConfig = getDialogConfig();
			const confirmations = dialogsConfig.confirmations && typeof dialogsConfig.confirmations === 'object'
				? dialogsConfig.confirmations
				: {};
			const policy = confirmations[policyKey];

			return policy && typeof policy === 'object' ? policy : {};
		}

		function isConfirmationEnabled(policyKey, fallback = true) {
			const policy = getConfirmationPolicy(policyKey);

			return typeof policy.enabled === 'boolean' ? policy.enabled : fallback;
		}

		function getConfirmationDefaultAction(policy) {
			return policy && (policy.default_action === 'cancel' || policy.defaultAction === 'cancel') ? 'cancel' : 'confirm';
		}

		function formatDateTime(value) {
			const date = new Date(value || '');

			return Number.isFinite(date.getTime()) ? date.toLocaleString() : '';
		}

		function getMoveFolderToTrashDialogOptions(folder, folderLabel) {
			const policy = getConfirmationPolicy('move_folder_to_trash');
			const variant = policy.variant || 'move-to-trash';
			const createdAt = formatDateTime(folder && folder.createdAt ? folder.createdAt : '');
			const detailMeta = createdAt ? [`${getLabel('sort_date_created')}: ${createdAt}`] : [];
			const confirmationTitle = getLabel('move_folder_to_trash_confirmation');
			const fallbackTitle = formatLabel('move_folder_to_trash_title_format', [folderLabel]);
			const isSystemDeleteDialog = variant === 'delete-folder';

			return {
				cancelLabel: getLabel('move_folder_to_trash_cancel_label', getLabel('cancel')),
				confirmLabel: getLabel('move_folder_to_trash_confirm_label', getLabel('move_to_trash')),
				defaultAction: getConfirmationDefaultAction(policy),
				icon: policy.icon || (folder && folder.icon) || 'dashicons-category',
				item: {
					icon: (folder && folder.icon) || policy.icon || 'dashicons-category',
					label: folderLabel,
					meta: detailMeta
				},
				message: isSystemDeleteDialog
					? ''
					: getLabel('move_folder_to_trash_message'),
				soundEventKey: isSystemDeleteDialog ? 'dialogDestructive' : 'dialogWarning',
				title: isSystemDeleteDialog ? confirmationTitle : fallbackTitle,
				variant,
				windowTitle: getLabel('move_folder_to_trash_window_title')
			};
		}

		function getMoveFoldersToTrashDialogOptions(folders) {
			if (!Array.isArray(folders) || folders.length <= 1) {
				const folder = Array.isArray(folders) && folders.length ? folders[0] : null;
				const folderLabel = folder && folder.label ? folder.label : getLabel('folder');

				return getMoveFolderToTrashDialogOptions(folder, folderLabel);
			}

			const policy = getConfirmationPolicy('move_folder_to_trash');
			const variant = policy.variant || 'move-to-trash';
			const isSystemDeleteDialog = variant === 'delete-folder';
			const countLabel = formatLabel('selected_folder_count_format', [folders.length]);

			return {
				cancelLabel: getLabel('move_folder_to_trash_cancel_label', getLabel('cancel')),
				confirmLabel: getLabel('move_folders_to_trash_confirm_label', getLabel('move_folder_to_trash_confirm_label', getLabel('move_to_trash'))),
				defaultAction: getConfirmationDefaultAction(policy),
				icon: policy.icon || 'dashicons-category',
				item: {
					icon: policy.icon || 'dashicons-category',
					label: countLabel,
					meta: []
				},
				message: isSystemDeleteDialog
					? ''
					: getLabel('move_folders_to_trash_message'),
				soundEventKey: isSystemDeleteDialog ? 'dialogDestructive' : 'dialogWarning',
				title: isSystemDeleteDialog
					? getLabel('move_folders_to_trash_confirmation')
					: formatLabel('move_folders_to_trash_title_format', [folders.length]),
				variant,
				windowTitle: getLabel('move_folders_to_trash_window_title', getLabel('move_folder_to_trash_window_title'))
			};
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
				const keys = [];

				for (let index = 0; index < storage.length; index += 1) {
					const key = storage.key(index);

					if (typeof storageKeys.isWorkspaceSessionKey === 'function' && storageKeys.isWorkspaceSessionKey(key, userId)) {
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

		function clearClipboard() {
			if (clipboard && typeof clipboard.clear === 'function') {
				clipboard.clear();
			}
		}

		function cleanupClipboard(options = {}) {
			if (clipboard && typeof clipboard.cleanup === 'function') {
				return clipboard.cleanup(options);
			}

			return Promise.resolve(false);
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

			clearClipboard();

			if (!api || typeof api.post !== 'function') {
				throw new Error(getSettingsLabel('status.serviceUnavailable'));
			}

			const resetAction = getSettingsDomainAction('RESET');
			if (!resetAction) {
				throw new Error(getSettingsLabel('status.serviceUnavailable'));
			}

			if (dialogs && typeof dialogs.showBlockingOverlay === 'function') {
				overlay = dialogs.showBlockingOverlay(actionConfig.overlayMessage || '');
			}

			try {
				const result = await api.post(resetAction, {
					profile: 'erase_content_settings'
				});

				if (!result || !result.success) {
					const message = result && result.data && result.data.message
						? result.data.message
						: getSettingsLabel('status.settingsResetError');
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

		register(commandIds.NOOP, {
			run() {}
		});

		register(commandIds.OPEN_APP, {
			isEnabled(payload) {
				return Boolean(launcher && typeof launcher.openApp === 'function' && payload.target);
			},
			run(payload) {
				launcher.openApp(payload.target);
			}
		});

		register(commandIds.OPEN_FOLDER, {
			isEnabled(payload) {
				return Boolean(launcher && typeof launcher.openFolder === 'function' && payload.target);
			},
			run(payload) {
				launcher.openFolder(payload.target);
			}
		});

		register(commandIds.OPEN_FOLDER_TAB, {
			isEnabled(payload, detail) {
				return Boolean(launcher && typeof launcher.openFolderTab === 'function' && getFolderIdFromPayload(payload, detail));
			},
			run(payload, detail) {
				launcher.openFolderTab(getFolderIdFromPayload(payload, detail), {
					windowElement: detail && detail.windowElement ? detail.windowElement : null
				});
			}
		});

		register(commandIds.OPEN_FOLDER_WINDOW, {
			isEnabled(payload, detail) {
				return Boolean(launcher && typeof launcher.openFolderWindow === 'function' && getFolderIdFromPayload(payload, detail));
			},
			run(payload, detail) {
				launcher.openFolderWindow(getFolderIdFromPayload(payload, detail), {
					windowElement: detail && detail.windowElement ? detail.windowElement : null
				});
			}
		});

		register(commandIds.FOLDER_CREATE, {
			isEnabled(payload, detail) {
				const parentId = getFolderCreateParentId(payload, detail);

				return Boolean(
					folderManager
					&& typeof folderManager.createFolder === 'function'
					&& parentId !== appIds.TRASH
				);
			},
			run(payload, detail) {
				const parentId = getFolderCreateParentId(payload, detail);
				const folder = folderManager.createFolder(getLabel('untitled_folder'), [], {
					parentId: parentId || containerTypes.DESKTOP,
					point: detail && detail.contextPoint ? detail.contextPoint : null
				});
				if (folder && (!parentId || parentId === containerTypes.DESKTOP) && typeof folderManager.startInlineRename === 'function') {
					folderManager.startInlineRename(folder.id);
				}
			}
		});

		register(commandIds.FOLDER_GET_INFO, {
			isEnabled(payload, detail) {
				return Boolean(launcher && typeof launcher.openFolderInfo === 'function' && getFolderIdFromPayload(payload, detail));
			},
			run(payload, detail) {
				launcher.openFolderInfo(getFolderIdFromPayload(payload, detail));
			}
		});

		register(commandIds.FOLDER_REFRESH, {
			isEnabled(payload, detail) {
				return Boolean(launcher && typeof launcher.refreshFolderWindow === 'function' && getFolderIdFromPayload(payload, detail));
			},
			run(payload, detail) {
				launcher.refreshFolderWindow(getFolderIdFromPayload(payload, detail));
				return cleanupClipboard({
					validate: true
				});
			}
		});

		register(commandIds.DESKTOP_REFRESH, {
			isEnabled() {
				return Boolean(appSurfaceManager || folderManager || desktopIconManager);
			},
			run() {
				refreshDesktop();
				return cleanupClipboard({
					validate: true
				});
			}
		});

		register(commandIds.DOCUMENT_NEW_STICKY_NOTE, {
			isEnabled() {
				return Boolean(stickyNoteManager && typeof stickyNoteManager.createStickyNote === 'function');
			},
			run(payload, detail) {
				stickyNoteManager.createStickyNote(detail && detail.contextPoint ? detail.contextPoint : {});
			}
		});

		register(commandIds.DOCUMENT_OPEN_STICKY_NOTES, {
			isEnabled() {
				return Boolean(stickyNoteManager && typeof stickyNoteManager.openStickyNotes === 'function');
			},
			run(payload, detail) {
				return stickyNoteManager.openStickyNotes(detail && detail.contextPoint ? detail.contextPoint : {});
			}
		});

		register(commandIds.DOCUMENT_OPEN, {
			isEnabled(payload, detail) {
				return Boolean(launcher && typeof launcher.openDocumentById === 'function' && getDocumentIdFromPayload(payload, detail));
			},
			run(payload, detail) {
				return launcher.openDocumentById(getDocumentIdFromPayload(payload, detail));
			}
		});

		register(commandIds.CLIPBOARD_COPY, {
			isEnabled(payload, detail) {
				return Boolean(clipboard && typeof clipboard.canCopy === 'function' && clipboard.canCopy(detail));
			},
			run(payload, detail) {
				return clipboard.copy(detail);
			}
		});

		register(commandIds.CLIPBOARD_CUT, {
			isEnabled(payload, detail) {
				return Boolean(clipboard && typeof clipboard.canCut === 'function' && clipboard.canCut(detail));
			},
			run(payload, detail) {
				return clipboard.cut(detail);
			}
		});

		register(commandIds.CLIPBOARD_PASTE, {
			isEnabled(payload, detail) {
				return Boolean(clipboard && typeof clipboard.canPaste === 'function' && clipboard.canPaste(detail));
			},
			run(payload, detail) {
				return clipboard.paste(detail);
			}
		});

		register(commandIds.DESKTOP_ICON_RENAME, {
			isEnabled(payload, detail) {
				return Boolean(
					desktopIconManager
					&& typeof desktopIconManager.startInlineRename === 'function'
					&& detail
					&& detail.type === contextTargets.DESKTOP_APP
					&& (payload.target || detail.id) === appIds.TRASH
				);
			},
			run(payload, detail) {
				desktopIconManager.startInlineRename({
					iconElement: detail && detail.targetElement ? detail.targetElement : null,
					id: payload.target || (detail && detail.id) || '',
					kind: 'app'
				});
			}
		});

		register(commandIds.FOLDER_TAB_CLOSE, {
			isEnabled(payload, detail) {
				return Boolean(launcher && typeof launcher.closeFolderTab === 'function' && getTargetWindow(detail) && getFolderTabIdFromPayload(payload, detail));
			},
			run(payload, detail) {
				launcher.closeFolderTab(getTargetWindow(detail), getFolderTabIdFromPayload(payload, detail));
			}
		});

		register(commandIds.FOLDER_TAB_CLOSE_OTHERS, {
			isEnabled(payload, detail) {
				return Boolean(launcher && typeof launcher.closeOtherFolderTabs === 'function' && getTargetWindow(detail) && getFolderTabIdFromPayload(payload, detail));
			},
			run(payload, detail) {
				launcher.closeOtherFolderTabs(getTargetWindow(detail), getFolderTabIdFromPayload(payload, detail));
			}
		});

		register(commandIds.FOLDER_TAB_CLOSE_RIGHT, {
			isEnabled(payload, detail) {
				return Boolean(launcher && typeof launcher.closeFolderTabsToRight === 'function' && getTargetWindow(detail) && getFolderTabIdFromPayload(payload, detail));
			},
			run(payload, detail) {
				launcher.closeFolderTabsToRight(getTargetWindow(detail), getFolderTabIdFromPayload(payload, detail));
			}
		});

		register(commandIds.FOLDER_TAB_DUPLICATE, {
			isEnabled(payload, detail) {
				return Boolean(launcher && typeof launcher.duplicateFolderTab === 'function' && getTargetWindow(detail) && getFolderTabIdFromPayload(payload, detail));
			},
			run(payload, detail) {
				launcher.duplicateFolderTab(getTargetWindow(detail), getFolderTabIdFromPayload(payload, detail));
			}
		});

		register(commandIds.FOLDER_RENAME, {
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
				const folderItemTarget = detail && detail.targetElement && typeof detail.targetElement.closest === 'function'
					? detail.targetElement.closest('.pdk-folder-launcher')
					: null;
				if (
					folderItemTarget
					&& launcher
					&& typeof launcher.startInlineRenameFolderItem === 'function'
					&& launcher.startInlineRenameFolderItem(folderId, {
						parentFolderId: detail && detail.folderId ? detail.folderId : '',
						targetElement: folderItemTarget,
						windowElement: getTargetWindow(detail)
					})
				) {
					return;
				}

				folderManager.startInlineRename(folderId);
			}
		});

		register(commandIds.FOLDER_DELETE, {
			isEnabled(payload, detail) {
				return getFolderIdsForTrash(payload, detail).length > 0;
			},
			async run(payload, detail) {
				const folderIds = getFolderIdsForTrash(payload, detail);
				const folders = folderIds.map((folderId) => folderManager.getFolder(folderId)).filter(Boolean);
				let confirmed = true;

				if (!folderIds.length) {
					return;
				}

				if (isConfirmationEnabled('move_folder_to_trash', false)) {
					const dialogOptions = getMoveFoldersToTrashDialogOptions(folders);
					confirmed = dialogs && typeof dialogs.confirm === 'function'
						? await dialogs.confirm(dialogOptions)
						: window.confirm(`${dialogOptions.title}\n\n${dialogOptions.message || ''}`);
				}

				if (confirmed) {
					folderIds.forEach((folderId) => {
						folderManager.moveFolderToTrash(folderId);
					});
				}
			}
		});

		register(commandIds.TRASH_RESTORE, {
			isEnabled(payload) {
				return Boolean(folderManager && typeof folderManager.restoreTrashItem === 'function' && payload.target);
			},
			run(payload) {
				return folderManager.restoreTrashItem(payload.target);
			}
		});

		register(commandIds.TRASH_DELETE_IMMEDIATELY, {
			isEnabled(payload) {
				return Boolean(folderManager && typeof folderManager.deleteTrashItem === 'function' && payload.target);
			},
			async run(payload) {
				const confirmed = dialogs && typeof dialogs.confirm === 'function'
					? await dialogs.confirm({
						cancelLabel: getLabel('cancel'),
						confirmLabel: getLabel('delete'),
						message: getLabel('delete_immediately_message'),
						soundEventKey: 'dialogDestructive',
						title: getLabel('delete_immediately_title')
					})
					: window.confirm(getLabel('delete_immediately_fallback_message'));

				if (confirmed) {
					return folderManager.deleteTrashItem(payload.target);
				}
			}
		});

		register(commandIds.TRASH_EMPTY, {
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
					confirmed = window.confirm(getLabel('empty_trash_confirmation'));
				}

				if (confirmed) {
					const emptied = await folderManager.emptyTrash();
					if (emptied) {
						playSoundEvent('trashEmpty');
					}
				}
			}
		});

		register(commandIds.FOLDER_ADD_APP, {
			isEnabled(payload, detail) {
				const appId = payload.target || getFolderAppTargetFromDetail(detail);
				const folderId = payload.folderId || '';

				return Boolean(folderManager && appId && folderId && typeof folderManager.addAppToFolder === 'function' && folderManager.isUserFolder(folderId));
			},
			run(payload, detail) {
				folderManager.addAppToFolder(payload.target || getFolderAppTargetFromDetail(detail), payload.folderId);
			}
		});

		register(commandIds.FOLDER_REMOVE_APP, {
			isEnabled(payload, detail) {
				const appId = payload.target || getFolderAppTargetFromDetail(detail);
				const folderId = payload.folderId || (detail && detail.folderId) || '';

				return Boolean(folderManager && appId && folderId && typeof folderManager.removeAppFromFolder === 'function' && folderManager.isUserFolder(folderId));
			},
			run(payload, detail) {
				folderManager.removeAppFromFolder(payload.target || getFolderAppTargetFromDetail(detail), payload.folderId || (detail && detail.folderId) || '');
			}
		});

		register(commandIds.FOLDER_SIDEBAR_ADD, {
			isEnabled(payload, detail) {
				return Boolean(
					launcher
					&& typeof launcher.canAddFolderSidebarFavorite === 'function'
					&& launcher.canAddFolderSidebarFavorite(getSidebarFavoriteItemFromPayload(payload, detail))
				);
			},
			run(payload, detail) {
				return launcher.addFolderSidebarFavorite(getSidebarFavoriteItemFromPayload(payload, detail));
			}
		});

		register(commandIds.FOLDER_SIDEBAR_REMOVE, {
			isEnabled(payload, detail) {
				const favorite = getSidebarFavoriteItemFromPayload(payload, detail);

				return Boolean(
					launcher
					&& typeof launcher.removeFolderSidebarFavorite === 'function'
					&& favorite
					&& (favorite.id || favorite.targetId)
					&& detail
					&& detail.type === contextTargets.FOLDER_SIDEBAR
					&& detail.targetElement
					&& detail.targetElement.dataset
					&& detail.targetElement.dataset.pdkFolderSidebarRemovable === '1'
				);
			},
			run(payload, detail) {
				return launcher.removeFolderSidebarFavorite(getSidebarFavoriteItemFromPayload(payload, detail));
			}
		});

		register(commandIds.FOLDER_DELETE_SELECTED, {
			isEnabled(payload, detail) {
				const folderId = getFolderIdFromPayload(payload, detail);

				return Boolean(
					launcher
					&& typeof launcher.hasSelectedFolderItems === 'function'
					&& folderId
					&& launcher.hasSelectedFolderItems(folderId, {
						targetElement: detail && detail.targetElement ? detail.targetElement : null,
						windowElement: detail && detail.windowElement ? detail.windowElement : null
					})
				);
			},
			run(payload, detail) {
				return launcher.deleteSelectedFolderItems(getFolderIdFromPayload(payload, detail), {
					targetElement: detail && detail.targetElement ? detail.targetElement : null,
					windowElement: detail && detail.windowElement ? detail.windowElement : null
				});
			}
		});

		register(commandIds.FOLDER_DELETE_SELECTED_IMMEDIATELY, {
			isEnabled(payload, detail) {
				const folderId = getFolderIdFromPayload(payload, detail);

				return Boolean(
					launcher
					&& typeof launcher.hasSelectedFolderItems === 'function'
					&& folderId
					&& launcher.hasSelectedFolderItems(folderId, {
						targetElement: detail && detail.targetElement ? detail.targetElement : null,
						windowElement: detail && detail.windowElement ? detail.windowElement : null
					})
				);
			},
			run(payload, detail) {
				return launcher.deleteSelectedFolderItemsImmediately(getFolderIdFromPayload(payload, detail), {
					targetElement: detail && detail.targetElement ? detail.targetElement : null,
					windowElement: detail && detail.windowElement ? detail.windowElement : null
				});
			}
		});

		register(commandIds.FOLDER_TOOLBAR_DISPLAY, {
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

				win.dispatchEvent(new window.CustomEvent(domEventNames.FOLDER_TOOLBAR_DISPLAY_CHANGE, {
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

		register(commandIds.FOLDER_SET_SORT_MODE, {
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

		register(commandIds.FOLDER_SET_GROUP_MODE, {
			isEnabled(payload, detail) {
				return Boolean(
					launcher
					&& typeof launcher.setFolderGroupMode === 'function'
					&& getFolderIdFromPayload(payload, detail)
					&& normalizeFolderExplorerGroupMode(payload.mode, detail)
				);
			},
			run(payload, detail) {
				launcher.setFolderGroupMode(getFolderIdFromPayload(payload, detail), payload.mode, {
					windowElement: detail && detail.windowElement ? detail.windowElement : null
				});
				refreshActiveMenu(Object.assign({}, activeDetail, detail || {}, {
					folderGroupMode: payload.mode
				}));
			}
		});

		register(commandIds.FOLDER_SET_VIEW_MODE, {
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

		register(commandIds.OPEN_ABOUT, {
			isEnabled(payload, detail) {
				return Boolean(launcher && typeof launcher.openAbout === 'function' && (payload.target || getAppTargetFromDetail(detail)));
			},
			run(payload, detail) {
				launcher.openAbout(payload.target || getAppTargetFromDetail(detail));
			}
		});

		register(commandIds.OPEN_SITE_ABOUT, {
			isEnabled() {
				return Boolean(launcher && typeof launcher.openSiteAbout === 'function');
			},
			run() {
				launcher.openSiteAbout();
			}
		});

		register(commandIds.HELP_KEYBOARD_SHORTCUTS, {
			isEnabled() {
				return Boolean(
					manager
					&& typeof manager.createWindow === 'function'
					&& window.PufferDesk.apps
					&& typeof window.PufferDesk.apps.createKeyboardShortcutsApp === 'function'
				);
			},
			run() {
				const title = getLabel('keyboard_shortcuts');
				const modalWidth = Math.max(480, Math.min(640, window.innerWidth - 280));
				const modalHeight = Math.max(420, Math.min(500, window.innerHeight - 220));

				manager.createWindow({
					appId: 'keyboard-shortcuts',
					bodyClass: 'pdk-window-body pdk-keyboard-shortcuts-body',
					centered: true,
					contextMenu: false,
					content: window.PufferDesk.apps.createKeyboardShortcutsApp({ config }),
					height: `${Math.round(modalHeight)}px`,
					icon: 'dashicons-keyboard',
					persist: false,
					resizeMode: 'both',
					title,
					titlebarLabel: title,
					width: `${Math.round(modalWidth)}px`,
					windowKind: 'help'
				});
			}
		});

		register(commandIds.SETTINGS_OPEN_PANEL, {
			isEnabled(payload) {
				return Boolean(launcher && typeof launcher.openSettingsPanel === 'function' && payload.panel);
			},
			run(payload) {
				launcher.openSettingsPanel(payload.panel);
			}
		});

		register(commandIds.SOUND_TOGGLE_MUTE, {
			isEnabled() {
				return Boolean(window.PufferDesk.soundStatus && typeof window.PufferDesk.soundStatus.toggleMute === 'function');
			},
			run() {
				window.PufferDesk.soundStatus.toggleMute();
			}
		});

		register(commandIds.APP_KEEP_IN_DOCK, {
			isEnabled(payload, detail) {
				const appId = getAppIdFromPayload(payload, detail);

				return Boolean(api && appPreferences && appMap.has(appId) && !isFixedDockApp(appId));
			},
			run(payload, detail) {
				return setAppDockPresence(getAppIdFromPayload(payload, detail), true);
			}
		});

		register(commandIds.APP_REMOVE_FROM_DOCK, {
			isEnabled(payload, detail) {
				const appId = getAppIdFromPayload(payload, detail);

				return Boolean(api && appPreferences && appMap.has(appId) && !isFixedDockApp(appId));
			},
			run(payload, detail) {
				return setAppDockPresence(getAppIdFromPayload(payload, detail), false);
			}
		});

		register(commandIds.APP_TOGGLE_LOGIN_ITEM, {
			isEnabled(payload, detail) {
				return Boolean(api && appPreferences && appMap.has(getAppIdFromPayload(payload, detail)));
			},
			run(payload, detail) {
				return toggleAppLoginItem(getAppIdFromPayload(payload, detail));
			}
		});

		register(commandIds.OPEN_URL, {
			isEnabled(payload) {
				return Boolean(launcher && typeof launcher.openUrl === 'function' && (payload.url || payload.target));
			},
			run(payload) {
				launcher.openUrl(payload.url || payload.target, payload.title, payload.icon);
			}
		});

		register(commandIds.NAVIGATE_URL, {
			isEnabled(payload) {
				return Boolean(payload.url || payload.target);
			},
			run(payload) {
				window.location.href = payload.url || payload.target;
			}
		});

		register(commandIds.OPEN_EXTERNAL_URL, {
			isEnabled(payload) {
				return Boolean(payload.url || payload.target);
			},
			run(payload) {
				window.open(payload.url || payload.target, '_blank', 'noopener');
			}
		});

		register(commandIds.RECENT_ITEMS_CLEAR, {
			isEnabled() {
				return Boolean(window.PufferDesk.menuBar && typeof window.PufferDesk.menuBar.clearRecentItems === 'function');
			},
			run() {
				window.PufferDesk.menuBar.clearRecentItems(config);
			}
		});

		register(commandIds.SHELL_RESTART, {
			isEnabled() {
				return Boolean(config.shellUrl || window.location.href);
			},
			run() {
				return restartShell();
			}
		});

		register(commandIds.SHELL_SWITCH_CLASSIC, {
			isEnabled(payload) {
				return Boolean(payload.url || payload.target || config.classicUrl);
			},
			run(payload) {
				return switchToClassicAdmin(payload);
			}
		});

		register(commandIds.SHELL_LOCK, {
			isEnabled(payload) {
				return Boolean(payload.url || payload.target || config.logoutUrl);
			},
			run(payload) {
				return logOut({
					target: payload.target || payload.url || config.logoutUrl
				}, 'lock');
			}
		});

		register(commandIds.SHELL_FOCUS_SEARCH, {
			isEnabled() {
				return Boolean(getSearchInput());
			},
			run() {
				const input = getSearchInput();

				if (input) {
					input.focus();
					if (typeof input.select === 'function') {
						input.select();
					}
				}
			}
		});

		register(commandIds.SHELL_SLEEP, {
			isEnabled(payload) {
				return Boolean(payload.url || payload.target || config.classicUrl);
			},
			run(payload) {
				return switchToClassicAdmin(payload, 'sleep');
			}
		});

		register(commandIds.SHELL_SHUTDOWN, {
			isEnabled(payload) {
				return Boolean(payload.url || payload.target || config.classicUrl);
			},
			run(payload) {
				return switchToClassicAdmin(payload, 'shutdown');
			}
		});

		register(commandIds.USER_LOGOUT, {
			isEnabled(payload) {
				return Boolean(payload.url || payload.target);
			},
			run(payload) {
				return logOut(payload);
			}
		});

		register(commandIds.SESSION_RESET_LAYOUT, {
			isEnabled() {
				return Boolean(config.storageKey && window.PufferDesk.session && window.PufferDesk.session.createSessionStore);
			},
			run() {
				clearClipboard();
				skipWindowRestoreOnce();
				return clearSessionStore().finally(reloadShell);
			}
		});

		register(commandIds.DESKTOP_SORT_ICONS, {
			isEnabled(payload) {
				return Boolean(desktopIconManager && typeof desktopIconManager.setSortMode === 'function' && payload.mode);
			},
			run(payload) {
				desktopIconManager.setSortMode(payload.mode);
				refreshActiveMenu(activeDetail);
			}
		});

		register(commandIds.SYSTEM_ERASE_CONTENT_SETTINGS, {
			isEnabled() {
				return Boolean(api && typeof api.post === 'function');
			},
			run() {
				return eraseContentAndSettings();
			}
		});

		register(commandIds.WIDGET_HIDE, {
			isEnabled(payload, detail) {
				return Boolean(widgetManager && typeof widgetManager.hideWidget === 'function' && getTargetWidget(detail));
			},
			run(payload, detail) {
				widgetManager.hideWidget(getTargetWidget(detail));
			}
		});

		register(commandIds.WINDOW_FOCUS, {
			isEnabled(payload, detail) {
				return Boolean(manager && typeof manager.focusWindow === 'function' && getTargetWindow(detail));
			},
			run(payload, detail) {
				manager.focusWindow(getTargetWindow(detail));
			}
		});

		register(commandIds.WINDOW_FOCUS_ID, {
			isEnabled(payload) {
				return Boolean(manager && typeof manager.focusWindow === 'function' && getWindowById(payload.target));
			},
			run(payload) {
				manager.focusWindow(getWindowById(payload.target));
			}
		});

		register(commandIds.WINDOW_CLOSE, {
			isEnabled(payload, detail) {
				return Boolean(manager && typeof manager.closeWindow === 'function' && getTargetWindow(detail));
			},
			run(payload, detail) {
				const win = getTargetWindow(detail);
				manager.closeWindow(win, win ? win.dataset.pdkAppWindow : '');
			}
		});

		const minimizeWindowCommand = {
			isEnabled(payload, detail) {
				return Boolean(manager && typeof manager.minimizeWindow === 'function' && getTargetWindow(detail));
			},
			run(payload, detail) {
				manager.minimizeWindow(getTargetWindow(detail));
			}
		};

		register(commandIds.WINDOW_MINIMIZE, minimizeWindowCommand);

		register(commandIds.WINDOW_OPEN_BROWSER_TAB, {
			isEnabled(payload, detail) {
				return Boolean(getWindowBrowserUrl(detail, payload.url || payload.target));
			},
			run(payload, detail) {
				window.open(getWindowBrowserUrl(detail, payload.url || payload.target), '_blank', 'noopener');
			}
		});

		register(commandIds.WINDOW_RELOAD, {
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

		register(commandIds.WINDOW_HISTORY_BACK, {
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

		register(commandIds.WINDOW_HISTORY_FORWARD, {
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

		register(commandIds.WINDOW_HIDE, minimizeWindowCommand);

		register(commandIds.WINDOW_HIDE_OTHERS, {
			isEnabled(payload, detail) {
				return Boolean(manager && typeof manager.hideOtherWindows === 'function' && getTargetWindow(detail));
			},
			run(payload, detail) {
				manager.hideOtherWindows(getTargetWindow(detail));
			}
		});

		register(commandIds.WINDOW_SHOW_ALL, {
			isEnabled() {
				return Boolean(manager && typeof manager.showAllWindows === 'function' && typeof manager.hasHiddenWindows === 'function' && manager.hasHiddenWindows());
			},
			run() {
				manager.showAllWindows();
			}
		});

		register(commandIds.WINDOW_TOGGLE_MAXIMIZE, {
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
