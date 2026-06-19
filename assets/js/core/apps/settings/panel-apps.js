(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};
	window.PufferDesk.apps.settings = window.PufferDesk.apps.settings || {};

	window.PufferDesk.apps.settings.createAppsPanel = function createAppsPanel(ctx) {
		const panel = ctx.dom.createElement('div', 'pdk-settings-pane-panel pdk-settings-apps-panel');

		panel.dataset.pdkSettingsPanel = 'apps';
		panel.appendChild(ctx.createSectionHeading(ctx.t('apps.headings.locations')));
		panel.appendChild(ctx.createAppLocationSection(ctx.status));

		return panel;
	};
})();
