(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.notifications = window.PufferDesk.notifications || {};

	const allowedTypes = ['info', 'success', 'warning', 'error'];
	const allowedPriorities = ['low', 'normal', 'high', 'critical'];
	const allowedSeverity = ['all', 'warnings', 'critical'];
	const defaultSources = {
		apps: true,
		comments: true,
		pufferdesk: true,
		site_health: true,
		wordpress_updates: true
	};

	function sanitizeId(value) {
		return String(value || '')
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9_-]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	function uniqueId(source, title, message) {
		return `${sanitizeId(source) || 'notification'}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}-${sanitizeId(title || message).slice(0, 28)}`;
	}

	function normalizeBoolean(value, fallback = false) {
		if (typeof value === 'boolean') {
			return value;
		}

		if (typeof value === 'number') {
			return value === 1;
		}

		if (typeof value === 'string') {
			return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
		}

		return fallback;
	}

	function readPreference(preferences, snakeKey, camelKey) {
		if (Object.prototype.hasOwnProperty.call(preferences, snakeKey)) {
			return preferences[snakeKey];
		}

		if (Object.prototype.hasOwnProperty.call(preferences, camelKey)) {
			return preferences[camelKey];
		}

		return undefined;
	}

	function normalizePreferences(preferences = {}) {
		const sourcePreferences = preferences.sources && typeof preferences.sources === 'object'
			? preferences.sources
			: {};
		const sources = Object.assign({}, defaultSources);

		Object.keys(sources).forEach((source) => {
			if (Object.prototype.hasOwnProperty.call(sourcePreferences, source)) {
				sources[source] = normalizeBoolean(sourcePreferences[source], sources[source]);
			}
		});

		const severity = typeof preferences.severity === 'string' && allowedSeverity.includes(preferences.severity)
			? preferences.severity
			: 'all';
		const historyDays = Number.parseInt(preferences.history_days || preferences.historyDays, 10);

		return {
			enabled: normalizeBoolean(preferences.enabled, true),
			history_days: Number.isFinite(historyDays) ? Math.max(1, Math.min(90, historyDays)) : 30,
			play_sound: normalizeBoolean(readPreference(preferences, 'play_sound', 'playSound'), false),
			quiet_mode: normalizeBoolean(readPreference(preferences, 'quiet_mode', 'quietMode'), false),
			severity,
			show_badges: normalizeBoolean(readPreference(preferences, 'show_badges', 'showBadges'), true),
			show_toasts: normalizeBoolean(readPreference(preferences, 'show_toasts', 'showToasts'), true),
			sources
		};
	}

	function normalizeAction(action = {}) {
		if (!action || typeof action !== 'object' || typeof action.label !== 'string' || !action.label.trim()) {
			return null;
		}

		const normalized = {
			command: typeof action.command === 'string' ? action.command.trim() : '',
			destructive: Boolean(action.destructive),
			icon: typeof action.icon === 'string' ? action.icon.trim() : '',
			label: action.label.trim(),
			payload: action.payload && typeof action.payload === 'object' ? Object.assign({}, action.payload) : {},
			target: typeof action.target === 'string' ? action.target.trim() : '',
			title: typeof action.title === 'string' ? action.title.trim() : '',
			url: typeof action.url === 'string' ? action.url.trim() : ''
		};

		return normalized.command || normalized.url || normalized.target ? normalized : null;
	}

	function normalizeNotification(notification = {}) {
		const source = sanitizeId(notification.source) || 'pufferdesk';
		const title = typeof notification.title === 'string' ? notification.title.trim() : '';
		const message = typeof notification.message === 'string' ? notification.message.trim() : '';
		const type = allowedTypes.includes(notification.type) ? notification.type : 'info';
		const priority = allowedPriorities.includes(notification.priority)
			? notification.priority
			: (type === 'error' ? 'critical' : type === 'warning' ? 'high' : 'normal');
		const id = sanitizeId(notification.id) || uniqueId(source, title, message);
		const timestamp = Number.parseInt(notification.timestamp, 10);

		if (!title && !message) {
			return null;
		}

		return {
			actions: (Array.isArray(notification.actions) ? notification.actions : []).map(normalizeAction).filter(Boolean),
			capability: typeof notification.capability === 'string' && notification.capability ? notification.capability : 'read',
			dismissed: Boolean(notification.dismissed),
			icon: typeof notification.icon === 'string' && notification.icon ? notification.icon : (type === 'error' ? 'dashicons-warning' : 'dashicons-bell'),
			id,
			message,
			persistence: typeof notification.persistence === 'string' && notification.persistence ? notification.persistence : 'session',
			priority,
			read: Boolean(notification.read),
			source,
			sourceLabel: typeof notification.sourceLabel === 'string'
				? notification.sourceLabel
				: (typeof notification.source_label === 'string' ? notification.source_label : source),
			timestamp: Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Math.floor(Date.now() / 1000),
			title,
			toast: Boolean(notification.toast),
			type
		};
	}

	function sourceIsEnabled(notification, preferences) {
		const sources = preferences.sources || defaultSources;

		return sources[notification.source] !== false;
	}

	function passesSeverity(notification, preferences) {
		if (preferences.severity === 'critical') {
			return notification.type === 'error' || notification.priority === 'critical';
		}

		if (preferences.severity === 'warnings') {
			return ['warning', 'error'].includes(notification.type) || ['high', 'critical'].includes(notification.priority);
		}

		return true;
	}

	function canDisplay(notification, preferences) {
		return Boolean(
			preferences.enabled
			&& notification
			&& !notification.dismissed
			&& sourceIsEnabled(notification, preferences)
			&& passesSeverity(notification, preferences)
		);
	}

	function sortNotifications(items) {
		const priorities = {
			critical: 4,
			high: 3,
			normal: 2,
			low: 1
		};

		return items.slice().sort((a, b) => {
			const priorityDelta = (priorities[b.priority] || 0) - (priorities[a.priority] || 0);
			return priorityDelta || (b.timestamp - a.timestamp);
		});
	}

	function createNotificationStore(config = {}) {
		const notificationConfig = config.notifications && typeof config.notifications === 'object'
			? config.notifications
			: {};
		const actions = notificationConfig.actions && typeof notificationConfig.actions === 'object' ? notificationConfig.actions : {};
		const api = window.PufferDesk.services && window.PufferDesk.services.api ? window.PufferDesk.services.api : null;
		const events = window.PufferDesk.events || null;
		const listeners = new Set();
		let preferences = normalizePreferences(notificationConfig.preferences || {});
		let items = sortNotifications((Array.isArray(notificationConfig.items) ? notificationConfig.items : [])
			.map(normalizeNotification)
			.filter((notification) => canDisplay(notification, preferences)));

		function emitChange(extra = {}) {
			const snapshot = getSnapshot();

			listeners.forEach((listener) => listener(snapshot, extra));
			if (events && typeof events.emit === 'function') {
				events.emit('notifications:changed', Object.assign({ notifications: snapshot }, extra));
			}
		}

		function emitToast(notification) {
			if (!shouldToast(notification)) {
				return;
			}

			if (events && typeof events.emit === 'function') {
				events.emit('notifications:toast', { notification });
			}
			listeners.forEach((listener) => listener(getSnapshot(), {
				notification,
				reason: 'toast'
			}));
		}

		function getUnreadCount() {
			return items.filter((notification) => !notification.read && !notification.dismissed).length;
		}

		function getSnapshot() {
			return {
				items: items.slice(),
				preferences: Object.assign({}, preferences, {
					sources: Object.assign({}, preferences.sources)
				}),
				unreadCount: getUnreadCount()
			};
		}

		function updateFromServer(nextConfig = {}) {
			if (nextConfig.preferences) {
				preferences = normalizePreferences(nextConfig.preferences);
			}

			items = sortNotifications((Array.isArray(nextConfig.items) ? nextConfig.items : [])
				.map(normalizeNotification)
				.filter((notification) => canDisplay(notification, preferences)));
			emitChange({ reason: 'server' });
		}

		function post(action, payload = {}) {
			if (!api || typeof api.post !== 'function' || !action) {
				return Promise.resolve(null);
			}

			return api.post(action, payload)
				.then((result) => {
					const nextConfig = result && result.success && result.data && result.data.notifications
						? result.data.notifications
						: null;

					if (nextConfig) {
						updateFromServer(nextConfig);
					}

					return nextConfig;
				})
				.catch((error) => {
					notify({
						message: error && error.message ? error.message : 'Notification service unavailable.',
						source: 'pufferdesk',
						sourceLabel: 'PufferDesk',
						title: 'Notifications could not be updated.',
						toast: true,
						type: 'error'
					}, {
						skipPost: true
					});
					return null;
				});
		}

		function shouldToast(notification) {
			return Boolean(
				notification
				&& notification.toast
				&& preferences.enabled
				&& preferences.show_toasts
				&& !preferences.quiet_mode
				&& sourceIsEnabled(notification, preferences)
				&& passesSeverity(notification, preferences)
			);
		}

		function notify(notification, options = {}) {
			const normalized = normalizeNotification(Object.assign({
				persistence: 'session',
				source: 'pufferdesk',
				toast: true
			}, notification || {}));

			if (!normalized || !canDisplay(normalized, preferences)) {
				return null;
			}

			const existingIndex = items.findIndex((item) => item.id === normalized.id);
			if (existingIndex >= 0) {
				items[existingIndex] = Object.assign({}, items[existingIndex], normalized);
			} else {
				items.unshift(normalized);
			}
			items = sortNotifications(items);
			emitChange({
				notification: normalized,
				reason: options.reason || 'notify'
			});
			emitToast(normalized);

			return normalized;
		}

		function markRead(idOrIds) {
			const ids = Array.isArray(idOrIds) ? idOrIds.map(sanitizeId).filter(Boolean) : [sanitizeId(idOrIds)].filter(Boolean);
			if (!ids.length) {
				return Promise.resolve(null);
			}

			items = items.map((item) => ids.includes(item.id) ? Object.assign({}, item, { read: true }) : item);
			emitChange({ reason: 'mark-read' });

			return post(actions.markRead, {
				ids: JSON.stringify(ids)
			});
		}

		function markAllRead() {
			items = items.map((item) => Object.assign({}, item, { read: true }));
			emitChange({ reason: 'mark-all-read' });

			return post(actions.markAllRead);
		}

		function dismiss(idOrIds) {
			const ids = Array.isArray(idOrIds) ? idOrIds.map(sanitizeId).filter(Boolean) : [sanitizeId(idOrIds)].filter(Boolean);
			if (!ids.length) {
				return Promise.resolve(null);
			}

			items = items.filter((item) => !ids.includes(item.id));
			emitChange({ reason: 'dismiss' });

			return post(actions.dismiss, {
				ids: JSON.stringify(ids)
			});
		}

		function refresh() {
			return post(actions.refresh);
		}

		function setPreferences(nextPreferences = {}) {
			preferences = normalizePreferences(nextPreferences);
			items = sortNotifications(items.filter((notification) => canDisplay(notification, preferences)));
			emitChange({ reason: 'preferences' });
		}

		function onChange(listener) {
			if (typeof listener !== 'function') {
				return () => {};
			}

			listeners.add(listener);
			return () => listeners.delete(listener);
		}

		function bindSystemNotifications() {
			window.addEventListener('error', (event) => {
				if (!event || !event.message) {
					return;
				}

				notify({
					message: event.filename ? `${event.filename}:${event.lineno || 0}` : '',
					source: 'pufferdesk',
					sourceLabel: 'PufferDesk',
					title: event.message,
					toast: true,
					type: 'error'
				});
			});

			window.addEventListener('unhandledrejection', (event) => {
				const reason = event && event.reason ? event.reason : null;
				const message = reason && reason.message ? reason.message : String(reason || 'Unexpected runtime error.');

				notify({
					message,
					source: 'pufferdesk',
					sourceLabel: 'PufferDesk',
					title: 'A PufferDesk action failed.',
					toast: true,
					type: 'error'
				});
			});
		}

		return {
			bindSystemNotifications,
			dismiss,
			getItems() {
				return items.slice();
			},
			getPreferences() {
				return getSnapshot().preferences;
			},
			getSnapshot,
			getUnreadCount,
			markAllRead,
			markRead,
			notify,
			onChange,
			refresh,
			setPreferences,
			updateFromServer
		};
	}

	window.PufferDesk.notifications.createStore = createNotificationStore;
	window.PufferDesk.notifications.normalizePreferences = normalizePreferences;
})();
