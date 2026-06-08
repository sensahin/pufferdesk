(function () {
	'use strict';

	window.WPAdminOS = window.WPAdminOS || {};
	window.WPAdminOS.shell = window.WPAdminOS.shell || {};

	window.WPAdminOS.shell.createContextMenuRegistry = function createContextMenuRegistry(config = {}, schema = null, context = {}) {
		const appMap = new Map((Array.isArray(config.apps) ? config.apps : []).map((app) => [app.id, app]));
		const folderMap = new Map((Array.isArray(config.folders) ? config.folders : []).map((folder) => [folder.id, folder]));
		const widgetMap = new Map((Array.isArray(config.widgets) ? config.widgets : []).map((widget) => [widget.id, widget]));
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
					? commandItem('Keep in Dock', 'app.keep-in-dock', {
						target: app.id
					})
					: commandItem('Remove from Dock', 'app.remove-from-dock', {
						target: app.id
					}),
				commandItem('Open at Login', 'app.toggle-login-item', {
					target: app.id
				})
			];

			return {
				id: 'dock-options',
				items: optionItems,
				label: 'Options'
			};
		}

		function getDockAppItems(app) {
			if (!app) {
				return [];
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

			items.push(getDockOptionsItem(app, state));

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

			const items = [
				commandItem('Open', 'open-folder', {
					icon: folder.icon || 'dashicons-category',
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
					commandItem('Delete', 'folder.delete', {
						icon: 'dashicons-trash',
						target: folder.id
					})
				);
			}

			return items;
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
				commandItem('Minimize', 'window.minimize', {
					icon: 'dashicons-minus'
				}),
				commandItem('Close', 'window.close', {
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
		let popover = null;
		let activeDetail = null;
		let activeContextTarget = null;

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
				widget,
				widgetElement: target.dataset.aosWidget ? target : null,
				widgetId: target.dataset.aosWidget || '',
				windowElement
			};

			if (!detail.label) {
				detail.label = app && app.label ? app.label : folder && folder.label ? folder.label : widget && widget.label ? widget.label : '';
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
			if (activeContextTarget) {
				activeContextTarget.classList.remove('is-context-menu-active');
				activeContextTarget = null;
			}

			if (popover) {
				popover.remove();
				popover = null;
			}

			activeDetail = null;
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
			if (!detail.targetElement || detail.type !== 'dock-app') {
				return;
			}

			activeContextTarget = detail.targetElement;
			activeContextTarget.classList.add('is-context-menu-active', 'is-tooltip-dismissed');
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

		function bind() {
			shell.addEventListener('contextmenu', openFromEvent);
			shell.addEventListener('pointerdown', (event) => {
				if (event.ctrlKey && event.button === 0) {
					openFromEvent(event);
				}
			});
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
			openMenu,
			registry
		};
	};
})();
