(function () {
	'use strict';

	window.WPAdminOS = window.WPAdminOS || {};
	window.WPAdminOS.apps = window.WPAdminOS.apps || {};
	window.WPAdminOS.apps.settings = window.WPAdminOS.apps.settings || {};

	window.WPAdminOS.apps.settings.createSystemPanel = function createSystemPanel(ctx) {
		const {
			createSection,
			createSectionHeading,
			createSettingsActionRow,
			dom,
			t
		} = ctx;
		const panel = dom.createElement('div', 'aos-settings-pane-panel aos-settings-system-panel');
		const section = createSection('', 'aos-settings-list aos-settings-system-list');
		const config = ctx.config || {};

		panel.dataset.aosSettingsPanel = 'system';

		section.appendChild(createSettingsActionRow({
			command: 'shell.restart',
			description: t('system.restartDescription', 'Reload WP adminOS and start a fresh shell session.'),
			icon: 'dashicons-update',
			label: t('system.restartLabel', 'Restart WP adminOS...'),
			tone: 'gray'
		}));

		if (config.classicUrl) {
			section.appendChild(createSettingsActionRow({
				command: 'shell.switch-classic',
				description: t('system.classicDescription', 'Leave the shell and open the standard WordPress admin.'),
				icon: 'dashicons-admin-site-alt3',
				label: t('system.classicLabel', 'Switch to Classic Admin...'),
				tone: 'gray'
			}));
		}

		section.appendChild(createSettingsActionRow({
			className: 'aos-settings-action-danger',
			command: 'system.erase-content-settings',
			description: t('system.eraseDescription', 'Reset WP adminOS preferences, wallpaper, apps, windows, widgets, and layout for this account.'),
			icon: 'dashicons-trash',
			label: t('system.eraseLabel', 'Erase All Content and Settings...'),
			tone: 'red'
		}));

		panel.appendChild(createSectionHeading(t('system.title', 'System')));
		panel.appendChild(section);

		return panel;
	};
})();
