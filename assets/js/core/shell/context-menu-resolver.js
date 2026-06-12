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
		const constants = window.PufferDesk.shell.contextMenuConstants || {};
		const targets = constants.targets || {};
		const areas = constants.areas || {};
		const targetTypes = constants.targetTypes || {};
		const itemTypes = constants.itemTypes || {};
		const contextKeys = constants.keys || {};
		const nonItemDataTargets = constants.nonItemDataTargets || [];
		const dragDropModels = window.PufferDesk.dragDrop && window.PufferDesk.dragDrop.models ? window.PufferDesk.dragDrop.models : null;
		const windowKinds = window.PufferDesk.session && window.PufferDesk.session.workspace
			? window.PufferDesk.session.workspace.windowKinds || {}
			: {};
		const folderWindowKind = windowKinds.FOLDER;

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
				&& target.dataset.pdkContext === targets.WINDOW
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
			if (type === targets.DESKTOP || type === targets.DESKTOP_APP || type === targets.DESKTOP_FOLDER) {
				return areas.DESKTOP;
			}

			if (type === targets.DOCK || type === targets.DOCK_APP) {
				return areas.DOCK;
			}

			if (type === targets.WIDGET || type === targets.STICKY_NOTE) {
				return areas.WIDGET;
			}

			if (type === targets.SOUND_STATUS) {
				return areas.STATUS;
			}

			if (type === targets.WINDOW) {
				return areas.WINDOW;
			}

			if (type === targets.TRASH_ITEM) {
				return areas.TRASH;
			}

			if (type.indexOf('folder') === 0 || type === targets.DOCUMENT) {
				return areas.FOLDER;
			}

			return windowElement && windowElement.dataset && windowElement.dataset.pdkWindowKind === folderWindowKind ? areas.FOLDER : type || areas.DESKTOP;
		}

		function getTargetType(type) {
			if (type === targets.DESKTOP || type === targets.DOCK || type === targets.FOLDER_CONTENT) {
				return targetTypes.BACKGROUND;
			}

			if (type === targets.FOLDER_TOOLBAR) {
				return targetTypes.TOOLBAR;
			}

			if (type === targets.FOLDER_TAB) {
				return targetTypes.TAB;
			}

			if (type === targets.FOLDER_SIDEBAR) {
				return targetTypes.SIDEBAR;
			}

			if (type === targets.WINDOW) {
				return targetTypes.TITLEBAR;
			}

			if (type === targets.SOUND_STATUS) {
				return targetTypes.STATUS;
			}

			return targetTypes.ITEM;
		}

		function getItemType(type, target, app, folder, trashItem, widget) {
			if (type === targets.DESKTOP_APP || type === targets.FOLDER_APP || type === targets.DOCK_APP || app) {
				return itemTypes.APP;
			}

			if (type === targets.DESKTOP_FOLDER || type === targets.FOLDER || folder) {
				return itemTypes.FOLDER;
			}

			if (type === targets.DOCUMENT) {
				return itemTypes.DOCUMENT;
			}

			if (type === targets.TRASH_ITEM || trashItem) {
				return itemTypes.TRASH_ITEM;
			}

			if (type === targets.WIDGET || widget) {
				return itemTypes.WIDGET;
			}

			return '';
		}

		function getContainerId(type, target, area) {
			if (target && target.dataset) {
				if (target.dataset.pdkFolderId) {
					return dragDropModels && typeof dragDropModels.createContainerId === 'function'
						? dragDropModels.createContainerId(areas.FOLDER, target.dataset.pdkFolderId)
						: '';
				}

				if (target.dataset.pdkFolderWindow) {
					return dragDropModels && typeof dragDropModels.createContainerId === 'function'
						? dragDropModels.createContainerId(areas.FOLDER, target.dataset.pdkFolderWindow)
						: '';
				}
			}

			if (type === targets.DESKTOP || type === targets.DESKTOP_APP || type === targets.DESKTOP_FOLDER) {
				return areas.DESKTOP;
			}

			if (type === targets.DOCK || type === targets.DOCK_APP) {
				return areas.DOCK;
			}

			if (area === areas.TRASH) {
				return areas.TRASH;
			}

			return area || '';
		}

		function getContextKey(area, targetType, itemType, type) {
			if (type === targets.DESKTOP) {
				return contextKeys.DESKTOP_BACKGROUND;
			}

			if (type === targets.DESKTOP_APP || type === targets.DESKTOP_FOLDER) {
				return contextKeys.DESKTOP_ITEM;
			}

			if (type === targets.DOCK) {
				return contextKeys.DOCK_BACKGROUND;
			}

			if (type === targets.DOCK_APP) {
				return contextKeys.DOCK_ITEM;
			}

			if (type === targets.FOLDER_CONTENT) {
				return contextKeys.FOLDER_BACKGROUND;
			}

			if (type === targets.FOLDER_TOOLBAR) {
				return contextKeys.FOLDER_TOOLBAR;
			}

			if (type === targets.FOLDER_TAB) {
				return contextKeys.FOLDER_TAB;
			}

			if (type === targets.FOLDER_SIDEBAR) {
				return contextKeys.FOLDER_SIDEBAR;
			}

			if (type === targets.WINDOW) {
				return contextKeys.WINDOW_TITLEBAR;
			}

			if (type === targets.WIDGET || type === targets.STICKY_NOTE) {
				return contextKeys.WIDGET_ITEM;
			}

			if (type === targets.TRASH_ITEM) {
				return contextKeys.TRASH_ITEM;
			}

			if (area && targetType) {
				return `${area}.${targetType}`;
			}

			return itemType ? `${area || 'context'}.${itemType}` : type || contextKeys.DESKTOP_BACKGROUND;
		}

		function getTargetDetail(target) {
			const type = target && target.dataset ? target.dataset.pdkContext || targets.DESKTOP : targets.DESKTOP;
			const id = target && target.dataset ? target.dataset.pdkContextId || target.dataset.pdkOpenApp || target.dataset.pdkOpenFolder || target.dataset.pdkWidget || '' : '';
			const windowElement = getContextWindowElement(target);
			const resolvesItemData = !nonItemDataTargets.includes(type);
			const app = resolvesItemData ? findById(apps, id) : null;
			const folder = resolvesItemData ? getFolder(id) : null;
			const trashItem = type === targets.TRASH_ITEM && id ? getTrashItem(id) : null;
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
