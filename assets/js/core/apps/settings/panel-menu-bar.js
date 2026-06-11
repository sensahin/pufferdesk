(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};
	window.PufferDesk.apps.settings = window.PufferDesk.apps.settings || {};

	window.PufferDesk.apps.settings.createMenuBarPanel = function createMenuBarPanel(ctx) {
		const {
			createMenuBarRow,
			createMenuBarSelect,
			createMenuBarToggle,
			createSection,
			status,
			t
		} = ctx;
		const panel = ctx.dom.createElement('div', 'pdk-settings-pane-panel pdk-settings-menu-bar-panel');
		const section = createSection('', 'pdk-settings-list pdk-settings-menu-bar-list');

		panel.dataset.pdkSettingsPanel = 'menu-bar';
		section.appendChild(createMenuBarRow(
			t('menuBar.rows.autoHide'),
			createMenuBarSelect('auto_hide', status)
		));
		section.appendChild(createMenuBarRow(
			t('menuBar.rows.showBackground'),
			createMenuBarToggle('show_background', status)
		));
		section.appendChild(createMenuBarRow(
			t('menuBar.rows.recentCount'),
			createMenuBarSelect('recent_count', status)
		));
		panel.appendChild(section);

		return panel;
	};
})();
