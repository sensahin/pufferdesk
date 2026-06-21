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
		const documentStore = context.documentStore || null;
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
		const dialogLabels = config.dialogs && config.dialogs.labels && typeof config.dialogs.labels === 'object'
			? config.dialogs.labels
			: {};
		const settingsConfig = config.settings && typeof config.settings === 'object' ? config.settings : {};
		const settingsLabels = settingsConfig.labels && typeof settingsConfig.labels === 'object' ? settingsConfig.labels : {};
		const commandIds = (window.PufferDesk.shell && window.PufferDesk.shell.commands) || {};
		const appIds = window.PufferDesk.apps && window.PufferDesk.apps.ids ? window.PufferDesk.apps.ids : {};
		const wallpaperTypes = window.PufferDesk.config && typeof window.PufferDesk.config.getContractMap === 'function'
			? window.PufferDesk.config.getContractMap('wallpaperTypes')
			: {};
		const contextTargets = window.PufferDesk.shell.contextMenuConstants
			? window.PufferDesk.shell.contextMenuConstants.targets || {}
			: {};
		const contextAreas = window.PufferDesk.shell.contextMenuConstants
			? window.PufferDesk.shell.contextMenuConstants.areas || {}
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
		const recentsFolderId = 'recents';
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

		function notifyCommandError(error) {
			if (window.PufferDesk.notificationStore && typeof window.PufferDesk.notificationStore.notify === 'function') {
				window.PufferDesk.notificationStore.notify({
					message: error && error.message ? error.message : getNotificationLabel('commandFailedMessage'),
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

		function getDialogLabel(key, fallback) {
			const value = dialogLabels[key];

			return typeof value === 'string' && value ? value : (fallback || key);
		}

		function getSettingsLabel(path, fallback) {
			const value = String(path || '').split('.').reduce((current, key) => (
				current && Object.prototype.hasOwnProperty.call(current, key) ? current[key] : undefined
			), settingsLabels);

			return typeof value === 'string' && value ? value : (fallback || path);
		}

		function getSettingsDomainAction(domainKey) {
			return window.PufferDesk.config && typeof window.PufferDesk.config.getSettingAction === 'function'
				? window.PufferDesk.config.getSettingAction(domainKey)
				: '';
		}

		function getNativeUsersConfig() {
			const nativeAdmin = config.nativeAdmin && typeof config.nativeAdmin === 'object' ? config.nativeAdmin : {};
			const nativeAdminApps = nativeAdmin.apps && typeof nativeAdmin.apps === 'object' ? nativeAdmin.apps : {};

			return appIds.USERS && nativeAdminApps[appIds.USERS] && typeof nativeAdminApps[appIds.USERS] === 'object'
				? nativeAdminApps[appIds.USERS]
				: {};
		}

		function nativeUsersFeatureEnabled(feature) {
			const nativeUsers = getNativeUsersConfig();
			const features = nativeUsers.features && typeof nativeUsers.features === 'object' ? nativeUsers.features : {};

			return features[feature] === true;
		}

		function getNativeUsersFallbackUrl(feature) {
			const nativeUsers = getNativeUsersConfig();
			const fallbackUrls = nativeUsers.fallbackUrls && typeof nativeUsers.fallbackUrls === 'object' ? nativeUsers.fallbackUrls : {};

			return fallbackUrls[feature] || fallbackUrls.directory || '';
		}

		function openNativeUsersFallback(feature, payload = {}) {
			const url = payload.url || getNativeUsersFallbackUrl(feature);

			if (!url || !launcher || typeof launcher.openUrl !== 'function') {
				return false;
			}

			launcher.openUrl(url, payload.title || payload.label || '', payload.icon || 'dashicons-admin-users');
			return true;
		}

		function openNativeUsersWorkflow(feature, payload = {}) {
			const workflow = window.PufferDesk.apps && window.PufferDesk.apps.usersWorkflow
				? window.PufferDesk.apps.usersWorkflow
				: null;

			if (workflow && feature === 'add' && typeof workflow.openAddUser === 'function') {
				return workflow.openAddUser(payload);
			}

			if (workflow && feature === 'profile' && typeof workflow.openProfile === 'function') {
				return workflow.openProfile(payload);
			}

			if (
				nativeUsersFeatureEnabled(feature)
				&& launcher
				&& typeof launcher.openApp === 'function'
				&& appIds.USERS
			) {
				return launcher.openApp(appIds.USERS, {
					nativeContext: Object.assign({}, payload, {
						nativeAdminFeature: feature
					})
				});
			}

			return openNativeUsersFallback(feature, payload);
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

		function isWindowMinimizable(win) {
			return Boolean(win && win.dataset.pdkMinimizable !== '0');
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

		function prepareTargetIframeNavigation(detail = activeDetail) {
			const win = getTargetWindow(detail);

			return Boolean(win && manager && typeof manager.prepareIframeNavigation === 'function' && manager.prepareIframeNavigation(win));
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

		function getFolderPathFromId(folderId) {
			const folder = folderId && folderManager && typeof folderManager.getFolder === 'function'
				? folderManager.getFolder(folderId)
				: null;

			return folder && typeof folder.path === 'string' ? folder.path : '';
		}

		function getStickyNoteCreateFolderId(payload = {}, detail = {}) {
			if (payload.folderId) {
				return payload.folderId;
			}
			if (payload.parentId) {
				return payload.parentId;
			}
			if (detail && detail.folderId) {
				return detail.folderId;
			}
			if (detail && detail.kind === contextTargets.FOLDER_CONTENT && detail.id) {
				return detail.id;
			}

			return '';
		}

		function getStickyNoteCreateState(payload = {}, detail = {}) {
			const state = detail && detail.contextPoint ? Object.assign({}, detail.contextPoint) : {};
			const folderId = getStickyNoteCreateFolderId(payload, detail);
			const parentPath = typeof payload.parentPath === 'string' && payload.parentPath
				? payload.parentPath
				: getFolderPathFromId(folderId);

			if (folderId) {
				state.folderId = folderId;
			}
			if (parentPath) {
				state.parentPath = parentPath;
			}

			return state;
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

		function emptyTrashSelection() {
			return {
				documentIds: [],
				folderIds: []
			};
		}

		function trashSelectionCount(selection = {}) {
			return (Array.isArray(selection.folderIds) ? selection.folderIds.length : 0)
				+ (Array.isArray(selection.documentIds) ? selection.documentIds.length : 0);
		}

		function getTrashItemIdFromPayload(payload = {}, detail = {}) {
			return String(
				payload.target
				|| payload.trashItemId
				|| (detail && detail.trashItemId)
				|| (detail && detail.id)
				|| (detail && detail.targetId)
				|| ''
			).trim();
		}

		function canActOnTrashItem(trashId) {
			return Boolean(
				trashId
				&& folderManager
				&& typeof folderManager.getTrashItem === 'function'
				&& folderManager.getTrashItem(trashId)
			);
		}

		function getTrashWindowFromDetail(detail = {}) {
			const target = detail && detail.targetElement ? detail.targetElement : null;
			const win = detail && detail.windowElement
				? detail.windowElement
				: target && typeof target.closest === 'function'
					? target.closest('.pdk-window')
					: null;

			return win && win.dataset && win.dataset.pdkFolderWindow === appIds.TRASH ? win : null;
		}

		function getSelectedTrashItemIds(payload = {}, detail = {}) {
			const targetId = getTrashItemIdFromPayload(payload, detail);
			const win = getTrashWindowFromDetail(detail);
			const selectedIds = win
				? uniqueIds(Array.from(win.querySelectorAll('.pdk-finder-trash-item.is-selected[data-pdk-trash-item-id]'))
					.map((item) => item.dataset.pdkTrashItemId || ''))
					.filter(canActOnTrashItem)
				: [];

			if (targetId && selectedIds.length > 1 && selectedIds.includes(targetId)) {
				return selectedIds;
			}

			if (!targetId && selectedIds.length) {
				return selectedIds;
			}

			return targetId && canActOnTrashItem(targetId) ? [targetId] : [];
		}

		function getDesktopIconDocumentId(item = {}) {
			const dataset = item && item.iconElement && item.iconElement.dataset ? item.iconElement.dataset : {};

			return normalizeDocumentId(
				dataset.pdkDocumentId
				|| item.documentId
				|| item.id
				|| item.key
				|| ''
			);
		}

		function getSelectedDesktopTrashSelection(target = {}) {
			if (!desktopIconManager || typeof desktopIconManager.getSelectedIconDetails !== 'function') {
				return emptyTrashSelection();
			}

			const selectedItems = desktopIconManager.getSelectedIconDetails();
			const folderIds = uniqueIds(selectedItems
				.filter((item) => item && (item.kind === 'folder' || item.context === contextTargets.DESKTOP_FOLDER))
				.map((item) => item.id))
				.filter(canMoveFolderToTrash);
			const documentIds = uniqueDocumentIds(selectedItems
				.filter((item) => item && (item.kind === 'document' || item.context === contextTargets.DOCUMENT))
				.map(getDesktopIconDocumentId))
				.filter(canMoveDocumentToTrash);
			const targetFolderId = target.folderId ? String(target.folderId).trim() : '';
			const targetDocumentId = normalizeDocumentId(target.documentId || 0);
			const targetIsSelected = Boolean(
				(targetFolderId && folderIds.includes(targetFolderId))
				|| (targetDocumentId && documentIds.includes(targetDocumentId))
			);
			const selection = {
				documentIds,
				folderIds
			};

			return targetIsSelected && trashSelectionCount(selection) > 1 ? selection : emptyTrashSelection();
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

		function getFolderWindowParentFolderId(detail = {}) {
			const win = detail && detail.windowElement ? detail.windowElement : null;

			return detail && detail.folderId
				? detail.folderId
				: win && win.dataset
					? win.dataset.pdkFolderWindow || ''
					: '';
		}

		function getSelectedFolderWindowTrashItems(target = {}, detail = {}) {
			if (!launcher || typeof launcher.getSelectedFolderItems !== 'function') {
				return [];
			}

			const win = detail && detail.windowElement ? detail.windowElement : null;
			const parentFolderId = getFolderWindowParentFolderId(detail);
			if (!parentFolderId) {
				return [];
			}

			const items = launcher.getSelectedFolderItems(parentFolderId, win, {
				targetElement: detail && detail.targetElement ? detail.targetElement : null,
				windowElement: win
			});
			const selectedItems = Array.isArray(items) ? items : [];
			const folderId = target.folderId ? String(target.folderId).trim() : '';
			const documentId = normalizeDocumentId(target.documentId || 0);
			const targetSelected = selectedItems.some((item) => {
				if (!item) {
					return false;
				}

				if (folderId && item.type === 'folder' && item.id === folderId) {
					return true;
				}

				return Boolean(documentId && item.type === 'document' && normalizeDocumentId(item.id) === documentId);
			});

			return targetSelected && selectedItems.length > 1 ? selectedItems : [];
		}

		function getFolderWindowSelectionFolderIds(items = []) {
			return uniqueIds((Array.isArray(items) ? items : [])
				.filter((item) => item && item.type === 'folder')
				.map((item) => item.id))
				.filter(canMoveFolderToTrash);
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

		function getFolderSidebarSectionFromPayload(payload = {}, detail = {}) {
			const dataset = detail && detail.targetElement && detail.targetElement.dataset
				? detail.targetElement.dataset
				: {};

			return payload.section || dataset.pdkFolderSidebarSection || '';
		}

		function getDocumentDataset(detail = {}) {
			return detail && detail.metadata && detail.metadata.dataset && typeof detail.metadata.dataset === 'object'
				? detail.metadata.dataset
				: {};
		}

		function normalizeDocumentId(value) {
			const raw = String(value || '').trim();
			const direct = raw.match(/^\d+$/);
			const prefixed = raw.match(/^document-(\d+)$/);
			const match = direct ? direct : prefixed;

			return match ? Number.parseInt(direct ? raw : match[1], 10) || 0 : 0;
		}

		function uniqueDocumentIds(ids) {
			return Array.from(new Set((Array.isArray(ids) ? ids : [])
				.map(normalizeDocumentId)
				.filter(Boolean)));
		}

		function canMoveDocumentToTrash(documentId) {
			return Boolean(
				normalizeDocumentId(documentId)
				&& (
					(launcher && typeof launcher.moveDocumentToTrash === 'function')
					|| (stickyNoteManager && typeof stickyNoteManager.deleteNote === 'function')
					|| (documentStore && typeof documentStore.remove === 'function')
				)
			);
		}

		function getDocumentIdFromPayload(payload = {}, detail = {}) {
			const dataset = getDocumentDataset(detail);

			return normalizeDocumentId(
				payload.documentId
				|| payload.target
				|| (detail && detail.documentId)
				|| dataset.pdkDocumentId
				|| (detail && detail.trashItemId)
				|| (detail && detail.id)
				|| ''
			);
		}

		function getDocumentKindFromPayload(payload = {}, detail = {}) {
			const dataset = getDocumentDataset(detail);

			return payload.documentKind || (detail && detail.documentKind) || dataset.pdkDocumentKind || '';
		}

		function isDesktopFolderCommandDetail(detail = {}) {
			return Boolean(
				detail
				&& (
					detail.type === contextTargets.DESKTOP_FOLDER
					|| detail.kind === contextTargets.DESKTOP_FOLDER
					|| (
						detail.targetElement
						&& detail.targetElement.classList
						&& detail.targetElement.classList.contains('pdk-desktop-folder')
					)
				)
			);
		}

		function isDesktopDocumentCommandDetail(detail = {}) {
			const type = detail && (detail.type || detail.kind);
			const isDocumentTarget = type === contextTargets.DOCUMENT || type === contextTargets.STICKY_NOTE;

			if (!isDocumentTarget) {
				return false;
			}

			if (
				detail.targetElement
				&& detail.targetElement.classList
				&& detail.targetElement.classList.contains('pdk-desktop-document')
			) {
				return true;
			}

			return !detail.windowElement || detail.area === contextAreas.DESKTOP;
		}

		function isFolderWindowFolderCommandDetail(detail = {}) {
			return Boolean(detail && (detail.type === contextTargets.FOLDER || detail.kind === contextTargets.FOLDER));
		}

		function isFolderWindowDocumentCommandDetail(detail = {}) {
			const type = detail && (detail.type || detail.kind);

			return Boolean(
				type === contextTargets.DOCUMENT
				&& (
					detail.area === contextAreas.FOLDER
					|| (
						detail.windowElement
						&& detail.windowElement.dataset
						&& detail.windowElement.dataset.pdkWindowKind === folderWindowKind
					)
				)
			);
		}

		function getDesktopTrashSelectionForFolder(payload = {}, detail = {}) {
			const folderId = getFolderIdFromPayload(payload, detail);

			if (!folderId || !canMoveFolderToTrash(folderId)) {
				return emptyTrashSelection();
			}

			const selected = getSelectedDesktopTrashSelection({ folderId });

			return trashSelectionCount(selected) ? selected : {
				documentIds: [],
				folderIds: [folderId]
			};
		}

		function getDesktopTrashSelectionForDocument(payload = {}, detail = {}) {
			const documentId = getDocumentIdFromPayload(payload, detail);

			if (!canMoveDocumentToTrash(documentId)) {
				return emptyTrashSelection();
			}

			const selected = getSelectedDesktopTrashSelection({ documentId });

			return trashSelectionCount(selected) ? selected : {
				documentIds: [documentId],
				folderIds: []
			};
		}

		async function moveTrashSelectionToTrash(selection = {}, detail = {}) {
			const folderIds = uniqueIds(selection.folderIds || []).filter(canMoveFolderToTrash);
			const documentIds = uniqueDocumentIds(selection.documentIds || []).filter(canMoveDocumentToTrash);

			if (!folderIds.length && !documentIds.length) {
				return false;
			}

			await Promise.all(documentIds.map((documentId) => moveDocumentToTrashFromCommand({ documentId }, detail).catch(() => false)));
			folderIds.forEach((folderId) => {
				folderManager.moveFolderToTrash(folderId);
			});

			return true;
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

		function isReadOnlyCreateFolderId(folderId) {
			const normalized = String(folderId || '').trim();

			return Boolean(normalized && (normalized === appIds.TRASH || normalized === recentsFolderId));
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

		function getDocumentLabelFromDetail(detail = {}, documentData = null) {
			const title = documentData && typeof documentData.title === 'string' ? documentData.title.trim() : '';

			return title || (detail && detail.label) || getLabel('document');
		}

		function getStickyNoteSnapshot(documentId) {
			return stickyNoteManager && typeof stickyNoteManager.getNoteSnapshot === 'function'
				? stickyNoteManager.getNoteSnapshot(documentId)
				: null;
		}

		function getDocumentForCommand(documentId) {
			const snapshot = getStickyNoteSnapshot(documentId);

			if (snapshot && snapshot.document) {
				return Promise.resolve(snapshot.document);
			}

			return documentStore && typeof documentStore.get === 'function'
				? documentStore.get(documentId).catch(() => null)
				: Promise.resolve(null);
		}

		function renameDocumentFromCommand(payload = {}, detail = {}) {
			const documentId = getDocumentIdFromPayload(payload, detail);

			if (!documentId) {
				return Promise.resolve(false);
			}

			if (
				launcher
				&& typeof launcher.startInlineRenameDocumentItem === 'function'
				&& launcher.startInlineRenameDocumentItem(documentId, {
					parentFolderId: detail && detail.folderId ? detail.folderId : '',
					targetElement: detail && detail.targetElement ? detail.targetElement : null,
					windowElement: getTargetWindow(detail)
				})
			) {
				return Promise.resolve(true);
			}

			return getDocumentForCommand(documentId).then((documentData) => {
				const currentTitle = getDocumentLabelFromDetail(detail, documentData);

				if (!dialogs || typeof dialogs.prompt !== 'function') {
					return false;
				}

				return dialogs.prompt({
					confirmLabel: getLabel('rename'),
					message: '',
					title: getLabel('rename'),
					value: currentTitle
				}).then((nextTitle) => {
					const normalizedTitle = typeof nextTitle === 'string' ? nextTitle.trim() : '';

					if (nextTitle === null || !normalizedTitle || normalizedTitle === currentTitle) {
						return false;
					}

					if (launcher && typeof launcher.renameDocument === 'function') {
						return Promise.resolve(launcher.renameDocument(documentId, normalizedTitle)).then(Boolean);
					}

					if (stickyNoteManager && typeof stickyNoteManager.renameNote === 'function') {
						return Promise.resolve(stickyNoteManager.renameNote(documentId, normalizedTitle)).then(Boolean);
					}

					return documentStore && typeof documentStore.update === 'function'
						? documentStore.update(documentId, { title: normalizedTitle }).then(Boolean)
						: false;
				});
			});
		}

		function moveDocumentToTrashFromCommand(payload = {}, detail = {}) {
			const documentId = getDocumentIdFromPayload(payload, detail);

			if (!documentId) {
				return Promise.resolve(false);
			}

			if (launcher && typeof launcher.moveDocumentToTrash === 'function') {
				return Promise.resolve(launcher.moveDocumentToTrash(documentId)).then((deleted) => {
					if (deleted) {
						return cleanupClipboard({
							validate: true
						});
					}

					return false;
				});
			}

			if (stickyNoteManager && typeof stickyNoteManager.deleteNote === 'function') {
				return stickyNoteManager.deleteNote(documentId).then(Boolean);
			}

			return documentStore && typeof documentStore.remove === 'function'
				? documentStore.remove(documentId).then(Boolean)
				: Promise.resolve(false);
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
					message: variant === 'delete-folder'
						? ''
						: getLabel('move_folder_to_trash_message'),
					title: variant === 'delete-folder' ? confirmationTitle : fallbackTitle,
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
					message: variant === 'delete-folder'
						? ''
						: getLabel('move_folders_to_trash_message'),
					title: variant === 'delete-folder'
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

		function getWallpaperService() {
			return window.PufferDesk.wallpaper || null;
		}

		function getWallpaperConfig() {
			return config.wallpaper && typeof config.wallpaper === 'object' ? config.wallpaper : {};
		}

		function getBuiltInWallpaperItems() {
			const wallpaperConfig = getWallpaperConfig();
			const groups = wallpaperConfig.groups && typeof wallpaperConfig.groups === 'object' ? wallpaperConfig.groups : {};
			const groupItems = Array.isArray(groups.wallpapers) ? groups.wallpapers : [];
			const fallbackItems = Array.isArray(wallpaperConfig.items)
				? wallpaperConfig.items.filter((item) => item && item.type !== wallpaperTypes.COLOR && item.type !== wallpaperTypes.UPLOAD)
				: [];
			const items = groupItems.length ? groupItems : fallbackItems;

			return items.filter((item) => item && item.type && item.id);
		}

		function getWallpaperPreferenceKey(preference = {}) {
			const wallpaper = getWallpaperService();

			if (wallpaper && typeof wallpaper.getPreferenceKey === 'function') {
				return wallpaper.getPreferenceKey(preference);
			}

			if (preference.type === wallpaperTypes.UPLOAD) {
				return `${wallpaperTypes.UPLOAD}:${Number.parseInt(preference.attachment_id, 10) || 0}`;
			}

			return `${preference.type || ''}:${preference.id || ''}`;
		}

		function getWallpaperItemPreference(item = {}) {
			const wallpaper = getWallpaperService();

			if (wallpaper && typeof wallpaper.getItemPreference === 'function') {
				return wallpaper.getItemPreference(item);
			}

			return {
				type: item.type || '',
				id: item.type === wallpaperTypes.UPLOAD ? '' : item.id || '',
				attachment_id: item.type === wallpaperTypes.UPLOAD ? Number.parseInt(item.attachment_id, 10) || 0 : 0,
				fit: item.fit || 'cover',
				position: item.position || 'center center'
			};
		}

		function getWallpaperItemCssVariables(item = {}) {
			const wallpaper = getWallpaperService();

			return wallpaper && typeof wallpaper.getItemCssVariables === 'function'
				? wallpaper.getItemCssVariables(item)
				: {};
		}

		function getCurrentWallpaperPreference() {
			const wallpaper = getWallpaperService();
			const wallpaperConfig = getWallpaperConfig();

			return wallpaper && typeof wallpaper.getPreference === 'function'
				? wallpaper.getPreference(wallpaperConfig)
				: wallpaperConfig.preference || {};
		}

		function getNextWallpaperItem() {
			const items = getBuiltInWallpaperItems();
			if (items.length < 2) {
				return null;
			}

			const currentKey = getWallpaperPreferenceKey(getCurrentWallpaperPreference());
			const currentIndex = items.findIndex((item) => getWallpaperPreferenceKey(getWallpaperItemPreference(item)) === currentKey);

			return items[(currentIndex + 1) % items.length];
		}

		function applyWallpaper(nextWallpaper) {
			const wallpaper = getWallpaperService();

			config.wallpaper = nextWallpaper && typeof nextWallpaper === 'object' ? nextWallpaper : getWallpaperConfig();
			if (wallpaper && typeof wallpaper.apply === 'function') {
				wallpaper.apply(shell, config.wallpaper);
			}

			return config.wallpaper;
		}

		async function showNextWallpaper() {
			const item = getNextWallpaperItem();
			const action = getSettingsDomainAction('WALLPAPER');
			if (!item || !api || typeof api.post !== 'function' || !action) {
				throw new Error(getSettingsLabel('status.serviceUnavailable'));
			}

			const fallbackWallpaper = getWallpaperConfig();
			const preference = getWallpaperItemPreference(item);
			const nextWallpaper = Object.assign({}, fallbackWallpaper, {
				preference,
				current: item,
				css_variables: getWallpaperItemCssVariables(item)
			});

			applyWallpaper(nextWallpaper);

			try {
				const result = await api.post(action, preference);
				if (!result || !result.success) {
					const message = result && result.data && result.data.message
						? result.data.message
						: getSettingsLabel('status.wallpaperSaveError');
					throw new Error(message);
				}

				return applyWallpaper(result.data && result.data.wallpaper ? result.data.wallpaper : nextWallpaper);
			} catch (error) {
				applyWallpaper(fallbackWallpaper);
				throw error;
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

		async function confirmResetCurrentLayout() {
			const actionConfig = {
				cancelLabel: getSettingsLabel('workspace.cancelLabel', getDialogLabel('cancel', 'Cancel')),
				confirmLabel: getSettingsLabel('workspace.resetCurrentConfirmLabel', 'Reset Layout'),
				message: getSettingsLabel('workspace.resetCurrentMessage', 'This will reset windows, desktop icons, widgets, and folders for the current theme.'),
				title: getSettingsLabel('workspace.resetCurrentTitle', 'Reset layout?')
			};

			return dialogs && typeof dialogs.confirm === 'function'
				? dialogs.confirm(actionConfig)
				: window.confirm(`${actionConfig.title}\n\n${actionConfig.message}`);
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

		register(commandIds.APP_OPEN_ROUTE, {
			isEnabled(payload) {
				return Boolean(
					launcher
					&& typeof launcher.openAppRoute === 'function'
					&& payload.target
					&& (payload.routeId || payload.url)
				);
			},
			run(payload) {
				launcher.openAppRoute(payload.target, payload.routeId || payload.url);
			}
		});

		register(commandIds.OPEN_WITH, {
			isEnabled(payload, detail) {
				return Boolean(
					launcher
					&& typeof launcher.openDocumentWith === 'function'
					&& getDocumentIdFromPayload(payload, detail)
					&& (payload.appId || payload.handlerId || payload.target)
				);
			},
			run(payload, detail) {
				return launcher.openDocumentWith(getDocumentIdFromPayload(payload, detail), payload.appId || payload.handlerId || '', {
					documentKind: getDocumentKindFromPayload(payload, detail)
				});
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
					&& !isReadOnlyCreateFolderId(parentId)
				);
			},
			run(payload, detail) {
				const parentId = getFolderCreateParentId(payload, detail);
				if (isReadOnlyCreateFolderId(parentId)) {
					return false;
				}

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

		register(commandIds.DESKTOP_SET_ICON_SIZE, {
			isEnabled(payload) {
				return Boolean(desktopIconManager && typeof desktopIconManager.setIconSize === 'function' && payload.size);
			},
			run(payload) {
				desktopIconManager.setIconSize(payload.size);
				refreshActiveMenu(activeDetail);
			}
		});

		register(commandIds.WALLPAPER_NEXT, {
			isEnabled() {
				return Boolean(getNextWallpaperItem());
			},
			run() {
				return showNextWallpaper();
			}
		});

		register(commandIds.DOCUMENT_NEW_STICKY_NOTE, {
			isEnabled(payload, detail) {
				return Boolean(
					stickyNoteManager
					&& typeof stickyNoteManager.createStickyNote === 'function'
					&& !isReadOnlyCreateFolderId(getStickyNoteCreateFolderId(payload, detail))
				);
			},
			run(payload, detail) {
				if (isReadOnlyCreateFolderId(getStickyNoteCreateFolderId(payload, detail))) {
					return false;
				}

				return stickyNoteManager.createStickyNote(getStickyNoteCreateState(payload, detail));
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

		register(commandIds.DOCUMENT_GET_INFO, {
			isEnabled(payload, detail) {
				return Boolean(launcher && typeof launcher.openDocumentInfo === 'function' && getDocumentIdFromPayload(payload, detail));
			},
			run(payload, detail) {
				return launcher.openDocumentInfo(getDocumentIdFromPayload(payload, detail));
			}
		});

		register(commandIds.DOCUMENT_RENAME, {
			isEnabled(payload, detail) {
				return Boolean(
					getDocumentIdFromPayload(payload, detail)
					&& (
						(stickyNoteManager && typeof stickyNoteManager.renameNote === 'function')
						|| (documentStore && typeof documentStore.update === 'function')
					)
				);
			},
			run(payload, detail) {
				return renameDocumentFromCommand(payload, detail);
			}
		});

		register(commandIds.DOCUMENT_MOVE_TO_TRASH, {
			isEnabled(payload, detail) {
				const desktopSelection = isDesktopDocumentCommandDetail(detail)
					? getDesktopTrashSelectionForDocument(payload, detail)
					: emptyTrashSelection();
				const folderWindowItems = isFolderWindowDocumentCommandDetail(detail)
					? getSelectedFolderWindowTrashItems({ documentId: getDocumentIdFromPayload(payload, detail) }, detail)
					: [];

				if (trashSelectionCount(desktopSelection) > 1 || folderWindowItems.length > 1) {
					return true;
				}

				return Boolean(
					getDocumentIdFromPayload(payload, detail)
					&& (
						(launcher && typeof launcher.moveDocumentToTrash === 'function')
						|| (stickyNoteManager && typeof stickyNoteManager.deleteNote === 'function')
						|| (documentStore && typeof documentStore.remove === 'function')
					)
				);
			},
			run(payload, detail) {
				if (isDesktopDocumentCommandDetail(detail)) {
					const selection = getDesktopTrashSelectionForDocument(payload, detail);
					if (trashSelectionCount(selection) > 1) {
						return moveTrashSelectionToTrash(selection, detail);
					}
				}

				if (
					isFolderWindowDocumentCommandDetail(detail)
					&& launcher
					&& typeof launcher.deleteSelectedFolderItems === 'function'
				) {
					const items = getSelectedFolderWindowTrashItems({ documentId: getDocumentIdFromPayload(payload, detail) }, detail);
					const parentFolderId = getFolderWindowParentFolderId(detail);
					if (items.length > 1 && parentFolderId) {
						return launcher.deleteSelectedFolderItems(parentFolderId, {
							targetElement: detail && detail.targetElement ? detail.targetElement : null,
							windowElement: detail && detail.windowElement ? detail.windowElement : null
						});
					}
				}

				return moveDocumentToTrashFromCommand(payload, detail);
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

		register(commandIds.FOLDER_TAB_MOVE_TO_NEW_WINDOW, {
			isEnabled(payload, detail) {
				return Boolean(launcher && typeof launcher.moveFolderTabToNewWindow === 'function' && getTargetWindow(detail) && getFolderTabIdFromPayload(payload, detail));
			},
			run(payload, detail) {
				launcher.moveFolderTabToNewWindow(getTargetWindow(detail), getFolderTabIdFromPayload(payload, detail));
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
				if (isDesktopFolderCommandDetail(detail) && trashSelectionCount(getDesktopTrashSelectionForFolder(payload, detail))) {
					return true;
				}

				if (
					isFolderWindowFolderCommandDetail(detail)
					&& getSelectedFolderWindowTrashItems({ folderId: getFolderIdFromPayload(payload, detail) }, detail).length > 1
				) {
					return true;
				}

				return getFolderIdsForTrash(payload, detail).length > 0;
			},
			async run(payload, detail) {
				const isDesktopFolder = isDesktopFolderCommandDetail(detail);
				const desktopSelection = isDesktopFolder
					? getDesktopTrashSelectionForFolder(payload, detail)
					: emptyTrashSelection();
				const folderWindowItems = isFolderWindowFolderCommandDetail(detail)
					? getSelectedFolderWindowTrashItems({ folderId: getFolderIdFromPayload(payload, detail) }, detail)
					: [];
				const folderWindowSelectionParentId = folderWindowItems.length > 1 ? getFolderWindowParentFolderId(detail) : '';
				const folderIds = folderWindowItems.length > 1
					? getFolderWindowSelectionFolderIds(folderWindowItems)
					: isDesktopFolder
						? desktopSelection.folderIds
						: getFolderIdsForTrash(payload, detail);
				const folders = folderIds.map((folderId) => folderManager.getFolder(folderId)).filter(Boolean);
				let confirmed = true;

				if (!folderIds.length && (!isDesktopFolder || !desktopSelection.documentIds.length) && !folderWindowItems.length) {
					return;
				}

				if (isConfirmationEnabled('move_folder_to_trash', false)) {
					const dialogOptions = getMoveFoldersToTrashDialogOptions(folders);
					confirmed = dialogs && typeof dialogs.confirm === 'function'
						? await dialogs.confirm(dialogOptions)
						: window.confirm(`${dialogOptions.title}\n\n${dialogOptions.message || ''}`);
				}

				if (confirmed) {
					if (folderWindowItems.length > 1 && folderWindowSelectionParentId && launcher && typeof launcher.deleteSelectedFolderItems === 'function') {
						return launcher.deleteSelectedFolderItems(folderWindowSelectionParentId, {
							targetElement: detail && detail.targetElement ? detail.targetElement : null,
							windowElement: detail && detail.windowElement ? detail.windowElement : null
						});
					}

					if (isDesktopFolder) {
						return moveTrashSelectionToTrash(desktopSelection, detail);
					}

					folderIds.forEach((folderId) => {
						folderManager.moveFolderToTrash(folderId);
					});
				}
			}
		});

		register(commandIds.TRASH_RESTORE, {
			isEnabled(payload, detail) {
				return Boolean(
					folderManager
					&& typeof folderManager.restoreTrashItem === 'function'
					&& getSelectedTrashItemIds(payload, detail).length
				);
			},
			async run(payload, detail) {
				const trashIds = getSelectedTrashItemIds(payload, detail);
				const results = await Promise.all(trashIds.map((trashId) => Promise.resolve(folderManager.restoreTrashItem(trashId)).catch(() => null)));

				return results.some(Boolean);
			}
		});

		register(commandIds.TRASH_DELETE_IMMEDIATELY, {
			isEnabled(payload, detail) {
				return Boolean(
					folderManager
					&& typeof folderManager.deleteTrashItem === 'function'
					&& getSelectedTrashItemIds(payload, detail).length
				);
			},
			async run(payload, detail) {
				const trashIds = getSelectedTrashItemIds(payload, detail);

				if (!trashIds.length) {
					return false;
				}

				const confirmed = dialogs && typeof dialogs.confirm === 'function'
						? await dialogs.confirm({
							cancelLabel: getLabel('cancel'),
							confirmLabel: getLabel('delete'),
							message: getLabel('delete_immediately_message'),
							title: getLabel('delete_immediately_title')
						})
					: window.confirm(getLabel('delete_immediately_fallback_message'));

				if (confirmed) {
					const results = await Promise.all(trashIds.map((trashId) => Promise.resolve(folderManager.deleteTrashItem(trashId)).catch(() => false)));

					return results.some(Boolean);
				}

				return false;
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
						await folderManager.emptyTrash();
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

		register(commandIds.FOLDER_SIDEBAR_REMOVE, {
			isEnabled(payload, detail) {
				const folderId = getFolderIdFromPayload(payload, detail);
				const section = getFolderSidebarSectionFromPayload(payload, detail);

				return Boolean(
					launcher
					&& typeof launcher.removeFolderSidebarItem === 'function'
					&& folderId
					&& ['recents', 'favorites', 'locations'].includes(section)
					&& detail
					&& detail.type === contextTargets.FOLDER_SIDEBAR
				);
			},
			run(payload, detail) {
				return launcher.removeFolderSidebarItem(getFolderIdFromPayload(payload, detail), getFolderSidebarSectionFromPayload(payload, detail));
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

		register(commandIds.OPEN_SYSTEM_ABOUT, {
			isEnabled() {
				return Boolean(launcher && typeof launcher.openSystemAbout === 'function');
			},
			run() {
				launcher.openSystemAbout();
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
					disabledControls: ['minimize'],
					height: `${Math.round(modalHeight)}px`,
					icon: 'dashicons-keyboard',
					minimizable: false,
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

		register(commandIds.USER_CREATE, {
			isEnabled() {
				const nativeUsers = getNativeUsersConfig();

				return Boolean(nativeUsers.canCreate && (nativeUsersFeatureEnabled('add') || getNativeUsersFallbackUrl('add')));
			},
			run(payload) {
				return openNativeUsersWorkflow('add', payload);
			}
		});

		register(commandIds.USER_OPEN_PROFILE, {
			isEnabled(payload) {
				const nativeUsers = getNativeUsersConfig();
				const userId = Number.parseInt(payload.userId || payload.target, 10) || Number.parseInt(config.userId, 10) || 0;

				return Boolean(nativeUsers.canProfile && (userId || nativeUsersFeatureEnabled('profile') || getNativeUsersFallbackUrl('profile')));
			},
			run(payload) {
				const userId = Number.parseInt(payload.userId || payload.target, 10) || Number.parseInt(config.userId, 10) || 0;

				return openNativeUsersWorkflow('profile', Object.assign({}, payload, {
					userId
				}));
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
			async run() {
				const confirmed = await confirmResetCurrentLayout();
				if (!confirmed) {
					return false;
				}

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
				return Boolean(manager && typeof manager.minimizeWindow === 'function' && isWindowMinimizable(getTargetWindow(detail)));
			},
			run(payload, detail) {
				const win = getTargetWindow(detail);
				if (isWindowMinimizable(win)) {
					manager.minimizeWindow(win);
				}
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

				prepareTargetIframeNavigation(detail);
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

				prepareTargetIframeNavigation(detail);
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

				prepareTargetIframeNavigation(detail);
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
