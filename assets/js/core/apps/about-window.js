(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};

	window.PufferDesk.apps.createAboutWindow = function createAboutWindow(app = {}) {
		const dom = window.PufferDesk.dom;
		const about = app.about && typeof app.about === 'object' ? app.about : {};
		const name = about.name || app.label || 'PufferDesk';
		const version = about.version || '';
		const copyright = about.copyright || '';
		const rights = about.rights || '';
		const detailLines = Array.isArray(about.lines) && about.lines.length ? about.lines : [version, copyright, rights];
		const icon = about.icon || app.icon || 'dashicons-admin-generic';
		const content = dom.createElement('div', 'pdk-about');
		const iconWrap = dom.createElement('span', 'pdk-about-icon');
		const title = dom.createElement('h1', '', name);
		const lines = dom.createElement('div', 'pdk-about-lines');

		iconWrap.appendChild(dom.createIcon(icon));
		content.appendChild(iconWrap);
		content.appendChild(title);

		detailLines.forEach((line) => {
			if (line) {
				lines.appendChild(dom.createElement('p', '', line));
			}
		});

		content.appendChild(lines);

		return content;
	};
})();
