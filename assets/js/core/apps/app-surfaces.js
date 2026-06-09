(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};

	function createRunningState() {
		const externalRunningApps = new Set();

		function normalizeAppId(appId) {
			return String(appId || '').trim();
		}

		function getWindowRunningAppIds(shell) {
			const appIds = new Set();

			if (!shell) {
				return appIds;
			}

			shell.querySelectorAll('.pdk-window[data-pdk-app-window]:not(.is-closed)').forEach((win) => {
				const appId = normalizeAppId(win.dataset.pdkAppWindow);
				if (appId) {
					appIds.add(appId);
				}
			});

			return appIds;
		}

		function getRunningAppIds(shell) {
			const appIds = getWindowRunningAppIds(shell);

			externalRunningApps.forEach((appId) => appIds.add(appId));

			return appIds;
		}

		function syncDock(shell) {
			if (!shell) {
				return new Set();
			}

			const runningAppIds = getRunningAppIds(shell);

			shell.querySelectorAll('.pdk-dock-item[data-pdk-open-app]').forEach((button) => {
				button.classList.toggle('is-running', runningAppIds.has(normalizeAppId(button.dataset.pdkOpenApp)));
			});

			return runningAppIds;
		}

		function setExternal(appId, running, options = {}) {
			const normalizedAppId = normalizeAppId(appId);
			const shouldRun = Boolean(running);
			const changed = normalizedAppId && (shouldRun !== externalRunningApps.has(normalizedAppId));

			if (!normalizedAppId) {
				return false;
			}

			if (shouldRun) {
				externalRunningApps.add(normalizedAppId);
			} else {
				externalRunningApps.delete(normalizedAppId);
			}

			if (options.shell) {
				syncDock(options.shell);
			}

			if (changed && window.PufferDesk.events && typeof window.PufferDesk.events.emit === 'function') {
				window.PufferDesk.events.emit('app:running-state-changed', {
					appId: normalizedAppId,
					running: shouldRun,
					source: options.source || 'external'
				});
			}

			return shouldRun;
		}

		return {
			getExternalRunningAppIds() {
				return Array.from(externalRunningApps);
			},
			getRunningAppIds,
			isExternalRunning(appId) {
				return externalRunningApps.has(normalizeAppId(appId));
			},
			setExternal,
			syncDock
		};
	}

	const runningState = window.PufferDesk.apps.runningState || createRunningState();
	window.PufferDesk.apps.runningState = runningState;

	window.PufferDesk.apps.createAppSurfaceManager = function createAppSurfaceManager(shell, config = {}, options = {}) {
		const dom = window.PufferDesk.dom;
		const appBadges = window.PufferDesk.apps.badges || {
			createElement() {
				return null;
			},
			getAriaLabel(label) {
				return label || '';
			},
			normalize() {
				return null;
			}
		};
		const apps = Array.isArray(options.apps) ? options.apps : (Array.isArray(config.apps) ? config.apps : []);
		const preserveUnknown = options.preserveUnknown === true;

		function getFolderManager() {
			return options.folderManager || window.PufferDesk.desktopFolderManager || null;
		}

		function getDesktopIconManager() {
			return options.desktopIconManager || window.PufferDesk.desktopIconManager || null;
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
					const fixedLocation = getFixedAppLocation(app);
					normalized[app.id] = normalizeFixedLocationForShell(fixedLocation, hasLauncher);
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
				const fixedLocation = getFixedAppLocation(app);

				return fixedLocation === 'both' || fixedLocation === surface;
			}

			const location = app && app.id ? locations[app.id] || 'dock' : 'dock';

			return location === 'both' || location === surface;
		}

		function isFixedDockApp(app) {
			return Boolean(app && app.dock && typeof app.dock === 'object' && app.dock.fixed === true);
		}

		function getFixedAppLocation(app) {
			const fixedLocations = config.shellChrome && typeof config.shellChrome === 'object' && config.shellChrome.fixed_app_locations
				? config.shellChrome.fixed_app_locations
				: {};
			const location = app && app.id && typeof fixedLocations[app.id] === 'string'
				? fixedLocations[app.id]
				: 'dock';

			return ['dock', 'desktop', 'both', 'hidden'].includes(location) ? location : 'dock';
		}

		function normalizeFixedLocationForShell(location, hasLauncher) {
			if (hasLauncher) {
				return location;
			}

			if (location === 'both') {
				return 'desktop';
			}

			return location === 'dock' ? 'hidden' : location;
		}

		function launcherShowsSeparator() {
			return !(config.shellChrome && typeof config.shellChrome === 'object' && config.shellChrome.launcher_separator === false);
		}

		function getAppLabel(app) {
			return app.label || app.id;
		}

		function getDesktopIconLabelOverride(appId) {
			const workspaceState = config.workspaceState && typeof config.workspaceState === 'object' ? config.workspaceState : {};
			const icons = Array.isArray(workspaceState.desktopIcons) ? workspaceState.desktopIcons : [];
			const icon = icons.find((item) => item && item.id === `app:${appId}` && typeof item.label === 'string' && item.label.trim());

			return icon ? icon.label.trim() : '';
		}

		function createDockSeparator() {
			const separator = dom.createElement('span', 'pdk-dock-separator');
			separator.setAttribute('aria-hidden', 'true');

			return separator;
		}

		function getDockEndAnchor(dock) {
			return dock
				? dock.querySelector('[data-pdk-launcher-end-anchor]') || dock.querySelector('.pdk-dock-minimized-windows')
				: null;
		}

		function createDockAppButton(app, options = {}) {
			const button = document.createElement('button');
			const label = getAppLabel(app);
			const tooltip = dom.createElement('span', 'pdk-dock-tooltip', label);
			const screenReaderText = dom.createElement('span', 'screen-reader-text', label);
			const badge = appBadges.createElement(app);
			const fixed = options.fixed === true || isFixedDockApp(app);

			button.type = 'button';
			button.className = fixed ? 'pdk-dock-item pdk-dock-fixed-item' : 'pdk-dock-item';
			button.dataset.pdkContext = 'dock-app';
			button.dataset.pdkContextId = app.id;
			button.dataset.pdkContextLabel = label;
			button.dataset.pdkDockTooltip = label;
			button.dataset.pdkOpenApp = app.id;
			if (fixed) {
				button.dataset.pdkDockFixed = app.dock && app.dock.placement ? app.dock.placement : 'end';
			}
			button.draggable = false;
			button.setAttribute('aria-label', appBadges.getAriaLabel(label, app));
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
			const icon = dom.createElement('span', 'pdk-app-icon');
			const defaultLabel = getAppLabel(app);
			const labelOverride = getDesktopIconLabelOverride(app.id);
			const label = labelOverride || defaultLabel;
			const badgeInfo = appBadges.normalize(app);
			const badge = appBadges.createElement(badgeInfo);
			const labelElement = dom.createElement('span', 'pdk-desktop-app-label', label);

			button.type = 'button';
			button.className = 'pdk-desktop-icon pdk-desktop-app';
			button.dataset.pdkContext = 'desktop-app';
			button.dataset.pdkContextId = app.id;
			button.dataset.pdkContextLabel = label;
			button.dataset.pdkDesktopIcon = '';
			button.dataset.pdkDesktopIconDefaultLabel = defaultLabel;
			button.dataset.pdkDesktopIconId = `app:${app.id}`;
			button.dataset.pdkDesktopIconKind = 'app';
			button.dataset.pdkOpenApp = app.id;
			if (labelOverride) {
				button.dataset.pdkDesktopIconLabelOverride = '1';
			}
			button.setAttribute('aria-label', appBadges.getAriaLabel(label, badgeInfo));
			icon.appendChild(dom.createIcon(app.icon || 'dashicons-admin-generic'));
			if (badge) {
				icon.appendChild(badge);
			}
			button.append(icon, labelElement);

			return button;
		}

		function syncRunningDockItems() {
			runningState.syncDock(shell);
		}

		if (window.PufferDesk.events && typeof window.PufferDesk.events.on === 'function') {
			window.PufferDesk.events.on('app:running-state-changed', syncRunningDockItems);
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
			const dock = shell.querySelector('.pdk-dock');

			if (dock) {
				const minimizedWindows = dock.querySelector('.pdk-dock-minimized-windows');
				const dockEndAnchor = getDockEndAnchor(dock);
				const dockApps = apps.filter((app) => appIsShownIn(app, 'dock', normalizedLocations));
				const fixedDockApps = dockApps.filter(isFixedDockApp);
				const regularDockApps = dockApps.filter((app) => !isFixedDockApp(app));
				const orderedDockApps = window.PufferDesk.desktopDock && typeof window.PufferDesk.desktopDock.orderApps === 'function'
					? window.PufferDesk.desktopDock.orderApps(regularDockApps, config)
					: regularDockApps;

				Array.from(dock.children).forEach((child) => {
					if (child.classList && (child.classList.contains('pdk-dock-item') || child.classList.contains('pdk-dock-separator'))) {
						child.remove();
					}
				});
				orderedDockApps.forEach((app) => {
					dock.insertBefore(createDockAppButton(app), minimizedWindows || dockEndAnchor || null);
				});
				if (fixedDockApps.length) {
					if (launcherShowsSeparator()) {
						dock.insertBefore(createDockSeparator(), minimizedWindows || dockEndAnchor || null);
					}
					fixedDockApps.forEach((app) => {
						dock.insertBefore(createDockAppButton(app, {
							fixed: true
						}), dockEndAnchor || null);
					});
				}
				syncRunningDockItems();
			}

			const desktop = shell.querySelector('.pdk-desktop');
			if (!desktop) {
				return;
			}

			let layer = desktop.querySelector('.pdk-desktop-apps');
			const desktopApps = apps.filter((app) => appIsShownIn(app, 'desktop', normalizedLocations));

			if (!desktopApps.length) {
				if (layer) {
					layer.remove();
				}
				syncDesktopManagers();
				return;
			}

			if (!layer) {
				layer = dom.createElement('section', 'pdk-desktop-apps pdk-desktop-icon-layer');
				layer.setAttribute('aria-label', 'Desktop apps');
				const folderLayer = desktop.querySelector('.pdk-desktop-folders');
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
