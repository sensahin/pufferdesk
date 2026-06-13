(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};
	window.PufferDesk.apps.settings = window.PufferDesk.apps.settings || {};

	function normalizePreferences(preferences = {}) {
		if (window.PufferDesk.services && typeof window.PufferDesk.services.normalizeSoundPreferences === 'function') {
			return window.PufferDesk.services.normalizeSoundPreferences(preferences);
		}

		const volume = Number.parseInt(preferences.volume, 10);

		return {
			enabled: preferences.enabled !== false,
			volume: Number.isFinite(volume) ? Math.max(0, Math.min(100, volume)) : 70
		};
	}

	window.PufferDesk.apps.settings.createSoundsPanel = function createSoundsPanel(ctx) {
		const {
			createRangeField,
			createSection,
			createSectionHeading,
			dom,
			mutations,
			status,
			t,
			updateRangeFill
		} = ctx;
		const panel = dom.createElement('div', 'pdk-settings-pane-panel pdk-settings-sounds-panel');
		const behaviorSection = createSection('', 'pdk-settings-list pdk-settings-sounds-list');
		const outputSection = createSection('', 'pdk-settings-sound-slider-section');
		const soundConfig = ctx.config.sounds && typeof ctx.config.sounds === 'object' ? ctx.config.sounds : {};
		const events = window.PufferDesk.events || null;
		const eventNames = events && events.names ? events.names : {};
		const dependentControls = [];
		const getSettingAction = window.PufferDesk.config.getSettingAction.bind(window.PufferDesk.config);
		let currentPreferences = normalizePreferences(soundConfig.preferences || {});
		let enabledToggle = null;
		let volumeInput = null;

		panel.dataset.pdkSettingsPanel = 'sounds';

		function setDisabledState(control, disabled) {
			if (!control) {
				return;
			}

			if ('disabled' in control) {
				control.disabled = disabled;
			}
			control.classList.toggle('is-disabled', disabled);
			control.setAttribute('aria-disabled', disabled ? 'true' : 'false');
		}

		function registerDependentControl(row, controls, options = {}) {
			dependentControls.push({
				row,
				controls: Array.isArray(controls) ? controls : [controls],
				unavailable: Boolean(options.unavailable)
			});

			return row;
		}

		function syncDependentControls() {
			const disabled = !currentPreferences.enabled;

			dependentControls.forEach((entry) => {
				const rowDisabled = disabled || entry.unavailable;

				entry.row.classList.toggle('is-disabled', rowDisabled);
				entry.row.setAttribute('aria-disabled', rowDisabled ? 'true' : 'false');
				entry.controls.forEach((control) => setDisabledState(control, rowDisabled));
			});
		}

		function syncControlStates() {
			if (enabledToggle) {
				enabledToggle.setAttribute('aria-pressed', currentPreferences.enabled ? 'true' : 'false');
			}
			if (volumeInput) {
				volumeInput.value = String(currentPreferences.volume);
				updateRangeFill(volumeInput);
			}
			syncDependentControls();
		}

		function syncRuntimePreferences() {
			const api = window.PufferDesk.desktopApi || (window.PufferDesk.desktop && window.PufferDesk.desktop.api) || null;

			ctx.config.sounds = Object.assign({}, soundConfig, {
				preferences: currentPreferences
			});
			if (api && api.sounds && typeof api.sounds.setPreferences === 'function') {
				api.sounds.setPreferences(currentPreferences, { source: 'settings-sounds-panel' });
			} else if (window.PufferDesk.sound && typeof window.PufferDesk.sound.setPreferences === 'function') {
				window.PufferDesk.sound.setPreferences(currentPreferences, { source: 'settings-sounds-panel' });
			}
		}

		const saveSoundsMutation = mutations.createDebounced({
			action: getSettingAction('SOUNDS'),
			errorText: t('status.soundsSaveError'),
			onSuccess(data) {
				currentPreferences = normalizePreferences(data.sounds || currentPreferences);
				syncRuntimePreferences();
				syncControlStates();

				return data.message || t('status.soundsSaved');
			},
			payload: () => ({
				enabled: currentPreferences.enabled ? '1' : '0',
				volume: currentPreferences.volume
			}),
			wait: 180
		});

		function save() {
			syncRuntimePreferences();
			saveSoundsMutation({ status });
		}

		function createToggle(labelText) {
			const button = document.createElement('button');

			button.type = 'button';
			button.className = 'pdk-settings-toggle';
			button.setAttribute('aria-label', labelText);
			button.setAttribute('aria-pressed', currentPreferences.enabled ? 'true' : 'false');
			button.appendChild(dom.createElement('span', 'pdk-settings-toggle-knob'));
			button.addEventListener('click', () => {
				currentPreferences.enabled = !currentPreferences.enabled;
				button.setAttribute('aria-pressed', currentPreferences.enabled ? 'true' : 'false');
				syncDependentControls();
				save();
			});
			enabledToggle = button;

			return button;
		}

		function createRow(labelText, control, descriptionText = '') {
			const row = dom.createElement('div', 'pdk-settings-row pdk-settings-sound-row');
			const labelStack = dom.createElement('span', 'pdk-settings-label-stack');

			labelStack.appendChild(dom.createElement('span', 'pdk-settings-label', labelText));
			if (descriptionText) {
				labelStack.appendChild(dom.createElement('span', 'pdk-settings-description', descriptionText));
			}
			row.append(labelStack, control);

			return row;
		}

		function createVolumeSection() {
			const row = dom.createElement('div', 'pdk-settings-sound-slider-row');
			const range = createRangeField({
				label: t('sounds.rows.volume'),
				labels: [t('sounds.ranges.low'), t('sounds.ranges.high')],
				max: 100,
				min: 0,
				onInput: (value) => {
					currentPreferences.volume = value;
					save();
				},
				value: currentPreferences.volume
			});

			volumeInput = range.input;
			row.appendChild(range.field);

			return registerDependentControl(row, volumeInput);
		}

		behaviorSection.appendChild(createRow(
			t('sounds.rows.enabled'),
			createToggle(t('sounds.rows.enabled'))
		));
		outputSection.appendChild(createVolumeSection());

		if (events && typeof events.on === 'function') {
			events.on(eventNames.SOUNDS_PREFERENCES_CHANGED, (event) => {
				const detail = event && event.detail ? event.detail : {};

				currentPreferences = normalizePreferences(detail.preferences || currentPreferences);
				syncControlStates();
			});
		}

		panel.appendChild(createSectionHeading(t('sounds.headings.behavior')));
		panel.appendChild(behaviorSection);
		panel.appendChild(createSectionHeading(t('sounds.headings.output')));
		panel.appendChild(outputSection);

		syncControlStates();

		return panel;
	};
})();
