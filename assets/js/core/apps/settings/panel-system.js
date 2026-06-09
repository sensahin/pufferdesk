(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};
	window.PufferDesk.apps.settings = window.PufferDesk.apps.settings || {};

	window.PufferDesk.apps.settings.createSystemPanel = function createSystemPanel(ctx) {
		const {
			createSection,
			createSectionHeading,
			createSettingsActionRow,
			dom,
			t
		} = ctx;
		const panel = dom.createElement('div', 'pdk-settings-pane-panel pdk-settings-system-panel');
		const section = createSection('', 'pdk-settings-list pdk-settings-system-list');
		const config = ctx.config || {};

		panel.dataset.aosSettingsPanel = 'system';

		section.appendChild(createSettingsActionRow({
			command: 'shell.restart',
			description: t('system.restartDescription', 'Reload PufferDesk and start a fresh shell session.'),
			icon: 'dashicons-update',
			label: t('system.restartLabel', 'Restart PufferDesk...'),
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
			className: 'pdk-settings-action-danger',
			command: 'system.erase-content-settings',
			description: t('system.eraseDescription', 'Reset PufferDesk preferences, wallpaper, apps, windows, widgets, and layout for this account.'),
			icon: 'dashicons-trash',
			label: t('system.eraseLabel', 'Erase All Content and Settings...'),
			tone: 'red'
		}));

		panel.appendChild(createSectionHeading(t('system.title', 'System')));
		panel.appendChild(section);

		return panel;
	};
})();
