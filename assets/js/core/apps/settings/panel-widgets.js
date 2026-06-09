(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};
	window.PufferDesk.apps.settings = window.PufferDesk.apps.settings || {};

	window.PufferDesk.apps.settings.createWidgetsPanel = function createWidgetsPanel(ctx) {
		const {
			createSection,
			dom,
			t
		} = ctx;
		const widgets = Array.isArray(ctx.config.widgets) ? ctx.config.widgets : [];
		const widgetManager = window.PufferDesk.widgetManager || null;
		const panel = dom.createElement('div', 'pdk-settings-pane-panel pdk-settings-widgets-panel');
		const section = createSection('', 'pdk-settings-list pdk-settings-widgets-list');

		panel.dataset.pdkSettingsPanel = 'widgets';

		function getStoredWidgetState(widgetId) {
			const state = ctx.config.workspaceState && typeof ctx.config.workspaceState === 'object'
				? ctx.config.workspaceState
				: {};
			const records = Array.isArray(state.widgets) ? state.widgets : [];
			const record = records.find((item) => item && item.id === widgetId);

			return record && record.state && typeof record.state === 'object' ? record.state : {};
		}

		function isWidgetVisible(widgetId) {
			if (widgetManager && typeof widgetManager.isWidgetHidden === 'function') {
				return !widgetManager.isWidgetHidden(widgetId);
			}

			return !getStoredWidgetState(widgetId).hidden;
		}

		function setWidgetVisible(widgetId, visible) {
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
			button.setAttribute('aria-label', t('widgets.showOnDesktopLabel', 'Show on desktop'));
			button.appendChild(dom.createElement('span', 'pdk-settings-toggle-knob'));
			button.addEventListener('click', () => {
				setWidgetVisible(widget.id, !isWidgetVisible(widget.id));
				sync();
			});
			sync();

			return button;
		}

		function createWidgetRow(widget) {
			const row = dom.createElement('div', 'pdk-settings-row pdk-settings-widget-row');
			const icon = dom.createElement('span', 'pdk-settings-row-icon pdk-settings-sidebar-icon-green');
			const labelStack = dom.createElement('span', 'pdk-settings-label-stack');

			icon.appendChild(dom.createIcon(widget.icon || 'dashicons-screenoptions'));
			row.appendChild(icon);
			labelStack.appendChild(dom.createElement('span', 'pdk-settings-label', widget.label || widget.id));
			labelStack.appendChild(dom.createElement('span', 'pdk-settings-description', t('widgets.showOnDesktopLabel', 'Show on desktop')));
			row.append(labelStack, createWidgetToggle(widget));

			return row;
		}

		if (!widgets.length) {
			section.appendChild(dom.createElement('p', 'pdk-settings-description', t('widgets.emptyLabel', 'No widgets are registered for this account.')));
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
