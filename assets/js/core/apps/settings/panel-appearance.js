(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};
	window.PufferDesk.apps.settings = window.PufferDesk.apps.settings || {};

	window.PufferDesk.apps.settings.createAppearancePanel = function createAppearancePanel(ctx) {
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
		const panel = ctx.dom.createElement('div', 'pdk-settings-pane-panel');
		const appearanceSection = createSection('', 'pdk-settings-section-appearance');
		const themeSection = createSection('', 'pdk-settings-section-theme');
		let installedThemeSection = null;

		panel.dataset.aosSettingsPanel = 'appearance';
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

		if (appearanceCapabilities.accentColor !== false) {
			themeSection.appendChild(createSettingsRow(t('appearance.colorLabel', 'Color'), createAccentGroup(status)));
		}
		if (appearanceCapabilities.iconWidgetStyle !== false) {
			themeSection.appendChild(createSettingsRow(
				t('appearance.iconWidgetStyleLabel', 'Icon & widget style'),
				createOptionGroup('icon_widget_style', settingsLabels.getOptions('appearance.iconWidgetStyleOptions'), status, 'pdk-settings-icon-option', 'pdk-settings-icon-preview')
			));
		}

		if (themes.length > 1) {
			const themeSelect = document.createElement('select');
			installedThemeSection = createSection('', 'pdk-settings-section-installed-theme');
			themeSelect.className = 'pdk-settings-control';
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
