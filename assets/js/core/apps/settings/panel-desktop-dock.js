(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};
	window.PufferDesk.apps.settings = window.PufferDesk.apps.settings || {};

	window.PufferDesk.apps.settings.createDesktopDockPanel = function createDesktopDockPanel(ctx) {
		const {
			createAppLocationSection,
			createDesktopDockSelectRow,
			createDesktopDockSliderSection,
			createDesktopDockToggleRow,
			createSection,
			createSectionHeading,
			status,
			t
		} = ctx;
		const capabilities = ctx.capabilities && typeof ctx.capabilities === 'object' ? ctx.capabilities : {};
		const launcher = capabilities.launcher && typeof capabilities.launcher === 'object' ? capabilities.launcher : {};
		const showLauncher = launcher.enabled !== false;
		const panel = ctx.dom.createElement('div', 'pdk-settings-pane-panel pdk-settings-desktop-dock-panel');
		const dockSection = createSection('', 'pdk-settings-list pdk-settings-desktop-dock-list');
		const behaviorSection = createSection('', 'pdk-settings-list pdk-settings-desktop-dock-list');
		const appsSection = createAppLocationSection(status);
		const desktopSection = createSection('', 'pdk-settings-list pdk-settings-desktop-dock-list');
		const widgetsSection = createSection('', 'pdk-settings-list pdk-settings-desktop-dock-list');
		const sliderSection = showLauncher
			? createDesktopDockSliderSection(status, {
				magnification: launcher.magnification !== false,
				size: true
			})
			: null;

		panel.dataset.pdkSettingsPanel = 'desktop-dock';
		if (showLauncher && launcher.position !== false) {
			dockSection.appendChild(createDesktopDockSelectRow(t('desktopDock.rows.dockPosition'), 'dock_position', status));
		}
		dockSection.appendChild(createDesktopDockSelectRow(t('desktopDock.rows.minimizeAnimation'), 'minimize_animation', status));
		if (showLauncher) {
			dockSection.appendChild(createDesktopDockToggleRow(t('desktopDock.rows.minimizeIntoAppIcon'), 'minimize_into_app_icon', status));
		}

		if (showLauncher && launcher.autoHide !== false) {
			behaviorSection.appendChild(createDesktopDockToggleRow(t('desktopDock.rows.autoHideDock'), 'auto_hide_dock', status));
		}
		if (showLauncher) {
			behaviorSection.appendChild(createDesktopDockToggleRow(t('desktopDock.rows.animateOpeningApps'), 'animate_opening_apps', status));
		}
		if (showLauncher && launcher.indicators !== false) {
			behaviorSection.appendChild(createDesktopDockToggleRow(t('desktopDock.rows.showOpenIndicators'), 'show_open_indicators', status));
		}
		desktopSection.appendChild(createDesktopDockSelectRow(
			t('desktopDock.rows.wallpaperClick'),
			'wallpaper_click',
			status,
			t('desktopDock.rows.wallpaperClickDescription')
		));

		widgetsSection.appendChild(createDesktopDockToggleRow(t('desktopDock.rows.showWidgetsDesktop'), 'show_widgets_desktop', status));
		widgetsSection.appendChild(createDesktopDockSelectRow(t('desktopDock.rows.dimWidgets'), 'dim_widgets', status));

		if (showLauncher) {
			panel.appendChild(createSectionHeading(t('desktopDock.headings.dock')));
			if (sliderSection && sliderSection.children.length) {
				panel.appendChild(sliderSection);
			}
			if (dockSection.children.length) {
				panel.appendChild(dockSection);
			}
			if (behaviorSection.children.length) {
				panel.appendChild(behaviorSection);
			}
		}
		panel.appendChild(createSectionHeading(t('desktopDock.headings.apps')));
		panel.appendChild(appsSection);
		panel.appendChild(createSectionHeading(t('desktopDock.headings.desktop')));
		panel.appendChild(desktopSection);
		panel.appendChild(createSectionHeading(t('desktopDock.headings.widgets')));
		panel.appendChild(widgetsSection);

		return panel;
	};
})();
