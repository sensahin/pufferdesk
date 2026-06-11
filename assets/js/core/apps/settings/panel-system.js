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
		const commandIds = (window.PufferDesk.shell && window.PufferDesk.shell.commands) || {};

		panel.dataset.pdkSettingsPanel = 'system';

		section.appendChild(createSettingsActionRow({
			command: commandIds.SHELL_RESTART,
			description: t('system.restartDescription'),
			icon: 'dashicons-update',
			label: t('system.restartLabel'),
			tone: 'gray'
		}));

		if (config.classicUrl) {
			section.appendChild(createSettingsActionRow({
				command: commandIds.SHELL_SWITCH_CLASSIC,
				description: t('system.classicDescription'),
				icon: 'dashicons-admin-site-alt3',
				label: t('system.classicLabel'),
				tone: 'gray'
			}));
		}

		section.appendChild(createSettingsActionRow({
			className: 'pdk-settings-action-danger',
			command: commandIds.SYSTEM_ERASE_CONTENT_SETTINGS,
			description: t('system.eraseDescription'),
			icon: 'dashicons-trash',
			label: t('system.eraseLabel'),
			tone: 'red'
		}));

		panel.appendChild(createSectionHeading(t('system.title')));
		panel.appendChild(section);

		return panel;
	};
})();
