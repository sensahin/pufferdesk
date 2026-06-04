(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};
	window.AdminOSMode.apps = window.AdminOSMode.apps || {};

	window.AdminOSMode.apps.createSettingsApp = function createSettingsApp(context = {}) {
		const dom = window.AdminOSMode.dom;
		const api = window.AdminOSMode.services.api;
		const storage = window.AdminOSMode.services.storage;
		const config = context.config || window.AdminOSMode.config.get();
		const themes = Array.isArray(config.themes) ? config.themes : [];

		function createSettingsRow(labelText, control) {
			const row = dom.createElement('label', 'aos-settings-row');
			const label = dom.createElement('span', 'aos-settings-label', labelText);
			row.appendChild(label);
			row.appendChild(control);

			return row;
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

		const themeSection = dom.createElement('section', 'aos-settings-section');
		themeSection.appendChild(dom.createElement('h2', '', 'Appearance'));

		const themeSelect = document.createElement('select');
		themeSelect.className = 'aos-settings-control';
		themes.forEach((theme) => {
			const option = document.createElement('option');
			option.value = theme.id;
			option.textContent = getThemeOptionLabel(theme);
			option.selected = config.theme && config.theme.id === theme.id;
			themeSelect.appendChild(option);
		});
		themeSection.appendChild(createSettingsRow('Theme', themeSelect));

		const saveThemeButton = createButton('Apply Theme');
		saveThemeButton.addEventListener('click', () => saveTheme(themeSelect.value, status));
		themeSection.appendChild(saveThemeButton);

		const workspaceSection = dom.createElement('section', 'aos-settings-section');
		workspaceSection.appendChild(dom.createElement('h2', '', 'Workspace'));

		const dockSelect = document.createElement('select');
		dockSelect.className = 'aos-settings-control';
		dockSelect.disabled = true;
		['Bottom', 'Left', 'Right'].forEach((position) => {
			const option = document.createElement('option');
			option.textContent = position;
			option.value = position.toLowerCase();
			option.selected = position === 'Bottom';
			dockSelect.appendChild(option);
		});
		workspaceSection.appendChild(createSettingsRow('Dock', dockSelect));

		const wallpaperButton = createButton('Default', 'aos-settings-button');
		wallpaperButton.disabled = true;
		workspaceSection.appendChild(createSettingsRow('Wallpaper', wallpaperButton));

		const resetLayoutButton = createButton('Reset Layout', 'aos-settings-button aos-settings-danger');
		resetLayoutButton.addEventListener('click', () => {
			storage.remove(config.storageKey);
			status.textContent = 'Layout reset.';
			window.setTimeout(() => {
				window.location.href = config.shellUrl || window.location.href;
			}, 200);
		});
		workspaceSection.appendChild(resetLayoutButton);

		const systemSection = dom.createElement('section', 'aos-settings-section');
		systemSection.appendChild(dom.createElement('h2', '', 'System'));

		const classicButton = createButton('Classic Admin');
		classicButton.addEventListener('click', () => {
			window.location.href = config.classicUrl || '/wp-admin/';
		});
		systemSection.appendChild(classicButton);

		content.appendChild(themeSection);
		content.appendChild(workspaceSection);
		content.appendChild(systemSection);
		content.appendChild(status);

		return content;
	};
})();
