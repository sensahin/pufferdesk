(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};
	window.PufferDesk.apps.settings = window.PufferDesk.apps.settings || {};

	window.PufferDesk.apps.settings.createAppearancePanel = function createAppearancePanel(ctx) {
		const {
			config,
			createAccentGroup,
			createInlineSelect,
			createOptionGroup,
			createSection,
			createSectionHeading,
			createSettingsRow,
			dom,
			getThemeOptionLabel,
			settingsLabels,
			status,
			t,
			themes
		} = ctx;
		const capabilities = ctx.capabilities && typeof ctx.capabilities === 'object' ? ctx.capabilities : {};
		const appearanceCapabilities = capabilities.appearance && typeof capabilities.appearance === 'object' ? capabilities.appearance : {};
		const selectableThemes = Array.isArray(themes) && themes.length
			? themes
			: (config.theme && config.theme.id ? [config.theme] : []);
		const panel = dom.createElement('div', 'pdk-settings-pane-panel');
		const appearanceSection = createSection('', 'pdk-settings-section-appearance');
		const themeSection = createSection('', 'pdk-settings-section-theme');

		panel.dataset.pdkSettingsPanel = 'appearance';

		function createThemePicker() {
			const control = dom.createElement('span', 'pdk-settings-theme-control');
			const themePicker = createInlineSelect({
				className: 'pdk-settings-theme-select',
				disabled: selectableThemes.length < 2,
				options: selectableThemes.map((theme) => ({
					label: getThemeOptionLabel(theme),
					value: theme.id
				})),
				onChange: (themeId) => {
					if (!themeId || (config.theme && themeId === config.theme.id)) {
						return;
					}

					ctx.saveTheme(themeId, status);
				},
				value: config.theme && config.theme.id ? config.theme.id : ''
			});

			control.appendChild(themePicker.wrap);

			return control;
		}

		appearanceSection.appendChild(createSettingsRow(
			t('appearance.appearanceLabel', 'Appearance'),
			createOptionGroup('mode', settingsLabels.getOptions('appearance.modeOptions'), status, 'pdk-settings-preview-option', 'pdk-settings-appearance-preview')
		));
		if (appearanceCapabilities.windowMaterial !== false) {
			appearanceSection.appendChild(createSettingsRow(
				t('appearance.materialLabel', 'Liquid Glass'),
				createOptionGroup('window_material', settingsLabels.getOptions('appearance.materialOptions'), status, 'pdk-settings-preview-option', 'pdk-settings-material-preview'),
				t('appearance.materialDescription', 'Choose your preferred Liquid Glass look.'),
				'pdk-settings-row-fluid-label'
			));
		}

		if (selectableThemes.length) {
			themeSection.appendChild(createSettingsRow(
				t('appearance.themeLabel', 'Theme'),
				createThemePicker(),
				'',
				'pdk-settings-theme-row'
			));
		}
		if (appearanceCapabilities.accentColor !== false) {
			themeSection.appendChild(createSettingsRow(t('appearance.colorLabel', 'Color'), createAccentGroup(status)));
		}
		if (appearanceCapabilities.iconWidgetStyle !== false) {
			themeSection.appendChild(createSettingsRow(
				t('appearance.iconWidgetStyleLabel', 'Icon & widget style'),
				createOptionGroup('icon_widget_style', settingsLabels.getOptions('appearance.iconWidgetStyleOptions'), status, 'pdk-settings-icon-option', 'pdk-settings-icon-preview')
			));
		}

		panel.appendChild(appearanceSection);
		if (themeSection.children.length) {
			panel.appendChild(createSectionHeading(t('appearance.themeHeading', 'Theme')));
			panel.appendChild(themeSection);
		}

		return panel;
	};
})();
