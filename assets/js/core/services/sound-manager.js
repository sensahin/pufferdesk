(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.services = window.PufferDesk.services || {};

	const defaultNotificationEvents = Object.freeze({
		default: 'notification.default',
		types: Object.freeze({
			error: 'notification.error',
			info: 'notification.info',
			success: '',
			warning: 'notification.warning'
		})
	});

	function normalizeNumber(value, fallback, min, max) {
		const number = Number.parseFloat(value);

		if (!Number.isFinite(number)) {
			return fallback;
		}

		return Math.max(min, Math.min(max, number));
	}

	function normalizeEventId(value) {
		return String(value || '')
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9_.:-]+/g, '');
	}

	function normalizeNotificationType(value) {
		return String(value || '')
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9_-]+/g, '');
	}

	function normalizeNotificationEvents(soundConfig = {}) {
		const rawMap = soundConfig.notificationEvents && typeof soundConfig.notificationEvents === 'object'
			? soundConfig.notificationEvents
			: (soundConfig.notification_events && typeof soundConfig.notification_events === 'object' ? soundConfig.notification_events : {});
		const rawTypes = rawMap.types && typeof rawMap.types === 'object' ? rawMap.types : {};
		const types = Object.assign({}, defaultNotificationEvents.types);
		const defaultEvent = normalizeEventId(rawMap.default) || defaultNotificationEvents.default;

		Object.keys(rawTypes).forEach((type) => {
			const normalizedType = normalizeNotificationType(type);

			if (!normalizedType) {
				return;
			}

			types[normalizedType] = rawTypes[type] === '' ? '' : (normalizeEventId(rawTypes[type]) || types[normalizedType] || defaultEvent);
		});

		return {
			default: defaultEvent,
			types
		};
	}

	function normalizeEventIds(soundConfig = {}) {
		const rawIds = soundConfig.eventIds && typeof soundConfig.eventIds === 'object'
			? soundConfig.eventIds
			: (soundConfig.event_ids && typeof soundConfig.event_ids === 'object' ? soundConfig.event_ids : {});
		const eventIds = {};

		Object.keys(rawIds).forEach((key) => {
			const eventId = normalizeEventId(rawIds[key]);

			if (eventId) {
				eventIds[key] = eventId;
			}
		});

		return eventIds;
	}

	function normalizeSource(source) {
		if (typeof source === 'string') {
			return {
				playbackRate: 1,
				src: source,
				volume: 0.35
			};
		}

		if (!source || typeof source !== 'object') {
			return null;
		}

		const src = typeof source.src === 'string' ? source.src.trim() : '';
		if (!src) {
			return null;
		}

		return {
			playbackRate: normalizeNumber(source.playbackRate, 1, 0.5, 2),
			src,
			volume: normalizeNumber(source.volume, 0.35, 0, 1)
		};
	}

	function normalizeConfig(config = {}) {
		const soundConfig = config.sounds && typeof config.sounds === 'object' ? config.sounds : {};
		const rawEvents = soundConfig.events && typeof soundConfig.events === 'object' ? soundConfig.events : {};
		const rateLimitValue = Object.prototype.hasOwnProperty.call(soundConfig, 'rateLimitMs')
			? soundConfig.rateLimitMs
			: soundConfig.rate_limit_ms;
		const events = {};

		Object.keys(rawEvents).forEach((eventId) => {
			const normalizedId = normalizeEventId(eventId);
			const source = normalizeSource(rawEvents[eventId]);

			if (normalizedId && source) {
				events[normalizedId] = source;
			}
		});

		return {
			enabled: soundConfig.enabled !== false,
			eventIds: normalizeEventIds(soundConfig),
			events,
			notificationEvents: normalizeNotificationEvents(soundConfig),
			preferences: normalizePreferences(soundConfig.preferences || {}),
			rateLimitMs: Math.round(normalizeNumber(rateLimitValue, 700, 0, 5000))
		};
	}

	function normalizePreferences(preferences = {}) {
		const volume = Number.parseInt(preferences.volume, 10);

		return {
			enabled: normalizeBoolean(preferences.enabled, true),
			volume: Number.isFinite(volume) ? Math.max(0, Math.min(100, volume)) : 70
		};
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
		if (preferences && Object.prototype.hasOwnProperty.call(preferences, snakeKey)) {
			return preferences[snakeKey];
		}

		if (preferences && Object.prototype.hasOwnProperty.call(preferences, camelKey)) {
			return preferences[camelKey];
		}

		return undefined;
	}

	function getNotificationEvent(notification = {}, eventMap = defaultNotificationEvents) {
		const type = typeof notification.type === 'string' ? notification.type : '';
		const normalizedType = normalizeNotificationType(type);
		const types = eventMap && eventMap.types && typeof eventMap.types === 'object' ? eventMap.types : defaultNotificationEvents.types;

		if (normalizedType && Object.prototype.hasOwnProperty.call(types, normalizedType)) {
			return types[normalizedType];
		}

		return eventMap && typeof eventMap.default === 'string' ? eventMap.default : defaultNotificationEvents.default;
	}

	function getRuntimeConfig() {
		return window.PufferDesk.config && typeof window.PufferDesk.config.get === 'function'
			? window.PufferDesk.config.get()
			: (window.pufferDesk || {});
	}

	function getRuntimeSoundEventId(key, fallback = '') {
		const config = getRuntimeConfig();
		const soundConfig = config.sounds && typeof config.sounds === 'object' ? config.sounds : {};
		const eventIds = soundConfig.eventIds && typeof soundConfig.eventIds === 'object'
			? soundConfig.eventIds
			: (soundConfig.event_ids && typeof soundConfig.event_ids === 'object' ? soundConfig.event_ids : {});

		return normalizeEventId(eventIds[key]) || normalizeEventId(fallback);
	}

	function getDesktopSoundApi() {
		const api = window.PufferDesk.desktopApi || (window.PufferDesk.desktop && window.PufferDesk.desktop.api) || null;

		return api && api.sounds && typeof api.sounds.play === 'function' ? api.sounds : null;
	}

	function playRuntimeSoundEvent(key, fallback = '', options = {}) {
		const eventId = getRuntimeSoundEventId(key, fallback);
		const api = getDesktopSoundApi();

		if (!eventId) {
			return false;
		}

		if (api) {
			return api.play(eventId, options);
		}

		return window.PufferDesk.sound && typeof window.PufferDesk.sound.play === 'function'
			? window.PufferDesk.sound.play(eventId, options)
			: false;
	}

	function createSoundManager(config = {}) {
		let soundConfig = normalizeConfig(config);
		const audioCache = new Map();
		const lastPlayedAt = new Map();
		let unlocked = false;

		function emitPreferencesChanged(source = 'sound-manager') {
			const events = window.PufferDesk.events || null;

			if (events && typeof events.emit === 'function') {
				events.emit('sounds:preferencesChanged', {
					preferences: getPreferences(),
					source
				});
			}
		}

		function unlock() {
			unlocked = true;
		}

		function bindUnlock() {
			if (typeof document === 'undefined' || !document.addEventListener) {
				unlock();
				return;
			}

			['pointerdown', 'keydown', 'touchstart'].forEach((eventName) => {
				document.addEventListener(eventName, unlock, {
					capture: true,
					once: true,
					passive: true
				});
			});
		}

		function getAudio(source) {
			if (!source || !source.src || typeof window.Audio !== 'function') {
				return null;
			}

			if (!audioCache.has(source.src)) {
				try {
					const audio = new window.Audio(source.src);
					audio.preload = 'auto';
					audioCache.set(source.src, audio);
				} catch (error) {
					return null;
				}
			}

			return audioCache.get(source.src);
		}

		function play(eventName, context = {}) {
			const eventId = normalizeEventId(eventName);
			const source = eventId ? soundConfig.events[eventId] || null : null;
			const now = Date.now();
			const lastPlayed = lastPlayedAt.get(eventId) || 0;
			const audio = getAudio(source);

			if (
				!soundConfig.enabled
				|| !soundConfig.preferences.enabled
				|| !unlocked
				|| !eventId
				|| !source
				|| !audio
				|| (soundConfig.rateLimitMs > 0 && now - lastPlayed < soundConfig.rateLimitMs)
			) {
				return false;
			}

			lastPlayedAt.set(eventId, now);
			audio.volume = normalizeNumber(context.volume, source.volume, 0, 1) * (soundConfig.preferences.volume / 100);
			audio.playbackRate = normalizeNumber(context.playbackRate, source.playbackRate, 0.5, 2);
			try {
				audio.currentTime = 0;
			} catch (error) {}

			const result = audio.play();
			if (result && typeof result.catch === 'function') {
				result.catch(() => {});
			}

			return true;
		}

		function playNotification(notification = {}, preferences = {}) {
			if (
				!normalizeBoolean(preferences.enabled, true)
				|| !normalizeBoolean(readPreference(preferences, 'play_sound', 'playSound'), false)
				|| normalizeBoolean(readPreference(preferences, 'quiet_mode', 'quietMode'), false)
			) {
				return false;
			}

			return play(getNotificationEvent(notification, soundConfig.notificationEvents), {
				notification
			});
		}

		function getPreferences() {
			return Object.assign({}, soundConfig.preferences);
		}

		function setPreferences(preferences = {}, options = {}) {
			soundConfig = Object.assign({}, soundConfig, {
				preferences: normalizePreferences(preferences)
			});

			if (!options || options.silent !== true) {
				emitPreferencesChanged(options && options.source ? options.source : 'sound-manager');
			}
		}

		bindUnlock();

		return Object.freeze({
			canPlay(eventName) {
				const eventId = normalizeEventId(eventName);

				return Boolean(soundConfig.enabled && soundConfig.preferences.enabled && eventId && soundConfig.events[eventId]);
			},
			getEventId(key, fallback = '') {
				return normalizeEventId(soundConfig.eventIds[key]) || normalizeEventId(fallback);
			},
			getPreferences,
			isUnlocked() {
				return unlocked;
			},
			play,
			playNotification,
			setPreferences,
			unlock
		});
	}

	window.PufferDesk.services.createSoundManager = createSoundManager;
	window.PufferDesk.services.normalizeSoundPreferences = normalizePreferences;
	window.PufferDesk.services.soundEvents = Object.freeze({
		getEventId: getRuntimeSoundEventId,
		play: playRuntimeSoundEvent
	});
})();
