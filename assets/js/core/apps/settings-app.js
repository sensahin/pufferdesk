(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};
	window.AdminOSMode.apps = window.AdminOSMode.apps || {};

	window.AdminOSMode.apps.createSettingsApp = function createSettingsApp(context = {}) {
		const dom = window.AdminOSMode.dom;
		const api = window.AdminOSMode.services.api;
		const storage = window.AdminOSMode.services.storage;
		const appearance = window.AdminOSMode.appearance;
		const config = context.config || window.AdminOSMode.config.get();
		const themes = Array.isArray(config.themes) ? config.themes : [];
		const shell = document.querySelector('[data-admin-os-shell]');
		const optionGroups = [];
		let currentAppearance = appearance
			? appearance.normalize(config.appearance || {})
			: Object.assign({}, config.appearance || {});
		let saveTimer = null;
		let accentLabel = null;
		let tintToggle = null;

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

		function createSettingsRow(labelText, control) {
			const row = dom.createElement('div', 'aos-settings-row');
			const label = dom.createElement('span', 'aos-settings-label', labelText);
			row.appendChild(label);
			row.appendChild(control);

			return row;
		}

		function createSection(title, className = '') {
			const section = dom.createElement('section', `aos-settings-section ${className}`.trim());
			section.appendChild(dom.createElement('h2', '', title));

			return section;
		}

		function createButton(labelText, className) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = className || 'aos-settings-button';
			button.textContent = labelText;

			return button;
		}

		function getThemeOptionLabel(theme) {
			const family = theme.family_label || theme.family || 'Theme';
			const version = theme.version_label || theme.version || theme.label;

			return `${family} · ${version}`;
		}

		function getAccentOption(value) {
			return accentOptions.find((option) => option.value === value) || accentOptions[0];
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
		const status = dom.createElement('div', 'aos-settings-status');
		status.setAttribute('role', 'status');
		status.setAttribute('aria-live', 'polite');

		const appearanceSection = createSection('Appearance', 'aos-settings-section-appearance');
		appearanceSection.appendChild(createSettingsRow('Appearance', createOptionGroup('mode', [
			{ value: 'auto', label: 'Auto' },
			{ value: 'light', label: 'Light' },
			{ value: 'dark', label: 'Dark' }
		], status, 'aos-settings-preview-option', 'aos-settings-appearance-preview')));
		appearanceSection.appendChild(createSettingsRow('Window Material', createOptionGroup('window_material', [
			{ value: 'clear', label: 'Clear' },
			{ value: 'tinted', label: 'Tinted' }
		], status, 'aos-settings-preview-option', 'aos-settings-material-preview')));

		const themeSection = createSection('Theme');
		themeSection.appendChild(createSettingsRow('Color', createAccentGroup(status)));
		themeSection.appendChild(createSingleOptionSelect('Text highlight color'));
		themeSection.appendChild(createSettingsRow('Icon & widget style', createOptionGroup('icon_widget_style', [
			{ value: 'default', label: 'Default' },
			{ value: 'dark', label: 'Dark' },
			{ value: 'clear', label: 'Clear' },
			{ value: 'tinted', label: 'Tinted' }
		], status, 'aos-settings-icon-option', 'aos-settings-icon-preview')));
		themeSection.appendChild(createSingleOptionSelect('Folder color'));

		const windowSection = createSection('Windows');
		windowSection.appendChild(createSettingsRow('Tint window background with wallpaper color', createToggle(status)));

		let installedThemeSection = null;
		if (themes.length > 1) {
			const themeSelect = document.createElement('select');
			installedThemeSection = createSection('Installed Theme');
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

		const workspaceSection = createSection('Workspace');
		const resetLayoutButton = createButton('Reset Layout', 'aos-settings-button aos-settings-danger');
		resetLayoutButton.addEventListener('click', () => {
			storage.remove(config.storageKey);
			status.textContent = 'Layout reset.';
			window.setTimeout(() => {
				window.location.href = config.shellUrl || window.location.href;
			}, 200);
		});
		workspaceSection.appendChild(resetLayoutButton);

		const systemSection = createSection('System');
		const classicButton = createButton('Classic Admin');
		classicButton.addEventListener('click', () => {
			window.location.href = config.classicUrl || '/wp-admin/';
		});
		systemSection.appendChild(classicButton);

		content.appendChild(appearanceSection);
		content.appendChild(themeSection);
		content.appendChild(windowSection);
		if (installedThemeSection) {
			content.appendChild(installedThemeSection);
		}
		content.appendChild(workspaceSection);
		content.appendChild(systemSection);
		content.appendChild(status);
		syncAppearanceControls();

		return content;
	};
})();
