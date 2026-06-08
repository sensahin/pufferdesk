(function () {
	'use strict';

	window.WPAdminOS = window.WPAdminOS || {};
	window.WPAdminOS.shell = window.WPAdminOS.shell || {};

	window.WPAdminOS.shell.createContextMenuRegistry = function createContextMenuRegistry(config = {}, schema = null, context = {}) {
		const appMap = new Map((Array.isArray(config.apps) ? config.apps : []).map((app) => [app.id, app]));
		const folderMap = new Map((Array.isArray(config.folders) ? config.folders : []).map((folder) => [folder.id, folder]));
		const widgetMap = new Map((Array.isArray(config.widgets) ? config.widgets : []).map((widget) => [widget.id, widget]));
		const menuConfig = config.menu && typeof config.menu === 'object' ? config.menu : {};
		const labels = menuConfig.labels && typeof menuConfig.labels === 'object' ? menuConfig.labels : {};
		const desktopIconManager = context.desktopIconManager || null;
		const folderManager = context.folderManager || null;
		const manager = context.manager || null;
		const providers = new Map();
		const menuSchema = schema || window.WPAdminOS.shell.createMenuSchema();

		function commandItem(label, command, options = {}) {
			return Object.assign({
				command,
				label
			}, options);
		}

		function getLabel(key, fallback) {
			return typeof labels[key] === 'string' && labels[key] ? labels[key] : fallback;
		}

		function separator() {
			return { type: 'separator' };
		}

		function getFolders() {
			return folderManager && typeof folderManager.getFolders === 'function'
				? folderManager.getFolders()
				: (Array.isArray(config.folders) ? config.folders : []);
		}

		function getFolder(folderId) {
			const managedFolder = folderManager && typeof folderManager.getFolder === 'function' ? folderManager.getFolder(folderId) : null;

			return managedFolder || folderMap.get(folderId);
		}

		function getUserFolders() {
			return getFolders().filter((folder) => folder && folder.user === true);
		}

		function isUserFolder(folderId) {
			return Boolean(folderManager && typeof folderManager.isUserFolder === 'function' && folderManager.isUserFolder(folderId));
		}

		function getTrashItem(trashId) {
			return folderManager && typeof folderManager.getTrashItem === 'function' ? folderManager.getTrashItem(trashId) : null;
		}

		function isTrashFolder(folder) {
			return Boolean(folder && folder.id === 'trash');
		}

		function getDesktopSortMode() {
			return desktopIconManager && typeof desktopIconManager.getSortMode === 'function'
				? desktopIconManager.getSortMode()
				: 'none';
		}

		function getAppWindowState(appId) {
			if (manager && typeof manager.getAppWindowState === 'function') {
				return manager.getAppWindowState(appId);
			}

			const win = appId ? document.querySelector(`[data-aos-app-window="${window.WPAdminOS.dom.escapeAttribute(appId)}"]:not(.is-closed)`) : null;

			return {
				hidden: Boolean(win && (win.classList.contains('is-hidden') || win.classList.contains('is-minimizing') || win.classList.contains('is-show-desktop-hidden'))),
				open: Boolean(win),
				visible: Boolean(win && !win.classList.contains('is-hidden') && !win.classList.contains('is-minimizing') && !win.classList.contains('is-show-desktop-hidden')),
				windowElement: win
			};
		}

		function isFixedDockApp(app) {
			return Boolean(app && app.dock && typeof app.dock === 'object' && app.dock.fixed === true);
		}

		function sortByItem(label, mode) {
			const active = getDesktopSortMode() === mode;

			return commandItem(label, 'desktop.sort-icons', {
				icon: active ? 'dashicons-yes' : '',
				payload: {
					mode
				}
			});
		}

		function getSortByItems() {
			return [
				sortByItem('None', 'none'),
				separator(),
				sortByItem('Snap to Grid', 'snap-to-grid'),
				separator(),
				sortByItem('Name', 'name'),
				sortByItem('Kind', 'kind'),
				sortByItem('Last Modified By', 'last-modified-by'),
				sortByItem('Date Last Opened', 'date-last-opened'),
				sortByItem('Date Added', 'date-added'),
				sortByItem('Date Modified', 'date-modified'),
				sortByItem('Date Created', 'date-created'),
				sortByItem('Size', 'size')
			];
		}

		function getFolderToolbarDisplayMode(detail = {}) {
			const mode = detail.windowElement && detail.windowElement.dataset
				? detail.windowElement.dataset.aosFolderToolbarDisplay
				: '';

			return ['icon-text', 'icon-only', 'text-only'].includes(mode) ? mode : 'icon-text';
		}

		function folderToolbarDisplayItem(label, mode, detail = {}) {
			const active = getFolderToolbarDisplayMode(detail) === mode;

			return commandItem(label, 'folder.toolbar-display', {
				icon: active ? 'dashicons-yes' : '',
				payload: {
					mode
				}
			});
		}

		function getAppItems(app, detail = {}) {
			if (!app) {
				return [];
			}

			const folderId = detail.folderId || '';
			const addToFolderItems = getUserFolders()
				.filter((folder) => folder.id !== folderId)
				.map((folder) => commandItem(folder.label, 'folder.add-app', {
					icon: folder.icon || 'dashicons-category',
					payload: {
						folderId: folder.id
					},
					target: app.id
				}));
			const items = [
				commandItem('Open', 'open-app', {
					icon: app.icon || 'dashicons-admin-generic',
					target: app.id
				})
			];

			if (app.url) {
				items.push(commandItem('Open in Browser Tab', 'window.open-browser-tab', {
					icon: 'dashicons-external',
					title: app.label || '',
					url: app.url
				}));
			}

			if (folderId && isUserFolder(folderId)) {
				items.push(commandItem('Remove from Folder', 'folder.remove-app', {
					icon: 'dashicons-no-alt',
					payload: {
						folderId
					},
					target: app.id
				}));
			}

			if (addToFolderItems.length) {
				items.push({
					icon: 'dashicons-category',
					id: folderId ? 'move-to-folder' : 'add-to-folder',
					items: addToFolderItems,
					label: folderId ? 'Move to Folder' : 'Add to Folder'
				});
			}

			items.push(
				commandItem('About', 'open-about', {
					icon: 'dashicons-info-outline',
					target: app.id
				})
			);

			return items;
		}

		function getDockOptionsItem(app, state) {
			const optionItems = [
				state.open
					? commandItem(getLabel('keep_in_launcher', 'Keep in Dock'), 'app.keep-in-dock', {
						target: app.id
					})
					: commandItem(getLabel('remove_from_launcher', 'Remove from Dock'), 'app.remove-from-dock', {
						target: app.id
					}),
				commandItem(getLabel('open_at_login', 'Open at Login'), 'app.toggle-login-item', {
					target: app.id
				})
			];

			return {
				id: 'dock-options',
				items: optionItems,
				label: getLabel('launcher_options', 'Options')
			};
		}

		function getDockAppItems(app) {
			if (!app) {
				return [];
			}

			if (app.id === 'trash') {
				return [
					commandItem('Open', 'open-app', {
						target: app.id
					}),
					commandItem(getLabel('empty_trash', 'Empty Trash'), 'trash.empty')
				];
			}

			const state = getAppWindowState(app.id);
			const items = [];

			if (state.open) {
				items.push(
					commandItem(state.hidden ? 'Show' : 'Hide', state.hidden ? 'window.focus' : 'window.hide', {
						target: app.id
					}),
					commandItem('Quit', 'window.close', {
						target: app.id
					})
				);
			} else {
				items.push(commandItem('Open', 'open-app', {
					target: app.id
				}));
			}

			if (app.url) {
				items.push(commandItem('Open in Browser Tab', 'window.open-browser-tab', {
					title: app.label || '',
					url: app.url
				}));
			}

			if (!isFixedDockApp(app)) {
				items.push(getDockOptionsItem(app, state));
			}

			items.push(
				separator(),
				commandItem('About', 'open-about', {
					target: app.id
				})
			);

			return items;
		}

		function getFolderItems(folder) {
			if (!folder) {
				return [];
			}

			if (isTrashFolder(folder)) {
				return [
					commandItem('Open', 'open-folder', {
						icon: folder.icon || 'dashicons-trash',
						target: folder.id
					}),
					commandItem(getLabel('open_in_new_tab', 'Open in New Tab'), 'open-folder-tab', {
						icon: 'dashicons-plus-alt2',
						target: folder.id
					}),
					separator(),
					commandItem(getLabel('empty_trash', 'Empty Trash'), 'trash.empty', {
						icon: 'dashicons-trash'
					})
				];
			}

			const items = [
				commandItem('Open', 'open-folder', {
					icon: folder.icon || 'dashicons-category',
					target: folder.id
				}),
				commandItem(getLabel('open_in_new_tab', 'Open in New Tab'), 'open-folder-tab', {
					icon: 'dashicons-plus-alt2',
					target: folder.id
				}),
				commandItem('Get Info', 'folder.get-info', {
					icon: 'dashicons-info-outline',
					target: folder.id
				})
			];

			if (folder.user === true || isUserFolder(folder.id)) {
				items.push(
					separator(),
					commandItem('Rename', 'folder.rename', {
						icon: 'dashicons-edit',
						target: folder.id
					}),
					commandItem(getLabel('move_to_trash', 'Move to Trash'), 'folder.delete', {
						icon: 'dashicons-trash',
						target: folder.id
					})
				);
			}

			return items;
		}

		function getTrashItemItems(item, fallbackId = '') {
			const trashId = item && item.id ? item.id : fallbackId;

			if (!trashId) {
				return [];
			}

			return [
				commandItem(getLabel('put_back', 'Put Back'), 'trash.restore', {
					icon: 'dashicons-undo',
					target: trashId
				}),
				commandItem(getLabel('delete_immediately', 'Delete Immediately'), 'trash.delete-immediately', {
					icon: 'dashicons-trash',
					target: trashId
				})
			];
		}

		function getWindowBrowserUrl(detail = {}, app = null) {
			const win = detail.windowElement || null;
			if (win && win.dataset && win.dataset.aosWindowUrl) {
				return win.dataset.aosWindowUrl;
			}

			return app && typeof app.url === 'string' ? app.url : '';
		}

		function normalizeMenu(definition, detail = {}) {
			const normalized = menuSchema.normalizeDefinition(definition, {
				appLabel: detail.label || 'Context Menu'
			});
			const groups = normalized.groups
				.map((group) => Object.assign({}, group, {
					items: group.items.filter((item) => item.type === 'separator' || item.command || item.label)
				}))
				.filter((group) => group.items.length);

			return { groups };
		}

		function registerProvider(type, provider) {
			if (!type || typeof provider !== 'function') {
				return;
			}

			providers.set(type, provider);
		}

		function getMenuForTarget(detail = {}) {
			const provider = providers.get(detail.type);
			if (!provider) {
				return { groups: [] };
			}

			return normalizeMenu(provider(detail), detail);
		}

		registerProvider('desktop', () => ({
			groups: [
				{
					id: 'primary',
					items: [
						commandItem('New Folder', 'folder.create', {
							icon: 'dashicons-category'
						}),
						{
							icon: 'dashicons-sort',
							id: 'sort-by',
							items: getSortByItems(),
							label: 'Sort By'
						},
						separator(),
						commandItem('Change Wallpaper...', 'settings.open-panel', {
							icon: 'dashicons-format-image',
							panel: 'wallpaper'
						}),
						commandItem('System Settings', 'open-app', {
							icon: 'dashicons-admin-customizer',
							target: 'os-settings'
						}),
						separator(),
						commandItem('Reset Layout', 'session.reset-layout', {
							icon: 'dashicons-update'
						})
					]
				}
			]
		}));

		registerProvider('app', (detail) => ({
			groups: [
				{
					id: 'primary',
					items: getAppItems(detail.app || appMap.get(detail.id), detail)
				}
			]
		}));
		registerProvider('desktop-app', (detail) => providers.get('app')(detail));
		registerProvider('folder-app', (detail) => providers.get('app')(detail));

		registerProvider('dock-app', (detail) => {
			const app = detail.app || appMap.get(detail.id);
			return {
				groups: [
					{
						id: 'primary',
						items: getDockAppItems(app)
					}
				]
			};
		});

		registerProvider('folder', (detail) => ({
			groups: [
				{
					id: 'primary',
					items: getFolderItems(detail.folder || getFolder(detail.id))
				}
			]
		}));
		registerProvider('desktop-folder', (detail) => providers.get('folder')(detail));
		registerProvider('trash-item', (detail) => ({
			groups: [
				{
					id: 'primary',
					items: getTrashItemItems(detail.trashItem || getTrashItem(detail.id), detail.id)
				}
			]
		}));

		registerProvider('folder-toolbar', (detail) => ({
			groups: [
				{
					id: 'display',
					items: [
						folderToolbarDisplayItem('Icon and Text', 'icon-text', detail),
						folderToolbarDisplayItem('Icon Only', 'icon-only', detail),
						folderToolbarDisplayItem('Text Only', 'text-only', detail)
					]
				}
			]
		}));

		registerProvider('window', (detail) => {
			const app = detail.appId ? appMap.get(detail.appId) : null;
			const browserUrl = getWindowBrowserUrl(detail, app);
			const items = [
				commandItem('Bring to Front', 'window.focus', {
					icon: 'dashicons-editor-expand'
				})
			];

			if (browserUrl) {
				items.push(commandItem('Open in Browser Tab', 'window.open-browser-tab', {
					icon: 'dashicons-external',
					title: detail.label || (app && app.label ? app.label : ''),
					url: browserUrl
				}));
			}

			items.push(
				commandItem(getLabel('window_minimize', 'Minimize'), 'window.minimize', {
					icon: 'dashicons-minus'
				}),
				commandItem(getLabel('window_close', 'Close'), 'window.close', {
					icon: 'dashicons-no-alt'
				})
			);

			if (app) {
				items.push(separator(), commandItem('About', 'open-about', {
					icon: 'dashicons-info-outline',
					target: app.id
				}));
			}

			return {
				groups: [
					{
						id: 'primary',
						items
					}
				]
			};
		});

		registerProvider('widget', (detail) => {
			const widget = detail.widget || widgetMap.get(detail.id);
			return {
				groups: [
					{
						id: 'primary',
						items: [
							commandItem('Hide Widget', 'widget.hide', {
								icon: widget && widget.icon ? widget.icon : 'dashicons-hidden',
								target: detail.id
							})
						]
					}
				]
			};
		});

		return {
			getMenuForTarget,
			registerProvider
		};
	};

	window.WPAdminOS.shell.createContextMenuController = function createContextMenuController(shell, config = {}, context = {}) {
		const menuConfig = config.menu && typeof config.menu === 'object' ? config.menu : {};
		const labels = menuConfig.labels && typeof menuConfig.labels === 'object' ? menuConfig.labels : {};
		const schema = window.WPAdminOS.shell.createMenuSchema(labels);
		const commands = context.commands || window.WPAdminOS.shell.createCommandRegistry(shell, context);
		const registry = context.registry || window.WPAdminOS.shell.createContextMenuRegistry(config, schema, context);
		const itemRenderer = window.WPAdminOS.shell.createMenuItemRenderer(commands);
		const folderManager = context.folderManager || null;
		const dockLongPressDelay = 560;
		const dockLongPressMoveTolerance = 8;
		let popover = null;
		let activeDetail = null;
		let activeContextTarget = null;
		let dockLongPress = null;
		let activeDockPressMenu = null;

		function getTrashItem(trashId) {
			return folderManager && typeof folderManager.getTrashItem === 'function' ? folderManager.getTrashItem(trashId) : null;
		}

		function getTargetLabel(target) {
			return target.dataset.aosContextLabel
				|| target.getAttribute('aria-label')
				|| target.getAttribute('title')
				|| '';
		}

		function getContextWindowElement(target) {
			if (!target || !target.classList || !target.dataset) {
				return null;
			}

			if (target.classList.contains('aos-window')) {
				return target;
			}

			const closest = target.closest('.aos-window');
			if (closest) {
				return closest;
			}

			const windowId = target.dataset.aosRestoreWindowId || target.dataset.aosWindowId || '';
			return windowId
				? shell.querySelector(`.aos-window[data-aos-window-id="${window.WPAdminOS.dom.escapeAttribute(windowId)}"]:not(.is-closed)`)
				: null;
		}

		function getTargetDetail(target) {
			const type = target.dataset.aosContext || 'desktop';
			const id = target.dataset.aosContextId || target.dataset.aosOpenApp || target.dataset.aosOpenFolder || target.dataset.aosWidget || '';
			const windowElement = getContextWindowElement(target);
			const app = id && Array.isArray(config.apps) ? config.apps.find((item) => item.id === id) : null;
			const folder = id && folderManager && typeof folderManager.getFolder === 'function'
				? folderManager.getFolder(id)
				: (id && Array.isArray(config.folders) ? config.folders.find((item) => item.id === id) : null);
			const trashItem = type === 'trash-item' && id ? getTrashItem(id) : null;
			const widget = id && Array.isArray(config.widgets) ? config.widgets.find((item) => item.id === id) : null;
			const detail = {
				app,
				appId: target.dataset.aosAppWindow || (windowElement && windowElement.dataset ? windowElement.dataset.aosAppWindow : '') || (app ? app.id : ''),
				folder,
				folderId: target.dataset.aosFolderId || '',
				id,
				kind: type,
				label: getTargetLabel(target),
				targetElement: target,
				type,
				trashItem,
				trashItemId: target.dataset.aosTrashItemId || '',
				widget,
				widgetElement: target.dataset.aosWidget ? target : null,
				widgetId: target.dataset.aosWidget || '',
				windowElement
			};

			if (!detail.label) {
				detail.label = app && app.label ? app.label : folder && folder.label ? folder.label : trashItem && trashItem.label ? trashItem.label : widget && widget.label ? widget.label : '';
			}

			if (!detail.label && windowElement && windowElement.dataset) {
				detail.label = windowElement.dataset.aosWindowTitle || windowElement.getAttribute('aria-label') || '';
			}

			return detail;
		}

		function resolveTarget(eventTarget) {
			if (!eventTarget || !shell.contains(eventTarget)) {
				return null;
			}

			if (eventTarget.closest('.aos-context-menu')) {
				return null;
			}

			const explicit = eventTarget.closest('[data-aos-context]');
			if (explicit && shell.contains(explicit)) {
				return explicit;
			}

			const desktop = shell.querySelector('.aos-desktop');
			return desktop && desktop.contains(eventTarget) ? desktop : null;
		}

		function closeMenu() {
			clearDockPressMenuHover();
			if (activeContextTarget) {
				activeContextTarget.classList.remove('is-context-menu-active');
				activeContextTarget = null;
			}

			if (popover) {
				popover.remove();
				popover = null;
			}

			activeDetail = null;
			activeDockPressMenu = null;
		}

		function clampPosition(value, min, max) {
			return Math.min(Math.max(min, value), max);
		}

		function positionDockMenu(detail = {}) {
			const target = detail.targetElement;
			if (!popover || !target || typeof target.getBoundingClientRect !== 'function') {
				return false;
			}

			const shellRect = shell.getBoundingClientRect();
			const targetRect = target.getBoundingClientRect();
			const dockPosition = shell.dataset.aosDockPosition || 'bottom';
			const minLeft = 8;
			const minTop = 8;
			const maxLeft = Math.max(minLeft, shell.clientWidth - popover.offsetWidth - 8);
			const maxTop = Math.max(minTop, shell.clientHeight - popover.offsetHeight - 8);
			const targetCenterX = targetRect.left - shellRect.left + (targetRect.width / 2);
			const targetCenterY = targetRect.top - shellRect.top + (targetRect.height / 2);
			const gap = 26;
			const preferredMenuOffset = clampPosition(Math.round(popover.offsetWidth * 0.24), 52, 66);
			let left = targetCenterX - preferredMenuOffset;
			let top = targetRect.top - shellRect.top - popover.offsetHeight - gap;

			if (dockPosition === 'left') {
				left = targetRect.right - shellRect.left + gap;
				top = targetCenterY - (popover.offsetHeight / 2);
			} else if (dockPosition === 'right') {
				left = targetRect.left - shellRect.left - popover.offsetWidth - gap;
				top = targetCenterY - (popover.offsetHeight / 2);
			}

			left = clampPosition(Math.round(left), minLeft, maxLeft);
			top = clampPosition(Math.round(top), minTop, maxTop);
			delete popover.dataset.aosDockContextPlacement;
			popover.style.left = `${left}px`;
			popover.style.top = `${top}px`;

			return true;
		}

		function positionMenu(clientX, clientY, detail = {}) {
			if (!popover) {
				return;
			}

			if (detail.type === 'dock-app' && positionDockMenu(detail)) {
				return;
			}

			const shellRect = shell.getBoundingClientRect();
			const minLeft = 8;
			const minTop = 8;
			const maxLeft = Math.max(minLeft, shell.clientWidth - popover.offsetWidth - 8);
			const maxTop = Math.max(minTop, shell.clientHeight - popover.offsetHeight - 8);
			const left = Math.min(Math.max(minLeft, Math.round(clientX - shellRect.left)), maxLeft);
			const top = Math.min(Math.max(minTop, Math.round(clientY - shellRect.top)), maxTop);

			popover.style.left = `${left}px`;
			popover.style.top = `${top}px`;
		}

		function activateContextTarget(detail = {}) {
			if (!detail.targetElement || !['dock-app', 'trash-item'].includes(detail.type)) {
				return;
			}

			activeContextTarget = detail.targetElement;
			activeContextTarget.classList.add('is-context-menu-active');
			if (detail.type === 'dock-app') {
				activeContextTarget.classList.add('is-tooltip-dismissed');
			}
		}

		function hasMenuItems(menuDefinition) {
			return Boolean(menuDefinition.groups.some((group) => group.items.length));
		}

		function openMenu(detail, point) {
			const nextDetail = Object.assign({}, detail, {
				contextPoint: {
					clientX: point.x,
					clientY: point.y
				}
			});
			const menuDefinition = registry.getMenuForTarget(nextDetail);
			if (!hasMenuItems(menuDefinition)) {
				closeMenu();
				return false;
			}

			closeMenu();
			activeDetail = nextDetail;
			popover = document.createElement('div');
			popover.className = 'aos-menu-popover aos-context-menu';
			popover.dataset.aosContextMenu = activeDetail.type;
			popover.setAttribute('role', 'menu');
			popover.setAttribute('aria-label', activeDetail.label || 'Context menu');
			popover.replaceChildren(...menuDefinition.groups.flatMap((group, groupIndex) => {
				const groupItems = group.items.map((item) => itemRenderer.createItem(item, activeDetail, closeMenu));
				if (groupIndex === 0) {
					return groupItems;
				}

				const separator = document.createElement('span');
				separator.className = 'aos-menu-separator';
				separator.setAttribute('role', 'separator');
				return [separator].concat(groupItems);
			}));

			shell.appendChild(popover);
			activateContextTarget(activeDetail);
			positionMenu(point.x, point.y, activeDetail);

			return true;
		}

		function openForElement(target, point = {}) {
			if (!target || !shell.contains(target)) {
				closeMenu();
				return false;
			}

			const detail = getTargetDetail(target);
			if (!detail || !detail.type) {
				closeMenu();
				return false;
			}

			const rect = typeof target.getBoundingClientRect === 'function' ? target.getBoundingClientRect() : null;
			return openMenu(detail, {
				x: Number.isFinite(point.x) ? point.x : rect ? rect.left + (rect.width / 2) : 0,
				y: Number.isFinite(point.y) ? point.y : rect ? rect.top + (rect.height / 2) : 0
			});
		}

		function openFromEvent(event) {
			const disabled = event.target.closest('[data-aos-context-menu-disabled="1"]');
			if (disabled && shell.contains(disabled)) {
				closeMenu();
				event.preventDefault();
				event.stopPropagation();
				return false;
			}

			const target = resolveTarget(event.target);
			if (!target) {
				closeMenu();
				return false;
			}

			const detail = getTargetDetail(target);
			const opened = openMenu(detail, {
				x: event.clientX,
				y: event.clientY
			});

			if (opened) {
				event.preventDefault();
				event.stopPropagation();
			}

			return opened;
		}

		function getDockLongPressTarget(target) {
			const item = target && typeof target.closest === 'function'
				? target.closest('[data-aos-context="dock-app"]')
				: null;

			return item && shell.contains(item) ? item : null;
		}

		function clearDockLongPress() {
			if (!dockLongPress) {
				return;
			}

			window.clearTimeout(dockLongPress.timer);
			dockLongPress.target.classList.remove('is-dock-pressing');
			dockLongPress = null;
		}

		function markDockLongPressOpened(target) {
			target.dataset.aosDockLongPressOpen = '1';
			window.setTimeout(() => {
				if (target.dataset.aosDockLongPressOpen === '1') {
					delete target.dataset.aosDockLongPressOpen;
				}
			}, 600);
		}

		function clearDockPressMenuHover() {
			if (!popover) {
				return;
			}

			popover.querySelectorAll('.is-press-hover').forEach((item) => {
				item.classList.remove('is-press-hover');
			});
		}

		function getDockPressMenuItemAt(event) {
			if (!event || !popover || !activeDockPressMenu || typeof document.elementFromPoint !== 'function') {
				return null;
			}

			const element = document.elementFromPoint(event.clientX, event.clientY);
			const item = element && typeof element.closest === 'function'
				? element.closest('.aos-context-menu .aos-menu-item:not(:disabled)')
				: null;

			return item && popover.contains(item) ? item : null;
		}

		function updateDockPressMenuHover(event) {
			const item = getDockPressMenuItemAt(event);

			clearDockPressMenuHover();
			if (item) {
				item.classList.add('is-press-hover');
			}
		}

		function closeDockPressMenu(event) {
			if (!activeDockPressMenu) {
				return false;
			}

			if (event && event.pointerId !== activeDockPressMenu.pointerId) {
				return false;
			}

			const item = getDockPressMenuItemAt(event);
			if (event && typeof event.preventDefault === 'function') {
				event.preventDefault();
			}
			if (event && typeof event.stopPropagation === 'function') {
				event.stopPropagation();
			}

			if (item && !item.classList.contains('aos-menu-submenu-trigger')) {
				item.click();
			} else {
				closeMenu();
			}
			return true;
		}

		function bindDockLongPress() {
			shell.addEventListener('pointerdown', (event) => {
				if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
					return;
				}

				const target = getDockLongPressTarget(event.target);
				if (!target) {
					return;
				}

				clearDockLongPress();
				target.classList.add('is-dock-pressing', 'is-tooltip-dismissed');
				dockLongPress = {
					pointerId: event.pointerId,
					startX: event.clientX,
					startY: event.clientY,
					target,
					timer: window.setTimeout(() => {
						const opened = openForElement(target, {
							x: event.clientX,
							y: event.clientY
						});

						target.classList.remove('is-dock-pressing');
						dockLongPress = null;
						if (opened) {
							activeDockPressMenu = {
								pointerId: event.pointerId,
								target
							};
							markDockLongPressOpened(target);
							if (typeof target.blur === 'function') {
								target.blur();
							}
						}
					}, dockLongPressDelay)
				};
			}, true);

			window.addEventListener('pointermove', (event) => {
				if (activeDockPressMenu && event.pointerId === activeDockPressMenu.pointerId) {
					updateDockPressMenuHover(event);
					return;
				}

				if (!dockLongPress || event.pointerId !== dockLongPress.pointerId) {
					return;
				}

				const deltaX = event.clientX - dockLongPress.startX;
				const deltaY = event.clientY - dockLongPress.startY;
				if (Math.abs(deltaX) + Math.abs(deltaY) > dockLongPressMoveTolerance) {
					clearDockLongPress();
				}
			}, { passive: true });

			window.addEventListener('pointerup', (event) => {
				if (closeDockPressMenu(event)) {
					return;
				}

				clearDockLongPress();
			});
			window.addEventListener('pointercancel', (event) => {
				if (closeDockPressMenu(event)) {
					return;
				}

				clearDockLongPress();
			});
			shell.addEventListener('click', (event) => {
				const target = getDockLongPressTarget(event.target) || shell.querySelector('[data-aos-dock-long-press-open="1"]');
				if (!target || target.dataset.aosDockLongPressOpen !== '1') {
					return;
				}

				delete target.dataset.aosDockLongPressOpen;
				event.preventDefault();
				event.stopPropagation();
			}, true);
			shell.addEventListener('dragstart', (event) => {
				if (!getDockLongPressTarget(event.target)) {
					return;
				}

				event.preventDefault();
				event.stopPropagation();
			}, true);
		}

		function bind() {
			shell.addEventListener('contextmenu', openFromEvent);
			shell.addEventListener('pointerdown', (event) => {
				if (event.ctrlKey && event.button === 0) {
					openFromEvent(event);
				}
			});
			bindDockLongPress();
			document.addEventListener('pointerdown', (event) => {
				if (popover && !popover.contains(event.target)) {
					closeMenu();
				}
			});
			document.addEventListener('keydown', (event) => {
				if (event.key === 'Escape') {
					closeMenu();
				}
			});
			window.addEventListener('resize', closeMenu);
			window.addEventListener('scroll', closeMenu, true);
		}

		return {
			bind,
			closeMenu,
			openForElement,
			openMenu,
			registry
		};
	};
})();
