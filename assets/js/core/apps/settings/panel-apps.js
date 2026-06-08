(function () {
	'use strict';

	window.WPAdminOS = window.WPAdminOS || {};
	window.WPAdminOS.apps = window.WPAdminOS.apps || {};
	window.WPAdminOS.apps.settings = window.WPAdminOS.apps.settings || {};

	window.WPAdminOS.apps.settings.createAppsPanel = function createAppsPanel(ctx) {
		const {
			createAppLocationIcon,
			createAppLocationSelect,
			createAppLoginItemToggle,
			createSection,
			createSectionHeading,
			dom,
			status,
			t
		} = ctx;
		const apps = Array.isArray(ctx.config.apps) ? ctx.config.apps : [];
		const panel = dom.createElement('div', 'aos-settings-pane-panel aos-settings-apps-panel');
		const section = createSection('', 'aos-settings-list aos-settings-apps-list');

		panel.dataset.aosSettingsPanel = 'apps';

		function isFixedLauncherApp(app) {
			return Boolean(app && app.dock && typeof app.dock === 'object' && app.dock.fixed === true);
		}

		function createControls(app) {
			const controls = dom.createElement('span', 'aos-settings-app-controls');
			const login = dom.createElement('span', 'aos-settings-app-login-control');

			controls.appendChild(createAppLocationSelect(app, status));
			login.appendChild(dom.createElement('span', 'aos-settings-app-login-label', t('apps.openAtLoginLabel', 'Open at login')));
			login.appendChild(createAppLoginItemToggle(app, status));
			controls.appendChild(login);

			return controls;
		}

		function createAppRow(app) {
			const row = dom.createElement('div', 'aos-settings-row aos-settings-app-row');
			const labelStack = dom.createElement('span', 'aos-settings-label-stack');

			row.appendChild(createAppLocationIcon(app));
			labelStack.appendChild(dom.createElement('span', 'aos-settings-label', app.label || app.id));
			if (app.group) {
				labelStack.appendChild(dom.createElement('span', 'aos-settings-description', app.group));
			}
			row.appendChild(labelStack);

			if (isFixedLauncherApp(app)) {
				row.appendChild(dom.createElement('span', 'aos-settings-row-value', t('apps.fixedPlacementLabel', 'Fixed')));
			} else {
				row.appendChild(createControls(app));
			}

			return row;
		}

		if (!apps.length) {
			section.appendChild(dom.createElement('p', 'aos-settings-description', t('apps.emptyLabel', 'No apps are available for this account.')));
		} else {
			apps.forEach((app) => {
				if (app && app.id) {
					section.appendChild(createAppRow(app));
				}
			});
		}

		panel.appendChild(createSectionHeading(t('apps.title', 'Apps')));
		panel.appendChild(section);

		return panel;
	};
})();
