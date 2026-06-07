(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};
	window.AdminOSMode.apps = window.AdminOSMode.apps || {};

	window.AdminOSMode.apps.createAppLauncher = function createAppLauncher(shell, manager, config = {}) {
		const dom = window.AdminOSMode.dom;
		const apps = Array.isArray(config.apps) ? config.apps : [];
		const folders = Array.isArray(config.folders) ? config.folders : [];
		const appMap = new Map(apps.map((app) => [app.id, app]));
		const folderMap = new Map(folders.map((folder) => [folder.id, folder]));
		const folderWindowHistory = new WeakMap();
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
				|| (window.AdminOSMode.desktopFolderManager && typeof window.AdminOSMode.desktopFolderManager.getFolder === 'function'
					? window.AdminOSMode.desktopFolderManager
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

		function getAppWindowOptions(app) {
			const options = {
				appId: app.id,
				title: app.label,
				windowKind: 'app',
				icon: app.icon,
				menu: app.menu || null
			};

			if (app.kind === 'native' && app.native === 'settings') {
				options.content = window.AdminOSMode.apps.createSettingsApp({ config });
				options.bodyClass = 'aos-window-body aos-settings-body';
				options.contextMenu = false;
				options.resizeMode = 'vertical';
				options.width = '725px';
				options.height = '680px';
				return options;
			}

			options.url = app.url;
			return options;
		}

		function getWindowOptions(appId) {
			const app = appMap.get(appId);
			return app ? getAppWindowOptions(app) : null;
		}

		function addRecentItem(item) {
			if (!window.AdminOSMode.menuBar || typeof window.AdminOSMode.menuBar.addRecentItem !== 'function') {
				return;
			}

			window.AdminOSMode.menuBar.addRecentItem(config, item);
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
			if (!app || !window.AdminOSMode.apps.createAboutWindow) {
				return;
			}

			manager.createWindow({
				appId: `about-${app.id}`,
				bodyClass: 'aos-window-body aos-about-body',
				centered: true,
				contextMenu: false,
				content: window.AdminOSMode.apps.createAboutWindow(app),
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

			if (!window.AdminOSMode.apps.createSiteAboutWindow) {
				return;
			}

			manager.createWindow({
				appId: 'about-this-site',
				bodyClass: 'aos-window-body aos-site-about-body',
				centered: true,
				contextMenu: false,
				content: window.AdminOSMode.apps.createSiteAboutWindow(siteInfo),
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
			const main = dom.createElement('main', 'aos-settings-main aos-finder-main');
			const header = dom.createElement('header', 'aos-settings-pane-header aos-finder-toolbar');
			const history = dom.createElement('div', 'aos-settings-history aos-finder-history');
			const title = dom.createElement('h1', 'aos-finder-title', folder && folder.label ? folder.label : getMenuLabel('admin', 'Admin'));
			const pane = dom.createElement('div', 'aos-settings-pane aos-finder-pane');

			header.dataset.aosDragHandle = '';
			history.dataset.aosNoDrag = '';
			history.appendChild(createFolderHistoryButton('back', win));
			history.appendChild(createFolderHistoryButton('forward', win));
			header.append(history, title);

			if (!folderApps.length) {
				const empty = document.createElement('p');
				empty.className = 'aos-folder-empty';
				empty.textContent = 'No items';
				pane.appendChild(empty);
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
			body.replaceChildren(createFolderContent(folderId, win));
			if (manager && typeof manager.makeDraggable === 'function') {
				manager.makeDraggable(win);
			}

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
				width: '725px',
				height: '500px'
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
			if (!win || !body || !info || !window.AdminOSMode.apps.createFolderInfoWindow) {
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

			return window.AdminOSMode.apps.createFolderInfoWindow(info, {
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
			if (!info || !window.AdminOSMode.apps.createFolderInfoWindow) {
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
					openFolder(folderButton.dataset.aosOpenFolder);
					return;
				}

				const urlButton = event.target.closest('[data-aos-open-url]');
				if (urlButton) {
					openUrl(urlButton.dataset.aosOpenUrl, urlButton.dataset.aosTitle, urlButton.dataset.aosIcon);
					return;
				}
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
