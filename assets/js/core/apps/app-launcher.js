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
		const menuLabels = config.menu && config.menu.labels && typeof config.menu.labels === 'object'
			? config.menu.labels
			: {};

		function getMenuLabel(key, fallback) {
			return typeof menuLabels[key] === 'string' && menuLabels[key] ? menuLabels[key] : fallback;
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
				options.width = '740px';
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

		function createFolderAppButton(app) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'aos-app-launcher';
			button.dataset.aosContext = 'app';
			button.dataset.aosContextId = app.id;
			button.dataset.aosContextLabel = app.label;

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

		function openFolder(folderId) {
			const folderApps = apps.filter((app) => app.group === folderId);
			const folder = folderMap.get(folderId);
			const folderLabel = folder && folder.label ? folder.label : getMenuLabel('admin', 'Admin');
			const folderTitle = `${folderLabel} ${getMenuLabel('folder_suffix', 'Folder')}`;

			if (!folderApps.length) {
				return;
			}

			const content = document.createElement('div');
			content.className = 'aos-folder-body';

			const grid = document.createElement('div');
			grid.className = 'aos-app-grid';
			folderApps.forEach((app) => grid.appendChild(createFolderAppButton(app)));
			content.appendChild(grid);

			const win = manager.createWindow({
				title: folderTitle,
				icon: folder && folder.icon ? folder.icon : 'dashicons-admin-generic',
				content,
				bodyClass: 'aos-window-body aos-folder-body',
				windowKind: 'folder',
				width: '560px',
				height: '420px'
			});

			if (win) {
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
		}

		function runSearch(query) {
			const needle = query.trim().toLowerCase();
			if (!needle) {
				return null;
			}

			return apps.find((app) => app.label.toLowerCase().includes(needle) || app.id.includes(needle)) || null;
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
			getWindowOptions,
			openAbout,
			openApp,
			openFolder,
			openSettingsPanel,
			openSiteAbout,
			openUrl,
			runSearch
		};
	};
})();
