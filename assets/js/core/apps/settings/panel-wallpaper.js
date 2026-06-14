(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};
	window.PufferDesk.apps.settings = window.PufferDesk.apps.settings || {};

	window.PufferDesk.apps.settings.createWallpaperPanel = function createWallpaperPanel(ctx) {
		if (ctx.isWindowsSettingsLayout || ctx.settingsLayout === 'windows-settings') {
			return createWindowsBackgroundPanel(ctx);
		}

		return createClassicWallpaperPanel(ctx);
	};

	function createClassicWallpaperPanel(ctx) {
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
			t('wallpaper.wallpapersHeading'),
			wallpaperItems,
			status,
			{
				sectionClassName: 'pdk-settings-section-wallpaper-builtins',
				gridClassName: 'pdk-settings-wallpaper-builtins-grid',
				visibleCount: 4
			}
		);
		const colorSection = createCollapsibleWallpaperSection(
			t('wallpaper.colorsHeading'),
			getWallpaperGroup('colors'),
			status,
			{
				sectionClassName: 'pdk-settings-section-wallpaper-colors',
				gridClassName: 'pdk-settings-wallpaper-color-grid',
				optionClassName: 'pdk-settings-wallpaper-color-option',
				visibleCount: 8
			}
		);

		panel.dataset.pdkSettingsPanel = 'wallpaper';
		builtInSection.appendChild(createPhotoWallpaperGroup(status));
		panel.append(builtInSection, colorSection);

		return panel;
	}

	function createWindowsBackgroundPanel(ctx) {
		const dom = ctx.dom;
		const panel = dom.createElement('div', 'pdk-settings-pane-panel pdk-settings-personalization-panel pdk-settings-personalization-detail-panel pdk-settings-personalization-background-panel');
		const wallpapers = createWallpaperGrid(ctx, ctx.getWallpaperGroup('wallpapers'), 'pdk-settings-personalization-wallpaper-grid');
		const colors = createWallpaperGrid(ctx, ctx.getWallpaperGroup('colors'), 'pdk-settings-personalization-color-grid');

		panel.dataset.pdkSettingsPanel = 'wallpaper';
		panel.dataset.pdkSettingsSidebar = 'appearance';
		panel.dataset.pdkSettingsTitle = `${t(ctx, 'appearance.title', 'Personalization')} > ${t(ctx, 'personalization.backgroundTitle', 'Background')}`;
		panel.dataset.pdkSettingsTitleParent = t(ctx, 'appearance.title', 'Personalization');
		panel.dataset.pdkSettingsTitleCurrent = t(ctx, 'personalization.backgroundTitle', 'Background');
		panel.appendChild(createBackgroundPreview(ctx));
		if (wallpapers) {
			panel.appendChild(createBackgroundSection(ctx, t(ctx, 'wallpaper.wallpapersHeading', 'Wallpapers'), wallpapers));
		}
		if (ctx.createPhotoWallpaperGroup) {
			panel.appendChild(createBackgroundSection(ctx, t(ctx, 'wallpaper.yourPhotosHeading', 'Your Photos'), ctx.createPhotoWallpaperGroup(ctx.status), 'pdk-settings-personalization-photos-card'));
		}
		if (colors) {
			panel.appendChild(createBackgroundSection(ctx, t(ctx, 'wallpaper.colorsHeading', 'Colors'), colors));
		}

		return panel;
	}

	function createBackgroundPreview(ctx) {
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

	function createBackgroundSection(ctx, title, content, className = '') {
		const section = ctx.dom.createElement('section', `pdk-settings-personalization-card pdk-settings-personalization-background-card ${className}`.trim());
		const header = ctx.dom.createElement('div', 'pdk-settings-personalization-group-header');

		header.appendChild(ctx.dom.createElement('strong', '', title));
		section.append(header, content);

		return section;
	}

	function createWallpaperGrid(ctx, items, className) {
		const list = Array.isArray(items) ? items.filter((item) => item && typeof item === 'object') : [];
		if (!list.length) {
			return null;
		}

		const grid = ctx.dom.createElement('div', className);
		const buttons = [];

		function syncButtons() {
			const selectedKey = getWallpaperItemKey(typeof ctx.getCurrentWallpaper === 'function' ? ctx.getCurrentWallpaper() : {});

			buttons.forEach((button) => {
				const selected = button.dataset.pdkWallpaperKey === selectedKey;

				button.classList.toggle('is-selected', selected);
				button.setAttribute('aria-pressed', selected ? 'true' : 'false');
			});
		}

		list.forEach((item) => {
			const button = document.createElement('button');
			const preview = ctx.dom.createElement('span', 'pdk-settings-personalization-wallpaper-preview');

			button.type = 'button';
			button.className = 'pdk-settings-personalization-wallpaper-button';
			button.dataset.pdkWallpaperKey = getWallpaperItemKey(item);
			button.setAttribute('aria-label', item.label || t(ctx, 'wallpaper.useAsWallpaperLabel', 'Use as Wallpaper'));
			button.setAttribute('aria-pressed', 'false');
			applyWallpaperItemPreview(preview, item);
			button.appendChild(preview);
			button.addEventListener('click', () => {
				if (typeof ctx.selectWallpaperItem !== 'function') {
					return;
				}

				const result = ctx.selectWallpaperItem(item, ctx.status);
				syncButtons();
				if (result && typeof result.then === 'function') {
					result.then(syncButtons);
				}
			});
			buttons.push(button);
			grid.appendChild(button);
		});
		syncButtons();

		return grid;
	}

	function applyWallpaperPreview(ctx, element) {
		applyWallpaperItemPreview(element, typeof ctx.getCurrentWallpaper === 'function' ? ctx.getCurrentWallpaper() : {});
	}

	function applyWallpaperItemPreview(element, item = {}) {
		if (item.swatch) {
			element.style.backgroundColor = item.swatch;
			element.style.backgroundImage = 'none';
			return;
		}
		if (item.preview || item.css_value) {
			element.style.backgroundImage = item.preview || item.css_value;
		}
	}

	function getWallpaperItemKey(item = {}) {
		if (!item || typeof item !== 'object') {
			return ':';
		}

		if (Number.parseInt(item.attachment_id, 10) > 0) {
			return `${item.type || ''}:${Number.parseInt(item.attachment_id, 10) || 0}`;
		}

		return `${item.type || ''}:${item.id || ''}`;
	}

	function t(ctx, path, fallback = '') {
		return typeof ctx.t === 'function' ? ctx.t(path, fallback) : fallback;
	}
})();
