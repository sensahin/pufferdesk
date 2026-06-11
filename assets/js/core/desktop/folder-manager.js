(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.desktop = window.PufferDesk.desktop || {};

	window.PufferDesk.desktop.createFolderManager = function createFolderManager(shell, launcher, config = {}) {
		const dom = window.PufferDesk.dom;
		const geometry = window.PufferDesk.geometry;
		const createDebouncedTask = window.PufferDesk.services.createDebouncedTask;
		const clamp = geometry.clamp;
		const readNumber = geometry.readNumber;
		const desktop = shell.querySelector('.pdk-desktop');
		const api = window.PufferDesk.services && window.PufferDesk.services.api ? window.PufferDesk.services.api : null;
		const apps = Array.isArray(config.apps) ? config.apps : [];
		const systemFolders = Array.isArray(config.folders) ? config.folders : [];
		const defaultFolderIcon = { type: 'theme', name: 'folder.svg', fallback: 'dashicons-category' };
		const appMap = new Map(apps.map((app) => [app.id, app]));
		const appIds = window.PufferDesk.apps && window.PufferDesk.apps.ids ? window.PufferDesk.apps.ids : {};
		const virtualFilesystem = window.PufferDesk.virtualFilesystem && typeof window.PufferDesk.virtualFilesystem.create === 'function'
			? window.PufferDesk.virtualFilesystem.create(config)
			: null;
		const contextTargets = window.PufferDesk.shell && window.PufferDesk.shell.contextMenuConstants
			? window.PufferDesk.shell.contextMenuConstants.targets || {}
			: {};
		const desktopIconPrefixes = window.PufferDesk.session && window.PufferDesk.session.workspace
			? window.PufferDesk.session.workspace.desktopIconPrefixes || {}
			: {};
		const domEventNames = window.PufferDesk.events && window.PufferDesk.events.domNames ? window.PufferDesk.events.domNames : {};
		const getSettingAction = window.PufferDesk.config.getSettingAction.bind(window.PufferDesk.config);
		const systemFolderMap = new Map(systemFolders.map((folder) => [folder.id, Object.assign({ kind: 'system', user: false }, folder)]));
		const menuLabels = config.menu && config.menu.labels && typeof config.menu.labels === 'object' ? config.menu.labels : {};
		const trashFolderId = appIds.TRASH;
		let userFolders = [];
		let trashItems = [];
		let sessionSaveDisabled = false;
		let idCounter = 0;
		const canSave = () => Boolean(!sessionSaveDisabled && api && typeof api.post === 'function');
		const folderSaveTask = createDebouncedTask(() => saveFolders(), {
			shouldRun: canSave,
			wait: 120
		});
		const trashSaveTask = createDebouncedTask(() => saveTrash(), {
			shouldRun: canSave,
			wait: 120
		});

			function normalizeId(value) {
				return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
			}

			function normalizeParentId(value) {
				const id = normalizeId(value);

				return id || 'desktop';
			}

			function getFolderParentId(folder) {
				return normalizeParentId(folder && folder.parentId ? folder.parentId : 'desktop');
			}

			function getDesktopFolderPath() {
				return virtualFilesystem && typeof virtualFilesystem.getDefaultPathForKind === 'function'
					? virtualFilesystem.getDefaultPathForKind('desktop')
					: '';
			}

			function getUserFolderPath(folderId, path = '') {
				const storedPath = typeof path === 'string' ? path.trim() : '';
				const desktopPath = getDesktopFolderPath();
				const id = normalizeId(folderId);

				if (storedPath) {
					return storedPath;
				}

				return desktopPath && id ? `${desktopPath}/${id}` : '';
			}

			function isDesktopFolder(folder) {
				return getFolderParentId(folder) === 'desktop';
			}

		function getDefaultFolderIcon() {
			return Object.assign({}, defaultFolderIcon);
		}

		function getMenuLabel(key, fallback) {
			return typeof menuLabels[key] === 'string' && menuLabels[key] ? menuLabels[key] : (fallback || key);
		}

		function formatMenuLabel(key, fallback, values = []) {
			if (window.PufferDesk.config && typeof window.PufferDesk.config.formatFromLabels === 'function') {
				return window.PufferDesk.config.formatFromLabels(menuLabels, key, fallback || key, values);
			}

			return getMenuLabel(key, fallback);
		}

		function getUntitledFolderLabel() {
			return getMenuLabel('untitled_folder');
		}

		function getFolderLabel() {
			return getMenuLabel('folder');
		}

		function getTrashFolder() {
			const app = appMap.get(trashFolderId) || {};

			return {
				icon: app.icon || 'dashicons-trash',
				id: trashFolderId,
				kind: 'system',
				label: getMenuLabel('trash'),
				special: 'trash',
				user: false
			};
		}

		function isTrashFolderId(folderId) {
			return folderId === trashFolderId;
		}

		function getTakenLabels(exceptId = '') {
			return new Set(getFolders()
				.filter((folder) => folder.id !== exceptId)
				.map((folder) => String(folder.label || '').toLowerCase()));
		}

		function uniqueLabel(label, exceptId = '') {
			const base = String(label || '').trim() || getUntitledFolderLabel();
			const taken = getTakenLabels(exceptId);
			let next = base;
			let suffix = 2;

			while (taken.has(next.toLowerCase())) {
				next = `${base} ${suffix}`;
				suffix += 1;
			}

			return next;
		}

		function normalizeAppIds(appIds) {
			if (!Array.isArray(appIds)) {
				return [];
			}

			return Array.from(new Set(appIds
				.map((appId) => String(appId || ''))
				.filter((appId) => appMap.has(appId))));
		}

		function normalizeTimestamp(value, fallback = '') {
			const time = Date.parse(value);

			return Number.isFinite(time) ? new Date(time).toISOString() : fallback;
		}

		function normalizeFolder(folder) {
			if (!folder || typeof folder !== 'object') {
				return null;
			}

			const id = normalizeId(folder.id);
			if (!id || systemFolderMap.has(id) || id === trashFolderId) {
				return null;
			}

			const now = new Date().toISOString();

			return {
				appIds: normalizeAppIds(folder.appIds),
				appRefs: normalizeAppIds(folder.appRefs),
				comment: typeof folder.comment === 'string' ? folder.comment : '',
				createdAt: normalizeTimestamp(folder.createdAt, now),
				icon: getDefaultFolderIcon(),
					id,
					kind: 'user',
					label: String(folder.label || '').trim() || getUntitledFolderLabel(),
					lastOpenedAt: normalizeTimestamp(folder.lastOpenedAt),
					modifiedAt: normalizeTimestamp(folder.modifiedAt, normalizeTimestamp(folder.createdAt, now)),
					parentId: normalizeParentId(folder.parentId),
					path: getUserFolderPath(id, folder.path),
					user: true
				};
			}

		function loadFolders() {
			const stored = Array.isArray(config.desktopFolders) ? config.desktopFolders : [];
			userFolders = Array.isArray(stored) ? stored.map(normalizeFolder).filter(Boolean) : [];
			const labels = new Set();

			userFolders.forEach((folder) => {
				const base = folder.label || getUntitledFolderLabel();
				let next = base;
				let suffix = 2;

				while (labels.has(next.toLowerCase())) {
					next = `${base} ${suffix}`;
					suffix += 1;
				}

				folder.label = next;
					labels.add(next.toLowerCase());
				});

				const userFolderIds = new Set(userFolders.map((folder) => folder.id));
				userFolders.forEach((folder) => {
					const parentId = getFolderParentId(folder);
					if (
						parentId === folder.id
						|| (
							parentId !== 'desktop'
							&& !systemFolderMap.has(parentId)
							&& !userFolderIds.has(parentId)
						)
					) {
						folder.parentId = 'desktop';
					}
				});
			}

		function serializeFolder(folder) {
			return {
				appIds: normalizeAppIds(folder.appIds),
				appRefs: normalizeAppIds(folder.appRefs),
				comment: folder.comment || '',
				createdAt: folder.createdAt || '',
					icon: getDefaultFolderIcon(),
					id: folder.id,
					label: folder.label,
					lastOpenedAt: folder.lastOpenedAt || '',
					modifiedAt: folder.modifiedAt || '',
					parentId: getFolderParentId(folder),
					path: getUserFolderPath(folder.id, folder.path)
				};
			}

		function serializeFolders() {
			return userFolders.map(serializeFolder);
		}

		function normalizeTrashRestore(restore = {}) {
				const normalized = {
					previousParent: normalizeParentId(restore.previousParent)
				};
			const position = restore && restore.desktopPosition && typeof restore.desktopPosition === 'object'
				? restore.desktopPosition
				: null;
			const left = position ? readNumber(position.left) : null;
			const top = position ? readNumber(position.top) : null;

			if (Number.isFinite(left) || Number.isFinite(top)) {
				normalized.desktopPosition = {};
				if (Number.isFinite(left)) {
					normalized.desktopPosition.left = Math.max(0, Math.round(left));
				}
				if (Number.isFinite(top)) {
					normalized.desktopPosition.top = Math.max(0, Math.round(top));
				}
			}

			return normalized;
		}

		function normalizeTrashItem(item) {
			if (!item || typeof item !== 'object' || (item.type && item.type !== 'folder')) {
				return null;
			}

			const folder = normalizeFolder(item.folder);
			if (!folder) {
				return null;
			}

			return {
				folder: serializeFolder(folder),
				icon: folder.icon,
				id: normalizeId(item.id) || `folder-${folder.id}`,
				label: String(item.label || folder.label || getFolderLabel()).trim() || getFolderLabel(),
				restore: normalizeTrashRestore(item.restore),
				trashedAt: normalizeTimestamp(item.trashedAt, new Date().toISOString()),
				type: 'folder'
			};
		}

		function loadTrash() {
			const stored = Array.isArray(config.desktopTrash) ? config.desktopTrash : [];
			const seen = new Set();
			trashItems = stored.map(normalizeTrashItem).filter((item) => {
				if (!item || seen.has(item.id)) {
					return false;
				}

				seen.add(item.id);
				return true;
			});
		}

		function serializeTrash() {
			return trashItems.map((item) => {
				const folder = serializeFolder(item.folder);

				return {
					folder,
					icon: folder.icon,
					id: item.id,
					label: item.label || folder.label || getFolderLabel(),
					restore: normalizeTrashRestore(item.restore),
					trashedAt: item.trashedAt || '',
					type: 'folder'
				};
			});
		}

		function saveFolders() {
			if (sessionSaveDisabled || !api || typeof api.post !== 'function') {
				return;
			}

			const folders = serializeFolders();
			config.desktopFolders = folders;

			api.post(getSettingAction('DESKTOP_FOLDERS'), {
				folders: JSON.stringify(folders)
			}).then((result) => {
				if (result && result.success && result.data && Array.isArray(result.data.desktopFolders)) {
					config.desktopFolders = result.data.desktopFolders;
				}
			}).catch(() => {});
		}

		function scheduleSave() {
			folderSaveTask.schedule();
		}

		function saveTrash() {
			if (sessionSaveDisabled || !api || typeof api.post !== 'function') {
				return;
			}

			const items = serializeTrash();
			config.desktopTrash = items;

			api.post(getSettingAction('DESKTOP_TRASH'), {
				items: JSON.stringify(items)
			}).then((result) => {
				if (result && result.success && result.data && Array.isArray(result.data.desktopTrash)) {
					config.desktopTrash = result.data.desktopTrash;
				}
			}).catch(() => {});
		}

		function scheduleTrashSave() {
			trashSaveTask.schedule();
		}

		function ensureFolderLayer() {
			if (!desktop) {
				return null;
			}

			let layer = desktop.querySelector('.pdk-desktop-folders');
			if (layer) {
				layer.classList.add('pdk-desktop-icon-layer');
				return layer;
			}

			layer = dom.createElement('section', 'pdk-desktop-folders pdk-desktop-icon-layer');
			layer.setAttribute('aria-label', getMenuLabel('desktop_folders'));
			desktop.insertBefore(layer, desktop.firstChild);

			return layer;
		}

		function createFolderButton(folder) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'pdk-desktop-icon pdk-desktop-folder';
			button.dataset.pdkContext = contextTargets.DESKTOP_FOLDER || 'desktop-folder';
			button.dataset.pdkContextId = folder.id;
			button.dataset.pdkContextLabel = folder.label;
			button.dataset.pdkDesktopIcon = '';
			button.dataset.pdkDesktopIconId = `${desktopIconPrefixes.folder || ''}${folder.id}`;
			button.dataset.pdkDesktopIconKind = 'folder';
			button.dataset.pdkDateAdded = folder.createdAt || '';
			button.dataset.pdkDateCreated = folder.createdAt || '';
			button.dataset.pdkDateLastOpened = folder.lastOpenedAt || '';
			button.dataset.pdkDateModified = folder.modifiedAt || folder.createdAt || '';
			button.dataset.pdkSize = String(normalizeAppIds((folder.appIds || []).concat(folder.appRefs || [])).length);
			button.dataset.pdkOpenFolder = folder.id;
			button.dataset.pdkUserFolder = '1';
			button.setAttribute('aria-label', folder.label);

			const icon = dom.createElement('span', 'pdk-app-icon');
			icon.appendChild(dom.createIcon(folder.icon || getDefaultFolderIcon()));

			const label = dom.createElement('span', 'pdk-desktop-app-label', folder.label);

			button.append(icon, label);

			return button;
		}

		function renderUserFolders() {
			const layer = ensureFolderLayer();
			if (!layer) {
				return;
			}

			layer.querySelectorAll('[data-pdk-user-folder="1"]').forEach((folder) => folder.remove());
				userFolders
					.filter(isDesktopFolder)
					.forEach((folder) => layer.appendChild(createFolderButton(folder)));
		}

		function refreshDesktopIcons() {
			if (window.PufferDesk.desktopIconManager && typeof window.PufferDesk.desktopIconManager.rebind === 'function') {
				window.PufferDesk.desktopIconManager.rebind();
			}
		}

		function saveDesktopIconSession() {
			if (window.PufferDesk.desktopIconManager && typeof window.PufferDesk.desktopIconManager.saveSession === 'function') {
				window.PufferDesk.desktopIconManager.saveSession();
			}
		}

		function getFolderIcon(folderId) {
			return desktop
				? desktop.querySelector(`[data-pdk-user-folder="1"][data-pdk-open-folder="${dom.escapeAttribute(folderId)}"]`)
				: null;
		}

		function getTrashCount() {
			return trashItems.length;
		}

		function getTrashItems() {
			return serializeTrash();
		}

		function getTrashItem(trashId) {
			const item = trashItems.find((trashItem) => trashItem.id === trashId);

			return item ? serializeTrash().find((trashItem) => trashItem.id === trashId) || null : null;
		}

		function syncTrashSurfaceState() {
			if (!shell) {
				return;
			}

			const count = getTrashCount();
			const label = count > 0
				? formatMenuLabel(count === 1 ? 'trash_item_count' : 'trash_item_count_plural', count === 1 ? 'Trash, %d item' : 'Trash, %d items', [count])
				: getMenuLabel('trash');

			shell.querySelectorAll(`[data-pdk-open-app="${dom.escapeAttribute(trashFolderId)}"]`).forEach((button) => {
				const badge = button.querySelector('.pdk-trash-badge');

				button.classList.toggle('is-trash-full', count > 0);
				button.dataset.pdkTrashState = count > 0 ? 'full' : 'empty';
				button.setAttribute('aria-label', label);

				if (badge) {
					badge.remove();
				}
			});
		}

		function dispatchTrashChange() {
			syncTrashSurfaceState();
			shell.dispatchEvent(new window.CustomEvent(domEventNames.TRASH_CHANGE, {
				detail: {
					count: getTrashCount(),
					items: getTrashItems()
				}
			}));
		}

		function getFolderDesktopPosition(folderId) {
			const icon = getFolderIcon(folderId);
			const layer = icon ? icon.closest('.pdk-desktop-icon-layer') : null;
			const left = icon ? readNumber(icon.style.left) : null;
			const top = icon ? readNumber(icon.style.top) : null;

			if (Number.isFinite(left) && Number.isFinite(top)) {
				return {
					left: Math.max(0, Math.round(left)),
					top: Math.max(0, Math.round(top))
				};
			}

			if (!icon || !layer) {
				return null;
			}

			const iconRect = icon.getBoundingClientRect();
			const layerRect = layer.getBoundingClientRect();

			return {
				left: Math.max(0, Math.round(iconRect.left - layerRect.left)),
				top: Math.max(0, Math.round(iconRect.top - layerRect.top))
			};
		}

		function getPointPosition(point, icon) {
			const layer = ensureFolderLayer();
			if (!layer || !point || !Number.isFinite(point.clientX) || !Number.isFinite(point.clientY)) {
				return null;
			}

			const layerRect = layer.getBoundingClientRect();
			const iconWidth = icon ? icon.offsetWidth || 74 : 74;
			const iconHeight = icon ? icon.offsetHeight || 94 : 94;
			const left = point.clientX - layerRect.left - Math.round(iconWidth / 2);
			const top = point.clientY - layerRect.top - Math.round(iconHeight / 2);

			return {
				left: clamp(Math.round(left), 0, layer.clientWidth - iconWidth),
				top: clamp(Math.round(top), 0, layer.clientHeight - iconHeight)
			};
		}

		function positionFolderIcon(folderId, pointOrPosition = null) {
			const icon = getFolderIcon(folderId);
			if (!icon) {
				return false;
			}

			const position = pointOrPosition && Number.isFinite(pointOrPosition.left) && Number.isFinite(pointOrPosition.top)
				? pointOrPosition
				: getPointPosition(pointOrPosition, icon);

			if (!position) {
				return false;
			}

			icon.style.left = `${readNumber(position.left) || 0}px`;
			icon.style.top = `${readNumber(position.top) || 0}px`;
			saveDesktopIconSession();

			return true;
		}

		function getUserFolder(folderId) {
			return userFolders.find((folder) => folder.id === folderId) || null;
		}

		function markFolderModified(folder) {
			if (folder) {
				folder.modifiedAt = new Date().toISOString();
			}
		}

			function getFolder(folderId) {
				if (isTrashFolderId(folderId)) {
					return getTrashFolder();
				}

				return getUserFolder(folderId) || systemFolderMap.get(folderId) || null;
			}

			function getFolderChildFolders(folderId) {
				const parentId = normalizeParentId(folderId);

				return userFolders
					.filter((folder) => folder.id !== parentId && getFolderParentId(folder) === parentId)
					.map((folder) => Object.assign({}, folder));
			}

		function getFolders() {
			const folders = systemFolders
				.map((folder) => Object.assign({ kind: 'system', user: false }, folder))
				.concat(userFolders.map((folder) => Object.assign({}, folder)));

			return folders.some((folder) => folder && folder.id === trashFolderId)
				? folders
				: folders.concat(getTrashFolder());
		}

		function isUserFolder(folderId) {
			return Boolean(getUserFolder(folderId));
		}

		function getUserFolderForApp(appId) {
			return userFolders.find((folder) => folder.appIds.includes(appId)) || null;
		}

		function hasApp(appId) {
			return Boolean(getUserFolderForApp(appId));
		}

		function getFolderApps(folderId) {
			if (isTrashFolderId(folderId)) {
				return [];
			}

			const userFolder = getUserFolder(folderId);

			if (userFolder) {
				return normalizeAppIds((userFolder.appIds || []).concat(userFolder.appRefs || []))
					.map((appId) => appMap.get(appId))
					.filter(Boolean);
			}

			return apps.filter((app) => app.group === folderId);
		}

		function getFolderInfo(folderId) {
			const folder = getFolder(folderId);
			if (!folder) {
				return null;
			}

			if (isTrashFolderId(folderId)) {
				return {
					canComment: false,
					canRename: false,
					comment: '',
					createdAt: '',
					icon: folder.icon || 'dashicons-trash',
					id: folder.id,
					itemCount: trashItems.length,
					items: trashItems.map((item) => ({
						id: item.id,
						label: item.label || getFolderLabel(),
						source: 'trash',
						url: ''
					})),
					kind: getMenuLabel('trash'),
					label: folder.label || getMenuLabel('trash'),
					lastOpenedAt: '',
					modifiedAt: '',
					source: getMenuLabel('pufferdesk_trash_source'),
					user: false,
					where: getMenuLabel('pufferdesk_desktop')
				};
			}

				const folderApps = getFolderApps(folderId);
				const childFolders = getFolderChildFolders(folderId);
				const userFolder = getUserFolder(folderId);
				const parent = userFolder ? getFolder(getFolderParentId(userFolder)) : null;
				const itemCount = folderApps.length + childFolders.length;

				return {
				canComment: Boolean(userFolder),
				canRename: Boolean(userFolder),
				comment: userFolder ? userFolder.comment || '' : '',
				createdAt: userFolder ? userFolder.createdAt || '' : '',
				icon: folder.icon || getDefaultFolderIcon(),
				id: folder.id,
				itemCount,
					items: childFolders.map((childFolder) => ({
						id: childFolder.id,
						label: childFolder.label,
						source: 'user-folder',
						type: 'folder',
						url: ''
					})).concat(folderApps.map((app) => ({
						id: app.id,
						label: app.label,
						source: app.source || 'registry',
						type: 'app',
						url: app.url || ''
					}))),
					kind: getFolderLabel(),
				label: folder.label || getFolderLabel(),
				lastOpenedAt: userFolder ? userFolder.lastOpenedAt || '' : '',
				modifiedAt: userFolder ? userFolder.modifiedAt || userFolder.createdAt || '' : '',
				source: userFolder ? getMenuLabel('pufferdesk_user_folder_source') : getMenuLabel('wordpress_admin_group_source'),
				user: Boolean(userFolder),
					where: userFolder && parent
						? parent.label || getMenuLabel('pufferdesk_desktop')
						: formatMenuLabel('wordpress_admin_menu_format', 'WordPress Admin Menu > %s', [folder.label || getFolderLabel()])
				};
			}

		function syncDesktopAppVisibility() {
			if (!desktop) {
				return;
			}

			desktop.querySelectorAll('[data-pdk-desktop-icon-kind="app"][data-pdk-open-app]').forEach((icon) => {
				const appId = icon.dataset.pdkOpenApp || '';
				const folder = appId ? getUserFolderForApp(appId) : null;

				icon.hidden = Boolean(folder);
				if (folder) {
					icon.dataset.pdkInFolder = folder.id;
				} else {
					delete icon.dataset.pdkInFolder;
				}
			});
		}

		function refreshFolderWindows(folderIds = []) {
			if (!launcher || typeof launcher.refreshFolderWindow !== 'function') {
				return;
			}

			const ids = Array.isArray(folderIds) && folderIds.length
				? folderIds
				: userFolders.map((folder) => folder.id);

			ids.forEach((folderId) => {
				launcher.refreshFolderWindow(folderId);
				if (typeof launcher.refreshFolderInfoWindow === 'function') {
					launcher.refreshFolderInfoWindow(folderId);
				}
			});
		}

		function createFolder(label = '', appIds = [], createOptions = {}) {
			const now = new Date().toISOString();
			const id = `user-folder-${Date.now().toString(36)}-${idCounter += 1}`;
				const parentId = normalizeParentId(createOptions.parentId);
				const folder = {
					appIds: normalizeAppIds(appIds),
					appRefs: [],
					comment: '',
					createdAt: now,
				icon: getDefaultFolderIcon(),
				id,
				kind: 'user',
					label: uniqueLabel(label),
					lastOpenedAt: '',
					modifiedAt: now,
					parentId,
					path: getUserFolderPath(id),
					user: true
				};

			userFolders.push(folder);
				renderUserFolders();
				syncDesktopAppVisibility();
				refreshDesktopIcons();
				if (isDesktopFolder(folder)) {
					positionFolderIcon(folder.id, createOptions.point || createOptions.position || null);
				}
				refreshFolderWindows([parentId, folder.id]);
				scheduleSave();

				return folder;
			}

		function renameFolder(folderId, label) {
			const folder = getUserFolder(folderId);
			if (!folder) {
				return null;
			}

			folder.label = uniqueLabel(label || folder.label, folder.id);
			markFolderModified(folder);
			renderUserFolders();
			syncDesktopAppVisibility();
			refreshDesktopIcons();
			refreshFolderWindows([folder.id]);
			scheduleSave();

			return folder;
		}

		function reparentChildFolders(parentId, nextParentId = 'desktop') {
			const normalizedParentId = normalizeParentId(parentId);
			const normalizedNextParentId = normalizeParentId(nextParentId);
			const changed = [];

			userFolders.forEach((folder) => {
				if (getFolderParentId(folder) !== normalizedParentId) {
					return;
				}

				folder.parentId = normalizedNextParentId;
				markFolderModified(folder);
				changed.push(folder.id);
			});

			return changed;
		}

		function closeFolderSurfaces(folderId) {
			if (launcher && typeof launcher.closeFolderWindow === 'function') {
				launcher.closeFolderWindow(folderId);
			}

			if (launcher && typeof launcher.closeFolderInfoWindow === 'function') {
				launcher.closeFolderInfoWindow(folderId);
			}
		}

		function removeTrashItemByFolderId(folderId) {
			const itemId = `folder-${folderId}`;
			const index = trashItems.findIndex((item) => item.id === itemId || (item.folder && item.folder.id === folderId));

			if (index >= 0) {
				trashItems.splice(index, 1);
			}
		}

		function moveFolderToTrash(folderId) {
			const index = userFolders.findIndex((folder) => folder.id === folderId);
			if (index < 0) {
				return false;
			}

				const folder = userFolders[index];
				const previousParent = getFolderParentId(folder);
				const trashedAt = new Date().toISOString();
				const trashItem = {
				folder: serializeFolder(folder),
				icon: folder.icon || getDefaultFolderIcon(),
				id: `folder-${folder.id}`,
				label: folder.label || getFolderLabel(),
					restore: {
						desktopPosition: getFolderDesktopPosition(folder.id),
						previousParent
					},
				trashedAt,
				type: 'folder'
			};

				removeTrashItemByFolderId(folder.id);
				trashItems.unshift(normalizeTrashItem(trashItem));
				trashItems = trashItems.filter(Boolean).slice(0, 100);
				const reparentedFolderIds = reparentChildFolders(folder.id, previousParent);
				userFolders.splice(index, 1);
			renderUserFolders();
			syncDesktopAppVisibility();
			refreshDesktopIcons();
			saveDesktopIconSession();
			refreshFolderWindows([previousParent].concat(reparentedFolderIds));
			closeFolderSurfaces(folderId);
			scheduleSave();
			scheduleTrashSave();
			dispatchTrashChange();

			return true;
		}

		function restoreTrashItem(trashId) {
			const index = trashItems.findIndex((item) => item.id === trashId);
			const item = index >= 0 ? trashItems[index] : null;
			const restored = item ? normalizeFolder(item.folder) : null;

			if (!item || item.type !== 'folder' || !restored) {
				return null;
			}

			if (getFolder(restored.id)) {
				restored.id = `user-folder-${Date.now().toString(36)}-${idCounter += 1}`;
			}

			restored.label = uniqueLabel(restored.label || item.label || getFolderLabel(), restored.id);
			markFolderModified(restored);
			trashItems.splice(index, 1);
				restored.parentId = normalizeParentId(item.restore && item.restore.previousParent ? item.restore.previousParent : restored.parentId);
				if (restored.parentId !== 'desktop' && !getFolder(restored.parentId)) {
					restored.parentId = 'desktop';
				}
				userFolders.push(restored);
			renderUserFolders();
			syncDesktopAppVisibility();
			refreshDesktopIcons();
			positionFolderIcon(restored.id, item.restore && item.restore.desktopPosition ? item.restore.desktopPosition : null);
			scheduleSave();
			scheduleTrashSave();
			dispatchTrashChange();

			return restored;
		}

		function deleteTrashItem(trashId) {
			const index = trashItems.findIndex((item) => item.id === trashId);
			if (index < 0) {
				return false;
			}

			trashItems.splice(index, 1);
			scheduleTrashSave();
			dispatchTrashChange();

			return true;
		}

		function emptyTrash() {
			if (!trashItems.length) {
				return false;
			}

			trashItems = [];
			scheduleTrashSave();
			dispatchTrashChange();

			return true;
		}

		function deleteFolder(folderId) {
			const index = userFolders.findIndex((folder) => folder.id === folderId);
				if (index < 0) {
					return false;
				}

				const previousParent = getFolderParentId(userFolders[index]);
				const reparentedFolderIds = reparentChildFolders(folderId, previousParent);
				userFolders.splice(index, 1);
			renderUserFolders();
			syncDesktopAppVisibility();
			refreshDesktopIcons();
			saveDesktopIconSession();
			refreshFolderWindows([previousParent].concat(reparentedFolderIds));
			closeFolderSurfaces(folderId);
			scheduleSave();

			return true;
		}

		function removeAppFromFolders(appId, exceptFolderId = '') {
			const changedFolderIds = [];

			userFolders.forEach((folder) => {
				if (folder.id === exceptFolderId) {
					return;
				}

				const nextAppIds = folder.appIds.filter((folderAppId) => folderAppId !== appId);
				if (nextAppIds.length !== folder.appIds.length) {
					folder.appIds = nextAppIds;
					changedFolderIds.push(folder.id);
				}
			});

			return changedFolderIds;
		}

		function addAppToFolder(appId, folderId) {
			const folder = getUserFolder(folderId);
			if (!folder || !appMap.has(appId)) {
				return false;
			}

			const changedFolderIds = removeAppFromFolders(appId, folder.id);
			folder.appRefs = normalizeAppIds(folder.appRefs).filter((folderAppId) => folderAppId !== appId);
			if (!folder.appIds.includes(appId)) {
				folder.appIds.push(appId);
				changedFolderIds.push(folder.id);
			}

			markFolderModified(folder);
			syncDesktopAppVisibility();
			refreshFolderWindows(changedFolderIds);
			scheduleSave();

			return true;
		}

		function addAppReferenceToFolder(appId, folderId) {
			const folder = getUserFolder(folderId);
			const appIds = normalizeAppIds(folder ? folder.appIds : []);
			const appRefs = normalizeAppIds(folder ? folder.appRefs : []);

			if (!folder || !appMap.has(appId) || appIds.includes(appId) || appRefs.includes(appId)) {
				return false;
			}

			folder.appIds = appIds;
			folder.appRefs = appRefs.concat(appId);
			markFolderModified(folder);
			syncDesktopAppVisibility();
			refreshFolderWindows([folder.id]);
			scheduleSave();

			return true;
		}

		function isAppReferenceInFolder(appId, folderId) {
			const folder = getUserFolder(folderId);

			return Boolean(folder && normalizeAppIds(folder.appRefs).includes(appId));
		}

		function moveAppReferenceToFolder(appId, sourceFolderId, targetFolderId) {
			const sourceFolder = getUserFolder(sourceFolderId);
			const targetFolder = getUserFolder(targetFolderId);
			const sourceRefs = normalizeAppIds(sourceFolder ? sourceFolder.appRefs : []);
			const targetRefs = normalizeAppIds(targetFolder ? targetFolder.appRefs : []);
			const targetMovedApps = normalizeAppIds(targetFolder ? targetFolder.appIds : []);

			if (
				!sourceFolder
				|| !targetFolder
				|| sourceFolder.id === targetFolder.id
				|| !sourceRefs.includes(appId)
				|| targetRefs.includes(appId)
				|| targetMovedApps.includes(appId)
			) {
				return false;
			}

			sourceFolder.appRefs = sourceRefs.filter((folderAppId) => folderAppId !== appId);
			targetFolder.appRefs = targetRefs.concat(appId);
			markFolderModified(sourceFolder);
			markFolderModified(targetFolder);
			refreshFolderWindows([sourceFolder.id, targetFolder.id]);
			scheduleSave();

			return true;
		}

		function removeAppFromFolder(appId, folderId) {
			const folder = getUserFolder(folderId);
			if (!folder) {
				return false;
			}

			const nextAppIds = folder.appIds.filter((folderAppId) => folderAppId !== appId);
			const nextAppRefs = normalizeAppIds(folder.appRefs).filter((folderAppId) => folderAppId !== appId);
			if (nextAppIds.length === folder.appIds.length && nextAppRefs.length === normalizeAppIds(folder.appRefs).length) {
				return false;
			}

			folder.appIds = nextAppIds;
			folder.appRefs = nextAppRefs;
			markFolderModified(folder);
			syncDesktopAppVisibility();
			refreshFolderWindows([folder.id]);
			refreshDesktopIcons();
			scheduleSave();

			return true;
		}

		function positionDesktopIcon(kind, id, pointOrPosition = null) {
			const desktopIconManager = window.PufferDesk.desktopIconManager || null;

			return Boolean(
				desktopIconManager
				&& typeof desktopIconManager.positionIcon === 'function'
				&& desktopIconManager.positionIcon(kind, id, pointOrPosition)
			);
		}

		function moveAppToDesktop(appId, options = {}) {
			const changedFolderIds = removeAppFromFolders(appId);

			if (!changedFolderIds.length) {
				return false;
			}

			syncDesktopAppVisibility();
			refreshFolderWindows(changedFolderIds);
			refreshDesktopIcons();
			positionDesktopIcon('app', appId, options.point || options.position || null);
			scheduleSave();

			return true;
		}

		function canMoveFolderToParent(folderId, parentId = 'desktop') {
			const folder = getUserFolder(folderId);
			const nextParentId = normalizeParentId(parentId);
			let currentParentId = nextParentId;

			if (!folder || nextParentId === folder.id) {
				return false;
			}

			if (nextParentId !== 'desktop' && !getFolder(nextParentId)) {
				return false;
			}

			while (currentParentId && currentParentId !== 'desktop') {
				if (currentParentId === folder.id) {
					return false;
				}

				const currentParent = getUserFolder(currentParentId);
				if (!currentParent) {
					break;
				}

				currentParentId = getFolderParentId(currentParent);
			}

			return true;
		}

		function moveFolderToParent(folderId, parentId = 'desktop', options = {}) {
			const folder = getUserFolder(folderId);
			const previousParentId = folder ? getFolderParentId(folder) : '';
			const nextParentId = normalizeParentId(parentId);

			if (!folder || !canMoveFolderToParent(folderId, nextParentId)) {
				return false;
			}

			if (previousParentId === nextParentId) {
				if (nextParentId === 'desktop') {
					positionDesktopIcon('folder', folder.id, options.point || options.position || null);
				}
				return false;
			}

			folder.parentId = nextParentId;
			markFolderModified(folder);
			renderUserFolders();
			syncDesktopAppVisibility();
			refreshDesktopIcons();
			if (nextParentId === 'desktop') {
				positionDesktopIcon('folder', folder.id, options.point || options.position || null);
			}
			refreshFolderWindows([previousParentId, nextParentId, folder.id]);
			scheduleSave();

			return true;
		}

		function setFolderComment(folderId, comment) {
			const folder = getUserFolder(folderId);
			if (!folder) {
				return false;
			}

			folder.comment = String(comment || '');
			markFolderModified(folder);
			refreshFolderWindows([folder.id]);
			scheduleSave();

			return true;
		}

		function touchFolderOpened(folderId) {
			const folder = getUserFolder(folderId);
			if (!folder) {
				return false;
			}

			folder.lastOpenedAt = new Date().toISOString();
			scheduleSave();

			return true;
		}

		function startInlineRename(folderId) {
			const folder = getUserFolder(folderId);
			const icon = getFolderIcon(folderId);
			const label = icon ? icon.querySelector('.pdk-desktop-app-label') : null;
			if (!folder || !icon || !label || label.dataset.pdkInlineRename === '1') {
				return false;
			}

			const originalLabel = folder.label || getUntitledFolderLabel();
			let finished = false;
			const renameMetrics = (() => {
				const iconRect = icon.getBoundingClientRect();
				const labelRect = label.getBoundingClientRect();

				if (!iconRect.width || !labelRect.width || !labelRect.height) {
					return null;
				}

				return {
					left: labelRect.left - iconRect.left + (labelRect.width / 2),
					top: labelRect.top - iconRect.top,
					width: labelRect.width,
					height: labelRect.height
				};
			})();

			if (renameMetrics) {
				icon.style.setProperty('--pdk-desktop-rename-left', `${renameMetrics.left.toFixed(2)}px`);
				icon.style.setProperty('--pdk-desktop-rename-top', `${renameMetrics.top.toFixed(2)}px`);
				icon.style.setProperty('--pdk-desktop-rename-width', `${Math.ceil(renameMetrics.width)}px`);
				icon.style.setProperty('--pdk-desktop-rename-height', `${Math.ceil(renameMetrics.height)}px`);
			}

			function cleanup() {
				label.removeEventListener('blur', onBlur);
				label.removeEventListener('keydown', onKeyDown);
				label.removeEventListener('click', stopEditingEvent);
				label.removeEventListener('pointerdown', stopEditingEvent);
				label.removeAttribute('contenteditable');
				label.removeAttribute('spellcheck');
				delete label.dataset.pdkInlineRename;
				icon.classList.remove('is-renaming');
				icon.style.removeProperty('--pdk-desktop-rename-left');
				icon.style.removeProperty('--pdk-desktop-rename-top');
				icon.style.removeProperty('--pdk-desktop-rename-width');
				icon.style.removeProperty('--pdk-desktop-rename-height');
			}

			function finish(commit) {
				if (finished) {
					return;
				}

				finished = true;
				const nextLabel = String(label.textContent || '').trim();
				cleanup();

				if (commit) {
					renameFolder(folderId, nextLabel || originalLabel);
				} else {
					label.textContent = originalLabel;
				}
			}

			function stopEditingEvent(event) {
				event.stopPropagation();
			}

			function onBlur() {
				finish(true);
			}

			function onKeyDown(event) {
				if (event.key === 'Enter') {
					event.preventDefault();
					finish(true);
				} else if (event.key === 'Escape') {
					event.preventDefault();
					finish(false);
				}
			}

			icon.classList.add('is-renaming');
			icon.dataset.pdkSuppressClick = '1';
			label.dataset.pdkInlineRename = '1';
			label.setAttribute('contenteditable', 'plaintext-only');
			label.setAttribute('spellcheck', 'false');
			label.addEventListener('blur', onBlur);
			label.addEventListener('keydown', onKeyDown);
			label.addEventListener('click', stopEditingEvent);
			label.addEventListener('pointerdown', stopEditingEvent);
			label.focus({ preventScroll: true });

			const selection = window.getSelection();
			const range = document.createRange();
			range.selectNodeContents(label);
			if (selection) {
				selection.removeAllRanges();
				selection.addRange(range);
			}

			return true;
		}

		function restoreSession() {
			loadFolders();
			loadTrash();
			renderUserFolders();
			syncDesktopAppVisibility();
			dispatchTrashChange();
		}

		window.addEventListener('beforeunload', () => {
			saveFolders();
			saveTrash();
		});

		return {
			addAppToFolder,
			addAppReferenceToFolder,
			createFolder,
			deleteFolder,
			deleteTrashItem,
			disableSessionSave() {
				sessionSaveDisabled = true;
				folderSaveTask.cancel();
				trashSaveTask.cancel();
			},
			emptyTrash,
				getFolder,
				getFolderApps,
				getFolderChildFolders,
				getFolderInfo,
			getFolders,
			getTrashCount,
			getTrashItem,
			getTrashItems,
			getUserFolderForApp,
			hasApp,
			canMoveFolderToParent,
			isAppReferenceInFolder,
			isUserFolder,
			moveAppReferenceToFolder,
			moveFolderToTrash,
			moveAppToDesktop,
			moveFolderToParent,
			removeAppFromFolder,
			renameFolder,
			restoreTrashItem,
			setFolderComment,
			restoreSession,
			saveSession() {
				saveFolders();
				saveTrash();
			},
			startInlineRename,
			syncDesktopAppVisibility,
			syncTrashSurfaceState,
			touchFolderOpened
		};
	};
})();
