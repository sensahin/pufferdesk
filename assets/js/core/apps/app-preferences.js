(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};

	const actions = {
		loginItems: 'pufferdesk_save_app_login_items',
		locations: 'pufferdesk_save_app_locations'
	};
	const defaultErrors = {
		loginItems: 'Login items could not be saved.',
		locations: 'App locations could not be saved.'
	};

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

		function saveLocations(locations = {}, saveOptions = {}) {
			const previous = getLocations();

			applyLocations(locations, saveOptions);

			if (!api || typeof api.post !== 'function') {
				applyLocations(previous, saveOptions);
				return Promise.reject(new Error(saveOptions.errorText || defaultErrors.locations));
			}

			return api.post(actions.locations, {
				locations: JSON.stringify(getLocations())
			}).then((result) => {
				if (!result || !result.success) {
					applyLocations(previous, saveOptions);
					throw new Error(getErrorMessage(result, saveOptions.errorText || defaultErrors.locations));
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
				return Promise.reject(new Error(saveOptions.errorText || defaultErrors.loginItems));
			}

			return api.post(actions.loginItems, {
				items: JSON.stringify(getLoginItems())
			}).then((result) => {
				if (!result || !result.success) {
					applyLoginItems(previous);
					throw new Error(getErrorMessage(result, saveOptions.errorText || defaultErrors.loginItems));
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

		function getLocation(appId, fallback = 'dock') {
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
				return Promise.reject(new Error(saveOptions.unavailableText || 'App unavailable.'));
			}

			if (isFixedDockApp(appId)) {
				return Promise.reject(new Error(saveOptions.fixedMessage || 'App has a fixed launcher placement.'));
			}

			if (keepInDock) {
				locations[appId] = current === 'desktop' ? 'both' : current === 'hidden' ? 'dock' : current;
			} else {
				locations[appId] = current === 'both' ? 'desktop' : current === 'dock' ? 'hidden' : current;
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
