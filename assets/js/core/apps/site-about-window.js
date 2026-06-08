(function () {
	'use strict';

	window.WPAdminOS = window.WPAdminOS || {};
	window.WPAdminOS.apps = window.WPAdminOS.apps || {};

	function addClassNames(element, classNames) {
		(Array.isArray(classNames) ? classNames : [classNames]).forEach((className) => {
			if (!className || typeof className !== 'string') {
				return;
			}

			className.split(/\s+/).filter(Boolean).forEach((name) => element.classList.add(name));
		});
	}

	function hasValue(value) {
		return value !== undefined && value !== null && String(value) !== '';
	}

	function getText(value, fallback = '') {
		return hasValue(value) ? String(value) : fallback;
	}

	function formatDate(value) {
		const timestamp = Date.parse(value);
		if (!Number.isFinite(timestamp)) {
			return 'Not available';
		}

		return new Intl.DateTimeFormat(undefined, {
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			month: 'long',
			weekday: 'long',
			year: 'numeric'
		}).format(new Date(timestamp));
	}

	function plural(count, singular, pluralLabel) {
		return `${count} ${count === 1 ? singular : pluralLabel}`;
	}

	function createHeader(options = {}) {
		const dom = window.WPAdminOS.dom;
		const header = dom.createElement('header', 'aos-info-panel-header');
		const icon = dom.createElement('span', 'aos-info-panel-icon');
		const headline = dom.createElement('div', 'aos-info-panel-headline');
		const title = dom.createElement('h1', 'aos-info-panel-title', getText(options.title, 'Info'));
		const subtitle = dom.createElement('p', 'aos-info-panel-subtitle', getText(options.subtitle));

		icon.appendChild(dom.createIcon(options.icon || 'dashicons-info'));
		headline.appendChild(title);
		if (hasValue(options.subtitle)) {
			headline.appendChild(subtitle);
		}

		header.append(icon, headline);

		if (hasValue(options.meta)) {
			header.appendChild(dom.createElement('strong', 'aos-info-panel-meta', options.meta));
		}

		return header;
	}

	function appendTitle(root, options = {}) {
		const dom = window.WPAdminOS.dom;

		if (hasValue(options.title)) {
			const title = dom.createElement('h1', 'aos-info-panel-title', options.title);
			addClassNames(title, options.titleClassName);
			root.appendChild(title);
		}

		if (hasValue(options.subtitle)) {
			const subtitle = dom.createElement('p', 'aos-info-panel-subtitle', options.subtitle);
			addClassNames(subtitle, options.subtitleClassName);
			root.appendChild(subtitle);
		}
	}

	function appendSpecs(root, rows = [], options = {}) {
		const dom = window.WPAdminOS.dom;
		const specs = dom.createElement('dl', 'aos-info-panel-specs');
		addClassNames(specs, options.specsClassName);

		rows.forEach((row) => {
			if (!row || !hasValue(row.label) || !hasValue(row.value)) {
				return;
			}

			const item = dom.createElement('div', 'aos-info-panel-spec');
			addClassNames(item, options.specClassName);
			item.appendChild(dom.createElement('dt', '', row.label));
			item.appendChild(dom.createElement('dd', '', row.value));
			specs.appendChild(item);
		});

		if (specs.children.length) {
			root.appendChild(specs);
		}
	}

	function createActionButton(options = {}) {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'aos-info-panel-button';
		addClassNames(button, options.className);
		button.textContent = options.label || 'More Info...';
		button.addEventListener('click', () => {
			if (typeof options.onClick === 'function') {
				options.onClick();
			}
		});

		return button;
	}

	function createDisclosure(title, options = {}) {
		const section = document.createElement('details');
		section.className = 'aos-info-panel-section';
		section.open = options.open !== false;

		const summary = document.createElement('summary');
		summary.className = 'aos-info-panel-summary';
		summary.textContent = title;

		const body = document.createElement('div');
		body.className = 'aos-info-panel-section-body';

		section.append(summary, body);

		return {
			body,
			section
		};
	}

	function appendDefinition(body, label, value) {
		const row = document.createElement('div');
		row.className = 'aos-info-panel-row';

		const term = document.createElement('span');
		term.className = 'aos-info-panel-term';
		term.textContent = `${label}:`;

		const description = document.createElement('span');
		description.className = 'aos-info-panel-value';
		description.textContent = hasValue(value) ? value : 'Not available';

		row.append(term, description);
		body.appendChild(row);
	}

	function createCheckbox(label, options = {}) {
		const item = document.createElement('label');
		item.className = 'aos-info-panel-checkbox';
		if (options.disabledStyle) {
			item.classList.add('is-disabled');
		}

		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.disabled = options.disabled !== false;
		checkbox.checked = Boolean(options.checked);

		const text = document.createElement('span');
		text.textContent = label;

		item.append(checkbox, text);

		return item;
	}

	function createInfoPanelWindow(options = {}) {
		const dom = window.WPAdminOS.dom;
		const content = dom.createElement('div', 'aos-info-panel');

		if (options.variant) {
			content.classList.add(`aos-info-panel-${options.variant}`);
		}

		if (options.layout) {
			content.dataset.aosInfoPanelLayout = options.layout;
		}

		addClassNames(content, options.className);

		if (options.hero) {
			content.appendChild(options.hero);
		}

		if (options.header) {
			content.appendChild(createHeader(options.header));
		}

		if (options.tagsPlaceholder) {
			content.appendChild(dom.createElement('div', 'aos-info-panel-tags', options.tagsPlaceholder));
		}

		appendTitle(content, options);
		appendSpecs(content, Array.isArray(options.specs) ? options.specs : [], options);

		if (Array.isArray(options.children)) {
			options.children.forEach((child) => {
				if (child instanceof window.Node) {
					content.appendChild(child);
				}
			});
		}

		if (options.action) {
			content.appendChild(createActionButton(options.action));
		}

		if (hasValue(options.footer)) {
			const footer = dom.createElement('p', 'aos-info-panel-footer', options.footer);
			addClassNames(footer, options.footerClassName);
			content.appendChild(footer);
		}

		return content;
	}

	function createSiteVisual(siteInfo = {}) {
		const dom = window.WPAdminOS.dom;
		const device = dom.createElement('div', 'aos-site-about-device');
		const screen = dom.createElement('div', 'aos-site-about-screen');
		const stand = dom.createElement('span', 'aos-site-about-stand');

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

	function openSiteMoreInfo(siteInfo = {}) {
		const commands = window.WPAdminOS && window.WPAdminOS.menuCommands;
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

		if (siteInfo.moreInfoUrl && window.WPAdminOS.appLauncher && typeof window.WPAdminOS.appLauncher.openUrl === 'function') {
			window.WPAdminOS.appLauncher.openUrl(siteInfo.moreInfoUrl, siteInfo.moreInfoTitle || 'Site Health Info', siteInfo.moreInfoIcon || 'dashicons-heart');
		}
	}

	function createSiteAboutWindow(siteInfo = {}) {
		const aboutSubtitle = siteInfo.aboutSubtitle || siteInfo.tagline || siteInfo.url || '';
		const specs = Array.isArray(siteInfo.aboutRows) ? siteInfo.aboutRows : (Array.isArray(siteInfo.rows) ? siteInfo.rows : []);

		return createInfoPanelWindow({
			action: siteInfo.moreInfoCommand || siteInfo.moreInfoUrl ? {
				className: 'aos-site-about-button',
				label: siteInfo.moreInfoLabel || 'More Info...',
				onClick: () => openSiteMoreInfo(siteInfo)
			} : null,
			className: 'aos-site-about',
			footer: siteInfo.footer || '',
			footerClassName: 'aos-site-about-footer',
			hero: createSiteVisual(siteInfo),
			layout: 'site',
			specClassName: 'aos-site-about-spec',
			specs,
			specsClassName: 'aos-site-about-specs',
			subtitle: aboutSubtitle,
			subtitleClassName: 'aos-site-about-subtitle',
			title: siteInfo.name || 'WordPress Site',
			variant: 'site'
		});
	}

	function createFolderInfoWindow(info = {}, actions = {}) {
		const itemCount = Number.parseInt(info.itemCount, 10) || 0;
		const general = createDisclosure('General:');
		const more = createDisclosure('More Info:');
		const name = createDisclosure('Name & Extension:');
		const comments = createDisclosure('Comments:');
		const preview = createDisclosure('Preview:', { open: false });
		const permissions = createDisclosure('Sharing & Permissions:', { open: false });

		appendDefinition(general.body, 'Kind', info.kind || 'Folder');
		appendDefinition(general.body, 'Size', `${plural(itemCount, 'item', 'items')} in this folder`);
		appendDefinition(general.body, 'Where', info.where || 'WP adminOS');
		appendDefinition(general.body, 'Source', info.source || 'WP adminOS');
		appendDefinition(general.body, 'Created', formatDate(info.createdAt));
		appendDefinition(general.body, 'Modified', formatDate(info.modifiedAt));

		const checks = document.createElement('div');
		checks.className = 'aos-info-panel-checks';
		['Shared folder', 'Locked'].forEach((label) => {
			checks.appendChild(createCheckbox(label));
		});
		general.body.appendChild(checks);

		appendDefinition(more.body, 'Last opened', formatDate(info.lastOpenedAt));
		appendDefinition(more.body, 'Contains', plural(itemCount, 'application', 'applications'));
		if (Array.isArray(info.items) && info.items.length) {
			appendDefinition(more.body, 'Apps', info.items.map((item) => item.label).join(', '));
		}

		const nameInput = document.createElement('input');
		nameInput.className = 'aos-info-panel-name-input';
		nameInput.type = 'text';
		nameInput.value = info.label || 'Folder';
		nameInput.disabled = !info.canRename;
		nameInput.addEventListener('change', () => {
			if (info.canRename && typeof actions.onRename === 'function') {
				actions.onRename(nameInput.value);
			}
		});
		name.body.appendChild(nameInput);
		name.body.appendChild(createCheckbox('Hide extension', {
			disabledStyle: true
		}));

		const textarea = document.createElement('textarea');
		textarea.className = 'aos-info-panel-comments';
		textarea.value = info.comment || '';
		textarea.disabled = !info.canComment;
		textarea.addEventListener('change', () => {
			if (info.canComment && typeof actions.onComment === 'function') {
				actions.onComment(textarea.value);
			}
		});
		comments.body.appendChild(textarea);

		const previewText = document.createElement('p');
		previewText.className = 'aos-info-panel-muted';
		previewText.textContent = itemCount ? `${plural(itemCount, 'application', 'applications')} available.` : 'No items to preview.';
		preview.body.appendChild(previewText);

		appendDefinition(permissions.body, 'Access', info.user ? 'Private to this WordPress user' : 'Visible to users with matching WordPress capabilities');

		return createInfoPanelWindow({
			children: [
				general.section,
				more.section,
				name.section,
				comments.section,
				preview.section,
				permissions.section
			],
			header: {
				icon: info.icon || 'dashicons-category',
				meta: plural(itemCount, 'item', 'items'),
				subtitle: `Modified: ${formatDate(info.modifiedAt)}`,
				title: info.label || 'Folder'
			},
			layout: 'inspector',
			tagsPlaceholder: 'Add Tags...',
			variant: 'folder'
		});
	}

	window.WPAdminOS.apps.createInfoPanelWindow = createInfoPanelWindow;
	window.WPAdminOS.apps.createSiteAboutWindow = createSiteAboutWindow;
	window.WPAdminOS.apps.createFolderInfoWindow = createFolderInfoWindow;
})();
