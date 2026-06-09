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
			dockSection.appendChild(createDesktopDockSelectRow(t('desktopDock.rows.dockPosition', 'Dock position on screen'), 'dock_position', status));
		}
		dockSection.appendChild(createDesktopDockSelectRow(t('desktopDock.rows.minimizeAnimation', 'Minimized window animation'), 'minimize_animation', status));
		if (showLauncher) {
			dockSection.appendChild(createDesktopDockToggleRow(t('desktopDock.rows.minimizeIntoAppIcon', 'Minimize windows into application icon'), 'minimize_into_app_icon', status));
		}

		if (showLauncher && launcher.autoHide !== false) {
			behaviorSection.appendChild(createDesktopDockToggleRow(t('desktopDock.rows.autoHideDock', 'Automatically hide and show the Dock'), 'auto_hide_dock', status));
		}
		if (showLauncher) {
			behaviorSection.appendChild(createDesktopDockToggleRow(t('desktopDock.rows.animateOpeningApps', 'Animate opening applications'), 'animate_opening_apps', status));
		}
		if (showLauncher && launcher.indicators !== false) {
			behaviorSection.appendChild(createDesktopDockToggleRow(t('desktopDock.rows.showOpenIndicators', 'Show indicators for open applications'), 'show_open_indicators', status));
		}
		desktopSection.appendChild(createDesktopDockSelectRow(
			t('desktopDock.rows.wallpaperClick', 'Click wallpaper to show desktop'),
			'wallpaper_click',
			status,
			t('desktopDock.rows.wallpaperClickDescription', 'Click wallpaper to move windows out of the way, revealing your desktop items and widgets.')
		));

		widgetsSection.appendChild(createDesktopDockToggleRow(t('desktopDock.rows.showWidgetsDesktop', 'Show widgets on desktop'), 'show_widgets_desktop', status));
		widgetsSection.appendChild(createDesktopDockSelectRow(t('desktopDock.rows.dimWidgets', 'Dim widgets on desktop'), 'dim_widgets', status));

		if (showLauncher) {
			panel.appendChild(createSectionHeading(t('desktopDock.headings.dock', 'Dock')));
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
		panel.appendChild(createSectionHeading(t('desktopDock.headings.apps', 'Apps')));
		panel.appendChild(appsSection);
		panel.appendChild(createSectionHeading(t('desktopDock.headings.desktop', 'Desktop')));
		panel.appendChild(desktopSection);
		panel.appendChild(createSectionHeading(t('desktopDock.headings.widgets', 'Widgets')));
		panel.appendChild(widgetsSection);

		return panel;
	};
})();
