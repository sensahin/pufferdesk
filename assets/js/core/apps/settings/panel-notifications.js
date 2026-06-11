(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};
	window.PufferDesk.apps.settings = window.PufferDesk.apps.settings || {};

	function normalizePreferences(preferences = {}) {
		if (window.PufferDesk.notifications && typeof window.PufferDesk.notifications.normalizePreferences === 'function') {
			return window.PufferDesk.notifications.normalizePreferences(preferences);
		}

		return Object.assign({
			enabled: true,
			history_days: 30,
			play_sound: false,
			quiet_mode: false,
			severity: 'all',
			show_badges: true,
			show_toasts: true,
			sources: {}
		}, preferences || {});
	}

	window.PufferDesk.apps.settings.createNotificationsPanel = function createNotificationsPanel(ctx) {
		const {
			createInlineSelect,
			createSection,
			createSectionHeading,
			dom,
			mutations,
			status,
			t
		} = ctx;
		const panel = dom.createElement('div', 'pdk-settings-pane-panel pdk-settings-notifications-panel');
		const behaviorSection = createSection('', 'pdk-settings-list pdk-settings-notifications-list');
		const sourcesSection = createSection('', 'pdk-settings-list pdk-settings-notifications-list');
		const notificationConfig = ctx.config.notifications && typeof ctx.config.notifications === 'object' ? ctx.config.notifications : {};
		const sourceLabels = t('notifications.sourceLabels', {});
		const sourceOrder = Object.keys(sourceLabels);
		let currentPreferences = normalizePreferences(notificationConfig.preferences || {});
		const dependentControls = [];
		const toggleControls = Object.create(null);
		const sourceControls = Object.create(null);
		const selectControls = Object.create(null);
		const getSettingAction = window.PufferDesk.config.getSettingAction.bind(window.PufferDesk.config);

		panel.dataset.pdkSettingsPanel = 'notifications';

		function isNotificationsEnabled() {
			return currentPreferences.enabled !== false;
		}

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

		function registerDependentControl(row, controls) {
			dependentControls.push({
				row,
				controls: Array.isArray(controls) ? controls : [controls]
			});

			return row;
		}

		function syncDependentControls() {
			const disabled = !isNotificationsEnabled();

			dependentControls.forEach((entry) => {
				entry.row.classList.toggle('is-disabled', disabled);
				entry.row.setAttribute('aria-disabled', disabled ? 'true' : 'false');
				entry.controls.forEach((control) => setDisabledState(control, disabled));
			});
		}

		function syncControlStates() {
			Object.keys(toggleControls).forEach((key) => {
				toggleControls[key].setAttribute('aria-pressed', currentPreferences[key] ? 'true' : 'false');
			});
			Object.keys(sourceControls).forEach((source) => {
				sourceControls[source].setAttribute(
					'aria-pressed',
					currentPreferences.sources && currentPreferences.sources[source] === false ? 'false' : 'true'
				);
			});
			Object.keys(selectControls).forEach((key) => {
				selectControls[key].value = String(currentPreferences[key]);
			});
			syncDependentControls();
		}

		function syncRuntimePreferences() {
			if (window.PufferDesk.notificationStore && typeof window.PufferDesk.notificationStore.setPreferences === 'function') {
				window.PufferDesk.notificationStore.setPreferences(currentPreferences);
			}
			ctx.config.notifications = Object.assign({}, notificationConfig, {
				preferences: currentPreferences
			});
		}

		const saveNotificationsMutation = mutations.createDebounced({
			action: getSettingAction('NOTIFICATIONS'),
			errorText: t('status.notificationsSaveError'),
			onSuccess(data) {
				currentPreferences = normalizePreferences(data.notifications || currentPreferences);
				syncRuntimePreferences();
				syncControlStates();

				return data.message || t('status.notificationsSaved');
			},
			payload: () => ({
				enabled: currentPreferences.enabled ? '1' : '0',
				history_days: currentPreferences.history_days,
				play_sound: currentPreferences.play_sound ? '1' : '0',
				quiet_mode: currentPreferences.quiet_mode ? '1' : '0',
				severity: currentPreferences.severity,
				show_badges: currentPreferences.show_badges ? '1' : '0',
				show_toasts: currentPreferences.show_toasts ? '1' : '0',
				sources: JSON.stringify(currentPreferences.sources || {})
			}),
			wait: 180
		});

		function save() {
			syncRuntimePreferences();
			saveNotificationsMutation({ status });
		}

		function createToggle(key, ariaLabel) {
			const button = document.createElement('button');

			button.type = 'button';
			button.className = 'pdk-settings-toggle';
			button.setAttribute('aria-label', ariaLabel);
			button.setAttribute('aria-pressed', currentPreferences[key] ? 'true' : 'false');
			button.appendChild(dom.createElement('span', 'pdk-settings-toggle-knob'));
			toggleControls[key] = button;
			button.addEventListener('click', () => {
				if (button.disabled) {
					return;
				}
				currentPreferences[key] = !currentPreferences[key];
				button.setAttribute('aria-pressed', currentPreferences[key] ? 'true' : 'false');
				if (key === 'enabled') {
					syncDependentControls();
				}
				save();
			});

			return button;
		}

		function createSourceToggle(source) {
			const button = document.createElement('button');
			const sources = currentPreferences.sources || {};

			button.type = 'button';
			button.className = 'pdk-settings-toggle';
			button.setAttribute('aria-label', t(`notifications.sourceLabels.${source}`, source));
			button.setAttribute('aria-pressed', sources[source] !== false ? 'true' : 'false');
			button.appendChild(dom.createElement('span', 'pdk-settings-toggle-knob'));
			sourceControls[source] = button;
			button.addEventListener('click', () => {
				if (button.disabled) {
					return;
				}
				currentPreferences.sources = Object.assign({}, currentPreferences.sources || {}, {
					[source]: currentPreferences.sources && currentPreferences.sources[source] === false
				});
				button.setAttribute('aria-pressed', currentPreferences.sources[source] !== false ? 'true' : 'false');
				save();
			});

			return button;
		}

		function createRow(labelText, control, description = '') {
			const row = dom.createElement('div', 'pdk-settings-row pdk-settings-notification-row');
			const labelStack = dom.createElement('span', 'pdk-settings-label-stack');

			labelStack.appendChild(dom.createElement('span', 'pdk-settings-label', labelText));
			if (description) {
				labelStack.appendChild(dom.createElement('span', 'pdk-settings-description', description));
			}
			row.append(labelStack, control);

			return row;
		}

		function createToggleRow(key, labelText, description = '', dependent = true) {
			const control = createToggle(key, labelText);
			const row = createRow(labelText, control, description);

			return dependent ? registerDependentControl(row, control) : row;
		}

		function createSelectRow(key, labelText, optionsPath) {
			const { select, wrap } = createInlineSelect({
				options: ctx.settingsLabels.getOptions(optionsPath),
				value: String(currentPreferences[key]),
				onChange: (value, control) => {
					if (control.disabled) {
						return;
					}
					currentPreferences[key] = key === 'history_days' ? Number.parseInt(value, 10) || 30 : value;
					control.blur();
					save();
				}
			});
			const row = createRow(labelText, wrap);

			selectControls[key] = select;

			return registerDependentControl(row, [select, wrap]);
		}

		behaviorSection.appendChild(createToggleRow(
			'enabled',
			t('notifications.rows.enabled'),
			'',
			false
		));
		behaviorSection.appendChild(createToggleRow(
			'show_badges',
			t('notifications.rows.showBadges')
		));
		behaviorSection.appendChild(createToggleRow(
			'show_toasts',
			t('notifications.rows.showToasts')
		));
		behaviorSection.appendChild(createToggleRow(
			'quiet_mode',
			t('notifications.rows.quietMode'),
			t('notifications.rows.quietModeDescription')
		));
		behaviorSection.appendChild(createToggleRow(
			'play_sound',
			t('notifications.rows.playSound')
		));
		behaviorSection.appendChild(createSelectRow(
			'severity',
			t('notifications.rows.severity'),
			'notifications.severityOptions'
		));
		behaviorSection.appendChild(createSelectRow(
			'history_days',
			t('notifications.rows.historyDays'),
			'notifications.historyOptions'
		));

		sourceOrder.forEach((source) => {
			const control = createSourceToggle(source);

			sourcesSection.appendChild(registerDependentControl(createRow(
				t(`notifications.sourceLabels.${source}`, source),
				control
			), control));
		});

		panel.appendChild(createSectionHeading(t('notifications.title')));
		panel.appendChild(dom.createElement('p', 'pdk-settings-panel-description', t('notifications.description')));
		panel.appendChild(createSectionHeading(t('notifications.headings.behavior')));
		panel.appendChild(behaviorSection);
		panel.appendChild(createSectionHeading(t('notifications.headings.sources')));
		panel.appendChild(sourcesSection);

		syncControlStates();

		return panel;
	};
})();
