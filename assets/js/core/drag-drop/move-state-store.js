(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.dragDrop = window.PufferDesk.dragDrop || {};

	window.PufferDesk.dragDrop.createMoveStateStore = function createMoveStateStore(shell, options = {}) {
		const models = window.PufferDesk.dragDrop.models;
		const config = options.config && typeof options.config === 'object' ? options.config : {};
		const apps = Array.isArray(config.apps) ? config.apps : [];
		const appMap = new Map(apps.map((app) => [app.id, app]));

		function getFolderManager() {
			return typeof options.getFolderManager === 'function'
				? options.getFolderManager()
				: options.folderManager || window.PufferDesk.desktopFolderManager || null;
		}

		function getLauncher() {
			return typeof options.getLauncher === 'function'
				? options.getLauncher()
				: options.launcher || window.PufferDesk.appLauncher || null;
		}

		function getDesktopIconManager() {
			return typeof options.getDesktopIconManager === 'function'
				? options.getDesktopIconManager()
				: options.desktopIconManager || window.PufferDesk.desktopIconManager || null;
		}

		function getApp(appId) {
			return appMap.get(appId) || null;
		}

		function getFolder(folderId) {
			const manager = getFolderManager();

			return manager && typeof manager.getFolder === 'function' ? manager.getFolder(folderId) : null;
		}

		function getFolders() {
			const manager = getFolderManager();

			return manager && typeof manager.getFolders === 'function' ? manager.getFolders() : [];
		}

		function isTrashFolderId(folderId) {
			return folderId === 'trash';
		}

		function isRecentsFolderId(folderId) {
			return folderId === 'recents';
		}

		function isUserFolder(folderId) {
			const manager = getFolderManager();

			return Boolean(manager && typeof manager.isUserFolder === 'function' && manager.isUserFolder(folderId));
		}

		function getFolderParentId(folder) {
			const parentId = models.normalizeId(folder && folder.parentId ? folder.parentId : 'desktop');

			return parentId && parentId !== 'trash' ? parentId : 'desktop';
		}

		function getFolderContainerId(folderId) {
			return folderId && folderId !== 'desktop' ? models.createContainerId('folder', folderId) : 'desktop';
		}

		function getAppCurrentContainerId(appId) {
			const manager = getFolderManager();
			const folder = manager && typeof manager.getUserFolderForApp === 'function'
				? manager.getUserFolderForApp(appId)
				: null;

			return folder && folder.id ? models.createContainerId('folder', folder.id) : 'desktop';
		}

		function getFolderCurrentContainerId(folderId) {
			const folder = getFolder(folderId);

			return folder && isUserFolder(folderId)
				? getFolderContainerId(getFolderParentId(folder))
				: '';
		}

		function enrichApp(item) {
			const app = getApp(item.id);
			const manager = getFolderManager();
			const userFolder = manager && typeof manager.getUserFolderForApp === 'function'
				? manager.getUserFolderForApp(item.id)
				: null;
			const actualContainerId = userFolder && userFolder.id ? models.createContainerId('folder', userFolder.id) : 'desktop';
			const currentContainerId = item.currentContainerId || item.sourceContainerId || actualContainerId;

			return models.normalizeItem(Object.assign({}, item, {
				currentContainerId,
				icon: item.icon || (app && app.icon) || '',
				label: item.label || (app && app.label) || item.id,
				metadata: Object.assign({}, item.metadata, {
					app,
					actualContainerId,
					exists: Boolean(app),
					locked: false,
					system: false,
					userFolderId: userFolder && userFolder.id ? userFolder.id : ''
				})
			}));
		}

		function enrichFolder(item) {
			const folder = getFolder(item.id);
			const user = Boolean(folder && isUserFolder(item.id));
			const currentContainerId = item.currentContainerId || item.sourceContainerId || getFolderCurrentContainerId(item.id);

			return models.normalizeItem(Object.assign({}, item, {
				currentContainerId,
				icon: item.icon || (folder && folder.icon) || '',
				label: item.label || (folder && folder.label) || item.id,
				metadata: Object.assign({}, item.metadata, {
					exists: Boolean(folder),
					folder,
					locked: !user,
					parentId: folder ? getFolderParentId(folder) : '',
					system: Boolean(folder && !user),
					user
				})
			}));
		}

		function getItem(item) {
			const normalized = models.normalizeItem(item);

			if (!normalized.id || !normalized.type) {
				return normalized;
			}

			if (normalized.type === 'app') {
				return enrichApp(normalized);
			}

			if (normalized.type === 'folder') {
				return enrichFolder(normalized);
			}

			return normalized;
		}

		function isFolderDescendant(folderId, ancestorId) {
			const normalizedFolderId = models.normalizeId(folderId);
			const normalizedAncestorId = models.normalizeId(ancestorId);
			let current = getFolder(normalizedFolderId);
			let guard = 0;

			if (!normalizedFolderId || !normalizedAncestorId || normalizedFolderId === normalizedAncestorId) {
				return normalizedFolderId === normalizedAncestorId;
			}

			while (current && guard < 100) {
				const parentId = getFolderParentId(current);

				if (!parentId || parentId === 'desktop') {
					return false;
				}

				if (parentId === normalizedAncestorId) {
					return true;
				}

				current = getFolder(parentId);
				guard += 1;
			}

			return false;
		}

		function canMoveFolderToParent(folderId, parentId = 'desktop') {
			const manager = getFolderManager();

			if (!manager || typeof manager.canMoveFolderToParent !== 'function') {
				return false;
			}

			return Boolean(manager.canMoveFolderToParent(folderId, parentId));
		}

		function getDynamicFolderContainer(containerId) {
			const parsed = models.parseContainerId(containerId);
			const folder = parsed.type === 'folder' ? getFolder(parsed.targetId) : null;

			if (!folder) {
				return null;
			}

			return {
				accepts(item, move) {
					if (!item || !item.id || isTrashFolderId(parsed.targetId)) {
						return false;
					}

					if (item.type === 'app') {
						return Boolean(isUserFolder(parsed.targetId));
					}

					if (item.type === 'folder') {
						return Boolean(
							item.metadata
							&& item.metadata.user
							&& item.id !== parsed.targetId
							&& !isFolderDescendant(parsed.targetId, item.id)
							&& canMoveFolderToParent(item.id, parsed.targetId)
							&& (!move || move.reason !== 'trash')
						);
					}

					return false;
				},
				canContainFolders: !isTrashFolderId(parsed.targetId),
				canMoveOut: () => true,
				canReorder: false,
				id: parsed.id,
				label: folder.label || parsed.targetId,
				maxDepth: null,
				metadata: {
					folder,
					folderId: parsed.targetId,
					system: !isUserFolder(parsed.targetId),
					user: isUserFolder(parsed.targetId)
				},
				persistence: 'desktopFolders',
				type: 'folder'
			};
		}

		function getStaticContainer(containerId) {
			const id = models.normalizeContainerId(containerId);

			if (id === 'desktop') {
				return {
					accepts(item) {
						return Boolean(item && (item.type === 'app' || (item.type === 'folder' && item.metadata && item.metadata.user)));
					},
					canContainFolders: true,
					canMoveOut: () => true,
					canReorder: true,
					id: 'desktop',
					label: 'Desktop',
					maxDepth: 0,
					metadata: {},
					persistence: 'workspace:desktopIcons',
					type: 'desktop'
				};
			}

			if (id === 'folder-sidebar:favorites') {
				return {
					accepts(item) {
						return Boolean(
							item
							&& item.type === 'folder'
							&& item.id
							&& getFolder(item.id)
							&& !isTrashFolderId(item.id)
							&& !isRecentsFolderId(item.id)
						);
					},
					canContainFolders: false,
					canMoveOut: () => false,
					canReorder: true,
					id,
					label: 'Folder Sidebar Favorites',
					maxDepth: 0,
					metadata: {
						section: 'favorites'
					},
					persistence: 'workspace:folderSidebar',
					type: 'folder-sidebar'
				};
			}

			if (id === 'dock') {
				return {
					accepts: () => false,
					canContainFolders: false,
					canMoveOut: () => false,
					canReorder: true,
					id,
					label: 'Dock',
					maxDepth: 0,
					metadata: {},
					persistence: 'preferences:appLocations',
					type: 'dock'
				};
			}

			if (id === 'trash') {
				return {
					accepts(item, move) {
						return Boolean(item && item.type === 'folder' && item.metadata && item.metadata.user && move && move.reason === 'trash');
					},
					canContainFolders: false,
					canMoveOut: () => false,
					canReorder: false,
					id,
					label: 'Trash',
					maxDepth: 0,
					metadata: {},
					persistence: 'preferences:desktopTrash',
					type: 'trash'
				};
			}

			return null;
		}

		function getContainer(containerId) {
			const id = models.normalizeContainerId(containerId);

			return getStaticContainer(id) || getDynamicFolderContainer(id);
		}

		function applyMove(move) {
			const manager = getFolderManager();
			const launcher = getLauncher();
			const parsed = models.parseContainerId(move.toContainerId);
			const item = move.item;
			const point = move.position || null;

			if (!manager || !item || !item.id) {
				return false;
			}

			if (item.type === 'app') {
				if (move.toContainerId === 'desktop' && typeof manager.moveAppToDesktop === 'function') {
					return Boolean(manager.moveAppToDesktop(item.id, {
						point
					}));
				}

				if (parsed.type === 'folder' && typeof manager.addAppToFolder === 'function') {
					return Boolean(manager.addAppToFolder(item.id, parsed.targetId));
				}
			}

			if (item.type === 'folder') {
				if (move.toContainerId === 'desktop' && typeof manager.moveFolderToParent === 'function') {
					return Boolean(manager.moveFolderToParent(item.id, 'desktop', {
						point
					}));
				}

				if (move.toContainerId === 'folder-sidebar:favorites' && launcher && typeof launcher.addFolderSidebarFavorite === 'function') {
					return Boolean(launcher.addFolderSidebarFavorite(item.id));
				}

				if (move.toContainerId === 'trash' && move.reason === 'trash' && typeof manager.moveFolderToTrash === 'function') {
					return Boolean(manager.moveFolderToTrash(item.id));
				}

				if (parsed.type === 'folder' && typeof manager.moveFolderToParent === 'function') {
					return Boolean(manager.moveFolderToParent(item.id, parsed.targetId, {
						point
					}));
				}
			}

			return false;
		}

		function positionDesktopItem(item, position) {
			const desktopIconManager = getDesktopIconManager();

			return Boolean(
				item
				&& item.id
				&& desktopIconManager
				&& typeof desktopIconManager.positionIcon === 'function'
				&& desktopIconManager.positionIcon(item.type, item.id, position)
			);
		}

		return {
			applyMove,
			getApp,
			getContainer,
			getFolder,
			getFolderCurrentContainerId,
			getFolderParentId,
			getFolders,
			getItem,
			isFolderDescendant,
			isRecentsFolderId,
			isTrashFolderId,
			isUserFolder,
			positionDesktopItem
		};
	};
})();
