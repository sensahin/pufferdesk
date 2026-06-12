(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};

	window.PufferDesk.apps.createLauncherRenderer = function createLauncherRenderer(options = {}) {
		const dom = options.dom || window.PufferDesk.dom;
		const getMenuLabel = typeof options.getMenuLabel === 'function' ? options.getMenuLabel : (key, fallback) => fallback || key;
		const openApp = typeof options.openApp === 'function' ? options.openApp : () => null;
		const openDocument = typeof options.openDocument === 'function' ? options.openDocument : () => null;
		const openFolder = typeof options.openFolder === 'function' ? options.openFolder : () => null;
		const renderFolderWindow = typeof options.renderFolderWindow === 'function' ? options.renderFolderWindow : () => false;
		const startFolderRename = typeof options.startFolderRename === 'function' ? options.startFolderRename : () => false;
		const domEventNames = window.PufferDesk.events && window.PufferDesk.events.domNames ? window.PufferDesk.events.domNames : {};
		const contextTargets = window.PufferDesk.shell && window.PufferDesk.shell.contextMenuConstants
			? window.PufferDesk.shell.contextMenuConstants.targets || {}
			: {};
		const contextItemTypes = window.PufferDesk.shell && window.PufferDesk.shell.contextMenuConstants
			? window.PufferDesk.shell.contextMenuConstants.itemTypes || {}
			: {};

		function emitSelectionChange(grid) {
			const win = grid && typeof grid.closest === 'function' ? grid.closest('.pdk-window') : null;

			if (win) {
				win.dispatchEvent(new window.CustomEvent(domEventNames.FOLDER_SELECTION_CHANGE, {
					detail: {
						selectedItems: Array.from(grid.querySelectorAll('.pdk-app-launcher.is-selected, .pdk-finder-trash-item.is-selected'))
					}
				}));
			}
		}

		function setItemSelected(button, selected) {
			if (!button) {
				return;
			}

			button.classList.toggle('is-selected', selected);
			button.setAttribute('aria-selected', selected ? 'true' : 'false');
			button.setAttribute('aria-pressed', selected ? 'true' : 'false');
		}

		function selectItem(button, options = {}) {
			const grid = button ? button.closest('.pdk-finder-grid') : null;
			const additive = Boolean(options.additive);

			if (grid) {
				if (additive && button) {
					setItemSelected(button, !button.classList.contains('is-selected'));
				} else {
					grid.querySelectorAll('.pdk-app-launcher.is-selected, .pdk-finder-trash-item.is-selected').forEach((item) => {
						setItemSelected(item, false);
					});
					setItemSelected(button, true);
				}
				emitSelectionChange(grid);
				return;
			}

			setItemSelected(button, true);
		}

		function selectItemFromContextMenu(button) {
			const grid = button ? button.closest('.pdk-finder-grid') : null;

			if (
				grid
				&& button
				&& button.classList.contains('is-selected')
				&& grid.querySelectorAll('.pdk-app-launcher.is-selected, .pdk-finder-trash-item.is-selected').length > 1
			) {
				emitSelectionChange(grid);
				return;
			}

			selectItem(button);
		}

		function clearSelection(root) {
			const grid = root && root.classList && root.classList.contains('pdk-finder-grid')
				? root
				: (root && typeof root.querySelector === 'function' ? root.querySelector('.pdk-finder-grid') : null);
			const selectedItems = grid
				? Array.from(grid.querySelectorAll('.pdk-app-launcher.is-selected, .pdk-finder-trash-item.is-selected'))
				: [];

			if (!selectedItems.length) {
				return false;
			}

			selectedItems.forEach((item) => {
				setItemSelected(item, false);
			});
			emitSelectionChange(grid);

			return true;
		}

		function getSelectionOptions(event) {
			return {
				additive: Boolean(event && (event.metaKey || event.ctrlKey || event.shiftKey))
			};
		}

		function createAppButton(app, folderId = '', removable = false) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'pdk-app-launcher';
			button.dataset.pdkContext = removable
				? contextTargets.FOLDER_APP
				: contextItemTypes.APP;
			button.dataset.pdkContextId = app.id;
			button.dataset.pdkContextLabel = app.label;
			if (folderId) {
				button.dataset.pdkDraggableFolderItem = '1';
				button.dataset.pdkFolderId = folderId;
				button.dataset.pdkFolderItemId = app.id;
				button.dataset.pdkFolderItemKind = 'app';
			}

			const appIcon = document.createElement('span');
			appIcon.className = 'pdk-app-icon';
			appIcon.appendChild(dom.createIcon(app.icon));

			const label = dom.createTruncatedLabel('pdk-app-launcher-label', app.label);

			button.append(appIcon, label);
			button.addEventListener('click', (event) => {
				if (folderId) {
					event.preventDefault();
					event.stopPropagation();
					selectItem(button, getSelectionOptions(event));
					return;
				}

				openApp(app.id);
			});
			if (folderId) {
				button.addEventListener('dblclick', (event) => {
					event.preventDefault();
					event.stopPropagation();
					openApp(app.id);
				});
				button.addEventListener('contextmenu', () => {
					selectItemFromContextMenu(button);
				});
			}

			return button;
		}

		function createFolderButton(folder, parentFolderId = '', win = null) {
			const button = document.createElement('button');
			const label = folder && folder.label ? folder.label : getMenuLabel('folder');

			button.type = 'button';
			button.className = 'pdk-app-launcher pdk-folder-launcher';
			button.dataset.pdkContext = contextTargets.FOLDER;
			button.dataset.pdkContextId = folder.id;
			button.dataset.pdkContextLabel = label;
			button.dataset.pdkDraggableFolderItem = '1';
			button.dataset.pdkFolderItemId = folder.id;
			button.dataset.pdkFolderItemKind = 'folder';
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

			const itemLabel = dom.createTruncatedLabel('pdk-app-launcher-label', label);

			button.append(appIcon, itemLabel);
			button.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				selectItem(button, getSelectionOptions(event));
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
			button.addEventListener('keydown', (event) => {
				if (
					event.defaultPrevented
					|| event.key !== 'Enter'
					|| event.altKey
					|| event.ctrlKey
					|| event.metaKey
					|| event.shiftKey
					|| button.dataset.pdkInlineRename === '1'
					|| !button.classList.contains('is-selected')
				) {
					return;
				}

				if (startFolderRename(folder.id, {
					buttonElement: button,
					parentFolderId,
					windowElement: win
				})) {
					event.preventDefault();
					event.stopPropagation();
				}
			});
			button.addEventListener('contextmenu', () => {
				selectItemFromContextMenu(button);
			});

			return button;
		}

		function createDocumentButton(item, folderId = '') {
			const button = document.createElement('button');
			const label = item && item.label ? item.label : getMenuLabel('document');

			button.type = 'button';
			button.className = 'pdk-app-launcher pdk-document-launcher';
			button.dataset.pdkContext = contextTargets.DOCUMENT;
			button.dataset.pdkContextId = item.id || '';
			button.dataset.pdkContextLabel = label;
			button.dataset.pdkDocumentId = item.document && item.document.id ? String(item.document.id) : String(item.id || '').replace(/^document-/, '');
			if (folderId) {
				button.dataset.pdkFolderId = folderId;
			}
			button.setAttribute('aria-label', label);
			button.setAttribute('aria-pressed', 'false');
			button.setAttribute('aria-selected', 'false');

			const appIcon = document.createElement('span');
			appIcon.className = 'pdk-app-icon';
			appIcon.appendChild(dom.createIcon(item.icon || 'dashicons-media-document'));

			const itemLabel = dom.createTruncatedLabel('pdk-app-launcher-label', label);

			button.append(appIcon, itemLabel);
			button.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				selectItem(button, getSelectionOptions(event));
			});
			button.addEventListener('dblclick', (event) => {
				event.preventDefault();
				event.stopPropagation();
				openDocument(item.document || item);
			});
			button.addEventListener('contextmenu', () => {
				selectItemFromContextMenu(button);
			});

			return button;
		}

		function createTrashItemButton(item) {
			const button = document.createElement('button');
			const label = item && item.label ? item.label : getMenuLabel('folder');
			const icon = item && item.icon ? item.icon : item && item.folder && item.folder.icon ? item.folder.icon : 'dashicons-category';

			button.type = 'button';
			button.className = 'pdk-desktop-icon pdk-desktop-folder pdk-finder-trash-item';
			button.dataset.pdkContext = contextTargets.TRASH_ITEM;
			button.dataset.pdkContextId = item.id;
			button.dataset.pdkContextLabel = label;
			button.dataset.pdkTrashItemId = item.id;
			button.setAttribute('aria-label', label);
			button.setAttribute('aria-pressed', 'false');
			button.setAttribute('aria-selected', 'false');

			const appIcon = document.createElement('span');
			appIcon.className = 'pdk-app-icon';
			appIcon.appendChild(dom.createIcon(icon));

			const itemLabel = dom.createTruncatedLabel('pdk-desktop-app-label', label);

			button.append(appIcon, itemLabel);
			button.addEventListener('click', (event) => {
				event.preventDefault();
				selectItem(button, getSelectionOptions(event));
			});
			button.addEventListener('contextmenu', (event) => {
				event.preventDefault();
				selectItemFromContextMenu(button);
			});

			return button;
		}

		return {
			clearSelection,
			createAppButton,
			createDocumentButton,
			createFolderButton,
			createTrashItemButton,
			selectItem
		};
	};
})();
