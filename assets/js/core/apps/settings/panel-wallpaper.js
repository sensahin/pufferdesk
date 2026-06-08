(function () {
	'use strict';

	window.WPAdminOS = window.WPAdminOS || {};
	window.WPAdminOS.apps = window.WPAdminOS.apps || {};
	window.WPAdminOS.apps.settings = window.WPAdminOS.apps.settings || {};

	window.WPAdminOS.apps.settings.createWallpaperPanel = function createWallpaperPanel(ctx) {
		const {
			createCollapsibleWallpaperSection,
			createPhotoWallpaperGroup,
			getWallpaperGroup,
			status,
			t
		} = ctx;
		const panel = ctx.dom.createElement('div', 'aos-settings-pane-panel');
		const wallpaperItems = getWallpaperGroup('wallpapers');
		const builtInSection = createCollapsibleWallpaperSection(
			t('wallpaper.wallpapersHeading', 'Wallpapers'),
			wallpaperItems,
			status,
			{
				sectionClassName: 'aos-settings-section-wallpaper-builtins',
				gridClassName: 'aos-settings-wallpaper-builtins-grid',
				visibleCount: 4
			}
		);
		const colorSection = createCollapsibleWallpaperSection(
			t('wallpaper.colorsHeading', 'Colors'),
			getWallpaperGroup('colors'),
			status,
			{
				sectionClassName: 'aos-settings-section-wallpaper-colors',
				gridClassName: 'aos-settings-wallpaper-color-grid',
				optionClassName: 'aos-settings-wallpaper-color-option',
				visibleCount: 8
			}
		);

		panel.dataset.aosSettingsPanel = 'wallpaper';
		builtInSection.appendChild(createPhotoWallpaperGroup(status));
		panel.append(builtInSection, colorSection);

		return panel;
	};
})();
