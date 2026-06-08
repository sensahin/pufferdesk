(function () {
	'use strict';

	window.WPAdminOS = window.WPAdminOS || {};
	window.WPAdminOS.apps = window.WPAdminOS.apps || {};
	window.WPAdminOS.apps.settings = window.WPAdminOS.apps.settings || {};

	window.WPAdminOS.apps.settings.createUI = function createUI({ dom }) {
		function createSettingsRow(labelText, control, descriptionText = '', rowClassName = '') {
			const row = dom.createElement('div', `aos-settings-row ${rowClassName}`.trim());
			const labelStack = dom.createElement('span', 'aos-settings-label-stack');

			labelStack.appendChild(dom.createElement('span', 'aos-settings-label', labelText));
			if (descriptionText) {
				labelStack.appendChild(dom.createElement('span', 'aos-settings-description', descriptionText));
			}
			row.appendChild(labelStack);
			row.appendChild(control);

			return row;
		}

		function createSection(title = '', className = '') {
			const section = dom.createElement('section', `aos-settings-section ${className}`.trim());
			if (title) {
				section.appendChild(dom.createElement('h2', '', title));
			}

			return section;
		}

		function createSectionHeading(title) {
			return dom.createElement('h2', 'aos-settings-group-heading', title);
		}

		function createButton(labelText, className) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = className || 'aos-settings-button';
			button.textContent = labelText;

			return button;
		}

		function createRowIcon(iconName, tone = 'gray') {
			const icon = dom.createElement('span', `aos-settings-row-icon aos-settings-sidebar-icon-${tone}`);
			icon.appendChild(dom.createDashicon(iconName));

			return icon;
		}

		function createSummaryHero(options = {}) {
			const hero = dom.createElement('section', 'aos-settings-summary-card');
			const icon = dom.createElement('span', 'aos-settings-summary-icon aos-settings-sidebar-icon-gray');

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
			const text = dom.createElement('span', 'aos-settings-row-text');

			if (isInteractive) {
				row.type = 'button';
			}
			if (hasUrl) {
				row.dataset.aosOpenUrl = options.url;
				row.dataset.aosTitle = options.windowTitle || options.title || options.label || actions.fallbackWindowTitle || 'WordPress';
				row.dataset.aosIcon = options.icon || 'dashicons-admin-generic';
			}
			if (hasCommand && typeof actions.executeCommand === 'function') {
				row.addEventListener('click', () => actions.executeCommand(options.command, options));
			}
			if (hasPanel && typeof actions.openPanel === 'function') {
				row.addEventListener('click', () => actions.openPanel(options.panel));
			}

			row.className = `aos-settings-action-row ${options.className || ''}`.trim();
			row.appendChild(createRowIcon(options.icon || 'dashicons-admin-generic', options.tone || 'gray'));
			text.appendChild(dom.createElement('strong', '', options.label || 'Profile'));
			if (options.description) {
				text.appendChild(dom.createElement('span', '', options.description));
			}
			row.appendChild(text);

			if (options.value) {
				row.appendChild(dom.createElement('span', 'aos-settings-row-value', options.value));
			} else if (isInteractive) {
				row.appendChild(dom.createElement('span', 'aos-settings-row-chevron'));
			}

			return row;
		}

		return {
			createActionRow,
			createButton,
			createRowIcon,
			createSection,
			createSectionHeading,
			createSettingsRow,
			createSummaryHero
		};
	};
})();
