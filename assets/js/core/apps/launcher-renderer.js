(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};

	window.PufferDesk.apps.createLauncherRenderer = function createLauncherRenderer(options = {}) {
		const dom = options.dom || window.PufferDesk.dom;
		const getMenuLabel = typeof options.getMenuLabel === 'function' ? options.getMenuLabel : (key, fallback) => fallback;
		const openApp = typeof options.openApp === 'function' ? options.openApp : () => null;
		const openFolder = typeof options.openFolder === 'function' ? options.openFolder : () => null;
		const renderFolderWindow = typeof options.renderFolderWindow === 'function' ? options.renderFolderWindow : () => false;

		function selectItem(button) {
			const grid = button ? button.closest('.pdk-finder-grid') : null;

			if (grid) {
				grid.querySelectorAll('.pdk-app-launcher.is-selected, .pdk-finder-trash-item.is-selected').forEach((item) => {
					item.classList.remove('is-selected');
					item.setAttribute('aria-selected', 'false');
					item.setAttribute('aria-pressed', 'false');
				});
			}

			if (button) {
				button.classList.add('is-selected');
				button.setAttribute('aria-selected', 'true');
				button.setAttribute('aria-pressed', 'true');
			}
		}

		function createAppButton(app, folderId = '', removable = false) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'pdk-app-launcher';
			button.dataset.pdkContext = removable ? 'folder-app' : 'app';
			button.dataset.pdkContextId = app.id;
			button.dataset.pdkContextLabel = app.label;
			if (folderId) {
				button.dataset.pdkFolderId = folderId;
			}

			const appIcon = document.createElement('span');
			appIcon.className = 'pdk-app-icon';
			appIcon.appendChild(dom.createIcon(app.icon));

			const label = document.createElement('span');
			label.textContent = app.label;

			button.append(appIcon, label);
			button.addEventListener('click', () => openApp(app.id));

			return button;
		}

		function createFolderButton(folder, parentFolderId = '', win = null) {
			const button = document.createElement('button');
			const label = folder && folder.label ? folder.label : getMenuLabel('folder', 'Folder');

			button.type = 'button';
			button.className = 'pdk-app-launcher pdk-folder-launcher';
			button.dataset.pdkContext = 'folder';
			button.dataset.pdkContextId = folder.id;
			button.dataset.pdkContextLabel = label;
			button.dataset.pdkOpenFolder = folder.id;
			if (parentFolderId) {
				button.dataset.pdkFolderId = parentFolderId;
			}
			button.setAttribute('aria-label', label);
			button.setAttribute('aria-pressed', 'false');
			button.setAttribute('aria-selected', 'false');

			const appIcon = document.createElement('span');
			appIcon.className = 'pdk-app-icon';
			appIcon.appendChild(dom.createIcon(folder.icon || 'dashicons-category'));

			const itemLabel = document.createElement('span');
			itemLabel.textContent = label;

			button.append(appIcon, itemLabel);
			button.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				selectItem(button);
			});
			button.addEventListener('dblclick', (event) => {
				event.preventDefault();
				event.stopPropagation();
				if (win) {
					renderFolderWindow(win, folder.id);
				} else {
					openFolder(folder.id);
				}
			});
			button.addEventListener('contextmenu', () => {
				selectItem(button);
			});

			return button;
		}

		function createTrashItemButton(item) {
			const button = document.createElement('button');
			const label = item && item.label ? item.label : getMenuLabel('folder', 'Folder');
			const icon = item && item.icon ? item.icon : item && item.folder && item.folder.icon ? item.folder.icon : 'dashicons-category';

			button.type = 'button';
			button.className = 'pdk-desktop-icon pdk-desktop-folder pdk-finder-trash-item';
			button.dataset.pdkContext = 'trash-item';
			button.dataset.pdkContextId = item.id;
			button.dataset.pdkContextLabel = label;
			button.dataset.pdkTrashItemId = item.id;
			button.setAttribute('aria-label', label);
			button.setAttribute('aria-pressed', 'false');
			button.setAttribute('aria-selected', 'false');

			const appIcon = document.createElement('span');
			appIcon.className = 'pdk-app-icon';
			appIcon.appendChild(dom.createIcon(icon));

			const itemLabel = document.createElement('span');
			itemLabel.className = 'pdk-desktop-app-label';
			itemLabel.textContent = label;

			button.append(appIcon, itemLabel);
			button.addEventListener('click', (event) => {
				event.preventDefault();
				selectItem(button);
			});
			button.addEventListener('contextmenu', (event) => {
				event.preventDefault();
				selectItem(button);
			});

			return button;
		}

		return {
			createAppButton,
			createFolderButton,
			createTrashItemButton,
			selectItem
		};
	};
})();
