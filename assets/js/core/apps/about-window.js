(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};

	window.PufferDesk.apps.createAboutWindow = function createAboutWindow(app = {}) {
		const dom = window.PufferDesk.dom;
		const about = app.about && typeof app.about === 'object' ? app.about : {};
		const labels = window.PufferDesk.config && typeof window.PufferDesk.config.getLabels === 'function'
			? window.PufferDesk.config.getLabels()
			: {};
		const name = about.name || app.label || labels.system || 'system';
		const description = about.description || app.description || '';
		const version = about.version || '';
		const copyright = about.copyright || '';
		const rights = about.rights || '';
		const detailLines = Array.isArray(about.lines) && about.lines.length ? about.lines : [version, copyright, rights];
		const icon = about.icon || app.icon;
		const content = dom.createElement('div', 'pdk-about');
		const iconWrap = dom.createElement('span', 'pdk-about-icon');
		const contentColumn = dom.createElement('div', 'pdk-about-content');
		const title = dom.createElement('h1', '', name);
		const lines = dom.createElement('div', 'pdk-about-lines');
		let hasLines = false;

		iconWrap.appendChild(dom.createIcon(icon));
		content.appendChild(iconWrap);
		contentColumn.appendChild(title);

		if (description) {
			contentColumn.appendChild(dom.createElement('p', 'pdk-about-description', description));
		}

		detailLines.forEach((line) => {
			if (line) {
				lines.appendChild(dom.createElement('p', '', line));
				hasLines = true;
			}
		});

		if (hasLines) {
			contentColumn.appendChild(lines);
		}

		content.appendChild(contentColumn);

		return content;
	};
})();
