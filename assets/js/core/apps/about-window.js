(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};
	window.AdminOSMode.apps = window.AdminOSMode.apps || {};

	window.AdminOSMode.apps.createAboutWindow = function createAboutWindow(app = {}) {
		const dom = window.AdminOSMode.dom;
		const about = app.about && typeof app.about === 'object' ? app.about : {};
		const name = about.name || app.label || 'Admin OS';
		const version = about.version || '';
		const copyright = about.copyright || '';
		const rights = about.rights || '';
		const icon = about.icon || app.icon || 'dashicons-admin-generic';
		const content = dom.createElement('div', 'aos-about');
		const iconWrap = dom.createElement('span', 'aos-about-icon');
		const title = dom.createElement('h1', '', name);
		const lines = dom.createElement('div', 'aos-about-lines');

		iconWrap.appendChild(dom.createIcon(icon));
		content.appendChild(iconWrap);
		content.appendChild(title);

		[version, copyright, rights].forEach((line) => {
			if (line) {
				lines.appendChild(dom.createElement('p', '', line));
			}
		});

		content.appendChild(lines);

		return content;
	};
})();
