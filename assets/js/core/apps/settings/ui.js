(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};
	window.PufferDesk.apps.settings = window.PufferDesk.apps.settings || {};

	window.PufferDesk.apps.settings.createUI = function createUI({ dom, labels } = {}) {
		function getLabel(key, fallback = '') {
			return labels && typeof labels.get === 'function' ? labels.get(key, fallback) : fallback;
		}

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

		function updateRangeFill(input) {
			const min = Number.parseFloat(input.min) || 0;
			const max = Number.parseFloat(input.max) || 100;
			const value = Number.parseFloat(input.value) || min;
			const ratio = max > min ? (value - min) / (max - min) : 0;

			input.style.setProperty('--pdk-range-fill', `${Math.max(0, Math.min(100, ratio * 100))}%`);
		}

		function createRangeField(options = {}) {
			const field = dom.createElement('label', `pdk-settings-range-field ${options.className || ''}`.trim());
			const label = dom.createElement('span', 'pdk-settings-range-title', options.label || '');
			const input = document.createElement('input');
			const legend = dom.createElement('span', 'pdk-settings-range-legend');
			const value = Object.prototype.hasOwnProperty.call(options, 'value') ? options.value : options.min || 0;

			input.type = 'range';
			input.min = String(Object.prototype.hasOwnProperty.call(options, 'min') ? options.min : 0);
			input.max = String(Object.prototype.hasOwnProperty.call(options, 'max') ? options.max : 100);
			input.step = String(options.step || 1);
			input.value = String(value);
			input.disabled = options.disabled === true;
			updateRangeFill(input);
			input.addEventListener('input', () => {
				updateRangeFill(input);
				if (typeof options.onInput === 'function') {
					options.onInput(Number.parseInt(input.value, 10), input);
				}
			});
			(Array.isArray(options.labels) ? options.labels : []).forEach((text) => {
				legend.appendChild(dom.createElement('span', '', text));
			});

			field.append(label, input, legend);

			return {
				field,
				input,
				legend
			};
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

			icon.appendChild(dom.createDashicon(options.icon));
			hero.appendChild(icon);
			hero.appendChild(dom.createElement('h2', '', options.title || getLabel('generalPanel.title', 'General')));
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
				row.dataset.pdkTitle = options.windowTitle || options.title || options.label || actions.fallbackWindowTitle || getLabel('generalPanel.fallbackWindowTitle', 'WordPress');
				row.dataset.pdkIcon = options.icon || dom.getDefaultDashicon();
			}
			if (hasCommand && typeof actions.executeCommand === 'function') {
				row.addEventListener('click', () => actions.executeCommand(options.command, options));
			}
			if (hasPanel && typeof actions.openPanel === 'function') {
				row.addEventListener('click', () => actions.openPanel(options.panel));
			}

			row.className = `pdk-settings-action-row ${options.className || ''}`.trim();
			row.appendChild(createRowIcon(options.icon || dom.getDefaultDashicon(), options.tone || 'gray'));
			text.appendChild(dom.createElement('strong', '', options.label || getLabel('profile.sectionLabel', 'Profile')));
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
			createRangeField,
			createRowIcon,
			createSection,
			createSectionHeading,
			createSettingsRow,
			createSummaryHero,
			updateRangeFill
		};
	};
})();
