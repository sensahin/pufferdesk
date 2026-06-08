(function () {
	'use strict';

	window.WPAdminOS = window.WPAdminOS || {};
	window.WPAdminOS.apps = window.WPAdminOS.apps || {};

	window.WPAdminOS.apps.createAppLauncher = function createAppLauncher(shell, manager, config = {}) {
		const dom = window.WPAdminOS.dom;
		const apps = Array.isArray(config.apps) ? config.apps : [];
		const folders = Array.isArray(config.folders) ? config.folders : [];
		const appMap = new Map(apps.map((app) => [app.id, app]));
		const folderMap = new Map(folders.map((folder) => [folder.id, folder]));
		const folderWindowHistory = new WeakMap();
		const folderToolbarDisplayModes = new Set(['icon-text', 'icon-only', 'text-only']);
		let folderProvider = null;
		const menuLabels = config.menu && config.menu.labels && typeof config.menu.labels === 'object'
			? config.menu.labels
			: {};

		function getMenuLabel(key, fallback) {
			return typeof menuLabels[key] === 'string' && menuLabels[key] ? menuLabels[key] : fallback;
		}

		function isHiddenFromLaunchSurfaces(app) {
			const locations = config.appLocations && typeof config.appLocations === 'object' ? config.appLocations : {};

			return Boolean(app && app.id && locations[app.id] === 'hidden');
		}

		function getFolderProvider() {
			return folderProvider
				|| (window.WPAdminOS.desktopFolderManager && typeof window.WPAdminOS.desktopFolderManager.getFolder === 'function'
					? window.WPAdminOS.desktopFolderManager
					: null);
		}

		function getFolder(folderId) {
			const provider = getFolderProvider();
			const folder = provider && typeof provider.getFolder === 'function' ? provider.getFolder(folderId) : null;

			return folder || folderMap.get(folderId) || null;
		}

		function getFolders() {
			const provider = getFolderProvider();
			const availableFolders = provider && typeof provider.getFolders === 'function'
				? provider.getFolders()
				: folders;

			return Array.isArray(availableFolders) ? availableFolders.filter(Boolean) : [];
		}

		function getFolderApps(folderId) {
			const provider = getFolderProvider();
			const folderApps = provider && typeof provider.getFolderApps === 'function'
				? provider.getFolderApps(folderId)
				: apps.filter((app) => app.group === folderId);

			return folderApps.filter((app) => app && !isHiddenFromLaunchSurfaces(app));
		}

		function isUserFolder(folderId) {
			const provider = getFolderProvider();

			return Boolean(provider && typeof provider.isUserFolder === 'function' && provider.isUserFolder(folderId));
		}

		function getFolderInfo(folderId) {
			const provider = getFolderProvider();
			const info = provider && typeof provider.getFolderInfo === 'function' ? provider.getFolderInfo(folderId) : null;
			const folder = info ? null : getFolder(folderId);
			const folderApps = info ? [] : getFolderApps(folderId);

			return info || (folder ? {
				canComment: false,
				canRename: false,
				comment: '',
				createdAt: '',
				icon: folder.icon || 'dashicons-category',
				id: folder.id,
				itemCount: folderApps.length,
				items: folderApps.map((app) => ({ id: app.id, label: app.label, url: app.url || '' })),
				kind: 'Folder',
				label: folder.label || 'Folder',
				lastOpenedAt: '',
				modifiedAt: '',
				source: 'WordPress admin group',
				user: false,
				where: `WordPress Admin Menu > ${folder.label || 'Folder'}`
			} : null);
		}

		function getNativeAppWindowOptions(app, baseOptions) {
			const getOptions = window.WPAdminOS.apps.getNativeAppWindowOptions;
			const nativeOptions = typeof getOptions === 'function'
				? getOptions(app.native, {
					app,
					baseOptions,
					config,
					manager,
					shell
				})
				: null;

			return nativeOptions ? Object.assign({}, baseOptions, nativeOptions) : null;
		}

		function getAppWindowOptions(app) {
			const options = {
				appId: app.id,
				title: app.label,
				windowKind: 'app',
				icon: app.icon,
				menu: app.menu || null
			};

			if (app.kind === 'native') {
				return getNativeAppWindowOptions(app, options);
			}

			options.url = app.url;
			return options;
		}

		function getWindowOptions(appId) {
			const app = appMap.get(appId);
			return app ? getAppWindowOptions(app) : null;
		}

		function addRecentItem(item) {
			if (!window.WPAdminOS.menuBar || typeof window.WPAdminOS.menuBar.addRecentItem !== 'function') {
				return;
			}

			window.WPAdminOS.menuBar.addRecentItem(config, item);
		}

		function openApp(appId) {
			const options = getWindowOptions(appId);
			const app = appMap.get(appId);
			if (!options) {
				return null;
			}

			const win = manager.createWindow(options);
			if (app && win) {
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

			return win;
		}

		function openSettingsPanel(panelId) {
			const win = openApp('os-settings');
			const settingsRoot = win ? win.querySelector('.aos-settings') : null;

			if (settingsRoot && typeof settingsRoot.aosOpenPanel === 'function') {
				return settingsRoot.aosOpenPanel(panelId);
			}

			return false;
		}

		function openAbout(appId) {
			const app = appMap.get(appId);
			if (!app || !window.WPAdminOS.apps.createAboutWindow) {
				return;
			}

			manager.createWindow({
				appId: `about-${app.id}`,
				bodyClass: 'aos-window-body aos-about-body',
				centered: true,
				contextMenu: false,
				content: window.WPAdminOS.apps.createAboutWindow(app),
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

			if (!window.WPAdminOS.apps.createSiteAboutWindow) {
				return;
			}

			manager.createWindow({
				appId: 'about-this-site',
				bodyClass: 'aos-window-body aos-site-about-body',
				centered: true,
				contextMenu: false,
				content: window.WPAdminOS.apps.createSiteAboutWindow(siteInfo),
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

		function createFolderAppButton(app, folderId = '', removable = false) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'aos-app-launcher';
			button.dataset.aosContext = removable ? 'folder-app' : 'app';
			button.dataset.aosContextId = app.id;
			button.dataset.aosContextLabel = app.label;
			if (folderId) {
				button.dataset.aosFolderId = folderId;
			}

			const appIcon = document.createElement('span');
			appIcon.className = 'aos-app-icon';
			appIcon.appendChild(dom.createIcon(app.icon));

			const label = document.createElement('span');
			label.textContent = app.label;

			button.appendChild(appIcon);
			button.appendChild(label);
			button.addEventListener('click', () => openApp(app.id));

			return button;
		}

		function getFolderTitle(folder) {
			const folderLabel = folder && folder.label ? folder.label : getMenuLabel('admin', 'Admin');

			return `${folderLabel} ${getMenuLabel('folder_suffix', 'Folder')}`;
		}

		function getFolderWindowState(win) {
			let state = folderWindowHistory.get(win);
			if (!state) {
				state = {
					entries: [],
					index: -1
				};
				folderWindowHistory.set(win, state);
			}

			return state;
		}

		function updateFolderWindowHistory(win, folderId, options = {}) {
			const state = getFolderWindowState(win);

			if (options.reset || state.index < 0) {
				state.entries = [folderId];
				state.index = 0;
				return state;
			}

			if (options.replace) {
				state.entries[state.index] = folderId;
				return state;
			}

			if (state.entries[state.index] === folderId) {
				return state;
			}

			state.entries = state.entries.slice(0, state.index + 1);
			state.entries.push(folderId);
			state.index = state.entries.length - 1;

			return state;
		}

		function getFolderWindowHistoryState(win) {
			const state = win ? getFolderWindowState(win) : null;

			return {
				canBack: Boolean(state && state.index > 0),
				canForward: Boolean(state && state.index >= 0 && state.index < state.entries.length - 1)
			};
		}

		function getFolderToolbarDisplayMode(win) {
			const mode = win && win.dataset ? win.dataset.aosFolderToolbarDisplay : '';

			return folderToolbarDisplayModes.has(mode) ? mode : 'icon-text';
		}

		function setFolderToolbarDisplayMode(win, mode) {
			const normalized = folderToolbarDisplayModes.has(mode) ? mode : 'icon-text';
			const toolbar = win ? win.querySelector('.aos-finder-toolbar') : null;

			if (win && win.dataset) {
				win.dataset.aosFolderToolbarDisplay = normalized;
			}

			if (toolbar) {
				toolbar.dataset.aosFolderToolbarDisplay = normalized;
			}

			return normalized;
		}

		function navigateFolderHistory(win, offset) {
			const state = win ? getFolderWindowState(win) : null;
			const nextIndex = state ? state.index + offset : -1;
			const nextFolderId = state && nextIndex >= 0 && nextIndex < state.entries.length ? state.entries[nextIndex] : '';

			if (!nextFolderId) {
				return false;
			}

			state.index = nextIndex;
			return renderFolderWindow(win, nextFolderId, {
				updateHistory: false
			});
		}

		function createFolderHistoryButton(direction, win) {
			const button = document.createElement('button');
			const history = getFolderWindowHistoryState(win);
			const canNavigate = direction === 'back' ? history.canBack : history.canForward;
			button.type = 'button';
			button.className = `aos-settings-history-button aos-settings-history-button-${direction} aos-finder-history-button`;
			button.disabled = !canNavigate;
			button.setAttribute('aria-label', direction === 'back' ? 'Back' : 'Forward');
			button.appendChild(dom.createElement('span', 'aos-settings-history-chevron'));
			button.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				navigateFolderHistory(win, direction === 'back' ? -1 : 1);
			});

			return button;
		}

		function createFolderToolbarIcon(action) {
			const icon = dom.createElement('span', `aos-finder-toolbar-icon aos-finder-toolbar-icon-${action.id}`);

			if (action.icon) {
				icon.appendChild(dom.createDashicon(action.icon));
			}

			if (action.badge) {
				icon.appendChild(dom.createElement('span', `aos-finder-toolbar-badge aos-finder-toolbar-badge-${action.badge}`));
			}

			if (action.disclosure) {
				icon.appendChild(dom.createElement('span', 'aos-finder-toolbar-disclosure'));
			}

			return icon;
		}

		function createFolderToolbarButton(action) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = `aos-finder-toolbar-button aos-finder-toolbar-button-${action.id}`;
			button.tabIndex = -1;
			button.dataset.aosNoDrag = '';
			button.dataset.aosToolbarAction = action.id;
			button.setAttribute('aria-disabled', 'true');
			button.setAttribute('aria-label', action.label);
			button.appendChild(createFolderToolbarIcon(action));
			button.appendChild(dom.createElement('span', 'aos-finder-toolbar-label', action.label));
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
			const icon = dom.createElement('span', 'aos-finder-toolbar-icon aos-finder-toolbar-icon-overflow');

			button.type = 'button';
			button.className = 'aos-finder-toolbar-button aos-finder-toolbar-overflow-button';
			button.dataset.aosNoDrag = '';
			button.setAttribute('aria-label', 'More Toolbar Items');
			icon.append(
				dom.createElement('span', 'aos-finder-toolbar-overflow-chevron'),
				dom.createElement('span', 'aos-finder-toolbar-overflow-chevron')
			);
			button.appendChild(icon);

			return button;
		}

		function createFolderToolbarOverflowMenuItem(action) {
			const item = dom.createElement('div', 'aos-finder-toolbar-overflow-menu-item');
			const label = dom.createElement('span', 'aos-finder-toolbar-overflow-menu-label', action.label);

			item.setAttribute('role', 'menuitem');
			item.setAttribute('aria-disabled', 'true');
			item.append(createFolderToolbarIcon(action), label);

			return item;
		}

		function setFolderToolbarOverflowMenu(actions, hiddenIds) {
			const menu = actions ? actions.querySelector('.aos-finder-toolbar-overflow-menu') : null;
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
			const actions = dom.createElement('div', 'aos-finder-toolbar-actions');
			const overflow = dom.createElement('div', 'aos-finder-toolbar-overflow');
			const overflowButton = createFolderToolbarOverflowButton();
			const overflowMenu = dom.createElement('div', 'aos-finder-toolbar-overflow-menu');
			const toolbarActions = getFolderToolbarActions();
			const searchAction = toolbarActions.find((action) => action.id === 'search');

			actions.dataset.aosNoDrag = '';
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
			const toolbar = win ? win.querySelector('.aos-finder-toolbar') : null;
			const title = win ? win.querySelector('.aos-finder-title') : null;
			const actions = win ? win.querySelector('.aos-finder-toolbar-actions') : null;
			const overflow = actions ? actions.querySelector('.aos-finder-toolbar-overflow') : null;
			const overflowMenu = overflow ? overflow.querySelector('.aos-finder-toolbar-overflow-menu') : null;
			const buttons = actions
				? Array.from(actions.querySelectorAll('[data-aos-toolbar-action]'))
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
							item.classList.contains('aos-finder-toolbar-button')
							|| item.classList.contains('aos-finder-toolbar-overflow')
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
				const button = actions.querySelector(`[data-aos-toolbar-action="${actionId}"]`);
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
			const toolbar = win ? win.querySelector('.aos-finder-toolbar') : null;
			if (!toolbar) {
				return;
			}

			if (win.aosFolderToolbarResizeObserver && typeof win.aosFolderToolbarResizeObserver.disconnect === 'function') {
				win.aosFolderToolbarResizeObserver.disconnect();
			}

			const sync = () => {
				window.requestAnimationFrame(() => syncFolderToolbarOverflow(win));
			};

			if (win.aosFolderToolbarDisplayHandler) {
				win.removeEventListener('wpAdminOS:folder-toolbar-display-change', win.aosFolderToolbarDisplayHandler);
			}

			win.aosFolderToolbarDisplayHandler = sync;
			win.addEventListener('wpAdminOS:folder-toolbar-display-change', win.aosFolderToolbarDisplayHandler);

			sync();

			if (typeof window.ResizeObserver === 'function') {
				win.aosFolderToolbarResizeObserver = new window.ResizeObserver(sync);
				win.aosFolderToolbarResizeObserver.observe(toolbar);
				win.aosFolderToolbarResizeObserver.observe(win);
			}
		}

		function createFolderSidebarIcon(folder) {
			const icon = dom.createElement('span', 'aos-settings-sidebar-icon aos-settings-sidebar-icon-blue aos-finder-sidebar-icon');
			icon.appendChild(dom.createIcon(folder && folder.icon ? folder.icon : 'dashicons-category'));

			return icon;
		}

		function createFolderSidebar(folderId, win) {
			const sidebar = dom.createElement('aside', 'aos-settings-sidebar aos-finder-sidebar');
			const dragZone = dom.createElement('div', 'aos-split-sidebar-drag-zone');
			const nav = dom.createElement('nav', 'aos-settings-sidebar-nav aos-finder-sidebar-nav');

			sidebar.setAttribute('aria-label', 'Folders');
			dragZone.dataset.aosDragHandle = '';
			dragZone.setAttribute('aria-hidden', 'true');
			sidebar.appendChild(dragZone);
			sidebar.appendChild(dom.createElement('div', 'aos-finder-sidebar-heading', 'Folders'));

			getFolders().forEach((folder) => {
				const button = document.createElement('button');
				button.type = 'button';
				button.className = 'aos-settings-sidebar-item aos-finder-sidebar-item';
				button.dataset.aosContext = 'folder';
				button.dataset.aosContextId = folder.id;
				button.dataset.aosContextLabel = folder.label || 'Folder';
				button.appendChild(createFolderSidebarIcon(folder));
				button.appendChild(dom.createElement('span', 'aos-settings-sidebar-label', folder.label || 'Folder'));
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
			const folderApps = getFolderApps(folderId);
			const removable = isUserFolder(folderId);
			const toolbarDisplayMode = getFolderToolbarDisplayMode(win);
			const main = dom.createElement('main', 'aos-settings-main aos-finder-main');
			const header = dom.createElement('header', 'aos-settings-pane-header aos-finder-toolbar');
			const leading = dom.createElement('div', 'aos-finder-toolbar-leading');
			const historyGroup = dom.createElement('div', 'aos-finder-toolbar-history-group');
			const history = dom.createElement('div', 'aos-settings-history aos-finder-history');
			const title = dom.createElement('h1', 'aos-finder-title', folder && folder.label ? folder.label : getMenuLabel('admin', 'Admin'));
			const pane = dom.createElement('div', 'aos-settings-pane aos-finder-pane');

			header.dataset.aosContext = 'folder-toolbar';
			header.dataset.aosContextId = folderId;
			header.dataset.aosContextLabel = 'Folder Toolbar';
			header.dataset.aosDragHandle = '';
			header.dataset.aosFolderId = folderId;
			header.dataset.aosFolderToolbarDisplay = toolbarDisplayMode;
			history.dataset.aosNoDrag = '';
			history.appendChild(createFolderHistoryButton('back', win));
			history.appendChild(createFolderHistoryButton('forward', win));
			historyGroup.append(history, dom.createElement('span', 'aos-finder-toolbar-caption', 'Back/Forward'));
			leading.append(historyGroup, title);
			header.append(leading, createFolderToolbarActions());

			if (!folderApps.length) {
				main.append(header, pane);
				return main;
			}

			const grid = document.createElement('div');
			grid.className = 'aos-app-grid aos-finder-grid';
			folderApps.forEach((app) => grid.appendChild(createFolderAppButton(app, folderId, removable)));
			pane.appendChild(grid);
			main.append(header, pane);

			return main;
		}

		function createFolderContent(folderId, win = null) {
			const content = document.createElement('div');
			content.className = 'aos-folder-content';
			content.append(createFolderSidebar(folderId, win), createFolderMain(folderId, win));

			return content;
		}

		function updateFolderWindowMeta(win, folderId) {
			const folder = getFolder(folderId);
			const folderTitle = getFolderTitle(folder);
			const titlebarLabel = win ? win.querySelector('.aos-window-titlebar-label-text') : null;

			if (!win || !folder) {
				return false;
			}

			win.dataset.aosFolderWindow = folderId;
			win.dataset.aosContextId = folderId;
			win.dataset.aosContextLabel = folderTitle;
			win.dataset.aosWindowTitle = folderTitle;
			win.setAttribute('aria-label', `${folderTitle} window`);
			if (titlebarLabel) {
				titlebarLabel.textContent = folderTitle;
			}

			return true;
		}

		function renderFolderWindow(win, folderId, options = {}) {
			const folder = getFolder(folderId);
			const body = win ? win.querySelector('.aos-window-body') : null;
			if (!win || !body || !folder) {
				return false;
			}

			if (options.updateHistory !== false) {
				updateFolderWindowHistory(win, folderId, {
					replace: Boolean(options.replaceHistory),
					reset: Boolean(options.resetHistory)
				});
			}

			updateFolderWindowMeta(win, folderId);
			setFolderToolbarDisplayMode(win, getFolderToolbarDisplayMode(win));
			body.replaceChildren(createFolderContent(folderId, win));
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

			return true;
		}

		function getFolderWindow(folderId) {
			if (!folderId) {
				return null;
			}

			return shell.querySelector(`.aos-window[data-aos-folder-window="${dom.escapeAttribute(folderId)}"]:not(.is-closed)`);
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

		function openFolder(folderId) {
			const folder = getFolder(folderId);
			const folderTitle = getFolderTitle(folder);
			const existing = getFolderWindow(folderId);

			if (!folder) {
				return null;
			}

			if (existing) {
				renderFolderWindow(existing, folderId, {
					replaceHistory: true
				});
				manager.focusWindow(existing);
				return existing;
			}

			const placeholder = document.createElement('div');
			const win = manager.createWindow({
				title: folderTitle,
				icon: folder && folder.icon ? folder.icon : 'dashicons-admin-generic',
				content: placeholder,
				bodyClass: 'aos-window-body aos-folder-body aos-finder-body',
				windowKind: 'folder',
				width: '1020px',
				height: '540px'
			});

			if (win) {
				renderFolderWindow(win, folderId, {
					resetHistory: true
				});
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

			return win;
		}

		function getFolderInfoWindow(folderId) {
			if (!folderId) {
				return null;
			}

			return shell.querySelector(`.aos-window[data-aos-folder-info-window="${dom.escapeAttribute(folderId)}"]:not(.is-closed)`);
		}

		function refreshFolderInfoWindow(folderId) {
			const win = getFolderInfoWindow(folderId);
			const body = win ? win.querySelector('.aos-window-body') : null;
			const info = getFolderInfo(folderId);
			if (!win || !body || !info || !window.WPAdminOS.apps.createFolderInfoWindow) {
				return false;
			}

			const title = `${info.label} Info`;
			win.dataset.aosContextLabel = title;
			win.dataset.aosWindowTitle = title;
			win.setAttribute('aria-label', `${title} window`);
			const titlebarLabel = win.querySelector('.aos-window-titlebar-label-text');
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
			const menuBar = shell.querySelector('.aos-menu-bar');
			const menuBarHeight = menuBar && shell.dataset.aosMenuBarHidden !== '1'
				? Math.ceil(menuBar.getBoundingClientRect().height)
				: 0;

			return menuBarHeight + 4;
		}

		function fitFolderInfoWindow(win) {
			const desktop = shell.querySelector('.aos-desktop');
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
			const nextTop = Math.min(Math.max(relativeTop, safeTop), maxTop);

			win.style.top = `${Math.round(nextTop)}px`;
		}

		function bindFolderInfoAutoSize(win) {
			if (!win) {
				return;
			}

			if (win.dataset.aosFolderInfoAutoSizeBound !== '1') {
				win.dataset.aosFolderInfoAutoSizeBound = '1';
				win.addEventListener('toggle', (event) => {
					if (!event.target || !event.target.classList || !event.target.classList.contains('aos-info-panel-section')) {
						return;
					}

					window.requestAnimationFrame(() => fitFolderInfoWindow(win));
				}, true);
			}

			window.requestAnimationFrame(() => fitFolderInfoWindow(win));
		}

		function createFolderInfoContent(info) {
			const provider = getFolderProvider();

			return window.WPAdminOS.apps.createFolderInfoWindow(info, {
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
			if (!info || !window.WPAdminOS.apps.createFolderInfoWindow) {
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
				bodyClass: 'aos-window-body aos-info-panel-body',
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
				win.dataset.aosFolderInfoWindow = info.id;
				win.dataset.aosContextId = info.id;
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
				const appButton = event.target.closest('[data-aos-open-app]');
				if (appButton) {
					openApp(appButton.dataset.aosOpenApp);
					return;
				}

				const folderButton = event.target.closest('[data-aos-open-folder]');
				if (folderButton) {
					if (folderButton.matches('.aos-desktop-folder')) {
						return;
					}
					openFolder(folderButton.dataset.aosOpenFolder);
					return;
				}

				const urlButton = event.target.closest('[data-aos-open-url]');
				if (urlButton) {
					openUrl(urlButton.dataset.aosOpenUrl, urlButton.dataset.aosTitle, urlButton.dataset.aosIcon);
					return;
				}
			});

			shell.addEventListener('dblclick', (event) => {
				const folderButton = event.target.closest('[data-aos-open-folder]');
				if (!folderButton || !folderButton.matches('.aos-desktop-folder') || folderButton.classList.contains('is-renaming')) {
					return;
				}

				event.preventDefault();
				openFolder(folderButton.dataset.aosOpenFolder);
			});
		}

		return {
			bindShellClicks,
			closeFolderInfoWindow,
			closeFolderWindow,
			getWindowOptions,
			openAbout,
			openApp,
			openFolder,
			openFolderInfo,
			openSettingsPanel,
			openSiteAbout,
			openUrl,
			refreshFolderInfoWindow,
			refreshFolderWindow,
			setFolderProvider(provider) {
				folderProvider = provider && typeof provider === 'object' ? provider : null;
			},
			runSearch
		};
	};
})();
