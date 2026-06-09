(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};

	window.PufferDesk.apps.createFolderDataProvider = function createFolderDataProvider(options = {}) {
		const apps = Array.isArray(options.apps) ? options.apps : [];
		const folders = Array.isArray(options.folders) ? options.folders : [];
		const appMap = options.appMap instanceof Map ? options.appMap : new Map(apps.map((app) => [app.id, app]));
		const folderMap = new Map(folders.map((folder) => [folder.id, folder]));
		const trashFolderId = options.trashFolderId || 'trash';
		const getFolderProvider = typeof options.getFolderProvider === 'function' ? options.getFolderProvider : () => null;
		const getMenuLabel = typeof options.getMenuLabel === 'function' ? options.getMenuLabel : (key, fallback) => fallback;
		const isHiddenFromLaunchSurfaces = typeof options.isHiddenFromLaunchSurfaces === 'function' ? options.isHiddenFromLaunchSurfaces : () => false;

		function isTrashFolderId(folderId) {
			return folderId === trashFolderId;
		}

		function getTrashFolder() {
			const app = appMap.get('trash') || {};

			return {
				icon: app.icon || 'dashicons-trash',
				id: trashFolderId,
				kind: 'system',
				label: getMenuLabel('trash', 'Trash'),
				special: 'trash',
				user: false
			};
		}

		function getFolder(folderId) {
			const provider = getFolderProvider();
			const folder = provider && typeof provider.getFolder === 'function' ? provider.getFolder(folderId) : null;

			return folder || folderMap.get(folderId) || (isTrashFolderId(folderId) ? getTrashFolder() : null);
		}

		function getFolders() {
			const provider = getFolderProvider();
			const availableFolders = provider && typeof provider.getFolders === 'function'
				? provider.getFolders()
				: folders;
			const normalized = Array.isArray(availableFolders) ? availableFolders.filter(Boolean) : [];

			return normalized.some((folder) => folder && folder.id === trashFolderId)
				? normalized
				: normalized.concat(getTrashFolder());
		}

		function getFolderApps(folderId) {
			if (isTrashFolderId(folderId)) {
				return [];
			}

			const provider = getFolderProvider();
			const folderApps = provider && typeof provider.getFolderApps === 'function'
				? provider.getFolderApps(folderId)
				: apps.filter((app) => app.group === folderId);

			return folderApps.filter((app) => app && !isHiddenFromLaunchSurfaces(app));
		}

		function getFolderChildFolders(folderId) {
			if (isTrashFolderId(folderId)) {
				return [];
			}

			const provider = getFolderProvider();

			return provider && typeof provider.getFolderChildFolders === 'function'
				? provider.getFolderChildFolders(folderId).filter(Boolean)
				: [];
		}

		function getTrashItems() {
			const provider = getFolderProvider();

			return provider && typeof provider.getTrashItems === 'function' ? provider.getTrashItems() : [];
		}

		function getTrashCount() {
			const provider = getFolderProvider();

			return provider && typeof provider.getTrashCount === 'function' ? provider.getTrashCount() : getTrashItems().length;
		}

		function isUserFolder(folderId) {
			const provider = getFolderProvider();

			return Boolean(provider && typeof provider.isUserFolder === 'function' && provider.isUserFolder(folderId));
		}

		function getFolderInfo(folderId) {
			const provider = getFolderProvider();
			const info = provider && typeof provider.getFolderInfo === 'function' ? provider.getFolderInfo(folderId) : null;
			const folder = info ? null : getFolder(folderId);
			const folderApps = info ? [] : getFolderApps(folderId);

			return info || (folder ? {
				canComment: false,
				canRename: false,
				comment: '',
				createdAt: '',
				icon: folder.icon || 'dashicons-category',
				id: folder.id,
				itemCount: folderApps.length,
				items: folderApps.map((app) => ({ id: app.id, label: app.label, url: app.url || '' })),
				kind: 'Folder',
				label: folder.label || 'Folder',
				lastOpenedAt: '',
				modifiedAt: '',
				source: 'WordPress admin group',
				user: false,
				where: `WordPress Admin Menu > ${folder.label || 'Folder'}`
			} : null);
		}

		return {
			getFolder,
			getFolderApps,
			getFolderChildFolders,
			getFolderInfo,
			getFolders,
			getTrashCount,
			getTrashFolder,
			getTrashItems,
			isTrashFolderId,
			isUserFolder
		};
	};
})();
