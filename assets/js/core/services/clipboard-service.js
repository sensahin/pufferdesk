(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.services = window.PufferDesk.services || {};

	window.PufferDesk.services.createClipboardService = function createClipboardService(config = {}, options = {}) {
		const folderManager = options.folderManager || null;
		const launcher = options.launcher || null;
		const desktopIconManager = options.desktopIconManager || null;
		const stickyNoteManager = options.stickyNoteManager || null;
		const documentStore = options.documentStore || null;
		const events = options.events || window.PufferDesk.events || null;
		const eventNames = events && events.names ? events.names : {};
		const virtualFilesystem = window.PufferDesk.virtualFilesystem && typeof window.PufferDesk.virtualFilesystem.create === 'function'
			? window.PufferDesk.virtualFilesystem.create(config)
			: null;
		const constants = window.PufferDesk.shell && window.PufferDesk.shell.contextMenuConstants
			? window.PufferDesk.shell.contextMenuConstants
			: {};
		const targets = constants.targets || {};
		const itemTypes = constants.itemTypes || {};
		const dragDropConstants = window.PufferDesk.dragDrop && window.PufferDesk.dragDrop.constants ? window.PufferDesk.dragDrop.constants : {};
		const containerTypes = dragDropConstants.containerTypes || {};
		const windowKinds = window.PufferDesk.session && window.PufferDesk.session.workspace
			? window.PufferDesk.session.workspace.windowKinds || {}
			: {};
		const models = window.PufferDesk.dragDrop && window.PufferDesk.dragDrop.models ? window.PufferDesk.dragDrop.models : null;
		const operations = Object.freeze({
			COPY: 'copy',
			CUT: 'cut'
		});
		const clipboardItemTypes = Object.freeze({
			APP: 'app',
			DOCUMENT: 'document',
			FOLDER: 'folder'
		});
		const supportedItemTypes = Object.freeze([
			clipboardItemTypes.APP,
			clipboardItemTypes.DOCUMENT,
			clipboardItemTypes.FOLDER
		]);
		const stickyNoteSource = targets.STICKY_NOTE;
		const clipboardConfig = config.clipboard && typeof config.clipboard === 'object' ? config.clipboard : {};
		const copyTtlMs = normalizeTtl(clipboardConfig.copyTtlMs || clipboardConfig.copyTtl, 30 * 60 * 1000);

		function getMenuLabel(key, fallback = '') {
			const menu = config.menu && typeof config.menu === 'object' ? config.menu : {};
			const labels = menu.labels && typeof menu.labels === 'object' ? menu.labels : {};
			const value = labels[key];

			return typeof value === 'string' && value ? value : fallback || key;
		}
		const cutTtlMs = normalizeTtl(clipboardConfig.cutTtlMs || clipboardConfig.cutTtl, 15 * 60 * 1000);
		const appIds = new Set((Array.isArray(config.apps) ? config.apps : []).map((app) => normalizeId(app && app.id)).filter(Boolean));
		const storageKey = `${config.storageKey || 'pufferdesk'}:clipboard`;
		let clipboard = readClipboard();

		function getSessionStorage() {
			try {
				return window.sessionStorage;
			} catch (error) {
				return null;
			}
		}

		function clone(value) {
			if (!value || typeof value !== 'object') {
				return value;
			}

			try {
				return JSON.parse(JSON.stringify(value));
			} catch (error) {
				return Array.isArray(value) ? value.slice() : Object.assign({}, value);
			}
		}

		function normalizeId(value) {
			return String(value || '').trim();
		}

		function normalizeTtl(value, fallback) {
			const ttl = Number.parseInt(value, 10);

			return Number.isFinite(ttl) && ttl > 0 ? ttl : fallback;
		}

		function normalizeDocumentId(value) {
			const raw = String(value || '').trim();
			const direct = raw.match(/^\d+$/);
			const prefixed = raw.match(/^document-(\d+)$/);
			const match = direct ? direct : prefixed;

			return match ? Number.parseInt(direct ? raw : match[1], 10) || 0 : 0;
		}

		function getFolderContainerId(folderId) {
			if (!folderId || folderId === containerTypes.DESKTOP) {
				return containerTypes.DESKTOP;
			}

			return models && typeof models.createContainerId === 'function'
				? models.createContainerId(containerTypes.FOLDER, folderId)
				: `folder:${folderId}`;
		}

		function getDesktopPath() {
			return virtualFilesystem && typeof virtualFilesystem.getDefaultPathForKind === 'function'
				? virtualFilesystem.getDefaultPathForKind(containerTypes.DESKTOP)
				: '';
		}

		function getDefaultStickyPath() {
			return documentStore && documentStore.kinds && virtualFilesystem && typeof virtualFilesystem.getDefaultPathForKind === 'function'
				? virtualFilesystem.getDefaultPathForKind(documentStore.kinds.sticky)
				: '';
		}

		function getFolder(folderId) {
			return folderManager && typeof folderManager.getFolder === 'function'
				? folderManager.getFolder(folderId)
				: null;
		}

		function getFolderPath(folderId) {
			if (!folderId || folderId === containerTypes.DESKTOP) {
				return getDesktopPath();
			}

			const folder = getFolder(folderId);
			if (folder && typeof folder.path === 'string' && folder.path) {
				return folder.path;
			}

			return virtualFilesystem && typeof virtualFilesystem.getPathForFolder === 'function'
				? virtualFilesystem.getPathForFolder(folderId)
				: '';
		}

		function getCopyLabel(label) {
			const base = String(label || '').trim() || getMenuLabel('untitled_item');
			const template = getMenuLabel('copy_name_format');

			return template.replace('%s', base);
		}

		function emit(name, detail = {}) {
			if (events && typeof events.emit === 'function' && name) {
				events.emit(name, detail);
			}
		}

		function emitFolderChange(folderId, item = null) {
			if (folderId && eventNames.FOLDER_CONTENTS_CHANGED) {
				emit(eventNames.FOLDER_CONTENTS_CHANGED, {
					changed: true,
					folderId,
					item,
					reason: 'clipboard'
				});
			}
		}

		function emitDesktopChange(item = null) {
			if (eventNames.DESKTOP_LAYOUT_CHANGED) {
				emit(eventNames.DESKTOP_LAYOUT_CHANGED, {
					changed: true,
					item,
					reason: 'clipboard'
				});
			}
		}

		function sanitizeItem(item = {}) {
			const type = normalizeId(item.type);
			const id = type === clipboardItemTypes.DOCUMENT ? normalizeDocumentId(item.id || item.documentId) : normalizeId(item.id);

			if (!type || !id || !supportedItemTypes.includes(type)) {
				return null;
			}

			return {
				documentKind: normalizeId(item.documentKind),
				id,
				label: normalizeId(item.label),
				parentFolderId: normalizeId(item.parentFolderId),
				parentPath: normalizeId(item.parentPath),
				source: normalizeId(item.source),
				sourceContainerId: normalizeId(item.sourceContainerId),
				type
			};
		}

		function sanitizeClipboard(data = {}) {
			const operation = data && data.operation === operations.CUT ? operations.CUT : operations.COPY;
			const items = Array.isArray(data.items) ? data.items.map(sanitizeItem).filter(Boolean) : [];
			const createdAt = Number.parseInt(data.createdAt, 10) || Date.now();
			const defaultExpiresAt = createdAt + (operation === operations.CUT ? cutTtlMs : copyTtlMs);
			const expiresAt = Number.parseInt(data.expiresAt, 10) || defaultExpiresAt;

			return {
				createdAt,
				expiresAt: items.length ? expiresAt : 0,
				items,
				operation
			};
		}

		function isExpired(data = {}) {
			return Boolean(data.items && data.items.length && data.expiresAt && data.expiresAt <= Date.now());
		}

		function getCurrentClipboard() {
			const current = clipboard.items.length ? clipboard : readClipboard();

			if (isExpired(current)) {
				clear();
				return clipboard;
			}

			return current;
		}

		function readClipboard() {
			const storage = getSessionStorage();

			if (!storage) {
				return sanitizeClipboard({});
			}

			try {
				return sanitizeClipboard(JSON.parse(storage.getItem(storageKey) || '{}'));
			} catch (error) {
				return sanitizeClipboard({});
			}
		}

		function writeClipboard(nextClipboard) {
			const storage = getSessionStorage();

			clipboard = sanitizeClipboard(nextClipboard);
			if (isExpired(clipboard)) {
				clipboard = sanitizeClipboard({});
			}
			if (!storage) {
				return clipboard;
			}

			if (!clipboard.items.length) {
				storage.removeItem(storageKey);
			} else {
				storage.setItem(storageKey, JSON.stringify(clipboard));
			}

			return clipboard;
		}

		function clear() {
			return writeClipboard({
				items: [],
				operation: operations.COPY
			});
		}

		function set(operation, items) {
			const createdAt = Date.now();
			const normalizedOperation = operation === operations.CUT ? operations.CUT : operations.COPY;

			return writeClipboard({
				createdAt,
				expiresAt: createdAt + (normalizedOperation === operations.CUT ? cutTtlMs : copyTtlMs),
				items: Array.isArray(items) ? items : [],
				operation: normalizedOperation
			});
		}

		async function isClipboardItemAvailable(item) {
			if (!item || !item.id) {
				return false;
			}

			if (item.type === clipboardItemTypes.APP) {
				return !appIds.size || appIds.has(item.id);
			}

			if (item.type === clipboardItemTypes.FOLDER) {
				return Boolean(getFolder(item.id));
			}

			if (item.type === clipboardItemTypes.DOCUMENT) {
				if (!documentStore || typeof documentStore.get !== 'function') {
					return true;
				}

				return documentStore.get(item.id).then(Boolean).catch(() => false);
			}

			return false;
		}

		async function cleanup(options = {}) {
			const current = clipboard.items.length ? clipboard : readClipboard();

			if (!current.items.length) {
				return false;
			}

			if (isExpired(current)) {
				clear();
				return true;
			}

			if (!options.validate) {
				return false;
			}

			const items = [];

			for (const item of current.items) {
				if (await isClipboardItemAvailable(item)) {
					items.push(item);
				}
			}

			if (items.length === current.items.length) {
				return false;
			}

			writeClipboard(Object.assign({}, current, {
				items
			}));

			return true;
		}

		function detailToItem(detail = {}) {
			const type = detail.type || detail.kind || '';
			const id = detail.id || detail.targetId || '';

			if ([targets.DESKTOP_APP, targets.FOLDER_APP, itemTypes.APP, clipboardItemTypes.APP].includes(type)) {
				return sanitizeItem({
					id,
					label: detail.label,
					parentFolderId: detail.folderId || '',
					sourceContainerId: detail.folderId ? getFolderContainerId(detail.folderId) : containerTypes.DESKTOP,
					type: clipboardItemTypes.APP
				});
			}

			if ([targets.DESKTOP_FOLDER, targets.FOLDER, itemTypes.FOLDER, clipboardItemTypes.FOLDER].includes(type)) {
				const folder = getFolder(id) || detail.folder || {};

				return sanitizeItem({
					id,
					label: detail.label || folder.label || '',
					parentFolderId: folder.parentId || detail.folderId || '',
					parentPath: folder.path || '',
					sourceContainerId: folder.parentId ? getFolderContainerId(folder.parentId) : containerTypes.DESKTOP,
					type: clipboardItemTypes.FOLDER
				});
			}

			if (type === targets.DOCUMENT || type === itemTypes.DOCUMENT || type === clipboardItemTypes.DOCUMENT) {
				return sanitizeItem({
					id: detail.documentId || id,
					label: detail.label,
					parentFolderId: detail.folderId || '',
					sourceContainerId: detail.folderId ? getFolderContainerId(detail.folderId) : '',
					type: clipboardItemTypes.DOCUMENT
				});
			}

			if (type === targets.STICKY_NOTE) {
				const documentId = normalizeDocumentId(detail.documentId || id);
				const snapshot = stickyNoteManager && typeof stickyNoteManager.getNoteSnapshot === 'function'
					? stickyNoteManager.getNoteSnapshot(documentId)
					: null;

				return sanitizeItem({
					documentKind: documentStore && documentStore.kinds ? documentStore.kinds.sticky : '',
					id: documentId,
					label: detail.label || (snapshot && snapshot.document ? snapshot.document.title : ''),
					parentPath: snapshot && snapshot.document ? snapshot.document.parentPath : '',
					source: stickyNoteSource,
					sourceContainerId: containerTypes.DESKTOP,
					type: clipboardItemTypes.DOCUMENT
				});
			}

			return null;
		}

		function getDesktopSelectedItems(detail = {}) {
			const selected = desktopIconManager && typeof desktopIconManager.getSelectedIconDetails === 'function'
				? desktopIconManager.getSelectedIconDetails()
				: [];
			const items = selected.map((icon) => detailToItem({
				folder: icon.kind === clipboardItemTypes.FOLDER ? getFolder(icon.id) : null,
				id: icon.id,
				kind: icon.context || (icon.kind === clipboardItemTypes.FOLDER ? targets.DESKTOP_FOLDER : targets.DESKTOP_APP),
				label: icon.label,
				type: icon.context || (icon.kind === clipboardItemTypes.FOLDER ? targets.DESKTOP_FOLDER : targets.DESKTOP_APP)
			})).filter(Boolean);

			return items.length ? items : [detailToItem(detail)].filter(Boolean);
		}

		function getFolderSelectedItems(detail = {}) {
			const folderId = detail.folderId || (detail.windowElement && detail.windowElement.dataset ? detail.windowElement.dataset.pdkFolderWindow : '') || '';
			const selected = launcher && typeof launcher.getSelectedFolderItems === 'function'
				? launcher.getSelectedFolderItems(folderId, detail.windowElement || null)
				: [];
			const items = selected.map((item) => sanitizeItem({
				id: item.id,
				label: item.label || '',
				parentFolderId: item.parentFolderId || folderId,
				sourceContainerId: item.parentFolderId ? getFolderContainerId(item.parentFolderId) : getFolderContainerId(folderId),
				type: item.type
			})).filter(Boolean);

			return items.length ? items : [detailToItem(detail)].filter(Boolean);
		}

		function getItemsFromDetail(detail = {}) {
			const type = detail.type || detail.kind || '';

			if (type === targets.STICKY_NOTE || detail.stickyNoteElement) {
				return [detailToItem(Object.assign({}, detail, {
					documentId: detail.documentId || detail.id,
					type: targets.STICKY_NOTE
				}))].filter(Boolean);
			}

			if ([targets.DESKTOP, targets.DESKTOP_APP, targets.DESKTOP_FOLDER].includes(type) || (!type && !detail.windowElement)) {
				return getDesktopSelectedItems(detail);
			}

			if (
				[targets.FOLDER_CONTENT, targets.FOLDER_TOOLBAR, targets.FOLDER_TAB, targets.FOLDER_APP, targets.FOLDER, targets.DOCUMENT].includes(type)
				|| detail.folderId
				|| (detail.windowElement && detail.windowElement.dataset && detail.windowElement.dataset.pdkWindowKind === windowKinds.FOLDER)
			) {
				return getFolderSelectedItems(detail);
			}

			return [detailToItem(detail)].filter(Boolean);
		}

		function getActiveFolderId(detail = {}) {
			if (detail.folderId) {
				return detail.folderId;
			}

			if (detail.windowElement && detail.windowElement.dataset && detail.windowElement.dataset.pdkFolderWindow) {
				return detail.windowElement.dataset.pdkFolderWindow;
			}

			const activeWindow = launcher && typeof launcher.getActiveFolderWindow === 'function'
				? launcher.getActiveFolderWindow()
				: null;

			return activeWindow && activeWindow.dataset ? activeWindow.dataset.pdkFolderWindow || '' : '';
		}

		function getPasteTarget(detail = {}) {
			const type = detail.type || detail.kind || '';

			if ([targets.FOLDER, targets.DESKTOP_FOLDER].includes(type) && detail.id) {
				return {
					folderId: detail.id,
					parentId: detail.id,
					parentPath: getFolderPath(detail.id),
					point: detail.contextPoint || null,
					type: containerTypes.FOLDER
				};
			}

			if (
				[targets.FOLDER_CONTENT, targets.FOLDER_TOOLBAR, targets.FOLDER_TAB, targets.FOLDER_APP, targets.DOCUMENT].includes(type)
				|| detail.folderId
				|| (detail.windowElement && detail.windowElement.dataset && detail.windowElement.dataset.pdkWindowKind === windowKinds.FOLDER)
			) {
				const folderId = getActiveFolderId(detail);

				return {
					folderId,
					parentId: folderId || containerTypes.DESKTOP,
					parentPath: getFolderPath(folderId),
					point: detail.contextPoint || null,
					type: containerTypes.FOLDER
				};
			}

			return {
				folderId: containerTypes.DESKTOP,
				parentId: containerTypes.DESKTOP,
				parentPath: getDesktopPath(),
				point: detail.contextPoint || null,
				type: containerTypes.DESKTOP
			};
		}

		function canCutItem(item) {
			if (!item || !item.id) {
				return false;
			}

			if (item.type === clipboardItemTypes.FOLDER) {
				return Boolean(folderManager && typeof folderManager.isUserFolder === 'function' && folderManager.isUserFolder(item.id));
			}

			return item.type === clipboardItemTypes.APP || item.type === clipboardItemTypes.DOCUMENT;
		}

		function canCopy(detail = {}) {
			return getItemsFromDetail(detail).length > 0;
		}

		function canCut(detail = {}) {
			return getItemsFromDetail(detail).some(canCutItem);
		}

		function canPaste(detail = {}) {
			const current = getCurrentClipboard();
			const target = getPasteTarget(detail);

			return Boolean(current.items.length && target && current.items.some((item) => canPasteItem(item, target, current.operation)));
		}

		function isDesktopPasteTarget(target = {}) {
			return target.type === containerTypes.DESKTOP;
		}

		function getMutableFolderPasteTargetId(target = {}) {
			const folderId = target.folderId && target.folderId !== containerTypes.DESKTOP ? target.folderId : target.parentId;

			return folderId && folderId !== containerTypes.DESKTOP ? folderId : '';
		}

		function canPasteToMutableTarget(target = {}) {
			if (isDesktopPasteTarget(target)) {
				return true;
			}

			const folderId = getMutableFolderPasteTargetId(target);

			return Boolean(folderManager && folderId && typeof folderManager.isUserFolder === 'function' && folderManager.isUserFolder(folderId));
		}

		function canPasteItem(item, target, operation) {
			if (!item || !target) {
				return false;
			}

			if (item.type === clipboardItemTypes.APP) {
				if (target.type === containerTypes.DESKTOP) {
					return operation === operations.CUT;
				}

				return Boolean(folderManager && folderManager.isUserFolder && folderManager.isUserFolder(target.folderId));
			}

			if (item.type === clipboardItemTypes.FOLDER) {
				return Boolean(folderManager && canPasteToMutableTarget(target));
			}

			if (item.type === clipboardItemTypes.DOCUMENT) {
				return Boolean(canPasteToMutableTarget(target) && (target.parentPath || (isDesktopPasteTarget(target) && getDefaultStickyPath())));
			}

			return false;
		}

		function copy(detail = {}) {
			const items = getItemsFromDetail(detail);

			if (!items.length) {
				return false;
			}

			set(operations.COPY, items);
			return true;
		}

		function cut(detail = {}) {
			const items = getItemsFromDetail(detail).filter(canCutItem);

			if (!items.length) {
				return false;
			}

			set(operations.CUT, items);
			return true;
		}

		function addAppToTarget(item, target, operation) {
			if (!folderManager || !item.id) {
				return false;
			}

			if (target.type === containerTypes.DESKTOP) {
				if (operation !== operations.CUT) {
					return false;
				}

				if (typeof folderManager.moveAppToDesktop === 'function' && folderManager.moveAppToDesktop(item.id, { point: target.point })) {
					return true;
				}

				return item.parentFolderId && typeof folderManager.removeAppFromFolder === 'function'
					? folderManager.removeAppFromFolder(item.id, item.parentFolderId)
					: false;
			}

			if (!target.folderId || !(folderManager.isUserFolder && folderManager.isUserFolder(target.folderId))) {
				return false;
			}

			if (
				operation === operations.CUT
				&& item.parentFolderId
				&& typeof folderManager.isAppReferenceInFolder === 'function'
				&& folderManager.isAppReferenceInFolder(item.id, item.parentFolderId)
				&& typeof folderManager.moveAppReferenceToFolder === 'function'
			) {
				return folderManager.moveAppReferenceToFolder(item.id, item.parentFolderId, target.folderId);
			}

			if (operation === operations.CUT && typeof folderManager.addAppToFolder === 'function') {
				return folderManager.addAppToFolder(item.id, target.folderId);
			}

			return typeof folderManager.addAppReferenceToFolder === 'function'
				? folderManager.addAppReferenceToFolder(item.id, target.folderId)
				: false;
		}

		function moveFolderToTarget(item, target) {
			if (!folderManager || !item.id || typeof folderManager.moveFolderToParent !== 'function') {
				return false;
			}

			return folderManager.moveFolderToParent(item.id, target.parentId || containerTypes.DESKTOP, {
				point: target.point
			});
		}

		async function duplicateFolderDocuments(sourcePath, targetPath) {
			if (!sourcePath || !targetPath || !documentStore || typeof documentStore.list !== 'function' || typeof documentStore.duplicate !== 'function') {
				return false;
			}

			const documents = await documentStore.list('', {
				includeAllFolders: true,
				parentPath: sourcePath
			});

			await Promise.all(documents.map((documentData) => documentStore.duplicate(documentData.id, {
				parentPath: targetPath
			})));

			return documents.length > 0;
		}

		async function duplicateFolderRecursive(folderId, targetParentId, options = {}) {
			const source = getFolder(folderId);
			const createOptions = {
				parentId: targetParentId || containerTypes.DESKTOP
			};
			const apps = folderManager && typeof folderManager.getFolderApps === 'function'
				? folderManager.getFolderApps(folderId).slice()
				: [];
			const childFolders = folderManager && typeof folderManager.getFolderChildFolders === 'function'
				? folderManager.getFolderChildFolders(folderId).slice()
				: [];

			if (!source || !folderManager || typeof folderManager.createFolder !== 'function') {
				return null;
			}

			if (options.point) {
				createOptions.point = options.point;
			}

			const copy = folderManager.createFolder(getCopyLabel(source.label), [], createOptions);
			if (!copy) {
				return null;
			}

			apps.forEach((app) => {
				if (app && app.id && typeof folderManager.addAppReferenceToFolder === 'function') {
					folderManager.addAppReferenceToFolder(app.id, copy.id);
				}
			});

			await duplicateFolderDocuments(source.path || getFolderPath(folderId), copy.path || getFolderPath(copy.id));

			for (const child of childFolders) {
				await duplicateFolderRecursive(child.id, copy.id);
			}

			emitFolderChange(targetParentId, {
				id: copy.id,
				type: clipboardItemTypes.FOLDER
			});
			if ((targetParentId || '') === containerTypes.DESKTOP) {
				emitDesktopChange({
					id: copy.id,
					type: clipboardItemTypes.FOLDER
				});
			}

			return copy;
		}

		async function pasteFolder(item, target, operation) {
			if (operation === operations.CUT) {
				return moveFolderToTarget(item, target);
			}

			return Boolean(await duplicateFolderRecursive(item.id, target.parentId || containerTypes.DESKTOP, {
				point: target.point
			}));
		}

		async function getDocument(item) {
			if (!documentStore || typeof documentStore.get !== 'function') {
				return null;
			}

			return documentStore.get(item.id).catch(() => null);
		}

		function renderStickyDocument(documentData, target) {
			if (!stickyNoteManager || typeof stickyNoteManager.renderNote !== 'function') {
				return false;
			}

			stickyNoteManager.renderNote(documentData, target && target.point ? target.point : {});
			if (typeof stickyNoteManager.showNote === 'function') {
				stickyNoteManager.showNote(documentData.id);
			}

			return true;
		}

		async function pasteDocument(item, target, operation) {
			const documentData = await getDocument(item);
			const stickyKind = documentStore && documentStore.kinds ? documentStore.kinds.sticky : '';
			const isSticky = Boolean(documentData && documentData.kind === stickyKind);
			const targetPath = target.type === containerTypes.DESKTOP && isSticky
				? getDefaultStickyPath()
				: target.parentPath;
			let pasted = null;

			if (!documentData || !targetPath || !documentStore) {
				return false;
			}

			if (operation === operations.CUT) {
				if (typeof documentStore.update !== 'function') {
					return false;
				}

				pasted = await documentStore.update(item.id, {
					parentPath: targetPath
				});

				if (item.source === stickyNoteSource && target.type !== containerTypes.DESKTOP && stickyNoteManager && typeof stickyNoteManager.removeRenderedNote === 'function') {
					stickyNoteManager.removeRenderedNote(item.id);
				} else if (target.type === containerTypes.DESKTOP && isSticky) {
					renderStickyDocument(pasted, target);
				}

				return true;
			}

			if (target.type === containerTypes.DESKTOP && isSticky && item.source === stickyNoteSource && stickyNoteManager && typeof stickyNoteManager.duplicateStickyNote === 'function') {
				pasted = await stickyNoteManager.duplicateStickyNote(item.id, {
					parentPath: targetPath
				});
				return Boolean(pasted);
			}

			if (typeof documentStore.duplicate !== 'function') {
				return false;
			}

			pasted = await documentStore.duplicate(item.id, {
				parentPath: targetPath
			});

			if (target.type === containerTypes.DESKTOP && isSticky) {
				renderStickyDocument(pasted, target);
			}

			return Boolean(pasted);
		}

		async function pasteItem(item, target, operation) {
			if (item.type === clipboardItemTypes.APP) {
				return addAppToTarget(item, target, operation);
			}

			if (item.type === clipboardItemTypes.FOLDER) {
				return pasteFolder(item, target, operation);
			}

			if (item.type === clipboardItemTypes.DOCUMENT) {
				return pasteDocument(item, target, operation);
			}

			return false;
		}

		async function paste(detail = {}) {
			const current = getCurrentClipboard();
			const target = getPasteTarget(detail);
			let changed = false;

			if (!current.items.length || !target) {
				return false;
			}

			for (const item of current.items) {
				if (!canPasteItem(item, target, current.operation)) {
					continue;
				}

				changed = Boolean(await pasteItem(item, target, current.operation)) || changed;
			}

			if (changed) {
				if (target.folderId) {
					emitFolderChange(target.folderId);
				}
				if (target.type === containerTypes.DESKTOP) {
					emitDesktopChange();
				}
			}

			if (changed && current.operation === operations.CUT) {
				clear();
			}

			return changed;
		}

		return {
			canCopy,
			canCut,
			canPaste,
			clear,
			cleanup,
			copy,
			cut,
			get() {
				return clone(getCurrentClipboard());
			},
			operations,
			paste
		};
	};
})();
