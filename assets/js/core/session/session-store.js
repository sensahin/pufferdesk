(function () {
	'use strict';

	window.WPAdminOS = window.WPAdminOS || {};
	window.WPAdminOS.session = window.WPAdminOS.session || {};

	const stores = {};

	window.WPAdminOS.session.createSessionStore = function createSessionStore(storageKey) {
		const storage = window.WPAdminOS.services.storage;
		const config = window.WPAdminOS.config && typeof window.WPAdminOS.config.get === 'function'
			? window.WPAdminOS.config.get()
			: {};
		const workspace = config.workspace && typeof config.workspace === 'object' ? config.workspace : {};
		const api = window.WPAdminOS.services && window.WPAdminOS.services.api
			? window.WPAdminOS.services.api
			: null;
		const key = storageKey || '';

		if (stores[key]) {
			return stores[key];
		}

		function isObject(value) {
			return value && typeof value === 'object' && !Array.isArray(value);
		}

		function getDefaultSession() {
			return {
				version: Number.parseInt(workspace.version, 10) || 2,
				updatedAt: 0,
				windows: [],
				widgets: [],
				desktopIcons: [],
				desktopSort: {
					mode: 'none'
				},
				recentItems: []
			};
		}

		function clone(value) {
			if (!isObject(value) && !Array.isArray(value)) {
				return value;
			}

			try {
				return JSON.parse(JSON.stringify(value));
			} catch (error) {
				return Array.isArray(value) ? value.slice() : Object.assign({}, value);
			}
		}

		function normalizeSession(session) {
			if (!isObject(session)) {
				return getDefaultSession();
			}

			const defaults = getDefaultSession();
			return Object.assign(defaults, session, {
				version: defaults.version,
				updatedAt: Number.isFinite(Number.parseInt(session.updatedAt, 10)) ? Number.parseInt(session.updatedAt, 10) : 0,
				windows: Array.isArray(session.windows) ? session.windows : [],
				widgets: Array.isArray(session.widgets) ? session.widgets : [],
				desktopIcons: Array.isArray(session.desktopIcons) ? session.desktopIcons : [],
				desktopSort: isObject(session.desktopSort) ? session.desktopSort : defaults.desktopSort,
				recentItems: Array.isArray(session.recentItems) ? session.recentItems : []
			});
		}

		function hasState(session) {
			return Boolean(
				session
				&& (
					(Array.isArray(session.windows) && session.windows.length)
					|| (Array.isArray(session.widgets) && session.widgets.length)
					|| (Array.isArray(session.desktopIcons) && session.desktopIcons.length)
					|| (Array.isArray(session.recentItems) && session.recentItems.length)
					|| (session.desktopSort && session.desktopSort.mode && session.desktopSort.mode !== 'none')
				)
			);
		}

		function getThemeId() {
			return workspace.themeId || (config.theme && config.theme.id) || '';
		}

		function chooseInitialSession() {
			const remote = normalizeSession(config.workspaceState || {});
			const local = normalizeSession(storage.getJSON(key));
			const useLocal = hasState(local) && (!hasState(remote) || local.updatedAt > remote.updatedAt);
			const session = useLocal ? local : remote;

			if (key) {
				storage.setJSON(key, session);
			}

			return {
				needsRemoteSync: useLocal,
				session
			};
		}

		const initial = chooseInitialSession();
		let currentSession = initial.session;
		let saveTimer = null;
		let saveInFlight = false;
		let savePromise = null;
		let savePending = false;

		function updateConfigWorkspaceState(session) {
			config.workspaceState = clone(session);
		}

		function canSyncRemote() {
			return Boolean(
				api
				&& typeof api.post === 'function'
				&& workspace.saveAction
				&& workspace.resetAction
				&& getThemeId()
			);
		}

		function postWorkspaceState(session) {
			if (!canSyncRemote()) {
				return Promise.resolve(false);
			}

			return api.post(workspace.saveAction, {
				theme_id: getThemeId(),
				state: JSON.stringify(session)
			}).then((result) => {
				if (result && result.success && result.data && result.data.workspaceState) {
					currentSession = normalizeSession(result.data.workspaceState);
					updateConfigWorkspaceState(currentSession);
					if (key) {
						storage.setJSON(key, currentSession);
					}
				}

				return Boolean(result && result.success);
			});
		}

		function flushRemoteSave() {
			window.clearTimeout(saveTimer);
			saveTimer = null;

			if (!canSyncRemote()) {
				return Promise.resolve(false);
			}

			if (saveInFlight) {
				savePending = true;
				return savePromise || Promise.resolve(false);
			}

			saveInFlight = true;
			savePromise = postWorkspaceState(currentSession)
				.catch(() => false)
				.finally(() => {
					saveInFlight = false;
					savePromise = null;
					if (savePending) {
						savePending = false;
						return flushRemoteSave();
					}

					return false;
				});

			return savePromise;
		}

		function scheduleRemoteSave() {
			if (!canSyncRemote()) {
				return;
			}

			window.clearTimeout(saveTimer);
			saveTimer = window.setTimeout(flushRemoteSave, 650);
		}

		const store = {
			load() {
				return clone(currentSession);
			},

			save(session) {
				const next = normalizeSession(session);
				next.updatedAt = Date.now();
				currentSession = next;
				updateConfigWorkspaceState(currentSession);

				if (key) {
					storage.setJSON(key, currentSession);
				}
				scheduleRemoteSave();

				return true;
			},

			getSection(section, fallback) {
				const session = this.load();
				return Object.prototype.hasOwnProperty.call(session, section) ? session[section] : fallback;
			},

			saveSection(section, value) {
				const session = this.load();
				session[section] = value;

				return this.save(session);
			},

			clear() {
				window.clearTimeout(saveTimer);
				currentSession = getDefaultSession();
				updateConfigWorkspaceState(currentSession);

				if (key) {
					storage.remove(key);
				}

				const resetRemote = () => api.post(workspace.resetAction, {
					theme_id: getThemeId()
				}).then((result) => Boolean(result && result.success)).catch(() => false);

				if (!canSyncRemote()) {
					return Promise.resolve(false);
				}

				if (savePromise) {
					return savePromise.finally(resetRemote);
				}

				return resetRemote();
			},

			flush() {
				return flushRemoteSave();
			}
		};

		stores[key] = store;
		updateConfigWorkspaceState(currentSession);

		if (initial.needsRemoteSync) {
			scheduleRemoteSave();
		}

		return store;
	};

	window.WPAdminOS.windows = window.WPAdminOS.windows || {};
	window.WPAdminOS.windows.createSessionStore = window.WPAdminOS.session.createSessionStore;
})();
