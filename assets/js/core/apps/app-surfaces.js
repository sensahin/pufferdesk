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

		function hasLauncherSurface() {
			if (config.shellCapabilities && typeof config.shellCapabilities === 'object' && Object.prototype.hasOwnProperty.call(config.shellCapabilities, 'hasLauncher')) {
				return config.shellCapabilities.hasLauncher !== false;
			}

			return !(config.shellChrome && typeof config.shellChrome === 'object' && config.shellChrome.launcher === 'none');
		}

		function normalizeLocations(locations = {}) {
			const hasLauncher = hasLauncherSurface();
			const allowedLocations = hasLauncher ? ['dock', 'desktop', 'both', 'hidden'] : ['desktop', 'hidden'];
			const defaultLocation = hasLauncher ? 'dock' : 'desktop';
			const normalized = {};

			apps.forEach((app) => {
				if (!app || !app.id) {
					return;
				}

				if (isFixedDockApp(app)) {
					normalized[app.id] = hasLauncher ? 'dock' : 'hidden';
					return;
				}

				const location = typeof locations[app.id] === 'string' ? locations[app.id] : defaultLocation;
				if (!hasLauncher && (location === 'dock' || location === 'both')) {
					normalized[app.id] = 'desktop';
					return;
				}

				normalized[app.id] = allowedLocations.includes(location) ? location : defaultLocation;
			});

			if (preserveUnknown) {
				Object.keys(locations || {}).forEach((appId) => {
					if (normalized[appId]) {
						return;
					}

					const location = typeof locations[appId] === 'string' ? locations[appId] : '';
					if (allowedLocations.includes(location)) {
						normalized[appId] = location;
					} else if (!hasLauncher && (location === 'dock' || location === 'both')) {
						normalized[appId] = 'desktop';
					}
				});
			}

			return normalized;
		}

		function appIsShownIn(app, surface, locations = normalizeLocations(config.appLocations || {})) {
			if (isFixedDockApp(app)) {
				return surface === 'dock';
			}

			const location = app && app.id ? locations[app.id] || 'dock' : 'dock';

			return location === 'both' || location === surface;
		}

		function isFixedDockApp(app) {
			return Boolean(app && app.dock && typeof app.dock === 'object' && app.dock.fixed === true);
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

		function createDockSeparator() {
			const separator = dom.createElement('span', 'aos-dock-separator');
			separator.setAttribute('aria-hidden', 'true');

			return separator;
		}

		function getDockEndAnchor(dock) {
			return dock
				? dock.querySelector('[data-aos-launcher-end-anchor]') || dock.querySelector('.aos-dock-minimized-windows')
				: null;
		}

		function createDockAppButton(app, options = {}) {
			const button = document.createElement('button');
			const label = getAppLabel(app);
			const tooltip = dom.createElement('span', 'aos-dock-tooltip', label);
			const screenReaderText = dom.createElement('span', 'screen-reader-text', label);
			const badge = createAppBadge(app);
			const fixed = options.fixed === true || isFixedDockApp(app);

			button.type = 'button';
			button.className = fixed ? 'aos-dock-item aos-dock-fixed-item' : 'aos-dock-item';
			button.dataset.aosContext = 'dock-app';
			button.dataset.aosContextId = app.id;
			button.dataset.aosContextLabel = label;
			button.dataset.aosDockTooltip = label;
			button.dataset.aosOpenApp = app.id;
			if (fixed) {
				button.dataset.aosDockFixed = app.dock && app.dock.placement ? app.dock.placement : 'end';
			}
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
			if (folderManager && typeof folderManager.syncTrashSurfaceState === 'function') {
				folderManager.syncTrashSurfaceState();
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
				const dockEndAnchor = getDockEndAnchor(dock);
				const dockApps = apps.filter((app) => appIsShownIn(app, 'dock', normalizedLocations));
				const fixedDockApps = dockApps.filter(isFixedDockApp);
				const regularDockApps = dockApps.filter((app) => !isFixedDockApp(app));
				const orderedDockApps = window.WPAdminOS.desktopDock && typeof window.WPAdminOS.desktopDock.orderApps === 'function'
					? window.WPAdminOS.desktopDock.orderApps(regularDockApps, config)
					: regularDockApps;

				Array.from(dock.children).forEach((child) => {
					if (child.classList && (child.classList.contains('aos-dock-item') || child.classList.contains('aos-dock-separator'))) {
						child.remove();
					}
				});
				orderedDockApps.forEach((app) => {
					dock.insertBefore(createDockAppButton(app), minimizedWindows || dockEndAnchor || null);
				});
				if (fixedDockApps.length) {
					dock.insertBefore(createDockSeparator(), minimizedWindows || dockEndAnchor || null);
					fixedDockApps.forEach((app) => {
						dock.insertBefore(createDockAppButton(app, {
							fixed: true
						}), dockEndAnchor || null);
					});
				}
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
			isFixedDockApp,
			normalizeLocations,
			render,
			syncRunningDockItems
		};
	};
})();
