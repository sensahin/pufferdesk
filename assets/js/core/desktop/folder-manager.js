(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};
	window.AdminOSMode.desktop = window.AdminOSMode.desktop || {};

	window.AdminOSMode.desktop.createFolderManager = function createFolderManager(shell, launcher, config = {}) {
		const dom = window.AdminOSMode.dom;
		const desktop = shell.querySelector('.aos-desktop');
		const api = window.AdminOSMode.services && window.AdminOSMode.services.api ? window.AdminOSMode.services.api : null;
		const apps = Array.isArray(config.apps) ? config.apps : [];
		const systemFolders = Array.isArray(config.folders) ? config.folders : [];
		const defaultFolderIcon = { type: 'theme', name: 'folder.svg', fallback: 'dashicons-category' };
		const appMap = new Map(apps.map((app) => [app.id, app]));
		const systemFolderMap = new Map(systemFolders.map((folder) => [folder.id, Object.assign({ kind: 'system', user: false }, folder)]));
		let userFolders = [];
		let sessionSaveDisabled = false;
		let saveTimer = null;
		let idCounter = 0;

		function readNumber(value) {
			const parsed = Number.parseFloat(value);

			return Number.isFinite(parsed) ? parsed : null;
		}

		function clamp(value, min, max) {
			return Math.min(Math.max(min, value), Math.max(min, max));
		}

		function normalizeId(value) {
			return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
		}

		function getDefaultFolderIcon() {
			const contentFolder = systemFolders.find((folder) => folder.id === 'content');
			const folder = contentFolder || systemFolders[0] || null;

			return folder && folder.icon ? folder.icon : defaultFolderIcon;
		}

		function getTakenLabels(exceptId = '') {
			return new Set(getFolders()
				.filter((folder) => folder.id !== exceptId)
				.map((folder) => String(folder.label || '').toLowerCase()));
		}

		function uniqueLabel(label, exceptId = '') {
			const base = String(label || '').trim() || 'untitled folder';
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
			if (!id || systemFolderMap.has(id)) {
				return null;
			}

			const now = new Date().toISOString();

			return {
				appIds: normalizeAppIds(folder.appIds),
				comment: typeof folder.comment === 'string' ? folder.comment : '',
				createdAt: normalizeTimestamp(folder.createdAt, now),
				icon: folder.icon || getDefaultFolderIcon(),
				id,
				kind: 'user',
				label: String(folder.label || '').trim() || 'untitled folder',
				lastOpenedAt: normalizeTimestamp(folder.lastOpenedAt),
				modifiedAt: normalizeTimestamp(folder.modifiedAt, normalizeTimestamp(folder.createdAt, now)),
				user: true
			};
		}

		function loadFolders() {
			const stored = Array.isArray(config.desktopFolders) ? config.desktopFolders : [];
			userFolders = Array.isArray(stored) ? stored.map(normalizeFolder).filter(Boolean) : [];
			const labels = new Set();

			userFolders.forEach((folder) => {
				const base = folder.label || 'untitled folder';
				let next = base;
				let suffix = 2;

				while (labels.has(next.toLowerCase())) {
					next = `${base} ${suffix}`;
					suffix += 1;
				}

				folder.label = next;
				labels.add(next.toLowerCase());
			});
		}

		function serializeFolders() {
			return userFolders.map((folder) => ({
				appIds: normalizeAppIds(folder.appIds),
				comment: folder.comment || '',
				createdAt: folder.createdAt || '',
				icon: folder.icon || getDefaultFolderIcon(),
				id: folder.id,
				label: folder.label,
				lastOpenedAt: folder.lastOpenedAt || '',
				modifiedAt: folder.modifiedAt || ''
			}));
		}

		function saveFolders() {
			if (sessionSaveDisabled || !api || typeof api.post !== 'function') {
				return;
			}

			window.clearTimeout(saveTimer);
			saveTimer = null;

			const folders = serializeFolders();
			config.desktopFolders = folders;

			api.post('admin_os_mode_save_desktop_folders', {
				folders: JSON.stringify(folders)
			}).then((result) => {
				if (result && result.success && result.data && Array.isArray(result.data.desktopFolders)) {
					config.desktopFolders = result.data.desktopFolders;
				}
			}).catch(() => {});
		}

		function scheduleSave() {
			if (sessionSaveDisabled || !api || typeof api.post !== 'function') {
				return;
			}

			window.clearTimeout(saveTimer);
			saveTimer = window.setTimeout(saveFolders, 120);
		}

		function ensureFolderLayer() {
			if (!desktop) {
				return null;
			}

			let layer = desktop.querySelector('.aos-desktop-folders');
			if (layer) {
				layer.classList.add('aos-desktop-icon-layer');
				return layer;
			}

			layer = dom.createElement('section', 'aos-desktop-folders aos-desktop-icon-layer');
			layer.setAttribute('aria-label', 'Desktop folders');
			desktop.insertBefore(layer, desktop.firstChild);

			return layer;
		}

		function createFolderButton(folder) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'aos-desktop-icon aos-desktop-folder';
			button.dataset.aosContext = 'desktop-folder';
			button.dataset.aosContextId = folder.id;
			button.dataset.aosContextLabel = folder.label;
			button.dataset.aosDesktopIcon = '';
			button.dataset.aosDesktopIconId = `folder:${folder.id}`;
			button.dataset.aosDesktopIconKind = 'folder';
			button.dataset.aosDateAdded = folder.createdAt || '';
			button.dataset.aosDateCreated = folder.createdAt || '';
			button.dataset.aosDateLastOpened = folder.lastOpenedAt || '';
			button.dataset.aosDateModified = folder.modifiedAt || folder.createdAt || '';
			button.dataset.aosSize = String(Array.isArray(folder.appIds) ? folder.appIds.length : 0);
			button.dataset.aosOpenFolder = folder.id;
			button.dataset.aosUserFolder = '1';
			button.setAttribute('aria-label', folder.label);

			const icon = dom.createElement('span', 'aos-app-icon');
			icon.appendChild(dom.createIcon(folder.icon || getDefaultFolderIcon()));

			const label = dom.createElement('span', 'aos-desktop-app-label', folder.label);

			button.append(icon, label);

			return button;
		}

		function renderUserFolders() {
			const layer = ensureFolderLayer();
			if (!layer) {
				return;
			}

			layer.querySelectorAll('[data-aos-user-folder="1"]').forEach((folder) => folder.remove());
			userFolders.forEach((folder) => layer.appendChild(createFolderButton(folder)));
		}

		function refreshDesktopIcons() {
			if (window.AdminOSMode.desktopIconManager && typeof window.AdminOSMode.desktopIconManager.rebind === 'function') {
				window.AdminOSMode.desktopIconManager.rebind();
			}
		}

		function saveDesktopIconSession() {
			if (window.AdminOSMode.desktopIconManager && typeof window.AdminOSMode.desktopIconManager.saveSession === 'function') {
				window.AdminOSMode.desktopIconManager.saveSession();
			}
		}

		function getFolderIcon(folderId) {
			return desktop
				? desktop.querySelector(`[data-aos-user-folder="1"][data-aos-open-folder="${dom.escapeAttribute(folderId)}"]`)
				: null;
		}

		function getPointPosition(point, icon) {
			const layer = ensureFolderLayer();
			if (!layer || !point || !Number.isFinite(point.clientX) || !Number.isFinite(point.clientY)) {
				return null;
			}

			const layerRect = layer.getBoundingClientRect();
			const iconWidth = icon ? icon.offsetWidth || 74 : 74;
			const iconHeight = icon ? icon.offsetHeight || 76 : 76;
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
			return getUserFolder(folderId) || systemFolderMap.get(folderId) || null;
		}

		function getFolders() {
			return systemFolders
				.map((folder) => Object.assign({ kind: 'system', user: false }, folder))
				.concat(userFolders.map((folder) => Object.assign({}, folder)));
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
			const userFolder = getUserFolder(folderId);

			if (userFolder) {
				return userFolder.appIds
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

			const folderApps = getFolderApps(folderId);
			const userFolder = getUserFolder(folderId);
			const itemCount = folderApps.length;

			return {
				canComment: Boolean(userFolder),
				canRename: Boolean(userFolder),
				comment: userFolder ? userFolder.comment || '' : '',
				createdAt: userFolder ? userFolder.createdAt || '' : '',
				icon: folder.icon || getDefaultFolderIcon(),
				id: folder.id,
				itemCount,
				items: folderApps.map((app) => ({
					id: app.id,
					label: app.label,
					source: app.source || 'registry',
					url: app.url || ''
				})),
				kind: 'Folder',
				label: folder.label || 'Folder',
				lastOpenedAt: userFolder ? userFolder.lastOpenedAt || '' : '',
				modifiedAt: userFolder ? userFolder.modifiedAt || userFolder.createdAt || '' : '',
				source: userFolder ? 'Admin OS user folder' : 'WordPress admin group',
				user: Boolean(userFolder),
				where: userFolder ? 'Admin OS Desktop' : `WordPress Admin Menu > ${folder.label || 'Folder'}`
			};
		}

		function syncDesktopAppVisibility() {
			if (!desktop) {
				return;
			}

			desktop.querySelectorAll('[data-aos-desktop-icon-kind="app"][data-aos-open-app]').forEach((icon) => {
				const appId = icon.dataset.aosOpenApp || '';
				const folder = appId ? getUserFolderForApp(appId) : null;

				icon.hidden = Boolean(folder);
				if (folder) {
					icon.dataset.aosInFolder = folder.id;
				} else {
					delete icon.dataset.aosInFolder;
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

		function createFolder(label = 'untitled folder', appIds = [], createOptions = {}) {
			const now = new Date().toISOString();
			const id = `user-folder-${Date.now().toString(36)}-${idCounter += 1}`;
			const folder = {
				appIds: normalizeAppIds(appIds),
				comment: '',
				createdAt: now,
				icon: getDefaultFolderIcon(),
				id,
				kind: 'user',
				label: uniqueLabel(label),
				lastOpenedAt: '',
				modifiedAt: now,
				user: true
			};

			userFolders.push(folder);
			renderUserFolders();
			syncDesktopAppVisibility();
			refreshDesktopIcons();
			positionFolderIcon(folder.id, createOptions.point || createOptions.position || null);
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

		function deleteFolder(folderId) {
			const index = userFolders.findIndex((folder) => folder.id === folderId);
			if (index < 0) {
				return false;
			}

			userFolders.splice(index, 1);
			renderUserFolders();
			syncDesktopAppVisibility();
			refreshDesktopIcons();
			if (launcher && typeof launcher.closeFolderWindow === 'function') {
				launcher.closeFolderWindow(folderId);
			}
			if (launcher && typeof launcher.closeFolderInfoWindow === 'function') {
				launcher.closeFolderInfoWindow(folderId);
			}
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

		function removeAppFromFolder(appId, folderId) {
			const folder = getUserFolder(folderId);
			if (!folder) {
				return false;
			}

			const nextAppIds = folder.appIds.filter((folderAppId) => folderAppId !== appId);
			if (nextAppIds.length === folder.appIds.length) {
				return false;
			}

			folder.appIds = nextAppIds;
			markFolderModified(folder);
			syncDesktopAppVisibility();
			refreshFolderWindows([folder.id]);
			refreshDesktopIcons();
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
			const label = icon ? icon.querySelector('.aos-desktop-app-label') : null;
			if (!folder || !icon || !label || label.dataset.aosInlineRename === '1') {
				return false;
			}

			const originalLabel = folder.label || 'untitled folder';
			let finished = false;

			function cleanup() {
				label.removeEventListener('blur', onBlur);
				label.removeEventListener('keydown', onKeyDown);
				label.removeEventListener('click', stopEditingEvent);
				label.removeEventListener('pointerdown', stopEditingEvent);
				label.removeAttribute('contenteditable');
				label.removeAttribute('spellcheck');
				delete label.dataset.aosInlineRename;
				icon.classList.remove('is-renaming');
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
			icon.dataset.aosSuppressClick = '1';
			label.dataset.aosInlineRename = '1';
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
			renderUserFolders();
			syncDesktopAppVisibility();
		}

		window.addEventListener('beforeunload', saveFolders);

		return {
			addAppToFolder,
			createFolder,
			deleteFolder,
			disableSessionSave() {
				sessionSaveDisabled = true;
				window.clearTimeout(saveTimer);
			},
			getFolder,
			getFolderApps,
			getFolderInfo,
			getFolders,
			getUserFolderForApp,
			hasApp,
			isUserFolder,
			removeAppFromFolder,
			renameFolder,
			setFolderComment,
			restoreSession,
			saveSession: saveFolders,
			startInlineRename,
			syncDesktopAppVisibility,
			touchFolderOpened
		};
	};
})();
