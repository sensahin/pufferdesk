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
		const title = dom.createElement('h1', '', siteInfo.name || 'WordPress Site');
		const subtitle = dom.createElement('p', 'aos-site-about-subtitle', siteInfo.url || '');
		const rows = dom.createElement('dl', 'aos-site-about-specs');
		const footer = dom.createElement('p', 'aos-site-about-footer', siteInfo.footer || '');

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
		if (siteInfo.url) {
			content.appendChild(subtitle);
		}

		(Array.isArray(siteInfo.rows) ? siteInfo.rows : []).forEach((row) => {
			if (!row || !row.label || !row.value) {
				return;
			}

			const item = dom.createElement('div', 'aos-site-about-spec');
			item.appendChild(dom.createElement('dt', '', row.label));
			item.appendChild(dom.createElement('dd', '', row.value));
			rows.appendChild(item);
		});
		content.appendChild(rows);

		if (siteInfo.moreInfoUrl) {
			const moreInfo = document.createElement('button');
			moreInfo.type = 'button';
			moreInfo.className = 'aos-site-about-button';
			moreInfo.dataset.aosOpenUrl = siteInfo.moreInfoUrl;
			moreInfo.dataset.aosTitle = siteInfo.moreInfoTitle || 'Site Health Info';
			moreInfo.dataset.aosIcon = 'dashicons-heart';
			moreInfo.textContent = siteInfo.moreInfoLabel || 'More Info...';
			content.appendChild(moreInfo);
		}

		if (siteInfo.footer) {
			content.appendChild(footer);
		}

		return content;
	};
})();
