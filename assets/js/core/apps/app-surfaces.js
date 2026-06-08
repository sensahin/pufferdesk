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

		function normalizeAppBadge(app) {
			const badge = app && app.badge && typeof app.badge === 'object' ? app.badge : null;
			if (!badge) {
				return null;
			}

			const text = typeof badge.text === 'string' || typeof badge.text === 'number'
				? String(badge.text).trim()
				: '';
			if (!text || text === '0') {
				return null;
			}

			const allowedTones = ['attention', 'neutral', 'update'];
			const tone = typeof badge.tone === 'string' && allowedTones.includes(badge.tone)
				? badge.tone
				: 'attention';

			return {
				ariaLabel: typeof badge.aria_label === 'string' ? badge.aria_label.trim() : '',
				text,
				tone
			};
		}

		function getAppLabel(app) {
			return app.label || app.id;
		}

		function getAppButtonLabel(app) {
			const label = getAppLabel(app);
			const badge = normalizeAppBadge(app);

			return badge && badge.ariaLabel ? `${label}, ${badge.ariaLabel}` : label;
		}

		function createAppBadge(app) {
			const badge = normalizeAppBadge(app);
			if (!badge) {
				return null;
			}

			const element = dom.createElement('span', `aos-app-badge aos-app-badge-${badge.tone}`, badge.text);
			element.setAttribute('aria-hidden', 'true');

			return element;
		}

		function createDockAppButton(app) {
			const button = document.createElement('button');
			const label = getAppLabel(app);
			const tooltip = dom.createElement('span', 'aos-dock-tooltip', label);
			const screenReaderText = dom.createElement('span', 'screen-reader-text', label);
			const badge = createAppBadge(app);

			button.type = 'button';
			button.className = 'aos-dock-item';
			button.dataset.aosContext = 'dock-app';
			button.dataset.aosContextId = app.id;
			button.dataset.aosContextLabel = label;
			button.dataset.aosDockTooltip = label;
			button.dataset.aosOpenApp = app.id;
			button.draggable = false;
			button.setAttribute('aria-label', getAppButtonLabel(app));
			button.appendChild(dom.createIcon(app.icon || 'dashicons-admin-generic'));
			if (badge) {
				button.appendChild(badge);
			}
			tooltip.setAttribute('aria-hidden', 'true');
			button.append(tooltip, screenReaderText);

			return button;
		}

		function createDesktopAppButton(app) {
			const button = document.createElement('button');
			const icon = dom.createElement('span', 'aos-app-icon');
			const label = getAppLabel(app);
			const badge = createAppBadge(app);
			const labelElement = dom.createElement('span', 'aos-desktop-app-label', label);

			button.type = 'button';
			button.className = 'aos-desktop-icon aos-desktop-app';
			button.dataset.aosContext = 'desktop-app';
			button.dataset.aosContextId = app.id;
			button.dataset.aosContextLabel = label;
			button.dataset.aosDesktopIcon = '';
			button.dataset.aosDesktopIconId = `app:${app.id}`;
			button.dataset.aosDesktopIconKind = 'app';
			button.dataset.aosOpenApp = app.id;
			button.setAttribute('aria-label', getAppButtonLabel(app));
			icon.appendChild(dom.createIcon(app.icon || 'dashicons-admin-generic'));
			if (badge) {
				icon.appendChild(badge);
			}
			button.append(icon, labelElement);

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
				const dockApps = apps.filter((app) => appIsShownIn(app, 'dock', normalizedLocations));
				const orderedDockApps = window.WPAdminOS.desktopDock && typeof window.WPAdminOS.desktopDock.orderApps === 'function'
					? window.WPAdminOS.desktopDock.orderApps(dockApps, config)
					: dockApps;

				Array.from(dock.children).forEach((child) => {
					if (child.classList && child.classList.contains('aos-dock-item')) {
						child.remove();
					}
				});
				orderedDockApps.forEach((app) => {
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
