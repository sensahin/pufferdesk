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
			themeMode,
			themeModes,
			themes
		} = ctx;
		const capabilities = ctx.capabilities && typeof ctx.capabilities === 'object' ? ctx.capabilities : {};
		const appearanceCapabilities = capabilities.appearance && typeof capabilities.appearance === 'object' ? capabilities.appearance : {};
		const selectableThemes = Array.isArray(themes) && themes.length
			? themes
			: (config.theme && config.theme.id ? [config.theme] : []);
		const selectableThemeModes = Array.isArray(themeModes) && themeModes.length
			? themeModes
			: settingsLabels.getOptions('appearance.themeModeOptions');
		const currentThemeMode = typeof themeMode === 'string' && themeMode
			? themeMode
			: (config.themeMode || (config.theme && config.theme.id) || '');
		const panel = dom.createElement('div', 'pdk-settings-pane-panel');
		const appearanceSection = createSection('', 'pdk-settings-section-appearance');
		const themeSection = createSection('', 'pdk-settings-section-theme');

		panel.dataset.pdkSettingsPanel = 'appearance';

		function createThemePicker() {
			const control = dom.createElement('span', 'pdk-settings-theme-control');
			const themePicker = createInlineSelect({
				className: 'pdk-settings-theme-select',
				disabled: selectableThemeModes.length < 2,
				options: selectableThemeModes.map((mode) => ({
					label: mode.label || getThemeOptionLabel(selectableThemes.find((theme) => theme.id === mode.value) || {}),
					value: mode.value
				})),
				onChange: (mode) => {
					if (!mode || mode === currentThemeMode) {
						return;
					}

					ctx.saveTheme(mode, status);
				},
				value: currentThemeMode
			});

			control.appendChild(themePicker.wrap);

			return control;
		}

		appearanceSection.appendChild(createSettingsRow(
			t('appearance.appearanceLabel'),
			createOptionGroup('mode', settingsLabels.getOptions('appearance.modeOptions'), status, 'pdk-settings-preview-option', 'pdk-settings-appearance-preview')
		));
		if (appearanceCapabilities.windowMaterial !== false) {
			appearanceSection.appendChild(createSettingsRow(
				t('appearance.materialLabel'),
				createOptionGroup('window_material', settingsLabels.getOptions('appearance.materialOptions'), status, 'pdk-settings-preview-option', 'pdk-settings-material-preview'),
				t('appearance.materialDescription'),
				'pdk-settings-row-fluid-label'
			));
		}

		if (selectableThemeModes.length) {
			themeSection.appendChild(createSettingsRow(
				t('appearance.themeLabel'),
				createThemePicker(),
				'',
				'pdk-settings-theme-row'
			));
		}
		if (appearanceCapabilities.accentColor !== false) {
			themeSection.appendChild(createSettingsRow(t('appearance.colorLabel'), createAccentGroup(status)));
		}
		if (appearanceCapabilities.iconWidgetStyle !== false) {
			themeSection.appendChild(createSettingsRow(
				t('appearance.iconWidgetStyleLabel'),
				createOptionGroup('icon_widget_style', settingsLabels.getOptions('appearance.iconWidgetStyleOptions'), status, 'pdk-settings-icon-option', 'pdk-settings-icon-preview')
			));
		}

		panel.appendChild(appearanceSection);
		if (themeSection.children.length) {
			panel.appendChild(createSectionHeading(t('appearance.themeHeading')));
			panel.appendChild(themeSection);
		}

		return panel;
	};
})();
