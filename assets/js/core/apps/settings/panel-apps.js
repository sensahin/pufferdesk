(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};
	window.PufferDesk.apps.settings = window.PufferDesk.apps.settings || {};

	window.PufferDesk.apps.settings.createAppsPanel = function createAppsPanel(ctx) {
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
		const panel = dom.createElement('div', 'pdk-settings-pane-panel pdk-settings-apps-panel');
		const section = createSection('', 'pdk-settings-list pdk-settings-apps-list');

		panel.dataset.aosSettingsPanel = 'apps';

		function isFixedLauncherApp(app) {
			return Boolean(app && app.dock && typeof app.dock === 'object' && app.dock.fixed === true);
		}

		function createControls(app) {
			const controls = dom.createElement('span', 'pdk-settings-app-controls');
			const login = dom.createElement('span', 'pdk-settings-app-login-control');

			controls.appendChild(createAppLocationSelect(app, status));
			login.appendChild(dom.createElement('span', 'pdk-settings-app-login-label', t('apps.openAtLoginLabel', 'Open at login')));
			login.appendChild(createAppLoginItemToggle(app, status));
			controls.appendChild(login);

			return controls;
		}

		function createAppRow(app) {
			const row = dom.createElement('div', 'pdk-settings-row pdk-settings-app-row');
			const labelStack = dom.createElement('span', 'pdk-settings-label-stack');

			row.appendChild(createAppLocationIcon(app));
			labelStack.appendChild(dom.createElement('span', 'pdk-settings-label', app.label || app.id));
			if (app.group) {
				labelStack.appendChild(dom.createElement('span', 'pdk-settings-description', app.group));
			}
			row.appendChild(labelStack);

			if (isFixedLauncherApp(app)) {
				row.appendChild(dom.createElement('span', 'pdk-settings-row-value', t('apps.fixedPlacementLabel', 'Fixed')));
			} else {
				row.appendChild(createControls(app));
			}

			return row;
		}

		if (!apps.length) {
			section.appendChild(dom.createElement('p', 'pdk-settings-description', t('apps.emptyLabel', 'No apps are available for this account.')));
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
