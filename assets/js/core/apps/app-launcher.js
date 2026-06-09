(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};

	window.PufferDesk.apps.createAppLauncher = function createAppLauncher(shell, manager, config = {}) {
		const dom = window.PufferDesk.dom;
		const geometry = window.PufferDesk.geometry;
		const apps = Array.isArray(config.apps) ? config.apps : [];
		const folders = Array.isArray(config.folders) ? config.folders : [];
		const appMap = new Map(apps.map((app) => [app.id, app]));
		const folderToolbarDisplayModes = new Set(['icon-text', 'icon-only', 'text-only']);
		const explorerSortModes = new Set(['none', 'name', 'kind']);
		const explorerViewModes = new Set(['extra-large-icons', 'large-icons', 'medium-icons', 'small-icons', 'list', 'details', 'tiles', 'content']);
		const trashFolderId = 'trash';
		let folderProvider = null;
		let explorerCommandMenu = null;
		let explorerCommandMenuButton = null;
		let explorerCommandMenuCleanup = null;
		const menuLabels = config.menu && config.menu.labels && typeof config.menu.labels === 'object'
			? config.menu.labels
			: {};
		const themeSurfaces = config.theme && config.theme.surfaces && typeof config.theme.surfaces === 'object'
			? config.theme.surfaces
			: {};
		const documentStore = window.PufferDesk.documents && typeof window.PufferDesk.documents.createDocumentStore === 'function'
			? window.PufferDesk.documents.createDocumentStore(config)
			: null;
		const virtualFilesystem = window.PufferDesk.virtualFilesystem && typeof window.PufferDesk.virtualFilesystem.create === 'function'
			? window.PufferDesk.virtualFilesystem.create(config)
			: null;
		const recentItems = window.PufferDesk.apps.createRecentItemsController
			? window.PufferDesk.apps.createRecentItemsController(config)
			: { add() { return false; } };
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
				renderFolderWindow
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
				isFileExplorerLayout,
				launcherRenderer
			})
			: null;

		function getThemeSurface(surface, fallback) {
			const value = typeof themeSurfaces[surface] === 'string' ? themeSurfaces[surface] : '';

			return value || fallback;
		}

		function getFolderLayout() {
			return getThemeSurface('folder', 'finder');
		}

		function isFileExplorerLayout() {
			return getFolderLayout() === 'file-explorer';
		}

		function getMenuLabel(key, fallback) {
			return typeof menuLabels[key] === 'string' && menuLabels[key] ? menuLabels[key] : fallback;
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

		function getTrashFolder() {
			if (folderData) {
				return folderData.getTrashFolder();
			}

			return {
				icon: 'dashicons-trash',
				id: trashFolderId,
				kind: 'system',
				label: getMenuLabel('trash', 'Trash'),
				special: 'trash',
				user: false
			};
		}

		function getFolder(folderId) {
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
				command: 'open-app',
				icon: app.icon,
				id: app.id,
				label: app.label,
				target: app.id,
				title: app.label,
				type: 'app'
			});
		}

		function openApp(appId, openOptions = {}) {
			if (appId === 'trash') {
				return openTrash();
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
			const stickyKind = documentStore && documentStore.kinds ? documentStore.kinds.sticky : 'sticky_note';
			const textKind = documentStore && documentStore.kinds ? documentStore.kinds.text : 'text_document';

			if (!documentId) {
				return null;
			}

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
				return openApp('text-editor', {
					nativeContext: {
						initialDocumentId: documentId
					}
				});
			}

			return null;
		}

		function openTrash(options = {}) {
			return openFolder(trashFolderId, options);
		}

		function openSettingsPanel(panelId) {
			const win = openApp('os-settings');
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
			const title = siteInfo.title || 'About This Site';

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
			const win = manager.createWindow({
				title: title || 'Admin',
				icon: icon || 'dashicons-admin-generic',
				windowKind: 'document',
				url
			});

			if (win && url) {
				addRecentItem({
					command: 'open-url',
					icon: icon || 'dashicons-admin-generic',
					id: url,
					label: title || 'Admin',
					title: title || 'Admin',
					type: 'document',
					url
				});
			}
		}

		function getFolderTitle(folder) {
			const folderLabel = folder && folder.label ? folder.label : getMenuLabel('admin', 'Admin');

			if (isFileExplorerLayout() || (folder && (folder.id === trashFolderId || folder.virtual))) {
				return folderLabel;
			}

			return `${folderLabel} ${getMenuLabel('folder_suffix', 'Folder')}`;
		}

		function getFolderLabel(folderId) {
			const folder = getFolder(folderId);

			return folder && folder.label ? folder.label : getMenuLabel('admin', 'Admin');
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

			return folderToolbarDisplayModes.has(mode) ? mode : 'icon-text';
		}

		function setFolderToolbarDisplayMode(win, mode) {
			const normalized = folderToolbarDisplayModes.has(mode) ? mode : 'icon-text';
			const toolbar = win ? win.querySelector('.pdk-finder-toolbar') : null;

			if (win && win.dataset) {
				win.dataset.pdkFolderToolbarDisplay = normalized;
			}

			if (toolbar) {
				toolbar.dataset.pdkFolderToolbarDisplay = normalized;
			}

			return normalized;
		}

		function normalizeExplorerViewMode(mode) {
			return explorerViewModes.has(mode) ? mode : 'large-icons';
		}

		function getExplorerViewMode(win) {
			return normalizeExplorerViewMode(win && win.dataset ? win.dataset.pdkExplorerViewMode : '');
		}

		function setExplorerViewMode(win, mode) {
			const normalized = normalizeExplorerViewMode(mode);
			const pane = win ? win.querySelector('.pdk-explorer-pane') : null;
			const statusbar = win ? win.querySelector('.pdk-explorer-statusbar') : null;

			if (win && win.dataset) {
				win.dataset.pdkExplorerViewMode = normalized;
			}

			if (pane) {
				pane.dataset.pdkExplorerViewMode = normalized;
			}

			if (statusbar) {
				statusbar.querySelectorAll('[data-pdk-explorer-view-mode]').forEach((button) => {
					const active = button.dataset.pdkExplorerViewMode === normalized;
					button.classList.toggle('is-active', active);
					button.setAttribute('aria-pressed', active ? 'true' : 'false');
				});
			}

			return normalized;
		}

		function normalizeExplorerSortMode(mode) {
			return explorerSortModes.has(mode) ? mode : 'none';
		}

		function getExplorerSortMode(win) {
			return normalizeExplorerSortMode(win && win.dataset ? win.dataset.pdkExplorerSortMode : '');
		}

		function getFolderDisplayItems(folderId, win = null) {
			return folderRenderer && typeof folderRenderer.getDisplayItems === 'function'
				? folderRenderer.getDisplayItems(folderId, win)
				: [];
		}

		function createFolderItemGrid(folderId, win = null, options = {}) {
			return folderRenderer && typeof folderRenderer.createItemGrid === 'function'
				? folderRenderer.createItemGrid(folderId, win, options)
				: document.createElement('div');
		}

		function setExplorerSortMode(win, mode) {
			const normalized = normalizeExplorerSortMode(mode);
			const folderId = win && win.dataset ? win.dataset.pdkFolderWindow : '';

			if (!win || !folderId) {
				return normalized;
			}

			win.dataset.pdkExplorerSortMode = normalized;
			renderFolderWindow(win, folderId, {
				replaceHistory: true,
				touch: false
			});

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
			button.setAttribute('aria-label', direction === 'back' ? 'Back' : 'Forward');
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
			const labels = {
				back: 'Back',
				forward: 'Forward',
				up: 'Up',
				refresh: 'Refresh'
			};
			const canNavigate = direction === 'back'
				? history.canBack
				: (direction === 'forward' ? history.canForward : direction === 'refresh');

			button.type = 'button';
			button.className = `pdk-explorer-nav-button pdk-explorer-nav-button-${direction}`;
			button.dataset.pdkNoDrag = '';
			button.disabled = !canNavigate;
			button.setAttribute('aria-label', labels[direction] || direction);
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
				kind: 'folder-toolbar',
				label: folder && folder.label ? folder.label : '',
				type: 'folder-toolbar',
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

			if (!action.command || !commands || typeof commands.execute !== 'function') {
				return false;
			}

			return commands.execute(
				getExplorerCommandItem(action, folderId),
				getExplorerCommandDetail(folderId, win)
			);
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

		function explorerChoiceItem(label, command, mode, activeMode, folderId, options = {}) {
			return explorerMenuItem(label, command, Object.assign({
				icon: mode === activeMode ? 'dashicons-yes' : '',
				payload: {
					folderId,
					mode,
					target: folderId
				},
				target: folderId
			}, options));
		}

		function getExplorerCommandMenuItems(action, folderId, win) {
			const sortMode = getExplorerSortMode(win);
			const viewMode = getExplorerViewMode(win);

			if (action.id === 'sort') {
				return [
					explorerChoiceItem(getMenuLabel('sort_none', 'None'), 'folder.set-sort-mode', 'none', sortMode, folderId),
					explorerMenuSeparator(),
					explorerChoiceItem(getMenuLabel('sort_name', 'Name'), 'folder.set-sort-mode', 'name', sortMode, folderId),
					explorerChoiceItem(getMenuLabel('sort_kind', 'Kind'), 'folder.set-sort-mode', 'kind', sortMode, folderId),
					disabledExplorerMenuItem(getMenuLabel('sort_date_modified', 'Date Modified')),
					disabledExplorerMenuItem(getMenuLabel('sort_size', 'Size'))
				];
			}

			if (action.id === 'view') {
				return [
					explorerChoiceItem(getMenuLabel('extra_large_icons', 'Extra large icons'), 'folder.set-view-mode', 'extra-large-icons', viewMode, folderId),
					explorerChoiceItem(getMenuLabel('large_icons', 'Large icons'), 'folder.set-view-mode', 'large-icons', viewMode, folderId),
					explorerChoiceItem(getMenuLabel('medium_icons', 'Medium icons'), 'folder.set-view-mode', 'medium-icons', viewMode, folderId),
					explorerChoiceItem(getMenuLabel('small_icons', 'Small icons'), 'folder.set-view-mode', 'small-icons', viewMode, folderId),
					explorerMenuSeparator(),
					explorerChoiceItem(getMenuLabel('list_view_short', 'List'), 'folder.set-view-mode', 'list', viewMode, folderId),
					explorerChoiceItem(getMenuLabel('details_view_short', 'Details'), 'folder.set-view-mode', 'details', viewMode, folderId),
					explorerChoiceItem(getMenuLabel('tiles_view', 'Tiles'), 'folder.set-view-mode', 'tiles', viewMode, folderId),
					explorerChoiceItem(getMenuLabel('content_view', 'Content'), 'folder.set-view-mode', 'content', viewMode, folderId),
					explorerMenuSeparator(),
					explorerMenuItem(getMenuLabel('details_pane', 'Details pane'), '', {
						icon: ''
					}),
					explorerMenuItem(getMenuLabel('preview_pane', 'Preview pane'), '', {
						icon: 'dashicons-yes'
					}),
					explorerMenuSeparator(),
					explorerMenuItem(getMenuLabel('show', 'Show'), '', {
						id: 'show',
						items: [
							disabledExplorerMenuItem(getMenuLabel('show_view_options', 'View options'))
						]
					})
				];
			}

			if (action.id === 'more') {
				return [
					explorerMenuItem(getMenuLabel('refresh', 'Refresh'), 'folder.refresh', {
						icon: 'dashicons-update',
						target: folderId
					}),
					explorerMenuSeparator(),
					disabledExplorerMenuItem(getMenuLabel('pin_to_quick_access', 'Pin to Quick Access'), {
						icon: 'dashicons-admin-links'
					}),
					disabledExplorerMenuItem(getMenuLabel('copy_as_path', 'Copy as path'), {
						icon: 'dashicons-clipboard',
						shortcut: 'Ctrl+Shift+C'
					}),
					explorerMenuSeparator(),
					explorerMenuItem(getMenuLabel('properties', 'Properties'), 'folder.get-info', {
						icon: 'dashicons-info-outline',
						shortcut: 'Alt+Enter',
						target: folderId
					}),
					disabledExplorerMenuItem(getMenuLabel('show_more_options', 'Show more options'), {
						icon: 'dashicons-external'
					})
				];
			}

			return [];
		}

		function hasExplorerCommandMenu(action) {
			return Boolean(action && ['sort', 'view', 'more'].includes(action.id));
		}

		function closeExplorerCommandMenu() {
			if (typeof explorerCommandMenuCleanup === 'function') {
				explorerCommandMenuCleanup();
				explorerCommandMenuCleanup = null;
			}

			if (explorerCommandMenu) {
				explorerCommandMenu.remove();
				explorerCommandMenu = null;
			}

			if (explorerCommandMenuButton) {
				explorerCommandMenuButton.classList.remove('is-menu-open');
				explorerCommandMenuButton.setAttribute('aria-expanded', 'false');
				explorerCommandMenuButton = null;
			}
		}

		function positionExplorerCommandMenu(button) {
			if (!explorerCommandMenu || !button || typeof button.getBoundingClientRect !== 'function') {
				return;
			}

			const shellRect = shell.getBoundingClientRect();
			const buttonRect = button.getBoundingClientRect();
			const minLeft = 8;
			const minTop = 8;
			const maxLeft = Math.max(minLeft, shell.clientWidth - explorerCommandMenu.offsetWidth - 8);
			const maxTop = Math.max(minTop, shell.clientHeight - explorerCommandMenu.offsetHeight - 8);
			const left = geometry.clamp(Math.round(buttonRect.left - shellRect.left), minLeft, maxLeft);
			const top = geometry.clamp(Math.round(buttonRect.bottom - shellRect.top + 4), minTop, maxTop);

			explorerCommandMenu.style.left = `${left}px`;
			explorerCommandMenu.style.top = `${top}px`;
		}

		function bindExplorerCommandMenuClose(button) {
			const pointerHandler = (event) => {
				if (
					explorerCommandMenu
					&& !explorerCommandMenu.contains(event.target)
					&& !button.contains(event.target)
				) {
					closeExplorerCommandMenu();
				}
			};
			const keyHandler = (event) => {
				if (event.key === 'Escape') {
					event.preventDefault();
					closeExplorerCommandMenu();
					button.focus({ preventScroll: true });
				}
			};
			const reposition = () => positionExplorerCommandMenu(button);

			document.addEventListener('pointerdown', pointerHandler, true);
			document.addEventListener('keydown', keyHandler, true);
			window.addEventListener('resize', reposition);
			explorerCommandMenuCleanup = () => {
				document.removeEventListener('pointerdown', pointerHandler, true);
				document.removeEventListener('keydown', keyHandler, true);
				window.removeEventListener('resize', reposition);
			};
		}

		function openExplorerCommandMenu(action, folderId, win, button) {
			const commands = window.PufferDesk.menuCommands;
			const rendererFactory = window.PufferDesk.shell && window.PufferDesk.shell.createMenuItemRenderer;
			const items = getExplorerCommandMenuItems(action, folderId, win);
			const detail = Object.assign(getExplorerCommandDetail(folderId, win), {
				targetElement: button
			});
			let renderer = null;

			if (!items.length || !commands || typeof rendererFactory !== 'function') {
				return false;
			}

			if (explorerCommandMenu && explorerCommandMenuButton === button) {
				closeExplorerCommandMenu();
				return true;
			}

			closeExplorerCommandMenu();
			renderer = rendererFactory(commands);
			explorerCommandMenuButton = button;
			explorerCommandMenu = document.createElement('div');
			explorerCommandMenu.className = 'pdk-menu-popover pdk-context-menu pdk-explorer-command-menu';
			explorerCommandMenu.dataset.pdkContextMenu = 'folder-toolbar';
			explorerCommandMenu.dataset.pdkExplorerCommandMenu = action.id;
			explorerCommandMenu.setAttribute('role', 'menu');
			explorerCommandMenu.setAttribute('aria-label', action.label);
			explorerCommandMenu.replaceChildren(...items.map((item) => renderer.createItem(item, detail, closeExplorerCommandMenu)));
			shell.appendChild(explorerCommandMenu);
			button.classList.add('is-menu-open');
			button.setAttribute('aria-expanded', 'true');
			positionExplorerCommandMenu(button);
			window.setTimeout(() => bindExplorerCommandMenuClose(button), 0);

			return true;
		}

		function createExplorerCommandButton(action, folderId, win) {
			const button = document.createElement('button');
			const canRun = canRunExplorerCommand(action, folderId, win);

			button.type = 'button';
			button.className = `pdk-explorer-command-button pdk-explorer-command-button-${action.id}`;
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
				openExplorerCommandMenu(action, folderId, win, button);
				const firstEnabled = explorerCommandMenu ? explorerCommandMenu.querySelector('.pdk-menu-item:not(:disabled)') : null;
				if (firstEnabled) {
					firstEnabled.focus({ preventScroll: true });
				}
			});

			return button;
		}

		function getExplorerCommandGroups(folderId) {
			const currentFolderActionsEnabled = isUserFolder(folderId);

			return [
				[
					{ id: 'new', label: 'New', icon: 'dashicons-plus-alt2', command: 'folder.create', disclosure: true }
				],
				[
					{ id: 'cut', label: 'Cut', icon: 'dashicons-admin-page', showLabel: false },
					{ id: 'copy', label: 'Copy', icon: 'dashicons-clipboard', showLabel: false },
					{ id: 'paste', label: 'Paste', icon: 'dashicons-admin-page', showLabel: false },
					{ id: 'rename', label: 'Rename', icon: 'dashicons-edit', command: currentFolderActionsEnabled ? 'folder.rename' : '', showLabel: false },
					{ id: 'share', label: 'Share', icon: 'dashicons-share', showLabel: false },
					{ id: 'delete', label: 'Delete', icon: 'dashicons-trash', command: currentFolderActionsEnabled ? 'folder.delete' : '', showLabel: false }
				],
				[
					{ id: 'sort', label: 'Sort', icon: 'dashicons-sort', disclosure: true },
					{ id: 'view', label: 'View', icon: 'dashicons-grid-view', disclosure: true },
					{ id: 'more', label: 'More', icon: 'dashicons-ellipsis', showLabel: false }
				],
				[
					{ id: 'details', label: getMenuLabel('preview', 'Preview'), icon: 'dashicons-list-view', command: 'folder.get-info' }
				]
			];
		}

		function createExplorerCommandBar(folderId, win) {
			const bar = dom.createElement('div', 'pdk-explorer-commandbar');

			bar.dataset.pdkContext = 'folder-toolbar';
			bar.dataset.pdkContextId = folderId;
			bar.dataset.pdkContextLabel = 'Folder Command Bar';
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
				getMenuLabel('admin', 'Admin'),
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

			address.setAttribute('aria-label', 'Address');
			crumbs.forEach((crumb, index) => {
				if (index > 0) {
					address.appendChild(dom.createElement('span', 'pdk-explorer-address-separator'));
				}
				address.appendChild(dom.createElement('span', index === crumbs.length - 1 ? 'pdk-explorer-address-crumb is-current' : 'pdk-explorer-address-crumb', crumb));
			});

			search.appendChild(dom.createDashicon('dashicons-search'));
			searchInput.type = 'search';
			searchInput.placeholder = `${getMenuLabel('search', 'Search')} ${folderTitle}`;
			searchInput.setAttribute('aria-label', `${getMenuLabel('search', 'Search')} ${folderTitle}`);
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
			const summary = dom.createElement('span', 'pdk-explorer-status-summary', `${count} ${count === 1 ? getMenuLabel('item_singular', 'item') : getMenuLabel('item_plural', 'items')}`);
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
			listButton.dataset.pdkExplorerViewMode = 'list';
			listButton.setAttribute('aria-label', getMenuLabel('list_view', 'List view'));
			listButton.appendChild(dom.createElement('span', 'pdk-explorer-status-view-icon'));
			detailButton.type = 'button';
			detailButton.className = 'pdk-explorer-status-view-button pdk-explorer-status-view-button-details';
			detailButton.dataset.pdkExplorerViewMode = 'details';
			detailButton.setAttribute('aria-label', getMenuLabel('details_view', 'Details view'));
			detailButton.appendChild(dom.createElement('span', 'pdk-explorer-status-view-icon'));
			listButton.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				setExplorerViewMode(getTargetWindow(), 'list');
			});
			detailButton.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				setExplorerViewMode(getTargetWindow(), 'details');
			});
			setViewButtons(getExplorerViewMode(win));
			viewGroup.append(listButton, detailButton);
			bar.append(summary, viewGroup);

			return bar;
		}

		function createFolderToolbarIcon(action) {
			const icon = dom.createElement('span', `pdk-finder-toolbar-icon pdk-finder-toolbar-icon-${action.id}`);

			if (action.icon) {
				icon.appendChild(dom.createDashicon(action.icon));
			}

			if (action.badge) {
				icon.appendChild(dom.createElement('span', `pdk-finder-toolbar-badge pdk-finder-toolbar-badge-${action.badge}`));
			}

			if (action.disclosure) {
				icon.appendChild(dom.createElement('span', 'pdk-finder-toolbar-disclosure'));
			}

			return icon;
		}

		function createFolderToolbarButton(action) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = `pdk-finder-toolbar-button pdk-finder-toolbar-button-${action.id}`;
			button.tabIndex = -1;
			button.dataset.pdkNoDrag = '';
			button.dataset.pdkToolbarAction = action.id;
			button.setAttribute('aria-disabled', 'true');
			button.setAttribute('aria-label', action.label);
			button.appendChild(createFolderToolbarIcon(action));
			button.appendChild(dom.createElement('span', 'pdk-finder-toolbar-label', action.label));
			button.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
			});

			return button;
		}

		function getFolderToolbarActions() {
			return [
				{ id: 'view', label: 'View', icon: 'dashicons-grid-view', disclosure: true },
				{ id: 'group', label: 'Group', icon: 'dashicons-list-view', disclosure: true },
				{ id: 'share', label: 'Share', icon: 'dashicons-share' },
				{ id: 'tags', label: 'Edit Tags', icon: 'dashicons-tag' },
				{ id: 'delete', label: 'Delete', icon: 'dashicons-trash' },
				{ id: 'info', label: 'Get Info', icon: 'dashicons-info-outline' },
				{ id: 'new-folder', label: 'New Folder', icon: 'dashicons-category', badge: 'plus' },
				{ id: 'action', label: 'Action', icon: 'dashicons-ellipsis' },
				{ id: 'search', label: 'Search', icon: 'dashicons-search' }
			];
		}

		function createFolderToolbarOverflowButton() {
			const button = document.createElement('button');
			const icon = dom.createElement('span', 'pdk-finder-toolbar-icon pdk-finder-toolbar-icon-overflow');

			button.type = 'button';
			button.className = 'pdk-finder-toolbar-button pdk-finder-toolbar-overflow-button';
			button.dataset.pdkNoDrag = '';
			button.setAttribute('aria-label', 'More Toolbar Items');
			icon.append(
				dom.createElement('span', 'pdk-finder-toolbar-overflow-chevron'),
				dom.createElement('span', 'pdk-finder-toolbar-overflow-chevron')
			);
			button.appendChild(icon);

			return button;
		}

		function createFolderToolbarOverflowMenuItem(action) {
			const item = dom.createElement('div', 'pdk-finder-toolbar-overflow-menu-item');
			const label = dom.createElement('span', 'pdk-finder-toolbar-overflow-menu-label', action.label);

			item.setAttribute('role', 'menuitem');
			item.setAttribute('aria-disabled', 'true');
			item.append(createFolderToolbarIcon(action), label);

			return item;
		}

		function setFolderToolbarOverflowMenu(actions, hiddenIds) {
			const menu = actions ? actions.querySelector('.pdk-finder-toolbar-overflow-menu') : null;
			const hiddenSet = new Set(hiddenIds);
			if (!menu) {
				return;
			}

			menu.replaceChildren();
			getFolderToolbarActions()
				.filter((action) => hiddenSet.has(action.id))
				.forEach((action) => {
					menu.appendChild(createFolderToolbarOverflowMenuItem(action));
				});
		}

		function createFolderToolbarActions() {
			const actions = dom.createElement('div', 'pdk-finder-toolbar-actions');
			const overflow = dom.createElement('div', 'pdk-finder-toolbar-overflow');
			const overflowButton = createFolderToolbarOverflowButton();
			const overflowMenu = dom.createElement('div', 'pdk-finder-toolbar-overflow-menu');
			const toolbarActions = getFolderToolbarActions();
			const searchAction = toolbarActions.find((action) => action.id === 'search');

			actions.dataset.pdkNoDrag = '';
			overflow.hidden = true;
			overflowMenu.hidden = true;
			overflowMenu.setAttribute('role', 'menu');
			overflowButton.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				const willOpen = overflowMenu.hidden;
				overflowMenu.hidden = !willOpen;
				overflowButton.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
				if (willOpen) {
					window.setTimeout(() => {
						document.addEventListener('pointerdown', () => {
							overflowMenu.hidden = true;
							overflowButton.setAttribute('aria-expanded', 'false');
						}, { once: true });
					}, 0);
				}
			});
			overflowButton.setAttribute('aria-expanded', 'false');
			overflow.append(overflowButton, overflowMenu);

			toolbarActions
				.filter((action) => action.id !== 'search')
				.forEach((action) => {
					actions.appendChild(createFolderToolbarButton(action));
				});
			actions.appendChild(overflow);
			if (searchAction) {
				actions.appendChild(createFolderToolbarButton(searchAction));
			}

			return actions;
		}

		function syncFolderToolbarOverflow(win) {
			const toolbar = win ? win.querySelector('.pdk-finder-toolbar') : null;
			const title = win ? win.querySelector('.pdk-finder-title') : null;
			const actions = win ? win.querySelector('.pdk-finder-toolbar-actions') : null;
			const overflow = actions ? actions.querySelector('.pdk-finder-toolbar-overflow') : null;
			const overflowMenu = overflow ? overflow.querySelector('.pdk-finder-toolbar-overflow-menu') : null;
			const buttons = actions
				? Array.from(actions.querySelectorAll('[data-pdk-toolbar-action]'))
				: [];
			const hideOrder = ['action', 'new-folder', 'info', 'delete', 'tags', 'share', 'group', 'view'];
			const hiddenIds = [];

			function readPixels(value, fallback = 0) {
				const parsed = Number.parseFloat(value);

				return Number.isFinite(parsed) ? parsed : fallback;
			}

			function getVisibleToolbarItems() {
				return actions
					? Array.from(actions.children).filter((item) => {
						return !item.hidden && (
							item.classList.contains('pdk-finder-toolbar-button')
							|| item.classList.contains('pdk-finder-toolbar-overflow')
						);
					})
					: [];
			}

			function toolbarItemsFit() {
				const toolbarRect = toolbar ? toolbar.getBoundingClientRect() : null;
				const toolbarStyles = toolbar ? window.getComputedStyle(toolbar) : null;
				const titleRect = title ? title.getBoundingClientRect() : null;
				const items = getVisibleToolbarItems();
				const firstItem = items[0] || null;
				const lastItem = items[items.length - 1] || null;
				const rightEdge = toolbarRect && toolbarStyles
					? toolbarRect.right - readPixels(toolbarStyles.paddingRight)
					: 0;
				const minTitleGap = toolbarStyles
					? readPixels(toolbarStyles.gap, 38)
					: 38;
				const rightFits = !lastItem || lastItem.getBoundingClientRect().right <= rightEdge + 1;
				const gapFits = !titleRect || !firstItem || firstItem.getBoundingClientRect().left - titleRect.right >= minTitleGap - 1;

				return rightFits && gapFits;
			}

			if (!toolbar || !actions || !overflow || !buttons.length) {
				return;
			}

			buttons.forEach((button) => {
				button.hidden = false;
			});
			overflow.hidden = true;
			if (overflowMenu) {
				overflowMenu.hidden = true;
			}

			if (toolbarItemsFit()) {
				setFolderToolbarOverflowMenu(actions, hiddenIds);
				return;
			}

			overflow.hidden = false;
			hideOrder.some((actionId) => {
				const button = actions.querySelector(`[data-pdk-toolbar-action="${actionId}"]`);
				if (!button || button.hidden) {
					return false;
				}

				button.hidden = true;
				hiddenIds.push(actionId);

				return toolbarItemsFit();
			});

			if (!hiddenIds.length) {
				overflow.hidden = true;
			}

			setFolderToolbarOverflowMenu(actions, hiddenIds);
		}

		function bindFolderToolbarOverflow(win) {
			const toolbar = win ? win.querySelector('.pdk-finder-toolbar') : null;
			if (!toolbar) {
				return;
			}

			if (win.pdkFolderToolbarResizeObserver && typeof win.pdkFolderToolbarResizeObserver.disconnect === 'function') {
				win.pdkFolderToolbarResizeObserver.disconnect();
			}

			const sync = () => {
				window.requestAnimationFrame(() => syncFolderToolbarOverflow(win));
			};

			if (win.pdkFolderToolbarDisplayHandler) {
				win.removeEventListener('pufferDesk:folder-toolbar-display-change', win.pdkFolderToolbarDisplayHandler);
			}

			win.pdkFolderToolbarDisplayHandler = sync;
			win.addEventListener('pufferDesk:folder-toolbar-display-change', win.pdkFolderToolbarDisplayHandler);

			sync();

			if (typeof window.ResizeObserver === 'function') {
				win.pdkFolderToolbarResizeObserver = new window.ResizeObserver(sync);
				win.pdkFolderToolbarResizeObserver.observe(toolbar);
				win.pdkFolderToolbarResizeObserver.observe(win);
			}
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

			if (activeWindow && activeWindow.dataset && activeWindow.dataset.pdkWindowKind === 'folder' && !activeWindow.classList.contains('is-closed')) {
				return activeWindow;
			}

			return shell.querySelector('.pdk-window[data-pdk-window-kind="folder"]:not(.is-closed)');
		}

		function getFolderWindowWithTab(folderId) {
			if (!folderId) {
				return null;
			}

			return Array.from(shell.querySelectorAll('.pdk-window[data-pdk-window-kind="folder"]:not(.is-closed)'))
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
				command: 'open-folder',
				icon: folder && folder.icon ? folder.icon : 'dashicons-admin-generic',
				id: folderId,
				label: folderTitle,
				target: folderId,
				title: folderTitle,
				type: 'folder'
			});
		}

		function createTrashSubbar() {
			const bar = dom.createElement('div', 'pdk-finder-subbar pdk-trash-subbar');
			const title = dom.createElement('strong', 'pdk-finder-subbar-title', getMenuLabel('trash', 'Trash'));
			const emptyButton = document.createElement('button');

			emptyButton.type = 'button';
			emptyButton.className = 'pdk-trash-empty-control';
			emptyButton.dataset.pdkNoDrag = '';
			emptyButton.disabled = getTrashCount() <= 0;
			emptyButton.textContent = getMenuLabel('empty', 'Empty');
			emptyButton.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				executeCommand('trash.empty');
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
			button.setAttribute('aria-label', `${getMenuLabel('close_tab', 'Close Tab')}: ${label}`);
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
			tabBar.setAttribute('aria-label', getMenuLabel('folder_tabs', 'Folder Tabs'));
			list.setAttribute('role', 'tablist');
			state.tabs.forEach((tab) => {
				list.appendChild(createFolderTabButton(win, tab, state.activeTabId));
			});

			addButton.type = 'button';
			addButton.className = 'pdk-finder-tab-add';
			addButton.dataset.pdkNoDrag = '';
			addButton.setAttribute('aria-label', getMenuLabel('new_tab', 'New Tab'));
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
			button.setAttribute('aria-label', `${getMenuLabel('close_tab', 'Close Tab')}: ${label}`);
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
			item.dataset.pdkContext = 'folder-tab';
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
					strip.setAttribute('aria-label', getMenuLabel('folder_tabs', 'Folder Tabs'));
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
				addButton.setAttribute('aria-label', getMenuLabel('new_tab', 'New Tab'));
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
			label.dataset.pdkContext = 'folder-tab';
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

		function createFolderSidebarIcon(folder) {
			const icon = dom.createElement('span', 'pdk-settings-sidebar-icon pdk-settings-sidebar-icon-blue pdk-finder-sidebar-icon');
			icon.appendChild(dom.createIcon(folder && folder.icon ? folder.icon : 'dashicons-category'));

			return icon;
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
			button.appendChild(dom.createElement('span', 'pdk-settings-sidebar-label', options.label || 'Folder'));
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

			sidebar.setAttribute('aria-label', isExplorer ? 'Navigation pane' : 'Folders');
			dragZone.dataset.pdkDragHandle = '';
			dragZone.setAttribute('aria-hidden', 'true');
			if (!isExplorer) {
				sidebar.appendChild(dragZone);
			}
			if (!isExplorer) {
				sidebar.appendChild(dom.createElement('div', 'pdk-finder-sidebar-heading', 'Folders'));
			}

			if (isExplorer) {
				const primaryGroup = dom.createElement('div', 'pdk-settings-sidebar-group pdk-explorer-sidebar-group pdk-explorer-sidebar-group-primary');
				const folderGroup = dom.createElement('div', 'pdk-settings-sidebar-group pdk-explorer-sidebar-group pdk-explorer-sidebar-group-folders');
				const systemGroup = dom.createElement('div', 'pdk-settings-sidebar-group pdk-explorer-sidebar-group pdk-explorer-sidebar-group-system');
				const currentFolder = getFolder(folderId);
				const mediaApp = appMap.get('media');

				primaryGroup.appendChild(createExplorerSidebarButton({
					active: !isTrashFolderId(folderId),
					context: 'folder',
					icon: currentFolder && currentFolder.icon ? currentFolder.icon : 'dashicons-admin-home',
					id: folderId,
					label: getMenuLabel('home', 'Home'),
					onClick() {
						renderFolderWindow(win, folderId);
					}
				}));
				if (mediaApp) {
					primaryGroup.appendChild(createExplorerSidebarButton({
						context: 'app',
						icon: mediaApp.icon || 'dashicons-format-gallery',
						id: mediaApp.id,
						label: getMenuLabel('gallery', 'Gallery'),
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
						context: 'folder',
						icon: folder.icon || 'dashicons-category',
						id: folder.id,
						label: folder.label || 'Folder',
						pinned: true,
						onClick() {
							if (win && folder.id !== folderId) {
								renderFolderWindow(win, folder.id);
							}
						}
					}));
				});

				systemGroup.appendChild(createExplorerSidebarStaticItem(getMenuLabel('this_pc', 'This PC'), 'dashicons-desktop', { collapsed: true }));
				systemGroup.appendChild(createExplorerSidebarStaticItem(getMenuLabel('network', 'Network'), 'dashicons-admin-site-alt3', { collapsed: true }));
				nav.append(primaryGroup, folderGroup, systemGroup);
				sidebar.appendChild(nav);

				return sidebar;
			}

			getFolders().forEach((folder) => {
				const button = document.createElement('button');
				button.type = 'button';
				button.className = 'pdk-settings-sidebar-item pdk-finder-sidebar-item';
				button.dataset.pdkContext = 'folder';
				button.dataset.pdkContextId = folder.id;
				button.dataset.pdkContextLabel = folder.label || 'Folder';
				button.appendChild(createFolderSidebarIcon(folder));
				button.appendChild(dom.createElement('span', 'pdk-settings-sidebar-label', folder.label || 'Folder'));
				if (folder.id === folderId) {
					button.classList.add('is-active');
					button.setAttribute('aria-current', 'page');
				}
				button.addEventListener('click', (event) => {
					event.preventDefault();
					event.stopPropagation();
					if (win && folder.id !== folderId) {
						renderFolderWindow(win, folder.id);
					}
				});
				nav.appendChild(button);
			});

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
			const title = dom.createElement('h1', 'pdk-finder-title', folder && folder.label ? folder.label : getMenuLabel('admin', 'Admin'));
			const tabs = createFolderTabs(win);
			const subbar = isTrash ? createTrashSubbar() : null;
			const pane = dom.createElement('div', 'pdk-settings-pane pdk-finder-pane');

			header.dataset.pdkContext = 'folder-toolbar';
			header.dataset.pdkContextId = folderId;
			header.dataset.pdkContextLabel = 'Folder Toolbar';
			header.dataset.pdkDragHandle = '';
			header.dataset.pdkFolderId = folderId;
			header.dataset.pdkFolderToolbarDisplay = toolbarDisplayMode;
			history.dataset.pdkNoDrag = '';
			history.appendChild(createFolderHistoryButton('back', win));
			history.appendChild(createFolderHistoryButton('forward', win));
			historyGroup.append(history, dom.createElement('span', 'pdk-finder-toolbar-caption', 'Back/Forward'));
			leading.append(historyGroup, title);
			header.append(leading, createFolderToolbarActions());

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
			const subbar = isTrash ? createTrashSubbar() : null;
			const pane = dom.createElement('div', 'pdk-settings-pane pdk-finder-pane pdk-explorer-pane');

			pane.dataset.pdkExplorerViewMode = getExplorerViewMode(win);

			if (isTrash && trashItems.length) {
				pane.appendChild(createFolderItemGrid(folderId, win, {
					trash: true
				}));
			} else if (!isTrash && folderItems.length) {
				pane.appendChild(createFolderItemGrid(folderId, win, {
					removable
				}));
			}

			main.dataset.pdkFolderId = folder && folder.id ? folder.id : folderId;
			main.append(...[
				subbar,
				pane,
				createExplorerStatusBar(folderId, win)
			].filter(Boolean));

			return main;
		}

		function createExplorerFolderContent(folderId, win = null) {
			const content = document.createElement('div');
			const body = dom.createElement('div', 'pdk-folder-content-explorer-body');

			content.className = 'pdk-folder-content pdk-folder-content-explorer';
			content.dataset.pdkFolderLayout = 'file-explorer';
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

			const content = document.createElement('div');
			content.className = `pdk-folder-content${layout === 'file-explorer' ? ' pdk-folder-content-explorer' : ''}`;
			content.dataset.pdkFolderLayout = layout;
			content.append(
				createFolderSidebar(folderId, win, layout),
				createFolderMain(folderId, win)
			);

			return content;
		}

		function updateFolderWindowMeta(win, folderId) {
			const folder = getFolder(folderId);
			const folderTitle = getFolderTitle(folder);
			const titlebarLabel = win ? win.querySelector('.pdk-window-titlebar-label-text') : null;

			if (!win || !folder) {
				return false;
			}

			win.dataset.pdkFolderWindow = folderId;
			win.dataset.pdkContextId = folderId;
			win.dataset.pdkContextLabel = folderTitle;
			win.dataset.pdkWindowTitle = folderTitle;
			win.setAttribute('aria-label', `${folderTitle} window`);
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
			win.dataset.pdkFolderLayout = getFolderLayout();
			win.dataset.pdkExplorerViewMode = getExplorerViewMode(win);
			win.dataset.pdkExplorerSortMode = getExplorerSortMode(win);
			body.dataset.pdkFolderLayout = getFolderLayout();
			body.classList.toggle('pdk-explorer-body', isFileExplorerLayout());
			body.classList.toggle('pdk-finder-body', !isFileExplorerLayout());
			setFolderToolbarDisplayMode(win, getFolderToolbarDisplayMode(win));
			body.replaceChildren(createFolderContent(folderId, win));
			if (isFileExplorerLayout()) {
				setExplorerViewMode(win, getExplorerViewMode(win));
			}
			if (manager && typeof manager.makeDraggable === 'function') {
				manager.makeDraggable(win);
			}
			bindFolderToolbarOverflow(win);

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
			const targetWindow = options.windowElement && options.windowElement.dataset && options.windowElement.dataset.pdkWindowKind === 'folder'
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
			if (options.recordRecent !== false) {
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
				appId: isTrashFolderId(folderId) ? 'trash' : '',
				title: folderTitle,
				icon: folder && folder.icon ? folder.icon : 'dashicons-admin-generic',
				titlebarIcon: isFileExplorerLayout() && folder && folder.icon ? folder.icon : '',
				titlebarLabel: isFileExplorerLayout() ? folderTitle : '',
				content: placeholder,
				bodyClass: `pdk-window-body pdk-folder-body ${isFileExplorerLayout() ? 'pdk-explorer-body' : 'pdk-finder-body'}`,
				windowKind: 'folder',
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
				if (options.recordRecent !== false) {
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

			const title = `${info.label} Info`;
			win.dataset.pdkContextLabel = title;
			win.dataset.pdkWindowTitle = title;
			win.setAttribute('aria-label', `${title} window`);
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

			const title = `${info.label} Info`;
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

		shell.addEventListener('pufferDesk:trash-change', refreshTrashWindows);

		return {
			bindShellClicks,
			closeFolderInfoWindow,
			closeFolderTab,
			closeFolderTabsToRight,
			closeFolderWindow,
			closeOtherFolderTabs,
			duplicateFolderTab,
			getWindowOptions,
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
			openSettingsPanel,
			openSiteAbout,
				openUrl,
				refreshFolderInfoWindow,
				refreshFolderWindow,
				setFolderSortMode(folderId, mode, options = {}) {
					const win = options.windowElement || getFolderWindow(folderId);
					return setExplorerSortMode(win, mode);
				},
				setFolderViewMode(folderId, mode, options = {}) {
					const win = options.windowElement || getFolderWindow(folderId);
					return setExplorerViewMode(win, mode);
				},
				setFolderProvider(provider) {
					folderProvider = provider && typeof provider === 'object' ? provider : null;
				},
			runSearch
		};
	};
})();
