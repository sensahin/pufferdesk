(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};
	window.AdminOSMode.apps = window.AdminOSMode.apps || {};

	window.AdminOSMode.apps.createSettingsApp = function createSettingsApp(context = {}) {
		const dom = window.AdminOSMode.dom;
		const api = window.AdminOSMode.services.api;
		const storage = window.AdminOSMode.services.storage;
		const appearance = window.AdminOSMode.appearance;
		const wallpaper = window.AdminOSMode.wallpaper;
		const config = context.config || window.AdminOSMode.config.get();
		const themes = Array.isArray(config.themes) ? config.themes : [];
		const shell = document.querySelector('[data-admin-os-shell]');
		let optionGroups = [];
		let currentAppearance = appearance
			? appearance.normalize(config.appearance || {})
			: Object.assign({}, config.appearance || {});
		let currentWallpaper = config.wallpaper && typeof config.wallpaper === 'object'
			? config.wallpaper
			: {};
		let saveTimer = null;
		let accentLabel = null;
		let tintToggle = null;
		let activeSection = 'appearance';
		let paneTitle = null;
		let settingsRoot = null;
		let wallpaperButtons = [];
		let wallpaperCustomButton = null;
		let wallpaperCustomPreview = null;
		let wallpaperCustomLabel = null;
		let mediaFrame = null;
		const sidebarButtons = [];

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

		const sidebarItems = [
			{ id: 'general', label: 'General', icon: 'dashicons-admin-generic', tone: 'gray', disabled: true },
			{ id: 'appearance', label: 'Appearance', icon: 'dashicons-admin-appearance', tone: 'blue' },
			{ id: 'desktop-dock', label: 'Desktop & Dock', icon: 'dashicons-desktop', tone: 'indigo', disabled: true },
			{ id: 'menu-bar', label: 'Menu Bar', icon: 'dashicons-menu-alt3', tone: 'gray', disabled: true },
			{ id: 'wallpaper', label: 'Wallpaper', icon: 'dashicons-format-image', tone: 'cyan' },
			{ id: 'widgets', label: 'Widgets', icon: 'dashicons-screenoptions', tone: 'green', disabled: true },
			{ id: 'apps', label: 'Apps', icon: 'dashicons-grid-view', tone: 'purple', disabled: true },
			{ id: 'workspace', label: 'Workspace', icon: 'dashicons-layout', tone: 'orange', disabled: true },
			{ id: 'system', label: 'System', icon: 'dashicons-admin-tools', tone: 'red', disabled: true }
		];

		function createSettingsRow(labelText, control, descriptionText = '') {
			const row = dom.createElement('div', 'aos-settings-row');
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
			return sidebarItems.find((item) => item.id === id) || sidebarItems[0];
		}

		function setActiveSection(sectionId) {
			const item = getSidebarItem(sectionId);
			if (!item || item.disabled) {
				return;
			}

			activeSection = item.id;
			sidebarButtons.forEach((entry) => {
				const selected = entry.id === activeSection;
				entry.button.classList.toggle('is-active', selected);
				if (selected) {
					entry.button.setAttribute('aria-current', 'page');
				} else {
					entry.button.removeAttribute('aria-current');
				}
			});

			(settingsRoot || document).querySelectorAll('[data-aos-settings-panel]').forEach((panel) => {
				panel.hidden = panel.dataset.aosSettingsPanel !== activeSection;
			});

			if (paneTitle) {
				paneTitle.textContent = item.label;
			}
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

			if (tintToggle) {
				tintToggle.setAttribute('aria-pressed', currentAppearance.tint_windows ? 'true' : 'false');
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
			wallpaperButtons.forEach((button) => {
				const selected = button.dataset.aosWallpaperKey === selectedKey;
				button.classList.toggle('is-selected', selected);
				button.setAttribute('aria-pressed', selected ? 'true' : 'false');
			});

			const current = getWallpaperCurrent();

			if (wallpaperCustomPreview) {
				wallpaperCustomPreview.style.backgroundImage = current.type === 'upload'
					? getWallpaperPreviewValue(current)
					: 'none';
				wallpaperCustomPreview.classList.toggle('has-wallpaper', current.type === 'upload');
			}

			if (wallpaperCustomButton) {
				wallpaperCustomButton.classList.toggle('is-selected', current.type === 'upload');
				wallpaperCustomButton.setAttribute('aria-pressed', current.type === 'upload' ? 'true' : 'false');
			}

			if (wallpaperCustomLabel) {
				wallpaperCustomLabel.textContent = current.type === 'upload' && current.label
					? current.label
					: 'Add Photo...';
			}
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

		function resetWallpaper(status) {
			status.textContent = 'Resetting...';

			return api.post('admin_os_mode_reset_wallpaper', {})
				.then((result) => {
					if (!result || !result.success) {
						const message = result && result.data && result.data.message
							? result.data.message
							: 'Wallpaper could not be reset.';
						status.textContent = message;
						return null;
					}

					applyWallpaper(result.data.wallpaper || currentWallpaper);
					status.textContent = result.data.message || 'Wallpaper reset.';
					return result.data.wallpaper || currentWallpaper;
				})
				.catch((error) => {
					status.textContent = error && error.message ? error.message : 'Wallpaper could not be reset.';
					return null;
				});
		}

		function selectWallpaperItem(item, status) {
			const fallbackWallpaper = currentWallpaper;
			const nextWallpaper = Object.assign({}, currentWallpaper, {
				preference: {
					type: item.type,
					id: item.id,
					attachment_id: 0,
					fit: item.fit || 'cover',
					position: item.position || 'center center'
				},
				current: item,
				css_variables: {
					'--aos-wallpaper-image': item.css_value || 'none',
					'--aos-wallpaper-position': item.position || 'center center',
					'--aos-wallpaper-repeat': 'no-repeat',
					'--aos-wallpaper-size': item.fit || 'cover'
				}
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

		function createToggle(status) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'aos-settings-toggle';
			button.setAttribute('aria-pressed', currentAppearance.tint_windows ? 'true' : 'false');
			button.addEventListener('click', () => {
				updateAppearance('tint_windows', !currentAppearance.tint_windows, status);
				button.setAttribute('aria-pressed', currentAppearance.tint_windows ? 'true' : 'false');
			});

			const knob = dom.createElement('span', 'aos-settings-toggle-knob');
			knob.setAttribute('aria-hidden', 'true');
			button.appendChild(knob);
			tintToggle = button;

			return button;
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
			const heading = dom.createElement('h3', '', 'Your Photos');
			const grid = dom.createElement('div', 'aos-settings-wallpaper-photo-grid');
			const button = document.createElement('button');
			const preview = dom.createElement('span', 'aos-settings-wallpaper-upload-preview');
			const icon = dom.createElement('span', 'aos-settings-wallpaper-upload-icon');
			const label = dom.createElement('span', 'aos-settings-wallpaper-upload-label', 'Add Photo...');

			button.type = 'button';
			button.className = 'aos-settings-wallpaper-photo-button';
			button.setAttribute('aria-pressed', 'false');
			preview.setAttribute('aria-hidden', 'true');
			icon.setAttribute('aria-hidden', 'true');
			icon.appendChild(dom.createDashicon('dashicons-format-image'));
			preview.appendChild(icon);
			button.append(preview, label);
			button.addEventListener('click', () => chooseUploadedWallpaper(status));
			wallpaperCustomButton = button;
			wallpaperCustomPreview = preview;
			wallpaperCustomLabel = label;

			grid.appendChild(button);
			group.append(heading, grid);

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
			const resetSection = createSection('', 'aos-settings-section-wallpaper-reset');
			const resetButton = createButton('Reset to Default');

			panel.dataset.aosSettingsPanel = 'wallpaper';
			resetButton.addEventListener('click', () => resetWallpaper(status));
			resetSection.appendChild(resetButton);
			builtInSection.appendChild(createPhotoWallpaperGroup(status));
			panel.append(builtInSection, colorSection, resetSection);

			return panel;
		}

		function createSidebarIcon(item) {
			const icon = dom.createElement('span', `aos-settings-sidebar-icon aos-settings-sidebar-icon-${item.tone || 'blue'}`);
			icon.appendChild(dom.createDashicon(item.icon));

			return icon;
		}

		function createUserProfile() {
			const user = getUserProfile();
			const name = user.name || 'Admin';
			const profile = dom.createElement('div', 'aos-settings-profile');
			const avatar = dom.createElement('span', 'aos-settings-profile-avatar');

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

			const text = dom.createElement('span', 'aos-settings-profile-text');
			text.appendChild(dom.createElement('strong', '', name));
			text.appendChild(dom.createElement('span', '', user.subtitle || 'WordPress Account'));

			profile.appendChild(avatar);
			profile.appendChild(text);

			return profile;
		}

		function createSettingsSidebar() {
			const sidebar = dom.createElement('aside', 'aos-settings-sidebar');
			const search = dom.createElement('label', 'aos-settings-search-field');
			const searchInput = document.createElement('input');
			const nav = dom.createElement('nav', 'aos-settings-sidebar-nav');
			const navItems = [];

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

			['back', 'forward'].forEach((direction) => {
				const button = document.createElement('button');
				button.type = 'button';
				button.className = `aos-settings-history-button aos-settings-history-button-${direction}`;
				button.disabled = true;
				button.setAttribute('aria-label', direction === 'back' ? 'Back' : 'Forward');
				button.appendChild(dom.createElement('span', 'aos-settings-history-chevron'));
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
		appearanceSection.appendChild(createSettingsRow('Window Material', createOptionGroup('window_material', [
			{ value: 'clear', label: 'Clear' },
			{ value: 'tinted', label: 'Tinted' }
		], status, 'aos-settings-preview-option', 'aos-settings-material-preview'), 'Choose your preferred look.'));

		const themeSection = createSection('', 'aos-settings-section-theme');
		themeSection.appendChild(createSettingsRow('Color', createAccentGroup(status)));
		themeSection.appendChild(createSingleOptionSelect('Text highlight color'));
		themeSection.appendChild(createSettingsRow('Icon & widget style', createOptionGroup('icon_widget_style', [
			{ value: 'default', label: 'Default' },
			{ value: 'dark', label: 'Dark' },
			{ value: 'clear', label: 'Clear' },
			{ value: 'tinted', label: 'Tinted' }
		], status, 'aos-settings-icon-option', 'aos-settings-icon-preview')));
		themeSection.appendChild(createSingleOptionSelect('Folder color'));

		const windowSection = createSection('', 'aos-settings-section-windows');
		windowSection.appendChild(createSettingsRow('Tint window background with wallpaper color', createToggle(status)));

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

		const workspaceSection = createSection('', 'aos-settings-section-workspace');
		const resetLayoutButton = createButton('Reset Layout', 'aos-settings-button aos-settings-danger');
		resetLayoutButton.addEventListener('click', () => {
			storage.remove(config.storageKey);
			status.textContent = 'Layout reset.';
			window.setTimeout(() => {
				window.location.href = config.shellUrl || window.location.href;
			}, 200);
		});
		workspaceSection.appendChild(resetLayoutButton);

		const systemSection = createSection('', 'aos-settings-section-system');
		const classicButton = createButton('Classic Admin');
		classicButton.addEventListener('click', () => {
			window.location.href = config.classicUrl || '/wp-admin/';
		});
		systemSection.appendChild(classicButton);

		appearancePanel.appendChild(appearanceSection);
		appearancePanel.appendChild(createSectionHeading('Theme'));
		appearancePanel.appendChild(themeSection);
		appearancePanel.appendChild(createSectionHeading('Windows'));
		appearancePanel.appendChild(windowSection);
		if (installedThemeSection) {
			appearancePanel.appendChild(createSectionHeading('Installed Theme'));
			appearancePanel.appendChild(installedThemeSection);
		}
		appearancePanel.appendChild(createSectionHeading('Workspace'));
		appearancePanel.appendChild(workspaceSection);
		appearancePanel.appendChild(createSectionHeading('System'));
		appearancePanel.appendChild(systemSection);
		pane.appendChild(appearancePanel);
		pane.appendChild(createWallpaperPanel(status));
		pane.appendChild(status);

		main.appendChild(createPaneHeader('Appearance'));
		main.appendChild(pane);
		content.appendChild(createSettingsSidebar());
		content.appendChild(main);
		syncAppearanceControls();
		syncWallpaperControls();
		setActiveSection(activeSection);

		return content;
	};
})();
