(function () {
	'use strict';

	window.WPAdminOS = window.WPAdminOS || {};
	window.WPAdminOS.apps = window.WPAdminOS.apps || {};
	window.WPAdminOS.apps.settings = window.WPAdminOS.apps.settings || {};

	window.WPAdminOS.apps.settings.createWidgetsPanel = function createWidgetsPanel(ctx) {
		const {
			createSection,
			dom,
			t
		} = ctx;
		const widgets = Array.isArray(ctx.config.widgets) ? ctx.config.widgets : [];
		const widgetManager = window.WPAdminOS.widgetManager || null;
		const panel = dom.createElement('div', 'aos-settings-pane-panel aos-settings-widgets-panel');
		const section = createSection('', 'aos-settings-list aos-settings-widgets-list');

		panel.dataset.aosSettingsPanel = 'widgets';

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
			button.className = 'aos-settings-toggle';
			button.setAttribute('aria-label', t('widgets.showOnDesktopLabel', 'Show on desktop'));
			button.appendChild(dom.createElement('span', 'aos-settings-toggle-knob'));
			button.addEventListener('click', () => {
				setWidgetVisible(widget.id, !isWidgetVisible(widget.id));
				sync();
			});
			sync();

			return button;
		}

		function createWidgetRow(widget) {
			const row = dom.createElement('div', 'aos-settings-row aos-settings-widget-row');
			const icon = dom.createElement('span', 'aos-settings-row-icon aos-settings-sidebar-icon-green');
			const labelStack = dom.createElement('span', 'aos-settings-label-stack');

			icon.appendChild(dom.createIcon(widget.icon || 'dashicons-screenoptions'));
			row.appendChild(icon);
			labelStack.appendChild(dom.createElement('span', 'aos-settings-label', widget.label || widget.id));
			labelStack.appendChild(dom.createElement('span', 'aos-settings-description', t('widgets.showOnDesktopLabel', 'Show on desktop')));
			row.append(labelStack, createWidgetToggle(widget));

			return row;
		}

		if (!widgets.length) {
			section.appendChild(dom.createElement('p', 'aos-settings-description', t('widgets.emptyLabel', 'No widgets are registered for this account.')));
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
