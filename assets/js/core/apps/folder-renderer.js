(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};

	window.PufferDesk.apps.createFolderRenderer = function createFolderRenderer(options = {}) {
		const getFolderApps = typeof options.getFolderApps === 'function' ? options.getFolderApps : () => [];
		const getFolderChildFolders = typeof options.getFolderChildFolders === 'function' ? options.getFolderChildFolders : () => [];
		const getFolderDocuments = typeof options.getFolderDocuments === 'function' ? options.getFolderDocuments : () => [];
		const getTrashItems = typeof options.getTrashItems === 'function' ? options.getTrashItems : () => [];
		const getMenuLabel = typeof options.getMenuLabel === 'function' ? options.getMenuLabel : (key, fallback) => fallback;
		const getExplorerSortMode = typeof options.getExplorerSortMode === 'function' ? options.getExplorerSortMode : () => 'none';
		const renderer = options.launcherRenderer || {};

		function sortExplorerFolderItems(items, win) {
			const sortMode = getExplorerSortMode(win);
			const collator = new Intl.Collator(undefined, {
				numeric: true,
				sensitivity: 'base'
			});
			const normalized = Array.isArray(items) ? items.slice() : [];

			if (sortMode === 'name') {
				return normalized.sort((a, b) => collator.compare(a && a.label ? a.label : '', b && b.label ? b.label : ''));
			}

			if (sortMode === 'kind') {
				return normalized.sort((a, b) => {
					const firstKind = a && a.type === 'folder'
						? getMenuLabel('folder', 'Folder')
						: (a && a.type === 'document' ? getMenuLabel('document', 'Document') : getMenuLabel('application', 'Application'));
					const secondKind = b && b.type === 'folder'
						? getMenuLabel('folder', 'Folder')
						: (b && b.type === 'document' ? getMenuLabel('document', 'Document') : getMenuLabel('application', 'Application'));
					const kindCompare = collator.compare(firstKind, secondKind);

					return kindCompare || collator.compare(a && a.label ? a.label : '', b && b.label ? b.label : '');
				});
			}

			return normalized;
		}

		function getDisplayItems(folderId, win = null) {
			const folderItems = getFolderChildFolders(folderId).map((folder) => ({
				folder,
				icon: folder.icon || 'dashicons-category',
				id: folder.id,
				label: folder.label || getMenuLabel('folder', 'Folder'),
				type: 'folder'
			}));
			const appItems = getFolderApps(folderId).map((app) => ({
				app,
				icon: app.icon || 'dashicons-admin-generic',
				id: app.id,
				label: app.label || app.id,
				type: 'app'
			}));
			const documentItems = getFolderDocuments(folderId).map((documentItem) => Object.assign({
				type: 'document'
			}, documentItem));
			const items = folderItems.concat(appItems, documentItems);

			return sortExplorerFolderItems(items, win);
		}

		function createDisplayButton(item, folderId = '', removable = false, win = null) {
			if (item && item.type === 'folder' && typeof renderer.createFolderButton === 'function') {
				return renderer.createFolderButton(item.folder, folderId, win);
			}

			if (item && item.type === 'document' && typeof renderer.createDocumentButton === 'function') {
				return renderer.createDocumentButton(item, folderId, win);
			}

			return typeof renderer.createAppButton === 'function'
				? renderer.createAppButton(item.app, folderId, removable)
				: document.createTextNode('');
		}

		function createItemGrid(folderId, win = null, options = {}) {
			const grid = document.createElement('div');
			const isTrash = Boolean(options.trash);
			const removable = Boolean(options.removable);
			const items = isTrash ? getTrashItems() : getDisplayItems(folderId, win);

			grid.className = isTrash
				? 'pdk-app-grid pdk-finder-grid pdk-finder-trash-grid'
				: 'pdk-app-grid pdk-finder-grid';
			items.forEach((item) => {
				grid.appendChild(isTrash && typeof renderer.createTrashItemButton === 'function'
					? renderer.createTrashItemButton(item)
					: createDisplayButton(item, folderId, removable, win));
			});

			return grid;
		}

		return {
			createDisplayButton,
			createItemGrid,
			getDisplayItems,
			sortExplorerFolderItems
		};
	};
})();
