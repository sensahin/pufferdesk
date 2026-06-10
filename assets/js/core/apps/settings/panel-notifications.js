(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};
	window.PufferDesk.apps.settings = window.PufferDesk.apps.settings || {};

	const sourceOrder = ['wordpress_updates', 'comments', 'site_health', 'pufferdesk', 'apps'];

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
		let currentPreferences = normalizePreferences(notificationConfig.preferences || {});

		panel.dataset.pdkSettingsPanel = 'notifications';

		function syncRuntimePreferences() {
			if (window.PufferDesk.notificationStore && typeof window.PufferDesk.notificationStore.setPreferences === 'function') {
				window.PufferDesk.notificationStore.setPreferences(currentPreferences);
			}
			ctx.config.notifications = Object.assign({}, notificationConfig, {
				preferences: currentPreferences
			});
		}

		const saveNotificationsMutation = mutations.createDebounced({
			action: 'pufferdesk_save_notifications',
			errorText: t('status.notificationsSaveError', 'Notifications could not be saved.'),
			onSuccess(data) {
				currentPreferences = normalizePreferences(data.notifications || currentPreferences);
				syncRuntimePreferences();

				return data.message || t('status.notificationsSaved', 'Notifications saved.');
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
			button.addEventListener('click', () => {
				currentPreferences[key] = !currentPreferences[key];
				button.setAttribute('aria-pressed', currentPreferences[key] ? 'true' : 'false');
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
			button.addEventListener('click', () => {
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

		function createSelectRow(key, labelText, optionsPath) {
			const { select, wrap } = createInlineSelect({
				options: ctx.settingsLabels.getOptions(optionsPath),
				value: String(currentPreferences[key]),
				onChange: (value, control) => {
					currentPreferences[key] = key === 'history_days' ? Number.parseInt(value, 10) || 30 : value;
					control.blur();
					save();
				}
			});

			return createRow(labelText, wrap);
		}

		behaviorSection.appendChild(createRow(
			t('notifications.rows.enabled', 'Enable notifications'),
			createToggle('enabled', t('notifications.rows.enabled', 'Enable notifications'))
		));
		behaviorSection.appendChild(createRow(
			t('notifications.rows.showBadges', 'Show notification badges'),
			createToggle('show_badges', t('notifications.rows.showBadges', 'Show notification badges'))
		));
		behaviorSection.appendChild(createRow(
			t('notifications.rows.showToasts', 'Show notification banners'),
			createToggle('show_toasts', t('notifications.rows.showToasts', 'Show notification banners'))
		));
		behaviorSection.appendChild(createRow(
			t('notifications.rows.quietMode', 'Quiet mode'),
			createToggle('quiet_mode', t('notifications.rows.quietMode', 'Quiet mode')),
			t('notifications.rows.quietModeDescription', 'Keep notifications in Notification Center without showing banners.')
		));
		behaviorSection.appendChild(createRow(
			t('notifications.rows.playSound', 'Play sound'),
			createToggle('play_sound', t('notifications.rows.playSound', 'Play sound'))
		));
		behaviorSection.appendChild(createSelectRow(
			'severity',
			t('notifications.rows.severity', 'Show'),
			'notifications.severityOptions'
		));
		behaviorSection.appendChild(createSelectRow(
			'history_days',
			t('notifications.rows.historyDays', 'Keep history'),
			'notifications.historyOptions'
		));

		sourceOrder.forEach((source) => {
			sourcesSection.appendChild(createRow(
				t(`notifications.sourceLabels.${source}`, source),
				createSourceToggle(source)
			));
		});

		panel.appendChild(createSectionHeading(t('notifications.title', 'Notifications')));
		panel.appendChild(dom.createElement('p', 'pdk-settings-panel-description', t('notifications.description', 'Choose which WordPress and PufferDesk events appear in Notification Center.')));
		panel.appendChild(createSectionHeading(t('notifications.headings.behavior', 'Behavior')));
		panel.appendChild(behaviorSection);
		panel.appendChild(createSectionHeading(t('notifications.headings.sources', 'Sources')));
		panel.appendChild(sourcesSection);

		return panel;
	};
})();
