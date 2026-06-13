(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.desktop = window.PufferDesk.desktop || {};

	window.PufferDesk.desktop.createFolderManager = function createFolderManager(shell, launcher, config = {}, options = {}) {
		const dom = window.PufferDesk.dom;
		const geometry = window.PufferDesk.geometry;
		const createDebouncedTask = window.PufferDesk.services.createDebouncedTask;
		const clamp = geometry.clamp;
		const readNumber = geometry.readNumber;
		const desktop = shell.querySelector('.pdk-desktop');
		const api = window.PufferDesk.services && window.PufferDesk.services.api ? window.PufferDesk.services.api : null;
		const documentStore = options.documentStore || null;
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
		const eventNames = window.PufferDesk.events && window.PufferDesk.events.names ? window.PufferDesk.events.names : {};
		const domEventNames = window.PufferDesk.events && window.PufferDesk.events.domNames ? window.PufferDesk.events.domNames : {};
		const getSettingAction = window.PufferDesk.config.getSettingAction.bind(window.PufferDesk.config);
		const systemFolderMap = new Map(systemFolders.map((folder) => [folder.id, Object.assign({ kind: 'system', user: false }, folder)]));
		const menuLabels = config.menu && config.menu.labels && typeof config.menu.labels === 'object' ? config.menu.labels : {};
		const trashFolderId = appIds.TRASH;
		const desktopFolderId = virtualFilesystem && typeof virtualFilesystem.getFolderId === 'function'
			? virtualFilesystem.getFolderId('DESKTOP')
			: '';
		let userFolders = [];
		let desktopDocuments = [];
		let desktopDocumentsLoadRequest = null;
		let desktopDocumentsReloadQueued = false;
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

				return id || desktopFolderId;
			}

			function getFolderParentId(folder) {
				return normalizeParentId(folder && folder.parentId ? folder.parentId : desktopFolderId);
			}

			function getDesktopFolderPath() {
				return virtualFilesystem && typeof virtualFilesystem.getDefaultPathForKind === 'function'
					? virtualFilesystem.getDefaultPathForKind(desktopFolderId)
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
				return getFolderParentId(folder) === desktopFolderId;
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

		function parseDocumentId(value) {
			const raw = String(value || '').trim();
			const direct = raw.match(/^\d+$/);
			const prefixed = raw.match(/^document-(\d+)$/);
			const match = direct ? direct : prefixed;

			return match ? Number.parseInt(direct ? raw : match[1], 10) || 0 : 0;
		}

		function getDocumentTrashIcon(documentData = {}) {
			return window.PufferDesk.documents && typeof window.PufferDesk.documents.getStickyNoteDocumentIcon === 'function'
				? window.PufferDesk.documents.getStickyNoteDocumentIcon()
				: 'dashicons-media-text';
		}

		function getStickyKind() {
			return documentStore && documentStore.kinds ? documentStore.kinds.sticky : '';
		}

		function getDocumentFallbackLabel(documentData = {}) {
			return getMenuLabel('sticky_note');
		}

		function getDocumentDesktopIconId(documentId) {
			return `${desktopIconPrefixes.document || 'document:'}${documentId}`;
		}

		function getDocumentSize(documentData = {}) {
			const content = typeof documentData.content === 'string' ? documentData.content : '';

			return content.length;
		}

		function normalizeDesktopDocument(documentData) {
			const documentId = parseDocumentId(documentData && documentData.id);
			const kind = typeof documentData.kind === 'string' ? documentData.kind : '';

			if (!documentId || kind !== getStickyKind()) {
				return null;
			}

			const label = String(documentData.title || getDocumentFallbackLabel(documentData)).trim() || getDocumentFallbackLabel(documentData);

			return {
				document: documentData,
				icon: getDocumentTrashIcon(documentData),
				id: `document-${documentId}`,
				label,
				modified: typeof documentData.modified === 'string' ? documentData.modified : '',
				type: 'document'
			};
		}

		function serializeDocumentTrashDocument(documentData = {}) {
			const documentId = parseDocumentId(documentData.id);

			return {
				color: typeof documentData.color === 'string' ? documentData.color : '',
				id: documentId,
				kind: typeof documentData.kind === 'string' ? documentData.kind : '',
				modified: typeof documentData.modified === 'string' ? documentData.modified : '',
				parentPath: typeof documentData.parentPath === 'string' ? documentData.parentPath : '',
				path: typeof documentData.path === 'string' ? documentData.path : '',
				title: typeof documentData.title === 'string' ? documentData.title : ''
			};
		}

			function getUntitledFolderLabel() {
				return getMenuLabel('untitled_folder');
			}

			function createUserFolderId() {
				return `user-folder-${Date.now().toString(36)}-${idCounter += 1}`;
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
							parentId !== desktopFolderId
							&& !systemFolderMap.has(parentId)
							&& !userFolderIds.has(parentId)
						)
					) {
						folder.parentId = desktopFolderId;
					}
				});
			}

			function serializeFolder(folder) {
				return {
					appIds: normalizeAppIds(folder.appIds),
				appRefs: normalizeAppIds(folder.appRefs),
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

			function normalizeTrashFolders(folders = [], rootFolderId = '') {
				const rootId = normalizeId(rootFolderId);
				const seen = new Set(rootId ? [rootId] : []);
				const normalized = [];

				if (!Array.isArray(folders)) {
					return normalized;
				}

				folders.forEach((rawFolder) => {
					const folder = normalizeFolder(rawFolder);

					if (!folder || !folder.id || seen.has(folder.id)) {
						return;
					}

					seen.add(folder.id);
					normalized.push(serializeFolder(folder));
				});

				const knownIds = new Set(rootId ? [rootId] : []);
				normalized.forEach((folder) => {
					knownIds.add(folder.id);
				});

				normalized.forEach((folder) => {
					const parentId = getFolderParentId(folder);

					if (!rootId) {
						folder.parentId = parentId === folder.id ? desktopFolderId : parentId;
					} else if (parentId === folder.id || parentId === trashFolderId || !knownIds.has(parentId)) {
						folder.parentId = rootId;
					}
				});

				return normalized.map(serializeFolder);
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

		function normalizeDocumentTrashItem(item) {
			const rawDocument = item && item.document && typeof item.document === 'object' ? item.document : {};
			const documentId = parseDocumentId(item && (item.documentId || item.id || rawDocument.id));
			const parentPath = typeof rawDocument.parentPath === 'string' && rawDocument.parentPath
				? rawDocument.parentPath
				: (item && item.restore && typeof item.restore.parentPath === 'string' ? item.restore.parentPath : '');
			const documentData = serializeDocumentTrashDocument(Object.assign({}, rawDocument, {
				id: documentId,
				parentPath
			}));
			const label = String(item && item.label ? item.label : documentData.title || getMenuLabel('sticky_note')).trim() || getMenuLabel('sticky_note');

			if (!documentId) {
				return null;
			}

			return {
				document: Object.assign({}, documentData, {
					title: documentData.title || label
				}),
				documentId,
				icon: getDocumentTrashIcon(documentData),
				id: normalizeId(item && item.id ? item.id : '') || `document-${documentId}`,
				label,
				restore: {
					parentPath
				},
				trashedAt: normalizeTimestamp(item && item.trashedAt, new Date().toISOString()),
				type: 'document'
			};
		}

		function normalizeTrashItem(item) {
			if (!item || typeof item !== 'object') {
				return null;
			}

			if (item.type === 'document') {
				return normalizeDocumentTrashItem(item);
			}

			if (item.type && item.type !== 'folder') {
				return null;
			}

			const folder = normalizeFolder(item.folder);
			if (!folder) {
				return null;
				}

				return {
					folder: serializeFolder(folder),
					folders: normalizeTrashFolders(item.folders, folder.id),
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
					if (item && item.type === 'document') {
						const documentData = serializeDocumentTrashDocument(item.document);

						return {
							document: Object.assign({}, documentData, {
								title: documentData.title || item.label || getMenuLabel('sticky_note')
							}),
							documentId: item.documentId || documentData.id,
							icon: item.icon || getDocumentTrashIcon(documentData),
							id: item.id,
							label: item.label || documentData.title || getMenuLabel('sticky_note'),
							restore: {
								parentPath: item.restore && typeof item.restore.parentPath === 'string' ? item.restore.parentPath : documentData.parentPath || ''
							},
							trashedAt: item.trashedAt || '',
							type: 'document'
						};
					}

					const folder = serializeFolder(item.folder);

					return {
						folder,
						folders: normalizeTrashFolders(item.folders, folder.id),
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

		function ensureDocumentLayer() {
			if (!desktop) {
				return null;
			}

			let layer = desktop.querySelector('.pdk-desktop-documents');
			if (layer) {
				layer.classList.add('pdk-desktop-icon-layer');
				return layer;
			}

			layer = dom.createElement('section', 'pdk-desktop-documents pdk-desktop-icon-layer');
			layer.setAttribute('aria-label', getMenuLabel('sticky_note'));

			const appLayer = desktop.querySelector('.pdk-desktop-apps');
			const folderLayer = desktop.querySelector('.pdk-desktop-folders');
			if (appLayer && appLayer.parentNode === desktop) {
				desktop.insertBefore(layer, appLayer);
			} else if (folderLayer && folderLayer.parentNode === desktop && folderLayer.nextSibling) {
				desktop.insertBefore(layer, folderLayer.nextSibling);
			} else {
				desktop.insertBefore(layer, desktop.firstChild);
			}

			return layer;
		}

		function createFolderButton(folder) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'pdk-desktop-icon pdk-desktop-folder';
			button.dataset.pdkContext = contextTargets.DESKTOP_FOLDER;
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

			const label = dom.createTruncatedLabel('pdk-desktop-app-label', folder.label);

			button.append(icon, label);

			return button;
		}

		function createDesktopDocumentButton(item) {
			const documentData = item && item.document ? item.document : {};
			const documentId = parseDocumentId(documentData.id || item.id);
			const label = item && item.label ? item.label : getDocumentFallbackLabel(documentData);
			const kind = typeof documentData.kind === 'string' ? documentData.kind : '';
			const button = document.createElement('button');

			button.type = 'button';
			button.className = 'pdk-desktop-icon pdk-desktop-document pdk-document-launcher';
			button.dataset.pdkContext = contextTargets.DOCUMENT || 'document';
			button.dataset.pdkContextId = item.id || `document-${documentId}`;
			button.dataset.pdkContextLabel = label;
			button.dataset.pdkDesktopIcon = '';
			button.dataset.pdkDesktopIconId = getDocumentDesktopIconId(documentId);
			button.dataset.pdkDesktopIconKind = 'document';
			button.dataset.pdkDocumentId = String(documentId);
			button.dataset.pdkDocumentKind = kind;
			button.dataset.pdkFolderId = desktopFolderId;
			button.dataset.pdkDateAdded = documentData.created || '';
			button.dataset.pdkDateCreated = documentData.created || '';
			button.dataset.pdkDateModified = documentData.modified || documentData.created || '';
			button.dataset.pdkSize = String(getDocumentSize(documentData));
			button.setAttribute('aria-label', label);

			const icon = dom.createElement('span', 'pdk-app-icon');
			icon.appendChild(dom.createIcon(item.icon || getDocumentTrashIcon(documentData)));

			const itemLabel = dom.createTruncatedLabel('pdk-desktop-app-label', label);

			button.append(icon, itemLabel);
			button.addEventListener('dblclick', (event) => {
				event.preventDefault();
				event.stopPropagation();
				if (launcher && typeof launcher.openDocumentById === 'function') {
					launcher.openDocumentById(documentId);
				}
			});

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

		function renderDesktopDocuments() {
			const layer = ensureDocumentLayer();
			if (!layer) {
				return;
			}

			layer.replaceChildren();
			desktopDocuments.forEach((item) => {
				layer.appendChild(createDesktopDocumentButton(item));
			});
		}

		function loadDesktopDocuments() {
			const parentPath = getDesktopFolderPath();
			if (
				!documentStore
				|| typeof documentStore.list !== 'function'
				|| !parentPath
			) {
				desktopDocuments = [];
				renderDesktopDocuments();
				return Promise.resolve([]);
			}

			if (desktopDocumentsLoadRequest) {
				desktopDocumentsReloadQueued = true;
				return desktopDocumentsLoadRequest;
			}

			desktopDocumentsLoadRequest = documentStore.list('', {
				parentPath
			}).then((documents) => {
				desktopDocuments = Array.isArray(documents)
					? documents.map(normalizeDesktopDocument).filter(Boolean)
					: [];
				renderDesktopDocuments();
				refreshDesktopIcons();
				return desktopDocuments.slice();
			}).catch(() => {
				desktopDocuments = [];
				renderDesktopDocuments();
				refreshDesktopIcons();
				return [];
			}).finally(() => {
				desktopDocumentsLoadRequest = null;
				if (desktopDocumentsReloadQueued) {
					desktopDocumentsReloadQueued = false;
					loadDesktopDocuments();
				}
			});

			return desktopDocumentsLoadRequest;
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

		function getTrashIcon(state) {
			const app = appMap.get(trashFolderId) || {};
			const baseIcon = app.icon && typeof app.icon === 'object' ? app.icon : {};
			const fallback = baseIcon.fallback || baseIcon.value || baseIcon.icon || 'dashicons-trash';
			const icon = Object.assign({}, baseIcon);

			if (icon.type === 'theme') {
				icon.name = state === 'full' ? 'trash-full.svg' : 'trash-empty.svg';
				icon.fallback = fallback;
				return icon;
			}

			if (state === 'empty' && app.icon) {
				return app.icon;
			}

			return {
				type: 'theme',
				name: state === 'full' ? 'trash-full.svg' : 'trash-empty.svg',
				fallback
			};
		}

		function syncTrashSurfaceIcon(button, state) {
			if (!button || !dom || typeof dom.createIcon !== 'function') {
				return;
			}

			const container = button.querySelector('.pdk-app-icon') || button;

			if (!container || (container.dataset && container.dataset.pdkTrashIconState === state)) {
				return;
			}

			Array.from(container.children).forEach((child) => {
				if (child.classList && child.classList.contains('pdk-icon')) {
					child.remove();
				}
			});
			container.insertBefore(dom.createIcon(getTrashIcon(state)), container.firstChild || null);
			if (container.dataset) {
				container.dataset.pdkTrashIconState = state;
			}
		}

		function syncTrashSurfaceState() {
			if (!shell) {
				return;
			}

			const count = getTrashCount();
			const state = count > 0 ? 'full' : 'empty';
			const label = count > 0
				? formatMenuLabel(count === 1 ? 'trash_item_count' : 'trash_item_count_plural', '', [count])
				: getMenuLabel('trash');
			const selector = [
				`[data-pdk-open-app="${dom.escapeAttribute(trashFolderId)}"]`,
				`[data-pdk-open-folder="${dom.escapeAttribute(trashFolderId)}"]`
			].join(',');

			shell.querySelectorAll(selector).forEach((button) => {
				const badge = button.querySelector('.pdk-trash-badge');

				button.classList.toggle('is-trash-full', count > 0);
				button.dataset.pdkTrashState = state;
				button.setAttribute('aria-label', label);
				syncTrashSurfaceIcon(button, state);

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

			function getFolderDescendantIds(folderId) {
				const rootId = normalizeId(folderId);
				const descendants = [];
				const queue = rootId ? [rootId] : [];
				const seen = new Set(queue);
				let guard = 0;

				while (queue.length && guard < 1000) {
					const parentId = queue.shift();

					userFolders.forEach((folder) => {
						if (!folder || !folder.id || seen.has(folder.id) || getFolderParentId(folder) !== parentId) {
							return;
						}

						seen.add(folder.id);
						descendants.push(folder.id);
						queue.push(folder.id);
					});

					guard += 1;
				}

				return descendants;
			}

			function getFolderSubtreeIds(folderId) {
				const rootId = normalizeId(folderId);

				return rootId ? [rootId].concat(getFolderDescendantIds(rootId)) : [];
			}

			function getFolderDescendantSnapshots(folderId) {
				return getFolderDescendantIds(folderId)
					.map((id) => getUserFolder(id))
					.filter(Boolean)
					.map(serializeFolder);
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
					canRename: false,
					createdAt: '',
					icon: folder.icon || 'dashicons-trash',
					id: folder.id,
					itemCount: trashItems.length,
					items: trashItems.map((item) => ({
						id: item.id,
						label: item.label || (item.type === 'document' ? getMenuLabel('sticky_note') : getFolderLabel()),
						source: 'trash',
						type: item.type || 'folder',
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
				canRename: Boolean(userFolder),
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
						: formatMenuLabel('wordpress_admin_menu_format', '', [folder.label || getFolderLabel()])
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
				const id = createUserFolderId();
					const parentId = normalizeParentId(createOptions.parentId);
					const folder = {
						appIds: normalizeAppIds(appIds),
					appRefs: [],
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

			const parentId = getFolderParentId(folder);
			folder.label = uniqueLabel(label || folder.label, folder.id);
			markFolderModified(folder);
			renderUserFolders();
			syncDesktopAppVisibility();
			refreshDesktopIcons();
			refreshFolderWindows([folder.id, parentId]);
			scheduleSave();

			return folder;
		}

			function closeFolderSurfaces(folderId) {
				if (launcher && typeof launcher.closeFolderWindow === 'function') {
					launcher.closeFolderWindow(folderId);
			}

			if (launcher && typeof launcher.closeFolderInfoWindow === 'function') {
				launcher.closeFolderInfoWindow(folderId);
				}
			}

			function removeTrashItemsByFolderIds(folderIds = []) {
				const ids = new Set((Array.isArray(folderIds) ? folderIds : []).map(normalizeId).filter(Boolean));

				if (!ids.size) {
					return;
				}

				trashItems = trashItems.filter((item) => {
					if (!item) {
						return false;
					}

					if ((item.folder && ids.has(item.folder.id)) || ids.has(item.id.replace(/^folder-/, ''))) {
						return false;
					}

					return !Array.isArray(item.folders) || !item.folders.some((folder) => folder && ids.has(folder.id));
				});
			}

			function removeTrashItemsByDocumentIds(documentIds = []) {
				const ids = new Set((Array.isArray(documentIds) ? documentIds : []).map(parseDocumentId).filter(Boolean));

				if (!ids.size) {
					return;
				}

				trashItems = trashItems.filter((item) => !(item && item.type === 'document' && ids.has(parseDocumentId(item.documentId))));
			}

			function moveDocumentToTrash(documentData) {
				const documentId = parseDocumentId(documentData && documentData.id);
				const trashItem = normalizeTrashItem({
					document: documentData,
					documentId,
					icon: getDocumentTrashIcon(documentData),
					id: `document-${documentId}`,
					label: documentData && documentData.title ? documentData.title : getMenuLabel('sticky_note'),
					restore: {
						parentPath: documentData && typeof documentData.parentPath === 'string' ? documentData.parentPath : ''
					},
					trashedAt: new Date().toISOString(),
					type: 'document'
				});

				if (!trashItem) {
					return null;
				}

				removeTrashItemsByDocumentIds([documentId]);
				trashItems.unshift(trashItem);
				trashItems = trashItems.filter(Boolean).slice(0, 100);
				scheduleTrashSave();
				dispatchTrashChange();

				return serializeTrash().find((item) => item.id === trashItem.id) || null;
			}

			function moveFolderToTrash(folderId) {
				const index = userFolders.findIndex((folder) => folder.id === folderId);
				if (index < 0) {
					return false;
				}

				const folder = userFolders[index];
				const previousParent = getFolderParentId(folder);
				const removedFolderIds = getFolderSubtreeIds(folder.id);
				const removedFolderSet = new Set(removedFolderIds);
				const trashedAt = new Date().toISOString();
				const trashItem = {
					folder: serializeFolder(folder),
					folders: getFolderDescendantSnapshots(folder.id),
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

				removeTrashItemsByFolderIds(removedFolderIds);
				trashItems.unshift(normalizeTrashItem(trashItem));
				trashItems = trashItems.filter(Boolean).slice(0, 100);
				userFolders = userFolders.filter((candidate) => !removedFolderSet.has(candidate.id));
				renderUserFolders();
				syncDesktopAppVisibility();
				refreshDesktopIcons();
				saveDesktopIconSession();
				refreshFolderWindows([previousParent].concat(removedFolderIds));
				removedFolderIds.forEach(closeFolderSurfaces);
				scheduleSave();
				scheduleTrashSave();
				dispatchTrashChange();

				return true;
			}

		function restoreTrashItem(trashId) {
			const index = trashItems.findIndex((item) => item.id === trashId);
			const item = index >= 0 ? trashItems[index] : null;

			if (!item) {
				return null;
			}

			if (item.type === 'document') {
				if (!documentStore || typeof documentStore.restore !== 'function') {
					return Promise.resolve(null);
				}

				return documentStore.restore(item.documentId, {
					parentPath: item.restore && typeof item.restore.parentPath === 'string' ? item.restore.parentPath : ''
				}).then((documentData) => {
					const currentIndex = trashItems.findIndex((trashItem) => trashItem && trashItem.id === trashId);
					if (currentIndex >= 0) {
						trashItems.splice(currentIndex, 1);
					}
					scheduleTrashSave();
					dispatchTrashChange();

					return documentData;
				});
			}

			const restored = normalizeFolder(item.folder);

			if (item.type !== 'folder' || !restored) {
				return null;
			}

				if (getFolder(restored.id)) {
					restored.id = createUserFolderId();
				}

				const restoredRootOriginalId = item.folder && item.folder.id ? item.folder.id : restored.id;
				const restoredChildren = normalizeTrashFolders(item.folders, restoredRootOriginalId).map(normalizeFolder).filter(Boolean);
				const restoredFolders = [restored].concat(restoredChildren);
				const activeIds = new Set(userFolders.map((folder) => folder.id));
				const assignedIds = new Set();
				const idMap = new Map([[restoredRootOriginalId, restored.id]]);

				restoredChildren.forEach((folder) => {
					const originalId = folder.id;

					if (activeIds.has(folder.id) || assignedIds.has(folder.id) || systemFolderMap.has(folder.id) || folder.id === trashFolderId) {
						folder.id = createUserFolderId();
					}

					assignedIds.add(folder.id);
					idMap.set(originalId, folder.id);
				});

				const restoredIds = new Set(restoredFolders.map((folder) => folder.id));
				restored.label = uniqueLabel(restored.label || item.label || getFolderLabel(), restored.id);
				restored.parentId = normalizeParentId(item.restore && item.restore.previousParent ? item.restore.previousParent : restored.parentId);
				if (restored.parentId !== desktopFolderId && !getFolder(restored.parentId)) {
					restored.parentId = desktopFolderId;
				}
				markFolderModified(restored);
				userFolders.push(restored);
				restoredChildren.forEach((folder) => {
					const parentId = idMap.get(getFolderParentId(folder)) || getFolderParentId(folder);

					folder.parentId = parentId;
					if (folder.parentId === folder.id || !restoredIds.has(folder.parentId)) {
						folder.parentId = restored.id;
					}
					folder.label = uniqueLabel(folder.label || getFolderLabel(), folder.id);
					markFolderModified(folder);
					userFolders.push(folder);
				});
				trashItems.splice(index, 1);
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

			const item = trashItems[index];
			if (item && item.type === 'document') {
				if (!documentStore || typeof documentStore.remove !== 'function') {
					return Promise.resolve(false);
				}

				return documentStore.remove(item.documentId, {
					force: true
				}).then((deleted) => {
					if (deleted) {
						const currentIndex = trashItems.findIndex((trashItem) => trashItem && trashItem.id === trashId);
						if (currentIndex >= 0) {
							trashItems.splice(currentIndex, 1);
						}
						scheduleTrashSave();
						dispatchTrashChange();
					}

					return Boolean(deleted);
				});
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

			const documentItems = trashItems.filter((item) => item && item.type === 'document');

			if (documentItems.length && documentStore && typeof documentStore.remove === 'function') {
				return Promise.all(documentItems.map((item) => documentStore.remove(item.documentId, {
					force: true
				}).catch(() => false))).then(() => {
					trashItems = [];
					scheduleTrashSave();
					dispatchTrashChange();

					return true;
				});
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
				const removedFolderIds = getFolderSubtreeIds(folderId);
				const removedFolderSet = new Set(removedFolderIds);
				userFolders = userFolders.filter((folder) => !removedFolderSet.has(folder.id));
				renderUserFolders();
				syncDesktopAppVisibility();
				refreshDesktopIcons();
				saveDesktopIconSession();
				refreshFolderWindows([previousParent].concat(removedFolderIds));
				removedFolderIds.forEach(closeFolderSurfaces);
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

		function canMoveFolderToParent(folderId, parentId = desktopFolderId) {
			const folder = getUserFolder(folderId);
			const nextParentId = normalizeParentId(parentId);
			let currentParentId = nextParentId;

			if (!folder || nextParentId === folder.id) {
				return false;
			}

			if (nextParentId !== desktopFolderId && !getFolder(nextParentId)) {
				return false;
			}

			while (currentParentId && currentParentId !== desktopFolderId) {
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

		function moveFolderToParent(folderId, parentId = desktopFolderId, options = {}) {
			const folder = getUserFolder(folderId);
			const previousParentId = folder ? getFolderParentId(folder) : '';
			const nextParentId = normalizeParentId(parentId);

			if (!folder || !canMoveFolderToParent(folderId, nextParentId)) {
				return false;
			}

			if (previousParentId === nextParentId) {
				if (nextParentId === desktopFolderId) {
					positionDesktopIcon('folder', folder.id, options.point || options.position || null);
				}
				return false;
			}

			folder.parentId = nextParentId;
			markFolderModified(folder);
			renderUserFolders();
			syncDesktopAppVisibility();
			refreshDesktopIcons();
			if (nextParentId === desktopFolderId) {
				positionDesktopIcon('folder', folder.id, options.point || options.position || null);
			}
			refreshFolderWindows([previousParentId, nextParentId, folder.id]);
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
			let blurRefocusTimer = 0;
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
				window.clearTimeout(blurRefocusTimer);
				label.removeEventListener('blur', onBlur);
				label.removeEventListener('keydown', onKeyDown);
				label.removeEventListener('click', stopEditingEvent);
				label.removeEventListener('pointerdown', stopEditingEvent);
				document.removeEventListener('pointerdown', onDocumentPointerDown, true);
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
					if (dom.setTruncatedLabelText) {
						dom.setTruncatedLabelText(label, originalLabel);
					} else {
						label.textContent = originalLabel;
					}
				}
			}

			function stopEditingEvent(event) {
				event.stopPropagation();
			}

			function onBlur() {
				window.clearTimeout(blurRefocusTimer);
				blurRefocusTimer = window.setTimeout(() => {
					blurRefocusTimer = 0;
					if (finished) {
						return;
					}
					if (!icon.isConnected || !label.isConnected) {
						finish(true);
						return;
					}
					if (document.activeElement === label || label.contains(document.activeElement)) {
						return;
					}
					label.focus({ preventScroll: true });
				}, 0);
			}

			function onDocumentPointerDown(event) {
				if (finished || (event.target && label.contains(event.target))) {
					return;
				}

				finish(true);
			}

			function onKeyDown(event) {
				if (event.key === 'Enter') {
					event.preventDefault();
					finish(true);
				} else if (event.key === 'Escape') {
					event.preventDefault();
					finish(false);
				} else if (event.key === 'Tab') {
					finish(true);
				}
			}

			icon.classList.add('is-renaming');
			icon.dataset.pdkSuppressClick = '1';
			label.dataset.pdkInlineRename = '1';
			if (dom.setEditableLabelText) {
				dom.setEditableLabelText(label, originalLabel);
			} else {
				label.textContent = originalLabel;
			}
			label.setAttribute('contenteditable', 'plaintext-only');
			label.setAttribute('spellcheck', 'false');
			label.addEventListener('blur', onBlur);
			label.addEventListener('keydown', onKeyDown);
			label.addEventListener('click', stopEditingEvent);
			label.addEventListener('pointerdown', stopEditingEvent);
			document.addEventListener('pointerdown', onDocumentPointerDown, true);
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
			loadDesktopDocuments();
			syncDesktopAppVisibility();
			dispatchTrashChange();
		}

		window.addEventListener('beforeunload', () => {
			saveFolders();
			saveTrash();
		});

		if (window.PufferDesk.events && typeof window.PufferDesk.events.on === 'function' && eventNames.DOCUMENTS_CHANGED) {
			window.PufferDesk.events.on(eventNames.DOCUMENTS_CHANGED, () => {
				loadDesktopDocuments();
			});
		}

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
			moveDocumentToTrash,
			moveFolderToTrash,
			moveAppToDesktop,
			moveFolderToParent,
			removeAppFromFolder,
			renameFolder,
			restoreTrashItem,
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
