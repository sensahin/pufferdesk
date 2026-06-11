(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};

	const actions = {
		loginItems: window.PufferDesk.config.getSettingAction('APP_LOGIN_ITEMS'),
		locations: window.PufferDesk.config.getSettingAction('APP_LOCATIONS')
	};
	const appLocations = window.PufferDesk.config.getContractMap('appLocations', {
		DOCK: 'dock',
		DESKTOP: 'desktop',
		BOTH: 'both',
		HIDDEN: 'hidden'
	});

	window.PufferDesk.apps.createAppPreferenceStore = function createAppPreferenceStore(config = {}, options = {}) {
		const api = options.api || (window.PufferDesk.services ? window.PufferDesk.services.api : null);
		const apps = Array.isArray(options.apps) ? options.apps : (Array.isArray(config.apps) ? config.apps : []);
		const appMap = new Map(apps.map((app) => [app.id, app]));
		const appSurfaceManager = options.appSurfaceManager || null;
		const onLocationsChange = typeof options.onLocationsChange === 'function' ? options.onLocationsChange : null;
		const onLoginItemsChange = typeof options.onLoginItemsChange === 'function' ? options.onLoginItemsChange : null;

		function normalizeLocations(locations = {}) {
			return appSurfaceManager && typeof appSurfaceManager.normalizeLocations === 'function'
				? appSurfaceManager.normalizeLocations(locations)
				: {};
		}

		function getLocations() {
			return normalizeLocations(config.appLocations || {});
		}

		function applyLocations(locations = {}, applyOptions = {}) {
			const normalized = normalizeLocations(locations);

			config.appLocations = normalized;
			if (applyOptions.render !== false && appSurfaceManager && typeof appSurfaceManager.render === 'function') {
				appSurfaceManager.render(normalized);
			}
			if (onLocationsChange) {
				onLocationsChange(normalized);
			}

			return normalized;
		}

		function normalizeLoginItems(items = config.appLoginItems || []) {
			const normalized = [];
			const seen = new Set();

			(Array.isArray(items) ? items : []).forEach((item) => {
				const appId = String(item || '');
				if (!appId || seen.has(appId) || !appMap.has(appId)) {
					return;
				}

				seen.add(appId);
				normalized.push(appId);
			});

			return normalized;
		}

		function getLoginItems() {
			return normalizeLoginItems(config.appLoginItems || []);
		}

		function applyLoginItems(items = []) {
			const normalized = normalizeLoginItems(items);

			config.appLoginItems = normalized.slice();
			if (onLoginItemsChange) {
				onLoginItemsChange(normalized);
			}

			return normalized;
		}

		function getErrorMessage(result, fallback) {
			return result && result.data && result.data.message ? result.data.message : fallback;
		}

		function getSettingsLabel(path) {
			const settings = config.settings && typeof config.settings === 'object' ? config.settings : {};
			const labels = settings.labels && typeof settings.labels === 'object' ? settings.labels : {};
			const value = String(path || '').split('.').reduce((current, key) => (
				current && Object.prototype.hasOwnProperty.call(current, key) ? current[key] : undefined
			), labels);

			return typeof value === 'string' && value ? value : path;
		}

		function getMenuLabel(key) {
			const menu = config.menu && typeof config.menu === 'object' ? config.menu : {};
			const labels = menu.labels && typeof menu.labels === 'object' ? menu.labels : {};
			const value = labels[key];

			return typeof value === 'string' && value ? value : key;
		}

		function formatMenuLabel(key, values = []) {
			if (window.PufferDesk.config && typeof window.PufferDesk.config.formatFromLabels === 'function') {
				const menu = config.menu && typeof config.menu === 'object' ? config.menu : {};
				const labels = menu.labels && typeof menu.labels === 'object' ? menu.labels : {};

				return window.PufferDesk.config.formatFromLabels(labels, key, key, values);
			}

			return getMenuLabel(key);
		}

		function saveLocations(locations = {}, saveOptions = {}) {
			const previous = getLocations();

			applyLocations(locations, saveOptions);

			if (!api || typeof api.post !== 'function') {
				applyLocations(previous, saveOptions);
				return Promise.reject(new Error(saveOptions.errorText || getSettingsLabel('status.appLocationsSaveError')));
			}

			return api.post(actions.locations, {
				locations: JSON.stringify(getLocations())
			}).then((result) => {
				if (!result || !result.success) {
					applyLocations(previous, saveOptions);
					throw new Error(getErrorMessage(result, saveOptions.errorText || getSettingsLabel('status.appLocationsSaveError')));
				}

				const data = result.data && typeof result.data === 'object' ? result.data : {};
				applyLocations(data.appLocations || getLocations(), saveOptions);

				return data;
			}).catch((error) => {
				applyLocations(previous, saveOptions);
				throw error;
			});
		}

		function saveLoginItems(items = [], saveOptions = {}) {
			const previous = getLoginItems();

			applyLoginItems(items);

			if (!api || typeof api.post !== 'function') {
				applyLoginItems(previous);
				return Promise.reject(new Error(saveOptions.errorText || getSettingsLabel('status.loginItemsSaveError')));
			}

			return api.post(actions.loginItems, {
				items: JSON.stringify(getLoginItems())
			}).then((result) => {
				if (!result || !result.success) {
					applyLoginItems(previous);
					throw new Error(getErrorMessage(result, saveOptions.errorText || getSettingsLabel('status.loginItemsSaveError')));
				}

				const data = result.data && typeof result.data === 'object' ? result.data : {};
				applyLoginItems(data.appLoginItems || getLoginItems());

				return data;
			}).catch((error) => {
				applyLoginItems(previous);
				throw error;
			});
		}

		function createLocationsMutationRequest(requestOptions = {}) {
			return Object.assign({}, requestOptions, {
				action: actions.locations,
				payload: () => ({
					locations: JSON.stringify(getLocations())
				}),
				onSuccess(data, result) {
					applyLocations(data.appLocations || getLocations());

					return typeof requestOptions.onSuccess === 'function'
						? requestOptions.onSuccess(data, result)
						: data.message || requestOptions.successText || '';
				}
			});
		}

		function createLoginItemsMutationRequest(requestOptions = {}) {
			return Object.assign({}, requestOptions, {
				action: actions.loginItems,
				payload: () => ({
					items: JSON.stringify(getLoginItems())
				}),
				onSuccess(data, result) {
					applyLoginItems(data.appLoginItems || getLoginItems());

					return typeof requestOptions.onSuccess === 'function'
						? requestOptions.onSuccess(data, result)
						: data.message || requestOptions.successText || '';
				}
			});
		}

		function getLocation(appId, fallback = appLocations.DOCK) {
			const locations = getLocations();

			return locations[appId] || fallback;
		}

		function opensAtLogin(appId) {
			return getLoginItems().includes(appId);
		}

		function isFixedDockApp(appId) {
			const app = appMap.get(appId);

			return Boolean(app && app.dock && typeof app.dock === 'object' && app.dock.fixed === true);
		}

		function setDockPresence(appId, keepInDock, saveOptions = {}) {
			const app = appMap.get(appId);
			const locations = getLocations();
			const current = getLocation(appId);

			if (!app) {
				return Promise.reject(new Error(saveOptions.unavailableText || getMenuLabel('app_unavailable')));
			}

			if (isFixedDockApp(appId)) {
				return Promise.reject(new Error(saveOptions.fixedMessage || formatMenuLabel('fixed_launcher_placement_format', [getMenuLabel('launcher')])));
			}

			if (keepInDock) {
				locations[appId] = current === appLocations.DESKTOP
					? appLocations.BOTH
					: current === appLocations.HIDDEN
						? appLocations.DOCK
						: current;
			} else {
				locations[appId] = current === appLocations.BOTH
					? appLocations.DESKTOP
					: current === appLocations.DOCK
						? appLocations.HIDDEN
						: current;
			}

			return saveLocations(locations, saveOptions);
		}

		function toggleLoginItem(appId, saveOptions = {}) {
			const items = getLoginItems();
			const nextItems = items.includes(appId)
				? items.filter((item) => item !== appId)
				: items.concat(appId);

			return saveLoginItems(nextItems, saveOptions);
		}

		return {
			applyLocations,
			applyLoginItems,
			createLocationsMutationRequest,
			createLoginItemsMutationRequest,
			getLocation,
			getLocations,
			getLoginItems,
			isFixedDockApp,
			normalizeLocations,
			normalizeLoginItems,
			opensAtLogin,
			saveLocations,
			saveLoginItems,
			setDockPresence,
			toggleLoginItem
		};
	};
})();
