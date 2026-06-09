(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};
	window.PufferDesk.apps.settings = window.PufferDesk.apps.settings || {};

	window.PufferDesk.apps.settings.createWallpaperPanel = function createWallpaperPanel(ctx) {
		const {
			createCollapsibleWallpaperSection,
			createPhotoWallpaperGroup,
			getWallpaperGroup,
			status,
			t
		} = ctx;
		const panel = ctx.dom.createElement('div', 'pdk-settings-pane-panel');
		const wallpaperItems = getWallpaperGroup('wallpapers');
		const builtInSection = createCollapsibleWallpaperSection(
			t('wallpaper.wallpapersHeading', 'Wallpapers'),
			wallpaperItems,
			status,
			{
				sectionClassName: 'pdk-settings-section-wallpaper-builtins',
				gridClassName: 'pdk-settings-wallpaper-builtins-grid',
				visibleCount: 4
			}
		);
		const colorSection = createCollapsibleWallpaperSection(
			t('wallpaper.colorsHeading', 'Colors'),
			getWallpaperGroup('colors'),
			status,
			{
				sectionClassName: 'pdk-settings-section-wallpaper-colors',
				gridClassName: 'pdk-settings-wallpaper-color-grid',
				optionClassName: 'pdk-settings-wallpaper-color-option',
				visibleCount: 8
			}
		);

		panel.dataset.aosSettingsPanel = 'wallpaper';
		builtInSection.appendChild(createPhotoWallpaperGroup(status));
		panel.append(builtInSection, colorSection);

		return panel;
	};
})();
