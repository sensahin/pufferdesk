(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};

	window.PufferDesk.apps.createFolderDataProvider = function createFolderDataProvider(options = {}) {
		const apps = Array.isArray(options.apps) ? options.apps : [];
		const folders = Array.isArray(options.folders) ? options.folders : [];
		const appMap = options.appMap instanceof Map ? options.appMap : new Map(apps.map((app) => [app.id, app]));
		const appIds = window.PufferDesk.apps && window.PufferDesk.apps.ids ? window.PufferDesk.apps.ids : {};
		const eventNames = window.PufferDesk.events && window.PufferDesk.events.names ? window.PufferDesk.events.names : {};
		const folderMap = new Map(folders.map((folder) => [folder.id, folder]));
		const trashFolderId = options.trashFolderId || appIds.TRASH;
		const getFolderProvider = typeof options.getFolderProvider === 'function' ? options.getFolderProvider : () => null;
		const getMenuLabel = typeof options.getMenuLabel === 'function' ? options.getMenuLabel : (key, fallback) => fallback || key;
		const isHiddenFromLaunchSurfaces = typeof options.isHiddenFromLaunchSurfaces === 'function' ? options.isHiddenFromLaunchSurfaces : () => false;
		const documentStore = options.documentStore || null;
		const virtualFilesystem = options.virtualFilesystem || null;
		const onFolderDocumentsChanged = typeof options.onFolderDocumentsChanged === 'function' ? options.onFolderDocumentsChanged : () => {};
		const documentCache = new Map();
		const pendingDocumentLoads = new Map();

		function isTrashFolderId(folderId) {
			return folderId === trashFolderId;
		}

		function getTrashFolder() {
			const app = appMap.get(trashFolderId) || {};
			const virtualFolder = virtualFilesystem && typeof virtualFilesystem.getFolder === 'function'
				? virtualFilesystem.getFolder(trashFolderId)
				: null;

			return {
				icon: app.icon || 'dashicons-trash',
				id: trashFolderId,
				kind: 'system',
				label: getMenuLabel('trash'),
				path: virtualFolder && virtualFolder.path ? virtualFolder.path : '',
				special: 'trash',
				user: false
			};
		}

		function getFolder(folderId) {
			const provider = getFolderProvider();
			const folder = provider && typeof provider.getFolder === 'function' ? provider.getFolder(folderId) : null;
			const systemFolder = folderMap.get(folderId) || null;

			if (folder && systemFolder) {
				return Object.assign({}, systemFolder, folder);
			}

			return folder || systemFolder || (isTrashFolderId(folderId) ? getTrashFolder() : null);
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
			const virtualFolders = virtualFilesystem && typeof virtualFilesystem.getChildFolders === 'function'
				? virtualFilesystem.getChildFolders(folderId).filter(Boolean)
				: [];
			const providerFolders = provider && typeof provider.getFolderChildFolders === 'function'
				? provider.getFolderChildFolders(folderId).filter(Boolean)
				: [];
			const seen = new Set();

			return virtualFolders.concat(providerFolders).filter((folder) => {
				if (!folder || !folder.id || seen.has(folder.id)) {
					return false;
				}

				seen.add(folder.id);
				return true;
			});
		}

		function getFolderPath(folderId) {
			const folder = getFolder(folderId);

			if (folder && folder.path) {
				return folder.path;
			}

			return virtualFilesystem && typeof virtualFilesystem.getPathForFolder === 'function'
				? virtualFilesystem.getPathForFolder(folderId)
				: '';
		}

		function normalizeDocumentItem(documentData) {
			const documentId = Number.parseInt(documentData && documentData.id, 10);
			const isSticky = documentData && documentData.kind === (documentStore && documentStore.kinds ? documentStore.kinds.sticky : '');
			const icon = isSticky
				? { type: 'theme', name: 'sticky-notes.svg', fallback: 'dashicons-sticky' }
				: { type: 'theme', name: 'text-editor.svg', fallback: 'dashicons-media-document' };

			if (!documentId) {
				return null;
			}

			return {
				document: documentData,
				icon,
				id: `document-${documentId}`,
				kindLabel: isSticky ? getMenuLabel('sticky_note') : getMenuLabel('document'),
				label: documentData.title || (isSticky ? getMenuLabel('sticky_note') : getMenuLabel('document')),
				modified: documentData.modified || '',
				path: documentData.path || '',
				type: 'document'
			};
		}

		function loadFolderDocuments(folderId, parentPath) {
			if (
				!documentStore
				|| typeof documentStore.list !== 'function'
				|| !parentPath
				|| pendingDocumentLoads.has(folderId)
			) {
				return;
			}

			const request = documentStore.list('', {
				parentPath
			}).then((documents) => {
				documentCache.set(folderId, Array.isArray(documents) ? documents.map(normalizeDocumentItem).filter(Boolean) : []);
				onFolderDocumentsChanged(folderId);
			}).catch(() => {
				documentCache.set(folderId, []);
			}).finally(() => {
				pendingDocumentLoads.delete(folderId);
			});

			pendingDocumentLoads.set(folderId, request);
		}

		function getFolderDocuments(folderId) {
			if (isTrashFolderId(folderId)) {
				return [];
			}

			const parentPath = getFolderPath(folderId);
			if (!parentPath) {
				return [];
			}

			if (!documentCache.has(folderId)) {
				documentCache.set(folderId, []);
				loadFolderDocuments(folderId, parentPath);
			}

			return documentCache.get(folderId).slice();
		}

		function refreshDocumentFolders(folderIds) {
			const ids = Array.isArray(folderIds) && folderIds.length
				? folderIds
				: Array.from(documentCache.keys());

			ids.forEach((folderId) => {
				if (!folderId) {
					return;
				}

				documentCache.delete(folderId);
				loadFolderDocuments(folderId, getFolderPath(folderId));
				onFolderDocumentsChanged(folderId);
			});
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
			const targetFolder = getFolder(folderId);
			const shouldUseVirtualInfo = Boolean(targetFolder && targetFolder.virtual);
			const info = !shouldUseVirtualInfo && provider && typeof provider.getFolderInfo === 'function' ? provider.getFolderInfo(folderId) : null;
			const folder = info ? null : targetFolder;
			const folderApps = info ? [] : getFolderApps(folderId);
			const folderDocuments = info ? [] : getFolderDocuments(folderId);
			const childFolders = info ? [] : getFolderChildFolders(folderId);

			return info || (folder ? {
				canComment: false,
				canRename: false,
				comment: '',
				createdAt: '',
				icon: folder.icon || 'dashicons-category',
				id: folder.id,
				itemCount: folderApps.length + folderDocuments.length + childFolders.length,
				items: childFolders.map((childFolder) => ({
					id: childFolder.id,
					label: childFolder.label,
					type: 'folder',
					url: ''
				})).concat(folderApps.map((app) => ({ id: app.id, label: app.label, type: 'app', url: app.url || '' })), folderDocuments.map((item) => ({
					id: item.id,
					label: item.label,
					type: 'document',
					url: ''
				}))),
				kind: getMenuLabel('folder'),
				label: folder.label || getMenuLabel('folder'),
				lastOpenedAt: '',
				modifiedAt: '',
				source: getMenuLabel('wordpress_admin_group_source'),
				user: false,
				where: virtualFilesystem && typeof virtualFilesystem.getWhereLabel === 'function'
					? virtualFilesystem.getWhereLabel(folder.id)
					: getMenuLabel('wordpress_admin_menu_format').replace('%s', folder.label || getMenuLabel('folder'))
			} : null);
		}

		if (window.PufferDesk.events && typeof window.PufferDesk.events.on === 'function' && eventNames.DOCUMENTS_CHANGED) {
			window.PufferDesk.events.on(eventNames.DOCUMENTS_CHANGED, (detail = {}) => {
				const documentData = detail && detail.document ? detail.document : null;
				const parentPath = documentData && documentData.parentPath ? documentData.parentPath : '';
				const folderId = parentPath && virtualFilesystem && typeof virtualFilesystem.getFolderIdForPath === 'function'
					? virtualFilesystem.getFolderIdForPath(parentPath)
					: '';

				refreshDocumentFolders(folderId ? [folderId] : []);
			});
		}

		return {
			getFolder,
			getFolderApps,
			getFolderChildFolders,
			getFolderDocuments,
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
