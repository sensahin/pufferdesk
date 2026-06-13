(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};
	window.PufferDesk.apps.settings = window.PufferDesk.apps.settings || {};

	window.PufferDesk.apps.settings.createWidgetsPanel = function createWidgetsPanel(ctx) {
		const {
			createSettingsRow,
			createSection,
			dom,
			t
		} = ctx;
		const widgets = Array.isArray(ctx.config.widgets) ? ctx.config.widgets : [];
		const panel = dom.createElement('div', 'pdk-settings-pane-panel pdk-settings-widgets-panel');
		const section = createSection('', 'pdk-settings-list pdk-settings-widgets-list');

		panel.dataset.pdkSettingsPanel = 'widgets';

		function getWidgetManager() {
			return window.PufferDesk.widgetManager || null;
		}

		function getStoredWidgetState(widgetId) {
			const state = ctx.config.workspaceState && typeof ctx.config.workspaceState === 'object'
				? ctx.config.workspaceState
				: {};
			const records = Array.isArray(state.widgets) ? state.widgets : [];
			const record = records.find((item) => item && item.id === widgetId);

			return record && record.state && typeof record.state === 'object' ? record.state : {};
		}

		function isWidgetVisible(widgetId) {
			const widgetManager = getWidgetManager();

			if (widgetManager && typeof widgetManager.isWidgetHidden === 'function') {
				return !widgetManager.isWidgetHidden(widgetId);
			}

			return !getStoredWidgetState(widgetId).hidden;
		}

		function setWidgetVisible(widgetId, visible) {
			const widgetManager = getWidgetManager();

			if (!widgetManager) {
				return false;
			}

			if (visible && typeof widgetManager.showWidget === 'function') {
				return widgetManager.showWidget(widgetId);
			}

			if (!visible && typeof widgetManager.hideWidget === 'function') {
				return widgetManager.hideWidget(widgetId);
			}

			return false;
		}

		function createWidgetToggle(widget) {
			const button = document.createElement('button');
			const sync = () => {
				button.setAttribute('aria-pressed', isWidgetVisible(widget.id) ? 'true' : 'false');
			};

			button.type = 'button';
			button.className = 'pdk-settings-toggle';
			button.setAttribute('aria-label', t('widgets.showOnDesktopLabel'));
			button.appendChild(dom.createElement('span', 'pdk-settings-toggle-knob'));
			button.addEventListener('click', () => {
				setWidgetVisible(widget.id, !isWidgetVisible(widget.id));
				sync();
			});
			sync();

			return button;
		}

		function createWidgetRow(widget) {
			return createSettingsRow(
				widget.label || widget.id,
				createWidgetToggle(widget),
				'',
				'pdk-settings-widget-row pdk-settings-row-fluid-label'
			);
		}

		if (!widgets.length) {
			section.appendChild(dom.createElement('p', 'pdk-settings-description', t('widgets.emptyLabel')));
		} else {
			widgets.forEach((widget) => {
				if (widget && widget.id) {
					section.appendChild(createWidgetRow(widget));
				}
			});
		}

		panel.appendChild(section);

		return panel;
	};
})();
