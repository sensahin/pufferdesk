(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.session = window.PufferDesk.session || {};

	const stores = {};

	window.PufferDesk.session.createSessionStore = function createSessionStore(storageKey) {
		const storage = window.PufferDesk.services.storage;
		const config = window.PufferDesk.config && typeof window.PufferDesk.config.get === 'function'
			? window.PufferDesk.config.get()
			: {};
		const workspace = config.workspace && typeof config.workspace === 'object' ? config.workspace : {};
		const workspaceContract = window.PufferDesk.session.workspace || {};
		const storageKeys = window.PufferDesk.session.storageKeys || {};
		const workspaceSections = workspaceContract.sections || {};
		const sectionIds = {
			DESKTOP_ICONS: workspaceSections.DESKTOP_ICONS,
			DESKTOP_SORT: workspaceSections.DESKTOP_SORT,
			DOCK_APPS: workspaceSections.DOCK_APPS,
			FOLDER_DISPLAY: workspaceSections.FOLDER_DISPLAY,
			FOLDER_SIDEBAR: workspaceSections.FOLDER_SIDEBAR,
			RECENT_ITEMS: workspaceSections.RECENT_ITEMS,
			SETTINGS_USAGE: workspaceSections.SETTINGS_USAGE || 'settingsUsage',
			STICKY_NOTES: workspaceSections.STICKY_NOTES,
			WIDGETS: workspaceSections.WIDGETS,
			WINDOW_PLACEMENTS: workspaceSections.WINDOW_PLACEMENTS,
			WINDOWS: workspaceSections.WINDOWS
		};
		const domEventNames = window.PufferDesk.events && window.PufferDesk.events.domNames
			? window.PufferDesk.events.domNames
			: {};
		const api = window.PufferDesk.services && window.PufferDesk.services.api
			? window.PufferDesk.services.api
			: null;
		const key = storageKey || '';

		if (stores[key]) {
			return stores[key];
		}

		const instanceId = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
		let channel = null;

		function isObject(value) {
			return value && typeof value === 'object' && !Array.isArray(value);
		}

		function getDefaultSession() {
			const contractDefaults = typeof workspaceContract.getDefaultState === 'function'
				? workspaceContract.getDefaultState()
				: {};
			const fallbackDefaults = {
				version: Number.parseInt(workspace.version, 10) || 2,
				updatedAt: 0,
				[sectionIds.DOCK_APPS]: [],
				[sectionIds.WINDOWS]: [],
				[sectionIds.WINDOW_PLACEMENTS]: {},
				[sectionIds.WIDGETS]: [],
				[sectionIds.STICKY_NOTES]: [],
				[sectionIds.DESKTOP_ICONS]: [],
				[sectionIds.DESKTOP_SORT]: {
					iconSize: 'medium',
					mode: 'none'
				},
				[sectionIds.FOLDER_DISPLAY]: {
					folders: {}
				},
				[sectionIds.FOLDER_SIDEBAR]: {
					collapsed: {},
					favoriteIds: [],
					removedFavoriteIds: []
				},
				[sectionIds.RECENT_ITEMS]: [],
				[sectionIds.SETTINGS_USAGE]: {
					panels: {}
				}
			};
			const defaults = Object.assign({}, fallbackDefaults, isObject(contractDefaults) ? contractDefaults : {});
			const version = Number.parseInt(defaults.version || workspace.version, 10);
			const updatedAt = Number.parseInt(defaults.updatedAt, 10);

			defaults.version = Number.isFinite(version) ? version : fallbackDefaults.version;
			defaults.updatedAt = Number.isFinite(updatedAt) ? Math.max(0, updatedAt) : 0;

			return defaults;
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

		function getUpdatedAt(session) {
			const updatedAt = session && Number.parseInt(session.updatedAt, 10);

			return Number.isFinite(updatedAt) ? Math.max(0, updatedAt) : 0;
		}

		function normalizeSession(session) {
			if (!isObject(session)) {
				return getDefaultSession();
			}

			const defaults = getDefaultSession();
			return Object.assign(defaults, session, {
				version: defaults.version,
				updatedAt: getUpdatedAt(session),
				[sectionIds.DESKTOP_ICONS]: Array.isArray(session[sectionIds.DESKTOP_ICONS]) ? session[sectionIds.DESKTOP_ICONS] : [],
				[sectionIds.DESKTOP_SORT]: isObject(session[sectionIds.DESKTOP_SORT]) ? session[sectionIds.DESKTOP_SORT] : defaults[sectionIds.DESKTOP_SORT],
				[sectionIds.DOCK_APPS]: Array.isArray(session[sectionIds.DOCK_APPS]) ? session[sectionIds.DOCK_APPS] : [],
				[sectionIds.FOLDER_DISPLAY]: isObject(session[sectionIds.FOLDER_DISPLAY]) ? session[sectionIds.FOLDER_DISPLAY] : defaults[sectionIds.FOLDER_DISPLAY],
				[sectionIds.FOLDER_SIDEBAR]: isObject(session[sectionIds.FOLDER_SIDEBAR]) ? session[sectionIds.FOLDER_SIDEBAR] : defaults[sectionIds.FOLDER_SIDEBAR],
				[sectionIds.RECENT_ITEMS]: Array.isArray(session[sectionIds.RECENT_ITEMS]) ? session[sectionIds.RECENT_ITEMS] : [],
				[sectionIds.SETTINGS_USAGE]: isObject(session[sectionIds.SETTINGS_USAGE]) ? session[sectionIds.SETTINGS_USAGE] : defaults[sectionIds.SETTINGS_USAGE],
				[sectionIds.STICKY_NOTES]: Array.isArray(session[sectionIds.STICKY_NOTES]) ? session[sectionIds.STICKY_NOTES] : [],
				[sectionIds.WIDGETS]: Array.isArray(session[sectionIds.WIDGETS]) ? session[sectionIds.WIDGETS] : [],
				[sectionIds.WINDOW_PLACEMENTS]: isObject(session[sectionIds.WINDOW_PLACEMENTS]) ? session[sectionIds.WINDOW_PLACEMENTS] : {},
				[sectionIds.WINDOWS]: Array.isArray(session[sectionIds.WINDOWS]) ? session[sectionIds.WINDOWS] : []
			});
		}

		function getThemeId() {
			return workspace.themeId || (config.theme && config.theme.id) || '';
		}

		function writeLocalCache(session) {
			if (key) {
				storage.setJSON(key, session);
			}
		}

		function updateConfigWorkspaceState(session) {
			config.workspaceState = clone(session);
		}

		function notifySessionChange(source) {
			if (typeof window.CustomEvent !== 'function') {
				return;
			}

			window.dispatchEvent(new window.CustomEvent(domEventNames.WORKSPACE_STATE_CHANGED, {
				detail: {
					source: source || 'local',
					state: clone(currentSession),
					storageKey: key
				}
			}));
		}

		function getBroadcastChannelName() {
			return typeof storageKeys.getWorkspaceBroadcastChannel === 'function'
				? storageKeys.getWorkspaceBroadcastChannel(key)
				: key;
		}

		function broadcastSession(session, source) {
			if (!channel) {
				return;
			}

			try {
				channel.postMessage({
					instanceId,
					session: clone(session),
					source: source || 'local',
					storageKey: key,
					type: 'workspace-state'
				});
			} catch (error) {
				// BroadcastChannel can reject cloned payloads in hardened contexts.
			}
		}

		function applySession(session, options = {}) {
			const next = normalizeSession(session);
			currentSession = next;

			if (options.remote) {
				remoteUpdatedAt = getUpdatedAt(next);
			}

			updateConfigWorkspaceState(currentSession);
			writeLocalCache(currentSession);

			if (options.broadcast) {
				broadcastSession(currentSession, options.source);
			}

			if (options.notify) {
				notifySessionChange(options.source);
			}

			return currentSession;
		}

		function chooseInitialSession() {
			const remote = normalizeSession(config.workspaceState || {});
			const remoteUpdatedAt = getUpdatedAt(remote);
			const cached = key && storage && typeof storage.getJSON === 'function'
				? normalizeSession(storage.getJSON(key))
				: null;

			if (cached && getUpdatedAt(cached) > remoteUpdatedAt) {
				return {
					pendingRemoteSave: true,
					remoteUpdatedAt,
					session: cached
				};
			}

			writeLocalCache(remote);

			return {
				pendingRemoteSave: false,
				remoteUpdatedAt,
				session: remote
			};
		}

		const initialSession = chooseInitialSession();
		let currentSession = initialSession.session;
		let remoteUpdatedAt = initialSession.remoteUpdatedAt;
		let saveTimer = null;
		let saveInFlight = false;
		let savePromise = null;
		let savePending = false;
		let hasUnsavedRemoteChanges = Boolean(initialSession.pendingRemoteSave);

		function acceptBroadcastSession(session, source) {
			const next = normalizeSession(session);
			const nextUpdatedAt = getUpdatedAt(next);
			const currentUpdatedAt = getUpdatedAt(currentSession);
			const isRemote = source === 'remote' || source === 'conflict' || source === 'reset';

			if (source === 'reset') {
				hasUnsavedRemoteChanges = false;
				applySession(next, {
					notify: true,
					remote: true,
					source
				});
				return;
			}

			if (isRemote && nextUpdatedAt < remoteUpdatedAt) {
				return;
			}

			if (nextUpdatedAt < currentUpdatedAt) {
				if (isRemote) {
					remoteUpdatedAt = Math.max(remoteUpdatedAt, nextUpdatedAt);
				}
				return;
			}

			applySession(next, {
				notify: true,
				remote: isRemote,
				source: source || 'broadcast'
			});
			if (isRemote) {
				hasUnsavedRemoteChanges = false;
			}
		}

		function bindBroadcastChannel() {
			if (!key || typeof window.BroadcastChannel !== 'function') {
				return null;
			}

			try {
				const nextChannel = new window.BroadcastChannel(getBroadcastChannelName());
				nextChannel.onmessage = (event) => {
					const message = event && event.data && typeof event.data === 'object' ? event.data : {};
					if (
						message.type !== 'workspace-state'
						|| message.instanceId === instanceId
						|| message.storageKey !== key
					) {
						return;
					}

					acceptBroadcastSession(message.session, message.source);
				};

				return nextChannel;
			} catch (error) {
				return null;
			}
		}

		channel = bindBroadcastChannel();

		function canSyncRemote() {
			return Boolean(
				api
				&& typeof api.post === 'function'
				&& workspace.saveAction
				&& workspace.resetAction
				&& getThemeId()
			);
		}

		function handleRemoteState(serverState, snapshot, source) {
			const normalized = normalizeSession(serverState);
			const snapshotUpdatedAt = getUpdatedAt(snapshot);
			remoteUpdatedAt = getUpdatedAt(normalized);

			if (getUpdatedAt(currentSession) <= snapshotUpdatedAt) {
				hasUnsavedRemoteChanges = false;
				applySession(normalized, {
					broadcast: true,
					notify: source === 'conflict',
					remote: true,
					source
				});
				return;
			}

			savePending = true;
			hasUnsavedRemoteChanges = true;
			writeLocalCache(currentSession);
		}

		function postWorkspaceState(session, expectedUpdatedAt, options = {}) {
			if (!canSyncRemote()) {
				return Promise.resolve(false);
			}

			const snapshot = normalizeSession(session);

			return api.post(workspace.saveAction, {
				expected_updated_at: String(Math.max(0, expectedUpdatedAt || 0)),
				theme_id: getThemeId(),
				state: JSON.stringify(snapshot)
			}, options).then((result) => {
				const data = result && result.data && typeof result.data === 'object' ? result.data : {};
				if (result && result.success && data.workspaceState) {
					handleRemoteState(data.workspaceState, snapshot, 'remote');
					return true;
				}

				if (data.conflict && data.workspaceState) {
					handleRemoteState(data.workspaceState, snapshot, 'conflict');
				}

				return false;
			});
		}

		function flushRemoteSave(options = {}) {
			window.clearTimeout(saveTimer);
			saveTimer = null;

			if (!canSyncRemote()) {
				return Promise.resolve(false);
			}

			if (!hasUnsavedRemoteChanges && !savePending) {
				return Promise.resolve(false);
			}

			if (saveInFlight) {
				savePending = true;
				return savePromise || Promise.resolve(false);
			}

			const snapshot = clone(currentSession);
			const expectedUpdatedAt = remoteUpdatedAt;

			saveInFlight = true;
			savePromise = postWorkspaceState(snapshot, expectedUpdatedAt, options)
				.catch(() => false)
				.finally(() => {
					saveInFlight = false;
					savePromise = null;
					if (savePending) {
						savePending = false;
						return flushRemoteSave(options);
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

		if (hasUnsavedRemoteChanges) {
			scheduleRemoteSave();
		}

		const store = {
			load() {
				return clone(currentSession);
			},

			save(session) {
				const next = normalizeSession(session);
				next.updatedAt = Date.now();
				applySession(next, {
					broadcast: true,
					source: 'local'
				});
				hasUnsavedRemoteChanges = true;
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
				hasUnsavedRemoteChanges = false;
				const next = getDefaultSession();
				applySession(next, {
					broadcast: true,
					source: 'reset'
				});

				const resetRemote = () => api.post(workspace.resetAction, {
					theme_id: getThemeId()
				}).then((result) => {
					if (result && result.success && result.data && result.data.workspaceState) {
						hasUnsavedRemoteChanges = false;
						applySession(result.data.workspaceState, {
							broadcast: true,
							remote: true,
							source: 'reset'
						});
						return true;
					}

					remoteUpdatedAt = 0;
					hasUnsavedRemoteChanges = false;
					return false;
				}).catch(() => false);

				if (!canSyncRemote()) {
					remoteUpdatedAt = 0;
					hasUnsavedRemoteChanges = false;
					return Promise.resolve(false);
				}

				if (savePromise) {
					return savePromise.finally(resetRemote);
				}

				return resetRemote();
			},

			flush(options = {}) {
				return flushRemoteSave(options);
			}
		};

		stores[key] = store;
		updateConfigWorkspaceState(currentSession);

		return store;
	};

	window.PufferDesk.windows = window.PufferDesk.windows || {};
	window.PufferDesk.windows.createSessionStore = window.PufferDesk.session.createSessionStore;
})();
