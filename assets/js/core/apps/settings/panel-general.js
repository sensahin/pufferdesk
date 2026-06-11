(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};
	window.PufferDesk.apps.settings = window.PufferDesk.apps.settings || {};

	const commandIds = (window.PufferDesk.shell && window.PufferDesk.shell.commands) || {};

	window.PufferDesk.apps.settings.createGeneralPanel = function createGeneralPanel(ctx) {
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
