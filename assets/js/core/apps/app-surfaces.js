(function () {
	'use strict';

	window.WPAdminOS = window.WPAdminOS || {};
	window.WPAdminOS.apps = window.WPAdminOS.apps || {};

	window.WPAdminOS.apps.createAppSurfaceManager = function createAppSurfaceManager(shell, config = {}, options = {}) {
		const dom = window.WPAdminOS.dom;
		const apps = Array.isArray(options.apps) ? options.apps : (Array.isArray(config.apps) ? config.apps : []);
		const preserveUnknown = options.preserveUnknown === true;

		function getFolderManager() {
			return options.folderManager || window.WPAdminOS.desktopFolderManager || null;
		}

		function getDesktopIconManager() {
			return options.desktopIconManager || window.WPAdminOS.desktopIconManager || null;
		}

		function normalizeLocations(locations = {}) {
			const allowedLocations = ['dock', 'desktop', 'both', 'hidden'];
			const normalized = {};

			apps.forEach((app) => {
				if (!app || !app.id) {
					return;
				}

				const location = typeof locations[app.id] === 'string' ? locations[app.id] : 'dock';
				normalized[app.id] = allowedLocations.includes(location) ? location : 'dock';
			});

			if (preserveUnknown) {
				Object.keys(locations || {}).forEach((appId) => {
					if (normalized[appId]) {
						return;
					}

					const location = typeof locations[appId] === 'string' ? locations[appId] : '';
					if (allowedLocations.includes(location)) {
						normalized[appId] = location;
					}
				});
			}

			return normalized;
		}

		function appIsShownIn(app, surface, locations = normalizeLocations(config.appLocations || {})) {
			const location = app && app.id ? locations[app.id] || 'dock' : 'dock';

			return location === 'both' || location === surface;
		}

		function createDockAppButton(app) {
			const button = document.createElement('button');
			const tooltip = dom.createElement('span', 'aos-dock-tooltip', app.label || app.id);
			const screenReaderText = dom.createElement('span', 'screen-reader-text', app.label || app.id);

			button.type = 'button';
			button.className = 'aos-dock-item';
			button.dataset.aosContext = 'dock-app';
			button.dataset.aosContextId = app.id;
			button.dataset.aosContextLabel = app.label || app.id;
			button.dataset.aosDockTooltip = app.label || app.id;
			button.dataset.aosOpenApp = app.id;
			button.setAttribute('aria-label', app.label || app.id);
			button.appendChild(dom.createIcon(app.icon || 'dashicons-admin-generic'));
			tooltip.setAttribute('aria-hidden', 'true');
			button.append(tooltip, screenReaderText);

			return button;
		}

		function createDesktopAppButton(app) {
			const button = document.createElement('button');
			const icon = dom.createElement('span', 'aos-app-icon');
			const label = dom.createElement('span', 'aos-desktop-app-label', app.label || app.id);

			button.type = 'button';
			button.className = 'aos-desktop-icon aos-desktop-app';
			button.dataset.aosContext = 'desktop-app';
			button.dataset.aosContextId = app.id;
			button.dataset.aosContextLabel = app.label || app.id;
			button.dataset.aosDesktopIcon = '';
			button.dataset.aosDesktopIconId = `app:${app.id}`;
			button.dataset.aosDesktopIconKind = 'app';
			button.dataset.aosOpenApp = app.id;
			button.setAttribute('aria-label', app.label || app.id);
			icon.appendChild(dom.createIcon(app.icon || 'dashicons-admin-generic'));
			button.append(icon, label);

			return button;
		}

		function syncRunningDockItems() {
			if (!shell) {
				return;
			}

			shell.querySelectorAll('.aos-dock-item.is-running').forEach((button) => {
				button.classList.remove('is-running');
			});
			shell.querySelectorAll('.aos-window[data-aos-app-window]:not(.is-closed)').forEach((win) => {
				const appId = win.dataset.aosAppWindow;
				const button = appId
					? shell.querySelector(`.aos-dock-item[data-aos-open-app="${dom.escapeAttribute(appId)}"]`)
					: null;

				if (button) {
					button.classList.add('is-running');
				}
			});
		}

		function syncDesktopManagers() {
			const folderManager = getFolderManager();
			const desktopIconManager = getDesktopIconManager();

			if (folderManager && typeof folderManager.syncDesktopAppVisibility === 'function') {
				folderManager.syncDesktopAppVisibility();
			}
			if (desktopIconManager && typeof desktopIconManager.rebind === 'function') {
				desktopIconManager.rebind();
			}
		}

		function render(locations = config.appLocations || {}) {
			if (!shell) {
				return;
			}

			const normalizedLocations = normalizeLocations(locations);
			const dock = shell.querySelector('.aos-dock');

			if (dock) {
				const minimizedWindows = dock.querySelector('.aos-dock-minimized-windows');
				Array.from(dock.children).forEach((child) => {
					if (child.classList && child.classList.contains('aos-dock-item')) {
						child.remove();
					}
				});
				apps
					.filter((app) => appIsShownIn(app, 'dock', normalizedLocations))
					.forEach((app) => {
						dock.insertBefore(createDockAppButton(app), minimizedWindows || null);
					});
				syncRunningDockItems();
			}

			const desktop = shell.querySelector('.aos-desktop');
			if (!desktop) {
				return;
			}

			let layer = desktop.querySelector('.aos-desktop-apps');
			const desktopApps = apps.filter((app) => appIsShownIn(app, 'desktop', normalizedLocations));

			if (!desktopApps.length) {
				if (layer) {
					layer.remove();
				}
				syncDesktopManagers();
				return;
			}

			if (!layer) {
				layer = dom.createElement('section', 'aos-desktop-apps aos-desktop-icon-layer');
				layer.setAttribute('aria-label', 'Desktop apps');
				const folderLayer = desktop.querySelector('.aos-desktop-folders');
				desktop.insertBefore(layer, folderLayer ? folderLayer.nextSibling : desktop.firstChild);
			}

			layer.replaceChildren(...desktopApps.map(createDesktopAppButton));
			syncDesktopManagers();
		}

		function apply(locations = {}) {
			config.appLocations = normalizeLocations(locations);
			render(config.appLocations);

			return config.appLocations;
		}

		return {
			apply,
			appIsShownIn,
			createDesktopAppButton,
			createDockAppButton,
			normalizeLocations,
			render,
			syncRunningDockItems
		};
	};
})();
