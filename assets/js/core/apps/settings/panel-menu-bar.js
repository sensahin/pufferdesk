(function () {
	'use strict';

	window.WPAdminOS = window.WPAdminOS || {};
	window.WPAdminOS.apps = window.WPAdminOS.apps || {};
	window.WPAdminOS.apps.settings = window.WPAdminOS.apps.settings || {};

	window.WPAdminOS.apps.settings.createMenuBarPanel = function createMenuBarPanel(ctx) {
		const {
			createMenuBarRow,
			createMenuBarSelect,
			createMenuBarToggle,
			createSection,
			status,
			t
		} = ctx;
		const panel = ctx.dom.createElement('div', 'aos-settings-pane-panel aos-settings-menu-bar-panel');
		const section = createSection('', 'aos-settings-list aos-settings-menu-bar-list');

		panel.dataset.aosSettingsPanel = 'menu-bar';
		section.appendChild(createMenuBarRow(
			t('menuBar.rows.autoHide', 'Automatically hide and show the menu bar'),
			createMenuBarSelect('auto_hide', status)
		));
		section.appendChild(createMenuBarRow(
			t('menuBar.rows.showBackground', 'Show menu bar background'),
			createMenuBarToggle('show_background', status)
		));
		section.appendChild(createMenuBarRow(
			t('menuBar.rows.recentCount', 'Recent documents, applications, and servers'),
			createMenuBarSelect('recent_count', status)
		));
		panel.appendChild(section);

		return panel;
	};
})();
