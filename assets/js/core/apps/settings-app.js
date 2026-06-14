(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};

	function getThemeSurfaces(config = {}) {
		return config.theme && config.theme.surfaces && typeof config.theme.surfaces === 'object'
			? config.theme.surfaces
			: {};
	}

	function getSettingsLayout(config = {}) {
		const surfaces = getThemeSurfaces(config);
		const layout = typeof surfaces.settings === 'string' ? surfaces.settings : '';

		return layout || 'pufferdesk-settings';
	}

	window.PufferDesk.apps.createSettingsApp = function createSettingsApp(context = {}) {
		const dom = window.PufferDesk.dom;
		const api = window.PufferDesk.services.api;
		const appearance = window.PufferDesk.appearance;
		const desktopDock = window.PufferDesk.desktopDock;
		const menuBar = window.PufferDesk.menuBar;
		const wallpaper = window.PufferDesk.wallpaper;
		const config = context.config || window.PufferDesk.config.get();
		const wallpaperTypes = window.PufferDesk.config.getContractMap('wallpaperTypes');
		const settingsConfig = config.settings && typeof config.settings === 'object' ? config.settings : {};
		const capabilities = settingsConfig.capabilities && typeof settingsConfig.capabilities === 'object'
			? settingsConfig.capabilities
			: (config.shellCapabilities && typeof config.shellCapabilities === 'object' ? config.shellCapabilities : {});
		const settingsLabels = window.PufferDesk.apps.settings.createLabels(settingsConfig);
		const settingsUI = window.PufferDesk.apps.settings.createUI({ dom, labels: settingsLabels });
		const getSettingAction = window.PufferDesk.config.getSettingAction.bind(window.PufferDesk.config);
		const apps = Array.isArray(config.apps) ? config.apps : [];
		const themes = Array.isArray(config.themes) ? config.themes : [];
		const themeModes = Array.isArray(config.themeModes) ? config.themeModes : [];
		const shell = document.querySelector('[data-pufferdesk-shell]');
		const appSurfaceManager = window.PufferDesk.apps.createAppSurfaceManager(shell, config, {
			apps
		});
		const appPreferences = window.PufferDesk.apps.createAppPreferenceStore(config, {
			api,
			apps,
			appSurfaceManager,
			onLocationsChange(locations) {
				currentAppLocations = locations;
				syncAppLocationControls();
			},
			onLoginItemsChange(items) {
				currentAppLoginItems = items.slice();
				syncAppLoginItemControls();
			}
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
		let currentAppLocations = appPreferences.getLocations();
		let currentAppLoginItems = appPreferences.getLoginItems();
		let currentMenuBar = menuBar
			? menuBar.normalize(config.menuBar || {})
			: Object.assign({}, config.menuBar || {});
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
		const settingsLayout = getSettingsLayout(config);
		const isWindowsSettingsLayout = settingsLayout === 'windows-settings';

		const accentOptions = settingsLabels.getOptions('appearance.accentOptions');
		const desktopDockSelectOptions = t('desktopDock.selectOptions', {});
		const appLocationOptions = settingsLabels.getOptions('desktopDock.appLocationOptions');
		const menuBarSelectOptions = t('menuBar.selectOptions', {});
		const sidebarItems = settingsLabels.getOptions('sidebar.items').filter((item) => item && item.visible !== false);
		const profileItem = { id: 'profile', label: t('profile.sectionLabel') };
		const createSettingsRow = settingsUI.createSettingsRow;
		const createSection = settingsUI.createSection;
		const createSectionHeading = settingsUI.createSectionHeading;
		const createButton = settingsUI.createButton;
		const createInlineSelect = settingsUI.createInlineSelect;
		const createRangeField = settingsUI.createRangeField;
		const updateRangeFill = settingsUI.updateRangeFill;
		const mutations = window.PufferDesk.apps.settings.createMutations({ api, t });
		const saveAppearanceMutation = mutations.createDebounced({
			action: getSettingAction('APPEARANCE'),
			errorText: t('status.appearanceSaveError'),
			onSuccess(data) {
				applyAppearance(data.appearance || currentAppearance);

				return data.message || t('status.appearanceSaved');
			},
			payload: () => currentAppearance,
			wait: 180
		});
		const saveDesktopDockMutation = mutations.createDebounced({
			action: getSettingAction('DESKTOP_DOCK'),
			errorText: t('status.desktopDockSaveError'),
			latestOnly: true,
			onSuccess(data) {
				applyDesktopDock(data.desktopDock || currentDesktopDock);

				return false;
			},
			payload: () => currentDesktopDock,
			wait: 180
		});
		const saveAppLocationsMutation = mutations.createDebounced(appPreferences.createLocationsMutationRequest({
			errorText: t('status.appLocationsSaveError'),
			onSuccess(data) {
				return data.message || t('status.appLocationsSaved');
			},
			wait: 180
		}));
		const saveAppLoginItemsMutation = mutations.createDebounced(appPreferences.createLoginItemsMutationRequest({
			errorText: t('status.loginItemsSaveError'),
			onSuccess(data) {
				return data.message || t('status.loginItemsSaved');
			},
			wait: 180
		}));
		const saveMenuBarMutation = mutations.createDebounced({
			action: getSettingAction('MENU_BAR'),
			errorText: t('status.menuBarSaveError'),
			latestOnly: true,
			onSuccess(data) {
				applyMenuBar(data.menuBar || currentMenuBar);

				return false;
			},
			payload: () => Object.assign({}, currentMenuBar),
			wait: 180
		});
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

		function goBackInSettingsHistory() {
			const previousPanel = panelHistory.pop();
			if (!previousPanel) {
				updateHistoryControls();
				return;
			}

			panelForwardHistory.push(activePanel);
			showSettingsPanel(previousPanel, {
				clearForward: false
			});
		}

		function goForwardInSettingsHistory() {
			const nextPanel = panelForwardHistory.pop();
			if (!nextPanel) {
				updateHistoryControls();
				return;
			}

			showSettingsPanel(nextPanel, {
				clearForward: false,
				pushHistory: true
			});
		}

		function showSettingsPanel(panelId, options = {}) {
			const panel = (settingsRoot || document).querySelector(`[data-pdk-settings-panel="${panelId}"]`);
			if (!panel) {
				return;
			}

			if (options.pushHistory && activePanel !== panelId) {
				panelHistory.push(activePanel);
				if (options.clearForward !== false) {
					panelForwardHistory.length = 0;
				}
			}

			(settingsRoot || document).querySelectorAll('[data-pdk-settings-panel]').forEach((settingsPanel) => {
				settingsPanel.hidden = settingsPanel.dataset.pdkSettingsPanel !== panelId;
			});

			activePanel = panelId;
			activeSection = panel.dataset.pdkSettingsSidebar || panelId;
			if (settingsRoot) {
				settingsRoot.dataset.pdkSettingsActivePanel = activePanel;
			}
			updateSidebarSelection(activeSection);
			if (paneTitle) {
				paneTitle.textContent = panel.dataset.pdkSettingsTitle || getSidebarItem(activeSection).label;
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
			const family = theme.family_label || theme.label || theme.family || t('appearance.themeFallbackLabel');
			const version = theme.version_label || theme.version || '';
			if (!version || theme.version === 'default') {
				return family;
			}

			return settingsLabels.format(t('appearance.themeVersionFormat'), [family, version]);
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

			if (preference.type === wallpaperTypes.UPLOAD) {
				return `${wallpaperTypes.UPLOAD}:${Number.parseInt(preference.attachment_id, 10) || 0}`;
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
			if (wallpaper && typeof wallpaper.getItemCssVariables === 'function') {
				return wallpaper.getItemCssVariables(item);
			}

			const cssValue = item.css_value || 'none';
			const layerCount = countWallpaperImageLayers(cssValue);
			const fit = item.fit || 'cover';
			const position = item.position || 'center center';

			return {
				'--pdk-wallpaper-image': cssValue,
				'--pdk-wallpaper-position': repeatWallpaperLayerValue(position, layerCount),
				'--pdk-wallpaper-repeat': repeatWallpaperLayerValue('no-repeat', layerCount),
				'--pdk-wallpaper-size': repeatWallpaperLayerValue(fit, layerCount)
			};
		}

		function applyWallpaperPreview(preview, item = {}) {
			if (item.type === wallpaperTypes.COLOR && item.swatch) {
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
				return getWallpaperItems().filter((item) => item && item.type === wallpaperTypes.COLOR);
			}

			return getWallpaperItems().filter((item) => item && item.type !== wallpaperTypes.UPLOAD && item.type !== wallpaperTypes.COLOR);
		}

		function getWallpaperUploads() {
			const uploads = currentWallpaper && Array.isArray(currentWallpaper.uploads)
				? currentWallpaper.uploads.filter((item) => item && item.type === wallpaperTypes.UPLOAD && Number.parseInt(item.attachment_id, 10) > 0)
				: [];
			const current = getWallpaperCurrent();
			const attachmentId = Number.parseInt(current.attachment_id, 10) || 0;

			if (current.type !== wallpaperTypes.UPLOAD || !attachmentId) {
				return uploads;
			}

			const currentKey = getWallpaperKey({
				type: wallpaperTypes.UPLOAD,
				attachment_id: attachmentId
			});
			const hasCurrent = uploads.some((item) => getWallpaperKey({
				type: wallpaperTypes.UPLOAD,
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
			return String(name || t('profile.defaultName'))
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

			avatar.className = 'pdk-settings-profile-hero-avatar';
			if (profileUrl) {
				avatar.type = 'button';
				avatar.dataset.pdkOpenUrl = profileUrl;
				avatar.dataset.pdkTitle = t('profile.profileTitle');
				avatar.dataset.pdkIcon = 'dashicons-admin-users';
				avatar.setAttribute('aria-label', t('profile.editProfileLabel'));
			}

			populateAvatar(avatar, user, name);
			if (profileUrl) {
				avatar.appendChild(dom.createElement('span', 'pdk-settings-profile-hero-edit', t('profile.editLabel')));
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
				const selected = button.dataset.pdkWallpaperKey === selectedKey;
				button.classList.toggle('is-selected', selected);
				button.setAttribute('aria-pressed', selected ? 'true' : 'false');
				if (button.pdkRemoveButton) {
					button.pdkRemoveButton.hidden = selected;
				}
				if (button.pdkPhotoItem) {
					button.pdkPhotoItem.classList.toggle('is-selected', selected);
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
				wallpaperAddPhotoLabel.textContent = t('wallpaper.addPhotoLabel');
			}
		}

		function syncUploadedPhotoOptions() {
			if (!wallpaperPhotoGrid) {
				return;
			}

			const uploads = getWallpaperUploads();
			const expectedKeys = uploads.map((item) => getWallpaperKey({
				type: wallpaperTypes.UPLOAD,
				attachment_id: item.attachment_id || 0
			}));

			wallpaperUploadedPhotoButtons = wallpaperUploadedPhotoButtons.filter((button) => {
				if (expectedKeys.includes(button.dataset.pdkWallpaperKey || '')) {
					return true;
				}

				wallpaperButtons = wallpaperButtons.filter((item) => item !== button);
				if (button.pdkPhotoItem) {
					button.pdkPhotoItem.remove();
				} else {
					button.remove();
				}
				return false;
			});

			uploads.forEach((item) => {
				const button = ensureUploadedPhotoOption(item);
				const preview = button.querySelector('.pdk-settings-wallpaper-selected-photo-preview');
				const label = button.querySelector('.pdk-settings-wallpaper-selected-photo-label');
				const title = item.label || t('wallpaper.selectedPhotoLabel');

				button.pdkWallpaperItem = item;
				button.setAttribute('aria-label', title);
				if (preview) {
					preview.style.backgroundImage = getWallpaperPreviewValue(item);
					preview.classList.add('has-wallpaper');
				}
				if (label) {
					label.textContent = title;
				}
				wallpaperPhotoGrid.appendChild(button.pdkPhotoItem || button);
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
				? t('wallpaper.showLessLabel')
				: settingsLabels.format(t('wallpaper.showAllLabel'), [items.length]);
			wallpaperPhotoToggle.setAttribute('aria-expanded', wallpaperPhotoExpanded ? 'true' : 'false');

			items.forEach((item, index) => {
				item.hidden = !wallpaperPhotoExpanded && index >= wallpaperPhotoVisibleCount;
			});
		}

		function ensureUploadedPhotoOption(item) {
			const key = getWallpaperKey({
				type: wallpaperTypes.UPLOAD,
				attachment_id: item.attachment_id || 0
			});
			const existing = wallpaperUploadedPhotoButtons.find((button) => button.dataset.pdkWallpaperKey === key);
			if (existing) {
				return existing;
			}

			const photoItem = dom.createElement('div', 'pdk-settings-wallpaper-photo-item pdk-settings-wallpaper-uploaded-photo-item');
			const uploadedButton = document.createElement('button');
			const uploadedPreview = dom.createElement('span', 'pdk-settings-wallpaper-upload-preview pdk-settings-wallpaper-selected-photo-preview');
			const uploadedLabel = dom.createElement('span', 'pdk-settings-wallpaper-upload-label pdk-settings-wallpaper-selected-photo-label');
			const removeButton = document.createElement('button');

			uploadedButton.type = 'button';
			uploadedButton.className = 'pdk-settings-wallpaper-photo-button pdk-settings-wallpaper-selected-photo-button';
			uploadedButton.dataset.pdkWallpaperKey = key;
			uploadedButton.setAttribute('aria-pressed', 'false');
			uploadedPreview.setAttribute('aria-hidden', 'true');
			uploadedButton.append(uploadedPreview, uploadedLabel);
			uploadedButton.addEventListener('click', () => {
				if (uploadedButton.pdkWallpaperItem) {
					selectWallpaperItem(uploadedButton.pdkWallpaperItem, wallpaperPhotoStatus);
				}
			});

			removeButton.type = 'button';
			removeButton.className = 'pdk-settings-wallpaper-remove-photo';
			removeButton.hidden = true;
			removeButton.setAttribute('aria-label', t('wallpaper.removePhotoLabel'));
			removeButton.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				if (uploadedButton.pdkWallpaperItem) {
					removeUploadedWallpaper(uploadedButton.pdkWallpaperItem, wallpaperPhotoStatus);
				}
			});

			photoItem.append(uploadedButton, removeButton);
			uploadedButton.pdkWallpaperItem = item;
			uploadedButton.pdkPhotoItem = photoItem;
			uploadedButton.pdkRemoveButton = removeButton;
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
			saveAppearanceMutation({ status });
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
			saveDesktopDockMutation({ status });
		}

		function updateDesktopDock(key, value, status) {
			applyDesktopDock(Object.assign({}, currentDesktopDock, {
				[key]: value
			}));
			saveDesktopDock(status);
		}

		function getAppLocation(appId) {
			const fallback = appLocationOptions.length ? appLocationOptions[0].value : 'dock';

			return appPreferences.getLocation(appId, fallback);
		}

		function appOpensAtLogin(appId) {
			return appPreferences.opensAtLogin(appId);
		}

		function applyAppLocations(nextAppLocations) {
			appPreferences.applyLocations(nextAppLocations);
		}

		function saveAppLocations(status) {
			saveAppLocationsMutation({ status });
		}

		function updateAppLocation(appId, location, status) {
			applyAppLocations(Object.assign({}, currentAppLocations, {
				[appId]: location
			}));
			saveAppLocations(status);
		}

		function applyAppLoginItems(nextItems) {
			appPreferences.applyLoginItems(nextItems);
		}

		function saveAppLoginItems(status) {
			saveAppLoginItemsMutation({ status });
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
			saveMenuBarMutation({ status });
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
			updateRangeFill(input);
		}

		function saveWallpaper(payload, status, fallbackWallpaper = null) {
			return mutations.post({
				action: getSettingAction('WALLPAPER'),
				errorText: t('status.wallpaperSaveError'),
				onError() {
					if (fallbackWallpaper) {
						applyWallpaper(fallbackWallpaper);
					} else {
						syncWallpaperControls();
					}
				},
				onSuccess(data) {
					applyWallpaper(data.wallpaper || currentWallpaper);

					return data.message || t('status.wallpaperSaved');
				},
				payload,
				status
			}).then((data) => data ? data.wallpaper || currentWallpaper : null);
		}

		function removeUploadedWallpaper(item, status) {
			const attachmentId = Number.parseInt(item.attachment_id, 10) || 0;
			if (!attachmentId) {
				return;
			}

			mutations.post({
				action: getSettingAction('WALLPAPER_UPLOADS'),
				errorText: t('status.photoRemoveError'),
				onError() {
					syncWallpaperControls();
				},
				onSuccess(data) {
					applyWallpaper(data.wallpaper || currentWallpaper);

					return data.message || t('status.photoRemoved');
				},
				payload: {
					attachment_id: attachmentId
				},
				pendingText: t('status.removing'),
				status
			});
		}

		function selectWallpaperItem(item, status) {
			const attachmentId = item.type === wallpaperTypes.UPLOAD
				? Number.parseInt(item.attachment_id, 10) || 0
				: 0;
			const fallbackWallpaper = currentWallpaper;
			const nextWallpaper = Object.assign({}, currentWallpaper, {
				preference: {
					type: item.type,
					id: item.type === wallpaperTypes.UPLOAD ? '' : item.id,
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
			preview.dataset.pdkPreviewValue = option.value;
			button.appendChild(preview);
			button.appendChild(dom.createElement('span', 'pdk-settings-option-label', option.label));

			return button;
		}

		function createOptionGroup(key, options, status, className, previewClassName) {
			const group = dom.createElement('div', 'pdk-settings-option-group');
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
			const group = dom.createElement('div', 'pdk-settings-swatch-group');
			const buttons = accentOptions.map((option) => {
				const button = document.createElement('button');
				button.type = 'button';
				button.className = `pdk-settings-swatch pdk-settings-swatch-${option.value}`;
				button.value = option.value;
				button.title = option.label;
				button.setAttribute('aria-label', option.label);
				button.setAttribute('aria-pressed', 'false');
				button.addEventListener('click', () => updateAppearance('accent_color', option.value, status));
				const swatch = dom.createElement('span', 'pdk-settings-swatch-dot');
				swatch.setAttribute('aria-hidden', 'true');
				button.appendChild(swatch);
				group.appendChild(button);

				return button;
			});
			accentLabel = dom.createElement('span', 'pdk-settings-swatch-label', getAccentOption(currentAppearance.accent_color).label);
			group.appendChild(accentLabel);

			optionGroups.push({
				buttons,
				key: 'accent_color'
			});

			return group;
		}

		function createSingleOptionSelect(labelText) {
			const select = document.createElement('select');
			select.className = 'pdk-settings-control';
			select.disabled = true;

			const option = document.createElement('option');
			option.value = 'automatic';
			option.textContent = t('desktopDock.selectOptions.dim_widgets.0.label');
			option.selected = true;
			select.appendChild(option);

			return createSettingsRow(labelText, select);
		}

		function createDesktopDockRange(key, labelText, options, status) {
			const range = createRangeField({
				label: labelText,
				labels: options.labels || [],
				max: options.max,
				min: options.min,
				onInput: (value) => {
					updateDesktopDock(key, value, status);
				},
				step: options.step || 1,
				value: currentDesktopDock[key]
			});
			desktopDockControls.push({
				input: range.input,
				key,
				type: 'range'
			});

			return range.field;
		}

		function createDesktopDockSelect(key, status) {
			const { select, wrap } = createInlineSelect({
				options: desktopDockSelectOptions[key] || [],
				value: currentDesktopDock[key],
				onChange: (value, control) => {
					updateDesktopDock(key, value, status);
					control.blur();
				}
			});

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
			button.className = 'pdk-settings-toggle';
			button.setAttribute('aria-pressed', currentDesktopDock[key] ? 'true' : 'false');
			button.addEventListener('click', () => updateDesktopDock(key, !currentDesktopDock[key], status));
			button.appendChild(dom.createElement('span', 'pdk-settings-toggle-knob'));
			desktopDockControls.push({
				button,
				key,
				type: 'toggle'
			});

			return button;
		}

		function createAppLocationIcon(app) {
			const icon = dom.createElement('span', 'pdk-settings-row-icon pdk-settings-sidebar-icon-gray');

			icon.appendChild(dom.createIcon(app.icon));

			return icon;
		}

		function createAppLocationSelect(app, status) {
			const { select, wrap } = createInlineSelect({
				options: appLocationOptions,
				value: getAppLocation(app.id),
				onChange: (value, control) => {
					updateAppLocation(app.id, value, status);
					control.blur();
				}
			});

			appLocationControls.push({
				appId: app.id,
				select
			});

			return wrap;
		}

		function createAppLoginItemToggle(app, status) {
			const button = document.createElement('button');

			button.type = 'button';
			button.className = 'pdk-settings-toggle';
			button.setAttribute('aria-label', t('apps.openAtLoginLabel'));
			button.setAttribute('aria-pressed', appOpensAtLogin(app.id) ? 'true' : 'false');
			button.addEventListener('click', () => updateAppLoginItem(app.id, !appOpensAtLogin(app.id), status));
			button.appendChild(dom.createElement('span', 'pdk-settings-toggle-knob'));
			appLoginItemControls.push({
				appId: app.id,
				button
			});

			return button;
		}

		function createAppLocationControls(app, status) {
			const controls = dom.createElement('span', 'pdk-settings-app-controls pdk-settings-app-location-controls');
			const login = dom.createElement('span', 'pdk-settings-app-login-control');

			controls.appendChild(createAppLocationSelect(app, status));
			login.appendChild(dom.createElement('span', 'pdk-settings-app-login-label', t('apps.openAtLoginLabel')));
			login.appendChild(createAppLoginItemToggle(app, status));
			controls.appendChild(login);

			return controls;
		}

		function createAppLocationRow(app, status) {
			const row = dom.createElement('div', 'pdk-settings-row pdk-settings-app-location-row');

			row.appendChild(createAppLocationIcon(app));
			row.appendChild(dom.createElement('span', 'pdk-settings-label', app.label || app.id));
			row.appendChild(createAppLocationControls(app, status));

			return row;
		}

		function createAppLocationSection(status) {
			const section = createSection('', 'pdk-settings-list pdk-settings-app-location-list');

			apps.forEach((app) => {
				if (app && app.id && !(app.dock && typeof app.dock === 'object' && app.dock.fixed === true)) {
					section.appendChild(createAppLocationRow(app, status));
				}
			});

			return section;
		}

		function createDesktopDockRow(labelText, control, descriptionText = '') {
			const row = dom.createElement('div', 'pdk-settings-row pdk-settings-desktop-dock-row');
			const labelStack = dom.createElement('span', 'pdk-settings-label-stack');

			labelStack.appendChild(dom.createElement('span', 'pdk-settings-label', labelText));
			if (descriptionText) {
				labelStack.appendChild(dom.createElement('span', 'pdk-settings-description', descriptionText));
			}
			row.append(labelStack, control);

			return row;
		}

		function createWallpaperOption(item, status, extraClassName = '') {
			const button = document.createElement('button');
			const preview = dom.createElement('span', item.type === wallpaperTypes.COLOR ? 'pdk-settings-wallpaper-swatch' : 'pdk-settings-wallpaper-preview');
			const label = dom.createElement('span', 'pdk-settings-wallpaper-label', item.label || item.id);
			const key = getWallpaperKey({
				type: item.type,
				id: item.id,
				attachment_id: item.attachment_id || 0
			});

			button.type = 'button';
			button.className = `pdk-settings-wallpaper-option ${extraClassName}`.trim();
			button.dataset.pdkWallpaperKey = key;
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
			const grid = dom.createElement('div', `pdk-settings-wallpaper-grid ${className}`.trim());
			items.forEach((item) => {
				if (item && item.type !== wallpaperTypes.UPLOAD) {
					grid.appendChild(createWallpaperOption(item, status, optionClassName));
				}
			});

			return grid;
		}

		function createCollapsibleWallpaperSection(title, items, status, options = {}) {
			const visibleCount = Number.parseInt(options.visibleCount, 10) || 4;
			const section = createSection('', options.sectionClassName || '');
			const header = dom.createElement('div', 'pdk-settings-section-header');
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
				toggle.className = 'pdk-settings-section-toggle';

					const syncExpandedState = () => {
						grid.classList.toggle('is-collapsed', !expanded);
						Array.from(grid.children).forEach((child, index) => {
							child.hidden = !expanded && index >= visibleCount;
						});
						toggle.textContent = expanded
							? t('wallpaper.showLessLabel')
							: settingsLabels.format(t('wallpaper.showAllLabel'), [items.length]);
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
				status.textContent = t('status.mediaUnavailable');
				return;
			}

			if (!mediaFrame) {
				mediaFrame = window.wp.media({
					title: t('wallpaper.chooseWallpaperTitle'),
					button: {
						text: t('wallpaper.useAsWallpaperLabel')
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
						status.textContent = t('status.invalidImage');
						return;
					}

					const imageCssValue = getWallpaperImageCssValue(imageUrl);
					const fallbackWallpaper = currentWallpaper;
					const nextWallpaper = Object.assign({}, currentWallpaper, {
						preference: {
							type: wallpaperTypes.UPLOAD,
							id: '',
							attachment_id: attachmentId,
							fit: 'cover',
							position: 'center center'
						},
						current: {
								type: wallpaperTypes.UPLOAD,
								id: 'custom',
								attachment_id: attachmentId,
								label: attachment.title || t('wallpaper.customWallpaperLabel'),
							preview: imageCssValue,
							css_value: imageCssValue,
							fit: 'cover',
							position: 'center center'
						},
						css_variables: {
							'--pdk-wallpaper-image': imageCssValue,
							'--pdk-wallpaper-position': 'center center',
							'--pdk-wallpaper-repeat': 'no-repeat',
							'--pdk-wallpaper-size': 'cover'
						}
					});

					applyWallpaper(nextWallpaper);
					saveWallpaper(nextWallpaper.preference, status, fallbackWallpaper);
				});
			}

			mediaFrame.open();
		}

		function createPhotoWallpaperGroup(status) {
			const group = dom.createElement('div', 'pdk-settings-wallpaper-photos');
			const header = dom.createElement('div', 'pdk-settings-wallpaper-photos-header');
			const heading = dom.createElement('h3', '', t('wallpaper.yourPhotosHeading'));
			const grid = dom.createElement('div', 'pdk-settings-wallpaper-photo-grid');
			const addButton = document.createElement('button');
			const toggle = document.createElement('button');
			const preview = dom.createElement('span', 'pdk-settings-wallpaper-upload-preview');
			const icon = dom.createElement('span', 'pdk-settings-wallpaper-upload-icon');
			const label = dom.createElement('span', 'pdk-settings-wallpaper-upload-label', t('wallpaper.addPhotoLabel'));

			toggle.type = 'button';
			toggle.className = 'pdk-settings-section-toggle';
			toggle.hidden = true;
			toggle.setAttribute('aria-expanded', 'false');
			toggle.addEventListener('click', () => {
				wallpaperPhotoExpanded = !wallpaperPhotoExpanded;
				syncPhotoWallpaperDisclosure();
			});

			addButton.type = 'button';
			addButton.className = 'pdk-settings-wallpaper-photo-button pdk-settings-wallpaper-add-photo-button';
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
			const section = createSection('', 'pdk-settings-desktop-dock-slider-section');
			const row = dom.createElement('div', 'pdk-settings-desktop-dock-slider-row');

			if (options.size !== false) {
				row.appendChild(createDesktopDockRange('dock_size', t('desktopDock.rows.dockSize'), {
					labels: [t('desktopDock.ranges.small'), t('desktopDock.ranges.large')],
					max: 72,
					min: 28
				}, status));
			}
			if (options.magnification !== false) {
				row.appendChild(createDesktopDockRange('dock_magnification', t('desktopDock.rows.dockMagnification'), {
					labels: [t('desktopDock.ranges.off'), t('desktopDock.ranges.small'), t('desktopDock.ranges.large')],
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
			const { select, wrap } = createInlineSelect({
				options: menuBarSelectOptions[key] || [],
				value: currentMenuBar[key],
				onChange: (value, control) => {
					updateMenuBar(key, key === 'recent_count' ? Number.parseInt(value, 10) : value, status);
					control.blur();
				}
			});

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
			button.className = 'pdk-settings-toggle';
			button.setAttribute('aria-pressed', currentMenuBar[key] ? 'true' : 'false');
			button.addEventListener('click', () => updateMenuBar(key, !currentMenuBar[key], status));
			button.appendChild(dom.createElement('span', 'pdk-settings-toggle-knob'));
			menuBarControls.push({
				button,
				key,
				type: 'toggle'
			});

			return button;
		}

		function createMenuBarRow(labelText, control) {
			return createSettingsRow(labelText, control, '', 'pdk-settings-menu-bar-row pdk-settings-row-fluid-label');
		}

		function createSidebarIcon(item) {
			const icon = dom.createElement('span', `pdk-settings-sidebar-icon pdk-settings-sidebar-icon-${item.tone || 'blue'}`);
			icon.appendChild(dom.createDashicon(item.icon));

			return icon;
		}

		function createSettingsRowIcon(iconName, tone = 'gray') {
			return settingsUI.createRowIcon(iconName, tone);
		}

		function executeMenuCommand(command, options = {}) {
			const commands = window.PufferDesk && window.PufferDesk.menuCommands;

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
				fallbackWindowTitle: t('generalPanel.fallbackWindowTitle'),
				openPanel: openSettingsSubpanel
			});
		}

		function createProfileActionRow(options = {}) {
			return createSettingsActionRow(Object.assign({}, options, {
				className: 'pdk-settings-profile-action'
			}));
		}

		function getGeneralSettingsConfig() {
			return settingsConfig.general && typeof settingsConfig.general === 'object'
				? settingsConfig.general
				: {};
		}

		function createSettingsHero(options = {}) {
			if (isWindowsSettingsLayout) {
				const hero = dom.createElement('section', 'pdk-settings-page-intro');
				if (options.description) {
					hero.appendChild(dom.createElement('p', '', options.description));
				}

				return hero;
			}

			return settingsUI.createSummaryHero(options);
		}

		function createUserProfile() {
			const user = getUserProfile();
			const name = user.name || t('profile.defaultName');
			const profile = document.createElement('button');

			profile.type = 'button';
			profile.className = 'pdk-settings-profile';
			profile.dataset.pdkSettingsSection = profileItem.id;
			profile.setAttribute('aria-label', `${profileItem.label}: ${name}`);
			profile.addEventListener('click', () => setActiveSection(profileItem.id));
			const text = dom.createElement('span', 'pdk-settings-profile-text');
			text.appendChild(dom.createElement('strong', '', name));
			text.appendChild(dom.createElement('span', '', user.subtitle || t('profile.defaultRole')));

			profile.appendChild(createAvatar('pdk-settings-profile-avatar', user, name));
			profile.appendChild(text);
			sidebarButtons.push({
				button: profile,
				id: profileItem.id
			});

			return profile;
		}

		function createSettingsSidebar() {
			const sidebar = dom.createElement('aside', 'pdk-settings-sidebar');
			const dragZone = dom.createElement('div', 'pdk-split-sidebar-drag-zone');
			const sidebarTitle = dom.createElement('h2', 'pdk-settings-sidebar-title', t('appTitle'));
			const search = dom.createElement('label', 'pdk-settings-search-field');
			const searchInput = document.createElement('input');
			const nav = dom.createElement('nav', 'pdk-settings-sidebar-nav');
			const navItems = [];

			dragZone.dataset.pdkDragHandle = '';
			dragZone.setAttribute('aria-hidden', 'true');
			if (!isWindowsSettingsLayout) {
				sidebar.appendChild(dragZone);
			}

			search.appendChild(dom.createDashicon('dashicons-search'));
			searchInput.type = 'search';
			searchInput.placeholder = t('sidebar.searchPlaceholder');
			searchInput.setAttribute('aria-label', t('sidebar.searchLabel'));
			search.appendChild(searchInput);

			if (isWindowsSettingsLayout) {
				sidebar.appendChild(sidebarTitle);
				sidebar.appendChild(createUserProfile());
				sidebar.appendChild(search);
			} else {
				sidebar.appendChild(search);
				sidebar.appendChild(createUserProfile());
			}

			nav.setAttribute('aria-label', t('sidebar.navLabel'));
			sidebarItems.forEach((item) => {
				const button = document.createElement('button');
				button.type = 'button';
				button.className = 'pdk-settings-sidebar-item';
				button.dataset.pdkSettingsSection = item.id;
				button.disabled = Boolean(item.disabled);
				button.appendChild(createSidebarIcon(item));
				button.appendChild(dom.createElement('span', 'pdk-settings-sidebar-label', item.label));
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

		function createWindowsTitlebarBackButton() {
			const button = document.createElement('button');

			button.type = 'button';
			button.className = 'pdk-settings-titlebar-back';
			button.disabled = true;
			button.dataset.pdkNoDrag = '';
			button.setAttribute('aria-label', t('history.back'));
			button.appendChild(dom.createElement('span', 'pdk-settings-titlebar-back-chevron'));
			button.addEventListener('click', goBackInSettingsHistory);
			backButton = button;

			return button;
		}

		function createPaneHeader(title) {
			const header = dom.createElement('header', 'pdk-settings-pane-header');
			const history = dom.createElement('div', 'pdk-settings-history');
			const titleElement = dom.createElement('h1', '', title);
			header.dataset.pdkDragHandle = '';
			history.dataset.pdkNoDrag = '';

			if (!isWindowsSettingsLayout) {
				['back', 'forward'].forEach((direction) => {
					const button = document.createElement('button');
					button.type = 'button';
					button.className = `pdk-settings-history-button pdk-settings-history-button-${direction}`;
					button.disabled = true;
					button.setAttribute('aria-label', direction === 'back' ? t('history.back') : t('history.forward'));
					button.appendChild(dom.createElement('span', 'pdk-settings-history-chevron'));
					if (direction === 'back') {
						backButton = button;
						button.addEventListener('click', goBackInSettingsHistory);
					} else {
						forwardButton = button;
						button.addEventListener('click', goForwardInSettingsHistory);
					}
					history.appendChild(button);
				});
				header.appendChild(history);
			}
			header.appendChild(titleElement);
			paneTitle = titleElement;

			return header;
		}

		function saveTheme(themeMode, status) {
			function showThemeSwitchOverlay() {
				const dialogs = window.PufferDesk && window.PufferDesk.shellDialogs ? window.PufferDesk.shellDialogs : null;

				if (dialogs && typeof dialogs.showBlockingOverlay === 'function') {
					dialogs.showBlockingOverlay(t('status.themeSwitching'));
				}
			}

			mutations.post({
				action: getSettingAction('THEME'),
				errorText: t('status.themeSaveError'),
				onSuccess() {
					showThemeSwitchOverlay();
					window.setTimeout(() => {
						window.location.href = config.shellUrl || window.location.href;
					}, 320);

					return t('status.themeSaved');
				},
				payload: {
					theme_mode: themeMode
				},
				status
			});
			}

			const content = dom.createElement('div', 'pdk-settings');
			settingsRoot = content;
			content.dataset.pdkSettingsLayout = settingsLayout;
			if (isWindowsSettingsLayout) {
				content.classList.add('pdk-settings-windows');
			}
			const main = dom.createElement('div', 'pdk-settings-main');
			const pane = dom.createElement('div', 'pdk-settings-pane');
			const status = dom.createElement('div', 'pdk-settings-status');
			const settingsPanels = window.PufferDesk.apps.settings;
			status.setAttribute('role', 'status');
			status.setAttribute('aria-live', 'polite');
			const panelContext = {
				capabilities,
				config,
				createAccentGroup,
				createAppLocationSection,
				createButton,
				createCollapsibleWallpaperSection,
				createDesktopDockSelectRow,
				createDesktopDockSliderSection,
				createDesktopDockToggleRow,
				createEditableProfileAvatar,
				createInlineSelect,
				createMenuBarRow,
				createMenuBarSelect,
				createMenuBarToggle,
				createOptionGroup,
				createPhotoWallpaperGroup,
				createProfileActionRow,
				createRangeField,
				createSection,
				createSectionHeading,
				createSettingsActionRow,
				createSettingsHero,
				createSettingsRowIcon,
				createSettingsRow,
				dom,
				executeMenuCommand,
				getCurrentWallpaper: getWallpaperCurrent,
				getGeneralSettingsConfig,
				getThemeOptionLabel,
				getUserProfile,
				getWallpaperGroup,
				isWindowsSettingsLayout,
				mutations,
				openSettingsPanel: openSettingsSubpanel,
				saveTheme,
				settingsLabels,
				settingsLayout,
				status,
				t,
				themeMode: typeof config.themeMode === 'string' ? config.themeMode : '',
				themeModes,
				themes,
				updateRangeFill
			};

			pane.appendChild(settingsPanels.createGeneralPanel(panelContext));
			pane.appendChild(settingsPanels.createGeneralAboutPanel(panelContext));
			pane.appendChild(settingsPanels.createProfilePanel(panelContext));
			pane.appendChild(settingsPanels.createAppearancePanel(panelContext));
			pane.appendChild(settingsPanels.createDesktopDockPanel(panelContext));
			pane.appendChild(settingsPanels.createMenuBarPanel(panelContext));
			pane.appendChild(settingsPanels.createNotificationsPanel(panelContext));
			pane.appendChild(settingsPanels.createSoundsPanel(panelContext));
			pane.appendChild(settingsPanels.createWallpaperPanel(panelContext));
			pane.appendChild(settingsPanels.createWidgetsPanel(panelContext));
			pane.appendChild(settingsPanels.createWorkspacePanel(panelContext));
			pane.appendChild(settingsPanels.createSystemPanel(panelContext));
			pane.appendChild(status);

		main.appendChild(createPaneHeader(t('generalPanel.title')));
		main.appendChild(pane);
		content.appendChild(createSettingsSidebar());
		if (isWindowsSettingsLayout) {
			content.appendChild(createWindowsTitlebarBackButton());
		}
		content.appendChild(main);
		syncAppearanceControls();
		syncDesktopDockControls();
		syncAppLoginItemControls();
		syncMenuBarControls();
		syncWallpaperControls();
		setActiveSection(activeSection);
		content.pdkOpenPanel = (panelId) => {
			if (!panelId || !content.querySelector(`[data-pdk-settings-panel="${dom.escapeAttribute(panelId)}"]`)) {
				return false;
			}

			showSettingsPanel(panelId, {
				pushHistory: activePanel !== panelId
			});
			return true;
		};

		return content;
	};

	if (typeof window.PufferDesk.apps.registerNativeAppRenderer === 'function') {
		const nativeIds = window.PufferDesk.apps.nativeIds || {};
		window.PufferDesk.apps.registerNativeAppRenderer(nativeIds.SETTINGS, ({ config }) => {
				const layout = getSettingsLayout(config);
				const isWindowsLayout = layout === 'windows-settings';
				const settingsConfig = config.settings && typeof config.settings === 'object' ? config.settings : {};
				const labels = settingsConfig.labels && typeof settingsConfig.labels === 'object' ? settingsConfig.labels : {};
				const settingsLabels = window.PufferDesk.apps.settings.createLabels(settingsConfig);
				const appTitle = typeof labels.appTitle === 'string' && labels.appTitle ? labels.appTitle : settingsLabels.get('appTitle');

			return {
				bodyClass: `pdk-window-body pdk-settings-body${isWindowsLayout ? ' pdk-settings-windows-body' : ''}`,
				contextMenu: false,
				content: window.PufferDesk.apps.createSettingsApp({ config }),
				height: isWindowsLayout ? '760px' : '680px',
				resizeMode: isWindowsLayout ? 'both' : 'vertical',
				surfaceLayout: layout,
				titlebarLabel: isWindowsLayout ? appTitle : '',
				width: isWindowsLayout ? '1024px' : '725px'
			};
		});
	}
})();
