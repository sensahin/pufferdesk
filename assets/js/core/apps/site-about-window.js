(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};
	window.AdminOSMode.apps = window.AdminOSMode.apps || {};

	window.AdminOSMode.apps.createSiteAboutWindow = function createSiteAboutWindow(siteInfo = {}) {
		const dom = window.AdminOSMode.dom;
		const content = dom.createElement('div', 'aos-site-about');
		const device = dom.createElement('div', 'aos-site-about-device');
		const screen = dom.createElement('div', 'aos-site-about-screen');
		const stand = dom.createElement('span', 'aos-site-about-stand');
		const aboutSubtitle = siteInfo.aboutSubtitle || siteInfo.tagline || siteInfo.url || '';
		const title = dom.createElement('h1', '', siteInfo.name || 'WordPress Site');
		const subtitle = dom.createElement('p', 'aos-site-about-subtitle', aboutSubtitle);
		const rows = dom.createElement('dl', 'aos-site-about-specs');
		const footer = dom.createElement('p', 'aos-site-about-footer', siteInfo.footer || '');
		const specs = Array.isArray(siteInfo.aboutRows) ? siteInfo.aboutRows : (Array.isArray(siteInfo.rows) ? siteInfo.rows : []);

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
		content.appendChild(device);
		content.appendChild(title);
		if (aboutSubtitle) {
			content.appendChild(subtitle);
		}

		specs.forEach((row) => {
			if (!row || !row.label || !row.value) {
				return;
			}

			const item = dom.createElement('div', 'aos-site-about-spec');
			item.appendChild(dom.createElement('dt', '', row.label));
			item.appendChild(dom.createElement('dd', '', row.value));
			rows.appendChild(item);
		});
		content.appendChild(rows);

		if (siteInfo.moreInfoCommand || siteInfo.moreInfoUrl) {
			const moreInfo = document.createElement('button');
			moreInfo.type = 'button';
			moreInfo.className = 'aos-site-about-button';
			moreInfo.textContent = siteInfo.moreInfoLabel || 'More Info...';
			moreInfo.addEventListener('click', () => {
				const commands = window.AdminOSMode && window.AdminOSMode.menuCommands;
				const command = siteInfo.moreInfoCommand || '';

				if (command && commands && typeof commands.execute === 'function') {
					const didExecute = commands.execute({
						command,
						icon: siteInfo.moreInfoIcon || 'dashicons-info',
						label: siteInfo.moreInfoLabel || 'More Info...',
						panel: siteInfo.moreInfoPanel || '',
						title: siteInfo.moreInfoTitle || siteInfo.moreInfoLabel || 'More Info...',
						url: siteInfo.moreInfoUrl || ''
					});

					if (didExecute) {
						return;
					}
				}

				if (siteInfo.moreInfoUrl && window.AdminOSMode.appLauncher && typeof window.AdminOSMode.appLauncher.openUrl === 'function') {
					window.AdminOSMode.appLauncher.openUrl(siteInfo.moreInfoUrl, siteInfo.moreInfoTitle || 'Site Health Info', siteInfo.moreInfoIcon || 'dashicons-heart');
				}
			});
			content.appendChild(moreInfo);
		}

		if (siteInfo.footer) {
			content.appendChild(footer);
		}

		return content;
	};
})();
