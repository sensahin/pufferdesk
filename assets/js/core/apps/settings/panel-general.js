(function () {
	'use strict';

	window.WPAdminOS = window.WPAdminOS || {};
	window.WPAdminOS.apps = window.WPAdminOS.apps || {};
	window.WPAdminOS.apps.settings = window.WPAdminOS.apps.settings || {};

	window.WPAdminOS.apps.settings.createGeneralPanel = function createGeneralPanel(ctx) {
		const general = ctx.getGeneralSettingsConfig();
		const groups = Array.isArray(general.groups) ? general.groups : [];
		const panel = ctx.dom.createElement('div', 'aos-settings-pane-panel aos-settings-general-panel');

		panel.dataset.aosSettingsPanel = 'general';
		panel.appendChild(ctx.createSettingsHero({
			description: general.description || ctx.t('generalPanel.description', 'Manage site information, updates, language, privacy, and WordPress tools.'),
			icon: 'dashicons-admin-generic',
			title: ctx.t('generalPanel.title', 'General')
		}));

		groups.forEach((group) => {
			const items = Array.isArray(group.items) ? group.items : [];
			if (!items.length) {
				return;
			}

			const section = ctx.createSection('', 'aos-settings-list');
			items.forEach((item) => {
				section.appendChild(ctx.createSettingsActionRow(item));
			});
			panel.appendChild(section);
		});

		return panel;
	};

	window.WPAdminOS.apps.settings.createGeneralAboutPanel = function createGeneralAboutPanel(ctx) {
		const dom = ctx.dom;
		const siteInfo = ctx.config.siteInfo && typeof ctx.config.siteInfo === 'object' ? ctx.config.siteInfo : {};
		const panel = dom.createElement('div', 'aos-settings-pane-panel aos-settings-about-panel');
		const hero = dom.createElement('div', 'aos-settings-about-hero');
		const diagnostics = createSettingsAboutDiagnostics(ctx, siteInfo);
		const wordpressSection = createSettingsAboutFeatureCard(ctx, siteInfo.wordpress);
		const displaySection = createSettingsAboutFeatureCard(ctx, siteInfo.display);

		panel.dataset.aosSettingsPanel = 'general-about';
		panel.dataset.aosSettingsSidebar = 'general';
		panel.dataset.aosSettingsTitle = ctx.t('generalPanel.aboutTitle', 'About');
		hero.appendChild(createSettingsAboutDevice(ctx, siteInfo));
		hero.appendChild(dom.createElement('h2', '', siteInfo.name || ctx.t('generalPanel.siteFallbackTitle', 'WordPress Site')));
		if (siteInfo.url) {
			hero.appendChild(dom.createElement('p', '', siteInfo.url));
		}

		panel.appendChild(hero);
		panel.appendChild(createSettingsAboutInfoCard(ctx, siteInfo));
		if (wordpressSection) {
			panel.appendChild(ctx.createSectionHeading(ctx.t('generalPanel.wordpressHeading', 'WordPress')));
			panel.appendChild(wordpressSection);
		}
		if (displaySection) {
			panel.appendChild(ctx.createSectionHeading(ctx.t('generalPanel.displaysHeading', 'Displays')));
			panel.appendChild(displaySection);
		}
		if (diagnostics) {
			panel.appendChild(ctx.createSectionHeading(ctx.t('generalPanel.diagnosticsHeading', 'Diagnostics')));
			panel.appendChild(diagnostics);
		}
		if (siteInfo.footer) {
			panel.appendChild(dom.createElement('p', 'aos-settings-about-footer', siteInfo.footer));
		}

		return panel;
	};

	function createSettingsAboutDevice(ctx, siteInfo = {}) {
		const dom = ctx.dom;
		const device = dom.createElement('div', 'aos-settings-about-device');
		const screen = dom.createElement('div', 'aos-settings-about-screen');
		const stand = dom.createElement('span', 'aos-settings-about-stand');

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
		const row = ctx.dom.createElement('div', 'aos-settings-about-info-row');

		row.appendChild(ctx.dom.createElement('span', 'aos-settings-about-info-label', label));
		row.appendChild(ctx.dom.createElement('span', 'aos-settings-about-info-value', value));

		return row;
	}

	function createSettingsAboutInfoCard(ctx, siteInfo = {}) {
		const section = ctx.createSection('', 'aos-settings-about-info-card');
		const rows = [
			{ label: ctx.t('generalPanel.nameLabel', 'Name'), value: siteInfo.name || '' },
			{ label: ctx.t('generalPanel.addressLabel', 'Address'), value: siteInfo.url || '' }
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
		const icon = ctx.dom.createElement('span', 'aos-settings-about-feature-icon');
		icon.appendChild(ctx.dom.createDashicon(iconName || 'dashicons-admin-generic'));

		return icon;
	}

	function createSettingsAboutFeatureCard(ctx, info = {}) {
		const dom = ctx.dom;
		if (!info || typeof info !== 'object' || !info.title) {
			return null;
		}

		const section = ctx.createSection('', 'aos-settings-about-feature-card');
		const row = dom.createElement('div', 'aos-settings-about-feature-row');
		const text = dom.createElement('span', 'aos-settings-about-feature-text');

		text.appendChild(dom.createElement('strong', '', info.title));
		if (info.description) {
			text.appendChild(dom.createElement('span', '', info.description));
		}

		row.appendChild(createSettingsAboutFeatureIcon(ctx, info.icon));
		row.appendChild(text);
		if (info.value) {
			row.appendChild(dom.createElement('span', 'aos-settings-about-feature-value', info.value));
		}
		section.appendChild(row);

		if (info.buttonLabel && info.buttonUrl) {
			const actionRow = dom.createElement('div', 'aos-settings-about-feature-action');
			const button = document.createElement('button');

			button.type = 'button';
			button.className = 'aos-settings-about-button';
			button.textContent = info.buttonLabel;
			button.addEventListener('click', () => {
				ctx.executeMenuCommand('open-url', {
					icon: info.buttonIcon || info.icon || 'dashicons-admin-generic',
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

		const section = ctx.createSection('', 'aos-settings-about-diagnostics');
		const row = dom.createElement('div', 'aos-settings-about-diagnostics-row');
		const text = dom.createElement('span', 'aos-settings-row-text');
		const button = document.createElement('button');

		button.type = 'button';
		button.className = 'aos-settings-about-button';
		button.textContent = siteInfo.moreInfoLabel || ctx.t('generalPanel.moreInfoLabel', 'More Info...');
		button.addEventListener('click', () => {
			ctx.executeMenuCommand('open-url', {
				icon: 'dashicons-heart',
				label: siteInfo.moreInfoLabel || ctx.t('generalPanel.moreInfoLabel', 'More Info...'),
				title: siteInfo.moreInfoTitle || ctx.t('generalPanel.moreInfoTitle', 'Site Health Info'),
				url: siteInfo.moreInfoUrl
			});
		});

		text.appendChild(dom.createElement('strong', '', ctx.t('generalPanel.diagnosticsTitle', 'Site Health')));
		text.appendChild(dom.createElement('span', '', ctx.t('generalPanel.diagnosticsDescription', 'WordPress diagnostics and environment report')));
		row.appendChild(ctx.createSettingsRowIcon('dashicons-heart', 'red'));
		row.appendChild(text);
		row.appendChild(button);
		section.appendChild(row);

		return section;
	}
})();
