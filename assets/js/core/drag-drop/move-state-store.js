(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.dragDrop = window.PufferDesk.dragDrop || {};

	window.PufferDesk.dragDrop.createMoveStateStore = function createMoveStateStore(shell, options = {}) {
		const models = window.PufferDesk.dragDrop.models;
		const constants = window.PufferDesk.dragDrop.constants || {};
		const containerTypes = constants.containerTypes || {};
		const containerLabels = constants.containerLabels || {};
		const dragReasons = constants.reasons || {};
		const itemTypes = constants.itemTypes || {};
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
			return folderId === containerTypes.TRASH;
		}

		function isRecentsFolderId(folderId) {
			return folderId === 'recents';
		}

		function isUserFolder(folderId) {
			const manager = getFolderManager();

			return Boolean(manager && typeof manager.isUserFolder === 'function' && manager.isUserFolder(folderId));
		}

		function getFolderParentId(folder) {
			const parentId = models.normalizeId(folder && folder.parentId ? folder.parentId : containerTypes.DESKTOP);

			return parentId && parentId !== containerTypes.TRASH ? parentId : containerTypes.DESKTOP;
		}

		function getFolderContainerId(folderId) {
			return folderId && folderId !== containerTypes.DESKTOP ? models.createContainerId(containerTypes.FOLDER, folderId) : containerTypes.DESKTOP;
		}

		function getAppCurrentContainerId(appId) {
			const manager = getFolderManager();
			const folder = manager && typeof manager.getUserFolderForApp === 'function'
				? manager.getUserFolderForApp(appId)
				: null;

			return folder && folder.id ? models.createContainerId(containerTypes.FOLDER, folder.id) : containerTypes.DESKTOP;
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
			const actualContainerId = userFolder && userFolder.id ? models.createContainerId(containerTypes.FOLDER, userFolder.id) : containerTypes.DESKTOP;
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

			if (normalized.type === itemTypes.APP) {
				return enrichApp(normalized);
			}

			if (normalized.type === itemTypes.FOLDER) {
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

				if (!parentId || parentId === containerTypes.DESKTOP) {
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

		function canMoveFolderToParent(folderId, parentId = containerTypes.DESKTOP) {
			const manager = getFolderManager();

			if (!manager || typeof manager.canMoveFolderToParent !== 'function') {
				return false;
			}

			return Boolean(manager.canMoveFolderToParent(folderId, parentId));
		}

		function getDynamicFolderContainer(containerId) {
			const parsed = models.parseContainerId(containerId);
			const folder = parsed.type === containerTypes.FOLDER ? getFolder(parsed.targetId) : null;

			if (!folder) {
				return null;
			}

			return {
				accepts(item, move) {
					if (!item || !item.id || isTrashFolderId(parsed.targetId)) {
						return false;
					}

					if (item.type === itemTypes.APP) {
						return Boolean(isUserFolder(parsed.targetId));
					}

					if (item.type === itemTypes.FOLDER) {
						return Boolean(
							item.metadata
							&& item.metadata.user
							&& item.id !== parsed.targetId
							&& !isFolderDescendant(parsed.targetId, item.id)
							&& canMoveFolderToParent(item.id, parsed.targetId)
							&& (!move || move.reason !== dragReasons.TRASH)
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
				type: containerTypes.FOLDER
			};
		}

		function getStaticContainer(containerId) {
			const id = models.normalizeContainerId(containerId);

			if (id === containerTypes.DESKTOP) {
				return {
					accepts(item) {
						return Boolean(item && (item.type === itemTypes.APP || (item.type === itemTypes.FOLDER && item.metadata && item.metadata.user)));
					},
					canContainFolders: true,
					canMoveOut: () => true,
					canReorder: true,
					id: containerTypes.DESKTOP,
					label: containerLabels.DESKTOP,
					maxDepth: 0,
					metadata: {},
					persistence: 'workspace:desktopIcons',
					type: containerTypes.DESKTOP
				};
			}

			if (id === containerTypes.FOLDER_SIDEBAR_FAVORITES) {
				return {
					accepts(item) {
						return Boolean(
							item
							&& item.type === itemTypes.FOLDER
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
					label: containerLabels.FOLDER_SIDEBAR_FAVORITES,
					maxDepth: 0,
					metadata: {
						section: 'favorites'
					},
					persistence: 'workspace:folderSidebar',
					type: containerTypes.FOLDER_SIDEBAR
				};
			}

			if (id === containerTypes.DOCK) {
				return {
					accepts: () => false,
					canContainFolders: false,
					canMoveOut: () => false,
					canReorder: true,
					id,
					label: containerLabels.DOCK,
					maxDepth: 0,
					metadata: {},
					persistence: 'preferences:appLocations',
					type: containerTypes.DOCK
				};
			}

			if (id === containerTypes.TRASH) {
				return {
					accepts(item, move) {
						return Boolean(item && item.type === itemTypes.FOLDER && item.metadata && item.metadata.user && move && move.reason === dragReasons.TRASH);
					},
					canContainFolders: false,
					canMoveOut: () => false,
					canReorder: false,
					id,
					label: containerLabels.TRASH,
					maxDepth: 0,
					metadata: {},
					persistence: 'preferences:desktopTrash',
					type: containerTypes.TRASH
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

			if (item.type === itemTypes.APP) {
				if (move.toContainerId === containerTypes.DESKTOP && typeof manager.moveAppToDesktop === 'function') {
					return Boolean(manager.moveAppToDesktop(item.id, {
						point
					}));
				}

				if (parsed.type === containerTypes.FOLDER && typeof manager.addAppToFolder === 'function') {
					return Boolean(manager.addAppToFolder(item.id, parsed.targetId));
				}
			}

			if (item.type === itemTypes.FOLDER) {
				if (move.toContainerId === containerTypes.DESKTOP && typeof manager.moveFolderToParent === 'function') {
					return Boolean(manager.moveFolderToParent(item.id, containerTypes.DESKTOP, {
						point
					}));
				}

				if (move.toContainerId === containerTypes.FOLDER_SIDEBAR_FAVORITES && launcher && typeof launcher.addFolderSidebarFavorite === 'function') {
					return Boolean(launcher.addFolderSidebarFavorite(item.id));
				}

				if (move.toContainerId === containerTypes.TRASH && move.reason === dragReasons.TRASH && typeof manager.moveFolderToTrash === 'function') {
					return Boolean(manager.moveFolderToTrash(item.id));
				}

				if (parsed.type === containerTypes.FOLDER && typeof manager.moveFolderToParent === 'function') {
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
