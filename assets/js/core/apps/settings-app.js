(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};
	window.AdminOSMode.apps = window.AdminOSMode.apps || {};

	window.AdminOSMode.apps.createSettingsApp = function createSettingsApp(context = {}) {
		const dom = window.AdminOSMode.dom;
		const api = window.AdminOSMode.services.api;
		const storage = window.AdminOSMode.services.storage;
		const appearance = window.AdminOSMode.appearance;
		const desktopDock = window.AdminOSMode.desktopDock;
		const menuBar = window.AdminOSMode.menuBar;
		const wallpaper = window.AdminOSMode.wallpaper;
		const config = context.config || window.AdminOSMode.config.get();
		const settingsConfig = config.settings && typeof config.settings === 'object' ? config.settings : {};
		const apps = Array.isArray(config.apps) ? config.apps : [];
		const themes = Array.isArray(config.themes) ? config.themes : [];
		const shell = document.querySelector('[data-admin-os-shell]');
		let optionGroups = [];
		let currentAppearance = appearance
			? appearance.normalize(config.appearance || {})
			: Object.assign({}, config.appearance || {});
		let currentWallpaper = config.wallpaper && typeof config.wallpaper === 'object'
			? config.wallpaper
			: {};
		let currentDesktopDock = desktopDock
			? desktopDock.normalize(config.desktopDock || {})
			: Object.assign({}, config.desktopDock || {});
		let currentAppLocations = normalizeAppLocations(config.appLocations || {});
		let currentMenuBar = menuBar
			? menuBar.normalize(config.menuBar || {})
			: Object.assign({}, config.menuBar || {});
		let saveTimer = null;
		let desktopDockSaveTimer = null;
		let appLocationSaveTimer = null;
		let menuBarSaveTimer = null;
		let menuBarSaveSequence = 0;
		let accentLabel = null;
		let activeSection = 'general';
		let activePanel = 'general';
		let paneTitle = null;
		let settingsRoot = null;
		let backButton = null;
		let forwardButton = null;
		const panelHistory = [];
		const panelForwardHistory = [];
		let wallpaperButtons = [];
		let wallpaperAddPhotoButton = null;
		let wallpaperAddPhotoPreview = null;
		let wallpaperAddPhotoLabel = null;
		let wallpaperUploadedPhotoButtons = [];
		let wallpaperPhotoGrid = null;
		let wallpaperPhotoStatus = null;
		let wallpaperPhotoToggle = null;
		let wallpaperPhotoExpanded = false;
		let mediaFrame = null;
		const desktopDockControls = [];
		const appLocationControls = [];
		const menuBarControls = [];
		const sidebarButtons = [];
		const wallpaperPhotoVisibleCount = 4;

		const accentOptions = [
			{ value: 'multicolor', label: 'Multicolor' },
			{ value: 'blue', label: 'Blue' },
			{ value: 'purple', label: 'Purple' },
			{ value: 'pink', label: 'Pink' },
			{ value: 'red', label: 'Red' },
			{ value: 'orange', label: 'Orange' },
			{ value: 'yellow', label: 'Yellow' },
			{ value: 'green', label: 'Green' },
			{ value: 'graphite', label: 'Graphite' }
		];

		const desktopDockSelectOptions = {
			dock_position: [
				{ value: 'left', label: 'Left' },
				{ value: 'bottom', label: 'Bottom' },
				{ value: 'right', label: 'Right' }
			],
			minimize_animation: [
				{ value: 'genie', label: 'Genie Effect' },
				{ value: 'scale', label: 'Scale Effect' }
			],
			wallpaper_click: [
				{ value: 'always', label: 'Always' },
				{ value: 'never', label: 'Never' }
			],
			dim_widgets: [
				{ value: 'automatic', label: 'Automatically' },
				{ value: 'always', label: 'Always' },
				{ value: 'never', label: 'Never' }
			]
		};

		const appLocationOptions = [
			{ value: 'dock', label: 'Dock' },
			{ value: 'desktop', label: 'Desktop' },
			{ value: 'both', label: 'Dock & Desktop' },
			{ value: 'hidden', label: 'Hidden' }
		];

		const menuBarSelectOptions = {
			auto_hide: [
				{ value: 'always', label: 'Always' },
				{ value: 'desktop', label: 'On Desktop Only' },
				{ value: 'fullscreen', label: 'In Full Screen Only' },
				{ value: 'never', label: 'Never' }
			],
			recent_count: [
				{ value: '0', label: 'None' },
				{ value: '5', label: '5' },
				{ value: '10', label: '10' },
				{ value: '15', label: '15' },
				{ value: '20', label: '20' },
				{ value: '30', label: '30' },
				{ value: '50', label: '50' }
			]
		};

		const sidebarItems = [
			{ id: 'general', label: 'General', icon: 'dashicons-admin-generic', tone: 'gray' },
			{ id: 'appearance', label: 'Appearance', icon: 'dashicons-admin-appearance', tone: 'blue' },
			{ id: 'desktop-dock', label: 'Desktop & Dock', icon: 'dashicons-desktop', tone: 'indigo' },
			{ id: 'menu-bar', label: 'Menu Bar', icon: 'dashicons-menu-alt3', tone: 'gray' },
			{ id: 'wallpaper', label: 'Wallpaper', icon: 'dashicons-format-image', tone: 'cyan' },
			{ id: 'widgets', label: 'Widgets', icon: 'dashicons-screenoptions', tone: 'green', disabled: true },
			{ id: 'apps', label: 'Apps', icon: 'dashicons-grid-view', tone: 'purple', disabled: true },
			{ id: 'workspace', label: 'Workspace', icon: 'dashicons-layout', tone: 'orange', disabled: true },
			{ id: 'system', label: 'System', icon: 'dashicons-admin-tools', tone: 'red', disabled: true }
		];
		const profileItem = { id: 'profile', label: 'WordPress Account' };

		function createSettingsRow(labelText, control, descriptionText = '', rowClassName = '') {
			const row = dom.createElement('div', `aos-settings-row ${rowClassName}`.trim());
			const labelStack = dom.createElement('span', 'aos-settings-label-stack');
			labelStack.appendChild(dom.createElement('span', 'aos-settings-label', labelText));
			if (descriptionText) {
				labelStack.appendChild(dom.createElement('span', 'aos-settings-description', descriptionText));
			}
			row.appendChild(labelStack);
			row.appendChild(control);

			return row;
		}

		function createSection(title = '', className = '') {
			const section = dom.createElement('section', `aos-settings-section ${className}`.trim());
			if (title) {
				section.appendChild(dom.createElement('h2', '', title));
			}

			return section;
		}

		function createSectionHeading(title) {
			return dom.createElement('h2', 'aos-settings-group-heading', title);
		}

		function createButton(labelText, className) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = className || 'aos-settings-button';
			button.textContent = labelText;

			return button;
		}

		function getSidebarItem(id) {
			if (id === profileItem.id) {
				return profileItem;
			}

			return sidebarItems.find((item) => item.id === id) || sidebarItems[0];
		}

		function updateSidebarSelection(sectionId) {
			sidebarButtons.forEach((entry) => {
				const selected = entry.id === sectionId;
				entry.button.classList.toggle('is-active', selected);
				if (selected) {
					entry.button.setAttribute('aria-current', 'page');
				} else {
					entry.button.removeAttribute('aria-current');
				}
			});
		}

		function updateHistoryControls() {
			if (backButton) {
				backButton.disabled = panelHistory.length === 0;
			}
			if (forwardButton) {
				forwardButton.disabled = panelForwardHistory.length === 0;
			}
		}

		function showSettingsPanel(panelId, options = {}) {
			const panel = (settingsRoot || document).querySelector(`[data-aos-settings-panel="${panelId}"]`);
			if (!panel) {
				return;
			}

			if (options.pushHistory && activePanel !== panelId) {
				panelHistory.push(activePanel);
				if (options.clearForward !== false) {
					panelForwardHistory.length = 0;
				}
			}

			(settingsRoot || document).querySelectorAll('[data-aos-settings-panel]').forEach((settingsPanel) => {
				settingsPanel.hidden = settingsPanel.dataset.aosSettingsPanel !== panelId;
			});

			activePanel = panelId;
			activeSection = panel.dataset.aosSettingsSidebar || panelId;
			if (settingsRoot) {
				settingsRoot.dataset.aosSettingsActivePanel = activePanel;
			}
			updateSidebarSelection(activeSection);
			if (paneTitle) {
				paneTitle.textContent = panel.dataset.aosSettingsTitle || getSidebarItem(activeSection).label;
			}
			updateHistoryControls();
		}

		function setActiveSection(sectionId) {
			const item = getSidebarItem(sectionId);
			if (!item || item.disabled) {
				return;
			}

			showSettingsPanel(item.id, {
				pushHistory: true
			});
		}

		function openSettingsSubpanel(panelId) {
			showSettingsPanel(panelId, {
				pushHistory: true
			});
		}

		function getThemeOptionLabel(theme) {
			const family = theme.family_label || theme.family || 'Theme';
			const version = theme.version_label || theme.version || theme.label;

			return `${family} · ${version}`;
		}

		function getWallpaperPreference() {
			if (wallpaper && typeof wallpaper.getPreference === 'function') {
				return wallpaper.getPreference(currentWallpaper);
			}

			return currentWallpaper.preference || {};
		}

		function getWallpaperCurrent() {
			if (wallpaper && typeof wallpaper.getCurrent === 'function') {
				return wallpaper.getCurrent(currentWallpaper);
			}

			return currentWallpaper.current || {};
		}

		function getWallpaperKey(preference = {}) {
			if (wallpaper && typeof wallpaper.getPreferenceKey === 'function') {
				return wallpaper.getPreferenceKey(preference);
			}

			if (preference.type === 'upload') {
				return `upload:${Number.parseInt(preference.attachment_id, 10) || 0}`;
			}

			return `${preference.type || ''}:${preference.id || ''}`;
		}

		function getWallpaperPreviewValue(item = {}) {
			return item.preview || item.css_value || 'none';
		}

		function getWallpaperImageCssValue(value) {
			return `url("${String(value).replace(/\\/g, '%5C').replace(/"/g, '%22')}")`;
		}

		function countWallpaperImageLayers(cssValue) {
			const value = String(cssValue || '').trim();
			if (!value || value.toLowerCase() === 'none') {
				return 1;
			}

			let depth = 0;
			let layers = 1;
			for (let index = 0; index < value.length; index += 1) {
				const character = value[index];
				if (character === '(') {
					depth += 1;
				} else if (character === ')') {
					depth = Math.max(0, depth - 1);
				} else if (character === ',' && depth === 0) {
					layers += 1;
				}
			}

			return Math.max(1, layers);
		}

		function repeatWallpaperLayerValue(value, count) {
			return Array(Math.max(1, count)).fill(value).join(', ');
		}

		function getWallpaperCssVariables(item = {}) {
			const cssValue = item.css_value || 'none';
			const layerCount = countWallpaperImageLayers(cssValue);
			const fit = item.fit || 'cover';
			const position = item.position || 'center center';

			return {
				'--aos-wallpaper-image': cssValue,
				'--aos-wallpaper-position': repeatWallpaperLayerValue(position, layerCount),
				'--aos-wallpaper-repeat': repeatWallpaperLayerValue('no-repeat', layerCount),
				'--aos-wallpaper-size': repeatWallpaperLayerValue(fit, layerCount)
			};
		}

		function applyWallpaperPreview(preview, item = {}) {
			if (item.type === 'color' && item.swatch) {
				preview.style.backgroundColor = item.swatch;
				preview.style.backgroundImage = 'none';
				return;
			}

			preview.style.backgroundColor = '';
			preview.style.backgroundImage = getWallpaperPreviewValue(item);
		}

		function getWallpaperItems() {
			return currentWallpaper && Array.isArray(currentWallpaper.items) ? currentWallpaper.items : [];
		}

		function getWallpaperGroup(key) {
			if (
				currentWallpaper &&
				currentWallpaper.groups &&
				Array.isArray(currentWallpaper.groups[key])
			) {
				return currentWallpaper.groups[key];
			}

			if (key === 'colors') {
				return getWallpaperItems().filter((item) => item && item.type === 'color');
			}

			return getWallpaperItems().filter((item) => item && item.type !== 'upload' && item.type !== 'color');
		}

		function getWallpaperUploads() {
			const uploads = currentWallpaper && Array.isArray(currentWallpaper.uploads)
				? currentWallpaper.uploads.filter((item) => item && item.type === 'upload' && Number.parseInt(item.attachment_id, 10) > 0)
				: [];
			const current = getWallpaperCurrent();
			const attachmentId = Number.parseInt(current.attachment_id, 10) || 0;

			if (current.type !== 'upload' || !attachmentId) {
				return uploads;
			}

			const currentKey = getWallpaperKey({
				type: 'upload',
				attachment_id: attachmentId
			});
			const hasCurrent = uploads.some((item) => getWallpaperKey({
				type: 'upload',
				attachment_id: item.attachment_id || 0
			}) === currentKey);

			return hasCurrent ? uploads : [current].concat(uploads);
		}

		function getAccentOption(value) {
			return accentOptions.find((option) => option.value === value) || accentOptions[0];
		}

		function getUserProfile() {
			return config.user && typeof config.user === 'object' ? config.user : {};
		}

		function getUserInitials(name) {
			return String(name || 'Admin')
				.trim()
				.split(/\s+/)
				.slice(0, 2)
				.map((part) => part.charAt(0).toUpperCase())
				.join('') || 'A';
		}

		function populateAvatar(avatar, user, name) {
			if (user.avatar) {
				const image = document.createElement('img');
				image.src = user.avatar;
				image.alt = '';
				image.loading = 'lazy';
				image.decoding = 'async';
				avatar.appendChild(image);
			} else {
				avatar.textContent = getUserInitials(name);
			}

			return avatar;
		}

		function createAvatar(className, user, name) {
			return populateAvatar(dom.createElement('span', className), user, name);
		}

		function createEditableProfileAvatar(user, name, profileUrl) {
			const avatar = profileUrl ? document.createElement('button') : document.createElement('span');

			avatar.className = 'aos-settings-profile-hero-avatar';
			if (profileUrl) {
				avatar.type = 'button';
				avatar.dataset.aosOpenUrl = profileUrl;
				avatar.dataset.aosTitle = 'WordPress Profile';
				avatar.dataset.aosIcon = 'dashicons-admin-users';
				avatar.setAttribute('aria-label', 'Edit profile');
			}

			populateAvatar(avatar, user, name);
			if (profileUrl) {
				avatar.appendChild(dom.createElement('span', 'aos-settings-profile-hero-edit', 'Edit'));
			}

			return avatar;
		}

		function syncAppearanceControls() {
			optionGroups.forEach((group) => {
				const selectedValue = currentAppearance[group.key];
				group.buttons.forEach((button) => {
					const selected = button.value === selectedValue;
					button.classList.toggle('is-selected', selected);
					button.setAttribute('aria-pressed', selected ? 'true' : 'false');
				});
			});

			if (accentLabel) {
				accentLabel.textContent = getAccentOption(currentAppearance.accent_color).label;
			}
		}

		function applyAppearance(nextAppearance) {
			currentAppearance = appearance
				? appearance.normalize(nextAppearance)
				: nextAppearance;
			config.appearance = currentAppearance;

			if (appearance && shell) {
				appearance.apply(shell, currentAppearance);
			}

			syncAppearanceControls();
		}

		function syncWallpaperControls() {
			const preference = getWallpaperPreference();
			const selectedKey = getWallpaperKey(preference);

			syncUploadedPhotoOptions();

			wallpaperButtons.forEach((button) => {
				const selected = button.dataset.aosWallpaperKey === selectedKey;
				button.classList.toggle('is-selected', selected);
				button.setAttribute('aria-pressed', selected ? 'true' : 'false');
				if (button.aosRemoveButton) {
					button.aosRemoveButton.hidden = selected;
				}
				if (button.aosPhotoItem) {
					button.aosPhotoItem.classList.toggle('is-selected', selected);
				}
			});

			if (wallpaperAddPhotoPreview) {
				wallpaperAddPhotoPreview.style.backgroundImage = 'none';
				wallpaperAddPhotoPreview.classList.remove('has-wallpaper');
			}

			if (wallpaperAddPhotoButton) {
				wallpaperAddPhotoButton.classList.remove('is-selected');
				wallpaperAddPhotoButton.setAttribute('aria-pressed', 'false');
			}

			if (wallpaperAddPhotoLabel) {
				wallpaperAddPhotoLabel.textContent = 'Add Photo...';
			}
		}

		function syncUploadedPhotoOptions() {
			if (!wallpaperPhotoGrid) {
				return;
			}

			const uploads = getWallpaperUploads();
			const expectedKeys = uploads.map((item) => getWallpaperKey({
				type: 'upload',
				attachment_id: item.attachment_id || 0
			}));

			wallpaperUploadedPhotoButtons = wallpaperUploadedPhotoButtons.filter((button) => {
				if (expectedKeys.includes(button.dataset.aosWallpaperKey || '')) {
					return true;
				}

				wallpaperButtons = wallpaperButtons.filter((item) => item !== button);
				if (button.aosPhotoItem) {
					button.aosPhotoItem.remove();
				} else {
					button.remove();
				}
				return false;
			});

			uploads.forEach((item) => {
				const button = ensureUploadedPhotoOption(item);
				const preview = button.querySelector('.aos-settings-wallpaper-selected-photo-preview');
				const label = button.querySelector('.aos-settings-wallpaper-selected-photo-label');
				const title = item.label || 'Selected Photo';

				button.aosWallpaperItem = item;
				button.setAttribute('aria-label', title);
				if (preview) {
					preview.style.backgroundImage = getWallpaperPreviewValue(item);
					preview.classList.add('has-wallpaper');
				}
				if (label) {
					label.textContent = title;
				}
				wallpaperPhotoGrid.appendChild(button.aosPhotoItem || button);
			});

			syncPhotoWallpaperDisclosure();
		}

		function syncPhotoWallpaperDisclosure() {
			if (!wallpaperPhotoGrid || !wallpaperPhotoToggle) {
				return;
			}

			const items = Array.from(wallpaperPhotoGrid.children);
			const hasOverflow = items.length > wallpaperPhotoVisibleCount;

			if (!hasOverflow) {
				wallpaperPhotoExpanded = false;
			}

			wallpaperPhotoToggle.hidden = !hasOverflow;
			wallpaperPhotoToggle.textContent = wallpaperPhotoExpanded ? 'Show Less' : `Show All (${items.length})`;
			wallpaperPhotoToggle.setAttribute('aria-expanded', wallpaperPhotoExpanded ? 'true' : 'false');

			items.forEach((item, index) => {
				item.hidden = !wallpaperPhotoExpanded && index >= wallpaperPhotoVisibleCount;
			});
		}

		function ensureUploadedPhotoOption(item) {
			const key = getWallpaperKey({
				type: 'upload',
				attachment_id: item.attachment_id || 0
			});
			const existing = wallpaperUploadedPhotoButtons.find((button) => button.dataset.aosWallpaperKey === key);
			if (existing) {
				return existing;
			}

			const photoItem = dom.createElement('div', 'aos-settings-wallpaper-photo-item aos-settings-wallpaper-uploaded-photo-item');
			const uploadedButton = document.createElement('button');
			const uploadedPreview = dom.createElement('span', 'aos-settings-wallpaper-upload-preview aos-settings-wallpaper-selected-photo-preview');
			const uploadedLabel = dom.createElement('span', 'aos-settings-wallpaper-upload-label aos-settings-wallpaper-selected-photo-label');
			const removeButton = document.createElement('button');

			uploadedButton.type = 'button';
			uploadedButton.className = 'aos-settings-wallpaper-photo-button aos-settings-wallpaper-selected-photo-button';
			uploadedButton.dataset.aosWallpaperKey = key;
			uploadedButton.setAttribute('aria-pressed', 'false');
			uploadedPreview.setAttribute('aria-hidden', 'true');
			uploadedButton.append(uploadedPreview, uploadedLabel);
			uploadedButton.addEventListener('click', () => {
				if (uploadedButton.aosWallpaperItem) {
					selectWallpaperItem(uploadedButton.aosWallpaperItem, wallpaperPhotoStatus);
				}
			});

			removeButton.type = 'button';
			removeButton.className = 'aos-settings-wallpaper-remove-photo';
			removeButton.hidden = true;
			removeButton.setAttribute('aria-label', 'Remove photo');
			removeButton.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				if (uploadedButton.aosWallpaperItem) {
					removeUploadedWallpaper(uploadedButton.aosWallpaperItem, wallpaperPhotoStatus);
				}
			});

			photoItem.append(uploadedButton, removeButton);
			uploadedButton.aosWallpaperItem = item;
			uploadedButton.aosPhotoItem = photoItem;
			uploadedButton.aosRemoveButton = removeButton;
			wallpaperUploadedPhotoButtons.push(uploadedButton);
			wallpaperButtons.push(uploadedButton);
			wallpaperPhotoGrid.appendChild(photoItem);

			return uploadedButton;
		}

		function applyWallpaper(nextWallpaper) {
			currentWallpaper = nextWallpaper && typeof nextWallpaper === 'object'
				? nextWallpaper
				: currentWallpaper;
			config.wallpaper = currentWallpaper;

			if (wallpaper && shell) {
				wallpaper.apply(shell, currentWallpaper);
			}

			syncWallpaperControls();
		}

		function saveAppearance(status) {
			window.clearTimeout(saveTimer);
			status.textContent = 'Saving...';

			saveTimer = window.setTimeout(() => {
				api.post('admin_os_mode_save_appearance', currentAppearance)
					.then((result) => {
						if (!result || !result.success) {
							const message = result && result.data && result.data.message
								? result.data.message
								: 'Appearance could not be saved.';
							status.textContent = message;
							return;
						}

						applyAppearance(result.data.appearance || currentAppearance);
						status.textContent = result.data.message || 'Appearance saved.';
					})
					.catch((error) => {
						status.textContent = error && error.message ? error.message : 'Appearance could not be saved.';
					});
			}, 180);
		}

		function updateAppearance(key, value, status) {
			applyAppearance(Object.assign({}, currentAppearance, {
				[key]: value
			}));
			saveAppearance(status);
		}

		function applyDesktopDock(nextDesktopDock) {
			currentDesktopDock = desktopDock
				? desktopDock.normalize(nextDesktopDock)
				: nextDesktopDock;
			config.desktopDock = currentDesktopDock;

			if (desktopDock && shell) {
				desktopDock.apply(shell, currentDesktopDock);
			}

			syncDesktopDockControls();
		}

		function saveDesktopDock(status) {
			window.clearTimeout(desktopDockSaveTimer);

			desktopDockSaveTimer = window.setTimeout(() => {
				api.post('admin_os_mode_save_desktop_dock', currentDesktopDock)
					.then((result) => {
						if (!result || !result.success) {
							status.textContent = result && result.data && result.data.message
								? result.data.message
								: 'Desktop & Dock could not be saved.';
							return;
						}

						applyDesktopDock(result.data.desktopDock || currentDesktopDock);
					})
					.catch((error) => {
						status.textContent = error && error.message ? error.message : 'Desktop & Dock could not be saved.';
					});
			}, 180);
		}

		function updateDesktopDock(key, value, status) {
			applyDesktopDock(Object.assign({}, currentDesktopDock, {
				[key]: value
			}));
			saveDesktopDock(status);
		}

		function normalizeAppLocations(locations = {}) {
			const allowedLocations = ['dock', 'desktop', 'both', 'hidden'];
			const normalized = {};

			apps.forEach((app) => {
				if (!app || !app.id) {
					return;
				}

				const location = typeof locations[app.id] === 'string' ? locations[app.id] : 'dock';
				normalized[app.id] = allowedLocations.includes(location) ? location : 'dock';
			});

			return normalized;
		}

		function appIsShownIn(app, surface) {
			const location = currentAppLocations[app.id] || 'dock';

			return location === 'both' || location === surface;
		}

		function createDockAppButton(app) {
			const button = document.createElement('button');
			const tooltip = dom.createElement('span', 'aos-dock-tooltip', app.label || app.id);
			const screenReaderText = dom.createElement('span', 'screen-reader-text', app.label || app.id);

			button.type = 'button';
			button.className = 'aos-dock-item';
			button.dataset.aosContext = 'dock-app';
			button.dataset.aosContextId = app.id;
			button.dataset.aosContextLabel = app.label || app.id;
			button.dataset.aosDockTooltip = app.label || app.id;
			button.dataset.aosOpenApp = app.id;
			button.setAttribute('aria-label', app.label || app.id);
			button.appendChild(dom.createIcon(app.icon || 'dashicons-admin-generic'));
			tooltip.setAttribute('aria-hidden', 'true');
			button.append(tooltip, screenReaderText);

			return button;
		}

		function createDesktopAppButton(app) {
			const button = document.createElement('button');
			const icon = dom.createElement('span', 'aos-app-icon');
			const label = dom.createElement('span', 'aos-desktop-app-label', app.label || app.id);

			button.type = 'button';
			button.className = 'aos-desktop-icon aos-desktop-app';
			button.dataset.aosContext = 'desktop-app';
			button.dataset.aosContextId = app.id;
			button.dataset.aosContextLabel = app.label || app.id;
			button.dataset.aosDesktopIcon = '';
			button.dataset.aosDesktopIconId = `app:${app.id}`;
			button.dataset.aosDesktopIconKind = 'app';
			button.dataset.aosOpenApp = app.id;
			button.setAttribute('aria-label', app.label || app.id);
			icon.appendChild(dom.createIcon(app.icon || 'dashicons-admin-generic'));
			button.append(icon, label);

			return button;
		}

		function syncRunningDockItems() {
			if (!shell) {
				return;
			}

			shell.querySelectorAll('.aos-dock-item.is-running').forEach((button) => {
				button.classList.remove('is-running');
			});
			shell.querySelectorAll('.aos-window[data-aos-app-window]:not(.is-closed)').forEach((win) => {
				const appId = win.dataset.aosAppWindow;
				const button = appId
					? shell.querySelector(`.aos-dock-item[data-aos-open-app="${dom.escapeAttribute(appId)}"]`)
					: null;

				if (button) {
					button.classList.add('is-running');
				}
			});
		}

		function renderAppLocationSurfaces() {
			if (!shell) {
				return;
			}

			const dock = shell.querySelector('.aos-dock');
			if (dock) {
				const minimizedWindows = dock.querySelector('.aos-dock-minimized-windows');
				Array.from(dock.children).forEach((child) => {
					if (child.classList && child.classList.contains('aos-dock-item')) {
						child.remove();
					}
				});
				apps
					.filter((app) => appIsShownIn(app, 'dock'))
					.forEach((app) => {
						dock.insertBefore(createDockAppButton(app), minimizedWindows || null);
					});
				syncRunningDockItems();
			}

			const desktop = shell.querySelector('.aos-desktop');
			if (!desktop) {
				return;
			}

			const desktopApps = apps.filter((app) => appIsShownIn(app, 'desktop'));
			let layer = desktop.querySelector('.aos-desktop-apps');

			if (!desktopApps.length) {
				if (layer) {
					layer.remove();
				}
				if (window.AdminOSMode.desktopFolderManager && typeof window.AdminOSMode.desktopFolderManager.syncDesktopAppVisibility === 'function') {
					window.AdminOSMode.desktopFolderManager.syncDesktopAppVisibility();
				}
				if (window.AdminOSMode.desktopIconManager && typeof window.AdminOSMode.desktopIconManager.rebind === 'function') {
					window.AdminOSMode.desktopIconManager.rebind();
				}
				return;
			}

			if (!layer) {
				layer = dom.createElement('section', 'aos-desktop-apps aos-desktop-icon-layer');
				layer.setAttribute('aria-label', 'Desktop apps');
				const folderLayer = desktop.querySelector('.aos-desktop-folders');
				desktop.insertBefore(layer, folderLayer ? folderLayer.nextSibling : desktop.firstChild);
			}

			layer.replaceChildren(...desktopApps.map(createDesktopAppButton));
			if (window.AdminOSMode.desktopFolderManager && typeof window.AdminOSMode.desktopFolderManager.syncDesktopAppVisibility === 'function') {
				window.AdminOSMode.desktopFolderManager.syncDesktopAppVisibility();
			}
			if (window.AdminOSMode.desktopIconManager && typeof window.AdminOSMode.desktopIconManager.rebind === 'function') {
				window.AdminOSMode.desktopIconManager.rebind();
			}
		}

		function applyAppLocations(nextAppLocations) {
			currentAppLocations = normalizeAppLocations(nextAppLocations);
			config.appLocations = currentAppLocations;
			syncAppLocationControls();
			renderAppLocationSurfaces();
		}

		function saveAppLocations(status) {
			window.clearTimeout(appLocationSaveTimer);
			status.textContent = 'Saving...';

			appLocationSaveTimer = window.setTimeout(() => {
				api.post('admin_os_mode_save_app_locations', {
					locations: JSON.stringify(currentAppLocations)
				})
					.then((result) => {
						if (!result || !result.success) {
							status.textContent = result && result.data && result.data.message
								? result.data.message
								: 'App locations could not be saved.';
							return;
						}

						applyAppLocations(result.data.appLocations || currentAppLocations);
						status.textContent = result.data.message || 'App locations saved.';
					})
					.catch((error) => {
						status.textContent = error && error.message ? error.message : 'App locations could not be saved.';
					});
			}, 180);
		}

		function updateAppLocation(appId, location, status) {
			applyAppLocations(Object.assign({}, currentAppLocations, {
				[appId]: location
			}));
			saveAppLocations(status);
		}

		function applyMenuBar(nextMenuBar) {
			currentMenuBar = menuBar
				? menuBar.normalize(nextMenuBar)
				: nextMenuBar;
			config.menuBar = currentMenuBar;

			if (menuBar && shell) {
				menuBar.apply(shell, currentMenuBar);
			}

			syncMenuBarControls();
		}

		function saveMenuBar(status) {
			const sequence = menuBarSaveSequence + 1;
			menuBarSaveSequence = sequence;
			window.clearTimeout(menuBarSaveTimer);

			menuBarSaveTimer = window.setTimeout(() => {
				const payload = Object.assign({}, currentMenuBar);

				api.post('admin_os_mode_save_menu_bar', payload)
					.then((result) => {
						if (sequence !== menuBarSaveSequence) {
							return;
						}

						if (!result || !result.success) {
							status.textContent = result && result.data && result.data.message
								? result.data.message
								: 'Menu Bar could not be saved.';
							return;
						}

						applyMenuBar(result.data.menuBar || currentMenuBar);
					})
					.catch((error) => {
						if (sequence !== menuBarSaveSequence) {
							return;
						}

						status.textContent = error && error.message ? error.message : 'Menu Bar could not be saved.';
					});
			}, 180);
		}

		function updateMenuBar(key, value, status) {
			applyMenuBar(Object.assign({}, currentMenuBar, {
				[key]: value
			}));
			saveMenuBar(status);
		}

		function syncDesktopDockControls() {
			desktopDockControls.forEach((entry) => {
				const value = currentDesktopDock[entry.key];

				if (entry.type === 'range') {
					entry.input.value = String(value);
					updateDesktopDockRangeFill(entry.input);
					return;
				}

				if (entry.type === 'select') {
					entry.select.value = String(value);
					return;
				}

				if (entry.type === 'toggle' || entry.type === 'checkbox') {
					entry.button.setAttribute('aria-pressed', value ? 'true' : 'false');
				}
			});
		}

		function syncAppLocationControls() {
			appLocationControls.forEach((entry) => {
				entry.select.value = currentAppLocations[entry.appId] || 'dock';
			});
		}

		function syncMenuBarControls() {
			menuBarControls.forEach((entry) => {
				const value = currentMenuBar[entry.key];

				if (entry.type === 'select') {
					entry.select.value = String(value);
					return;
				}

				if (entry.type === 'toggle') {
					entry.button.setAttribute('aria-pressed', value ? 'true' : 'false');
				}
			});
		}

		function updateDesktopDockRangeFill(input) {
			const min = Number.parseFloat(input.min) || 0;
			const max = Number.parseFloat(input.max) || 100;
			const value = Number.parseFloat(input.value) || min;
			const ratio = max > min ? (value - min) / (max - min) : 0;

			input.style.setProperty('--aos-range-fill', `${Math.max(0, Math.min(100, ratio * 100))}%`);
		}

		function saveWallpaper(payload, status, fallbackWallpaper = null) {
			status.textContent = 'Saving...';

			return api.post('admin_os_mode_save_wallpaper', payload)
				.then((result) => {
					if (!result || !result.success) {
						const message = result && result.data && result.data.message
							? result.data.message
							: 'Wallpaper could not be saved.';
						status.textContent = message;
						if (fallbackWallpaper) {
							applyWallpaper(fallbackWallpaper);
						} else {
							syncWallpaperControls();
						}
						return null;
					}

					applyWallpaper(result.data.wallpaper || currentWallpaper);
					status.textContent = result.data.message || 'Wallpaper saved.';
					return result.data.wallpaper || currentWallpaper;
				})
				.catch((error) => {
					status.textContent = error && error.message ? error.message : 'Wallpaper could not be saved.';
					if (fallbackWallpaper) {
						applyWallpaper(fallbackWallpaper);
					} else {
						syncWallpaperControls();
					}
					return null;
				});
		}

		function removeUploadedWallpaper(item, status) {
			const attachmentId = Number.parseInt(item.attachment_id, 10) || 0;
			if (!attachmentId) {
				return;
			}

			status.textContent = 'Removing...';

			api.post('admin_os_mode_remove_wallpaper_upload', {
				attachment_id: attachmentId
			})
				.then((result) => {
					if (!result || !result.success) {
						const message = result && result.data && result.data.message
							? result.data.message
							: 'Photo could not be removed.';
						status.textContent = message;
						syncWallpaperControls();
						return;
					}

					applyWallpaper(result.data.wallpaper || currentWallpaper);
					status.textContent = result.data.message || 'Photo removed.';
				})
				.catch((error) => {
					status.textContent = error && error.message ? error.message : 'Photo could not be removed.';
					syncWallpaperControls();
				});
		}

		function selectWallpaperItem(item, status) {
			const attachmentId = item.type === 'upload'
				? Number.parseInt(item.attachment_id, 10) || 0
				: 0;
			const fallbackWallpaper = currentWallpaper;
			const nextWallpaper = Object.assign({}, currentWallpaper, {
				preference: {
					type: item.type,
					id: item.type === 'upload' ? '' : item.id,
					attachment_id: attachmentId,
					fit: item.fit || 'cover',
					position: item.position || 'center center'
				},
				current: item,
				css_variables: getWallpaperCssVariables(item)
			});

			applyWallpaper(nextWallpaper);
			saveWallpaper(nextWallpaper.preference, status, fallbackWallpaper);
		}

		function createOptionButton(key, option, status, className, previewClassName) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = className;
			button.value = option.value;
			button.setAttribute('aria-pressed', 'false');
			button.addEventListener('click', () => updateAppearance(key, option.value, status));

			const preview = dom.createElement('span', previewClassName);
			preview.setAttribute('aria-hidden', 'true');
			preview.dataset.aosPreviewValue = option.value;
			button.appendChild(preview);
			button.appendChild(dom.createElement('span', 'aos-settings-option-label', option.label));

			return button;
		}

		function createOptionGroup(key, options, status, className, previewClassName) {
			const group = dom.createElement('div', 'aos-settings-option-group');
			const buttons = options.map((option) => {
				const button = createOptionButton(key, option, status, className, previewClassName);
				group.appendChild(button);

				return button;
			});

			optionGroups.push({
				buttons,
				key
			});

			return group;
		}

		function createAccentGroup(status) {
			const group = dom.createElement('div', 'aos-settings-swatch-group');
			const buttons = accentOptions.map((option) => {
				const button = document.createElement('button');
				button.type = 'button';
				button.className = `aos-settings-swatch aos-settings-swatch-${option.value}`;
				button.value = option.value;
				button.title = option.label;
				button.setAttribute('aria-label', option.label);
				button.setAttribute('aria-pressed', 'false');
				button.addEventListener('click', () => updateAppearance('accent_color', option.value, status));
				const swatch = dom.createElement('span', 'aos-settings-swatch-dot');
				swatch.setAttribute('aria-hidden', 'true');
				button.appendChild(swatch);
				group.appendChild(button);

				return button;
			});
			accentLabel = dom.createElement('span', 'aos-settings-swatch-label', getAccentOption(currentAppearance.accent_color).label);
			group.appendChild(accentLabel);

			optionGroups.push({
				buttons,
				key: 'accent_color'
			});

			return group;
		}

		function createSingleOptionSelect(labelText) {
			const select = document.createElement('select');
			select.className = 'aos-settings-control';
			select.disabled = true;

			const option = document.createElement('option');
			option.value = 'automatic';
			option.textContent = 'Automatic';
			option.selected = true;
			select.appendChild(option);

			return createSettingsRow(labelText, select);
		}

		function createDesktopDockRange(key, labelText, options, status) {
			const field = dom.createElement('label', 'aos-settings-range-field');
			const label = dom.createElement('span', 'aos-settings-range-title', labelText);
			const input = document.createElement('input');
			const legend = dom.createElement('span', 'aos-settings-range-legend');

			input.type = 'range';
			input.min = String(options.min);
			input.max = String(options.max);
			input.step = String(options.step || 1);
			input.value = String(currentDesktopDock[key]);
			updateDesktopDockRangeFill(input);
			input.addEventListener('input', () => {
				updateDesktopDockRangeFill(input);
				updateDesktopDock(key, Number.parseInt(input.value, 10), status);
			});
			(options.labels || []).forEach((text) => {
				legend.appendChild(dom.createElement('span', '', text));
			});

			field.append(label, input, legend);
			desktopDockControls.push({
				input,
				key,
				type: 'range'
			});

			return field;
		}

		function createDesktopDockSelect(key, status) {
			const wrap = dom.createElement('span', 'aos-settings-inline-select');
			const select = document.createElement('select');

			select.className = 'aos-settings-value-select';
			(desktopDockSelectOptions[key] || []).forEach((item) => {
				const option = document.createElement('option');
				option.value = item.value;
				option.textContent = item.label;
				option.selected = currentDesktopDock[key] === item.value;
				select.appendChild(option);
			});
			select.addEventListener('change', () => {
				updateDesktopDock(key, select.value, status);
				select.blur();
			});
			wrap.appendChild(select);
			wrap.appendChild(dom.createElement('span', 'aos-settings-select-chevrons'));
			desktopDockControls.push({
				key,
				select,
				type: 'select'
			});

			return wrap;
		}

		function createDesktopDockToggle(key, status) {
			const button = document.createElement('button');

			button.type = 'button';
			button.className = 'aos-settings-toggle';
			button.setAttribute('aria-pressed', currentDesktopDock[key] ? 'true' : 'false');
			button.addEventListener('click', () => updateDesktopDock(key, !currentDesktopDock[key], status));
			button.appendChild(dom.createElement('span', 'aos-settings-toggle-knob'));
			desktopDockControls.push({
				button,
				key,
				type: 'toggle'
			});

			return button;
		}

		function createAppLocationIcon(app) {
			const icon = dom.createElement('span', 'aos-settings-row-icon aos-settings-sidebar-icon-gray');

			icon.appendChild(dom.createIcon(app.icon || 'dashicons-admin-generic'));

			return icon;
		}

		function createAppLocationSelect(app, status) {
			const wrap = dom.createElement('span', 'aos-settings-inline-select');
			const select = document.createElement('select');

			select.className = 'aos-settings-value-select';
			appLocationOptions.forEach((item) => {
				const option = document.createElement('option');
				option.value = item.value;
				option.textContent = item.label;
				option.selected = (currentAppLocations[app.id] || 'dock') === item.value;
				select.appendChild(option);
			});
			select.addEventListener('change', () => {
				updateAppLocation(app.id, select.value, status);
				select.blur();
			});
			wrap.appendChild(select);
			wrap.appendChild(dom.createElement('span', 'aos-settings-select-chevrons'));
			appLocationControls.push({
				appId: app.id,
				select
			});

			return wrap;
		}

		function createAppLocationRow(app, status) {
			const row = dom.createElement('div', 'aos-settings-row aos-settings-app-location-row');

			row.appendChild(createAppLocationIcon(app));
			row.appendChild(dom.createElement('span', 'aos-settings-label', app.label || app.id));
			row.appendChild(createAppLocationSelect(app, status));

			return row;
		}

		function createAppLocationSection(status) {
			const section = createSection('', 'aos-settings-list aos-settings-app-location-list');

			apps.forEach((app) => {
				if (app && app.id) {
					section.appendChild(createAppLocationRow(app, status));
				}
			});

			return section;
		}

		function createDesktopDockRow(labelText, control, descriptionText = '') {
			const row = dom.createElement('div', 'aos-settings-row aos-settings-desktop-dock-row');
			const labelStack = dom.createElement('span', 'aos-settings-label-stack');

			labelStack.appendChild(dom.createElement('span', 'aos-settings-label', labelText));
			if (descriptionText) {
				labelStack.appendChild(dom.createElement('span', 'aos-settings-description', descriptionText));
			}
			row.append(labelStack, control);

			return row;
		}

		function createWallpaperOption(item, status, extraClassName = '') {
			const button = document.createElement('button');
			const preview = dom.createElement('span', item.type === 'color' ? 'aos-settings-wallpaper-swatch' : 'aos-settings-wallpaper-preview');
			const label = dom.createElement('span', 'aos-settings-wallpaper-label', item.label || item.id);
			const key = getWallpaperKey({
				type: item.type,
				id: item.id,
				attachment_id: item.attachment_id || 0
			});

			button.type = 'button';
			button.className = `aos-settings-wallpaper-option ${extraClassName}`.trim();
			button.dataset.aosWallpaperKey = key;
			button.setAttribute('aria-label', item.label || item.id);
			button.setAttribute('aria-pressed', 'false');
			applyWallpaperPreview(preview, item);
			preview.setAttribute('aria-hidden', 'true');
			button.append(preview, label);
			button.addEventListener('click', () => selectWallpaperItem(item, status));
			wallpaperButtons.push(button);

			return button;
		}

		function createWallpaperGrid(status, items, className = '', optionClassName = '') {
			const grid = dom.createElement('div', `aos-settings-wallpaper-grid ${className}`.trim());
			items.forEach((item) => {
				if (item && item.type !== 'upload') {
					grid.appendChild(createWallpaperOption(item, status, optionClassName));
				}
			});

			return grid;
		}

		function createCollapsibleWallpaperSection(title, items, status, options = {}) {
			const visibleCount = Number.parseInt(options.visibleCount, 10) || 4;
			const section = createSection('', options.sectionClassName || '');
			const header = dom.createElement('div', 'aos-settings-section-header');
			const heading = dom.createElement('h2', '', title);
			const grid = createWallpaperGrid(
				status,
				items,
				options.gridClassName || '',
				options.optionClassName || ''
			);
			let expanded = false;

			if (items.length > visibleCount) {
				grid.classList.add('is-collapsed');
			}

			header.appendChild(heading);
			section.appendChild(header);
			section.appendChild(grid);

			if (items.length > visibleCount) {
				const toggle = document.createElement('button');
				toggle.type = 'button';
				toggle.className = 'aos-settings-section-toggle';

				const syncExpandedState = () => {
					grid.classList.toggle('is-collapsed', !expanded);
					Array.from(grid.children).forEach((child, index) => {
						child.hidden = !expanded && index >= visibleCount;
					});
					toggle.textContent = expanded ? 'Show Less' : `Show All (${items.length})`;
					toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
				};

				toggle.addEventListener('click', () => {
					expanded = !expanded;
					syncExpandedState();
				});
				header.appendChild(toggle);
				syncExpandedState();
			}

			return section;
		}

		function chooseUploadedWallpaper(status) {
			if (!currentWallpaper.can_upload || !window.wp || !window.wp.media) {
				status.textContent = 'Media Library is not available for this user.';
				return;
			}

			if (!mediaFrame) {
				mediaFrame = window.wp.media({
					title: 'Choose Wallpaper',
					button: {
						text: 'Use as Wallpaper'
					},
					library: {
						type: 'image'
					},
					multiple: false
				});
				mediaFrame.on('select', () => {
					const selection = mediaFrame.state().get('selection').first();
					if (!selection) {
						return;
					}

					const attachment = selection.toJSON();
					const attachmentId = Number.parseInt(attachment.id, 10) || 0;
					const imageUrl = attachment.url || '';
					if (!attachmentId || !imageUrl) {
						status.textContent = 'Choose a valid image.';
						return;
					}

					const imageCssValue = getWallpaperImageCssValue(imageUrl);
					const fallbackWallpaper = currentWallpaper;
					const nextWallpaper = Object.assign({}, currentWallpaper, {
						preference: {
							type: 'upload',
							id: '',
							attachment_id: attachmentId,
							fit: 'cover',
							position: 'center center'
						},
						current: {
							type: 'upload',
							id: 'custom',
							attachment_id: attachmentId,
							label: attachment.title || 'Custom Wallpaper',
							preview: imageCssValue,
							css_value: imageCssValue,
							fit: 'cover',
							position: 'center center'
						},
						css_variables: {
							'--aos-wallpaper-image': imageCssValue,
							'--aos-wallpaper-position': 'center center',
							'--aos-wallpaper-repeat': 'no-repeat',
							'--aos-wallpaper-size': 'cover'
						}
					});

					applyWallpaper(nextWallpaper);
					saveWallpaper(nextWallpaper.preference, status, fallbackWallpaper);
				});
			}

			mediaFrame.open();
		}

		function createPhotoWallpaperGroup(status) {
			const group = dom.createElement('div', 'aos-settings-wallpaper-photos');
			const header = dom.createElement('div', 'aos-settings-wallpaper-photos-header');
			const heading = dom.createElement('h3', '', 'Your Photos');
			const grid = dom.createElement('div', 'aos-settings-wallpaper-photo-grid');
			const addButton = document.createElement('button');
			const toggle = document.createElement('button');
			const preview = dom.createElement('span', 'aos-settings-wallpaper-upload-preview');
			const icon = dom.createElement('span', 'aos-settings-wallpaper-upload-icon');
			const label = dom.createElement('span', 'aos-settings-wallpaper-upload-label', 'Add Photo...');

			toggle.type = 'button';
			toggle.className = 'aos-settings-section-toggle';
			toggle.hidden = true;
			toggle.setAttribute('aria-expanded', 'false');
			toggle.addEventListener('click', () => {
				wallpaperPhotoExpanded = !wallpaperPhotoExpanded;
				syncPhotoWallpaperDisclosure();
			});

			addButton.type = 'button';
			addButton.className = 'aos-settings-wallpaper-photo-button aos-settings-wallpaper-add-photo-button';
			addButton.setAttribute('aria-pressed', 'false');
			preview.setAttribute('aria-hidden', 'true');
			icon.setAttribute('aria-hidden', 'true');
			icon.appendChild(dom.createDashicon('dashicons-format-image'));
			preview.appendChild(icon);
			addButton.append(preview, label);
			addButton.addEventListener('click', () => chooseUploadedWallpaper(status));
			wallpaperAddPhotoButton = addButton;
			wallpaperAddPhotoPreview = preview;
			wallpaperAddPhotoLabel = label;
			wallpaperPhotoGrid = grid;
			wallpaperPhotoStatus = status;
			wallpaperPhotoToggle = toggle;

			grid.appendChild(addButton);
			header.append(heading, toggle);
			group.append(header, grid);

			return group;
		}

		function createWallpaperPanel(status) {
			const panel = dom.createElement('div', 'aos-settings-pane-panel');
			const wallpaperItems = getWallpaperGroup('wallpapers');
			const builtInSection = createCollapsibleWallpaperSection(
				'Wallpapers',
				wallpaperItems,
				status,
				{
					sectionClassName: 'aos-settings-section-wallpaper-builtins',
					gridClassName: 'aos-settings-wallpaper-builtins-grid',
					visibleCount: 4
				}
			);
			const colorSection = createCollapsibleWallpaperSection(
				'Colors',
				getWallpaperGroup('colors'),
				status,
				{
					sectionClassName: 'aos-settings-section-wallpaper-colors',
					gridClassName: 'aos-settings-wallpaper-color-grid',
					optionClassName: 'aos-settings-wallpaper-color-option',
					visibleCount: 8
				}
			);

			panel.dataset.aosSettingsPanel = 'wallpaper';
			builtInSection.appendChild(createPhotoWallpaperGroup(status));
			panel.append(builtInSection, colorSection);

			return panel;
		}

		function createDesktopDockSliderSection(status) {
			const section = createSection('', 'aos-settings-desktop-dock-slider-section');
			const row = dom.createElement('div', 'aos-settings-desktop-dock-slider-row');

			row.appendChild(createDesktopDockRange('dock_size', 'Size', {
				labels: ['Small', 'Large'],
				max: 72,
				min: 28
			}, status));
			row.appendChild(createDesktopDockRange('dock_magnification', 'Magnification', {
				labels: ['Off', 'Small', 'Large'],
				max: 24,
				min: 0
			}, status));
			section.appendChild(row);

			return section;
		}

		function createDesktopDockSelectRow(labelText, key, status, descriptionText = '') {
			return createDesktopDockRow(labelText, createDesktopDockSelect(key, status), descriptionText);
		}

		function createDesktopDockToggleRow(labelText, key, status, descriptionText = '') {
			return createDesktopDockRow(labelText, createDesktopDockToggle(key, status), descriptionText);
		}

		function createMenuBarSelect(key, status) {
			const wrap = dom.createElement('span', 'aos-settings-inline-select');
			const select = document.createElement('select');

			select.className = 'aos-settings-value-select';
			(menuBarSelectOptions[key] || []).forEach((item) => {
				const option = document.createElement('option');
				option.value = item.value;
				option.textContent = item.label;
				option.selected = String(currentMenuBar[key]) === item.value;
				select.appendChild(option);
			});
			select.addEventListener('change', () => {
				const value = key === 'recent_count' ? Number.parseInt(select.value, 10) : select.value;
				updateMenuBar(key, value, status);
				select.blur();
			});
			wrap.appendChild(select);
			wrap.appendChild(dom.createElement('span', 'aos-settings-select-chevrons'));
			menuBarControls.push({
				key,
				select,
				type: 'select'
			});

			return wrap;
		}

		function createMenuBarToggle(key, status) {
			const button = document.createElement('button');

			button.type = 'button';
			button.className = 'aos-settings-toggle';
			button.setAttribute('aria-pressed', currentMenuBar[key] ? 'true' : 'false');
			button.addEventListener('click', () => updateMenuBar(key, !currentMenuBar[key], status));
			button.appendChild(dom.createElement('span', 'aos-settings-toggle-knob'));
			menuBarControls.push({
				button,
				key,
				type: 'toggle'
			});

			return button;
		}

		function createMenuBarRow(labelText, control) {
			return createSettingsRow(labelText, control, '', 'aos-settings-menu-bar-row aos-settings-row-fluid-label');
		}

		function createMenuBarPanel(status) {
			const panel = dom.createElement('div', 'aos-settings-pane-panel aos-settings-menu-bar-panel');
			const section = createSection('', 'aos-settings-list aos-settings-menu-bar-list');

			panel.dataset.aosSettingsPanel = 'menu-bar';
			section.appendChild(createMenuBarRow(
				'Automatically hide and show the menu bar',
				createMenuBarSelect('auto_hide', status)
			));
			section.appendChild(createMenuBarRow(
				'Show menu bar background',
				createMenuBarToggle('show_background', status)
			));
			section.appendChild(createMenuBarRow(
				'Recent documents, applications, and servers',
				createMenuBarSelect('recent_count', status)
			));
			panel.appendChild(section);

			return panel;
		}

		function createDesktopDockPanel(status) {
			const panel = dom.createElement('div', 'aos-settings-pane-panel aos-settings-desktop-dock-panel');
			const dockSection = createSection('', 'aos-settings-list aos-settings-desktop-dock-list');
			const behaviorSection = createSection('', 'aos-settings-list aos-settings-desktop-dock-list');
			const appsSection = createAppLocationSection(status);
			const desktopSection = createSection('', 'aos-settings-list aos-settings-desktop-dock-list');
			const widgetsSection = createSection('', 'aos-settings-list aos-settings-desktop-dock-list');

			panel.dataset.aosSettingsPanel = 'desktop-dock';
			dockSection.appendChild(createDesktopDockSelectRow('Dock position on screen', 'dock_position', status));
			dockSection.appendChild(createDesktopDockSelectRow('Minimized window animation', 'minimize_animation', status));
			dockSection.appendChild(createDesktopDockToggleRow('Minimize windows into application icon', 'minimize_into_app_icon', status));

			behaviorSection.appendChild(createDesktopDockToggleRow('Automatically hide and show the Dock', 'auto_hide_dock', status));
			behaviorSection.appendChild(createDesktopDockToggleRow('Animate opening applications', 'animate_opening_apps', status));
			behaviorSection.appendChild(createDesktopDockToggleRow('Show indicators for open applications', 'show_open_indicators', status));
			desktopSection.appendChild(createDesktopDockSelectRow(
				'Click wallpaper to show desktop',
				'wallpaper_click',
				status,
				'Click wallpaper to move windows out of the way, revealing your desktop items and widgets.'
			));

			widgetsSection.appendChild(createDesktopDockToggleRow('Show widgets on desktop', 'show_widgets_desktop', status));
			widgetsSection.appendChild(createDesktopDockSelectRow('Dim widgets on desktop', 'dim_widgets', status));

			panel.appendChild(createSectionHeading('Dock'));
			panel.appendChild(createDesktopDockSliderSection(status));
			panel.appendChild(dockSection);
			panel.appendChild(behaviorSection);
			panel.appendChild(createSectionHeading('Apps'));
			panel.appendChild(appsSection);
			panel.appendChild(createSectionHeading('Desktop'));
			panel.appendChild(desktopSection);
			panel.appendChild(createSectionHeading('Widgets'));
			panel.appendChild(widgetsSection);

			return panel;
		}

		function createSidebarIcon(item) {
			const icon = dom.createElement('span', `aos-settings-sidebar-icon aos-settings-sidebar-icon-${item.tone || 'blue'}`);
			icon.appendChild(dom.createDashicon(item.icon));

			return icon;
		}

		function createSettingsRowIcon(iconName, tone = 'gray') {
			const icon = dom.createElement('span', `aos-settings-row-icon aos-settings-sidebar-icon-${tone}`);
			icon.appendChild(dom.createDashicon(iconName));

			return icon;
		}

		function executeMenuCommand(command, options = {}) {
			const commands = window.AdminOSMode && window.AdminOSMode.menuCommands;

			if (commands && typeof commands.execute === 'function') {
				commands.execute({
					command,
					icon: options.icon || '',
					label: options.label || '',
					target: options.target || '',
					title: options.title || options.windowTitle || options.label || '',
					url: options.url || ''
				});
			}
		}

		function createSettingsActionRow(options = {}) {
			const hasUrl = Boolean(options.url);
			const hasCommand = Boolean(options.command);
			const hasPanel = Boolean(options.panel);
			const isInteractive = hasUrl || hasCommand || hasPanel;
			const row = isInteractive ? document.createElement('button') : dom.createElement('div');
			const text = dom.createElement('span', 'aos-settings-row-text');

			if (isInteractive) {
				row.type = 'button';
			}
			if (hasUrl) {
				row.dataset.aosOpenUrl = options.url;
				row.dataset.aosTitle = options.windowTitle || options.title || options.label || 'WordPress';
				row.dataset.aosIcon = options.icon || 'dashicons-admin-generic';
			}
			if (hasCommand) {
				row.addEventListener('click', () => executeMenuCommand(options.command, options));
			}
			if (hasPanel) {
				row.addEventListener('click', () => openSettingsSubpanel(options.panel));
			}

			row.className = `aos-settings-action-row ${options.className || ''}`.trim();
			row.appendChild(createSettingsRowIcon(options.icon || 'dashicons-admin-generic', options.tone || 'gray'));
			text.appendChild(dom.createElement('strong', '', options.label || 'Profile'));
			if (options.description) {
				text.appendChild(dom.createElement('span', '', options.description));
			}
			row.appendChild(text);

			if (options.value) {
				row.appendChild(dom.createElement('span', 'aos-settings-row-value', options.value));
			} else if (isInteractive) {
				row.appendChild(dom.createElement('span', 'aos-settings-row-chevron'));
			}

			return row;
		}

		function createProfileActionRow(options = {}) {
			return createSettingsActionRow(Object.assign({}, options, {
				className: 'aos-settings-profile-action'
			}));
		}

		function createProfileSignOutButton() {
			const footer = dom.createElement('div', 'aos-settings-profile-footer');
			const button = document.createElement('button');

			button.type = 'button';
			button.className = 'aos-settings-profile-sign-out';
			button.textContent = 'Sign Out...';
			button.addEventListener('click', () => {
				executeMenuCommand('user.logout', {
					icon: 'dashicons-migrate',
					label: 'Sign Out...',
					url: config.logoutUrl || ''
				});
			});

			footer.appendChild(button);

			return footer;
		}

		function createProfilePanel() {
			const user = getUserProfile();
			const name = user.name || 'Admin';
			const role = user.role || user.subtitle || 'WordPress User';
			const profileUrl = user.profileUrl || '';
			const panel = dom.createElement('div', 'aos-settings-pane-panel aos-settings-profile-panel');
			const hero = dom.createElement('div', 'aos-settings-profile-hero');
			const accountSection = createSection('', 'aos-settings-profile-list');

			panel.dataset.aosSettingsPanel = 'profile';
			hero.appendChild(createEditableProfileAvatar(user, name, profileUrl));
			hero.appendChild(dom.createElement('h2', '', name));
			if (user.email) {
				hero.appendChild(dom.createElement('p', '', user.email));
			}

			accountSection.appendChild(createProfileActionRow({
				description: 'Name, contact, website, and bio',
				icon: 'dashicons-id',
				label: 'Personal Information',
				tone: 'gray',
				url: profileUrl,
				windowTitle: 'WordPress Profile'
			}));
			accountSection.appendChild(createProfileActionRow({
				description: 'Current access level',
				icon: 'dashicons-shield',
				label: 'Role & Permissions',
				tone: 'gray',
				value: role
			}));

			panel.append(hero, accountSection, createProfileSignOutButton());

			return panel;
		}

		function getGeneralSettingsConfig() {
			return settingsConfig.general && typeof settingsConfig.general === 'object'
				? settingsConfig.general
				: {};
		}

		function createSettingsHero(options = {}) {
			const hero = dom.createElement('section', 'aos-settings-summary-card');
			const icon = dom.createElement('span', 'aos-settings-summary-icon aos-settings-sidebar-icon-gray');

			icon.appendChild(dom.createDashicon(options.icon || 'dashicons-admin-generic'));
			hero.appendChild(icon);
			hero.appendChild(dom.createElement('h2', '', options.title || 'General'));
			if (options.description) {
				hero.appendChild(dom.createElement('p', '', options.description));
			}

			return hero;
		}

		function createGeneralPanel() {
			const general = getGeneralSettingsConfig();
			const groups = Array.isArray(general.groups) ? general.groups : [];
			const panel = dom.createElement('div', 'aos-settings-pane-panel aos-settings-general-panel');

			panel.dataset.aosSettingsPanel = 'general';
			panel.appendChild(createSettingsHero({
				description: general.description || 'Manage site information, updates, language, privacy, and WordPress tools.',
				icon: 'dashicons-admin-generic',
				title: 'General'
			}));

			groups.forEach((group) => {
				const items = Array.isArray(group.items) ? group.items : [];
				if (!items.length) {
					return;
				}

				const section = createSection('', 'aos-settings-list');
				items.forEach((item) => {
					section.appendChild(createSettingsActionRow(item));
				});
				panel.appendChild(section);
			});

			return panel;
		}

		function createSettingsAboutDevice(siteInfo = {}) {
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

		function createSettingsAboutInfoRow(label, value) {
			const row = dom.createElement('div', 'aos-settings-about-info-row');

			row.appendChild(dom.createElement('span', 'aos-settings-about-info-label', label));
			row.appendChild(dom.createElement('span', 'aos-settings-about-info-value', value));

			return row;
		}

		function createSettingsAboutInfoCard(siteInfo = {}) {
			const section = createSection('', 'aos-settings-about-info-card');
			const rows = [
				{ label: 'Name', value: siteInfo.name || '' },
				{ label: 'Address', value: siteInfo.url || '' }
			].concat(Array.isArray(siteInfo.rows) ? siteInfo.rows : []);

			rows.forEach((row) => {
				if (!row || !row.label || !row.value) {
					return;
				}

				section.appendChild(createSettingsAboutInfoRow(row.label, row.value));
			});

			return section;
		}

		function createSettingsAboutFeatureIcon(iconName) {
			const icon = dom.createElement('span', 'aos-settings-about-feature-icon');
			icon.appendChild(dom.createDashicon(iconName || 'dashicons-admin-generic'));

			return icon;
		}

		function createSettingsAboutFeatureCard(info = {}) {
			if (!info || typeof info !== 'object' || !info.title) {
				return null;
			}

			const section = createSection('', 'aos-settings-about-feature-card');
			const row = dom.createElement('div', 'aos-settings-about-feature-row');
			const text = dom.createElement('span', 'aos-settings-about-feature-text');

			text.appendChild(dom.createElement('strong', '', info.title));
			if (info.description) {
				text.appendChild(dom.createElement('span', '', info.description));
			}

			row.appendChild(createSettingsAboutFeatureIcon(info.icon));
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
					executeMenuCommand('open-url', {
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

		function createSettingsAboutDiagnostics(siteInfo = {}) {
			if (!siteInfo.moreInfoUrl) {
				return null;
			}

			const section = createSection('', 'aos-settings-about-diagnostics');
			const row = dom.createElement('div', 'aos-settings-about-diagnostics-row');
			const text = dom.createElement('span', 'aos-settings-row-text');
			const button = document.createElement('button');

			button.type = 'button';
			button.className = 'aos-settings-about-button';
			button.textContent = siteInfo.moreInfoLabel || 'More Info...';
			button.addEventListener('click', () => {
				executeMenuCommand('open-url', {
					icon: 'dashicons-heart',
					label: siteInfo.moreInfoLabel || 'More Info...',
					title: siteInfo.moreInfoTitle || 'Site Health Info',
					url: siteInfo.moreInfoUrl
				});
			});

			text.appendChild(dom.createElement('strong', '', 'Site Health'));
			text.appendChild(dom.createElement('span', '', 'WordPress diagnostics and environment report'));
			row.appendChild(createSettingsRowIcon('dashicons-heart', 'red'));
			row.appendChild(text);
			row.appendChild(button);
			section.appendChild(row);

			return section;
		}

		function createGeneralAboutPanel() {
			const siteInfo = config.siteInfo && typeof config.siteInfo === 'object' ? config.siteInfo : {};
			const panel = dom.createElement('div', 'aos-settings-pane-panel aos-settings-about-panel');
			const hero = dom.createElement('div', 'aos-settings-about-hero');
			const diagnostics = createSettingsAboutDiagnostics(siteInfo);
			const wordpressSection = createSettingsAboutFeatureCard(siteInfo.wordpress);
			const displaySection = createSettingsAboutFeatureCard(siteInfo.display);

			panel.dataset.aosSettingsPanel = 'general-about';
			panel.dataset.aosSettingsSidebar = 'general';
			panel.dataset.aosSettingsTitle = 'About';
			hero.appendChild(createSettingsAboutDevice(siteInfo));
			hero.appendChild(dom.createElement('h2', '', siteInfo.name || 'WordPress Site'));
			if (siteInfo.url) {
				hero.appendChild(dom.createElement('p', '', siteInfo.url));
			}

			panel.appendChild(hero);
			panel.appendChild(createSettingsAboutInfoCard(siteInfo));
			if (wordpressSection) {
				panel.appendChild(createSectionHeading('WordPress'));
				panel.appendChild(wordpressSection);
			}
			if (displaySection) {
				panel.appendChild(createSectionHeading('Displays'));
				panel.appendChild(displaySection);
			}
			if (diagnostics) {
				panel.appendChild(createSectionHeading('Diagnostics'));
				panel.appendChild(diagnostics);
			}
			if (siteInfo.footer) {
				panel.appendChild(dom.createElement('p', 'aos-settings-about-footer', siteInfo.footer));
			}

			return panel;
		}

		function createUserProfile() {
			const user = getUserProfile();
			const name = user.name || 'Admin';
			const profile = document.createElement('button');

			profile.type = 'button';
			profile.className = 'aos-settings-profile';
			profile.dataset.aosSettingsSection = profileItem.id;
			profile.setAttribute('aria-label', `${profileItem.label}: ${name}`);
			profile.addEventListener('click', () => setActiveSection(profileItem.id));
			const text = dom.createElement('span', 'aos-settings-profile-text');
			text.appendChild(dom.createElement('strong', '', name));
			text.appendChild(dom.createElement('span', '', user.subtitle || 'WordPress User'));

			profile.appendChild(createAvatar('aos-settings-profile-avatar', user, name));
			profile.appendChild(text);
			sidebarButtons.push({
				button: profile,
				id: profileItem.id
			});

			return profile;
		}

		function createSettingsSidebar() {
			const sidebar = dom.createElement('aside', 'aos-settings-sidebar');
			const dragZone = dom.createElement('div', 'aos-split-sidebar-drag-zone');
			const search = dom.createElement('label', 'aos-settings-search-field');
			const searchInput = document.createElement('input');
			const nav = dom.createElement('nav', 'aos-settings-sidebar-nav');
			const navItems = [];

			dragZone.dataset.aosDragHandle = '';
			dragZone.setAttribute('aria-hidden', 'true');
			sidebar.appendChild(dragZone);

			search.appendChild(dom.createDashicon('dashicons-search'));
			searchInput.type = 'search';
			searchInput.placeholder = 'Search';
			searchInput.setAttribute('aria-label', 'Search settings');
			search.appendChild(searchInput);

			sidebar.appendChild(search);
			sidebar.appendChild(createUserProfile());

			nav.setAttribute('aria-label', 'Settings sections');
			sidebarItems.forEach((item) => {
				const button = document.createElement('button');
				button.type = 'button';
				button.className = 'aos-settings-sidebar-item';
				button.dataset.aosSettingsSection = item.id;
				button.disabled = Boolean(item.disabled);
				button.appendChild(createSidebarIcon(item));
				button.appendChild(dom.createElement('span', 'aos-settings-sidebar-label', item.label));
				if (!item.disabled) {
					button.addEventListener('click', () => setActiveSection(item.id));
				}
				if (item.id === activeSection) {
					button.classList.add('is-active');
					button.setAttribute('aria-current', 'page');
				}
				nav.appendChild(button);
				sidebarButtons.push({
					button,
					id: item.id
				});
				navItems.push({
					button,
					label: item.label.toLowerCase()
				});
			});

			searchInput.addEventListener('input', () => {
				const query = searchInput.value.trim().toLowerCase();
				navItems.forEach((item) => {
					item.button.hidden = query ? !item.label.includes(query) : false;
				});
			});

			sidebar.appendChild(nav);

			return sidebar;
		}

		function createPaneHeader(title) {
			const header = dom.createElement('header', 'aos-settings-pane-header');
			const history = dom.createElement('div', 'aos-settings-history');
			const titleElement = dom.createElement('h1', '', title);
			header.dataset.aosDragHandle = '';
			history.dataset.aosNoDrag = '';

			['back', 'forward'].forEach((direction) => {
				const button = document.createElement('button');
				button.type = 'button';
				button.className = `aos-settings-history-button aos-settings-history-button-${direction}`;
				button.disabled = true;
				button.setAttribute('aria-label', direction === 'back' ? 'Back' : 'Forward');
				button.appendChild(dom.createElement('span', 'aos-settings-history-chevron'));
				if (direction === 'back') {
					backButton = button;
					button.addEventListener('click', () => {
						const previousPanel = panelHistory.pop();
						if (previousPanel) {
							panelForwardHistory.push(activePanel);
							showSettingsPanel(previousPanel, {
								clearForward: false
							});
						}
					});
				} else {
					forwardButton = button;
					button.addEventListener('click', () => {
						const nextPanel = panelForwardHistory.pop();
						if (nextPanel) {
							showSettingsPanel(nextPanel, {
								clearForward: false,
								pushHistory: true
							});
						}
					});
				}
				history.appendChild(button);
			});

			header.appendChild(history);
			header.appendChild(titleElement);
			paneTitle = titleElement;

			return header;
		}

		function saveTheme(themeId, status) {
			status.textContent = 'Saving...';

			api.post('admin_os_mode_save_theme', {
				theme_id: themeId
			})
				.then((result) => {
					if (!result || !result.success) {
						const message = result && result.data && result.data.message
							? result.data.message
							: 'Theme could not be saved.';
						status.textContent = message;
						return;
					}

					status.textContent = 'Theme saved.';
					window.setTimeout(() => {
						window.location.href = config.shellUrl || window.location.href;
					}, 250);
				})
				.catch((error) => {
					status.textContent = error && error.message ? error.message : 'Theme could not be saved.';
				});
		}

		const content = dom.createElement('div', 'aos-settings');
		settingsRoot = content;
		const main = dom.createElement('div', 'aos-settings-main');
		const pane = dom.createElement('div', 'aos-settings-pane');
		const appearancePanel = dom.createElement('div', 'aos-settings-pane-panel');
		const status = dom.createElement('div', 'aos-settings-status');
		appearancePanel.dataset.aosSettingsPanel = 'appearance';
		status.setAttribute('role', 'status');
		status.setAttribute('aria-live', 'polite');

		const appearanceSection = createSection('', 'aos-settings-section-appearance');
		appearanceSection.appendChild(createSettingsRow('Appearance', createOptionGroup('mode', [
			{ value: 'auto', label: 'Auto' },
			{ value: 'light', label: 'Light' },
			{ value: 'dark', label: 'Dark' }
		], status, 'aos-settings-preview-option', 'aos-settings-appearance-preview')));
		appearanceSection.appendChild(createSettingsRow('Liquid Glass', createOptionGroup('window_material', [
			{ value: 'clear', label: 'Clear' },
			{ value: 'tinted', label: 'Tinted' }
		], status, 'aos-settings-preview-option', 'aos-settings-material-preview'), 'Choose your preferred Liquid Glass look.', 'aos-settings-row-fluid-label'));

		const themeSection = createSection('', 'aos-settings-section-theme');
		themeSection.appendChild(createSettingsRow('Color', createAccentGroup(status)));
		themeSection.appendChild(createSettingsRow('Icon & widget style', createOptionGroup('icon_widget_style', [
			{ value: 'default', label: 'Default' },
			{ value: 'dark', label: 'Dark' },
			{ value: 'clear', label: 'Clear' },
			{ value: 'tinted', label: 'Tinted' }
		], status, 'aos-settings-icon-option', 'aos-settings-icon-preview')));

		let installedThemeSection = null;
		if (themes.length > 1) {
			const themeSelect = document.createElement('select');
			installedThemeSection = createSection('', 'aos-settings-section-installed-theme');
			themeSelect.className = 'aos-settings-control';
			themes.forEach((theme) => {
				const option = document.createElement('option');
				option.value = theme.id;
				option.textContent = getThemeOptionLabel(theme);
				option.selected = config.theme && config.theme.id === theme.id;
				themeSelect.appendChild(option);
			});
			installedThemeSection.appendChild(createSettingsRow('Theme', themeSelect));

			const saveThemeButton = createButton('Apply Theme');
			saveThemeButton.addEventListener('click', () => saveTheme(themeSelect.value, status));
			installedThemeSection.appendChild(saveThemeButton);
		}

		appearancePanel.appendChild(appearanceSection);
		appearancePanel.appendChild(createSectionHeading('Theme'));
		appearancePanel.appendChild(themeSection);
		if (installedThemeSection) {
			appearancePanel.appendChild(createSectionHeading('Installed Theme'));
			appearancePanel.appendChild(installedThemeSection);
		}
		pane.appendChild(createGeneralPanel());
		pane.appendChild(createGeneralAboutPanel());
		pane.appendChild(createProfilePanel());
		pane.appendChild(appearancePanel);
		pane.appendChild(createDesktopDockPanel(status));
		pane.appendChild(createMenuBarPanel(status));
		pane.appendChild(createWallpaperPanel(status));
		pane.appendChild(status);

		main.appendChild(createPaneHeader('General'));
		main.appendChild(pane);
		content.appendChild(createSettingsSidebar());
		content.appendChild(main);
		syncAppearanceControls();
		syncDesktopDockControls();
		syncMenuBarControls();
		syncWallpaperControls();
		setActiveSection(activeSection);
		content.aosOpenPanel = (panelId) => {
			if (!panelId || !content.querySelector(`[data-aos-settings-panel="${dom.escapeAttribute(panelId)}"]`)) {
				return false;
			}

			showSettingsPanel(panelId, {
				pushHistory: activePanel !== panelId
			});
			return true;
		};

		return content;
	};
})();
