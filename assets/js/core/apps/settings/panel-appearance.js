(function () {
	'use strict';

	window.WPAdminOS = window.WPAdminOS || {};
	window.WPAdminOS.apps = window.WPAdminOS.apps || {};
	window.WPAdminOS.apps.settings = window.WPAdminOS.apps.settings || {};

	window.WPAdminOS.apps.settings.createAppearancePanel = function createAppearancePanel(ctx) {
		const {
			config,
			createAccentGroup,
			createButton,
			createOptionGroup,
			createSection,
			createSectionHeading,
			createSettingsRow,
			getThemeOptionLabel,
			settingsLabels,
			status,
			t,
			themes
		} = ctx;
		const capabilities = ctx.capabilities && typeof ctx.capabilities === 'object' ? ctx.capabilities : {};
		const appearanceCapabilities = capabilities.appearance && typeof capabilities.appearance === 'object' ? capabilities.appearance : {};
		const panel = ctx.dom.createElement('div', 'aos-settings-pane-panel');
		const appearanceSection = createSection('', 'aos-settings-section-appearance');
		const themeSection = createSection('', 'aos-settings-section-theme');
		let installedThemeSection = null;

		panel.dataset.aosSettingsPanel = 'appearance';
		appearanceSection.appendChild(createSettingsRow(
			t('appearance.appearanceLabel', 'Appearance'),
			createOptionGroup('mode', settingsLabels.getOptions('appearance.modeOptions'), status, 'aos-settings-preview-option', 'aos-settings-appearance-preview')
		));
		if (appearanceCapabilities.windowMaterial !== false) {
			appearanceSection.appendChild(createSettingsRow(
				t('appearance.materialLabel', 'Liquid Glass'),
				createOptionGroup('window_material', settingsLabels.getOptions('appearance.materialOptions'), status, 'aos-settings-preview-option', 'aos-settings-material-preview'),
				t('appearance.materialDescription', 'Choose your preferred Liquid Glass look.'),
				'aos-settings-row-fluid-label'
			));
		}

		if (appearanceCapabilities.accentColor !== false) {
			themeSection.appendChild(createSettingsRow(t('appearance.colorLabel', 'Color'), createAccentGroup(status)));
		}
		if (appearanceCapabilities.iconWidgetStyle !== false) {
			themeSection.appendChild(createSettingsRow(
				t('appearance.iconWidgetStyleLabel', 'Icon & widget style'),
				createOptionGroup('icon_widget_style', settingsLabels.getOptions('appearance.iconWidgetStyleOptions'), status, 'aos-settings-icon-option', 'aos-settings-icon-preview')
			));
		}

		if (themes.length > 1) {
			const themeSelect = document.createElement('select');
			installedThemeSection = createSection('', 'aos-settings-section-installed-theme');
			themeSelect.className = 'aos-settings-control';
			themes.forEach((theme) => {
				const option = document.createElement('option');
				option.value = theme.id;
				option.textContent = getThemeOptionLabel(theme);
				option.selected = config.theme && config.theme.id === theme.id;
				themeSelect.appendChild(option);
			});
			installedThemeSection.appendChild(createSettingsRow(t('appearance.themeLabel', 'Theme'), themeSelect));

			const saveThemeButton = createButton(t('appearance.applyThemeLabel', 'Apply Theme'));
			saveThemeButton.addEventListener('click', () => ctx.saveTheme(themeSelect.value, status));
			installedThemeSection.appendChild(saveThemeButton);
		}

		panel.appendChild(appearanceSection);
		if (themeSection.children.length) {
			panel.appendChild(createSectionHeading(t('appearance.themeHeading', 'Theme')));
			panel.appendChild(themeSection);
		}
		if (installedThemeSection) {
			panel.appendChild(createSectionHeading(t('appearance.installedThemeHeading', 'Installed Theme')));
			panel.appendChild(installedThemeSection);
		}

		return panel;
	};
})();
