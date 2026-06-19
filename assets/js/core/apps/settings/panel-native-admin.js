(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};
	window.PufferDesk.apps.settings = window.PufferDesk.apps.settings || {};

	window.PufferDesk.apps.settings.createNativeAdminPanel = function createNativeAdminPanel(ctx) {
		const panel = ctx.dom.createElement('div', 'pdk-settings-pane-panel pdk-settings-native-admin-panel');
		const section = ctx.createSection('', 'pdk-settings-list pdk-settings-native-admin-list');

		panel.dataset.pdkSettingsPanel = 'native-admin';
		panel.appendChild(ctx.createSectionHeading(ctx.t('nativeAdmin.heading')));
		section.appendChild(ctx.createNativeAdminToggleRow(
			ctx.t('nativeAdmin.usersLabel'),
			'users',
			ctx.status,
			ctx.t('nativeAdmin.usersDescription')
		));
		panel.appendChild(section);

		return panel;
	};
})();
