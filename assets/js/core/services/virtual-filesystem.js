(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.virtualFilesystem = window.PufferDesk.virtualFilesystem || {};

	function getConfig(config) {
		return config && typeof config === 'object'
			? config
			: (window.PufferDesk.config && typeof window.PufferDesk.config.get === 'function' ? window.PufferDesk.config.get() : {});
	}

	function normalizeFolder(folder) {
		const data = folder && typeof folder === 'object' ? folder : {};
		const id = typeof data.id === 'string' ? data.id : '';

		if (!id) {
			return null;
		}

		return {
			icon: data.icon || 'dashicons-category',
			id,
			kind: typeof data.kind === 'string' ? data.kind : 'system',
			label: typeof data.label === 'string' && data.label ? data.label : id,
			parentId: typeof data.parentId === 'string' ? data.parentId : '',
			path: typeof data.path === 'string' ? data.path : '',
			source: typeof data.source === 'string' ? data.source : '',
			special: typeof data.special === 'string' ? data.special : '',
			user: data.user === true,
			virtual: data.virtual !== false
		};
	}

	window.PufferDesk.virtualFilesystem.create = function createVirtualFilesystem(config) {
		const runtimeConfig = getConfig(config);
		const filesystemConfig = runtimeConfig.virtualFilesystem && typeof runtimeConfig.virtualFilesystem === 'object'
			? runtimeConfig.virtualFilesystem
			: {};
		const folders = Array.isArray(filesystemConfig.folders)
			? filesystemConfig.folders.map(normalizeFolder).filter(Boolean)
			: [];
		const folderMap = new Map(folders.map((folder) => [folder.id, folder]));
		const pathMap = new Map(folders.filter((folder) => folder.path).map((folder) => [folder.path, folder.id]));
		const defaultPaths = filesystemConfig.defaultPaths && typeof filesystemConfig.defaultPaths === 'object'
			? filesystemConfig.defaultPaths
			: {};
		const folderIds = filesystemConfig.folderIds && typeof filesystemConfig.folderIds === 'object'
			? filesystemConfig.folderIds
			: {};
		const display = filesystemConfig.display && typeof filesystemConfig.display === 'object'
			? filesystemConfig.display
			: {};
		const labels = filesystemConfig.labels && typeof filesystemConfig.labels === 'object'
			? filesystemConfig.labels
			: {};

		function cloneFolder(folder) {
			return folder ? Object.assign({}, folder) : null;
		}

		function getFolder(folderId) {
			return cloneFolder(folderMap.get(String(folderId || '')) || null);
		}

		function getFolders() {
			return folders.map(cloneFolder);
		}

		function getChildFolders(folderId) {
			const parentId = String(folderId || '');

			return folders
				.filter((folder) => folder.parentId === parentId)
				.map(cloneFolder);
		}

		function getPathForFolder(folderId) {
			const folder = folderMap.get(String(folderId || ''));

			return folder && folder.path ? folder.path : '';
		}

		function getFolderIdForPath(path) {
			return pathMap.get(String(path || '')) || '';
		}

		function getDefaultPathForKind(kind) {
			const key = String(kind || '');

			return typeof defaultPaths[key] === 'string' ? defaultPaths[key] : '';
		}

		function getDefaultFolderIdForKind(kind) {
			return getFolderIdForPath(getDefaultPathForKind(kind));
		}

		function getFolderId(key) {
			const value = folderIds[String(key || '')];

			return typeof value === 'string' ? value : '';
		}

		function getDisplay(folderId) {
			const id = String(folderId || '');

			return display[id] && typeof display[id] === 'object' ? display[id] : {};
		}

		function getBreadcrumbs(folderId) {
			const data = getDisplay(folderId);

			return Array.isArray(data.breadcrumbs) ? data.breadcrumbs.filter((crumb) => typeof crumb === 'string' && crumb) : [];
		}

		function getDisplayPath(folderIdOrPath) {
			const value = String(folderIdOrPath || '');
			const folderId = folderMap.has(value) ? value : getFolderIdForPath(value);
			const data = getDisplay(folderId);

			return typeof data.pathLabel === 'string' && data.pathLabel ? data.pathLabel : value;
		}

		function getWhereLabel(folderIdOrPath) {
			const value = String(folderIdOrPath || '');
			const folderId = folderMap.has(value) ? value : getFolderIdForPath(value);
			const data = getDisplay(folderId);

			return typeof data.where === 'string' && data.where ? data.where : getDisplayPath(value);
		}

		function getLabel(key, fallback = '') {
			return typeof labels[key] === 'string' && labels[key] ? labels[key] : fallback;
		}

		return {
			getBreadcrumbs,
			getChildFolders,
			getDefaultFolderIdForKind,
			getDefaultPathForKind,
			getDisplayPath,
			getFolder,
			getFolderId,
			getFolderIdForPath,
			getFolders,
			getLabel,
			getPathForFolder,
			getWhereLabel
		};
	};
})();
