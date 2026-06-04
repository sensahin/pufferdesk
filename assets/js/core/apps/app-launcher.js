(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};
	window.AdminOSMode.apps = window.AdminOSMode.apps || {};

	window.AdminOSMode.apps.createAppLauncher = function createAppLauncher(shell, manager, config = {}) {
		const dom = window.AdminOSMode.dom;
		const apps = Array.isArray(config.apps) ? config.apps : [];
		const appMap = new Map(apps.map((app) => [app.id, app]));

		function getAppWindowOptions(app) {
			const options = {
				appId: app.id,
				title: app.label,
				icon: app.icon
			};

			if (app.kind === 'native' && app.native === 'settings') {
				options.content = window.AdminOSMode.apps.createSettingsApp({ config });
				options.bodyClass = 'aos-window-body aos-settings-body';
				options.width = '620px';
				options.height = '560px';
				return options;
			}

			options.url = app.url;
			return options;
		}

		function getWindowOptions(appId) {
			const app = appMap.get(appId);
			return app ? getAppWindowOptions(app) : null;
		}

		function openApp(appId) {
			const options = getWindowOptions(appId);
			if (!options) {
				return;
			}

			manager.createWindow(options);
		}

		function openUrl(url, title, icon) {
			manager.createWindow({
				title: title || 'Admin',
				icon: icon || 'dashicons-admin-generic',
				url
			});
		}

		function createFolderAppButton(app) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'aos-app-launcher';

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
			const folderNames = {
				content: 'Content',
				site: 'Site',
				system: 'System'
			};

			if (!folderApps.length) {
				return;
			}

			const content = document.createElement('div');
			content.className = 'aos-folder-body';

			const grid = document.createElement('div');
			grid.className = 'aos-app-grid';
			folderApps.forEach((app) => grid.appendChild(createFolderAppButton(app)));
			content.appendChild(grid);

			manager.createWindow({
				title: `${folderNames[folderId] || 'Folder'} Folder`,
				icon: folderId === 'content' ? 'dashicons-category' : 'dashicons-admin-generic',
				content,
				bodyClass: 'aos-window-body aos-folder-body',
				width: '560px',
				height: '420px'
			});
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

				const welcomeButton = event.target.closest('[data-aos-open-window="welcome"]');
				if (welcomeButton) {
					manager.focusWindow(shell.querySelector('[data-aos-window="welcome"]'));
				}
			});
		}

		return {
			bindShellClicks,
			getWindowOptions,
			openApp,
			openFolder,
			openUrl,
			runSearch
		};
	};
})();
