(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};

	window.PufferDesk.apps.createAppLauncher = function createAppLauncher(shell, manager, config = {}, options = {}) {
		const dom = window.PufferDesk.dom;
		const defaultDashicon = dom.getDefaultDashicon();
		const geometry = window.PufferDesk.geometry;
		const apps = Array.isArray(config.apps) ? config.apps : [];
		const folders = Array.isArray(config.folders) ? config.folders : [];
		const appMap = new Map(apps.map((app) => [app.id, app]));
		const commandIds = (window.PufferDesk.shell && window.PufferDesk.shell.commands) || {};
		const appIds = window.PufferDesk.apps.ids || {};
		const dragDropConstants = window.PufferDesk.dragDrop && window.PufferDesk.dragDrop.constants ? window.PufferDesk.dragDrop.constants : {};
		const dragDropModels = window.PufferDesk.dragDrop && window.PufferDesk.dragDrop.models ? window.PufferDesk.dragDrop.models : null;
		const containerTypes = dragDropConstants.containerTypes || {};
		const workspaceSections = window.PufferDesk.session && window.PufferDesk.session.workspace
			? window.PufferDesk.session.workspace.sections || {}
			: {};
		const windowKinds = window.PufferDesk.session && window.PufferDesk.session.workspace
			? window.PufferDesk.session.workspace.windowKinds || {}
			: {};
		const folderWindowKind = windowKinds.FOLDER;
		const eventNames = window.PufferDesk.events && window.PufferDesk.events.names ? window.PufferDesk.events.names : {};
		const domEventNames = window.PufferDesk.events && window.PufferDesk.events.domNames ? window.PufferDesk.events.domNames : {};
		const folderViewModes = window.PufferDesk.apps.folderViewModes || null;
		const contextConstants = window.PufferDesk.shell && window.PufferDesk.shell.contextMenuConstants
			? window.PufferDesk.shell.contextMenuConstants
			: {};
		const contextAreas = contextConstants.areas || {};
		const contextKeys = contextConstants.keys || {};
		const contextTargets = contextConstants.targets || {};
		const contextTargetTypes = contextConstants.targetTypes || {};
		const contextItemTypes = contextConstants.itemTypes || {};
		const dragDropManager = options.dragDropManager || window.PufferDesk.dragDropManager || null;
		const folderMenuOptions = window.PufferDesk.apps.createFolderMenuOptions
			? window.PufferDesk.apps.createFolderMenuOptions({
				getMenuLabel
			})
			: null;
		const trashFolderId = appIds.TRASH;
		let folderProvider = null;
		let explorerCommandMenuButton = null;
		let explorerCommandMenuCleanup = null;
		const menuLabels = config.menu && config.menu.labels && typeof config.menu.labels === 'object'
			? config.menu.labels
			: {};
		const themeSurfaces = config.theme && config.theme.surfaces && typeof config.theme.surfaces === 'object'
			? config.theme.surfaces
			: {};
		const themeFamily = config.theme && typeof config.theme.family === 'string' ? config.theme.family : '';
		const documentStore = options.documentStore || (window.PufferDesk.documents && typeof window.PufferDesk.documents.createDocumentStore === 'function'
			? window.PufferDesk.documents.createDocumentStore(config)
			: null);
		const virtualFilesystem = window.PufferDesk.virtualFilesystem && typeof window.PufferDesk.virtualFilesystem.create === 'function'
			? window.PufferDesk.virtualFilesystem.create(config)
			: null;
		const homeFolderId = getVirtualFolderId('HOME');
		const desktopFolderId = getVirtualFolderId('DESKTOP');
		const defaultFinderFavoriteIds = [
			getVirtualFolderId('DOCUMENTS'),
			getVirtualFolderId('STICKIES')
		].filter(Boolean);
		const recentItems = window.PufferDesk.apps.createRecentItemsController
			? window.PufferDesk.apps.createRecentItemsController(config)
			: {
				add() { return false; },
				list() { return []; }
			};
		const sessionStore = config.storageKey && window.PufferDesk.session && typeof window.PufferDesk.session.createSessionStore === 'function'
			? window.PufferDesk.session.createSessionStore(config.storageKey)
			: null;
		const recentsFolderId = 'recents';
		const folderData = window.PufferDesk.apps.createFolderDataProvider
			? window.PufferDesk.apps.createFolderDataProvider({
				appMap,
				apps,
				documentStore,
				folders,
				getFolderProvider,
				getMenuLabel,
				isHiddenFromLaunchSurfaces,
				onFolderDocumentsChanged(folderId) {
					refreshFolderWindow(folderId);
					refreshFolderInfoWindow(folderId);
				},
				virtualFilesystem,
				trashFolderId
			})
			: null;
		const folderWindows = window.PufferDesk.apps.createFolderWindowState
			? window.PufferDesk.apps.createFolderWindowState({
				getFolder: (folderId) => getFolder(folderId)
			})
			: null;
		const appWindowOptions = window.PufferDesk.apps.createAppWindowOptionsResolver
			? window.PufferDesk.apps.createAppWindowOptionsResolver({
				appMap,
				config,
				manager,
				nativeApps: window.PufferDesk.apps,
				shell
			})
			: null;
		const nativeAppOpener = window.PufferDesk.apps.createNativeAppOpener
			? window.PufferDesk.apps.createNativeAppOpener({
				appMap,
				config,
				manager,
				onOpen: recordAppOpen,
				resolveWindowOptions: getWindowOptions
			})
			: null;
		const launcherRenderer = window.PufferDesk.apps.createLauncherRenderer
			? window.PufferDesk.apps.createLauncherRenderer({
				dom,
				getMenuLabel,
				openApp,
				openDocument,
				openFolder,
				renderFolderWindow,
				startFolderRename: startInlineRenameFolderItem
			})
			: null;
		const folderRenderer = window.PufferDesk.apps.createFolderRenderer
			? window.PufferDesk.apps.createFolderRenderer({
				getExplorerSortMode,
				getFolderApps,
				getFolderChildFolders,
				getFolderDocuments,
				getMenuLabel,
				getTrashItems,
				launcherRenderer,
				setExplorerSortMode
			})
			: null;

		function getVirtualFolderId(key) {
			return virtualFilesystem && typeof virtualFilesystem.getFolderId === 'function'
				? virtualFilesystem.getFolderId(key)
				: '';
		}

		function getThemeSurface(surface, fallback) {
			const value = typeof themeSurfaces[surface] === 'string' ? themeSurfaces[surface] : '';

			return value || fallback;
		}

		function getFolderLayout() {
			return getThemeSurface('folder', 'finder');
		}

		function getFolderViewLayout(win = null) {
			return win && win.dataset && win.dataset.pdkFolderLayout === 'file-explorer'
				? 'file-explorer'
				: getFolderLayout();
		}

		function isFileExplorerLayout() {
			return getFolderLayout() === 'file-explorer';
		}

		function isPufferDeskFamily() {
			return themeFamily === 'pufferdesk';
		}

		function showsCutFolderActions() {
			return themeFamily !== 'pufferdesk';
		}

		function getMenuLabel(key, fallback) {
			return typeof menuLabels[key] === 'string' && menuLabels[key] ? menuLabels[key] : (fallback || key);
		}

		function formatMenuLabel(key, fallback, values = []) {
			if (window.PufferDesk.config && typeof window.PufferDesk.config.formatFromLabels === 'function') {
				return window.PufferDesk.config.formatFromLabels(menuLabels, key, fallback || key, values);
			}

			let index = 0;
			return String(getMenuLabel(key, fallback)).replace(/%d|%s/g, () => String(values[index++] ?? ''));
		}

		function shortcut(combo, shortcutOptions = {}) {
			return Object.assign({
				combo
			}, shortcutOptions);
		}

		function getInfoPanelLabels() {
			const infoPanel = config.infoPanel && typeof config.infoPanel === 'object' ? config.infoPanel : {};

			return infoPanel.labels && typeof infoPanel.labels === 'object' ? infoPanel.labels : {};
		}

		function getInfoPanelLabel(key, fallback) {
			const labels = getInfoPanelLabels();

			return typeof labels[key] === 'string' && labels[key] ? labels[key] : fallback;
		}

		function formatInfoPanelLabel(key, fallback, values = []) {
			const labels = getInfoPanelLabels();
			const configApi = window.PufferDesk.config;

			if (configApi && typeof configApi.formatFromLabels === 'function') {
				return configApi.formatFromLabels(labels, key, fallback, values);
			}

			let index = 0;
			const template = typeof labels[key] === 'string' && labels[key] ? labels[key] : fallback;

			return String(template || '').replace(/%d|%s/g, () => String(values[index++] ?? ''));
		}

		function getFolderInfoTitle(info) {
			const label = info && info.label
				? info.label
				: getInfoPanelLabel('folderFallbackTitle', '');

			return formatInfoPanelLabel('folderInfoTitle', '', [label]);
		}

		function isHiddenFromLaunchSurfaces(app) {
			const locations = config.appLocations && typeof config.appLocations === 'object' ? config.appLocations : {};

			return Boolean(app && app.id && locations[app.id] === 'hidden');
		}

		function getFolderProvider() {
			return folderProvider
				|| (window.PufferDesk.desktopFolderManager && typeof window.PufferDesk.desktopFolderManager.getFolder === 'function'
					? window.PufferDesk.desktopFolderManager
					: null);
		}

		function isTrashFolderId(folderId) {
			return folderData ? folderData.isTrashFolderId(folderId) : folderId === trashFolderId;
		}

		function isRecentsFolderId(folderId) {
			return folderId === recentsFolderId;
		}

		function getRecentsFolder() {
			return {
				icon: { type: 'theme', name: 'clock.svg', fallback: 'dashicons-clock' },
				id: recentsFolderId,
				kind: 'system',
				label: getMenuLabel('recents'),
				special: 'recents',
				user: false,
				virtual: true
			};
		}

		function getTrashFolder() {
			if (folderData) {
				return folderData.getTrashFolder();
			}

			return {
				icon: 'dashicons-trash',
				id: trashFolderId,
				kind: 'system',
				label: getMenuLabel('trash'),
				special: 'trash',
				user: false
			};
		}

		function getFolder(folderId) {
			if (isRecentsFolderId(folderId)) {
				return getRecentsFolder();
			}

			return folderData ? folderData.getFolder(folderId) : (isTrashFolderId(folderId) ? getTrashFolder() : null);
		}

		function getFolders() {
			return folderData ? folderData.getFolders() : [getTrashFolder()];
		}

		function getFolderApps(folderId) {
			return folderData ? folderData.getFolderApps(folderId) : [];
		}

		function getFolderChildFolders(folderId) {
			return folderData ? folderData.getFolderChildFolders(folderId) : [];
		}

		function getFolderDocuments(folderId) {
			return folderData && typeof folderData.getFolderDocuments === 'function' ? folderData.getFolderDocuments(folderId) : [];
		}

		function parseDocumentId(value) {
			const direct = Number.parseInt(value, 10);
			const match = String(value || '').match(/(\d+)$/);

			if (Number.isFinite(direct) && direct > 0) {
				return direct;
			}

			return match ? Number.parseInt(match[1], 10) || 0 : 0;
		}

		function getRecentDisplayItems(count = 50) {
			return typeof recentItems.list === 'function' ? recentItems.list(count).map((item) => {
				const type = item && typeof item.type === 'string' ? item.type : '';
				const target = item && typeof item.target === 'string' ? item.target : item && typeof item.id === 'string' ? item.id : '';

				if (type === 'app') {
					const app = appMap.get(target);
					return app ? {
						app,
						command: item.command || commandIds.OPEN_APP,
						icon: app.icon || item.icon || defaultDashicon,
						id: app.id,
						label: app.label || item.label || app.id,
						target: app.id,
						title: app.label || item.title || item.label,
						type: 'app'
					} : null;
				}

				if (type === 'document' && item && (item.url || item.target)) {
					const documentId = parseDocumentId(item.target || item.id);
					const isNativeDocument = Boolean(documentId && (!item.url || item.command === commandIds.DOCUMENT_OPEN));
					const label = item.label || item.title || getMenuLabel('document');

					return {
						command: isNativeDocument ? commandIds.DOCUMENT_OPEN : item.command || commandIds.OPEN_URL,
						icon: item.icon || 'dashicons-media-document',
						id: isNativeDocument ? String(documentId) : item.id,
						label,
						target: isNativeDocument ? String(documentId) : item.target || item.url,
						title: item.title || label,
						type: 'document',
						url: item.url || ''
					};
				}

				return null;
			}).filter(Boolean) : [];
		}

		function getTrashItems() {
			return folderData ? folderData.getTrashItems() : [];
		}

		function getTrashCount() {
			return folderData ? folderData.getTrashCount() : getTrashItems().length;
		}

		function executeCommand(command, payload = {}) {
			const commands = window.PufferDesk.menuCommands;

			if (commands && typeof commands.execute === 'function') {
				commands.execute({
					command,
					label: '',
					payload,
					target: payload.target || ''
				}, {
					kind: 'trash'
				});
			}
		}

		function isUserFolder(folderId) {
			return folderData ? folderData.isUserFolder(folderId) : false;
		}

		function getFolderInfo(folderId) {
			return folderData ? folderData.getFolderInfo(folderId) : null;
		}

		function getAppWindowOptions(app, nativeContext = {}) {
			return appWindowOptions && typeof appWindowOptions.getAppWindowOptions === 'function'
				? appWindowOptions.getAppWindowOptions(app, nativeContext)
				: null;
		}

		function getWindowOptions(appId, nativeContext = {}) {
			return appWindowOptions && typeof appWindowOptions.getWindowOptions === 'function'
				? appWindowOptions.getWindowOptions(appId, nativeContext)
				: getAppWindowOptions(appMap.get(appId), nativeContext);
		}

		function addRecentItem(item) {
			recentItems.add(item);
		}

		function recordAppOpen(app) {
			if (!app) {
				return;
			}

			addRecentItem({
				command: commandIds.OPEN_APP,
				icon: app.icon,
				id: app.id,
				label: app.label,
				target: app.id,
				title: app.label,
				type: 'app'
			});
		}

		function getDocumentRecentIcon(documentData = {}) {
			const stickyKind = documentStore && documentStore.kinds ? documentStore.kinds.sticky : '';
			const textKind = documentStore && documentStore.kinds ? documentStore.kinds.text : '';

			if (documentData.kind === stickyKind) {
				return { type: 'theme', name: 'sticky-notes.svg', fallback: 'dashicons-sticky' };
			}

			if (documentData.kind === textKind) {
				return { type: 'theme', name: 'text-editor.svg', fallback: 'dashicons-media-document' };
			}

			return 'dashicons-media-document';
		}

		function getDocumentRecentLabel(documentData = {}) {
			const stickyKind = documentStore && documentStore.kinds ? documentStore.kinds.sticky : '';
			const title = typeof documentData.title === 'string' ? documentData.title.trim() : '';

			if (title) {
				return title;
			}

			return documentData.kind === stickyKind ? getMenuLabel('sticky_note') : getMenuLabel('document');
		}

		function recordDocumentOpen(documentData = {}) {
			const documentId = Number.parseInt(documentData.id, 10);

			if (!documentId) {
				return;
			}

			const label = getDocumentRecentLabel(documentData);

			addRecentItem({
				command: commandIds.DOCUMENT_OPEN,
				icon: getDocumentRecentIcon(documentData),
				id: String(documentId),
				label,
				target: String(documentId),
				title: label,
				type: 'document'
			});
		}

		function normalizeFolderId(value) {
			return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120);
		}

		function isPlainObject(value) {
			return Boolean(value && typeof value === 'object' && !Array.isArray(value));
		}

		function normalizeFolderDisplayRecord(record, layout = getFolderLayout()) {
			const state = isPlainObject(record) ? record : {};

			return {
				groupMode: normalizeExplorerGroupMode(state.groupMode || 'none'),
				sortMode: normalizeExplorerSortMode(state.sortMode || 'none'),
				viewMode: normalizeExplorerViewMode(state.viewMode || '', layout)
			};
		}

		function getFolderDisplayStateSection() {
			const raw = sessionStore && typeof sessionStore.getSection === 'function'
				? sessionStore.getSection(workspaceSections.FOLDER_DISPLAY, { folders: {} })
				: {};
			const state = isPlainObject(raw) ? raw : {};

			return {
				folders: isPlainObject(state.folders) ? state.folders : {}
			};
		}

		function getFolderDisplayState(folderId, layout = getFolderLayout()) {
			const folderKey = normalizeFolderId(folderId);
			const state = getFolderDisplayStateSection();
			const record = folderKey && isPlainObject(state.folders[folderKey])
				? state.folders[folderKey]
				: {};

			return normalizeFolderDisplayRecord(record, layout);
		}

		function saveFolderDisplayState(folderId, nextState, layout = getFolderLayout()) {
			const folderKey = normalizeFolderId(folderId);

			if (!folderKey || !workspaceSections.FOLDER_DISPLAY || !sessionStore || typeof sessionStore.saveSection !== 'function') {
				return false;
			}

			const state = getFolderDisplayStateSection();
			const previous = getFolderDisplayState(folderKey, layout);
			const record = normalizeFolderDisplayRecord(Object.assign({}, previous, isPlainObject(nextState) ? nextState : {}), layout);

			sessionStore.saveSection(workspaceSections.FOLDER_DISPLAY, {
				folders: Object.assign({}, state.folders, {
					[folderKey]: record
				})
			});

			return true;
		}

		function getFolderSidebarState() {
			const raw = sessionStore && typeof sessionStore.getSection === 'function'
				? sessionStore.getSection(workspaceSections.FOLDER_SIDEBAR, {})
				: {};
			const state = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};

			return {
				collapsed: state.collapsed && typeof state.collapsed === 'object' && !Array.isArray(state.collapsed) ? state.collapsed : {},
				favoriteIds: Array.isArray(state.favoriteIds) ? state.favoriteIds.map(normalizeFolderId).filter(Boolean) : [],
				removedFavoriteIds: Array.isArray(state.removedFavoriteIds) ? state.removedFavoriteIds.map(normalizeFolderId).filter(Boolean) : []
			};
		}

		function saveFolderSidebarState(state) {
			if (!sessionStore || typeof sessionStore.saveSection !== 'function') {
				return false;
			}

			sessionStore.saveSection(workspaceSections.FOLDER_SIDEBAR, {
				collapsed: state && state.collapsed && typeof state.collapsed === 'object' ? state.collapsed : {},
				favoriteIds: Array.isArray(state && state.favoriteIds) ? state.favoriteIds : [],
				removedFavoriteIds: Array.isArray(state && state.removedFavoriteIds) ? state.removedFavoriteIds : []
			});

			return true;
		}

		function getDefaultFinderFavorites() {
			return defaultFinderFavoriteIds.filter((folderId) => Boolean(getFolder(folderId)));
		}

		function getFinderFavoriteIds() {
			const state = getFolderSidebarState();
			const removed = new Set(state.removedFavoriteIds);
			const seen = new Set();
			const ids = [];

			getDefaultFinderFavorites().concat(state.favoriteIds).forEach((folderId) => {
				if (!folderId || removed.has(folderId) || seen.has(folderId) || !getFolder(folderId) || isTrashFolderId(folderId) || isRecentsFolderId(folderId)) {
					return;
				}

				seen.add(folderId);
				ids.push(folderId);
			});

			return ids;
		}

		function refreshOpenFolderSidebars() {
			Array.from(shell.querySelectorAll(`.pdk-window[data-pdk-window-kind="${dom.escapeAttribute(folderWindowKind)}"]:not(.is-closed)`)).forEach((win) => {
				const folderId = win && win.dataset ? win.dataset.pdkFolderWindow || '' : '';
				if (folderId) {
					renderFolderWindow(win, folderId, {
						replaceHistory: true,
						touch: false
					});
				}
			});
		}

		function setFinderSidebarSectionCollapsed(sectionId, collapsed) {
			if (!['favorites', 'locations'].includes(sectionId)) {
				return false;
			}

			const state = getFolderSidebarState();
			state.collapsed = Object.assign({}, state.collapsed, {
				[sectionId]: Boolean(collapsed)
			});
			saveFolderSidebarState(state);
			refreshOpenFolderSidebars();

			return true;
		}

		function addFolderSidebarFavorite(folderId) {
			const normalized = normalizeFolderId(folderId);
			const folder = getFolder(normalized);
			const state = getFolderSidebarState();
			const defaults = new Set(getDefaultFinderFavorites());

			if (!folder || isTrashFolderId(normalized) || isRecentsFolderId(normalized)) {
				return false;
			}

			state.removedFavoriteIds = state.removedFavoriteIds.filter((id) => id !== normalized);
			if (!defaults.has(normalized) && !state.favoriteIds.includes(normalized)) {
				state.favoriteIds.push(normalized);
			}
			saveFolderSidebarState(state);
			refreshOpenFolderSidebars();

			return true;
		}

		function removeFolderSidebarFavorite(folderId) {
			const normalized = normalizeFolderId(folderId);
			const state = getFolderSidebarState();
			const visibleFavoriteIds = new Set(getFinderFavoriteIds());
			let changed = false;

			if (!normalized) {
				return false;
			}

			const nextFavorites = state.favoriteIds.filter((id) => id !== normalized);
			if (nextFavorites.length !== state.favoriteIds.length) {
				state.favoriteIds = nextFavorites;
				changed = true;
			}

			if (!state.removedFavoriteIds.includes(normalized)) {
				state.removedFavoriteIds.push(normalized);
				changed = true;
			}

			if (!changed && visibleFavoriteIds.has(normalized)) {
				changed = true;
			}

			if (!changed) {
				return false;
			}

			saveFolderSidebarState(state);
			refreshOpenFolderSidebars();

			return true;
		}

		function openApp(appId, openOptions = {}) {
			if (appId === appIds.TRASH) {
				return openTrash();
			}

			if (appId === appIds.STICKY_NOTES && isPufferDeskFamily()) {
				const stickyManager = window.PufferDesk.stickyNoteManager || null;
				return stickyManager && typeof stickyManager.openStickyNotes === 'function'
					? stickyManager.openStickyNotes(openOptions.nativeContext || {})
					: null;
			}

			if (nativeAppOpener && typeof nativeAppOpener.canOpen === 'function' && nativeAppOpener.canOpen(appId)) {
				return typeof nativeAppOpener.open === 'function' ? nativeAppOpener.open(appId, openOptions.nativeContext || {}) : null;
			}

			const options = getWindowOptions(appId, openOptions.nativeContext || {});
			const app = appMap.get(appId);
			if (!options) {
				return null;
			}

			const win = manager.createWindow(options);
			if (app && win) {
				recordAppOpen(app);
			}

			return win;
		}

		function openDocument(documentData) {
			const documentId = Number.parseInt(documentData && documentData.id, 10);
			const stickyKind = documentStore && documentStore.kinds ? documentStore.kinds.sticky : '';
			const textKind = documentStore && documentStore.kinds ? documentStore.kinds.text : '';

			if (!documentId) {
				return null;
			}

			recordDocumentOpen(documentData);

			if (documentData.kind === stickyKind) {
				const stickyManager = window.PufferDesk.stickyNoteManager || null;
				if (stickyManager && typeof stickyManager.renderNote === 'function') {
					stickyManager.renderNote(documentData);
				}
				if (stickyManager && typeof stickyManager.showNote === 'function') {
					stickyManager.showNote(documentId);
				}

				return null;
			}

			if (documentData.kind === textKind) {
				return openApp(appIds.TEXT_EDITOR, {
					nativeContext: {
						initialDocumentId: documentId
					}
				});
			}

			return null;
		}

		function openDocumentById(documentId) {
			const id = Number.parseInt(documentId, 10);

			if (!id || !documentStore || typeof documentStore.get !== 'function') {
				return false;
			}

			return documentStore.get(id).then((documentData) => openDocument(documentData));
		}

		function openTrash(options = {}) {
			return openFolder(trashFolderId, options);
		}

		function openSettingsPanel(panelId) {
			const win = openApp(appIds.OS_SETTINGS);
			const settingsRoot = win ? win.querySelector('.pdk-settings') : null;

			if (settingsRoot && typeof settingsRoot.pdkOpenPanel === 'function') {
				return settingsRoot.pdkOpenPanel(panelId);
			}

			return false;
		}

		function openAbout(appId) {
			const app = appMap.get(appId);
			if (!app || !window.PufferDesk.apps.createAboutWindow) {
				return;
			}

			manager.createWindow({
				appId: `about-${app.id}`,
				bodyClass: 'pdk-window-body pdk-about-body',
				centered: true,
				contextMenu: false,
				content: window.PufferDesk.apps.createAboutWindow(app),
				disabledControls: ['minimize', 'maximize'],
				height: '206px',
				icon: app.icon,
				menu: app.menu || null,
				persist: false,
				resizeMode: 'none',
				title: app.label,
				width: '286px',
				windowKind: 'about'
			});
		}

		function openSiteAbout() {
			const siteInfo = config.siteInfo && typeof config.siteInfo === 'object' ? config.siteInfo : {};
			const title = siteInfo.title || getInfoPanelLabel('aboutSiteTitle', '');

			if (!window.PufferDesk.apps.createSiteAboutWindow) {
				return;
			}

			manager.createWindow({
				appId: 'about-this-site',
				bodyClass: 'pdk-window-body pdk-site-about-body',
				centered: true,
				contextMenu: false,
				content: window.PufferDesk.apps.createSiteAboutWindow(siteInfo),
				disabledControls: ['minimize', 'maximize'],
				height: '500px',
				icon: 'dashicons-admin-site-alt3',
				persist: false,
				resizeMode: 'none',
				title,
				width: '286px',
				windowKind: 'site-about'
			});
		}

		function openUrl(url, title, icon) {
			const windowTitle = title || getMenuLabel('admin');
			const win = manager.createWindow({
				title: windowTitle,
				icon: icon || defaultDashicon,
				windowKind: 'document',
				url
			});

			if (win && url) {
				addRecentItem({
					command: commandIds.OPEN_URL,
					icon: icon || defaultDashicon,
					id: url,
					label: windowTitle,
					title: windowTitle,
					type: 'document',
					url
				});
			}
		}

		function getFolderTitle(folder) {
			const folderLabel = folder && folder.label ? folder.label : getMenuLabel('admin');

			if (isFileExplorerLayout() || (folder && (folder.id === trashFolderId || folder.virtual))) {
				return folderLabel;
			}

			return `${folderLabel} ${getMenuLabel('folder_suffix')}`;
		}

		function getFolderLabel(folderId) {
			const folder = getFolder(folderId);

			return folder && folder.label ? folder.label : getMenuLabel('admin');
		}

		function createFolderTab(folderId, options = {}) {
			return folderWindows.createTab(folderId, options);
		}

		function getFolderWindowTabs(win, fallbackFolderId = '') {
			return folderWindows.getState(win, fallbackFolderId);
		}

		function getActiveFolderTab(win, fallbackFolderId = '') {
			return folderWindows.getActiveTab(win, fallbackFolderId);
		}

		function setFolderWindowTabs(win, rawTabs = [], activeTabId = '', fallbackFolderId = '') {
			return folderWindows.setTabs(win, rawTabs, activeTabId, fallbackFolderId);
		}

		function getFolderWindowState(win) {
			return folderWindows.getWindowState(win);
		}

		function updateFolderWindowHistory(win, folderId, options = {}) {
			return folderWindows.updateHistory(win, folderId, options);
		}

		function getFolderWindowHistoryState(win) {
			return folderWindows.getHistoryState(win);
		}

		function getFolderToolbarDisplayMode(win) {
			const mode = win && win.dataset ? win.dataset.pdkFolderToolbarDisplay : '';

			return folderViewModes && typeof folderViewModes.normalizeToolbarDisplayMode === 'function'
				? folderViewModes.normalizeToolbarDisplayMode(mode)
				: 'icon-text';
		}

		function setFolderToolbarDisplayMode(win, mode) {
			const normalized = folderViewModes && typeof folderViewModes.normalizeToolbarDisplayMode === 'function'
				? folderViewModes.normalizeToolbarDisplayMode(mode)
				: 'icon-text';
			const toolbar = win ? win.querySelector('.pdk-finder-toolbar') : null;

			if (win && win.dataset) {
				win.dataset.pdkFolderToolbarDisplay = normalized;
			}

			if (toolbar) {
				toolbar.dataset.pdkFolderToolbarDisplay = normalized;
			}

			return normalized;
		}

		function normalizeExplorerViewMode(mode, layout = getFolderLayout()) {
			if (folderViewModes && typeof folderViewModes.normalize === 'function') {
				return folderViewModes.normalize(mode, layout);
			}

			return '';
		}

		function getExplorerViewMode(win) {
			const mode = win && win.dataset ? (win.dataset.pdkFolderViewMode || win.dataset.pdkExplorerViewMode || '') : '';

			return normalizeExplorerViewMode(mode, getFolderViewLayout(win));
		}

		function setExplorerViewMode(win, mode, options = {}) {
			const layout = getFolderViewLayout(win);
			const previous = getExplorerViewMode(win);
			const normalized = normalizeExplorerViewMode(mode, layout);
			const folderId = options.folderId || (win && win.dataset ? win.dataset.pdkFolderWindow : '');
			const pane = win ? win.querySelector('.pdk-finder-pane') : null;
			const statusbar = win ? win.querySelector('.pdk-explorer-statusbar') : null;

			if (folderId && options.persist !== false) {
				saveFolderDisplayState(folderId, {
					viewMode: normalized
				}, layout);
			}

			if (win && win.dataset) {
				win.dataset.pdkFolderViewMode = normalized;
				win.dataset.pdkExplorerViewMode = normalized;
			}

			if (pane) {
				pane.dataset.pdkFolderViewMode = normalized;
				pane.dataset.pdkExplorerViewMode = normalized;
			}

			if (statusbar) {
				statusbar.querySelectorAll('[data-pdk-folder-view-mode], [data-pdk-explorer-view-mode]').forEach((button) => {
					const active = (button.dataset.pdkFolderViewMode || button.dataset.pdkExplorerViewMode) === normalized;
					button.classList.toggle('is-active', active);
					button.setAttribute('aria-pressed', active ? 'true' : 'false');
				});
			}

			if (options.render !== false && win && win.dataset && win.dataset.pdkFolderWindow && previous !== normalized) {
				renderFolderWindow(win, win.dataset.pdkFolderWindow, {
					replaceHistory: true,
					touch: false
				});
			}

			return normalized;
		}

		function normalizeExplorerSortMode(mode) {
			return folderViewModes && typeof folderViewModes.normalizeExplorerSortMode === 'function'
				? folderViewModes.normalizeExplorerSortMode(mode)
				: 'none';
		}

		function getExplorerSortMode(win) {
			return normalizeExplorerSortMode(win && win.dataset ? win.dataset.pdkExplorerSortMode : '');
		}

		function normalizeExplorerGroupMode(mode) {
			return folderViewModes && typeof folderViewModes.normalizeExplorerGroupMode === 'function'
				? folderViewModes.normalizeExplorerGroupMode(mode)
				: 'none';
		}

		function getExplorerGroupMode(win) {
			return normalizeExplorerGroupMode(win && win.dataset ? win.dataset.pdkExplorerGroupMode : '');
		}

		function setExplorerGroupMode(win, mode, options = {}) {
			const layout = getFolderViewLayout(win);
			const normalized = normalizeExplorerGroupMode(mode);
			const folderId = options.folderId || (win && win.dataset ? win.dataset.pdkFolderWindow : '');

			if (folderId && options.persist !== false) {
				saveFolderDisplayState(folderId, {
					groupMode: normalized
				}, layout);
			}

			if (win && win.dataset) {
				win.dataset.pdkExplorerGroupMode = normalized;
			}

			return normalized;
		}

		function applyFolderDisplayState(win, folderId, layout = getFolderLayout()) {
			const display = getFolderDisplayState(folderId, layout);

			if (win && win.dataset) {
				win.dataset.pdkFolderLayout = layout;
				win.dataset.pdkFolderViewMode = display.viewMode;
				win.dataset.pdkExplorerViewMode = display.viewMode;
				win.dataset.pdkExplorerSortMode = display.sortMode;
				win.dataset.pdkExplorerGroupMode = display.groupMode;
			}

			return display;
		}

		function getFolderDisplayItems(folderId, win = null) {
			if (isRecentsFolderId(folderId)) {
				return getRecentDisplayItems();
			}

			return folderRenderer && typeof folderRenderer.getDisplayItems === 'function'
				? folderRenderer.getDisplayItems(folderId, win)
				: [];
		}

		function createFolderItemGrid(folderId, win = null, options = {}) {
			if (isRecentsFolderId(folderId)) {
				return createRecentItemGrid(folderId);
			}

			return folderRenderer && typeof folderRenderer.createItemGrid === 'function'
				? folderRenderer.createItemGrid(folderId, win, options)
				: document.createElement('div');
		}

		function bindFolderPaneSelectionClear(pane) {
			if (!pane || !launcherRenderer || typeof launcherRenderer.clearSelection !== 'function') {
				return;
			}

			pane.addEventListener('click', (event) => {
				const target = event.target;
				const interactiveSelector = [
					'.pdk-app-launcher',
					'.pdk-finder-trash-item',
					'button',
					'a',
					'input',
					'textarea',
					'select',
					'[contenteditable="true"]'
				].join(', ');
				const interactive = target && typeof target.closest === 'function'
					? target.closest(interactiveSelector)
					: null;

				if (interactive && pane.contains(interactive)) {
					return;
				}

				if (pane.dataset.pdkSuppressSelectionClearClick === '1') {
					event.preventDefault();
					event.stopPropagation();
					delete pane.dataset.pdkSuppressSelectionClearClick;
					return;
				}

				launcherRenderer.clearSelection(pane);
			});
		}

		function isTextEditingTarget(target) {
			return Boolean(target && typeof target.closest === 'function' && target.closest('input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"]'));
		}

		function findFolderItemRenameButton(folderId, options = {}) {
			const explicit = options.buttonElement || options.targetElement || null;
			const explicitButton = explicit && typeof explicit.closest === 'function'
				? explicit.closest('.pdk-folder-launcher')
				: explicit;
			if (
				explicitButton
				&& explicitButton.matches
				&& explicitButton.matches(`.pdk-folder-launcher[data-pdk-context-id="${dom.escapeAttribute(folderId)}"]`)
			) {
				return explicitButton;
			}

			const root = options.windowElement && options.windowElement.querySelector
				? options.windowElement
				: shell;

			return root && root.querySelector
				? root.querySelector(`.pdk-folder-launcher[data-pdk-context-id="${dom.escapeAttribute(folderId)}"]`)
				: null;
		}

		function startInlineRenameFolderItem(folderId, options = {}) {
			const provider = getFolderProvider();
			const button = findFolderItemRenameButton(folderId, options);
			const win = options.windowElement || (button && button.closest ? button.closest('.pdk-window') : null);
			const label = button ? button.querySelector('.pdk-app-launcher-label') : null;
			const folder = getFolder(folderId);

			if (
				!provider
				|| typeof provider.renameFolder !== 'function'
				|| typeof provider.isUserFolder !== 'function'
				|| !provider.isUserFolder(folderId)
				|| !button
				|| !win
				|| !label
				|| button.dataset.pdkInlineRename === '1'
				|| label.dataset.pdkInlineRename === '1'
			) {
				return false;
			}

			const originalLabel = (dom.getFullLabel && dom.getFullLabel(label))
				|| button.dataset.pdkContextLabel
				|| (folder && folder.label ? folder.label : getMenuLabel('folder'));
			let finished = false;
			let blurRefocusTimer = 0;

			function cleanup() {
				window.clearTimeout(blurRefocusTimer);
				label.removeEventListener('blur', onBlur);
				label.removeEventListener('keydown', onKeyDown);
				label.removeEventListener('click', stopEditingEvent);
				label.removeEventListener('pointerdown', stopEditingEvent);
				document.removeEventListener('pointerdown', onDocumentPointerDown, true);
				label.removeAttribute('contenteditable');
				label.removeAttribute('spellcheck');
				delete button.dataset.pdkInlineRename;
				delete label.dataset.pdkInlineRename;
				button.classList.remove('is-renaming');
			}

			function restoreLabel(text) {
				if (dom.setTruncatedLabelText) {
					dom.setTruncatedLabelText(label, text);
				} else {
					label.textContent = text;
				}
				button.dataset.pdkContextLabel = text;
				button.setAttribute('aria-label', text);
			}

			function finish(commit) {
				if (finished) {
					return;
				}

				finished = true;
				const nextLabel = String(label.textContent || '').trim();
				cleanup();

				if (commit) {
					const renamed = provider.renameFolder(folderId, nextLabel || originalLabel);
					const renamedLabel = renamed && renamed.label ? renamed.label : nextLabel || originalLabel;
					if (button.isConnected && label.isConnected) {
						restoreLabel(renamedLabel);
					}
					if (win && win.dataset && win.dataset.pdkFolderWindow) {
						refreshFolderWindow(win.dataset.pdkFolderWindow);
					}
				} else if (button.isConnected && label.isConnected) {
					restoreLabel(originalLabel);
				}
			}

			function stopEditingEvent(event) {
				event.stopPropagation();
			}

			function onBlur() {
				window.clearTimeout(blurRefocusTimer);
				blurRefocusTimer = window.setTimeout(() => {
					blurRefocusTimer = 0;
					if (finished) {
						return;
					}
					if (!button.isConnected || !label.isConnected) {
						finish(true);
						return;
					}
					if (document.activeElement === label || label.contains(document.activeElement)) {
						return;
					}
					label.focus({ preventScroll: true });
				}, 0);
			}

			function onDocumentPointerDown(event) {
				if (finished || (event.target && label.contains(event.target))) {
					return;
				}

				finish(true);
			}

			function onKeyDown(event) {
				if (event.key === 'Enter') {
					event.preventDefault();
					finish(true);
				} else if (event.key === 'Escape') {
					event.preventDefault();
					finish(false);
				} else if (event.key === 'Tab') {
					finish(true);
				}
			}

			if (launcherRenderer && typeof launcherRenderer.selectItem === 'function') {
				launcherRenderer.selectItem(button);
			}
			button.classList.add('is-renaming');
			button.dataset.pdkInlineRename = '1';
			label.dataset.pdkInlineRename = '1';
			if (dom.setEditableLabelText) {
				dom.setEditableLabelText(label, originalLabel);
			} else {
				label.textContent = originalLabel;
			}
			label.setAttribute('contenteditable', 'plaintext-only');
			label.setAttribute('spellcheck', 'false');
			label.addEventListener('blur', onBlur);
			label.addEventListener('keydown', onKeyDown);
			label.addEventListener('click', stopEditingEvent);
			label.addEventListener('pointerdown', stopEditingEvent);
			document.addEventListener('pointerdown', onDocumentPointerDown, true);
			label.focus({ preventScroll: true });

			const selection = window.getSelection();
			const range = document.createRange();
			range.selectNodeContents(label);
			if (selection) {
				selection.removeAllRanges();
				selection.addRange(range);
			}

			return true;
		}

		function bindFolderPaneKeyboard(pane, folderId, win) {
			if (!pane || pane.dataset.pdkFolderKeyboardBound === '1') {
				return;
			}

			pane.dataset.pdkFolderKeyboardBound = '1';
			pane.addEventListener('keydown', (event) => {
				if (
					event.defaultPrevented
					|| event.key !== 'Enter'
					|| event.altKey
					|| event.ctrlKey
					|| event.metaKey
					|| event.shiftKey
					|| isTextEditingTarget(event.target)
				) {
					return;
				}

				const button = event.target && typeof event.target.closest === 'function'
					? event.target.closest('.pdk-folder-launcher')
					: null;
				if (!button || !pane.contains(button) || !button.classList.contains('is-selected')) {
					return;
				}

				if (startInlineRenameFolderItem(button.dataset.pdkContextId || button.dataset.pdkOpenFolder || '', {
					buttonElement: button,
					parentFolderId: folderId,
					windowElement: win
				})) {
					event.preventDefault();
					event.stopPropagation();
				}
			});
		}

		function selectRecentItem(button, event) {
			if (!button || !launcherRenderer || typeof launcherRenderer.selectItem !== 'function') {
				return;
			}

			launcherRenderer.selectItem(button, {
				additive: Boolean(event && (event.metaKey || event.ctrlKey || event.shiftKey))
			});
		}

		function openRecentDisplayItem(item) {
			if (!item) {
				return null;
			}

			if (item.type === 'app' && item.target) {
				return openApp(item.target);
			}

			if (item.type === 'folder' && item.target) {
				return openFolder(item.target, {
					recordRecent: false
				});
			}

			if (item.type === 'document') {
				const documentId = parseDocumentId(item.target || item.id);
				if (documentId && (!item.url || item.command === commandIds.DOCUMENT_OPEN)) {
					return openDocumentById(documentId);
				}

				if (item.url || item.target) {
					return openUrl(item.url || item.target, item.title || item.label, item.icon);
				}
			}

			return null;
		}

		function createRecentItemButton(item) {
			const button = document.createElement('button');
			const label = item && item.label ? item.label : getMenuLabel('recent_item');
			const appIcon = document.createElement('span');
			const itemLabel = dom.createTruncatedLabel('pdk-app-launcher-label', label);

			button.type = 'button';
			button.className = 'pdk-app-launcher pdk-recent-launcher';
			button.dataset.pdkContext = item && item.type === 'folder'
				? contextTargets.FOLDER
				: item && item.type === 'app'
					? contextItemTypes.APP
					: contextTargets.DOCUMENT;
			button.dataset.pdkContextId = item && item.target ? item.target : item && item.id ? item.id : '';
			button.dataset.pdkContextLabel = label;
			button.dataset.pdkRecentItem = item && item.id ? item.id : '';
			button.setAttribute('aria-label', label);
			button.setAttribute('aria-pressed', 'false');
			button.setAttribute('aria-selected', 'false');

			appIcon.className = 'pdk-app-icon';
			appIcon.appendChild(dom.createIcon(item && item.icon ? item.icon : defaultDashicon));

			button.append(appIcon, itemLabel);
			button.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				selectRecentItem(button, event);
			});
			button.addEventListener('dblclick', (event) => {
				event.preventDefault();
				event.stopPropagation();
				openRecentDisplayItem(item);
			});
			button.addEventListener('contextmenu', () => {
				selectRecentItem(button);
			});

			return button;
		}

		function createRecentItemGrid() {
			const grid = document.createElement('div');

			grid.className = 'pdk-app-grid pdk-finder-grid pdk-recent-grid';
			getRecentDisplayItems().forEach((item) => {
				grid.appendChild(createRecentItemButton(item));
			});

			return grid;
		}

		let activeFolderItemDropTarget = null;

		function clearFolderItemDropTarget() {
			if (activeFolderItemDropTarget) {
				activeFolderItemDropTarget.classList.remove('is-drop-target');
				activeFolderItemDropTarget = null;
			}
		}

		function setFolderItemDropTarget(target) {
			if (activeFolderItemDropTarget === target) {
				return;
			}

			clearFolderItemDropTarget();
			activeFolderItemDropTarget = target || null;
			if (activeFolderItemDropTarget) {
				activeFolderItemDropTarget.classList.add('is-drop-target');
			}
		}

		function parseDragProxyNumber(value, fallback) {
			const parsed = Number.parseFloat(value);

			return Number.isFinite(parsed) ? parsed : fallback;
		}

		function moveFolderItemDragProxy(proxy, clientX, clientY) {
			if (!proxy || !Number.isFinite(clientX) || !Number.isFinite(clientY)) {
				return;
			}

			const offsetX = parseDragProxyNumber(proxy.dataset.pdkDragOffsetX, (proxy.offsetWidth || 0) / 2);
			const offsetY = parseDragProxyNumber(proxy.dataset.pdkDragOffsetY, (proxy.offsetHeight || 0) / 2);

			proxy.style.left = `${Math.round(clientX - offsetX)}px`;
			proxy.style.top = `${Math.round(clientY - offsetY)}px`;
		}

		function createFolderItemDragProxy(item, clientX, clientY) {
			const rect = item.getBoundingClientRect();
			const sourcePane = item.closest('.pdk-finder-pane');
			const proxy = item.cloneNode(true);

			proxy.removeAttribute('id');
			proxy.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
			proxy.classList.remove('is-context-menu-active', 'is-dragging', 'is-drop-target', 'is-selected');
			proxy.classList.add('pdk-folder-drag-proxy');
			proxy.setAttribute('aria-hidden', 'true');
			proxy.setAttribute('tabindex', '-1');
			proxy.removeAttribute('aria-selected');
			proxy.dataset.pdkDragOffsetX = String(clientX - rect.left);
			proxy.dataset.pdkDragOffsetY = String(clientY - rect.top);
			proxy.style.height = `${Math.max(1, Math.round(rect.height))}px`;
			proxy.style.width = `${Math.max(1, Math.round(rect.width))}px`;

			if (sourcePane && sourcePane.dataset && sourcePane.dataset.pdkFolderViewMode) {
				proxy.dataset.pdkFolderViewMode = sourcePane.dataset.pdkFolderViewMode;
			}

			(shell || document.body).appendChild(proxy);
			moveFolderItemDragProxy(proxy, clientX, clientY);

			return proxy;
		}

		function removeFolderItemDragProxy(proxy) {
			if (proxy && proxy.parentNode) {
				proxy.parentNode.removeChild(proxy);
			}
		}

		function disableNativeFolderItemDrag(item) {
			if (!item) {
				return;
			}

			item.draggable = false;
			item.querySelectorAll('a, img').forEach((element) => {
				element.draggable = false;
			});
		}

		function isPointInsideElement(element, clientX, clientY) {
			if (!element || !Number.isFinite(clientX) || !Number.isFinite(clientY)) {
				return false;
			}

			const rect = element.getBoundingClientRect();

			return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
		}

		function isPointOverVisibleWindow(clientX, clientY) {
			return Array.from(shell.querySelectorAll('.pdk-window:not(.is-closed):not(.is-hidden)'))
				.some((win) => isPointInsideElement(win, clientX, clientY));
		}

		function getFolderDragDetail(item, sourceFolderId) {
			const kind = item && item.dataset ? item.dataset.pdkFolderItemKind || '' : '';
			const id = item && item.dataset ? item.dataset.pdkFolderItemId || item.dataset.pdkContextId || item.dataset.pdkOpenFolder || '' : '';

			if (!id || !['app', 'folder'].includes(kind)) {
				return null;
			}

			return {
				id,
				item,
				kind,
				sourceFolderId
			};
		}

		function getFolderDropIdFromElement(element) {
			if (!element || !element.dataset) {
				return '';
			}

			return element.dataset.pdkOpenFolder || element.dataset.pdkContextId || '';
		}

		function getFolderSidebarDropTargetFromElement(element) {
			const target = element && typeof element.closest === 'function'
				? element.closest('[data-pdk-folder-sidebar-drop-kind]')
				: null;
			const dropKind = target && target.dataset ? target.dataset.pdkFolderSidebarDropKind || '' : '';

			if (!target || !dropKind) {
				return null;
			}

			if (dropKind === 'favorites') {
				return {
					element: target,
					id: 'favorites',
					kind: containerTypes.SIDEBAR_FAVORITES_LEGACY
				};
			}

			if (dropKind === containerTypes.FOLDER) {
				return {
					element: target,
					id: getFolderDropIdFromElement(target),
					kind: containerTypes.FOLDER
				};
			}

			return null;
		}

		function getFolderMoveTargetContainerId(dropTarget) {
			if (!dropTarget) {
				return '';
			}

			if (dropTarget.kind === containerTypes.DESKTOP) {
				return containerTypes.DESKTOP;
			}

			if (dropTarget.kind === containerTypes.SIDEBAR_FAVORITES_LEGACY) {
				return containerTypes.FOLDER_SIDEBAR_FAVORITES;
			}

			if (dropTarget.kind === containerTypes.FOLDER) {
				return dragDropModels && typeof dragDropModels.createContainerId === 'function'
					? dragDropModels.createContainerId(containerTypes.FOLDER, dropTarget.id || '')
					: '';
			}

			return '';
		}

		function createFolderContainerId(folderId) {
			return folderId && dragDropModels && typeof dragDropModels.createContainerId === 'function'
				? dragDropModels.createContainerId(containerTypes.FOLDER, folderId)
				: '';
		}

		function getFolderMoveRequest(dragDetail, dropTarget, point = null) {
			const sourceFolderId = dragDetail && dragDetail.sourceFolderId ? dragDetail.sourceFolderId : '';
			const sourceContainerId = createFolderContainerId(sourceFolderId);

			return {
				fromContainerId: sourceContainerId,
				item: {
					id: dragDetail && dragDetail.id ? dragDetail.id : '',
					metadata: {
						source: 'folder-item',
						sourceFolderId
					},
					sourceContainerId,
					type: dragDetail && dragDetail.kind ? dragDetail.kind : ''
				},
				position: point,
				reason: 'drag-drop',
				toContainerId: getFolderMoveTargetContainerId(dropTarget)
			};
		}

		function canDropFolderItem(dragDetail, dropTarget) {
			if (!dragDropManager || typeof dragDropManager.validateDrop !== 'function') {
				return false;
			}

			const validation = dragDropManager.validateDrop(getFolderMoveRequest(dragDetail, dropTarget), {
				emit: false
			});

			return Boolean(validation && validation.valid);
		}

		function getFolderItemDropTarget(dragDetail, clientX, clientY) {
			const element = typeof document.elementFromPoint === 'function'
				? document.elementFromPoint(clientX, clientY)
				: null;
			const folderElement = element && typeof element.closest === 'function'
				? element.closest('.pdk-folder-launcher, [data-pdk-desktop-icon-kind="folder"]')
				: null;
			const sidebarTarget = getFolderSidebarDropTargetFromElement(element);
			const pane = element && typeof element.closest === 'function'
				? element.closest('.pdk-finder-pane')
				: null;
			const desktop = element && typeof element.closest === 'function'
				? element.closest('.pdk-desktop')
				: null;

			if (!element) {
				return null;
			}

			if (sidebarTarget && sidebarTarget.element !== dragDetail.item) {
				return canDropFolderItem(dragDetail, sidebarTarget) ? sidebarTarget : null;
			}

			if (folderElement && folderElement !== dragDetail.item) {
				const id = getFolderDropIdFromElement(folderElement);
				const target = {
					element: folderElement,
					id,
					kind: 'folder'
				};

				return canDropFolderItem(dragDetail, target) ? target : null;
			}

			if (pane && !pane.contains(dragDetail.item)) {
				const win = pane.closest(`.pdk-window[data-pdk-window-kind="${dom.escapeAttribute(folderWindowKind)}"]`);
				const id = win && win.dataset ? win.dataset.pdkFolderWindow || '' : '';
				const target = {
					element: pane,
					id,
					kind: containerTypes.FOLDER
				};

				return canDropFolderItem(dragDetail, target) ? target : null;
			}

			if (desktop && !element.closest('.pdk-window')) {
				const target = {
					element: desktop,
					id: desktopFolderId,
					kind: containerTypes.DESKTOP
				};

				return canDropFolderItem(dragDetail, target) ? target : null;
			}

			if (!desktop && shell) {
				const desktopElement = shell.querySelector('.pdk-desktop');
				const target = {
					element: desktopElement,
					id: desktopFolderId,
					kind: containerTypes.DESKTOP
				};

				if (desktopElement && isPointInsideElement(desktopElement, clientX, clientY) && !isPointOverVisibleWindow(clientX, clientY)) {
					return canDropFolderItem(dragDetail, target) ? target : null;
				}
			}

			return null;
		}

		function dropFolderItem(dragDetail, dropTarget, point) {
			if (!dragDropManager || typeof dragDropManager.completeDrop !== 'function') {
				return false;
			}

			const result = dragDropManager.completeDrop(getFolderMoveRequest(dragDetail, dropTarget, point));

			return Boolean(result && result.success);
		}

		function bindFolderPaneItemDrag(pane, folderId) {
			if (!pane || pane.dataset.pdkFolderItemDragBound === '1') {
				return;
			}

			pane.dataset.pdkFolderItemDragBound = '1';
			pane.addEventListener('click', (event) => {
				const item = event.target && typeof event.target.closest === 'function'
					? event.target.closest('[data-pdk-draggable-folder-item="1"]')
					: null;

				if (item && item.dataset.pdkSuppressFolderItemClick === '1') {
					event.preventDefault();
					event.stopPropagation();
					delete item.dataset.pdkSuppressFolderItemClick;
				}
			}, true);
			pane.addEventListener('dragstart', (event) => {
				const item = event.target && typeof event.target.closest === 'function'
					? event.target.closest('[data-pdk-draggable-folder-item="1"]')
					: null;

				if (!item || !pane.contains(item)) {
					return;
				}

				event.preventDefault();
			}, true);
			pane.addEventListener('pointerdown', (event) => {
				const item = event.target && typeof event.target.closest === 'function'
					? event.target.closest('[data-pdk-draggable-folder-item="1"]')
					: null;
				const dragDetail = getFolderDragDetail(item, folderId);
				const startX = event.clientX;
				const startY = event.clientY;
				let moved = false;
				let currentDropTarget = null;
				let dragProxy = null;
				let platformDragStarted = false;

				if (
					event.button !== 0
					|| event.ctrlKey
					|| event.metaKey
					|| event.shiftKey
					|| !item
					|| !pane.contains(item)
					|| !dragDetail
				) {
					return;
				}

				if (launcherRenderer && typeof launcherRenderer.selectItemFromPlainAction === 'function') {
					launcherRenderer.selectItemFromPlainAction(item);
				}
				event.preventDefault();
				disableNativeFolderItemDrag(item);

				if (typeof item.setPointerCapture === 'function') {
					item.setPointerCapture(event.pointerId);
				}

				const move = (moveEvent) => {
					const deltaX = moveEvent.clientX - startX;
					const deltaY = moveEvent.clientY - startY;

					if (!moved && Math.abs(deltaX) + Math.abs(deltaY) < 4) {
						return;
					}

					moved = true;
					moveEvent.preventDefault();
					if (!dragProxy) {
						dragProxy = createFolderItemDragProxy(item, startX, startY);
					}
					if (!platformDragStarted && dragDropManager && typeof dragDropManager.startDragFromElement === 'function') {
						dragDropManager.startDragFromElement(item, {
							folderId,
							source: 'folder-item'
						});
						platformDragStarted = true;
					}
					moveFolderItemDragProxy(dragProxy, moveEvent.clientX, moveEvent.clientY);
					item.classList.add('is-dragging');
					currentDropTarget = getFolderItemDropTarget(dragDetail, moveEvent.clientX, moveEvent.clientY);
					setFolderItemDropTarget(currentDropTarget ? currentDropTarget.element : null);
					if (platformDragStarted && dragDropManager) {
						if (currentDropTarget && typeof dragDropManager.hover === 'function') {
							dragDropManager.hover(getFolderMoveRequest(dragDetail, currentDropTarget, {
								clientX: moveEvent.clientX,
								clientY: moveEvent.clientY
							}));
						} else if (typeof dragDropManager.leave === 'function') {
							dragDropManager.leave();
						}
					}
				};

				const finish = (upEvent, commitDrop) => {
					window.removeEventListener('pointermove', move);
					window.removeEventListener('pointerup', up);
					window.removeEventListener('pointercancel', cancel);
					item.classList.remove('is-dragging');
					removeFolderItemDragProxy(dragProxy);
					clearFolderItemDropTarget();

					if (typeof item.releasePointerCapture === 'function' && item.hasPointerCapture(upEvent.pointerId)) {
						item.releasePointerCapture(upEvent.pointerId);
					}

					if (moved && commitDrop) {
						const clientX = Number.isFinite(upEvent.clientX) ? upEvent.clientX : startX;
						const clientY = Number.isFinite(upEvent.clientY) ? upEvent.clientY : startY;
						const dropTarget = currentDropTarget || getFolderItemDropTarget(dragDetail, clientX, clientY);
						if (dropTarget) {
							dropFolderItem(dragDetail, dropTarget, {
								clientX,
								clientY
							});
						} else if (platformDragStarted && dragDropManager && typeof dragDropManager.cancel === 'function') {
							dragDropManager.cancel('no-drop-target');
						}

						item.dataset.pdkSuppressFolderItemClick = '1';
					}
				};
				const up = (upEvent) => finish(upEvent, true);
				const cancel = (cancelEvent) => finish(cancelEvent, false);

				window.addEventListener('pointermove', move);
				window.addEventListener('pointerup', up);
				window.addEventListener('pointercancel', cancel);
			});
		}

		function isFolderPanePointerTargetBlocked(target) {
			return Boolean(target && typeof target.closest === 'function' && target.closest('a, button, input, select, textarea, [contenteditable="true"], [contenteditable="plaintext-only"]'));
		}

		function rectsIntersect(first, second) {
			return !(
				first.right < second.left
				|| first.left > second.right
				|| first.bottom < second.top
				|| first.top > second.bottom
			);
		}

		function getSelectionMode(event) {
			if (event && (event.metaKey || event.ctrlKey)) {
				return 'toggle';
			}

			return event && event.shiftKey ? 'add' : 'replace';
		}

		function ensureFolderMarquee(pane) {
			let marquee = pane
				? Array.from(pane.children).find((child) => child.classList && child.classList.contains('pdk-folder-marquee'))
				: null;
			if (marquee) {
				return marquee;
			}

			marquee = document.createElement('div');
			marquee.className = 'pdk-desktop-marquee pdk-folder-marquee';
			marquee.setAttribute('aria-hidden', 'true');
			pane.appendChild(marquee);

			return marquee;
		}

		function setFolderMarqueeRect(marquee, rect) {
			marquee.style.left = `${rect.left}px`;
			marquee.style.top = `${rect.top}px`;
			marquee.style.width = `${rect.width}px`;
			marquee.style.height = `${rect.height}px`;
		}

		function getFolderMarqueeRect(startX, startY, currentX, currentY, paneRect) {
			const x1 = Math.max(0, Math.min(startX - paneRect.left, paneRect.width));
			const y1 = Math.max(0, Math.min(startY - paneRect.top, paneRect.height));
			const x2 = Math.max(0, Math.min(currentX - paneRect.left, paneRect.width));
			const y2 = Math.max(0, Math.min(currentY - paneRect.top, paneRect.height));
			const left = Math.min(x1, x2);
			const top = Math.min(y1, y2);

			return {
				bottom: Math.max(y1, y2),
				height: Math.abs(y2 - y1),
				left,
				right: Math.max(x1, x2),
				top,
				width: Math.abs(x2 - x1)
			};
		}

		function getIntersectingFolderItems(pane, marqueeRect, paneRect) {
			if (!launcherRenderer || typeof launcherRenderer.getSelectableItems !== 'function') {
				return [];
			}

			return launcherRenderer.getSelectableItems(pane).filter((item) => {
				const itemRect = item.getBoundingClientRect();
				const relativeRect = {
					bottom: itemRect.bottom - paneRect.top,
					left: itemRect.left - paneRect.left,
					right: itemRect.right - paneRect.left,
					top: itemRect.top - paneRect.top
				};

				return rectsIntersect(marqueeRect, relativeRect);
			});
		}

		function startFolderPaneMarquee(event, pane) {
			if (
				!pane
				|| event.button !== 0
				|| isFolderPanePointerTargetBlocked(event.target)
				|| (event.target && typeof event.target.closest === 'function' && event.target.closest('.pdk-app-launcher, .pdk-finder-trash-item'))
			) {
				return;
			}

			const grid = pane.querySelector('.pdk-finder-grid');
			const mode = getSelectionMode(event);
			const baseSelection = launcherRenderer && typeof launcherRenderer.getSelectableItems === 'function'
				? new Set(launcherRenderer.getSelectableItems(pane).filter((item) => item.classList.contains('is-selected')))
				: new Set();
			const paneRect = pane.getBoundingClientRect();
			const startX = event.clientX;
			const startY = event.clientY;
			const marquee = ensureFolderMarquee(pane);
			let moved = false;

			if (mode === 'replace' && launcherRenderer && typeof launcherRenderer.clearSelection === 'function') {
				launcherRenderer.clearSelection(pane);
			}
			event.preventDefault();

			const move = (moveEvent) => {
				const deltaX = moveEvent.clientX - startX;
				const deltaY = moveEvent.clientY - startY;

				if (!moved && Math.abs(deltaX) + Math.abs(deltaY) < 4) {
					return;
				}

				moved = true;
				moveEvent.preventDefault();
				const rect = getFolderMarqueeRect(startX, startY, moveEvent.clientX, moveEvent.clientY, paneRect);
				setFolderMarqueeRect(marquee, rect);
				marquee.classList.add('is-active');
				if (launcherRenderer && typeof launcherRenderer.setItemsSelected === 'function') {
					launcherRenderer.setItemsSelected(pane, getIntersectingFolderItems(pane, rect, paneRect), {
						baseSelection,
						mode
					});
				}
			};

			const up = () => {
				window.removeEventListener('pointermove', move);
				window.removeEventListener('pointerup', up);
				window.removeEventListener('pointercancel', up);
				marquee.classList.remove('is-active');
				setFolderMarqueeRect(marquee, {
					height: 0,
					left: 0,
					top: 0,
					width: 0
				});
				if (moved) {
					pane.dataset.pdkSuppressSelectionClearClick = '1';
					window.setTimeout(() => {
						delete pane.dataset.pdkSuppressSelectionClearClick;
					}, 0);
				}
				if (!moved && mode === 'replace' && grid && launcherRenderer && typeof launcherRenderer.clearSelection === 'function') {
					launcherRenderer.clearSelection(grid);
				}
			};

			window.addEventListener('pointermove', move);
			window.addEventListener('pointerup', up);
			window.addEventListener('pointercancel', up);
		}

		function bindFolderPaneSelection(pane) {
			if (!pane || pane.dataset.pdkFolderSelectionBound === '1') {
				return;
			}

			pane.dataset.pdkFolderSelectionBound = '1';
			pane.addEventListener('pointerdown', (event) => {
				startFolderPaneMarquee(event, pane);
			});
		}

		function setExplorerSortMode(win, mode, options = {}) {
			const normalized = normalizeExplorerSortMode(mode);
			const folderId = options.folderId || (win && win.dataset ? win.dataset.pdkFolderWindow : '');
			const layout = getFolderViewLayout(win);

			if (folderId && options.persist !== false) {
				saveFolderDisplayState(folderId, {
					sortMode: normalized
				}, layout);
			}

			if (!win || !folderId) {
				return normalized;
			}

			win.dataset.pdkExplorerSortMode = normalized;
			if (options.render !== false) {
				renderFolderWindow(win, folderId, {
					replaceHistory: true,
					touch: false
				});
			}

			return normalized;
		}

		function navigateFolderHistory(win, offset) {
			const tab = win ? getFolderWindowState(win) : null;
			const nextIndex = tab ? tab.index + offset : -1;
			const nextFolderId = tab && nextIndex >= 0 && nextIndex < tab.entries.length ? tab.entries[nextIndex] : '';

			if (!nextFolderId) {
				return false;
			}

			tab.index = nextIndex;
			tab.folderId = nextFolderId;
			return renderFolderWindow(win, nextFolderId, {
				updateHistory: false
			});
		}

		function createFolderHistoryButton(direction, win) {
			const button = document.createElement('button');
			const history = getFolderWindowHistoryState(win);
			const canNavigate = direction === 'back' ? history.canBack : history.canForward;
			button.type = 'button';
			button.className = `pdk-settings-history-button pdk-settings-history-button-${direction} pdk-finder-history-button`;
			button.disabled = !canNavigate;
			button.setAttribute('aria-label', direction === 'back' ? getMenuLabel('back') : getMenuLabel('forward'));
			button.appendChild(dom.createElement('span', 'pdk-settings-history-chevron'));
			button.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				navigateFolderHistory(win, direction === 'back' ? -1 : 1);
			});

			return button;
		}

		function createExplorerNavigationButton(direction, win) {
			const button = document.createElement('button');
			const history = getFolderWindowHistoryState(win);
			const labelKeys = {
				back: 'back',
				forward: 'forward',
				refresh: 'refresh',
				up: 'up'
			};
			const canNavigate = direction === 'back'
				? history.canBack
				: (direction === 'forward' ? history.canForward : direction === 'refresh');

			button.type = 'button';
			button.className = `pdk-explorer-nav-button pdk-explorer-nav-button-${direction}`;
			button.dataset.pdkNoDrag = '';
			button.disabled = !canNavigate;
			button.setAttribute('aria-label', getMenuLabel(labelKeys[direction] || direction));
			button.appendChild(dom.createElement('span', 'pdk-explorer-nav-icon'));
			button.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				if (direction === 'back') {
					navigateFolderHistory(win, -1);
				} else if (direction === 'forward') {
					navigateFolderHistory(win, 1);
				} else if (direction === 'refresh') {
					refreshFolderWindow(win && win.dataset ? win.dataset.pdkFolderWindow : '');
				}
			});

			return button;
		}

		function createExplorerCommandIcon(action) {
			const icon = dom.createElement('span', 'pdk-explorer-command-icon');

			if (action.icon) {
				icon.appendChild(dom.createDashicon(action.icon));
			}

			return icon;
		}

		function getExplorerCommandDetail(folderId, win) {
			const folder = getFolder(folderId);

			return {
				folder,
				folderId,
				id: folderId,
				kind: contextTargets.FOLDER_TOOLBAR,
				label: folder && folder.label ? folder.label : '',
				type: contextTargets.FOLDER_TOOLBAR,
				windowElement: win || null
			};
		}

		function getExplorerCommandItem(action, folderId) {
			return {
				command: action.command || '',
				disabled: Boolean(action.disabled),
				label: action.label || '',
				payload: action.payload && typeof action.payload === 'object' ? action.payload : { target: folderId },
				target: action.target || folderId
			};
		}

		function canRunExplorerCommand(action, folderId, win) {
			const commands = window.PufferDesk.menuCommands;

			if (hasExplorerCommandMenu(action)) {
				return getExplorerCommandMenuItems(action, folderId, win).length > 0;
			}

			if (!action.command) {
				return action.disabled === false;
			}

			if (!commands || typeof commands.canExecute !== 'function') {
				return action.disabled !== true;
			}

			return commands.canExecute(
				getExplorerCommandItem(action, folderId),
				getExplorerCommandDetail(folderId, win)
			);
		}

		function runExplorerCommand(action, folderId, win) {
			const commands = window.PufferDesk.menuCommands;
			let executed = false;

			if (!action.command || !commands || typeof commands.execute !== 'function') {
				return false;
			}

			executed = commands.execute(
				getExplorerCommandItem(action, folderId),
				getExplorerCommandDetail(folderId, win)
			);
			window.requestAnimationFrame(() => syncFolderToolbarActionStates(win));

			return executed;
		}

		function explorerMenuItem(label, command, options = {}) {
			return Object.assign({
				command,
				label
			}, options);
		}

		function explorerMenuSeparator() {
			return { type: 'separator' };
		}

		function disabledExplorerMenuItem(label, options = {}) {
			return explorerMenuItem(label, '', Object.assign({}, options, {
				disabled: true
			}));
		}

		function getFolderViewModeMenuItems(folderId, win) {
			const layout = getFolderViewLayout(win);
			const viewMode = getExplorerViewMode(win);
			const items = folderMenuOptions
				? folderMenuOptions.getViewModeItems(folderId, {
					activeMode: viewMode,
					layout
				})
				: [];

			if (layout === 'file-explorer') {
				items.push(
					explorerMenuSeparator(),
					explorerMenuItem(getMenuLabel('details_pane'), '', {
						icon: ''
					}),
					explorerMenuItem(getMenuLabel('preview_pane'), '', {
						icon: 'dashicons-yes'
					}),
					explorerMenuSeparator(),
					explorerMenuItem(getMenuLabel('show'), '', {
						id: 'show',
						items: [
							disabledExplorerMenuItem(getMenuLabel('show_view_options'))
						]
					})
				);
			}

			return items;
		}

		function getExplorerCommandMenuItems(action, folderId, win) {
			const sortMode = getExplorerSortMode(win);

			if (action.id === 'sort') {
				return folderMenuOptions
					? folderMenuOptions.getSortModeItems(folderId, {
						activeMode: sortMode,
						layout: getFolderViewLayout(win)
					})
					: [];
			}

			if (action.id === 'view') {
				return getFolderViewModeMenuItems(folderId, win);
			}

			if (action.id === 'action') {
				return folderMenuOptions
					? folderMenuOptions.getFolderContentItems(folderId, {
						infoLabel: getMenuLabel('get_info'),
						layout: getFolderViewLayout(win),
						sortMode,
						viewMode: getExplorerViewMode(win)
					})
					: [];
			}

			if (action.id === 'more') {
				return [
					explorerMenuItem(getMenuLabel('refresh'), commandIds.FOLDER_REFRESH, {
						icon: 'dashicons-update',
						target: folderId
					}),
					explorerMenuSeparator(),
					disabledExplorerMenuItem(getMenuLabel('pin_to_quick_access'), {
						icon: 'dashicons-admin-links'
					}),
					disabledExplorerMenuItem(getMenuLabel('copy_as_path'), {
						icon: 'dashicons-clipboard',
						shortcut: 'Ctrl+Shift+C'
					}),
					explorerMenuSeparator(),
					explorerMenuItem(getMenuLabel('properties'), commandIds.FOLDER_GET_INFO, {
						icon: 'dashicons-info-outline',
						shortcut: shortcut('secondary+enter'),
						target: folderId
					}),
					disabledExplorerMenuItem(getMenuLabel('show_more_options'), {
						icon: 'dashicons-external'
					})
				];
			}

			return [];
		}

		function hasExplorerCommandMenu(action) {
			return Boolean(action && ['action', 'sort', 'view', 'more'].includes(action.id));
		}

		function closeExplorerCommandMenu() {
			if (typeof explorerCommandMenuCleanup === 'function') {
				explorerCommandMenuCleanup();
				explorerCommandMenuCleanup = null;
			}

			if (explorerCommandMenuButton) {
				explorerCommandMenuButton.classList.remove('is-menu-open');
				explorerCommandMenuButton.setAttribute('aria-expanded', 'false');
				explorerCommandMenuButton = null;
			}
		}

		function closeActiveExplorerCommandMenu() {
			const contextMenus = window.PufferDesk.contextMenus || window.PufferDesk.contextMenuController || null;

			if (contextMenus && typeof contextMenus.close === 'function') {
				contextMenus.close();
				return;
			}

			closeExplorerCommandMenu();
		}

		function getExplorerCommandMenuPoint(button) {
			const buttonRect = button.getBoundingClientRect();
			const placement = button.dataset ? button.dataset.pdkExplorerMenuPlacement || '' : '';
			const icon = button.classList && button.classList.contains('pdk-finder-toolbar-button')
				? button.querySelector('.pdk-finder-toolbar-icon')
				: null;
			const anchorRect = icon && typeof icon.getBoundingClientRect === 'function'
				? icon.getBoundingClientRect()
				: buttonRect;
			let y = buttonRect.bottom + 4;

			if (placement === 'icon-top') {
				y = anchorRect.top;
			} else if (placement === 'icon-bottom') {
				y = anchorRect.bottom + 2;
			}

			return {
				x: anchorRect.left,
				y
			};
		}

		function openExplorerCommandMenu(action, folderId, win, button, options = {}) {
			const contextMenus = window.PufferDesk.contextMenus || window.PufferDesk.contextMenuController || null;
			const items = getExplorerCommandMenuItems(action, folderId, win);
			const detail = Object.assign(getExplorerCommandDetail(folderId, win), {
				area: contextAreas.FOLDER,
				contextKey: contextKeys.FOLDER_TOOLBAR,
				itemType: '',
				menuClassName: 'pdk-explorer-command-menu',
				menuDataset: {
					pdkExplorerCommandMenu: action.id
				},
				menuDefinition: {
					groups: [
						{
							id: action.id || 'toolbar-command',
							items,
							label: action.label
						}
					]
				},
				metadata: {
					explorerCommandAction: action.id,
					folderId
				},
				autoFocusFirst: options.autoFocusFirst === true,
				targetElement: button,
				targetType: contextTargetTypes.TOOLBAR
			});

			if (!items.length || !contextMenus || typeof contextMenus.openMenu !== 'function') {
				return false;
			}

			if (explorerCommandMenuButton === button) {
				closeActiveExplorerCommandMenu();
				return true;
			}

			closeActiveExplorerCommandMenu();
			explorerCommandMenuButton = button;
			button.classList.add('is-menu-open');
			button.setAttribute('aria-expanded', 'true');

			if (!contextMenus.openMenu(detail, getExplorerCommandMenuPoint(button))) {
				closeExplorerCommandMenu();
				return false;
			}

			if (window.PufferDesk.events && typeof window.PufferDesk.events.once === 'function') {
				explorerCommandMenuCleanup = window.PufferDesk.events.once(eventNames.CONTEXT_MENU_CLOSE, closeExplorerCommandMenu);
			}

			return true;
		}

		function createExplorerCommandButton(action, folderId, win) {
			const button = document.createElement('button');
			const canRun = canRunExplorerCommand(action, folderId, win);

			button.type = 'button';
			button.className = `pdk-explorer-command-button pdk-explorer-command-button-${action.id}`;
			button.dataset.pdkExplorerCommand = action.id;
			button.dataset.pdkNoDrag = '';
			button.disabled = !canRun;
			button.setAttribute('aria-label', action.label);
			if (hasExplorerCommandMenu(action)) {
				button.setAttribute('aria-haspopup', 'menu');
				button.setAttribute('aria-expanded', 'false');
			}
			button.appendChild(createExplorerCommandIcon(action));
			if (action.showLabel !== false) {
				button.appendChild(dom.createElement('span', 'pdk-explorer-command-label', action.label));
			}
			if (action.disclosure) {
				button.appendChild(dom.createElement('span', 'pdk-explorer-command-disclosure'));
			}
			button.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				if (hasExplorerCommandMenu(action)) {
					openExplorerCommandMenu(action, folderId, win, button);
					return;
				}
				runExplorerCommand(action, folderId, win);
			});
			button.addEventListener('keydown', (event) => {
				if (!hasExplorerCommandMenu(action) || !['ArrowDown', 'Enter', ' '].includes(event.key)) {
					return;
				}

				event.preventDefault();
				openExplorerCommandMenu(action, folderId, win, button, {
					autoFocusFirst: true
				});
			});

			return button;
		}

		function getExplorerCommandGroups(folderId) {
			return [
				[
					{ id: 'new', label: getMenuLabel('new'), icon: 'dashicons-plus-alt2', command: commandIds.FOLDER_CREATE, disclosure: true }
				],
				[
					{ id: 'cut', label: getMenuLabel('cut'), icon: 'dashicons-admin-page', command: commandIds.CLIPBOARD_CUT, hideWhenUnavailable: true, showLabel: false },
					{ id: 'copy', label: getMenuLabel('copy'), icon: 'dashicons-clipboard', command: commandIds.CLIPBOARD_COPY, showLabel: false },
					{ id: 'paste', label: getMenuLabel('paste'), icon: 'dashicons-admin-page', command: commandIds.CLIPBOARD_PASTE, hideWhenUnavailable: true, showLabel: false },
					{ id: 'rename', label: getMenuLabel('rename'), icon: 'dashicons-edit', command: isUserFolder(folderId) ? commandIds.FOLDER_RENAME : '', showLabel: false },
					{ id: 'share', label: getMenuLabel('share'), icon: 'dashicons-share', showLabel: false },
					{ id: 'delete', label: getMenuLabel('delete'), icon: 'dashicons-trash', command: commandIds.FOLDER_DELETE_SELECTED, showLabel: false }
				],
				[
					{ id: 'sort', label: getMenuLabel('sort'), icon: 'dashicons-sort', disclosure: true },
					{ id: 'view', label: getMenuLabel('view'), icon: 'dashicons-grid-view', disclosure: true },
					{ id: 'more', label: getMenuLabel('more'), icon: 'dashicons-ellipsis', showLabel: false }
				],
				[
					{ id: 'details', label: getMenuLabel('preview'), icon: 'dashicons-list-view', command: commandIds.FOLDER_GET_INFO }
				]
			];
		}

		function createExplorerCommandBar(folderId, win) {
			const bar = dom.createElement('div', 'pdk-explorer-commandbar');

			bar.dataset.pdkContext = contextTargets.FOLDER_TOOLBAR;
			bar.dataset.pdkContextId = folderId;
			bar.dataset.pdkContextLabel = getMenuLabel('folder_command_bar');
			bar.dataset.pdkNoDrag = '';
			getExplorerCommandGroups(folderId).forEach((group, index, groups) => {
				const groupElement = dom.createElement('div', index === groups.length - 1 ? 'pdk-explorer-command-group pdk-explorer-command-group-details' : 'pdk-explorer-command-group');
				group.forEach((action) => {
					groupElement.appendChild(createExplorerCommandButton(action, folderId, win));
				});
				bar.appendChild(groupElement);
			});

			return bar;
		}

		function getExplorerCommandActions(folderId) {
			return getExplorerCommandGroups(folderId).flat();
		}

		function syncExplorerCommandBarActionStates(win) {
			const folderId = win && win.dataset ? win.dataset.pdkFolderWindow : '';
			const actions = new Map(getExplorerCommandActions(folderId).map((action) => [action.id, action]));

			if (!win || !folderId) {
				return;
			}

			win.querySelectorAll('.pdk-explorer-commandbar [data-pdk-explorer-command]').forEach((button) => {
				const action = actions.get(button.dataset.pdkExplorerCommand);

				if (!action) {
					return;
				}

				button.disabled = !canRunExplorerCommand(action, folderId, win);
			});
		}

		function bindExplorerCommandBar(win) {
			if (!win) {
				return;
			}

			if (win.pdkExplorerCommandSelectionHandler) {
				win.removeEventListener(domEventNames.FOLDER_SELECTION_CHANGE, win.pdkExplorerCommandSelectionHandler);
			}

			win.pdkExplorerCommandSelectionHandler = () => {
				window.requestAnimationFrame(() => syncExplorerCommandBarActionStates(win));
			};
			win.addEventListener(domEventNames.FOLDER_SELECTION_CHANGE, win.pdkExplorerCommandSelectionHandler);
			syncExplorerCommandBarActionStates(win);
		}

		function createExplorerAddressBar(folderId, win) {
			const folder = getFolder(folderId);
			const folderTitle = getFolderTitle(folder);
			const bar = dom.createElement('div', 'pdk-explorer-addressbar');
			const navigation = dom.createElement('div', 'pdk-explorer-navigation');
			const address = dom.createElement('div', 'pdk-explorer-address-field');
			const breadcrumbs = virtualFilesystem && typeof virtualFilesystem.getBreadcrumbs === 'function'
				? virtualFilesystem.getBreadcrumbs(folderId)
				: [];
			const crumbs = breadcrumbs.length ? breadcrumbs : [
				getMenuLabel('admin'),
				folderTitle
			];
			const search = dom.createElement('label', 'pdk-explorer-search');
			const searchInput = document.createElement('input');

			bar.dataset.pdkNoDrag = '';
			navigation.append(
				createExplorerNavigationButton('back', win),
				createExplorerNavigationButton('forward', win),
				createExplorerNavigationButton('up', win),
				createExplorerNavigationButton('refresh', win)
			);

			address.setAttribute('aria-label', getMenuLabel('address'));
			crumbs.forEach((crumb, index) => {
				if (index > 0) {
					address.appendChild(dom.createElement('span', 'pdk-explorer-address-separator'));
				}
				address.appendChild(dom.createElement('span', index === crumbs.length - 1 ? 'pdk-explorer-address-crumb is-current' : 'pdk-explorer-address-crumb', crumb));
			});

			search.appendChild(dom.createDashicon('dashicons-search'));
			searchInput.type = 'search';
			searchInput.placeholder = formatMenuLabel('combined_label_format', '', [getMenuLabel('search'), folderTitle]);
			searchInput.setAttribute('aria-label', formatMenuLabel('combined_label_format', '', [getMenuLabel('search'), folderTitle]));
			searchInput.addEventListener('keydown', (event) => {
				event.stopPropagation();
			});
			search.appendChild(searchInput);

			bar.append(navigation, address, search);

			return bar;
		}

		function createExplorerStatusBar(folderId, win = null) {
			const bar = dom.createElement('div', 'pdk-explorer-statusbar');
			const isTrash = isTrashFolderId(folderId);
			const count = isTrash ? getTrashItems().length : getFolderDisplayItems(folderId, win).length;
			const countLabel = count === 1 ? getMenuLabel('item_singular') : getMenuLabel('item_plural');
			const summary = dom.createElement('span', 'pdk-explorer-status-summary', formatMenuLabel('item_count_format', '', [count, countLabel]));
			const viewGroup = dom.createElement('div', 'pdk-explorer-status-view-group');
			const listButton = document.createElement('button');
			const detailButton = document.createElement('button');
			const setViewButtons = (mode) => {
				listButton.classList.toggle('is-active', mode === 'list');
				detailButton.classList.toggle('is-active', mode === 'details');
				listButton.setAttribute('aria-pressed', mode === 'list' ? 'true' : 'false');
				detailButton.setAttribute('aria-pressed', mode === 'details' ? 'true' : 'false');
			};
			const getTargetWindow = () => bar.closest ? bar.closest('.pdk-window') : null;

			bar.dataset.pdkNoDrag = '';
			listButton.type = 'button';
			listButton.className = 'pdk-explorer-status-view-button pdk-explorer-status-view-button-list';
			listButton.dataset.pdkFolderViewMode = 'list';
			listButton.dataset.pdkExplorerViewMode = 'list';
			listButton.setAttribute('aria-label', getMenuLabel('list_view'));
			listButton.appendChild(dom.createElement('span', 'pdk-explorer-status-view-icon'));
			detailButton.type = 'button';
			detailButton.className = 'pdk-explorer-status-view-button pdk-explorer-status-view-button-details';
			detailButton.dataset.pdkFolderViewMode = 'details';
			detailButton.dataset.pdkExplorerViewMode = 'details';
			detailButton.setAttribute('aria-label', getMenuLabel('details_view'));
			detailButton.appendChild(dom.createElement('span', 'pdk-explorer-status-view-icon'));
			listButton.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				setExplorerViewMode(getTargetWindow(), 'list', {
					folderId
				});
			});
			detailButton.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				setExplorerViewMode(getTargetWindow(), 'details', {
					folderId
				});
			});
			setViewButtons(getExplorerViewMode(win));
			viewGroup.append(listButton, detailButton);
			bar.append(summary, viewGroup);

			return bar;
		}

		function createFolderEmptyState() {
			const empty = dom.createElement('p', 'pdk-folder-empty-state pdk-explorer-empty-state', getMenuLabel('folder_empty'));

			empty.setAttribute('role', 'status');

			return empty;
		}

		function applyFolderPaneContext(pane, folderId, folder = null) {
			if (!pane) {
				return;
			}

			pane.dataset.pdkContext = contextTargets.FOLDER_CONTENT;
			pane.dataset.pdkContextId = folderId;
			pane.dataset.pdkContextLabel = folder && folder.label ? folder.label : getMenuLabel('folder');
			pane.dataset.pdkFolderId = folderId;
		}

		function parseDocumentId(value) {
			const raw = String(value || '');
			const direct = Number.parseInt(raw, 10);
			const match = raw.match(/(\d+)$/);

			if (Number.isFinite(direct) && direct > 0) {
				return direct;
			}

			return match ? Number.parseInt(match[1], 10) || 0 : 0;
		}

		function getSelectedFolderItemElements(folderId, win = null) {
			const targetWindow = win || getFolderWindow(folderId);
			const grid = targetWindow ? targetWindow.querySelector('.pdk-finder-pane .pdk-finder-grid') : null;
			const currentFolderId = targetWindow && targetWindow.dataset ? targetWindow.dataset.pdkFolderWindow || folderId : folderId;

			if (!grid || !currentFolderId) {
				return [];
			}

			return Array.from(grid.querySelectorAll('.pdk-app-launcher.is-selected, .pdk-finder-trash-item.is-selected'))
				.filter((item) => {
					const itemFolderId = item.dataset.pdkFolderId || currentFolderId;

					return itemFolderId === currentFolderId;
				});
		}

		function getSelectedFolderItems(folderId, win = null) {
			const targetWindow = win || getFolderWindow(folderId);
			const currentFolderId = targetWindow && targetWindow.dataset ? targetWindow.dataset.pdkFolderWindow || folderId : folderId;

			return getSelectedFolderItemElements(currentFolderId, targetWindow)
				.map((item) => {
					const context = item.dataset.pdkContext || '';
					const id = item.dataset.pdkContextId || '';

					if (context === 'folder') {
						return {
							id,
							parentFolderId: currentFolderId,
							type: 'folder'
						};
					}

					if (context === 'folder-app') {
						return {
							id,
							parentFolderId: item.dataset.pdkFolderId || currentFolderId,
							type: 'app'
						};
					}

					if (context === 'document') {
						return {
							id: parseDocumentId(item.dataset.pdkDocumentId || id),
							kind: item.dataset.pdkDocumentKind || '',
							parentFolderId: item.dataset.pdkFolderId || currentFolderId,
							type: 'document'
						};
					}

					return null;
				})
				.filter(Boolean);
		}

		function canDeleteSelectedFolderItem(item) {
			if (!item || !item.id) {
				return false;
			}

			if (item.type === 'folder') {
				return Boolean(getFolderProvider() && isUserFolder(item.id));
			}

			if (item.type === 'app') {
				return Boolean(getFolderProvider() && item.parentFolderId && isUserFolder(item.parentFolderId));
			}

			if (item.type === 'document') {
				const stickyManager = window.PufferDesk.stickyNoteManager || null;

				return Boolean(
					item.id > 0
					&& (
						(documentStore && typeof documentStore.remove === 'function')
						|| (item.kind && documentStore && documentStore.kinds && item.kind === documentStore.kinds.sticky && stickyManager && typeof stickyManager.deleteNote === 'function')
					)
				);
			}

			return false;
		}

		function hasSelectedFolderItems(folderId, options = {}) {
			return getSelectedFolderItems(folderId, options.windowElement || null).some(canDeleteSelectedFolderItem);
		}

		function moveSelectedFolderItemsToTrash(folderId, options = {}) {
			const win = options.windowElement || getFolderWindow(folderId);
			const provider = getFolderProvider();
			const selectedItems = getSelectedFolderItems(folderId, win).filter(canDeleteSelectedFolderItem);
			const documentDeletes = [];
			let changed = false;

			if (!selectedItems.length) {
				return Promise.resolve(false);
			}

			selectedItems.forEach((item) => {
				if (item.type === 'folder' && provider && typeof provider.moveFolderToTrash === 'function') {
					changed = provider.moveFolderToTrash(item.id) || changed;
				} else if (item.type === 'app' && provider && typeof provider.removeAppFromFolder === 'function') {
					changed = provider.removeAppFromFolder(item.id, item.parentFolderId) || changed;
				} else if (item.type === 'document') {
					const stickyManager = window.PufferDesk.stickyNoteManager || null;
					const isSticky = Boolean(item.kind && documentStore && documentStore.kinds && item.kind === documentStore.kinds.sticky);
					const removePromise = documentStore && typeof documentStore.get === 'function' && typeof documentStore.remove === 'function'
						? documentStore.get(item.id).then((documentData) => documentStore.remove(item.id).then((deleted) => {
							if (deleted && provider && typeof provider.moveDocumentToTrash === 'function') {
								provider.moveDocumentToTrash(documentData);
							}
							if (deleted && isSticky && stickyManager && typeof stickyManager.removeRenderedNote === 'function') {
								stickyManager.removeRenderedNote(item.id);
							}

							return deleted;
						}))
						: Promise.resolve(false);

					documentDeletes.push(Promise.resolve(removePromise).then((deleted) => {
						changed = Boolean(deleted) || changed;
					}));
				}
			});

			return Promise.all(documentDeletes).then(() => {
				const activeFolderId = win && win.dataset ? win.dataset.pdkFolderWindow || folderId : folderId;

				if (activeFolderId) {
					refreshFolderWindow(activeFolderId);
				}

				return changed;
			});
		}

		function deleteSelectedFolderItems(folderId, options = {}) {
			return moveSelectedFolderItemsToTrash(folderId, options);
		}

		function deleteSelectedFolderItemsImmediately(folderId, options = {}) {
			const win = options.windowElement || getFolderWindow(folderId);
			const provider = getFolderProvider();
			const selectedItems = getSelectedFolderItems(folderId, win).filter(canDeleteSelectedFolderItem);
			const documentDeletes = [];
			let changed = false;

			if (!selectedItems.length) {
				return Promise.resolve(false);
			}

			selectedItems.forEach((item) => {
				if (item.type === 'folder' && provider && typeof provider.deleteFolder === 'function') {
					changed = provider.deleteFolder(item.id) || changed;
				} else if (item.type === 'app' && provider && typeof provider.removeAppFromFolder === 'function') {
					changed = provider.removeAppFromFolder(item.id, item.parentFolderId) || changed;
				} else if (item.type === 'document') {
					const stickyManager = window.PufferDesk.stickyNoteManager || null;
					const isSticky = Boolean(item.kind && documentStore && documentStore.kinds && item.kind === documentStore.kinds.sticky);
					const removePromise = isSticky && stickyManager && typeof stickyManager.deleteNote === 'function'
						? stickyManager.deleteNote(item.id, { force: true })
						: (documentStore && typeof documentStore.remove === 'function' ? documentStore.remove(item.id, { force: true }) : Promise.resolve(false));

					documentDeletes.push(Promise.resolve(removePromise).then((deleted) => {
						changed = Boolean(deleted) || changed;
					}));
				}
			});

			return Promise.all(documentDeletes).then(() => {
				const activeFolderId = win && win.dataset ? win.dataset.pdkFolderWindow || folderId : folderId;

				if (activeFolderId) {
					refreshFolderWindow(activeFolderId);
				}

				return changed;
			});
		}

		function createFolderToolbarIcon(action) {
			const icon = dom.createElement('span', `pdk-finder-toolbar-icon pdk-finder-toolbar-icon-${action.id}`);

			if (action.icon) {
				icon.appendChild(dom.createDashicon(action.icon));
			}

			if (action.badge) {
				icon.appendChild(dom.createElement('span', `pdk-finder-toolbar-badge pdk-finder-toolbar-badge-${action.badge}`));
			}

			if (action.disclosure === 'vertical') {
				const disclosure = dom.createElement('span', 'pdk-finder-toolbar-disclosure-pair');
				disclosure.append(
					dom.createElement('span', 'pdk-finder-toolbar-disclosure-caret pdk-finder-toolbar-disclosure-caret-up'),
					dom.createElement('span', 'pdk-finder-toolbar-disclosure-caret pdk-finder-toolbar-disclosure-caret-down')
				);
				icon.appendChild(disclosure);
			} else if (action.disclosure) {
				icon.appendChild(dom.createElement('span', 'pdk-finder-toolbar-disclosure'));
			}

			return icon;
		}

		function activateFolderToolbarAction(action, folderId, win, button) {
			if (!canRunExplorerCommand(action, folderId, win)) {
				return false;
			}

			if (hasExplorerCommandMenu(action)) {
				return openExplorerCommandMenu(action, folderId, win, button);
			}

			return runExplorerCommand(action, folderId, win);
		}

		function syncFolderToolbarButtonState(button, action, folderId, win) {
			const canRun = canRunExplorerCommand(action, folderId, win);

			button.disabled = !canRun;
			button.setAttribute('aria-disabled', canRun ? 'false' : 'true');
		}

		function createFolderToolbarButton(action, folderId, win) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = `pdk-finder-toolbar-button pdk-finder-toolbar-button-${action.id}`;
			button.tabIndex = -1;
			button.dataset.pdkNoDrag = '';
			button.dataset.pdkToolbarAction = action.id;
			if (action.menuPlacement) {
				button.dataset.pdkExplorerMenuPlacement = action.menuPlacement;
			}
			button.setAttribute('aria-label', action.label);
			if (hasExplorerCommandMenu(action)) {
				button.setAttribute('aria-haspopup', 'menu');
				button.setAttribute('aria-expanded', 'false');
			}
			button.appendChild(createFolderToolbarIcon(action));
			button.appendChild(dom.createElement('span', 'pdk-finder-toolbar-label', action.label));
			syncFolderToolbarButtonState(button, action, folderId, win);
			button.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				activateFolderToolbarAction(action, folderId, win, button);
			});
			button.addEventListener('keydown', (event) => {
				if (!hasExplorerCommandMenu(action) || !['ArrowDown', 'Enter', ' '].includes(event.key)) {
					return;
				}

				event.preventDefault();
				activateFolderToolbarAction(action, folderId, win, button);
			});

			return button;
		}

		function getFolderToolbarActions(folderId = '') {
			const canCreateFolder = folderId && !isTrashFolderId(folderId);
			const deleteCommand = themeFamily === 'pufferdesk'
				? commandIds.FOLDER_DELETE_SELECTED_IMMEDIATELY
				: commandIds.FOLDER_DELETE_SELECTED;
			const actions = [
				{ id: 'view', label: getMenuLabel('view'), icon: 'dashicons-grid-view', disclosure: 'vertical', menuPlacement: 'icon-top' },
				{ id: 'copy', label: getMenuLabel('copy'), icon: 'dashicons-clipboard', command: commandIds.CLIPBOARD_COPY },
				{ id: 'paste', label: getMenuLabel('paste'), icon: 'dashicons-admin-page', command: commandIds.CLIPBOARD_PASTE },
				{ id: 'delete', label: getMenuLabel('delete'), icon: 'dashicons-trash', command: deleteCommand },
				{ id: 'get-info', label: getMenuLabel('get_info'), icon: 'dashicons-info-outline', command: commandIds.FOLDER_GET_INFO }
			];

			if (showsCutFolderActions()) {
				actions.splice(2, 0, { id: 'cut', label: getMenuLabel('cut'), icon: 'dashicons-admin-page', command: commandIds.CLIPBOARD_CUT });
			}

			if (canCreateFolder) {
				actions.push({ id: 'new-folder', label: getMenuLabel('new_folder'), icon: 'dashicons-category', badge: 'plus', command: commandIds.FOLDER_CREATE });
			}

			actions.push({ id: 'action', label: getMenuLabel('action'), icon: 'dashicons-ellipsis', menuPlacement: 'icon-bottom' });

			return actions;
		}

		function createFolderToolbarActions(folderId, win) {
			const actions = dom.createElement('div', 'pdk-finder-toolbar-actions');
			const toolbarActions = getFolderToolbarActions(folderId);

			actions.dataset.pdkNoDrag = '';
			toolbarActions.forEach((action) => {
				actions.appendChild(createFolderToolbarButton(action, folderId, win));
			});

			return actions;
		}

		function syncFolderToolbarActionStates(win) {
			const folderId = win && win.dataset ? win.dataset.pdkFolderWindow : '';
			const actions = new Map(getFolderToolbarActions(folderId).map((action) => [action.id, action]));

			if (!win || !folderId) {
				return;
			}

			win.querySelectorAll('.pdk-finder-toolbar-actions [data-pdk-toolbar-action]').forEach((button) => {
				const action = actions.get(button.dataset.pdkToolbarAction);

				if (action) {
					syncFolderToolbarButtonState(button, action, folderId, win);
				}
			});
		}

		function bindFolderToolbarActionStates(win) {
			if (!win) {
				return;
			}

			if (win.pdkFolderToolbarActionStateHandler) {
				win.removeEventListener(domEventNames.FOLDER_SELECTION_CHANGE, win.pdkFolderToolbarActionStateHandler);
			}

			win.pdkFolderToolbarActionStateHandler = () => {
				window.requestAnimationFrame(() => syncFolderToolbarActionStates(win));
			};
			win.addEventListener(domEventNames.FOLDER_SELECTION_CHANGE, win.pdkFolderToolbarActionStateHandler);
			syncFolderToolbarActionStates(win);
		}

		function getFolderTabTitle(tab) {
			return getFolderLabel(tab && tab.folderId ? tab.folderId : '');
		}

		function serializeFolderTabs(win) {
			return folderWindows.serialize(win, win && win.dataset ? win.dataset.pdkFolderWindow : '');
		}

		function saveFolderWindowSession() {
			if (manager && typeof manager.saveSession === 'function') {
				manager.saveSession();
			}
		}

		function getActiveFolderWindow() {
			const activeWindow = manager && typeof manager.getActiveWindow === 'function'
				? manager.getActiveWindow()
				: null;

			if (activeWindow && activeWindow.dataset && activeWindow.dataset.pdkWindowKind === folderWindowKind && !activeWindow.classList.contains('is-closed')) {
				return activeWindow;
			}

			return shell.querySelector(`.pdk-window[data-pdk-window-kind="${dom.escapeAttribute(folderWindowKind)}"]:not(.is-closed)`);
		}

		function getFolderWindowWithTab(folderId) {
			if (!folderId) {
				return null;
			}

			return Array.from(shell.querySelectorAll(`.pdk-window[data-pdk-window-kind="${dom.escapeAttribute(folderWindowKind)}"]:not(.is-closed)`))
				.find((win) => folderWindows.windowHasFolderTab(win, folderId)) || null;
		}

		function focusFolderWindow(win, options = {}) {
			if (win && options.skipFocus !== true && manager && typeof manager.focusWindow === 'function') {
				manager.focusWindow(win);
			}
		}

		function recordFolderOpen(folderId, folder) {
			const folderTitle = getFolderTitle(folder);

			addRecentItem({
				command: commandIds.OPEN_FOLDER,
				icon: folder && folder.icon ? folder.icon : defaultDashicon,
				id: folderId,
				label: folderTitle,
				target: folderId,
				title: folderTitle,
				type: 'folder'
			});
		}

		function createTrashSubbar() {
			const bar = dom.createElement('div', 'pdk-finder-subbar pdk-trash-subbar');
			const title = dom.createElement('strong', 'pdk-finder-subbar-title', getMenuLabel('trash'));
			const emptyButton = document.createElement('button');

			emptyButton.type = 'button';
			emptyButton.className = 'pdk-trash-empty-control';
			emptyButton.dataset.pdkNoDrag = '';
			emptyButton.disabled = getTrashCount() <= 0;
			emptyButton.textContent = getMenuLabel('empty');
			emptyButton.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				executeCommand(commandIds.TRASH_EMPTY);
			});
			bar.append(title, emptyButton);

			return bar;
		}

		function activateFolderTab(win, tabId, options = {}) {
			const state = getFolderWindowTabs(win);
			const tab = state.tabs.find((item) => item.id === tabId);

			if (!win || !tab) {
				return false;
			}

			state.activeTabId = tab.id;
			const rendered = renderFolderWindow(win, tab.folderId, {
				updateHistory: false,
				touch: options.touch
			});

			if (rendered) {
				saveFolderWindowSession();
			}

			return rendered;
		}

		function closeFolderTab(win, tabId) {
			const state = getFolderWindowTabs(win);
			const index = state.tabs.findIndex((tab) => tab.id === tabId);

			if (!win || index < 0) {
				return false;
			}

			if (state.tabs.length <= 1) {
				if (manager && typeof manager.closeWindow === 'function') {
					manager.closeWindow(win, '');
				}
				return true;
			}

			const closingActive = state.activeTabId === tabId;
			state.tabs.splice(index, 1);
			if (closingActive) {
				const nextTab = state.tabs[Math.min(index, state.tabs.length - 1)];
				state.activeTabId = nextTab ? nextTab.id : '';
			}

			const activeTab = getActiveFolderTab(win);
			const rendered = activeTab ? renderFolderWindow(win, activeTab.folderId, {
				updateHistory: false,
				touch: false
			}) : false;

			if (rendered) {
				saveFolderWindowSession();
			}

			return rendered;
		}

		function duplicateFolderTab(win, tabId) {
			const state = getFolderWindowTabs(win);
			const index = state.tabs.findIndex((tab) => tab.id === tabId);
			const tab = state.tabs[index] || null;

			if (!win || !tab) {
				return null;
			}

			const duplicate = createFolderTab(tab.folderId, {
				entries: tab.entries.slice(),
				index: tab.index
			});
			state.tabs.splice(index + 1, 0, duplicate);
			state.activeTabId = duplicate.id;

			if (renderFolderWindow(win, duplicate.folderId, {
				updateHistory: false,
				touch: false
			})) {
				saveFolderWindowSession();
			}

			return duplicate;
		}

		function closeOtherFolderTabs(win, tabId) {
			const state = getFolderWindowTabs(win);
			const tab = state.tabs.find((item) => item.id === tabId);

			if (!win || !tab || state.tabs.length <= 1) {
				return false;
			}

			state.tabs = [tab];
			state.activeTabId = tab.id;

			if (renderFolderWindow(win, tab.folderId, {
				updateHistory: false,
				touch: false
			})) {
				saveFolderWindowSession();
				return true;
			}

			return false;
		}

		function closeFolderTabsToRight(win, tabId) {
			const state = getFolderWindowTabs(win);
			const index = state.tabs.findIndex((tab) => tab.id === tabId);

			if (!win || index < 0 || index >= state.tabs.length - 1) {
				return false;
			}

			const keepTabs = state.tabs.slice(0, index + 1);
			const activeStillOpen = keepTabs.some((tab) => tab.id === state.activeTabId);
			const activeTab = activeStillOpen
				? state.tabs.find((tab) => tab.id === state.activeTabId)
				: state.tabs[index];

			state.tabs = keepTabs;
			state.activeTabId = activeTab ? activeTab.id : state.tabs[0] ? state.tabs[0].id : '';

			if (activeTab && renderFolderWindow(win, activeTab.folderId, {
				updateHistory: false,
				touch: false
			})) {
				saveFolderWindowSession();
				return true;
			}

			return false;
		}

		function addFolderTab(win, folderId, options = {}) {
			if (!win || !getFolder(folderId)) {
				return null;
			}

			const state = getFolderWindowTabs(win, folderId);
			const tab = createFolderTab(folderId);
			state.tabs.push(tab);
			state.activeTabId = tab.id;
			const rendered = renderFolderWindow(win, folderId, {
				updateHistory: false,
				touch: options.touch
			});

			if (rendered) {
				saveFolderWindowSession();
			}

			return tab;
		}

		function createFolderTabCloseButton(win, tab) {
			const button = document.createElement('button');
			const label = getFolderTabTitle(tab);

			button.type = 'button';
			button.className = 'pdk-finder-tab-close';
			button.dataset.pdkNoDrag = '';
			button.setAttribute('aria-label', formatMenuLabel('label_colon_format', '', [getMenuLabel('close_tab'), label]));
			button.appendChild(dom.createElement('span', 'pdk-finder-tab-close-icon'));
			button.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				closeFolderTab(win, tab.id);
			});

			return button;
		}

		function createFolderTabButton(win, tab, activeTabId) {
			const item = dom.createElement('div', `pdk-finder-tab${tab.id === activeTabId ? ' is-active' : ''}`);
			const button = document.createElement('button');
			const label = getFolderTabTitle(tab);

			item.setAttribute('role', 'presentation');
			button.type = 'button';
			button.className = 'pdk-finder-tab-button';
			button.dataset.pdkNoDrag = '';
			button.setAttribute('aria-selected', tab.id === activeTabId ? 'true' : 'false');
			button.setAttribute('role', 'tab');
			button.textContent = label;
			button.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				activateFolderTab(win, tab.id);
			});

			item.append(createFolderTabCloseButton(win, tab), button);

			return item;
		}

		function createFolderTabs(win) {
			const state = getFolderWindowTabs(win, win && win.dataset ? win.dataset.pdkFolderWindow : '');
			const tabBar = dom.createElement('div', 'pdk-finder-tabs');
			const list = dom.createElement('div', 'pdk-finder-tab-list');
			const addButton = document.createElement('button');
			const activeTab = getActiveFolderTab(win);

			if (isFileExplorerLayout() || state.tabs.length < 2) {
				return null;
			}

			tabBar.dataset.pdkNoDrag = '';
			tabBar.setAttribute('aria-label', getMenuLabel('folder_tabs'));
			list.setAttribute('role', 'tablist');
			state.tabs.forEach((tab) => {
				list.appendChild(createFolderTabButton(win, tab, state.activeTabId));
			});

			addButton.type = 'button';
			addButton.className = 'pdk-finder-tab-add';
			addButton.dataset.pdkNoDrag = '';
			addButton.setAttribute('aria-label', getMenuLabel('new_tab'));
			addButton.appendChild(dom.createElement('span', 'pdk-finder-tab-add-icon'));
			addButton.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				addFolderTab(win, activeTab && activeTab.folderId ? activeTab.folderId : state.tabs[0] ? state.tabs[0].folderId : '');
			});

			tabBar.append(list, addButton);

			return tabBar;
		}

		function createExplorerTitlebarTabCloseButton(win, tabId, label) {
			const button = document.createElement('button');

			button.type = 'button';
			button.className = 'pdk-explorer-titlebar-tab-close';
			button.dataset.pdkNoDrag = '';
			button.setAttribute('aria-label', formatMenuLabel('label_colon_format', '', [getMenuLabel('close_tab'), label]));
			button.appendChild(dom.createElement('span', 'pdk-explorer-titlebar-tab-close-icon'));
			button.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				closeFolderTab(win, tabId);
			});

			return button;
		}

		function createExplorerTitlebarTab(win, tab, activeTabId) {
			const folder = getFolder(tab.folderId);
			const label = getFolderTabTitle(tab);
			const item = dom.createElement('span', `pdk-explorer-titlebar-tab${tab.id === activeTabId ? ' is-active' : ''}`);
			const button = document.createElement('button');
			const icon = dom.createElement('span', 'pdk-explorer-titlebar-tab-icon');
			const text = dom.createElement('span', 'pdk-explorer-titlebar-tab-text', label);

			item.setAttribute('role', 'presentation');
			item.dataset.pdkContext = contextTargets.FOLDER_TAB;
			item.dataset.pdkContextId = tab.id;
			item.dataset.pdkContextLabel = label;
			item.dataset.pdkFolderId = tab.folderId || '';
			button.type = 'button';
			button.className = 'pdk-explorer-titlebar-tab-button';
			button.dataset.pdkNoDrag = '';
			button.setAttribute('aria-selected', tab.id === activeTabId ? 'true' : 'false');
			button.setAttribute('role', 'tab');
			icon.appendChild(dom.createIcon(folder && folder.icon ? folder.icon : 'dashicons-category'));
			button.append(icon, text);
			button.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				activateFolderTab(win, tab.id);
			});

			item.append(button, createExplorerTitlebarTabCloseButton(win, tab.id, label));

			return item;
		}

		function syncExplorerTitlebarTabControls(win, folderId) {
			const titlebar = win ? win.querySelector('.pdk-window-titlebar') : null;
			const label = titlebar ? titlebar.querySelector('.pdk-window-titlebar-label') : null;
			const controls = titlebar ? titlebar.querySelector('.pdk-window-controls') : null;
			let strip = titlebar ? titlebar.querySelector('.pdk-explorer-titlebar-tab-strip') : null;
			let addButton = titlebar ? titlebar.querySelector('.pdk-explorer-titlebar-new-tab') : null;

			if (!titlebar) {
				return false;
			}

			if (!isFileExplorerLayout()) {
				if (label) {
					label.classList.remove('pdk-explorer-titlebar-tab-active');
					delete label.dataset.pdkContext;
					delete label.dataset.pdkContextId;
					delete label.dataset.pdkContextLabel;
					delete label.dataset.pdkFolderId;
					label.removeAttribute('role');
					label.removeAttribute('aria-selected');
					const closeButton = label.querySelector('.pdk-explorer-titlebar-tab-close');
					if (closeButton) {
						closeButton.remove();
					}
				}
				if (addButton) {
					addButton.remove();
				}
				if (strip) {
					if (label) {
						if (controls) {
							titlebar.insertBefore(label, controls);
						} else {
							titlebar.appendChild(label);
						}
					}
					strip.remove();
				}
				return true;
			}

			if (!label) {
				return false;
			}

				if (!strip) {
					strip = dom.createElement('div', 'pdk-explorer-titlebar-tab-strip');
					strip.setAttribute('aria-label', getMenuLabel('folder_tabs'));
					strip.setAttribute('role', 'tablist');
				if (controls) {
					titlebar.insertBefore(strip, controls);
				} else {
					titlebar.appendChild(strip);
				}
			}

			if (!addButton) {
				addButton = document.createElement('button');
				addButton.type = 'button';
				addButton.className = 'pdk-explorer-titlebar-new-tab';
				addButton.dataset.pdkNoDrag = '';
				addButton.setAttribute('aria-label', getMenuLabel('new_tab'));
				addButton.appendChild(dom.createElement('span', 'pdk-explorer-titlebar-new-tab-icon'));
				addButton.addEventListener('click', (event) => {
					const activeTab = getActiveFolderTab(win, win && win.dataset ? win.dataset.pdkFolderWindow : folderId);
					event.preventDefault();
					event.stopPropagation();
					addFolderTab(win, activeTab && activeTab.folderId ? activeTab.folderId : folderId);
				});
			}

			const state = getFolderWindowTabs(win, folderId);
			const activeTabId = state.activeTabId;
			const activeTab = getActiveFolderTab(win, folderId);
			const activeLabel = activeTab ? getFolderTabTitle(activeTab) : getFolderLabel(folderId);
			const activeCloseButton = label.querySelector('.pdk-explorer-titlebar-tab-close');
			const nodes = [];

			label.classList.add('pdk-explorer-titlebar-tab-active');
			label.dataset.pdkContext = contextTargets.FOLDER_TAB;
			label.dataset.pdkContextId = activeTabId || '';
			label.dataset.pdkContextLabel = activeLabel;
			label.dataset.pdkFolderId = activeTab && activeTab.folderId ? activeTab.folderId : folderId;
			label.dataset.pdkNoDrag = '';
			label.setAttribute('aria-selected', 'true');
			label.setAttribute('role', 'tab');
			if (activeCloseButton) {
				activeCloseButton.remove();
			}
			label.appendChild(createExplorerTitlebarTabCloseButton(win, activeTabId, activeLabel));
			state.tabs.forEach((tab) => {
				nodes.push(tab.id === activeTabId ? label : createExplorerTitlebarTab(win, tab, activeTabId));
			});
			if (!nodes.includes(label)) {
				nodes.unshift(label);
			}
			nodes.push(addButton);
			strip.replaceChildren(...nodes);

			return true;
		}

		function createSvgNode(tagName, attrs = {}) {
			const node = document.createElementNS('http://www.w3.org/2000/svg', tagName);

			Object.keys(attrs).forEach((name) => {
				node.setAttribute(name, attrs[name]);
			});

			return node;
		}

		function createFinderSidebarOutlineIcon(kind) {
			const svg = createSvgNode('svg', {
				'aria-hidden': 'true',
				class: `pdk-finder-sidebar-outline-icon pdk-finder-sidebar-outline-icon-${kind}`,
				focusable: 'false',
				viewBox: '0 0 24 24'
			});

			if (kind === 'clock') {
				svg.append(
					createSvgNode('circle', { cx: '12', cy: '12', r: '8' }),
					createSvgNode('path', { d: 'M12 8v4.5l3 2' })
				);
				return svg;
			}

			svg.appendChild(createSvgNode('path', {
				d: 'M3.75 7.5c0-1.24 1.01-2.25 2.25-2.25h3.1c.68 0 1.32.31 1.75.84l.68.85c.28.35.7.56 1.15.56H18c1.24 0 2.25 1.01 2.25 2.25V17c0 1.24-1.01 2.25-2.25 2.25H6c-1.24 0-2.25-1.01-2.25-2.25V7.5Z'
			}));

			return svg;
		}

		function createFolderSidebarIcon(folder, options = {}) {
			const icon = dom.createElement('span', 'pdk-settings-sidebar-icon pdk-settings-sidebar-icon-blue pdk-finder-sidebar-icon');

			if (options.outlineIcon) {
				icon.classList.add('pdk-finder-sidebar-icon-outline');
				icon.appendChild(createFinderSidebarOutlineIcon(options.outlineIcon));
			} else {
				icon.appendChild(dom.createIcon(folder && folder.icon ? folder.icon : 'dashicons-category'));
			}

			return icon;
		}

		function createFinderSidebarItem(options = {}) {
			const button = document.createElement('button');
			const label = options.label || getMenuLabel('folder');
			const folderId = options.id || '';

			button.type = 'button';
			button.className = `pdk-settings-sidebar-item pdk-finder-sidebar-item${options.active ? ' is-active' : ''}`;
			button.dataset.pdkContext = options.context || contextTargets.FOLDER;
			button.dataset.pdkContextId = folderId;
			button.dataset.pdkContextLabel = label;
			button.dataset.pdkFolderSidebarItem = '1';
			button.dataset.pdkFolderSidebarSection = options.section || '';
			if (options.removable) {
				button.dataset.pdkFolderSidebarRemovable = '1';
			}
			if (options.dropTarget === 'folder') {
				button.dataset.pdkFolderSidebarDropKind = 'folder';
				button.dataset.pdkFolderSidebarTarget = 'folder';
				button.dataset.pdkOpenFolder = folderId;
			}
			if (options.active) {
				button.setAttribute('aria-current', 'page');
			}
			button.appendChild(createFolderSidebarIcon({
				icon: options.icon || 'dashicons-category'
			}, {
				outlineIcon: options.outlineIcon || ''
			}));
			button.appendChild(dom.createElement('span', 'pdk-settings-sidebar-label', label));
			button.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				if (typeof options.onClick === 'function') {
					options.onClick();
				}
			});

			return button;
		}

		function createFinderSidebarSection(sectionId, label, items = [], options = {}) {
			const state = getFolderSidebarState();
			const collapsed = Boolean(state.collapsed[sectionId]);
			const section = dom.createElement('section', `pdk-finder-sidebar-section pdk-finder-sidebar-section-${sectionId}${collapsed ? ' is-collapsed' : ''}`);
			const header = document.createElement('button');
			const body = dom.createElement('div', 'pdk-finder-sidebar-section-body');

			section.dataset.pdkFolderSidebarSection = sectionId;
			if (options.dropKind) {
				section.dataset.pdkFolderSidebarDropKind = options.dropKind;
			}
			header.type = 'button';
			header.className = 'pdk-finder-sidebar-section-header';
			header.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
			header.append(
				dom.createElement('span', 'pdk-finder-sidebar-section-title', label),
				dom.createElement('span', 'pdk-finder-sidebar-section-expander')
			);
			header.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				setFinderSidebarSectionCollapsed(sectionId, !collapsed);
			});
			if (collapsed) {
				body.hidden = true;
			}
			items.forEach((item) => body.appendChild(item));
			section.append(header, body);

			return section;
		}

		function createExplorerSidebarIcon(iconName) {
			const icon = dom.createElement('span', 'pdk-settings-sidebar-icon pdk-finder-sidebar-icon pdk-explorer-sidebar-icon');
			icon.appendChild(dom.createIcon(iconName || 'dashicons-category'));

			return icon;
		}

		function createExplorerSidebarButton(options = {}) {
			const button = document.createElement('button');

			button.type = 'button';
			button.className = `pdk-settings-sidebar-item pdk-finder-sidebar-item pdk-explorer-sidebar-item${options.active ? ' is-active' : ''}${options.pinned ? ' has-pin' : ''}`;
			if (options.context) {
				button.dataset.pdkContext = options.context;
			}
			if (options.id) {
				button.dataset.pdkContextId = options.id;
			}
			if (options.label) {
				button.dataset.pdkContextLabel = options.label;
			}
			if (options.active) {
				button.setAttribute('aria-current', 'page');
			}
			button.appendChild(createExplorerSidebarIcon(options.icon));
			button.appendChild(dom.createElement('span', 'pdk-settings-sidebar-label', options.label || getMenuLabel('folder')));
			button.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				if (typeof options.onClick === 'function') {
					options.onClick();
				}
			});

			return button;
		}

		function createExplorerSidebarStaticItem(label, iconName, options = {}) {
			const item = dom.createElement('div', `pdk-settings-sidebar-item pdk-finder-sidebar-item pdk-explorer-sidebar-item pdk-explorer-sidebar-static${options.collapsed ? ' is-collapsed' : ''}`);

			item.setAttribute('role', 'treeitem');
			item.setAttribute('aria-label', label);
			if (options.collapsed) {
				item.setAttribute('aria-expanded', 'false');
			}
			if (options.collapsed) {
				item.appendChild(dom.createElement('span', 'pdk-explorer-sidebar-expander'));
			}
			item.appendChild(createExplorerSidebarIcon(iconName));
			item.appendChild(dom.createElement('span', 'pdk-settings-sidebar-label', label));

			return item;
		}

		function createFolderSidebar(folderId, win, layout = getFolderLayout()) {
			const isExplorer = layout === 'file-explorer';
			const sidebar = dom.createElement('aside', `pdk-settings-sidebar pdk-finder-sidebar${isExplorer ? ' pdk-explorer-sidebar' : ''}`);
			const dragZone = dom.createElement('div', 'pdk-split-sidebar-drag-zone');
			const nav = dom.createElement('nav', 'pdk-settings-sidebar-nav pdk-finder-sidebar-nav');

			sidebar.setAttribute('aria-label', isExplorer ? getMenuLabel('navigation_pane') : getMenuLabel('folders'));
			dragZone.dataset.pdkDragHandle = '';
			dragZone.setAttribute('aria-hidden', 'true');
			if (!isExplorer) {
				sidebar.appendChild(dragZone);
			}

			if (isExplorer) {
				const primaryGroup = dom.createElement('div', 'pdk-settings-sidebar-group pdk-explorer-sidebar-group pdk-explorer-sidebar-group-primary');
				const folderGroup = dom.createElement('div', 'pdk-settings-sidebar-group pdk-explorer-sidebar-group pdk-explorer-sidebar-group-folders');
				const systemGroup = dom.createElement('div', 'pdk-settings-sidebar-group pdk-explorer-sidebar-group pdk-explorer-sidebar-group-system');
				const currentFolder = getFolder(folderId);
				const mediaApp = appMap.get(appIds.MEDIA);

				primaryGroup.appendChild(createExplorerSidebarButton({
					active: !isTrashFolderId(folderId),
					context: contextTargets.FOLDER,
					icon: currentFolder && currentFolder.icon ? currentFolder.icon : 'dashicons-admin-home',
					id: folderId,
					label: getMenuLabel('home'),
					onClick() {
						renderFolderWindow(win, folderId);
					}
				}));
				if (mediaApp) {
					primaryGroup.appendChild(createExplorerSidebarButton({
						context: contextItemTypes.APP,
						icon: mediaApp.icon || 'dashicons-format-gallery',
						id: mediaApp.id,
						label: getMenuLabel('gallery'),
						onClick() {
							openApp(mediaApp.id);
						}
					}));
				}

				getFolders().forEach((folder) => {
					if (!folder || folder.id === trashFolderId) {
						return;
					}
					folderGroup.appendChild(createExplorerSidebarButton({
						context: contextTargets.FOLDER,
						icon: folder.icon || 'dashicons-category',
						id: folder.id,
						label: folder.label || getMenuLabel('folder'),
						pinned: true,
						onClick() {
							if (win && folder.id !== folderId) {
								renderFolderWindow(win, folder.id);
							}
						}
					}));
				});

				systemGroup.appendChild(createExplorerSidebarStaticItem(getMenuLabel('this_pc'), 'dashicons-desktop', { collapsed: true }));
				systemGroup.appendChild(createExplorerSidebarStaticItem(getMenuLabel('network'), 'dashicons-admin-site-alt3', { collapsed: true }));
				nav.append(primaryGroup, folderGroup, systemGroup);
				sidebar.appendChild(nav);

				return sidebar;
			}

			const primarySection = dom.createElement('div', 'pdk-finder-sidebar-section pdk-finder-sidebar-section-primary');

			primarySection.appendChild(createFinderSidebarItem({
				active: isRecentsFolderId(folderId),
				context: contextTargets.FOLDER,
				icon: { type: 'theme', name: 'clock.svg', fallback: 'dashicons-clock' },
				id: recentsFolderId,
				label: getMenuLabel('recents'),
				outlineIcon: 'clock',
				section: 'recents',
				onClick() {
					if (win && !isRecentsFolderId(folderId)) {
						renderFolderWindow(win, recentsFolderId);
					}
				}
			}));
			nav.appendChild(primarySection);

			nav.appendChild(createFinderSidebarSection(
				'favorites',
				getMenuLabel('favorites'),
				getFinderFavoriteIds().map((favoriteId) => {
					const folder = getFolder(favoriteId);

					return createFinderSidebarItem({
						active: folder && folder.id === folderId,
						context: contextTargets.FOLDER_SIDEBAR,
						dropTarget: 'folder',
						icon: folder && folder.icon ? folder.icon : 'dashicons-category',
						id: folder ? folder.id : favoriteId,
						label: folder && folder.label ? folder.label : getMenuLabel('folder'),
						outlineIcon: 'folder',
						removable: true,
						section: 'favorites',
						onClick() {
							if (win && folder && folder.id !== folderId) {
								renderFolderWindow(win, folder.id);
							}
						}
					});
				}),
				{
					dropKind: 'favorites'
				}
			));

			nav.appendChild(createFinderSidebarSection(
				'locations',
				getMenuLabel('locations'),
				[homeFolderId, desktopFolderId, trashFolderId].map((locationId) => getFolder(locationId)).filter(Boolean).map((folder) => createFinderSidebarItem({
					active: folder.id === folderId,
					context: contextTargets.FOLDER,
					dropTarget: 'folder',
					icon: folder.icon || (folder.id === trashFolderId ? 'dashicons-trash' : 'dashicons-admin-home'),
					id: folder.id,
					label: folder.label || getMenuLabel('folder'),
					section: 'locations',
					onClick() {
						if (win && folder.id !== folderId) {
							renderFolderWindow(win, folder.id);
						}
					}
				}))
			));

			sidebar.appendChild(nav);

			return sidebar;
		}

		function createFolderMain(folderId, win) {
			const folder = getFolder(folderId);
			const isTrash = isTrashFolderId(folderId);
			const folderItems = isTrash ? [] : getFolderDisplayItems(folderId, win);
			const trashItems = isTrash ? getTrashItems() : [];
			const removable = isUserFolder(folderId);
			const toolbarDisplayMode = getFolderToolbarDisplayMode(win);
			const main = dom.createElement('main', 'pdk-settings-main pdk-finder-main');
			const header = dom.createElement('header', 'pdk-settings-pane-header pdk-finder-toolbar');
			const leading = dom.createElement('div', 'pdk-finder-toolbar-leading');
			const historyGroup = dom.createElement('div', 'pdk-finder-toolbar-history-group');
			const history = dom.createElement('div', 'pdk-settings-history pdk-finder-history');
			const title = dom.createElement('h1', 'pdk-finder-title', folder && folder.label ? folder.label : getMenuLabel('admin'));
			const tabs = createFolderTabs(win);
			const subbar = isTrash ? createTrashSubbar() : null;
			const pane = dom.createElement('div', 'pdk-settings-pane pdk-finder-pane');

			applyFolderPaneContext(pane, folderId, folder);
			bindFolderPaneSelectionClear(pane);
			bindFolderPaneSelection(pane);
			bindFolderPaneKeyboard(pane, folderId, win);
			bindFolderPaneItemDrag(pane, folderId);
			header.dataset.pdkContext = contextTargets.FOLDER_TOOLBAR;
			header.dataset.pdkContextId = folderId;
			header.dataset.pdkContextLabel = getMenuLabel('folder_toolbar');
			header.dataset.pdkDragHandle = '';
			header.dataset.pdkFolderId = folderId;
			header.dataset.pdkFolderToolbarDisplay = toolbarDisplayMode;
			pane.dataset.pdkFolderViewMode = getExplorerViewMode(win);
			history.dataset.pdkNoDrag = '';
			history.appendChild(createFolderHistoryButton('back', win));
			history.appendChild(createFolderHistoryButton('forward', win));
			historyGroup.append(history, dom.createElement('span', 'pdk-finder-toolbar-caption', getMenuLabel('back_forward')));
			leading.append(historyGroup, title);
			header.append(leading, createFolderToolbarActions(folderId, win));

			if (isTrash) {
				if (trashItems.length) {
					pane.appendChild(createFolderItemGrid(folderId, win, {
						trash: true
					}));
				}
				main.append(...[header, tabs, subbar, pane].filter(Boolean));
				return main;
			}

			if (!folderItems.length) {
				main.append(...[header, tabs, pane].filter(Boolean));
				return main;
			}

			pane.appendChild(createFolderItemGrid(folderId, win, {
				removable
			}));
			main.append(...[header, tabs, pane].filter(Boolean));

			return main;
		}

		function createExplorerFolderMain(folderId, win) {
			const folder = getFolder(folderId);
			const isTrash = isTrashFolderId(folderId);
			const folderItems = isTrash ? [] : getFolderDisplayItems(folderId, win);
			const trashItems = isTrash ? getTrashItems() : [];
			const removable = isUserFolder(folderId);
			const main = dom.createElement('main', 'pdk-settings-main pdk-finder-main pdk-explorer-main');
			const pane = dom.createElement('div', 'pdk-settings-pane pdk-finder-pane pdk-explorer-pane');

			applyFolderPaneContext(pane, folderId, folder);
			bindFolderPaneSelectionClear(pane);
			bindFolderPaneSelection(pane);
			bindFolderPaneKeyboard(pane, folderId, win);
			bindFolderPaneItemDrag(pane, folderId);
			pane.dataset.pdkFolderViewMode = getExplorerViewMode(win);
			pane.dataset.pdkExplorerViewMode = getExplorerViewMode(win);

			if (isTrash && trashItems.length) {
				pane.appendChild(createFolderItemGrid(folderId, win, {
					trash: true
				}));
			} else if (!isTrash && folderItems.length) {
				pane.appendChild(createFolderItemGrid(folderId, win, {
					removable
				}));
			} else if (!isTrash) {
				pane.appendChild(createFolderEmptyState());
			}

			main.dataset.pdkFolderId = folder && folder.id ? folder.id : folderId;
			main.append(...[
				pane,
				createExplorerStatusBar(folderId, win)
			].filter(Boolean));

			return main;
		}

		function createExplorerFolderContent(folderId, win = null) {
			const folder = getFolder(folderId);
			const content = document.createElement('div');
			const body = dom.createElement('div', 'pdk-folder-content-explorer-body');

			content.className = 'pdk-folder-content pdk-folder-content-explorer';
			content.dataset.pdkFolderLayout = 'file-explorer';
			applyFolderPaneContext(content, folderId, folder);
			applyFolderPaneContext(body, folderId, folder);
			body.append(
				createFolderSidebar(folderId, win, 'file-explorer'),
				createExplorerFolderMain(folderId, win)
			);
			content.append(
				createExplorerAddressBar(folderId, win),
				createExplorerCommandBar(folderId, win),
				body
			);

			return content;
		}

		function createFolderContent(folderId, win = null) {
			const layout = getFolderLayout();

			if (layout === 'file-explorer') {
				return createExplorerFolderContent(folderId, win);
			}

			const folder = getFolder(folderId);
			const content = document.createElement('div');
			content.className = `pdk-folder-content${layout === 'file-explorer' ? ' pdk-folder-content-explorer' : ''}`;
			content.dataset.pdkFolderLayout = layout;
			applyFolderPaneContext(content, folderId, folder);
			content.append(
				createFolderSidebar(folderId, win, layout),
				createFolderMain(folderId, win)
			);

			return content;
		}

		function updateFolderWindowMeta(win, folderId) {
			const folder = getFolder(folderId);
			const folderTitle = getFolderTitle(folder);
			const titlebar = win ? win.querySelector('.pdk-window-titlebar') : null;
			const titlebarLabel = win ? win.querySelector('.pdk-window-titlebar-label-text') : null;

			if (!win || !folder) {
				return false;
			}

			win.dataset.pdkFolderWindow = folderId;
			win.dataset.pdkContextId = folderId;
			win.dataset.pdkContextLabel = folderTitle;
			win.dataset.pdkWindowTitle = folderTitle;
			win.setAttribute('aria-label', formatMenuLabel('window_title_format', '', [folderTitle]));
			if (titlebar) {
				titlebar.dataset.pdkContext = contextTargets.WINDOW;
				titlebar.dataset.pdkContextId = folderId;
				titlebar.dataset.pdkContextLabel = folderTitle;
			}
			if (titlebarLabel) {
				titlebarLabel.textContent = folderTitle;
			}

			return true;
		}

		function renderFolderWindow(win, folderId, options = {}) {
			const body = win ? win.querySelector('.pdk-window-body') : null;
			if (!win || !body) {
				return false;
			}

			if (Array.isArray(options.tabs)) {
				setFolderWindowTabs(win, options.tabs, options.activeTabId || '', folderId);
				const activeTab = getActiveFolderTab(win, folderId);
				folderId = activeTab && activeTab.folderId ? activeTab.folderId : folderId;
			}

			const folder = getFolder(folderId);
			if (!folder) {
				return false;
			}

			const layout = getFolderLayout();
			const display = applyFolderDisplayState(win, folderId, layout);

			if (options.updateHistory !== false && !Array.isArray(options.tabs)) {
				updateFolderWindowHistory(win, folderId, {
					replace: Boolean(options.replaceHistory),
					reset: Boolean(options.resetHistory)
				});
			} else {
				const activeTab = getActiveFolderTab(win, folderId);
				if (activeTab) {
					activeTab.folderId = folderId;
					if (!Array.isArray(activeTab.entries) || !activeTab.entries.length) {
						activeTab.entries = [folderId];
						activeTab.index = 0;
					}
					activeTab.index = Math.max(0, Math.min(activeTab.index, activeTab.entries.length - 1));
					activeTab.entries[activeTab.index] = folderId;
				}
			}

			updateFolderWindowMeta(win, folderId);
			syncExplorerTitlebarTabControls(win, folderId);
			win.pdkSerializeFolderTabs = () => serializeFolderTabs(win);
			body.dataset.pdkFolderLayout = layout;
			applyFolderPaneContext(body, folderId, folder);
			body.classList.toggle('pdk-explorer-body', isFileExplorerLayout());
			body.classList.toggle('pdk-finder-body', !isFileExplorerLayout());
			setFolderToolbarDisplayMode(win, getFolderToolbarDisplayMode(win));
			body.replaceChildren(createFolderContent(folderId, win));
			setExplorerViewMode(win, display.viewMode, {
				folderId,
				persist: false,
				render: false
			});
			setExplorerGroupMode(win, display.groupMode, {
				folderId,
				persist: false
			});
			if (manager && typeof manager.makeDraggable === 'function') {
				manager.makeDraggable(win);
			}
			bindExplorerCommandBar(win);
			bindFolderToolbarActionStates(win);

			if (options.touch !== false) {
				const provider = getFolderProvider();
				if (provider && typeof provider.touchFolderOpened === 'function') {
					provider.touchFolderOpened(folderId);
				}
			}

			if (options.save !== false) {
				saveFolderWindowSession();
			}

			return true;
		}

		function getFolderWindow(folderId) {
			if (!folderId) {
				return null;
			}

			return shell.querySelector(`.pdk-window[data-pdk-folder-window="${dom.escapeAttribute(folderId)}"]:not(.is-closed)`);
		}

		function refreshFolderWindow(folderId) {
			const win = getFolderWindow(folderId);
			const folder = getFolder(folderId);
			if (!win || !folder) {
				return false;
			}

			return renderFolderWindow(win, folderId, {
				replaceHistory: true,
				touch: false
			});
		}

		function closeFolderWindow(folderId) {
			const win = getFolderWindow(folderId);
			if (!win || !manager || typeof manager.closeWindow !== 'function') {
				return false;
			}

			manager.closeWindow(win, '');

			return true;
		}

		function openFolderTab(folderId, options = {}) {
			const folder = getFolder(folderId);
			const targetWindow = options.windowElement && options.windowElement.dataset && options.windowElement.dataset.pdkWindowKind === folderWindowKind
				? options.windowElement
				: getActiveFolderWindow();

			if (!folder) {
				return null;
			}

			if (!targetWindow) {
				return openFolder(folderId, options);
			}

			addFolderTab(targetWindow, folderId, {
				touch: options.touch
			});
			focusFolderWindow(targetWindow, options);
			if (options.recordRecent !== false && !isRecentsFolderId(folderId)) {
				recordFolderOpen(folderId, folder);
			}

			return targetWindow;
		}

		function openFolder(folderId, options = {}) {
			const folder = getFolder(folderId);
			const folderTitle = getFolderTitle(folder);
			const existing = getFolderWindow(folderId);
			const forceNewWindow = options.forceNewWindow === true;

			if (!folder) {
				return null;
			}

			if (existing && !forceNewWindow) {
				renderFolderWindow(existing, folderId, {
					replaceHistory: true,
					touch: options.touch
				});
				if (options.state && typeof manager.applyWindowState === 'function') {
					manager.applyWindowState(existing, options.state);
				}
				if (options.skipFocus !== true) {
					manager.focusWindow(existing);
				}
				return existing;
			}

			const tabWindow = getFolderWindowWithTab(folderId);
			if (tabWindow && !forceNewWindow) {
				const tab = folderWindows.findTab(tabWindow, folderId);

				if (tab) {
					activateFolderTab(tabWindow, tab.id, {
						touch: options.touch
					});
					if (options.state && typeof manager.applyWindowState === 'function') {
						manager.applyWindowState(tabWindow, options.state);
					}
					focusFolderWindow(tabWindow, options);
					return tabWindow;
				}
			}

			const placeholder = document.createElement('div');
			const win = manager.createWindow({
				appId: isTrashFolderId(folderId) ? appIds.TRASH : '',
				title: folderTitle,
				icon: folder && folder.icon ? folder.icon : defaultDashicon,
				titlebarIcon: isFileExplorerLayout() && folder && folder.icon ? folder.icon : '',
				titlebarLabel: isFileExplorerLayout() ? folderTitle : '',
				content: placeholder,
				bodyClass: `pdk-window-body pdk-folder-body ${isFileExplorerLayout() ? 'pdk-explorer-body' : 'pdk-finder-body'}`,
				windowKind: folderWindowKind,
				state: options.state || null,
				skipFocus: options.skipFocus === true,
				width: '1020px',
				height: '540px'
			});

			if (win) {
				renderFolderWindow(win, folderId, {
					activeTabId: options.activeTabId || '',
					resetHistory: true,
					tabs: Array.isArray(options.tabs) ? options.tabs : null,
					touch: options.touch
				});
				if (options.recordRecent !== false && !isRecentsFolderId(folderId)) {
					recordFolderOpen(folderId, folder);
				}
			}

			return win;
		}

		function refreshTrashWindows() {
			Array.from(shell.querySelectorAll(`.pdk-window[data-pdk-folder-window="${dom.escapeAttribute(trashFolderId)}"]:not(.is-closed)`))
				.forEach((win) => {
					renderFolderWindow(win, trashFolderId, {
						replaceHistory: true,
						save: false,
						touch: false
					});
				});
		}

		function getFolderInfoWindow(folderId) {
			if (!folderId) {
				return null;
			}

			return shell.querySelector(`.pdk-window[data-pdk-folder-info-window="${dom.escapeAttribute(folderId)}"]:not(.is-closed)`);
		}

		function refreshFolderInfoWindow(folderId) {
			const win = getFolderInfoWindow(folderId);
			const body = win ? win.querySelector('.pdk-window-body') : null;
			const info = getFolderInfo(folderId);
			if (!win || !body || !info || !window.PufferDesk.apps.createFolderInfoWindow) {
				return false;
			}

			const title = getFolderInfoTitle(info);
			win.dataset.pdkContextLabel = title;
			win.dataset.pdkWindowTitle = title;
			win.setAttribute('aria-label', formatInfoPanelLabel('windowAriaLabel', '', [title]));
			const titlebarLabel = win.querySelector('.pdk-window-titlebar-label-text');
			if (titlebarLabel) {
				titlebarLabel.textContent = title;
			}
			body.replaceChildren(createFolderInfoContent(info));
			bindFolderInfoAutoSize(win);

			return true;
		}

		function closeFolderInfoWindow(folderId) {
			const win = getFolderInfoWindow(folderId);
			if (!win || !manager || typeof manager.closeWindow !== 'function') {
				return false;
			}

			manager.closeWindow(win, '');

			return true;
		}

		function getFolderInfoSafeTop() {
			const menuBar = shell.querySelector('.pdk-menu-bar');
			const menuBarHeight = menuBar && shell.dataset.pdkMenuBarHidden !== '1'
				? Math.ceil(menuBar.getBoundingClientRect().height)
				: 0;

			return menuBarHeight + 4;
		}

		function fitFolderInfoWindow(win) {
			const desktop = shell.querySelector('.pdk-desktop');
			if (!win || !desktop) {
				return;
			}

			win.style.height = 'auto';

			const desktopRect = desktop.getBoundingClientRect();
			const rect = win.getBoundingClientRect();
			const currentTop = Number.parseFloat(win.style.top);
			const safeTop = getFolderInfoSafeTop();
			const maxTop = Math.max(safeTop, desktop.clientHeight - rect.height - 8);
			const relativeTop = Number.isFinite(currentTop) ? currentTop : Math.round(rect.top - desktopRect.top);
			const nextTop = geometry.clamp(relativeTop, safeTop, maxTop);

			win.style.top = `${Math.round(nextTop)}px`;
		}

		function bindFolderInfoAutoSize(win) {
			if (!win) {
				return;
			}

			if (win.dataset.pdkFolderInfoAutoSizeBound !== '1') {
				win.dataset.pdkFolderInfoAutoSizeBound = '1';
				win.addEventListener('toggle', (event) => {
					if (!event.target || !event.target.classList || !event.target.classList.contains('pdk-info-panel-section')) {
						return;
					}

					window.requestAnimationFrame(() => fitFolderInfoWindow(win));
				}, true);
			}

			window.requestAnimationFrame(() => fitFolderInfoWindow(win));
		}

		function createFolderInfoContent(info) {
			const provider = getFolderProvider();

			return window.PufferDesk.apps.createFolderInfoWindow(info, {
				onComment(comment) {
					if (provider && typeof provider.setFolderComment === 'function') {
						provider.setFolderComment(info.id, comment);
						refreshFolderInfoWindow(info.id);
					}
				},
				onRename(label) {
					if (provider && typeof provider.renameFolder === 'function') {
						provider.renameFolder(info.id, label);
						refreshFolderWindow(info.id);
						refreshFolderInfoWindow(info.id);
					}
				}
			});
		}

		function openFolderInfo(folderId) {
			const info = getFolderInfo(folderId);
			const existing = getFolderInfoWindow(folderId);
			if (!info || !window.PufferDesk.apps.createFolderInfoWindow) {
				return null;
			}

			if (existing) {
				refreshFolderInfoWindow(folderId);
				manager.focusWindow(existing);
				return existing;
			}

			const title = getFolderInfoTitle(info);
			const win = manager.createWindow({
				appId: `folder-info-${info.id}`,
				bodyClass: 'pdk-window-body pdk-info-panel-body',
				content: createFolderInfoContent(info),
				disabledControls: ['maximize'],
				height: 'auto',
				icon: info.icon || 'dashicons-category',
				persist: false,
				resizeMode: 'none',
				title,
				titlebarIcon: info.icon || 'dashicons-category',
				titlebarLabel: title,
				width: '414px',
				windowKind: 'folder-info'
			});

			if (win) {
				win.dataset.pdkFolderInfoWindow = info.id;
				win.dataset.pdkContextId = info.id;
				bindFolderInfoAutoSize(win);
			}

			return win;
		}

		function runSearch(query) {
			const needle = query.trim().toLowerCase();
			if (!needle) {
				return null;
			}

			return apps.find((app) => !isHiddenFromLaunchSurfaces(app) && (app.label.toLowerCase().includes(needle) || app.id.includes(needle))) || null;
		}

		function bindShellClicks() {
			shell.addEventListener('click', (event) => {
				const appButton = event.target.closest('[data-pdk-open-app]');
				if (appButton) {
					if (appButton.matches('.pdk-desktop-app')) {
						return;
					}
					openApp(appButton.dataset.pdkOpenApp);
					return;
				}

				const folderButton = event.target.closest('[data-pdk-open-folder]');
				if (folderButton) {
					if (folderButton.matches('.pdk-desktop-folder')) {
						return;
					}
					openFolder(folderButton.dataset.pdkOpenFolder);
					return;
				}

				const urlButton = event.target.closest('[data-pdk-open-url]');
				if (urlButton) {
					openUrl(urlButton.dataset.pdkOpenUrl, urlButton.dataset.pdkTitle, urlButton.dataset.pdkIcon);
					return;
				}
			});

			shell.addEventListener('dblclick', (event) => {
				const appButton = event.target.closest('[data-pdk-open-app]');
				if (appButton && appButton.matches('.pdk-desktop-app')) {
					event.preventDefault();
					openApp(appButton.dataset.pdkOpenApp);
					return;
				}

				const folderButton = event.target.closest('[data-pdk-open-folder]');
				if (!folderButton || !folderButton.matches('.pdk-desktop-folder') || folderButton.classList.contains('is-renaming')) {
					return;
				}

				event.preventDefault();
				openFolder(folderButton.dataset.pdkOpenFolder);
			});
		}

		shell.addEventListener(domEventNames.TRASH_CHANGE, refreshTrashWindows);
		window.addEventListener(domEventNames.RECENT_ITEMS_CHANGE, () => {
			refreshFolderWindow(recentsFolderId);
		});

		return {
			addFolderSidebarFavorite,
			bindShellClicks,
			closeFolderInfoWindow,
				closeFolderTab,
				closeFolderTabsToRight,
				closeFolderWindow,
				closeOtherFolderTabs,
				deleteSelectedFolderItems,
				deleteSelectedFolderItemsImmediately,
				duplicateFolderTab,
				getActiveFolderWindow,
				getSelectedFolderItems,
				getWindowOptions,
				hasSelectedFolderItems,
				openAbout,
			openApp,
			openFolder,
			openFolderWindow(folderId, options = {}) {
				return openFolder(folderId, Object.assign({}, options, {
					forceNewWindow: true
				}));
			},
			openFolderTab,
			openFolderInfo,
			openTrash,
			openDocumentById,
			openSettingsPanel,
			openSiteAbout,
				openUrl,
				refreshFolderInfoWindow,
				refreshFolderWindow,
				removeFolderSidebarFavorite,
				setFolderSortMode(folderId, mode, options = {}) {
					const win = options.windowElement || getFolderWindow(folderId);
					return setExplorerSortMode(win, mode, Object.assign({}, options, {
						folderId
					}));
				},
				setFolderViewMode(folderId, mode, options = {}) {
					const win = options.windowElement || getFolderWindow(folderId);
					return setExplorerViewMode(win, mode, Object.assign({}, options, {
						folderId
					}));
				},
				setFolderGroupMode(folderId, mode, options = {}) {
					const win = options.windowElement || getFolderWindow(folderId);
					return setExplorerGroupMode(win, mode, Object.assign({}, options, {
						folderId
					}));
				},
				setFolderProvider(provider) {
					folderProvider = provider && typeof provider === 'object' ? provider : null;
				},
				startInlineRenameFolderItem,
			runSearch
		};
	};
})();
