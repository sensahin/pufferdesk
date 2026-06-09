(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};
	window.PufferDesk.apps.settings = window.PufferDesk.apps.settings || {};

	window.PufferDesk.apps.settings.createUI = function createUI({ dom }) {
		function createSettingsRow(labelText, control, descriptionText = '', rowClassName = '') {
			const row = dom.createElement('div', `pdk-settings-row ${rowClassName}`.trim());
			const labelStack = dom.createElement('span', 'pdk-settings-label-stack');

			labelStack.appendChild(dom.createElement('span', 'pdk-settings-label', labelText));
			if (descriptionText) {
				labelStack.appendChild(dom.createElement('span', 'pdk-settings-description', descriptionText));
			}
			row.appendChild(labelStack);
			row.appendChild(control);

			return row;
		}

		function createSection(title = '', className = '') {
			const section = dom.createElement('section', `pdk-settings-section ${className}`.trim());
			if (title) {
				section.appendChild(dom.createElement('h2', '', title));
			}

			return section;
		}

		function createSectionHeading(title) {
			return dom.createElement('h2', 'pdk-settings-group-heading', title);
		}

		function createButton(labelText, className) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = className || 'pdk-settings-button';
			button.textContent = labelText;

			return button;
		}

		function createInlineSelect(options = {}) {
			const wrap = dom.createElement('span', `pdk-settings-inline-select ${options.className || ''}`.trim());
			const select = document.createElement('select');
			const selectedValue = Object.prototype.hasOwnProperty.call(options, 'value') ? String(options.value) : '';

			select.className = 'pdk-settings-value-select';
			select.disabled = options.disabled === true;
			(Array.isArray(options.options) ? options.options : []).forEach((item) => {
				const option = document.createElement('option');
				const value = item && Object.prototype.hasOwnProperty.call(item, 'value') ? item.value : '';

				option.value = String(value);
				option.textContent = item && typeof item.label === 'string' ? item.label : option.value;
				option.selected = String(value) === selectedValue;
				select.appendChild(option);
			});
			if (typeof options.onChange === 'function') {
				select.addEventListener('change', () => options.onChange(select.value, select));
			}
			wrap.appendChild(select);
			wrap.appendChild(dom.createElement('span', 'pdk-settings-select-chevrons'));

			return {
				select,
				wrap
			};
		}

		function createRowIcon(iconName, tone = 'gray') {
			const icon = dom.createElement('span', `pdk-settings-row-icon pdk-settings-sidebar-icon-${tone}`);
			icon.appendChild(dom.createDashicon(iconName));

			return icon;
		}

		function createSummaryHero(options = {}) {
			const hero = dom.createElement('section', 'pdk-settings-summary-card');
			const icon = dom.createElement('span', 'pdk-settings-summary-icon pdk-settings-sidebar-icon-gray');

			icon.appendChild(dom.createDashicon(options.icon || 'dashicons-admin-generic'));
			hero.appendChild(icon);
			hero.appendChild(dom.createElement('h2', '', options.title || 'General'));
			if (options.description) {
				hero.appendChild(dom.createElement('p', '', options.description));
			}

			return hero;
		}

		function createActionRow(options = {}, actions = {}) {
			const hasUrl = Boolean(options.url);
			const hasCommand = Boolean(options.command);
			const hasPanel = Boolean(options.panel);
			const isInteractive = hasUrl || hasCommand || hasPanel;
			const row = isInteractive ? document.createElement('button') : dom.createElement('div');
			const text = dom.createElement('span', 'pdk-settings-row-text');

			if (isInteractive) {
				row.type = 'button';
			}
			if (hasUrl) {
				row.dataset.pdkOpenUrl = options.url;
				row.dataset.pdkTitle = options.windowTitle || options.title || options.label || actions.fallbackWindowTitle || 'WordPress';
				row.dataset.pdkIcon = options.icon || 'dashicons-admin-generic';
			}
			if (hasCommand && typeof actions.executeCommand === 'function') {
				row.addEventListener('click', () => actions.executeCommand(options.command, options));
			}
			if (hasPanel && typeof actions.openPanel === 'function') {
				row.addEventListener('click', () => actions.openPanel(options.panel));
			}

			row.className = `pdk-settings-action-row ${options.className || ''}`.trim();
			row.appendChild(createRowIcon(options.icon || 'dashicons-admin-generic', options.tone || 'gray'));
			text.appendChild(dom.createElement('strong', '', options.label || 'Profile'));
			if (options.description) {
				text.appendChild(dom.createElement('span', '', options.description));
			}
			row.appendChild(text);

			if (options.value) {
				row.appendChild(dom.createElement('span', 'pdk-settings-row-value', options.value));
			} else if (isInteractive) {
				row.appendChild(dom.createElement('span', 'pdk-settings-row-chevron'));
			}

			return row;
		}

		return {
			createActionRow,
			createButton,
			createInlineSelect,
			createRowIcon,
			createSection,
			createSectionHeading,
			createSettingsRow,
			createSummaryHero
		};
	};
})();
