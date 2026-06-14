(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};
	window.PufferDesk.apps.settings = window.PufferDesk.apps.settings || {};

	const PERSONALIZATION_PANEL = 'appearance';
	const COLORS_PANEL = 'personalization-colors';
	const TASKBAR_PANEL = 'personalization-taskbar';

	window.PufferDesk.apps.settings.createAppearancePanel = function createAppearancePanel(ctx) {
		if (isWindowsSettings(ctx)) {
			return createWindowsPersonalizationPanel(ctx);
		}

		return createClassicAppearancePanel(ctx);
	};

	window.PufferDesk.apps.settings.createPersonalizationColorsPanel = function createPersonalizationColorsPanel(ctx) {
		return createWindowsColorsPanel(ctx);
	};

	function isWindowsSettings(ctx) {
		return ctx.isWindowsSettingsLayout || ctx.settingsLayout === 'windows-settings';
	}

	function createClassicAppearancePanel(ctx) {
		const {
			createAccentGroup,
			createOptionGroup,
			createSection,
			createSectionHeading,
			createSettingsRow,
			dom,
			settingsLabels,
			status,
			t
		} = ctx;
		const capabilities = ctx.capabilities && typeof ctx.capabilities === 'object' ? ctx.capabilities : {};
		const appearanceCapabilities = capabilities.appearance && typeof capabilities.appearance === 'object' ? capabilities.appearance : {};
		const panel = dom.createElement('div', 'pdk-settings-pane-panel');
		const appearanceSection = createSection('', 'pdk-settings-section-appearance');
		const styleSection = createSection('', 'pdk-settings-section-theme');

		panel.dataset.pdkSettingsPanel = PERSONALIZATION_PANEL;

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

		if (appearanceCapabilities.accentColor !== false) {
			styleSection.appendChild(createSettingsRow(t('appearance.colorLabel'), createAccentGroup(status)));
		}
		if (appearanceCapabilities.iconWidgetStyle !== false) {
			styleSection.appendChild(createSettingsRow(
				t('appearance.iconWidgetStyleLabel'),
				createOptionGroup('icon_widget_style', settingsLabels.getOptions('appearance.iconWidgetStyleOptions'), status, 'pdk-settings-icon-option', 'pdk-settings-icon-preview')
			));
		}

		panel.appendChild(appearanceSection);
		if (styleSection.children.length) {
			panel.appendChild(createSectionHeading(t('appearance.themeHeading')));
			panel.appendChild(styleSection);
		}

		return panel;
	}

	function createWindowsPersonalizationPanel(ctx) {
		const dom = ctx.dom;
		const panel = dom.createElement('div', 'pdk-settings-pane-panel pdk-settings-personalization-panel pdk-settings-personalization-hub');
		const list = dom.createElement('section', 'pdk-settings-personalization-list');
		const rows = [
			{
				description: t(ctx, 'personalization.backgroundDescription', 'Background image, color, slideshow'),
				icon: 'dashicons-format-image',
				label: t(ctx, 'personalization.backgroundTitle', 'Background'),
				panel: 'wallpaper'
			},
			{
				description: t(ctx, 'personalization.colorsDescription', 'Accent color, transparency effects, color theme'),
				icon: 'dashicons-art',
				label: t(ctx, 'personalization.colorsTitle', 'Colors'),
				panel: COLORS_PANEL
			},
			{
				description: t(ctx, 'personalization.taskbarDescription', 'Launcher behaviors, system pins'),
				icon: 'dashicons-desktop',
				label: t(ctx, 'personalization.taskbarTitle', 'Launcher'),
				panel: TASKBAR_PANEL
			}
		];

		panel.dataset.pdkSettingsPanel = PERSONALIZATION_PANEL;
		panel.dataset.pdkSettingsTitle = t(ctx, 'appearance.title', 'Personalization');
		panel.appendChild(createPersonalizationPreview(ctx));
		rows.forEach((row) => {
			list.appendChild(createPersonalizationNavRow(ctx, row));
		});
		panel.appendChild(list);

		return panel;
	}

	function createWindowsColorsPanel(ctx) {
		const dom = ctx.dom;
		const capabilities = ctx.capabilities && typeof ctx.capabilities === 'object' ? ctx.capabilities : {};
		const appearanceCapabilities = capabilities.appearance && typeof capabilities.appearance === 'object' ? capabilities.appearance : {};
		const panel = dom.createElement('div', 'pdk-settings-pane-panel pdk-settings-personalization-panel pdk-settings-personalization-detail-panel pdk-settings-personalization-colors-panel');
		const section = dom.createElement('section', 'pdk-settings-personalization-card pdk-settings-personalization-controls');
		const modeOptions = getOptions(ctx, 'appearance.modeOptions');

		panel.dataset.pdkSettingsPanel = COLORS_PANEL;
		panel.dataset.pdkSettingsSidebar = PERSONALIZATION_PANEL;
		panel.dataset.pdkSettingsTitle = `${t(ctx, 'appearance.title', 'Personalization')} > ${t(ctx, 'personalization.colorsTitle', 'Colors')}`;
		panel.dataset.pdkSettingsTitleParent = t(ctx, 'appearance.title', 'Personalization');
		panel.dataset.pdkSettingsTitleCurrent = t(ctx, 'personalization.colorsTitle', 'Colors');
		panel.appendChild(createPersonalizationPreview(ctx));
		section.appendChild(createPersonalizationControlRow(ctx, {
			control: createAppearanceSelect(ctx, 'mode', modeOptions, 'pdk-settings-personalization-select'),
			description: t(ctx, 'personalization.chooseModeDescription', 'Change the colors that appear in PufferDesk and your apps'),
			icon: 'dashicons-admin-appearance',
			label: t(ctx, 'personalization.chooseModeLabel', 'Choose your mode')
		}));
		if (appearanceCapabilities.windowMaterial !== false) {
			section.appendChild(createPersonalizationControlRow(ctx, {
				control: createAppearanceSelect(ctx, 'window_material', getOptions(ctx, 'appearance.materialOptions'), 'pdk-settings-personalization-select'),
				description: t(ctx, 'appearance.materialDescription', 'Surfaces appear translucent'),
				icon: 'dashicons-admin-customizer',
				label: t(ctx, 'appearance.materialLabel', 'Transparency effects')
			}));
		}
		if (appearanceCapabilities.accentColor !== false) {
			section.appendChild(createPersonalizationControlRow(ctx, {
				control: ctx.createAccentGroup(ctx.status),
				icon: 'dashicons-art',
				label: t(ctx, 'personalization.accentColorLabel', t(ctx, 'appearance.colorLabel', 'Accent color'))
			}));
		}

		panel.appendChild(section);

		return panel;
	}

	function createPersonalizationNavRow(ctx, options = {}) {
		const dom = ctx.dom;
		const button = document.createElement('button');
		const text = dom.createElement('span', 'pdk-settings-personalization-row-text');

		button.type = 'button';
		button.className = 'pdk-settings-personalization-row';
		button.appendChild(createPersonalizationIcon(ctx, options.icon));
		text.appendChild(dom.createElement('strong', '', options.label || ''));
		if (options.description) {
			text.appendChild(dom.createElement('span', '', options.description));
		}
		button.appendChild(text);
		button.appendChild(dom.createElement('span', 'pdk-settings-row-chevron'));
		button.addEventListener('click', () => {
			if (options.panel && typeof ctx.openSettingsPanel === 'function') {
				ctx.openSettingsPanel(options.panel);
			}
		});

		return button;
	}

	function createPersonalizationControlRow(ctx, options = {}) {
		const dom = ctx.dom;
		const row = dom.createElement('div', 'pdk-settings-personalization-control-row');
		const text = dom.createElement('span', 'pdk-settings-personalization-row-text');

		row.appendChild(createPersonalizationIcon(ctx, options.icon));
		text.appendChild(dom.createElement('strong', '', options.label || ''));
		if (options.description) {
			text.appendChild(dom.createElement('span', '', options.description));
		}
		row.appendChild(text);
		if (options.control) {
			row.appendChild(options.control);
		}

		return row;
	}

	function createPersonalizationIcon(ctx, iconName) {
		const icon = ctx.dom.createElement('span', 'pdk-settings-personalization-icon');
		icon.appendChild(ctx.dom.createDashicon(iconName || ctx.dom.getDefaultDashicon()));

		return icon;
	}

	function createPersonalizationPreview(ctx) {
		const dom = ctx.dom;
		const preview = dom.createElement('section', 'pdk-settings-personalization-preview');
		const screen = dom.createElement('span', 'pdk-settings-personalization-preview-screen');
		const card = dom.createElement('span', 'pdk-settings-personalization-preview-card');

		applyWallpaperPreview(ctx, screen);
		card.appendChild(dom.createElement('span', 'pdk-settings-personalization-preview-line'));
		card.appendChild(dom.createElement('span', 'pdk-settings-personalization-preview-line'));
		card.appendChild(dom.createElement('span', 'pdk-settings-personalization-preview-line is-short'));
		card.appendChild(dom.createElement('span', 'pdk-settings-personalization-preview-accent'));
		screen.appendChild(card);
		preview.appendChild(screen);

		return preview;
	}

	function createAppearanceSelect(ctx, key, options, className) {
		if (typeof ctx.createAppearanceSelect === 'function') {
			return ctx.createAppearanceSelect(key, options, ctx.status, className);
		}

		const currentAppearance = typeof ctx.getAppearance === 'function' ? ctx.getAppearance() : {};
		const select = ctx.createInlineSelect({
			className,
			options,
			value: currentAppearance[key] || '',
			onChange: (value) => {
				if (typeof ctx.updateAppearance === 'function') {
					ctx.updateAppearance(key, value, ctx.status);
				}
			}
		});

		return select.wrap;
	}

	function applyWallpaperPreview(ctx, element) {
		const current = typeof ctx.getCurrentWallpaper === 'function' ? ctx.getCurrentWallpaper() : {};
		if (current.swatch) {
			element.style.backgroundColor = current.swatch;
		}
		if (current.preview || current.css_value) {
			element.style.backgroundImage = current.preview || current.css_value;
		}
	}

	function getOptions(ctx, path) {
		return ctx.settingsLabels && typeof ctx.settingsLabels.getOptions === 'function'
			? ctx.settingsLabels.getOptions(path)
			: [];
	}

	function t(ctx, path, fallback = '') {
		return typeof ctx.t === 'function' ? ctx.t(path, fallback) : fallback;
	}
})();
