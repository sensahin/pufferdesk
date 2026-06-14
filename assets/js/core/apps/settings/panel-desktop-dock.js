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

	window.PufferDesk.apps.settings.createPersonalizationTaskbarPanel = function createPersonalizationTaskbarPanel(ctx) {
		const capabilities = ctx.capabilities && typeof ctx.capabilities === 'object' ? ctx.capabilities : {};
		const launcher = capabilities.launcher && typeof capabilities.launcher === 'object' ? capabilities.launcher : {};
		const showLauncher = launcher.enabled !== false;
		const panel = ctx.dom.createElement('div', 'pdk-settings-pane-panel pdk-settings-personalization-panel pdk-settings-personalization-detail-panel pdk-settings-personalization-taskbar-panel');
		const taskbarSection = createTaskbarGroup(ctx, t(ctx, 'personalization.taskbarItemsTitle', 'Taskbar items'), t(ctx, 'personalization.taskbarItemsDescription', 'Show or hide buttons that appear on the taskbar'));
		const behaviorSection = createTaskbarGroup(ctx, t(ctx, 'personalization.taskbarBehaviorsTitle', 'Taskbar behaviors'), t(ctx, 'personalization.taskbarBehaviorsDescription', 'Alignment, hiding, and app indicators'));

		panel.dataset.pdkSettingsPanel = 'personalization-taskbar';
		panel.dataset.pdkSettingsSidebar = 'appearance';
		panel.dataset.pdkSettingsTitle = `${t(ctx, 'appearance.title', 'Personalization')} > ${t(ctx, 'personalization.taskbarTitle', 'Taskbar')}`;
		panel.dataset.pdkSettingsTitleParent = t(ctx, 'appearance.title', 'Personalization');
		panel.dataset.pdkSettingsTitleCurrent = t(ctx, 'personalization.taskbarTitle', 'Taskbar');

		if (showLauncher && launcher.position !== false) {
			taskbarSection.appendChild(createTaskbarSelectRow(ctx, t(ctx, 'desktopDock.rows.dockPosition', 'Taskbar position'), 'dock_position', 'dashicons-move'));
		}
		if (showLauncher && launcher.autoHide !== false) {
			taskbarSection.appendChild(createTaskbarToggleRow(ctx, t(ctx, 'desktopDock.rows.autoHideDock', 'Automatically hide the taskbar'), 'auto_hide_dock', 'dashicons-hidden'));
		}
		if (showLauncher && launcher.indicators !== false) {
			taskbarSection.appendChild(createTaskbarToggleRow(ctx, t(ctx, 'desktopDock.rows.showOpenIndicators', 'Show indicators for open applications'), 'show_open_indicators', 'dashicons-visibility'));
		}
		taskbarSection.appendChild(createTaskbarToggleRow(ctx, t(ctx, 'desktopDock.rows.showWidgetsDesktop', 'Show widgets on desktop'), 'show_widgets_desktop', 'dashicons-screenoptions'));

		behaviorSection.appendChild(createTaskbarSelectRow(ctx, t(ctx, 'desktopDock.rows.minimizeAnimation', 'Minimized window animation'), 'minimize_animation', 'dashicons-image-flip-vertical'));
		if (showLauncher) {
			behaviorSection.appendChild(createTaskbarToggleRow(ctx, t(ctx, 'desktopDock.rows.animateOpeningApps', 'Animate opening applications'), 'animate_opening_apps', 'dashicons-controls-play'));
		}

		if (taskbarSection.children.length > 1) {
			panel.appendChild(taskbarSection);
		}
		if (behaviorSection.children.length > 1) {
			panel.appendChild(behaviorSection);
		}

		return panel;
	};

	function createTaskbarSelectRow(ctx, label, key, icon, description = '') {
		return decorateTaskbarRow(ctx, ctx.createDesktopDockSelectRow(label, key, ctx.status, description), icon);
	}

	function createTaskbarToggleRow(ctx, label, key, icon, description = '') {
		return decorateTaskbarRow(ctx, ctx.createDesktopDockToggleRow(label, key, ctx.status, description), icon);
	}

	function decorateTaskbarRow(ctx, row, icon) {
		const iconElement = ctx.dom.createElement('span', 'pdk-settings-personalization-icon pdk-settings-personalization-taskbar-row-icon');

		iconElement.appendChild(ctx.dom.createDashicon(icon || ctx.dom.getDefaultDashicon()));
		row.classList.add('pdk-settings-personalization-taskbar-row');
		row.insertBefore(iconElement, row.firstChild);

		return row;
	}

	function createTaskbarGroup(ctx, title, description) {
		const section = ctx.createSection('', 'pdk-settings-personalization-card pdk-settings-personalization-taskbar-group');
		const header = ctx.dom.createElement('div', 'pdk-settings-personalization-group-header');

		header.appendChild(ctx.dom.createElement('strong', '', title));
		if (description) {
			header.appendChild(ctx.dom.createElement('span', '', description));
		}
		section.appendChild(header);

		return section;
	}

	function t(ctx, path, fallback = '') {
		return typeof ctx.t === 'function' ? ctx.t(path, fallback) : fallback;
	}
})();
