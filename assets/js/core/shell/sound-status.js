(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.shell = window.PufferDesk.shell || {};

	function clamp(value, min, max) {
		return Math.max(min, Math.min(max, value));
	}

	function normalizePreferences(preferences = {}) {
		if (window.PufferDesk.services && typeof window.PufferDesk.services.normalizeSoundPreferences === 'function') {
			return window.PufferDesk.services.normalizeSoundPreferences(preferences);
		}

		const volume = Number.parseInt(preferences.volume, 10);

		return {
			enabled: preferences.enabled !== false,
			volume: Number.isFinite(volume) ? clamp(volume, 0, 100) : 70
		};
	}

	window.PufferDesk.shell.createSoundStatus = function createSoundStatus(shell, config = {}, context = {}) {
		const dom = window.PufferDesk.dom;
		const api = context.apiClient || (window.PufferDesk.services ? window.PufferDesk.services.api : null);
		const events = context.events || window.PufferDesk.events || null;
		const eventNames = events && events.names ? events.names : {};
		const commandIds = (window.PufferDesk.shell && window.PufferDesk.shell.commands) || {};
		const contextTargets = window.PufferDesk.shell && window.PufferDesk.shell.contextMenuConstants
			? window.PufferDesk.shell.contextMenuConstants.targets || {}
			: {};
		const createDebouncedTask = window.PufferDesk.services && window.PufferDesk.services.createDebouncedTask
			? window.PufferDesk.services.createDebouncedTask
			: null;
		const soundConfig = config.sounds && typeof config.sounds === 'object' ? config.sounds : {};
		const settingsLabels = config.settings && config.settings.labels && typeof config.settings.labels === 'object'
			? config.settings.labels
			: {};
		const soundLabels = settingsLabels.sounds && typeof settingsLabels.sounds === 'object' ? settingsLabels.sounds : {};
		const statusLabels = soundLabels.status && typeof soundLabels.status === 'object' ? soundLabels.status : {};
		const getSettingAction = window.PufferDesk.config.getSettingAction.bind(window.PufferDesk.config);
		const transientSurfaces = window.PufferDesk.shell && window.PufferDesk.shell.transientSurfaces
			? window.PufferDesk.shell.transientSurfaces
			: null;
		const slots = [];
		let preferences = normalizePreferences(soundConfig.preferences || {});
		let previousVolume = preferences.volume > 0 ? preferences.volume : 70;
		let flyout = null;
		let flyoutRange = null;
		let flyoutValue = null;
		let activeButton = null;
		let pendingPreferences = null;
		let syncingSoundManager = false;
		let fallbackTimer = null;

		function t(key) {
			const value = statusLabels[key];

			return typeof value === 'string' && value ? value : key;
		}

		function formatVolume(value) {
			const template = t('volumeValue');

			if (window.PufferDesk.config && typeof window.PufferDesk.config.formatTemplate === 'function') {
				return window.PufferDesk.config.formatTemplate(template, [value]);
			}

			return template.replace('%d', String(value));
		}

		function getSoundManager() {
			return context.soundManager || window.PufferDesk.sound || null;
		}

		function getDesktopApi() {
			return context.desktopApi || (window.PufferDesk.desktop && window.PufferDesk.desktop.api) || window.PufferDesk.desktopApi || null;
		}

		function getSharedIconUrl(iconName) {
			const media = config.media && typeof config.media === 'object' ? config.media : {};
			const base = typeof media.sharedIconsUrl === 'string' ? media.sharedIconsUrl : '';

			return base ? `${base.replace(/\/?$/, '/')}${encodeURIComponent(iconName)}` : '';
		}

		function getIconName() {
			if (!preferences.enabled || preferences.volume <= 0) {
				return 'volume-off.svg';
			}

			return 'volume.svg';
		}

		function isMuted() {
			return !preferences.enabled || preferences.volume <= 0;
		}

		function getButtonLabel() {
			if (isMuted()) {
				return t('mutedLabel');
			}

			return `${t('buttonLabel')}: ${preferences.volume}%`;
		}

		function setRuntimePreferences(nextPreferences, options = {}) {
			preferences = normalizePreferences(nextPreferences);
			config.sounds = Object.assign({}, soundConfig, {
				preferences
			});

			if (preferences.volume > 0) {
				previousVolume = preferences.volume;
			}

			if (options.syncManager !== false) {
				const soundManager = getSoundManager();

				if (soundManager && typeof soundManager.setPreferences === 'function') {
					syncingSoundManager = true;
					try {
						soundManager.setPreferences(preferences, {
							source: options.source || 'sound-status'
						});
					} finally {
						syncingSoundManager = false;
					}
				}
			}

			updateControls();

			if (options.persist) {
				queueSave();
			}
		}

		function persistPreferences() {
			const savePreferences = pendingPreferences;

			pendingPreferences = null;
			if (!api || typeof api.post !== 'function' || !savePreferences) {
				return Promise.resolve(null);
			}

			return api.post(getSettingAction('SOUNDS'), {
				enabled: savePreferences.enabled ? '1' : '0',
				volume: savePreferences.volume
			}).then((result) => {
				if (!result || !result.success) {
					return null;
				}

				const data = result.data && typeof result.data === 'object' ? result.data : {};

				if (data.sounds) {
					setRuntimePreferences(data.sounds, {
						source: 'sound-status-save',
						syncManager: true
					});
				}

				return data;
			}).catch(() => null);
		}

		const saveTask = createDebouncedTask
			? createDebouncedTask(persistPreferences, { wait: 180 })
			: null;

		function queueSave() {
			pendingPreferences = Object.assign({}, preferences);

			if (saveTask) {
				saveTask.schedule();
				return;
			}

			window.clearTimeout(fallbackTimer);
			fallbackTimer = window.setTimeout(persistPreferences, 180);
		}

		function setIcon(element) {
			const iconUrl = getSharedIconUrl(getIconName());

			if (iconUrl) {
				element.style.setProperty('--pdk-sound-status-icon-url', `url("${iconUrl}")`);
			}
		}

		function updateControls() {
			const label = getButtonLabel();
			const muted = isMuted();

			slots.forEach((entry) => {
				entry.button.setAttribute('aria-label', label);
				entry.button.dataset.pdkSoundState = muted ? 'muted' : 'on';
				entry.button.dataset.pdkSoundVolume = String(preferences.volume);
				setIcon(entry.icon);
			});

			if (flyout) {
				flyout.dataset.pdkSoundState = muted ? 'muted' : 'on';
			}
			if (flyoutRange) {
				flyoutRange.value = String(preferences.volume);
				flyoutRange.setAttribute('aria-valuetext', formatVolume(preferences.volume));
				flyoutRange.style.setProperty('--pdk-sound-volume-fill', `${preferences.volume}%`);
			}
			if (flyoutValue) {
				flyoutValue.textContent = `${preferences.volume}%`;
			}
		}

		function createButton(slot) {
			const button = document.createElement('button');
			const icon = document.createElement('span');
			const screenReaderLabel = document.createElement('span');

			button.type = 'button';
			button.className = 'pdk-sound-status-button';
			button.dataset.pdkContext = contextTargets.SOUND_STATUS;
			button.dataset.pdkContextId = 'sound';
			button.dataset.pdkContextLabel = t('title');
			button.setAttribute('aria-haspopup', 'dialog');
			button.setAttribute('aria-expanded', 'false');
			icon.className = 'pdk-sound-status-icon';
			icon.setAttribute('aria-hidden', 'true');
			screenReaderLabel.className = 'screen-reader-text';
			screenReaderLabel.textContent = t('buttonLabel');
			button.append(icon, screenReaderLabel);
			button.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				toggleFlyout(button);
			});
			slot.replaceChildren(button);
			slots.push({ button, icon, slot });
		}

		function createFlyout() {
			const title = document.createElement('h2');
			const volumeRow = document.createElement('label');
			const volumeText = document.createElement('span');
			const value = document.createElement('span');
			const range = document.createElement('input');
			const settings = document.createElement('button');

			flyout = document.createElement('section');
			flyout.className = 'pdk-sound-flyout';
			flyout.dataset.pdkSoundFlyout = '1';
			flyout.hidden = true;
			flyout.setAttribute('role', 'dialog');
			flyout.setAttribute('aria-label', t('title'));
			title.textContent = t('title');
			title.className = 'pdk-sound-flyout-title';
			volumeRow.className = 'pdk-sound-volume-row';
			volumeText.className = 'pdk-sound-volume-label';
			volumeText.textContent = soundLabels.rows && soundLabels.rows.volume ? soundLabels.rows.volume : t('buttonLabel');
			value.className = 'pdk-sound-volume-value';
			range.type = 'range';
			range.className = 'pdk-sound-volume-slider';
			range.min = '0';
			range.max = '100';
			range.step = '1';
			range.setAttribute('aria-label', volumeText.textContent);
			range.addEventListener('input', () => {
				const volume = clamp(Number.parseInt(range.value, 10) || 0, 0, 100);

				setRuntimePreferences(Object.assign({}, preferences, {
					enabled: volume > 0,
					volume
				}), {
					persist: true,
					source: 'sound-status-slider'
				});
			});
			settings.type = 'button';
			settings.className = 'pdk-sound-settings-button';
			settings.textContent = t('settings');
			settings.addEventListener('click', openSettings);
			const volumeIconUrl = getSharedIconUrl('volume.svg');

			if (volumeIconUrl) {
				flyout.style.setProperty('--pdk-sound-volume-icon-url', `url("${volumeIconUrl}")`);
			}

			volumeRow.append(volumeText, value, range);
			flyout.append(title, volumeRow, settings);
			shell.appendChild(flyout);
			flyoutRange = range;
			flyoutValue = value;
		}

		function ensureFlyout() {
			if (!flyout) {
				createFlyout();
			}

			updateControls();
			return flyout;
		}

		function positionFlyout(button) {
			if (!flyout || !button || typeof button.getBoundingClientRect !== 'function') {
				return;
			}

			const shellRect = shell.getBoundingClientRect();
			const buttonRect = button.getBoundingClientRect();
			const isTaskbar = Boolean(button.closest('.pdk-taskbar-status'));
			const gap = 8;
			const width = flyout.offsetWidth || 260;
			const height = flyout.offsetHeight || 0;
			const left = clamp(
				Math.round(buttonRect.left - shellRect.left + (buttonRect.width / 2) - (width / 2)),
				8,
				Math.max(8, shell.clientWidth - width - 8)
			);
			const preferredTop = isTaskbar
				? buttonRect.top - shellRect.top - height - gap
				: buttonRect.bottom - shellRect.top + gap;
			const top = clamp(
				Math.round(preferredTop),
				8,
				Math.max(8, shell.clientHeight - height - 8)
			);

			flyout.dataset.pdkPlacement = isTaskbar ? 'above' : 'below';
			flyout.style.left = `${left}px`;
			flyout.style.top = `${top}px`;
		}

		function openFlyout(button) {
			const panel = ensureFlyout();

			if (transientSurfaces && typeof transientSurfaces.announce === 'function') {
				transientSurfaces.announce('sound');
			}

			activeButton = button;
			panel.hidden = false;
			slots.forEach((entry) => {
				const expanded = entry.button === button;

				entry.button.classList.toggle('is-active', expanded);
				entry.button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
			});
			positionFlyout(button);
		}

		function closeFlyout() {
			if (flyout) {
				flyout.hidden = true;
			}

			slots.forEach((entry) => {
				entry.button.classList.remove('is-active');
				entry.button.setAttribute('aria-expanded', 'false');
			});
			activeButton = null;
		}

		function toggleFlyout(button) {
			if (flyout && !flyout.hidden && activeButton === button) {
				closeFlyout();
				return;
			}

			openFlyout(button);
		}

		function toggleMute() {
			if (isMuted()) {
				setRuntimePreferences(Object.assign({}, preferences, {
					enabled: true,
					volume: preferences.volume > 0 ? preferences.volume : previousVolume || 70
				}), {
					persist: true,
					source: 'sound-status-toggle'
				});
				return;
			}

			setRuntimePreferences(Object.assign({}, preferences, {
				enabled: false
			}), {
				persist: true,
				source: 'sound-status-toggle'
			});
		}

		function openSettings() {
			const desktopApi = getDesktopApi();

			closeFlyout();
			if (desktopApi && desktopApi.apps && typeof desktopApi.apps.openSettingsPanel === 'function') {
				desktopApi.apps.openSettingsPanel('sounds');
				return true;
			}

			if (window.PufferDesk.menuCommands && typeof window.PufferDesk.menuCommands.execute === 'function') {
				return window.PufferDesk.menuCommands.execute({
					command: commandIds.SETTINGS_OPEN_PANEL,
					label: t('settings'),
					panel: 'sounds'
				}, {
					type: 'sound-status'
				});
			}

			return false;
		}

		function handleOutsidePointer(event) {
			if (!flyout || flyout.hidden) {
				return;
			}

			if (flyout.contains(event.target) || (activeButton && activeButton.contains(event.target))) {
				return;
			}

			closeFlyout();
		}

		function handlePreferenceEvent(event) {
			if (syncingSoundManager) {
				return;
			}

			const detail = event && event.detail ? event.detail : {};

			setRuntimePreferences(detail.preferences || preferences, {
				syncManager: false,
				source: detail.source || 'sound-manager'
			});
		}

		function bind() {
			if (!shell) {
				return;
			}

			Array.from(shell.querySelectorAll('[data-pdk-sound-status]')).forEach(createButton);
			updateControls();
			document.addEventListener('pointerdown', handleOutsidePointer, true);
			document.addEventListener('keydown', (event) => {
				if (event.key === 'Escape') {
					closeFlyout();
				}
			});
			window.addEventListener('resize', () => {
				if (flyout && !flyout.hidden && activeButton) {
					positionFlyout(activeButton);
				}
			});
			if (events && typeof events.on === 'function' && eventNames.SOUNDS_PREFERENCES_CHANGED) {
				events.on(eventNames.SOUNDS_PREFERENCES_CHANGED, handlePreferenceEvent);
			}
			if (transientSurfaces && typeof transientSurfaces.closeOnOther === 'function') {
				transientSurfaces.closeOnOther('sound', closeFlyout);
			}
		}

		return Object.freeze({
			bind,
			close: closeFlyout,
			getPreferences() {
				return Object.assign({}, preferences);
			},
			openSettings,
			setPreferences(preferencesToSet, options = {}) {
				setRuntimePreferences(preferencesToSet, options);
			},
			toggleMute
		});
	};
})();
