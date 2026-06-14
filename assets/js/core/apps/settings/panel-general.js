(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};
	window.PufferDesk.apps.settings = window.PufferDesk.apps.settings || {};

	const commandIds = (window.PufferDesk.shell && window.PufferDesk.shell.commands) || {};

	window.PufferDesk.apps.settings.createGeneralPanel = function createGeneralPanel(ctx) {
		if (ctx.isWindowsSettingsLayout || ctx.settingsLayout === 'windows-settings') {
			return createWindowsHomePanel(ctx);
		}

		const general = ctx.getGeneralSettingsConfig();
		const groups = Array.isArray(general.groups) ? general.groups : [];
		const panel = ctx.dom.createElement('div', 'pdk-settings-pane-panel pdk-settings-general-panel');

		panel.dataset.pdkSettingsPanel = 'general';
		panel.appendChild(ctx.createSettingsHero({
			description: general.description || ctx.t('generalPanel.description'),
			icon: 'dashicons-admin-generic',
			title: ctx.t('generalPanel.title')
		}));

		groups.forEach((group) => {
			const items = Array.isArray(group.items) ? group.items : [];
			if (!items.length) {
				return;
			}

			const section = ctx.createSection('', 'pdk-settings-list');
			items.forEach((item) => {
				section.appendChild(ctx.createSettingsActionRow(item));
			});
			panel.appendChild(section);
		});

		return panel;
	};

	function createWindowsHomePanel(ctx) {
		const dom = ctx.dom;
		const panel = dom.createElement('div', 'pdk-settings-pane-panel pdk-settings-general-panel pdk-settings-windows-home-panel');
		const general = ctx.getGeneralSettingsConfig();
		const home = general.home && typeof general.home === 'object' ? general.home : {};
		const siteInfo = ctx.config.siteInfo && typeof ctx.config.siteInfo === 'object' ? ctx.config.siteInfo : {};
		const cards = createWindowsHomeCards(ctx);

		panel.dataset.pdkSettingsPanel = 'general';
		panel.appendChild(createWindowsHomeTop(ctx, home, siteInfo));
		panel.appendChild(createWindowsHomeUpdateNotice(ctx, home));
		panel.appendChild(cards);
		panel.appendChild(createWindowsHomeFooter(ctx, home));
		panel.pdkRefreshSettingsHome = () => {
			if (cards && typeof cards.pdkRefreshSettingsRecommendations === 'function') {
				cards.pdkRefreshSettingsRecommendations();
			}
		};

		return panel;
	}

	function createWindowsHomeTop(ctx, home, siteInfo) {
		const dom = ctx.dom;
		const row = dom.createElement('section', 'pdk-settings-home-top');
		const device = dom.createElement('div', 'pdk-settings-home-device');
		const preview = dom.createElement('span', 'pdk-settings-home-device-preview');
		const text = dom.createElement('span', 'pdk-settings-home-device-text');
		const status = dom.createElement('div', 'pdk-settings-home-status');
		const title = siteInfo.name || ctx.t('generalPanel.siteFallbackTitle');
		const subtitle = siteInfo.tagline || siteInfo.url || ctx.t('generalPanel.home.siteSubtitleFallback');

		applyHomeWallpaperPreview(ctx, preview);
		text.appendChild(dom.createElement('strong', '', title));
		if (subtitle) {
			text.appendChild(dom.createElement('span', '', subtitle));
		}
		if (home.siteSettingsUrl) {
			text.appendChild(createHomeUrlButton(ctx, {
				className: 'pdk-settings-home-inline-link',
				icon: 'dashicons-admin-settings',
				label: ctx.t('generalPanel.home.renameLabel'),
				title: ctx.t('generalPanel.home.siteSettingsTitle'),
				url: home.siteSettingsUrl
			}));
		}
		device.append(preview, text);
		row.appendChild(device);

		createWindowsHomeStatusItems(ctx, home).forEach((item) => {
			status.appendChild(item);
		});
		if (status.children.length) {
			row.appendChild(status);
		}

		return row;
	}

	function createWindowsHomeStatusItems(ctx, home) {
		const updates = home.wordpressUpdates && typeof home.wordpressUpdates === 'object'
			? home.wordpressUpdates
			: {};
		const label = updates.label || ctx.t('generalPanel.home.updatesTitle');
		const status = updates.status || ctx.t('generalPanel.home.updatesCurrent');

		return [
			createHomeTile(ctx, {
				className: updates.count > 0 ? 'has-attention' : '',
				description: status,
				icon: 'dashicons-update',
				label,
				url: updates.url,
				windowTitle: updates.title || label
			})
		];
	}

	function createWindowsHomeUpdateNotice(ctx, home) {
		const dom = ctx.dom;
		const updates = home.wordpressUpdates && typeof home.wordpressUpdates === 'object'
			? home.wordpressUpdates
			: {};

		if (!updates.count || updates.count <= 0) {
			return dom.createElement('div', 'pdk-settings-home-update-notice is-empty');
		}

		const notice = dom.createElement('section', 'pdk-settings-home-update-notice');
		const text = dom.createElement('span', 'pdk-settings-home-update-text');

		text.appendChild(ctx.createSettingsRowIcon('dashicons-info', 'blue'));
		text.appendChild(dom.createElement('span', '', updates.description || ctx.t('generalPanel.home.updatesAttentionDescription')));
		notice.appendChild(text);
		if (updates.url) {
			notice.appendChild(createHomeUrlButton(ctx, {
				className: 'pdk-settings-home-update-link',
				icon: 'dashicons-update',
				label: ctx.t('generalPanel.home.updatesActionLabel'),
				title: updates.title || ctx.t('generalPanel.home.updatesTitle'),
				url: updates.url
			}));
		}

		return notice;
	}

	function createWindowsHomeCards(ctx) {
		const dom = ctx.dom;
		const grid = dom.createElement('div', 'pdk-settings-home-grid');
		const recommendedCard = createWindowsHomeRecommendedCard(ctx);

		grid.appendChild(recommendedCard);
		grid.appendChild(createWindowsHomePersonalizeCard(ctx));
		grid.pdkRefreshSettingsRecommendations = () => {
			if (recommendedCard && typeof recommendedCard.pdkRefreshSettingsRecommendations === 'function') {
				recommendedCard.pdkRefreshSettingsRecommendations();
			}
		};

		return grid;
	}

	function createWindowsHomePersonalizeCard(ctx) {
		const dom = ctx.dom;
		const card = createHomeCard(ctx, {
			className: 'pdk-settings-home-card-personalize',
			title: ctx.t('generalPanel.home.personalizeTitle')
		});
		const thumbnails = dom.createElement('div', 'pdk-settings-home-wallpapers');
		const wallpaperItems = getHomePersonalizeWallpaperItems(ctx);
		const wallpaperButtons = [];

		function syncWallpaperButtons() {
			const currentKey = getHomeWallpaperItemKey(
				typeof ctx.getCurrentWallpaper === 'function' ? ctx.getCurrentWallpaper() : {}
			);

			wallpaperButtons.forEach((button) => {
				const selected = button.dataset.pdkWallpaperKey === currentKey;

				button.classList.toggle('is-selected', selected);
				button.setAttribute('aria-pressed', selected ? 'true' : 'false');
			});
		}

		wallpaperItems.forEach((item) => {
			const button = document.createElement('button');
			const preview = dom.createElement('span', 'pdk-settings-home-wallpaper-preview');

			button.type = 'button';
			button.className = 'pdk-settings-home-wallpaper-button';
			button.dataset.pdkWallpaperKey = getHomeWallpaperItemKey(item);
			button.setAttribute('aria-label', item.label || ctx.t('wallpaper.title'));
			button.setAttribute('aria-pressed', 'false');
			applyHomeWallpaperItemPreview(preview, item);
			button.appendChild(preview);
			button.addEventListener('click', () => {
				if (typeof ctx.selectWallpaperItem !== 'function') {
					openHomePanel(ctx, 'wallpaper');
					return;
				}

				const result = ctx.selectWallpaperItem(item, ctx.status);
				syncWallpaperButtons();
				if (result && typeof result.then === 'function') {
					result.then(syncWallpaperButtons);
				}
			});
			wallpaperButtons.push(button);
			thumbnails.appendChild(button);
		});

		if (thumbnails.children.length) {
			card.appendChild(thumbnails);
		}
		card.appendChild(createHomeColorModeRow(ctx));
		card.appendChild(createHomeBrowsePersonalizeButton(ctx));
		syncWallpaperButtons();

		return card;
	}

	function createHomeColorModeRow(ctx) {
		const dom = ctx.dom;
		const row = dom.createElement('div', 'pdk-settings-home-color-mode-row');
		const currentAppearance = typeof ctx.getAppearance === 'function' ? ctx.getAppearance() : {};
		const options = ctx.settingsLabels && typeof ctx.settingsLabels.getOptions === 'function'
			? ctx.settingsLabels.getOptions('appearance.modeOptions')
			: [];
		const select = ctx.createInlineSelect({
			className: 'pdk-settings-home-color-mode-select',
			disabled: !options.length,
			onChange: (mode) => {
				if (typeof ctx.updateAppearance === 'function') {
					ctx.updateAppearance('mode', mode, ctx.status);
				}
			},
			options,
			value: currentAppearance.mode || 'auto'
		});

		row.appendChild(ctx.createSettingsRowIcon('dashicons-admin-appearance', 'gray'));
		row.appendChild(dom.createElement('span', 'pdk-settings-home-color-mode-label', ctx.t('generalPanel.home.colorModeLabel')));
		row.appendChild(select.wrap);

		return row;
	}

	function createHomeBrowsePersonalizeButton(ctx) {
		const dom = ctx.dom;
		const button = document.createElement('button');

		button.type = 'button';
		button.className = 'pdk-settings-home-browse-button';
		button.dataset.pdkSettingsHomePanel = 'appearance';
		button.appendChild(dom.createElement('span', 'pdk-settings-home-browse-label', ctx.t('generalPanel.home.browsePersonalizeLabel')));
		button.appendChild(dom.createElement('span', 'pdk-settings-row-chevron'));
		button.addEventListener('click', () => openHomePanel(ctx, 'appearance'));

		return button;
	}

	function createWindowsHomeRecommendedCard(ctx) {
		const dom = ctx.dom;
		const card = createHomeCard(ctx, {
			className: 'pdk-settings-home-card-recommended',
			description: ctx.t('generalPanel.home.recommendedDescription'),
			title: ctx.t('generalPanel.home.recommendedTitle')
		});
		const list = dom.createElement('div', 'pdk-settings-home-recommended-list');

		function renderRows() {
			list.textContent = '';
			getRecommendedSettingsRows(ctx).forEach((row) => {
				list.appendChild(createHomePanelButton(ctx, {
					className: 'pdk-settings-home-recommended-row',
					icon: row.icon,
					label: row.label,
					panel: row.id,
					tone: row.tone
				}));
			});
		}

		renderRows();
		card.pdkRefreshSettingsRecommendations = renderRows;
		card.appendChild(list);

		return card;
	}

	function createWindowsHomeFooter(ctx, home) {
		const dom = ctx.dom;
		const footer = dom.createElement('div', 'pdk-settings-home-footer');
		const links = Array.isArray(home.helpLinks) ? home.helpLinks : [];

		links.forEach((link) => {
			if (!link || !link.url || !link.label) {
				return;
			}

			footer.appendChild(createHomeUrlButton(ctx, {
				className: 'pdk-settings-home-footer-link',
				icon: link.icon || 'dashicons-editor-help',
				label: link.label,
				title: link.title || link.label,
				url: link.url,
				withIcon: true
			}));
		});

		return footer;
	}

	function createHomeCard(ctx, options = {}) {
		const dom = ctx.dom;
		const card = dom.createElement('section', `pdk-settings-home-card ${options.className || ''}`.trim());
		const header = dom.createElement('span', 'pdk-settings-home-card-header');
		const text = dom.createElement('span', 'pdk-settings-home-card-text');

		if (options.icon) {
			header.appendChild(ctx.createSettingsRowIcon(options.icon, options.tone || 'gray'));
		}
		text.appendChild(dom.createElement('strong', '', options.title || ''));
		if (options.description) {
			text.appendChild(dom.createElement('span', '', options.description));
		}
		header.appendChild(text);
		card.appendChild(header);

		return card;
	}

	function createHomeTile(ctx, options = {}) {
		const dom = ctx.dom;
		const tile = options.url ? document.createElement('button') : dom.createElement('div');
		const text = dom.createElement('span', 'pdk-settings-home-tile-text');

		if (options.url) {
			tile.type = 'button';
			tile.dataset.pdkOpenUrl = options.url;
			tile.dataset.pdkTitle = options.windowTitle || options.label || '';
			tile.dataset.pdkIcon = options.icon || dom.getDefaultDashicon();
		}
		tile.className = `pdk-settings-home-tile ${options.className || ''}`.trim();
		tile.appendChild(ctx.createSettingsRowIcon(options.icon || dom.getDefaultDashicon(), options.tone || 'blue'));
		text.appendChild(dom.createElement('strong', '', options.label || ''));
		if (options.description) {
			text.appendChild(dom.createElement('span', '', options.description));
		}
		tile.appendChild(text);

		return tile;
	}

	function createHomePanelButton(ctx, options = {}) {
		const dom = ctx.dom;
		const button = document.createElement('button');
		const text = dom.createElement('span', 'pdk-settings-home-panel-text');

		button.type = 'button';
		button.className = `pdk-settings-home-panel-button ${options.className || ''}`.trim();
		if (options.panel) {
			button.dataset.pdkSettingsHomePanel = options.panel;
		}
		button.appendChild(ctx.createSettingsRowIcon(options.icon || dom.getDefaultDashicon(), options.tone || 'gray'));
		text.appendChild(dom.createElement('strong', '', options.label || ''));
		if (options.description) {
			text.appendChild(dom.createElement('span', '', options.description));
		}
		button.appendChild(text);
		button.appendChild(dom.createElement('span', 'pdk-settings-row-chevron'));
		button.addEventListener('click', () => openHomePanel(ctx, options.panel));

		return button;
	}

	function createHomeUrlButton(ctx, options = {}) {
		const button = document.createElement('button');

		button.type = 'button';
		button.className = options.className || 'pdk-settings-home-link';
		button.dataset.pdkOpenUrl = options.url || '';
		button.dataset.pdkTitle = options.title || options.label || '';
		button.dataset.pdkIcon = options.icon || ctx.dom.getDefaultDashicon();
		if (options.withIcon && options.icon) {
			const icon = ctx.dom.createElement('span', 'pdk-settings-home-link-icon');

			icon.appendChild(ctx.dom.createDashicon(options.icon));
			button.appendChild(icon);
			button.appendChild(ctx.dom.createElement('span', 'pdk-settings-home-link-label', options.label || ''));
		} else {
			button.textContent = options.label || '';
		}

		return button;
	}

	function openHomePanel(ctx, panelId) {
		if (panelId && typeof ctx.openSettingsPanel === 'function') {
			ctx.openSettingsPanel(panelId);
		}
	}

	function getSidebarLabel(ctx, id, fallback) {
		const item = getSidebarItem(ctx, id);

		return item && item.label ? item.label : fallback;
	}

	function getSidebarItems(ctx) {
		return ctx.settingsLabels && typeof ctx.settingsLabels.getOptions === 'function'
			? ctx.settingsLabels.getOptions('sidebar.items').filter((item) => item && item.visible !== false && !item.disabled)
			: [];
	}

	function getSidebarItem(ctx, id) {
		return getSidebarItems(ctx).find((option) => option && option.id === id) || null;
	}

	function getRecommendedSettingsRows(ctx) {
		const defaults = ['desktop-dock', 'notifications', 'appearance'];
		const items = getSidebarItems(ctx).filter((item) => item.id && !['general', 'profile'].includes(item.id));
		const byId = new Map(items.map((item) => [item.id, item]));
		const usage = typeof ctx.getSettingsUsage === 'function' ? ctx.getSettingsUsage() : { panels: {} };
		const panels = usage && usage.panels && typeof usage.panels === 'object' ? usage.panels : {};
		const ids = Object.keys(panels)
			.filter((id) => byId.has(id))
			.sort((a, b) => {
				const left = panels[a] || {};
				const right = panels[b] || {};
				const recent = (Number.parseInt(right.lastVisitedAt, 10) || 0) - (Number.parseInt(left.lastVisitedAt, 10) || 0);

				if (recent) {
					return recent;
				}

				return (Number.parseInt(right.count, 10) || 0) - (Number.parseInt(left.count, 10) || 0);
			});

		defaults.forEach((id) => {
			if (byId.has(id) && !ids.includes(id)) {
				ids.push(id);
			}
		});

		items.forEach((item) => {
			if (ids.length < 3 && !ids.includes(item.id)) {
				ids.push(item.id);
			}
		});

		return ids.slice(0, 3).map((id) => {
			const item = byId.get(id);

			return {
				icon: item.icon || ctx.dom.getDefaultDashicon(),
				id,
				label: item.label || id,
				tone: item.tone || 'gray'
			};
		});
	}

	function getHomePersonalizeWallpaperItems(ctx) {
		const wallpapers = typeof ctx.getWallpaperGroup === 'function' ? ctx.getWallpaperGroup('wallpapers') : [];

		return wallpapers.filter((item) => item && typeof item === 'object').slice(0, 6);
	}

	function getHomeWallpaperItemKey(item = {}) {
		if (!item || typeof item !== 'object') {
			return ':';
		}

		if (Number.parseInt(item.attachment_id, 10) > 0) {
			return `${item.type || ''}:${Number.parseInt(item.attachment_id, 10) || 0}`;
		}

		return `${item.type || ''}:${item.id || ''}`;
	}

	function getHomeWallpaperItems(ctx) {
		const wallpapers = typeof ctx.getWallpaperGroup === 'function' ? ctx.getWallpaperGroup('wallpapers') : [];
		const colors = typeof ctx.getWallpaperGroup === 'function' ? ctx.getWallpaperGroup('colors') : [];

		return wallpapers.concat(colors).filter((item) => item && typeof item === 'object');
	}

	function applyHomeWallpaperPreview(ctx, preview) {
		const current = typeof ctx.getCurrentWallpaper === 'function'
			? ctx.getCurrentWallpaper()
			: {};
		const items = getHomeWallpaperItems(ctx);
		const item = current && Object.keys(current).length ? current : items[0];

		applyHomeWallpaperItemPreview(preview, item || {});
	}

	function applyHomeWallpaperItemPreview(element, item = {}) {
		if (item.swatch) {
			element.style.backgroundColor = item.swatch;
		}
		if (item.preview || item.css_value) {
			element.style.backgroundImage = item.preview || item.css_value;
		}
	}

	window.PufferDesk.apps.settings.createGeneralAboutPanel = function createGeneralAboutPanel(ctx) {
		const dom = ctx.dom;
		const siteInfo = ctx.config.siteInfo && typeof ctx.config.siteInfo === 'object' ? ctx.config.siteInfo : {};
		const panel = dom.createElement('div', 'pdk-settings-pane-panel pdk-settings-about-panel');
		const hero = dom.createElement('div', 'pdk-settings-about-hero');
		const diagnostics = createSettingsAboutDiagnostics(ctx, siteInfo);
		const wordpressSection = createSettingsAboutFeatureCard(ctx, siteInfo.wordpress);
		const displaySection = createSettingsAboutFeatureCard(ctx, siteInfo.display);

		panel.dataset.pdkSettingsPanel = 'general-about';
		panel.dataset.pdkSettingsSidebar = 'general';
		panel.dataset.pdkSettingsTitle = ctx.t('generalPanel.aboutTitle');
		hero.appendChild(createSettingsAboutDevice(ctx, siteInfo));
		hero.appendChild(dom.createElement('h2', '', siteInfo.name || ctx.t('generalPanel.siteFallbackTitle')));
		if (siteInfo.url) {
			hero.appendChild(dom.createElement('p', '', siteInfo.url));
		}

		panel.appendChild(hero);
		panel.appendChild(createSettingsAboutInfoCard(ctx, siteInfo));
		if (wordpressSection) {
			panel.appendChild(ctx.createSectionHeading(ctx.t('generalPanel.wordpressHeading')));
			panel.appendChild(wordpressSection);
		}
		if (displaySection) {
			panel.appendChild(ctx.createSectionHeading(ctx.t('generalPanel.displaysHeading')));
			panel.appendChild(displaySection);
		}
		if (diagnostics) {
			panel.appendChild(ctx.createSectionHeading(ctx.t('generalPanel.diagnosticsHeading')));
			panel.appendChild(diagnostics);
		}
		if (siteInfo.footer) {
			panel.appendChild(dom.createElement('p', 'pdk-settings-about-footer', siteInfo.footer));
		}

		return panel;
	};

	function createSettingsAboutDevice(ctx, siteInfo = {}) {
		const dom = ctx.dom;
		const device = dom.createElement('div', 'pdk-settings-about-device');
		const screen = dom.createElement('div', 'pdk-settings-about-screen');
		const stand = dom.createElement('span', 'pdk-settings-about-stand');

		if (siteInfo.iconUrl) {
			const image = document.createElement('img');
			image.src = siteInfo.iconUrl;
			image.alt = '';
			image.loading = 'lazy';
			image.decoding = 'async';
			screen.appendChild(image);
		} else {
			screen.appendChild(dom.createDashicon('dashicons-wordpress'));
		}

		device.append(screen, stand);

		return device;
	}

	function createSettingsAboutInfoRow(ctx, label, value) {
		const row = ctx.dom.createElement('div', 'pdk-settings-about-info-row');

		row.appendChild(ctx.dom.createElement('span', 'pdk-settings-about-info-label', label));
		row.appendChild(ctx.dom.createElement('span', 'pdk-settings-about-info-value', value));

		return row;
	}

	function createSettingsAboutInfoCard(ctx, siteInfo = {}) {
		const section = ctx.createSection('', 'pdk-settings-about-info-card');
		const rows = [
			{ label: ctx.t('generalPanel.nameLabel'), value: siteInfo.name || '' },
			{ label: ctx.t('generalPanel.addressLabel'), value: siteInfo.url || '' }
		].concat(Array.isArray(siteInfo.rows) ? siteInfo.rows : []);

		rows.forEach((row) => {
			if (!row || !row.label || !row.value) {
				return;
			}

			section.appendChild(createSettingsAboutInfoRow(ctx, row.label, row.value));
		});

		return section;
	}

	function createSettingsAboutFeatureIcon(ctx, iconName) {
		const icon = ctx.dom.createElement('span', 'pdk-settings-about-feature-icon');
		icon.appendChild(ctx.dom.createDashicon(iconName));

		return icon;
	}

	function createSettingsAboutFeatureCard(ctx, info = {}) {
		const dom = ctx.dom;
		if (!info || typeof info !== 'object' || !info.title) {
			return null;
		}

		const section = ctx.createSection('', 'pdk-settings-about-feature-card');
		const row = dom.createElement('div', 'pdk-settings-about-feature-row');
		const text = dom.createElement('span', 'pdk-settings-about-feature-text');

		text.appendChild(dom.createElement('strong', '', info.title));
		if (info.description) {
			text.appendChild(dom.createElement('span', '', info.description));
		}

		row.appendChild(createSettingsAboutFeatureIcon(ctx, info.icon));
		row.appendChild(text);
		if (info.value) {
			row.appendChild(dom.createElement('span', 'pdk-settings-about-feature-value', info.value));
		}
		section.appendChild(row);

		if (info.buttonLabel && info.buttonUrl) {
			const actionRow = dom.createElement('div', 'pdk-settings-about-feature-action');
			const button = document.createElement('button');

			button.type = 'button';
			button.className = 'pdk-settings-about-button';
			button.textContent = info.buttonLabel;
			button.addEventListener('click', () => {
				ctx.executeMenuCommand(commandIds.OPEN_URL, {
					icon: info.buttonIcon || info.icon || ctx.dom.getDefaultDashicon(),
					label: info.buttonLabel,
					title: info.buttonTitle || info.buttonLabel,
					url: info.buttonUrl
				});
			});
			actionRow.appendChild(button);
			section.appendChild(actionRow);
		}

		return section;
	}

	function createSettingsAboutDiagnostics(ctx, siteInfo = {}) {
		const dom = ctx.dom;
		if (!siteInfo.moreInfoUrl) {
			return null;
		}

		const section = ctx.createSection('', 'pdk-settings-about-diagnostics');
		const row = dom.createElement('div', 'pdk-settings-about-diagnostics-row');
		const text = dom.createElement('span', 'pdk-settings-row-text');
		const button = document.createElement('button');

		button.type = 'button';
		button.className = 'pdk-settings-about-button';
		button.textContent = siteInfo.moreInfoLabel || ctx.t('generalPanel.moreInfoLabel');
		button.addEventListener('click', () => {
			ctx.executeMenuCommand(commandIds.OPEN_URL, {
				icon: 'dashicons-heart',
				label: siteInfo.moreInfoLabel || ctx.t('generalPanel.moreInfoLabel'),
				title: siteInfo.moreInfoTitle || ctx.t('generalPanel.moreInfoTitle'),
				url: siteInfo.moreInfoUrl
			});
		});

		text.appendChild(dom.createElement('strong', '', ctx.t('generalPanel.diagnosticsTitle')));
		text.appendChild(dom.createElement('span', '', ctx.t('generalPanel.diagnosticsDescription')));
		row.appendChild(ctx.createSettingsRowIcon('dashicons-heart', 'red'));
		row.appendChild(text);
		row.appendChild(button);
		section.appendChild(row);

		return section;
	}
})();
