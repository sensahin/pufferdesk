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

		const instanceId = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
		let channel = null;

		function isObject(value) {
			return value && typeof value === 'object' && !Array.isArray(value);
		}

		function getDefaultSession() {
			return {
				version: Number.parseInt(workspace.version, 10) || 2,
				updatedAt: 0,
				dockApps: [],
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
				dockApps: Array.isArray(session.dockApps) ? session.dockApps : [],
				windows: Array.isArray(session.windows) ? session.windows : [],
				widgets: Array.isArray(session.widgets) ? session.widgets : [],
				desktopIcons: Array.isArray(session.desktopIcons) ? session.desktopIcons : [],
				desktopSort: isObject(session.desktopSort) ? session.desktopSort : defaults.desktopSort,
				recentItems: Array.isArray(session.recentItems) ? session.recentItems : []
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

			window.dispatchEvent(new window.CustomEvent('wpAdminOS:workspace-state-changed', {
				detail: {
					source: source || 'local',
					state: clone(currentSession),
					storageKey: key
				}
			}));
		}

		function getBroadcastChannelName() {
			return `wpAdminOS:workspace:${key}`;
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
			writeLocalCache(remote);

			return remote;
		}

		let currentSession = chooseInitialSession();
		let remoteUpdatedAt = getUpdatedAt(currentSession);
		let saveTimer = null;
		let saveInFlight = false;
		let savePromise = null;
		let savePending = false;

		function acceptBroadcastSession(session, source) {
			const next = normalizeSession(session);
			const nextUpdatedAt = getUpdatedAt(next);
			const currentUpdatedAt = getUpdatedAt(currentSession);
			const isRemote = source === 'remote' || source === 'conflict' || source === 'reset';

			if (source === 'reset') {
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
				applySession(normalized, {
					broadcast: true,
					notify: source === 'conflict',
					remote: true,
					source
				});
				return;
			}

			savePending = true;
			writeLocalCache(currentSession);
		}

		function postWorkspaceState(session, expectedUpdatedAt) {
			if (!canSyncRemote()) {
				return Promise.resolve(false);
			}

			const snapshot = normalizeSession(session);

			return api.post(workspace.saveAction, {
				expected_updated_at: String(Math.max(0, expectedUpdatedAt || 0)),
				theme_id: getThemeId(),
				state: JSON.stringify(snapshot)
			}).then((result) => {
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

			const snapshot = clone(currentSession);
			const expectedUpdatedAt = remoteUpdatedAt;

			saveInFlight = true;
			savePromise = postWorkspaceState(snapshot, expectedUpdatedAt)
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
				applySession(next, {
					broadcast: true,
					source: 'local'
				});
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
				const next = getDefaultSession();
				applySession(next, {
					broadcast: true,
					source: 'reset'
				});

				const resetRemote = () => api.post(workspace.resetAction, {
					theme_id: getThemeId()
				}).then((result) => {
					if (result && result.success && result.data && result.data.workspaceState) {
						applySession(result.data.workspaceState, {
							broadcast: true,
							remote: true,
							source: 'reset'
						});
						return true;
					}

					remoteUpdatedAt = 0;
					return false;
				}).catch(() => false);

				if (!canSyncRemote()) {
					remoteUpdatedAt = 0;
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

		return store;
	};

	window.WPAdminOS.windows = window.WPAdminOS.windows || {};
	window.WPAdminOS.windows.createSessionStore = window.WPAdminOS.session.createSessionStore;
})();
