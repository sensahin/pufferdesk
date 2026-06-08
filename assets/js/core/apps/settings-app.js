(function () {
	'use strict';

	window.WPAdminOS = window.WPAdminOS || {};
	window.WPAdminOS.apps = window.WPAdminOS.apps || {};

	window.WPAdminOS.apps.createSettingsApp = function createSettingsApp(context = {}) {
		const dom = window.WPAdminOS.dom;
		const api = window.WPAdminOS.services.api;
		const storage = window.WPAdminOS.services.storage;
		const appearance = window.WPAdminOS.appearance;
		const desktopDock = window.WPAdminOS.desktopDock;
		const menuBar = window.WPAdminOS.menuBar;
		const wallpaper = window.WPAdminOS.wallpaper;
		const config = context.config || window.WPAdminOS.config.get();
		const settingsConfig = config.settings && typeof config.settings === 'object' ? config.settings : {};
		const capabilities = settingsConfig.capabilities && typeof settingsConfig.capabilities === 'object'
			? settingsConfig.capabilities
			: (config.shellCapabilities && typeof config.shellCapabilities === 'object' ? config.shellCapabilities : {});
		const settingsLabels = window.WPAdminOS.apps.settings.createLabels(settingsConfig);
		const settingsUI = window.WPAdminOS.apps.settings.createUI({ dom });
		const apps = Array.isArray(config.apps) ? config.apps : [];
		const themes = Array.isArray(config.themes) ? config.themes : [];
		const shell = document.querySelector('[data-wp-adminos-shell]');
		const appSurfaceManager = window.WPAdminOS.apps.createAppSurfaceManager(shell, config, {
			apps
		});
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
		let currentAppLoginItems = normalizeAppLoginItems(config.appLoginItems || []);
		let currentMenuBar = menuBar
			? menuBar.normalize(config.menuBar || {})
			: Object.assign({}, config.menuBar || {});
		let saveTimer = null;
		let desktopDockSaveTimer = null;
		let appLocationSaveTimer = null;
		let appLoginItemSaveTimer = null;
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
		const appLoginItemControls = [];
		const menuBarControls = [];
		const sidebarButtons = [];
		const wallpaperPhotoVisibleCount = 4;
		const t = settingsLabels.get;

		const accentOptions = settingsLabels.getOptions('appearance.accentOptions');
		const desktopDockSelectOptions = t('desktopDock.selectOptions', {});
		const appLocationOptions = settingsLabels.getOptions('desktopDock.appLocationOptions');
		const menuBarSelectOptions = t('menuBar.selectOptions', {});
		const sidebarItems = settingsLabels.getOptions('sidebar.items').filter((item) => item && item.visible !== false);
		const profileItem = { id: 'profile', label: t('profile.sectionLabel', 'WordPress Account') };
		const createSettingsRow = settingsUI.createSettingsRow;
		const createSection = settingsUI.createSection;
		const createSectionHeading = settingsUI.createSectionHeading;
		const createButton = settingsUI.createButton;
		const initialSidebarItem = sidebarItems.find((item) => item && !item.disabled) || sidebarItems[0] || { id: 'general' };
		if (!sidebarItems.some((item) => item.id === activeSection && !item.disabled)) {
			activeSection = initialSidebarItem.id;
			activePanel = initialSidebarItem.id;
		}

		function getSidebarItem(id) {
			if (id === profileItem.id) {
				return profileItem;
			}

			return sidebarItems.find((item) => item.id === id) || sidebarItems[0] || { id, label: id };
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
			const family = theme.family_label || theme.family || t('appearance.themeFallbackLabel', 'Theme');
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
			return String(name || t('profile.defaultName', 'Admin'))
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
				avatar.dataset.aosTitle = t('profile.profileTitle', 'WordPress Profile');
				avatar.dataset.aosIcon = 'dashicons-admin-users';
				avatar.setAttribute('aria-label', t('profile.editProfileLabel', 'Edit profile'));
			}

			populateAvatar(avatar, user, name);
			if (profileUrl) {
				avatar.appendChild(dom.createElement('span', 'aos-settings-profile-hero-edit', t('profile.editLabel', 'Edit')));
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
				wallpaperAddPhotoLabel.textContent = t('wallpaper.addPhotoLabel', 'Add Photo...');
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
				const title = item.label || t('wallpaper.selectedPhotoLabel', 'Selected Photo');

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
			wallpaperPhotoToggle.textContent = wallpaperPhotoExpanded
				? t('wallpaper.showLessLabel', 'Show Less')
				: settingsLabels.format(t('wallpaper.showAllLabel', 'Show All (%d)'), [items.length]);
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
			removeButton.setAttribute('aria-label', t('wallpaper.removePhotoLabel', 'Remove photo'));
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
			status.textContent = t('status.saving', 'Saving...');

			saveTimer = window.setTimeout(() => {
				api.post('wp_adminos_save_appearance', currentAppearance)
					.then((result) => {
						if (!result || !result.success) {
							const message = result && result.data && result.data.message
								? result.data.message
								: t('status.appearanceSaveError', 'Appearance could not be saved.');
							status.textContent = message;
							return;
						}

						applyAppearance(result.data.appearance || currentAppearance);
						status.textContent = result.data.message || t('status.appearanceSaved', 'Appearance saved.');
					})
					.catch((error) => {
						status.textContent = error && error.message ? error.message : t('status.appearanceSaveError', 'Appearance could not be saved.');
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
				api.post('wp_adminos_save_desktop_dock', currentDesktopDock)
					.then((result) => {
						if (!result || !result.success) {
							status.textContent = result && result.data && result.data.message
								? result.data.message
									: t('status.desktopDockSaveError', 'Desktop & Dock could not be saved.');
							return;
						}

						applyDesktopDock(result.data.desktopDock || currentDesktopDock);
					})
					.catch((error) => {
						status.textContent = error && error.message ? error.message : t('status.desktopDockSaveError', 'Desktop & Dock could not be saved.');
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
			return appSurfaceManager.normalizeLocations(locations);
		}

		function normalizeAppLoginItems(items = []) {
			const validAppIds = new Set(apps.map((app) => app && app.id).filter(Boolean));
			const normalized = [];
			const seen = new Set();

			(Array.isArray(items) ? items : []).forEach((item) => {
				const appId = String(item || '');
				if (!appId || seen.has(appId) || !validAppIds.has(appId)) {
					return;
				}

				seen.add(appId);
				normalized.push(appId);
			});

			return normalized;
		}

		function getAppLocation(appId) {
			const fallback = appLocationOptions.length ? appLocationOptions[0].value : 'dock';

			return currentAppLocations[appId] || fallback;
		}

		function appOpensAtLogin(appId) {
			return currentAppLoginItems.includes(appId);
		}

		function renderAppLocationSurfaces() {
			appSurfaceManager.render(currentAppLocations);
		}

		function applyAppLocations(nextAppLocations) {
			currentAppLocations = normalizeAppLocations(nextAppLocations);
			config.appLocations = currentAppLocations;
			syncAppLocationControls();
			renderAppLocationSurfaces();
		}

		function saveAppLocations(status) {
			window.clearTimeout(appLocationSaveTimer);
			status.textContent = t('status.saving', 'Saving...');

			appLocationSaveTimer = window.setTimeout(() => {
				api.post('wp_adminos_save_app_locations', {
					locations: JSON.stringify(currentAppLocations)
				})
					.then((result) => {
						if (!result || !result.success) {
							status.textContent = result && result.data && result.data.message
								? result.data.message
								: t('status.appLocationsSaveError', 'App locations could not be saved.');
							return;
						}

						applyAppLocations(result.data.appLocations || currentAppLocations);
						status.textContent = result.data.message || t('status.appLocationsSaved', 'App locations saved.');
					})
					.catch((error) => {
						status.textContent = error && error.message ? error.message : t('status.appLocationsSaveError', 'App locations could not be saved.');
					});
			}, 180);
		}

		function updateAppLocation(appId, location, status) {
			applyAppLocations(Object.assign({}, currentAppLocations, {
				[appId]: location
			}));
			saveAppLocations(status);
		}

		function applyAppLoginItems(nextItems) {
			currentAppLoginItems = normalizeAppLoginItems(nextItems);
			config.appLoginItems = currentAppLoginItems.slice();
			syncAppLoginItemControls();
		}

		function saveAppLoginItems(status) {
			window.clearTimeout(appLoginItemSaveTimer);
			status.textContent = t('status.saving', 'Saving...');

			appLoginItemSaveTimer = window.setTimeout(() => {
				api.post('wp_adminos_save_app_login_items', {
					items: JSON.stringify(currentAppLoginItems)
				})
					.then((result) => {
						if (!result || !result.success) {
							status.textContent = result && result.data && result.data.message
								? result.data.message
								: t('status.loginItemsSaveError', 'Login items could not be saved.');
							return;
						}

						applyAppLoginItems(result.data.appLoginItems || currentAppLoginItems);
						status.textContent = result.data.message || t('status.loginItemsSaved', 'Login items saved.');
					})
					.catch((error) => {
						status.textContent = error && error.message ? error.message : t('status.loginItemsSaveError', 'Login items could not be saved.');
					});
			}, 180);
		}

		function updateAppLoginItem(appId, enabled, status) {
			const nextItems = enabled
				? currentAppLoginItems.concat(appId)
				: currentAppLoginItems.filter((item) => item !== appId);

			applyAppLoginItems(nextItems);
			saveAppLoginItems(status);
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

				api.post('wp_adminos_save_menu_bar', payload)
					.then((result) => {
						if (sequence !== menuBarSaveSequence) {
							return;
						}

						if (!result || !result.success) {
							status.textContent = result && result.data && result.data.message
								? result.data.message
									: t('status.menuBarSaveError', 'Menu Bar could not be saved.');
							return;
						}

						applyMenuBar(result.data.menuBar || currentMenuBar);
					})
					.catch((error) => {
						if (sequence !== menuBarSaveSequence) {
							return;
						}

							status.textContent = error && error.message ? error.message : t('status.menuBarSaveError', 'Menu Bar could not be saved.');
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
				entry.select.value = getAppLocation(entry.appId);
			});
		}

		function syncAppLoginItemControls() {
			appLoginItemControls.forEach((entry) => {
				entry.button.setAttribute('aria-pressed', appOpensAtLogin(entry.appId) ? 'true' : 'false');
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
			status.textContent = t('status.saving', 'Saving...');

			return api.post('wp_adminos_save_wallpaper', payload)
				.then((result) => {
					if (!result || !result.success) {
						const message = result && result.data && result.data.message
							? result.data.message
							: t('status.wallpaperSaveError', 'Wallpaper could not be saved.');
						status.textContent = message;
						if (fallbackWallpaper) {
							applyWallpaper(fallbackWallpaper);
						} else {
							syncWallpaperControls();
						}
						return null;
					}

					applyWallpaper(result.data.wallpaper || currentWallpaper);
					status.textContent = result.data.message || t('status.wallpaperSaved', 'Wallpaper saved.');
					return result.data.wallpaper || currentWallpaper;
				})
				.catch((error) => {
					status.textContent = error && error.message ? error.message : t('status.wallpaperSaveError', 'Wallpaper could not be saved.');
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

			status.textContent = t('status.removing', 'Removing...');

			api.post('wp_adminos_remove_wallpaper_upload', {
				attachment_id: attachmentId
			})
				.then((result) => {
					if (!result || !result.success) {
						const message = result && result.data && result.data.message
							? result.data.message
							: t('status.photoRemoveError', 'Photo could not be removed.');
						status.textContent = message;
						syncWallpaperControls();
						return;
					}

					applyWallpaper(result.data.wallpaper || currentWallpaper);
					status.textContent = result.data.message || t('status.photoRemoved', 'Photo removed.');
				})
				.catch((error) => {
					status.textContent = error && error.message ? error.message : t('status.photoRemoveError', 'Photo could not be removed.');
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
			option.textContent = t('desktopDock.selectOptions.dim_widgets.0.label', 'Automatically');
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
				option.selected = getAppLocation(app.id) === item.value;
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

		function createAppLoginItemToggle(app, status) {
			const button = document.createElement('button');

			button.type = 'button';
			button.className = 'aos-settings-toggle';
			button.setAttribute('aria-label', t('apps.openAtLoginLabel', 'Open at login'));
			button.setAttribute('aria-pressed', appOpensAtLogin(app.id) ? 'true' : 'false');
			button.addEventListener('click', () => updateAppLoginItem(app.id, !appOpensAtLogin(app.id), status));
			button.appendChild(dom.createElement('span', 'aos-settings-toggle-knob'));
			appLoginItemControls.push({
				appId: app.id,
				button
			});

			return button;
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
				if (app && app.id && !(app.dock && typeof app.dock === 'object' && app.dock.fixed === true)) {
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
						toggle.textContent = expanded
							? t('wallpaper.showLessLabel', 'Show Less')
							: settingsLabels.format(t('wallpaper.showAllLabel', 'Show All (%d)'), [items.length]);
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
				status.textContent = t('status.mediaUnavailable', 'Media Library is not available for this user.');
				return;
			}

			if (!mediaFrame) {
				mediaFrame = window.wp.media({
					title: t('wallpaper.chooseWallpaperTitle', 'Choose Wallpaper'),
					button: {
						text: t('wallpaper.useAsWallpaperLabel', 'Use as Wallpaper')
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
						status.textContent = t('status.invalidImage', 'Choose a valid image.');
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
								label: attachment.title || t('wallpaper.customWallpaperLabel', 'Custom Wallpaper'),
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
			const heading = dom.createElement('h3', '', t('wallpaper.yourPhotosHeading', 'Your Photos'));
			const grid = dom.createElement('div', 'aos-settings-wallpaper-photo-grid');
			const addButton = document.createElement('button');
			const toggle = document.createElement('button');
			const preview = dom.createElement('span', 'aos-settings-wallpaper-upload-preview');
			const icon = dom.createElement('span', 'aos-settings-wallpaper-upload-icon');
			const label = dom.createElement('span', 'aos-settings-wallpaper-upload-label', t('wallpaper.addPhotoLabel', 'Add Photo...'));

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

		function createDesktopDockSliderSection(status, options = {}) {
			const section = createSection('', 'aos-settings-desktop-dock-slider-section');
			const row = dom.createElement('div', 'aos-settings-desktop-dock-slider-row');

			if (options.size !== false) {
				row.appendChild(createDesktopDockRange('dock_size', t('desktopDock.rows.dockSize', 'Size'), {
					labels: [t('desktopDock.ranges.small', 'Small'), t('desktopDock.ranges.large', 'Large')],
					max: 72,
					min: 28
				}, status));
			}
			if (options.magnification !== false) {
				row.appendChild(createDesktopDockRange('dock_magnification', t('desktopDock.rows.dockMagnification', 'Magnification'), {
					labels: [t('desktopDock.ranges.off', 'Off'), t('desktopDock.ranges.small', 'Small'), t('desktopDock.ranges.large', 'Large')],
					max: 24,
					min: 0
				}, status));
			}
			if (!row.children.length) {
				return section;
			}
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

		function createSidebarIcon(item) {
			const icon = dom.createElement('span', `aos-settings-sidebar-icon aos-settings-sidebar-icon-${item.tone || 'blue'}`);
			icon.appendChild(dom.createDashicon(item.icon));

			return icon;
		}

		function createSettingsRowIcon(iconName, tone = 'gray') {
			return settingsUI.createRowIcon(iconName, tone);
		}

		function executeMenuCommand(command, options = {}) {
			const commands = window.WPAdminOS && window.WPAdminOS.menuCommands;

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
			return settingsUI.createActionRow(options, {
				executeCommand: executeMenuCommand,
				fallbackWindowTitle: t('generalPanel.fallbackWindowTitle', 'WordPress'),
				openPanel: openSettingsSubpanel
			});
		}

		function createProfileActionRow(options = {}) {
			return createSettingsActionRow(Object.assign({}, options, {
				className: 'aos-settings-profile-action'
			}));
		}

		function getGeneralSettingsConfig() {
			return settingsConfig.general && typeof settingsConfig.general === 'object'
				? settingsConfig.general
				: {};
		}

		function createSettingsHero(options = {}) {
			return settingsUI.createSummaryHero(options);
		}

		function createUserProfile() {
			const user = getUserProfile();
			const name = user.name || t('profile.defaultName', 'Admin');
			const profile = document.createElement('button');

			profile.type = 'button';
			profile.className = 'aos-settings-profile';
			profile.dataset.aosSettingsSection = profileItem.id;
			profile.setAttribute('aria-label', `${profileItem.label}: ${name}`);
			profile.addEventListener('click', () => setActiveSection(profileItem.id));
			const text = dom.createElement('span', 'aos-settings-profile-text');
			text.appendChild(dom.createElement('strong', '', name));
			text.appendChild(dom.createElement('span', '', user.subtitle || t('profile.defaultRole', 'WordPress User')));

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
			searchInput.placeholder = t('sidebar.searchPlaceholder', 'Search');
			searchInput.setAttribute('aria-label', t('sidebar.searchLabel', 'Search settings'));
			search.appendChild(searchInput);

			sidebar.appendChild(search);
			sidebar.appendChild(createUserProfile());

			nav.setAttribute('aria-label', t('sidebar.navLabel', 'Settings sections'));
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
				button.setAttribute('aria-label', direction === 'back' ? t('history.back', 'Back') : t('history.forward', 'Forward'));
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
			status.textContent = t('status.saving', 'Saving...');

			api.post('wp_adminos_save_theme', {
				theme_id: themeId
			})
				.then((result) => {
					if (!result || !result.success) {
						const message = result && result.data && result.data.message
							? result.data.message
							: t('status.themeSaveError', 'Theme could not be saved.');
						status.textContent = message;
						return;
					}

						status.textContent = t('status.themeSaved', 'Theme saved.');
						window.setTimeout(() => {
							window.location.href = config.shellUrl || window.location.href;
						}, 250);
					})
					.catch((error) => {
						status.textContent = error && error.message ? error.message : t('status.themeSaveError', 'Theme could not be saved.');
					});
			}

			const content = dom.createElement('div', 'aos-settings');
			settingsRoot = content;
			const main = dom.createElement('div', 'aos-settings-main');
			const pane = dom.createElement('div', 'aos-settings-pane');
			const status = dom.createElement('div', 'aos-settings-status');
			const settingsPanels = window.WPAdminOS.apps.settings;
			status.setAttribute('role', 'status');
			status.setAttribute('aria-live', 'polite');
			const panelContext = {
				capabilities,
				config,
				createAccentGroup,
				createAppLocationIcon,
				createAppLocationSelect,
				createAppLocationSection,
				createAppLoginItemToggle,
				createButton,
				createCollapsibleWallpaperSection,
				createDesktopDockSelectRow,
				createDesktopDockSliderSection,
				createDesktopDockToggleRow,
				createEditableProfileAvatar,
				createMenuBarRow,
				createMenuBarSelect,
				createMenuBarToggle,
				createOptionGroup,
				createPhotoWallpaperGroup,
				createProfileActionRow,
				createSection,
				createSectionHeading,
				createSettingsActionRow,
				createSettingsHero,
				createSettingsRowIcon,
				createSettingsRow,
				dom,
				executeMenuCommand,
				getGeneralSettingsConfig,
				getAppLocation,
				getAppLoginItems: () => currentAppLoginItems.slice(),
				getThemeOptionLabel,
				getUserProfile,
				getWallpaperGroup,
				saveTheme,
				settingsLabels,
				status,
				t,
				themes
			};

			pane.appendChild(settingsPanels.createGeneralPanel(panelContext));
			pane.appendChild(settingsPanels.createGeneralAboutPanel(panelContext));
			pane.appendChild(settingsPanels.createProfilePanel(panelContext));
			pane.appendChild(settingsPanels.createAppearancePanel(panelContext));
			pane.appendChild(settingsPanels.createDesktopDockPanel(panelContext));
			pane.appendChild(settingsPanels.createMenuBarPanel(panelContext));
			pane.appendChild(settingsPanels.createWallpaperPanel(panelContext));
			pane.appendChild(settingsPanels.createWidgetsPanel(panelContext));
			pane.appendChild(settingsPanels.createAppsPanel(panelContext));
			pane.appendChild(settingsPanels.createWorkspacePanel(panelContext));
			pane.appendChild(settingsPanels.createSystemPanel(panelContext));
			pane.appendChild(status);

		main.appendChild(createPaneHeader(t('generalPanel.title', 'General')));
		main.appendChild(pane);
		content.appendChild(createSettingsSidebar());
		content.appendChild(main);
		syncAppearanceControls();
		syncDesktopDockControls();
		syncAppLoginItemControls();
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

	if (typeof window.WPAdminOS.apps.registerNativeAppRenderer === 'function') {
		window.WPAdminOS.apps.registerNativeAppRenderer('settings', ({ config }) => ({
			bodyClass: 'aos-window-body aos-settings-body',
			contextMenu: false,
			content: window.WPAdminOS.apps.createSettingsApp({ config }),
			height: '680px',
			resizeMode: 'vertical',
			width: '725px'
		}));
	}
})();
