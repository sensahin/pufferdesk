(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};

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

	function getRuntimeConfig() {
		const configApi = window.PufferDesk.config;

		return configApi && typeof configApi.get === 'function' ? configApi.get() : {};
	}

	function getInfoPanelLabels() {
		const config = getRuntimeConfig();
		const infoPanel = config.infoPanel && typeof config.infoPanel === 'object' ? config.infoPanel : {};

		return infoPanel.labels && typeof infoPanel.labels === 'object' ? infoPanel.labels : {};
	}

	function getThemeFamily() {
		const config = getRuntimeConfig();

		return config.theme && typeof config.theme.family === 'string' ? config.theme.family : '';
	}

	function isRedmondFamily() {
		return getThemeFamily() === 'redmond';
	}

	function getInfoPanelLabel(key, fallback = '', labels = null) {
		const source = labels && typeof labels === 'object' ? labels : getInfoPanelLabels();
		const value = source[key];

		return typeof value === 'string' && value ? value : fallback;
	}

	function formatInfoPanelLabel(key, fallback = '', values = [], labels = null) {
		const source = labels && typeof labels === 'object' ? labels : getInfoPanelLabels();
		const configApi = window.PufferDesk.config;

		if (configApi && typeof configApi.formatFromLabels === 'function') {
			return configApi.formatFromLabels(source, key, fallback, values);
		}

		let index = 0;

		return String(getInfoPanelLabel(key, fallback, source)).replace(/%(\d+)\$[sd]/g, (match, position) => {
			const valueIndex = Number(position) - 1;
			return String(values[valueIndex] ?? '');
		}).replace(/%d|%s/g, () => String(values[index++] ?? ''));
	}

	function formatDate(value, labels = null) {
		const timestamp = Date.parse(value);
		if (!Number.isFinite(timestamp)) {
			return getInfoPanelLabel('notAvailable', '', labels);
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

	function formatPropertiesDate(value, labels = null) {
		const timestamp = Date.parse(value);
		if (!Number.isFinite(timestamp)) {
			return getInfoPanelLabel('notAvailable', '', labels);
		}

		return new Intl.DateTimeFormat(undefined, {
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			month: 'long',
			second: '2-digit',
			weekday: 'long',
			year: 'numeric'
		}).format(new Date(timestamp));
	}

	function plural(count, singular, pluralLabel, labels = null) {
		return formatInfoPanelLabel('itemCountTemplate', '', [count, count === 1 ? singular : pluralLabel], labels);
	}

	function createHeader(options = {}) {
		const dom = window.PufferDesk.dom;
		const header = dom.createElement('header', 'pdk-info-panel-header');
		const icon = dom.createElement('span', 'pdk-info-panel-icon');
		const headline = dom.createElement('div', 'pdk-info-panel-headline');
		const title = dom.createElement('h1', 'pdk-info-panel-title', getText(options.title, getInfoPanelLabel('infoFallbackTitle')));
		const subtitle = dom.createElement('p', 'pdk-info-panel-subtitle', getText(options.subtitle));

		icon.appendChild(dom.createIcon(options.icon || 'dashicons-info'));
		headline.appendChild(title);
		if (hasValue(options.subtitle)) {
			headline.appendChild(subtitle);
		}

		header.append(icon, headline);

		if (hasValue(options.meta)) {
			header.appendChild(dom.createElement('strong', 'pdk-info-panel-meta', options.meta));
		}

		return header;
	}

	function appendTitle(root, options = {}) {
		const dom = window.PufferDesk.dom;

		if (hasValue(options.title)) {
			const title = dom.createElement('h1', 'pdk-info-panel-title', options.title);
			addClassNames(title, options.titleClassName);
			root.appendChild(title);
		}

		if (hasValue(options.subtitle)) {
			const subtitle = dom.createElement('p', 'pdk-info-panel-subtitle', options.subtitle);
			addClassNames(subtitle, options.subtitleClassName);
			root.appendChild(subtitle);
		}
	}

	function appendSpecs(root, rows = [], options = {}) {
		const dom = window.PufferDesk.dom;
		const specs = dom.createElement('dl', 'pdk-info-panel-specs');
		addClassNames(specs, options.specsClassName);

		rows.forEach((row) => {
			if (!row || !hasValue(row.label) || !hasValue(row.value)) {
				return;
			}

			const item = dom.createElement('div', 'pdk-info-panel-spec');
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
		button.className = 'pdk-info-panel-button';
		addClassNames(button, options.className);
		button.textContent = options.label || getInfoPanelLabel('moreInfoLabel');
		button.addEventListener('click', () => {
			if (typeof options.onClick === 'function') {
				options.onClick();
			}
		});

		return button;
	}

	function createDisclosure(title, options = {}) {
		const section = document.createElement('details');
		section.className = 'pdk-info-panel-section';
		section.open = options.open !== false;

		const summary = document.createElement('summary');
		summary.className = 'pdk-info-panel-summary';
		summary.textContent = title;

		const body = document.createElement('div');
		body.className = 'pdk-info-panel-section-body';

		section.append(summary, body);

		return {
			body,
			section
		};
	}

	function appendDefinition(body, label, value) {
		const row = document.createElement('div');
		row.className = 'pdk-info-panel-row';

		const term = document.createElement('span');
		term.className = 'pdk-info-panel-term';
		term.textContent = `${label}:`;

		const description = document.createElement('span');
		description.className = 'pdk-info-panel-value';
		description.textContent = hasValue(value) ? value : getInfoPanelLabel('notAvailable');

		row.append(term, description);
		body.appendChild(row);
	}

	function createPropertiesTabs(labels = null) {
		const tabs = document.createElement('div');
		const tabLabels = [
			getInfoPanelLabel('propertiesGeneralTab', 'General', labels),
			getInfoPanelLabel('propertiesSharingTab', 'Sharing', labels),
			getInfoPanelLabel('propertiesPreviousVersionsTab', 'Previous Versions', labels),
			getInfoPanelLabel('propertiesCustomizeTab', 'Customize', labels)
		];

		tabs.className = 'pdk-properties-tabs';
		tabs.setAttribute('role', 'tablist');
		tabs.setAttribute('aria-label', getInfoPanelLabel('propertiesTabsLabel', 'Properties tabs', labels));

		tabLabels.forEach((label, index) => {
			const tab = document.createElement('button');

			tab.type = 'button';
			tab.className = 'pdk-properties-tab';
			tab.textContent = label;
			tab.setAttribute('role', 'tab');
			tab.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
			tab.tabIndex = index === 0 ? 0 : -1;
			if (index === 0) {
				tab.classList.add('is-active');
			} else {
				tab.disabled = true;
			}
			tabs.appendChild(tab);
		});

		return tabs;
	}

	function createPropertiesRule() {
		const rule = document.createElement('span');

		rule.className = 'pdk-properties-rule';
		rule.setAttribute('aria-hidden', 'true');

		return rule;
	}

	function appendPropertiesRow(section, label, value) {
		const row = document.createElement('div');
		const term = document.createElement('dt');
		const description = document.createElement('dd');

		row.className = 'pdk-properties-row';
		term.className = 'pdk-properties-term';
		term.textContent = `${label}:`;
		description.className = 'pdk-properties-value';
		description.textContent = hasValue(value) ? value : getInfoPanelLabel('notAvailable');
		row.append(term, description);
		section.appendChild(row);
	}

	function createPropertiesSection(rows = []) {
		const section = document.createElement('dl');

		section.className = 'pdk-properties-section';
		rows.forEach((row) => {
			if (row && hasValue(row.label)) {
				appendPropertiesRow(section, row.label, row.value);
			}
		});

		return section;
	}

	function createPropertiesAttribute(label, state = 'unchecked') {
		const item = document.createElement('span');
		const box = document.createElement('span');
		const text = document.createElement('span');
		const checkedState = state === 'mixed' ? 'mixed' : (state === 'checked' ? 'true' : 'false');

		item.className = 'pdk-properties-attribute';
		box.className = 'pdk-properties-checkbox';
		box.dataset.pdkPropertiesCheckbox = state;
		box.setAttribute('role', 'checkbox');
		box.setAttribute('aria-checked', checkedState);
		box.setAttribute('aria-label', label);
		text.className = 'pdk-properties-attribute-label';
		text.textContent = label;
		item.append(box, text);

		return item;
	}

	function createPropertiesAttributes(labels = null) {
		const row = document.createElement('div');
		const term = document.createElement('span');
		const list = document.createElement('div');

		row.className = 'pdk-properties-attributes';
		term.className = 'pdk-properties-term';
		term.textContent = `${getInfoPanelLabel('attributesLabel', 'Attributes', labels)}:`;
		list.className = 'pdk-properties-attribute-list';
		list.append(
			createPropertiesAttribute(getInfoPanelLabel('readOnlyAttribute', 'Read-only (Only applies to files in folder)', labels), 'mixed'),
			createPropertiesAttribute(getInfoPanelLabel('hiddenAttribute', 'Hidden', labels), 'unchecked'),
			createPropertiesAttribute(getInfoPanelLabel('archiveAttribute', 'Archive', labels), 'unchecked')
		);
		row.append(term, list);

		return row;
	}

	function createPropertiesNameRow(info = {}, actions = {}, fallbackTitle = '') {
		const icon = document.createElement('span');
		const nameInput = document.createElement('input');
		const row = document.createElement('div');

		row.className = 'pdk-properties-name-row';
		icon.className = 'pdk-properties-icon pdk-info-panel-icon';
		icon.appendChild(window.PufferDesk.dom.createIcon(info.icon || 'dashicons-category'));
		nameInput.className = 'pdk-info-panel-name-input pdk-properties-name-input';
		nameInput.type = 'text';
		nameInput.value = info.label || fallbackTitle;
		nameInput.disabled = !info.canRename;
		nameInput.addEventListener('change', () => {
			if (info.canRename && typeof actions.onRename === 'function') {
				actions.onRename(nameInput.value);
			}
		});
		row.append(icon, nameInput);

		return row;
	}

	function closeContainingWindow(source) {
		const win = source && typeof source.closest === 'function' ? source.closest('.pdk-window') : null;
		const close = win ? win.querySelector('.pdk-window-control-close') : null;

		if (close) {
			close.click();
		}
	}

	function createPropertiesFooter(labels = null) {
		const footer = document.createElement('footer');
		const ok = document.createElement('button');
		const cancel = document.createElement('button');
		const apply = document.createElement('button');

		footer.className = 'pdk-properties-footer';
		ok.type = 'button';
		ok.className = 'pdk-properties-button pdk-properties-button-primary';
		ok.textContent = getInfoPanelLabel('okLabel', 'OK', labels);
		ok.addEventListener('click', () => closeContainingWindow(ok));

		cancel.type = 'button';
		cancel.className = 'pdk-properties-button';
		cancel.textContent = getInfoPanelLabel('cancelLabel', 'Cancel', labels);
		cancel.addEventListener('click', () => closeContainingWindow(cancel));

		apply.type = 'button';
		apply.className = 'pdk-properties-button';
		apply.textContent = getInfoPanelLabel('applyLabel', 'Apply', labels);
		apply.disabled = true;
		apply.setAttribute('aria-disabled', 'true');

		footer.append(ok, cancel, apply);

		return footer;
	}

	function getPropertiesContainsLabel(items = [], labels = null) {
		const fileCount = items.filter((item) => item && item.type !== 'folder').length;
		const folderCount = items.filter((item) => item && item.type === 'folder').length;
		const fileLabel = fileCount === 1
			? getInfoPanelLabel('fileSingular', 'File', labels)
			: getInfoPanelLabel('filePlural', 'Files', labels);
		const folderLabel = folderCount === 1
			? getInfoPanelLabel('folderSingular', 'Folder', labels)
			: getInfoPanelLabel('folderPlural', 'Folders', labels);

		return formatInfoPanelLabel('propertiesContainsTemplate', '%1$d %2$s, %3$d %4$s', [fileCount, fileLabel, folderCount, folderLabel], labels);
	}

	function createPropertiesWindow(info = {}, actions = {}, variant = 'folder') {
		const labels = getInfoPanelLabels();
		const isFolder = variant === 'folder';
		const fallbackTitle = isFolder
			? getInfoPanelLabel('folderFallbackTitle', 'Folder', labels)
			: getInfoPanelLabel('documentFallbackTitle', 'Document', labels);
		const items = Array.isArray(info.items) ? info.items : [];
		const zeroBytes = getInfoPanelLabel('zeroBytesLabel', '0 bytes', labels);
		const firstRows = isFolder ? [
			{
				label: getInfoPanelLabel('typeLabel', 'Type', labels),
				value: getInfoPanelLabel('fileFolderTypeLabel', 'File folder', labels)
			},
			{
				label: getInfoPanelLabel('locationLabel', 'Location', labels),
				value: info.where || getInfoPanelLabel('pufferdeskFallback', 'PufferDesk', labels)
			},
			{
				label: getInfoPanelLabel('sizeLabel', 'Size', labels),
				value: zeroBytes
			},
			{
				label: getInfoPanelLabel('sizeOnDiskLabel', 'Size on disk', labels),
				value: zeroBytes
			},
			{
				label: getInfoPanelLabel('containsLabel', 'Contains', labels),
				value: getPropertiesContainsLabel(items, labels)
			}
		] : [
			{
				label: getInfoPanelLabel('typeLabel', 'Type', labels),
				value: info.kind || fallbackTitle
			},
			{
				label: getInfoPanelLabel('locationLabel', 'Location', labels),
				value: info.where || getInfoPanelLabel('pufferdeskFallback', 'PufferDesk', labels)
			},
			{
				label: getInfoPanelLabel('sizeLabel', 'Size', labels),
				value: info.size || zeroBytes
			},
			{
				label: getInfoPanelLabel('sizeOnDiskLabel', 'Size on disk', labels),
				value: info.size || zeroBytes
			}
		];
		const dateRows = [
			{
				label: getInfoPanelLabel('createdLabel', 'Created', labels),
				value: formatPropertiesDate(info.createdAt, labels)
			}
		];
		const page = document.createElement('div');
		const panel = createInfoPanelWindow({
			children: [
				createPropertiesTabs(labels),
				page,
				createPropertiesFooter(labels)
			],
			className: `pdk-properties-panel pdk-properties-panel-${variant}`,
			layout: 'properties',
			variant
		});

		if (!isFolder) {
			dateRows.push({
				label: getInfoPanelLabel('modifiedLabel', 'Modified', labels),
				value: formatPropertiesDate(info.modifiedAt, labels)
			});
		}

		page.className = 'pdk-properties-page';
		page.append(
			createPropertiesNameRow(info, actions, fallbackTitle),
			createPropertiesRule(),
			createPropertiesSection(firstRows),
			createPropertiesRule(),
			createPropertiesSection(dateRows),
			createPropertiesRule(),
			createPropertiesAttributes(labels)
		);
		panel.dataset.pdkPropertiesKind = variant;

		return panel;
	}

	function createInfoPanelWindow(options = {}) {
		const dom = window.PufferDesk.dom;
		const content = dom.createElement('div', 'pdk-info-panel');

		if (options.variant) {
			content.classList.add(`pdk-info-panel-${options.variant}`);
		}

		if (options.layout) {
			content.dataset.pdkInfoPanelLayout = options.layout;
		}

		addClassNames(content, options.className);

		if (options.hero) {
			content.appendChild(options.hero);
		}

		if (options.header) {
			content.appendChild(createHeader(options.header));
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
			const footer = dom.createElement('p', 'pdk-info-panel-footer', options.footer);
			addClassNames(footer, options.footerClassName);
			content.appendChild(footer);
		}

		return content;
	}

	function createSiteVisual(siteInfo = {}) {
		const dom = window.PufferDesk.dom;
		const device = dom.createElement('div', 'pdk-site-about-device');
		const screen = dom.createElement('div', 'pdk-site-about-screen');
		const stand = dom.createElement('span', 'pdk-site-about-stand');

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
		const commands = window.PufferDesk && window.PufferDesk.menuCommands;
		const command = siteInfo.moreInfoCommand || '';
		const labels = getInfoPanelLabels();

		if (command && commands && typeof commands.execute === 'function') {
			const didExecute = commands.execute({
				command,
				icon: siteInfo.moreInfoIcon || 'dashicons-info',
				label: siteInfo.moreInfoLabel || getInfoPanelLabel('moreInfoLabel', '', labels),
				panel: siteInfo.moreInfoPanel || '',
				title: siteInfo.moreInfoTitle || siteInfo.moreInfoLabel || getInfoPanelLabel('moreInfoLabel', '', labels),
				url: siteInfo.moreInfoUrl || ''
			});

			if (didExecute) {
				return;
			}
		}

		if (siteInfo.moreInfoUrl && window.PufferDesk.appLauncher && typeof window.PufferDesk.appLauncher.openUrl === 'function') {
			window.PufferDesk.appLauncher.openUrl(siteInfo.moreInfoUrl, siteInfo.moreInfoTitle || getInfoPanelLabel('siteHealthInfoTitle', '', labels), siteInfo.moreInfoIcon || 'dashicons-heart');
		}
	}

	function createSiteAboutWindow(siteInfo = {}) {
		const labels = getInfoPanelLabels();
		const aboutSubtitle = siteInfo.aboutSubtitle || siteInfo.tagline || siteInfo.url || '';
		const specs = Array.isArray(siteInfo.aboutRows) ? siteInfo.aboutRows : (Array.isArray(siteInfo.rows) ? siteInfo.rows : []);

		return createInfoPanelWindow({
			action: siteInfo.moreInfoCommand || siteInfo.moreInfoUrl ? {
				className: 'pdk-site-about-button',
				label: siteInfo.moreInfoLabel || getInfoPanelLabel('moreInfoLabel', '', labels),
				onClick: () => openSiteMoreInfo(siteInfo)
			} : null,
			className: 'pdk-site-about',
			footer: siteInfo.footer || '',
			footerClassName: 'pdk-site-about-footer',
			hero: createSiteVisual(siteInfo),
			layout: 'site',
			specClassName: 'pdk-site-about-spec',
			specs,
			specsClassName: 'pdk-site-about-specs',
			subtitle: aboutSubtitle,
			subtitleClassName: 'pdk-site-about-subtitle',
			title: siteInfo.name || getInfoPanelLabel('wordpressSiteTitle', '', labels),
			variant: 'site'
		});
	}

	function createDocumentInfoWindow(info = {}, actions = {}) {
		const labels = getInfoPanelLabels();

		if (isRedmondFamily()) {
			return createPropertiesWindow(info, actions, 'document');
		}

		const documentFallbackTitle = getInfoPanelLabel('documentFallbackTitle', '', labels);
		const general = createDisclosure(getInfoPanelLabel('generalSection', '', labels));
		const name = createDisclosure(getInfoPanelLabel('nameSection', '', labels));
		const permissions = createDisclosure(getInfoPanelLabel('sharingPermissionsSection', '', labels), { open: false });

		appendDefinition(general.body, getInfoPanelLabel('kindLabel', '', labels), info.kind || documentFallbackTitle);
		appendDefinition(general.body, getInfoPanelLabel('sizeLabel', '', labels), info.size || getInfoPanelLabel('notAvailable', '', labels));
		appendDefinition(general.body, getInfoPanelLabel('whereLabel', '', labels), info.where || getInfoPanelLabel('pufferdeskFallback', '', labels));
		appendDefinition(general.body, getInfoPanelLabel('sourceLabel', '', labels), info.source || getInfoPanelLabel('pufferdeskFallback', '', labels));
		appendDefinition(general.body, getInfoPanelLabel('createdLabel', '', labels), formatDate(info.createdAt, labels));
		appendDefinition(general.body, getInfoPanelLabel('modifiedLabel', '', labels), formatDate(info.modifiedAt, labels));

		const nameInput = document.createElement('input');
		nameInput.className = 'pdk-info-panel-name-input';
		nameInput.type = 'text';
		nameInput.value = info.label || documentFallbackTitle;
		nameInput.disabled = !info.canRename;
		nameInput.addEventListener('change', () => {
			if (info.canRename && typeof actions.onRename === 'function') {
				actions.onRename(nameInput.value);
			}
		});
		name.body.appendChild(nameInput);

		appendDefinition(
			permissions.body,
			getInfoPanelLabel('accessLabel', '', labels),
			info.user
				? getInfoPanelLabel('privateUserAccess', '', labels)
				: getInfoPanelLabel('capabilityAccess', '', labels)
		);

		return createInfoPanelWindow({
			children: [
				general.section,
				name.section,
				permissions.section
			],
			header: {
				icon: info.icon || 'dashicons-media-document',
				meta: info.size || '',
				subtitle: formatInfoPanelLabel('modifiedTemplate', '', [formatDate(info.modifiedAt, labels)], labels),
				title: info.label || documentFallbackTitle
			},
			layout: 'inspector',
			variant: 'document'
		});
	}

	function createFolderInfoWindow(info = {}, actions = {}) {
		const labels = getInfoPanelLabels();

		if (isRedmondFamily()) {
			return createPropertiesWindow(info, actions, 'folder');
		}

		const itemCount = Number.parseInt(info.itemCount, 10) || 0;
		const items = Array.isArray(info.items) ? info.items : [];
		const hasOnlyApps = Boolean(items.length && items.every((item) => item && item.type === 'app'));
		const itemCountLabel = plural(itemCount, getInfoPanelLabel('itemSingular', '', labels), getInfoPanelLabel('itemPlural', '', labels), labels);
		const appCountLabel = plural(itemCount, getInfoPanelLabel('applicationSingular', '', labels), getInfoPanelLabel('applicationPlural', '', labels), labels);
		const containsCountLabel = hasOnlyApps ? appCountLabel : itemCountLabel;
		const folderFallbackTitle = getInfoPanelLabel('folderFallbackTitle', '', labels);
		const general = createDisclosure(getInfoPanelLabel('generalSection', '', labels));
		const more = createDisclosure(getInfoPanelLabel('moreInfoSection', '', labels));
		const name = createDisclosure(getInfoPanelLabel('nameSection', '', labels));
		const preview = createDisclosure(getInfoPanelLabel('previewSection', '', labels), { open: false });
		const permissions = createDisclosure(getInfoPanelLabel('sharingPermissionsSection', '', labels), { open: false });

		appendDefinition(general.body, getInfoPanelLabel('kindLabel', '', labels), info.kind || folderFallbackTitle);
		appendDefinition(general.body, getInfoPanelLabel('sizeLabel', '', labels), formatInfoPanelLabel('folderSizeTemplate', '', [itemCountLabel], labels));
		appendDefinition(general.body, getInfoPanelLabel('whereLabel', '', labels), info.where || getInfoPanelLabel('pufferdeskFallback', '', labels));
		appendDefinition(general.body, getInfoPanelLabel('sourceLabel', '', labels), info.source || getInfoPanelLabel('pufferdeskFallback', '', labels));
		appendDefinition(general.body, getInfoPanelLabel('createdLabel', '', labels), formatDate(info.createdAt, labels));
		appendDefinition(general.body, getInfoPanelLabel('modifiedLabel', '', labels), formatDate(info.modifiedAt, labels));

		appendDefinition(more.body, getInfoPanelLabel('lastOpenedLabel', '', labels), formatDate(info.lastOpenedAt, labels));
		appendDefinition(more.body, getInfoPanelLabel('containsLabel', '', labels), containsCountLabel);
		if (items.length) {
			appendDefinition(more.body, getInfoPanelLabel(hasOnlyApps ? 'appsLabel' : 'itemsLabel', '', labels), items.map((item) => item.label).join(', '));
		}

		const nameInput = document.createElement('input');
		nameInput.className = 'pdk-info-panel-name-input';
		nameInput.type = 'text';
		nameInput.value = info.label || folderFallbackTitle;
		nameInput.disabled = !info.canRename;
		nameInput.addEventListener('change', () => {
			if (info.canRename && typeof actions.onRename === 'function') {
				actions.onRename(nameInput.value);
			}
		});
		name.body.appendChild(nameInput);

		const previewText = document.createElement('p');
		previewText.className = 'pdk-info-panel-muted';
		previewText.textContent = itemCount
			? formatInfoPanelLabel('previewAvailableTemplate', '', [containsCountLabel], labels)
			: getInfoPanelLabel('noPreviewItems', '', labels);
		preview.body.appendChild(previewText);

		appendDefinition(
			permissions.body,
			getInfoPanelLabel('accessLabel', '', labels),
			info.user
				? getInfoPanelLabel('privateUserAccess', '', labels)
				: getInfoPanelLabel('capabilityAccess', '', labels)
		);

		return createInfoPanelWindow({
			children: [
				general.section,
				more.section,
				name.section,
				preview.section,
				permissions.section
			],
			header: {
				icon: info.icon || 'dashicons-category',
				meta: itemCountLabel,
				subtitle: formatInfoPanelLabel('modifiedTemplate', '', [formatDate(info.modifiedAt, labels)], labels),
				title: info.label || folderFallbackTitle
			},
			layout: 'inspector',
			variant: 'folder'
		});
	}

	window.PufferDesk.apps.createInfoPanelWindow = createInfoPanelWindow;
	window.PufferDesk.apps.createSiteAboutWindow = createSiteAboutWindow;
	window.PufferDesk.apps.createDocumentInfoWindow = createDocumentInfoWindow;
	window.PufferDesk.apps.createFolderInfoWindow = createFolderInfoWindow;
})();
