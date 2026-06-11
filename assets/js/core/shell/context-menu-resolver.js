(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.shell = window.PufferDesk.shell || {};

	window.PufferDesk.shell.createContextResolver = function createContextResolver(shell, config = {}, context = {}) {
		const folderManager = context.folderManager || null;
		const apps = Array.isArray(config.apps) ? config.apps : [];
		const folders = Array.isArray(config.folders) ? config.folders : [];
		const widgets = Array.isArray(config.widgets) ? config.widgets : [];
		const theme = config.theme && typeof config.theme === 'object' ? config.theme : {};
		const themeId = typeof theme.id === 'string' ? theme.id : '';
		const themeFamily = typeof theme.family === 'string' ? theme.family : '';

		function toElement(target) {
			if (!target) {
				return null;
			}

			return target.nodeType === 1 ? target : target.parentElement || null;
		}

		function findById(items, id) {
			return id ? items.find((item) => item && item.id === id) || null : null;
		}

		function getTrashItem(trashId) {
			return folderManager && typeof folderManager.getTrashItem === 'function' ? folderManager.getTrashItem(trashId) : null;
		}

		function getFolder(folderId) {
			const managedFolder = folderManager && typeof folderManager.getFolder === 'function' ? folderManager.getFolder(folderId) : null;

			return managedFolder || findById(folders, folderId);
		}

		function getTargetLabel(target) {
			return target && target.dataset
				? target.dataset.pdkContextLabel || target.getAttribute('aria-label') || target.getAttribute('title') || ''
				: '';
		}

		function getContextWindowElement(target) {
			if (!target || !target.classList || !target.dataset) {
				return null;
			}

			if (target.classList.contains('pdk-window')) {
				return target;
			}

			const closest = target.closest('.pdk-window');
			if (closest) {
				return closest;
			}

			const windowId = target.dataset.pdkRestoreWindowId || target.dataset.pdkWindowId || '';
			return windowId && window.PufferDesk.dom && typeof window.PufferDesk.dom.escapeAttribute === 'function'
				? shell.querySelector(`.pdk-window[data-pdk-window-id="${window.PufferDesk.dom.escapeAttribute(windowId)}"]:not(.is-closed)`)
				: null;
		}

		function isWindowRootContextTarget(target) {
			return Boolean(
				target
				&& target.classList
				&& target.classList.contains('pdk-window')
				&& target.dataset
				&& target.dataset.pdkContext === 'window'
			);
		}

		function isWindowTitlebarEvent(eventTarget, win) {
			const element = toElement(eventTarget);
			const titlebar = element && typeof element.closest === 'function'
				? element.closest('.pdk-window-titlebar')
				: null;

			return Boolean(titlebar && win && titlebar.closest('.pdk-window') === win);
		}

		function isContextMenuDisabled(eventTarget) {
			const element = toElement(eventTarget);
			const disabled = element && typeof element.closest === 'function'
				? element.closest('[data-pdk-context-menu-disabled="1"]')
				: null;

			return Boolean(disabled && shell.contains(disabled));
		}

		function shouldSuppressNativeContextMenu(eventTarget) {
			const element = toElement(eventTarget);
			const explicit = element && typeof element.closest === 'function'
				? element.closest('[data-pdk-context]')
				: null;

			return Boolean(
				explicit
				&& shell.contains(explicit)
				&& isWindowRootContextTarget(explicit)
				&& !isWindowTitlebarEvent(element, explicit)
			);
		}

		function resolveTarget(eventTarget) {
			const element = toElement(eventTarget);
			if (!element || !shell.contains(element)) {
				return null;
			}

			if (element.closest('.pdk-context-menu')) {
				return null;
			}

			const explicit = element.closest('[data-pdk-context]');
			if (explicit && shell.contains(explicit)) {
				if (isWindowRootContextTarget(explicit) && !isWindowTitlebarEvent(element, explicit)) {
					return null;
				}

				return explicit;
			}

			const desktop = shell.querySelector('.pdk-desktop');
			return desktop && desktop.contains(element) ? desktop : null;
		}

		function getArea(type, target, windowElement) {
			if (type === 'desktop' || type === 'desktop-app' || type === 'desktop-folder') {
				return 'desktop';
			}

			if (type === 'dock' || type === 'dock-app') {
				return 'dock';
			}

			if (type === 'widget' || type === 'sticky-note') {
				return 'widget';
			}

			if (type === 'sound-status') {
				return 'status';
			}

			if (type === 'window') {
				return 'window';
			}

			if (type === 'trash-item') {
				return 'trash';
			}

			if (type.indexOf('folder') === 0 || type === 'document') {
				return 'folder';
			}

			return windowElement && windowElement.dataset && windowElement.dataset.pdkWindowKind === 'folder' ? 'folder' : type || 'desktop';
		}

		function getTargetType(type) {
			if (type === 'desktop' || type === 'dock' || type === 'folder-content') {
				return 'background';
			}

			if (type === 'folder-toolbar') {
				return 'toolbar';
			}

			if (type === 'folder-tab') {
				return 'tab';
			}

			if (type === 'folder-sidebar-item') {
				return 'sidebar';
			}

			if (type === 'window') {
				return 'titlebar';
			}

			if (type === 'sound-status') {
				return 'status';
			}

			return 'item';
		}

		function getItemType(type, target, app, folder, trashItem, widget) {
			if (type === 'desktop-app' || type === 'folder-app' || type === 'dock-app' || app) {
				return 'app';
			}

			if (type === 'desktop-folder' || type === 'folder' || folder) {
				return 'folder';
			}

			if (type === 'document') {
				return 'document';
			}

			if (type === 'trash-item' || trashItem) {
				return 'trash-item';
			}

			if (type === 'widget' || widget) {
				return 'widget';
			}

			return '';
		}

		function getContainerId(type, target, area) {
			if (target && target.dataset) {
				if (target.dataset.pdkFolderId) {
					return `folder:${target.dataset.pdkFolderId}`;
				}

				if (target.dataset.pdkFolderWindow) {
					return `folder:${target.dataset.pdkFolderWindow}`;
				}
			}

			if (type === 'desktop' || type === 'desktop-app' || type === 'desktop-folder') {
				return 'desktop';
			}

			if (type === 'dock' || type === 'dock-app') {
				return 'dock';
			}

			if (area === 'trash') {
				return 'trash';
			}

			return area || '';
		}

		function getContextKey(area, targetType, itemType, type) {
			if (type === 'desktop') {
				return 'desktop.background';
			}

			if (type === 'desktop-app' || type === 'desktop-folder') {
				return 'desktop.item';
			}

			if (type === 'dock') {
				return 'dock.background';
			}

			if (type === 'dock-app') {
				return 'dock.item';
			}

			if (type === 'folder-content') {
				return 'folder.background';
			}

			if (type === 'folder-toolbar') {
				return 'folder.toolbar';
			}

			if (type === 'folder-tab') {
				return 'folder.tab';
			}

			if (type === 'folder-sidebar-item') {
				return 'folder.sidebar';
			}

			if (type === 'window') {
				return 'window.titlebar';
			}

			if (type === 'widget' || type === 'sticky-note') {
				return 'widget.item';
			}

			if (type === 'trash-item') {
				return 'trash.item';
			}

			if (area && targetType) {
				return `${area}.${targetType}`;
			}

			return itemType ? `${area || 'context'}.${itemType}` : type || 'desktop.background';
		}

		function getTargetDetail(target) {
			const type = target && target.dataset ? target.dataset.pdkContext || 'desktop' : 'desktop';
			const id = target && target.dataset ? target.dataset.pdkContextId || target.dataset.pdkOpenApp || target.dataset.pdkOpenFolder || target.dataset.pdkWidget || '' : '';
			const windowElement = getContextWindowElement(target);
			const resolvesItemData = !['desktop', 'dock', 'folder-content', 'folder-toolbar', 'folder-tab', 'window'].includes(type);
			const app = resolvesItemData ? findById(apps, id) : null;
			const folder = resolvesItemData ? getFolder(id) : null;
			const trashItem = type === 'trash-item' && id ? getTrashItem(id) : null;
			const widget = resolvesItemData ? findById(widgets, id) : null;
			const area = getArea(type, target, windowElement);
			const targetType = getTargetType(type);
			const itemType = getItemType(type, target, app, folder, trashItem, widget);
			const containerId = getContainerId(type, target, area);
			let label = getTargetLabel(target);

			if (!label) {
				label = app && app.label ? app.label : folder && folder.label ? folder.label : trashItem && trashItem.label ? trashItem.label : widget && widget.label ? widget.label : '';
			}

			if (!label && windowElement && windowElement.dataset) {
				label = windowElement.dataset.pdkWindowTitle || windowElement.getAttribute('aria-label') || '';
			}

			return {
				app,
				appId: target.dataset.pdkAppWindow || (windowElement && windowElement.dataset ? windowElement.dataset.pdkAppWindow : '') || (app ? app.id : ''),
				area,
				containerId,
				contextKey: getContextKey(area, targetType, itemType, type),
				folder,
				folderId: target.dataset.pdkFolderId || '',
				id,
				itemType,
				kind: type,
				label,
				metadata: {
					dataset: Object.assign({}, target.dataset || {}),
					themeFamily,
					themeId,
					windowKind: windowElement && windowElement.dataset ? windowElement.dataset.pdkWindowKind || '' : ''
				},
				targetElement: target,
				targetId: id,
				targetType,
				theme: themeId || themeFamily,
				type,
				trashItem,
				trashItemId: target.dataset.pdkTrashItemId || '',
				widget,
				widgetElement: target.dataset.pdkWidget ? target : null,
				widgetId: target.dataset.pdkWidget || '',
				windowElement
			};
		}

		function resolve(eventTarget) {
			const target = resolveTarget(eventTarget);

			return target ? getTargetDetail(target) : null;
		}

		return {
			getTargetDetail,
			isContextMenuDisabled,
			isWindowTitlebarEvent,
			resolve,
			resolveTarget,
			shouldSuppressNativeContextMenu
		};
	};
})();
