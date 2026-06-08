(function () {
	'use strict';

	window.WPAdminOS = window.WPAdminOS || {};
	window.WPAdminOS.shell = window.WPAdminOS.shell || {};

	window.WPAdminOS.shell.createMenuController = function createMenuController(shell, config = {}, context = {}) {
		const systemButton = shell.querySelector('[data-aos-system-menu]');
		const menu = shell.querySelector('[data-aos-menu-items]');
		const appMap = new Map((Array.isArray(config.apps) ? config.apps : []).map((app) => [app.id, app]));
		const menuConfig = config.menu && typeof config.menu === 'object' ? config.menu : {};
		const labels = menuConfig.labels && typeof menuConfig.labels === 'object' ? menuConfig.labels : {};
		const schema = window.WPAdminOS.shell.createMenuSchema(labels);
		const commands = context.commands || window.WPAdminOS.shell.createCommandRegistry(shell, context);
		const itemRenderer = window.WPAdminOS.shell.createMenuItemRenderer(commands);
		const desktopIconManager = context.desktopIconManager || null;
		const standardGroupIds = ['app', 'file', 'edit', 'view', 'go', 'window', 'help'];
		let activeDetail = { kind: 'desktop' };
		const persistentDefinition = menuConfig.persistent
			? schema.normalizeDefinition(menuConfig.persistent, {
				appLabel: labels.site || config.siteName || 'Site'
			})
			: { groups: [] };
		const systemDefinition = menuConfig.system
			? schema.normalizeDefinition(menuConfig.system, {
				appLabel: labels.system || 'WP adminOS'
			})
			: { groups: [] };
		const systemGroupBase = {
			id: 'system',
			label: systemDefinition.groups[0] && systemDefinition.groups[0].label ? systemDefinition.groups[0].label : 'WP adminOS'
		};
		const persistentGroupIds = new Set(persistentDefinition.groups.map((group) => group.id));
		let activeDefinition = getDesktopDefinition();
		let activeButton = null;
		let popover = null;
		let openGroupId = '';

		function getDesktopDefinition() {
			return completeDefinition(schema.normalizeDefinition(menuConfig.desktop, {
				includeGo: true
			}), { kind: 'desktop' });
		}

		function getDefaultAppDefinition(detail = {}) {
			return completeDefinition(schema.getDefaultDefinition({
				appLabel: detail.title || labels.admin || 'Admin',
				includeGo: true
			}), detail);
		}

		function getInitialActiveDetail() {
			if (
				context.restoreWindows === false ||
				!config.storageKey ||
				!window.WPAdminOS.session ||
				!window.WPAdminOS.session.createSessionStore
			) {
				return { kind: 'desktop' };
			}

			const savedWindows = window.WPAdminOS.session.createSessionStore(config.storageKey).getSection('windows', []);
			if (!Array.isArray(savedWindows) || !savedWindows.length) {
				return { kind: 'desktop' };
			}

			const topSavedWindow = savedWindows
				.filter((item) => {
					const state = item && typeof item === 'object' && item.state && typeof item.state === 'object'
						? item.state
						: {};

					return item
						&& typeof item === 'object'
						&& item.kind === 'app'
						&& typeof item.appId === 'string'
						&& item.appId
						&& !state.hidden
						&& !state.closed;
				})
				.sort((first, second) => {
					const firstState = first.state && typeof first.state === 'object' ? first.state : {};
					const secondState = second.state && typeof second.state === 'object' ? second.state : {};
					const firstZIndex = Number.parseFloat(firstState.zIndex);
					const secondZIndex = Number.parseFloat(secondState.zIndex);

					return (Number.isFinite(secondZIndex) ? secondZIndex : 0) - (Number.isFinite(firstZIndex) ? firstZIndex : 0);
				})[0];

			if (!topSavedWindow || !appMap.has(topSavedWindow.appId)) {
				return { kind: 'desktop' };
			}

			const app = appMap.get(topSavedWindow.appId);

			return {
				appId: app.id,
				kind: 'app',
				menu: app.menu || null,
				title: app.label || labels.admin || 'Admin'
			};
		}

		function commandItem(label, command, options = {}) {
			return Object.assign({
				command,
				label
			}, options);
		}

		function separator() {
			return { type: 'separator' };
		}

		function getLabel(key, fallback) {
			return typeof labels[key] === 'string' && labels[key] ? labels[key] : fallback;
		}

		function getGroupLabel(id, detail = {}) {
			if (id === 'app') {
				return detail.title || getLabel('admin', 'Admin');
			}

			return getLabel(id, id.charAt(0).toUpperCase() + id.slice(1));
		}

		function isWindowDetail(detail = {}) {
			return Boolean(detail.kind && detail.kind !== 'desktop');
		}

		function isFolderDetail(detail = {}) {
			return detail.kind === 'folder' || detail.kind === 'folder-info' || Boolean(detail.folderId);
		}

		function isFolderWindowDetail(detail = {}) {
			return detail.kind === 'folder';
		}

		function getActiveFolderId(detail = {}) {
			return detail.folderId || (detail.kind === 'folder' ? detail.id : '');
		}

		function getDesktopSortMode() {
			return desktopIconManager && typeof desktopIconManager.getSortMode === 'function'
				? desktopIconManager.getSortMode()
				: 'none';
		}

		function getFolderToolbarDisplayMode(detail = {}) {
			return ['icon-text', 'icon-only', 'text-only'].includes(detail.toolbarDisplay)
				? detail.toolbarDisplay
				: 'icon-text';
		}

		function hasBrowserTabTarget(detail = {}) {
			const app = detail.appId ? appMap.get(detail.appId) : null;

			return Boolean(!isFolderDetail(detail) && (detail.url || (app && app.url)));
		}

		function sortByItem(label, mode) {
			return commandItem(label, 'desktop.sort-icons', {
				icon: getDesktopSortMode() === mode ? 'dashicons-yes' : '',
				payload: {
					mode
				}
			});
		}

		function folderToolbarDisplayItem(label, mode, detail = {}) {
			return commandItem(label, 'folder.toolbar-display', {
				icon: getFolderToolbarDisplayMode(detail) === mode ? 'dashicons-yes' : '',
				id: `folder-toolbar-${mode}`,
				payload: {
					mode
				}
			});
		}

		function getFileItems(detail = {}) {
			const folderId = getActiveFolderId(detail);
			const items = [];

			if (!isWindowDetail(detail) || isFolderWindowDetail(detail)) {
				items.push(commandItem('New Folder', 'folder.create', {
					icon: 'dashicons-category',
					shortcut: '⇧⌘N'
				}));
			}

			if (folderId) {
				items.push(commandItem('Get Info', 'folder.get-info', {
					icon: 'dashicons-info-outline',
					shortcut: '⌘I',
					target: folderId
				}));
			}

			if (isWindowDetail(detail)) {
				if (items.length) {
					items.push(separator());
				}

				if (hasBrowserTabTarget(detail)) {
					items.push(commandItem('Open in Browser Tab', 'window.open-browser-tab', {
						icon: 'dashicons-external'
					}));
					items.push(separator());
				}

				items.push(commandItem('Close Window', 'window.close', {
					icon: 'dashicons-dismiss',
					shortcut: '⌘W'
				}));
			}

			if (!items.length) {
				items.push(commandItem('System Settings...', 'open-app', {
					icon: 'dashicons-admin-customizer',
					target: 'os-settings'
				}));
			}

			return items;
		}

		function getEditItems() {
			return [
				{ disabled: true, label: 'Undo', shortcut: '⌘Z' },
				{ disabled: true, label: 'Redo', shortcut: '⇧⌘Z' },
				separator(),
				{ disabled: true, label: 'Cut', shortcut: '⌘X' },
				{ disabled: true, label: 'Copy', shortcut: '⌘C' },
				{ disabled: true, label: 'Paste', shortcut: '⌘V' },
				separator(),
				{ disabled: true, label: 'Select All', shortcut: '⌘A' }
			];
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

		function getViewItems(detail = {}) {
			if (!isWindowDetail(detail)) {
				return [
					{
						icon: 'dashicons-sort',
						id: 'sort-by',
						items: getSortByItems(),
						label: 'Sort By'
					},
					separator(),
					commandItem('Reset Layout', 'session.reset-layout', {
						icon: 'dashicons-update'
					})
				];
			}

			if (isFolderWindowDetail(detail)) {
				return [
					commandItem('Refresh', 'folder.refresh', {
						icon: 'dashicons-update',
						target: getActiveFolderId(detail)
					}),
					separator(),
					folderToolbarDisplayItem('Icon and Text', 'icon-text', detail),
					folderToolbarDisplayItem('Icon Only', 'icon-only', detail),
					folderToolbarDisplayItem('Text Only', 'text-only', detail),
					separator(),
					commandItem('Zoom', 'window.toggle-maximize', {
						icon: 'dashicons-fullscreen-alt'
					})
				];
			}

			return [
				commandItem('Reload Page', 'window.reload', {
					icon: 'dashicons-update',
					shortcut: '⌘R'
				}),
				separator(),
				commandItem('Zoom', 'window.toggle-maximize', {
					icon: 'dashicons-fullscreen-alt'
				})
			];
		}

		function getGoAppItems() {
			const preferredIds = ['dashboard', 'posts', 'pages', 'media', 'comments', 'appearance', 'plugins', 'users', 'settings', 'tools', 'site-health', 'os-settings'];

			return preferredIds
				.map((appId) => appMap.get(appId))
				.filter(Boolean)
				.map((app) => commandItem(app.label || app.id, 'open-app', {
					icon: app.icon || 'dashicons-admin-generic',
					target: app.id
				}));
		}

		function getGoItems(detail = {}) {
			const items = [];
			if (isWindowDetail(detail) && !isFolderDetail(detail)) {
				items.push(
					commandItem('Back', 'window.history-back', {
						icon: 'dashicons-arrow-left-alt2',
						shortcut: '⌘['
					}),
					commandItem('Forward', 'window.history-forward', {
						icon: 'dashicons-arrow-right-alt2',
						shortcut: '⌘]'
					}),
					separator()
				);
			}

			items.push(...getGoAppItems());

			return items;
		}

		function getOpenWindowItems() {
			const windows = Array.from(shell.querySelectorAll('.aos-window:not(.is-closed)'));
			if (!windows.length) {
				return [];
			}

			return windows.map((win) => {
				const title = win.dataset.aosWindowTitle || win.getAttribute('aria-label') || 'Window';
				const id = win.dataset.aosWindowId || '';
				return commandItem(title, 'window.focus-id', {
					icon: win.classList.contains('is-active') ? 'dashicons-yes' : '',
					target: id
				});
			});
		}

		function getWindowItems(detail = {}, existingItems = []) {
			const baseItems = existingItems.length ? existingItems : (
				isWindowDetail(detail)
					? [
						commandItem('Minimize', 'window.minimize', {
							icon: 'dashicons-minus',
							shortcut: '⌘M'
						}),
						commandItem('Zoom', 'window.toggle-maximize', {
							icon: 'dashicons-fullscreen-alt'
						}),
						commandItem('Close', 'window.close', {
							icon: 'dashicons-dismiss',
							shortcut: '⌘W'
						})
					]
					: [
						commandItem('Show All', 'window.show-all', {
							icon: 'dashicons-visibility'
						})
					]
			);
			const openWindowItems = getOpenWindowItems();

			if (!openWindowItems.length) {
				return baseItems;
			}

			return baseItems.concat([separator()], openWindowItems);
		}

		function getHelpItems() {
			return [
				commandItem('About This Site', 'open-site-about', {
					icon: 'dashicons-info-outline'
				}),
				commandItem('WordPress Documentation', 'open-external-url', {
					icon: 'dashicons-editor-help',
					url: 'https://wordpress.org/documentation/'
				}),
				commandItem('Support Forums', 'open-external-url', {
					icon: 'dashicons-sos',
					url: 'https://wordpress.org/support/forums/'
				})
			];
		}

		function getDefaultItemsForGroup(group, detail = {}) {
			switch (group.id) {
				case 'file':
					return getFileItems(detail);
				case 'edit':
					return getEditItems();
				case 'view':
					return getViewItems(detail);
				case 'go':
					return getGoItems(detail);
				case 'window':
					return getWindowItems(detail, group.items);
				case 'help':
					return getHelpItems(detail);
				default:
					return group.items;
			}
		}

		function resolveGroupItems(group, detail = {}) {
			const items = Array.isArray(group.items) ? group.items : [];

			if (items.length) {
				return group.id === 'window' ? getWindowItems(detail, items) : items;
			}

			return getDefaultItemsForGroup(Object.assign({}, group, { items }), detail);
		}

		function completeDefinition(definition, detail = {}) {
			const groups = Array.isArray(definition.groups) ? definition.groups : [];
			const byId = new Map(groups.map((group) => [group.id, group]));
			const ordered = [];

			standardGroupIds.forEach((id) => {
				const group = byId.get(id) || {
					id,
					items: [],
					label: getGroupLabel(id, detail)
				};

				ordered.push(Object.assign({}, group, {
					items: resolveGroupItems(group, detail),
					label: group.label || getGroupLabel(id, detail)
				}));
				byId.delete(id);
			});

			byId.forEach((group) => {
				ordered.push(group);
			});

			return {
				groups: ordered.filter((group) => group.id !== 'app' || group.items.length)
			};
		}

		function getDefinitionForDetail(detail = {}) {
			if (!detail.kind || detail.kind === 'desktop') {
				return getDesktopDefinition();
			}

			if (detail.menu) {
				return completeDefinition(schema.normalizeDefinition(detail.menu, {
					appLabel: detail.title || labels.admin || 'Admin'
				}), detail);
			}

			if (detail.appId && appMap.has(detail.appId)) {
				const app = appMap.get(detail.appId);
				if (app.menu) {
					return completeDefinition(schema.normalizeDefinition(app.menu, {
						appLabel: app.label || detail.title || labels.admin || 'Admin'
					}), detail);
				}
			}

			return getDefaultAppDefinition(detail);
		}

		function getRenderedGroups() {
			return persistentDefinition.groups.concat(activeDefinition.groups.filter((group) => !persistentGroupIds.has(group.id)));
		}

		function getGroupedItems(definition) {
			const items = [];

			definition.groups.forEach((group) => {
				if (!group.items.length) {
					return;
				}

				if (items.length) {
					items.push({ type: 'separator' });
				}

				items.push(...group.items);
			});

			return items;
		}

		function hasMenuItems(group) {
			return Boolean(group && Array.isArray(group.items) && group.items.length);
		}

		function getRecentCount() {
			const configCount = config.menuBar && Number.parseInt(config.menuBar.recent_count, 10);
			const datasetCount = Number.parseInt(shell.dataset.aosMenuBarRecentCount, 10);

			if (Number.isFinite(configCount)) {
				return Math.max(0, Math.min(50, configCount));
			}

			return Number.isFinite(datasetCount) ? Math.max(0, Math.min(50, datasetCount)) : 10;
		}

		function getSystemGroup() {
			const items = getGroupedItems(systemDefinition).map((item) => {
				if (!item || item.id !== 'recent-items') {
					return item;
				}

				const count = getRecentCount();
				const recentItems = window.WPAdminOS.menuBar
					? window.WPAdminOS.menuBar.getRecentMenuItems(config, count)
					: [];
				const submenuItems = recentItems.length
					? recentItems.concat([
						{ type: 'separator' },
						{
							command: 'recent-items.clear',
							id: 'clear-recent-items',
							label: 'Clear Menu'
						}
					])
					: [];

				return Object.assign({}, item, {
					disabled: !count || !recentItems.length,
					items: count ? submenuItems : [],
					shortcut: count && recentItems.length ? '›' : ''
				});
			});

			return Object.assign({}, systemGroupBase, { items });
		}

		function resolveGroup(groupSource) {
			return typeof groupSource === 'function' ? groupSource() : groupSource;
		}

		function resolveMenuItem(item) {
			if (item.id !== 'close-active-window') {
				return item;
			}

			const title = activeDetail && activeDetail.title ? activeDetail.title : '';
			if (!title) {
				return item;
			}

			return Object.assign({}, item, {
				label: `Close ${title}`
			});
		}

		function closePopover() {
			if (popover) {
				popover.remove();
				popover = null;
			}

			if (activeButton) {
				activeButton.classList.remove('is-active');
				activeButton.setAttribute('aria-expanded', 'false');
				activeButton = null;
			}

			openGroupId = '';
		}

		function positionPopover(button) {
			if (!popover) {
				return;
			}

			const shellRect = shell.getBoundingClientRect();
			const buttonRect = button.getBoundingClientRect();
			const top = Math.round(buttonRect.bottom - shellRect.top + 2);
			const minLeft = 8;
			const maxLeft = Math.max(minLeft, shell.clientWidth - popover.offsetWidth - 8);
			const left = Math.min(Math.max(minLeft, Math.round(buttonRect.left - shellRect.left)), maxLeft);

			popover.style.left = `${left}px`;
			popover.style.top = `${top}px`;
		}

		function createMenuItem(item) {
			return itemRenderer.createItem(resolveMenuItem(item), activeDetail, closePopover);
		}

		function openPopover(group, button, options = {}) {
			if (!hasMenuItems(group)) {
				return;
			}

			closePopover();

			activeButton = button;
			openGroupId = group.id;
			activeButton.classList.add('is-active');
			activeButton.setAttribute('aria-expanded', 'true');

			popover = document.createElement('div');
			popover.className = 'aos-menu-popover';
			popover.dataset.aosMenuPopover = group.id;
			popover.setAttribute('role', 'menu');
			popover.setAttribute('aria-label', group.label);
			popover.replaceChildren(...group.items.map(createMenuItem));

			shell.appendChild(popover);
			positionPopover(button);

			if (options.focus) {
				const firstEnabled = popover.querySelector('.aos-menu-item:not(:disabled)');
				if (firstEnabled) {
					firstEnabled.focus();
				}
			}
		}

		function togglePopover(group, button) {
			if (openGroupId === group.id) {
				closePopover();
				return;
			}

			openPopover(group, button);
		}

		function bindGroupButton(button, groupSource) {
			const initialGroup = resolveGroup(groupSource);
			if (!initialGroup) {
				return;
			}

			button.dataset.aosMenuGroup = initialGroup.id;

			if (hasMenuItems(initialGroup)) {
				button.setAttribute('aria-haspopup', 'menu');
				button.setAttribute('aria-expanded', 'false');
				button.addEventListener('click', () => {
					const group = resolveGroup(groupSource);
					if (group) {
						togglePopover(group, button);
					}
				});
				button.addEventListener('pointerenter', () => {
					if (popover) {
						const group = resolveGroup(groupSource);
						if (group) {
							openPopover(group, button);
						}
					}
				});
				button.addEventListener('keydown', (event) => {
					const group = resolveGroup(groupSource);
					if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						if (group) {
							openPopover(group, button, { focus: true });
						}
					} else if (event.key === 'Escape') {
						closePopover();
						button.focus();
					}
				});
				return;
			}

			const group = initialGroup;
			button.dataset.aosMenuGroup = group.id;

			if (!group.command) {
				return;
			}

			button.dataset.aosCommand = group.command;
			if (group.target) {
				button.dataset.aosCommandTarget = group.target;
			}
			button.disabled = !commands.canExecute(group, activeDetail);
			button.addEventListener('click', () => {
				commands.execute(group, activeDetail);
				closePopover();
			});
		}

		function render(detail = {}) {
			if (!menu) {
				return;
			}

			activeDetail = detail && typeof detail === 'object' ? detail : { kind: 'desktop' };
			commands.setActiveDetail(activeDetail);
			activeDefinition = getDefinitionForDetail(activeDetail);
			closePopover();

			menu.replaceChildren(...getRenderedGroups().map((group) => {
				const button = document.createElement('button');
				button.type = 'button';
				button.textContent = group.label;
				bindGroupButton(button, group);
				return button;
			}));
		}

		function bindSystemButton() {
			if (!systemButton || systemButton.dataset.aosSystemMenuBound === '1' || !hasMenuItems(getSystemGroup())) {
				return;
			}

			systemButton.dataset.aosSystemMenuBound = '1';
			bindGroupButton(systemButton, getSystemGroup);
		}

		function bind() {
			if (!menu) {
				return;
			}

			bindSystemButton();
			render(getInitialActiveDetail());
			shell.addEventListener('wpAdminOS:active-window-change', (event) => {
				render(event.detail || { kind: 'desktop' });
			});
			document.addEventListener('pointerdown', (event) => {
				if (
					popover
					&& !popover.contains(event.target)
					&& !menu.contains(event.target)
					&& (!systemButton || !systemButton.contains(event.target))
				) {
					closePopover();
				}
			});
			document.addEventListener('keydown', (event) => {
				if (event.key === 'Escape') {
					closePopover();
				}
			});
			window.addEventListener('wpAdminOS:recent-items-change', () => {
				if (openGroupId === 'system') {
					openPopover(getSystemGroup(), activeButton || systemButton);
				}
			});
			shell.addEventListener('wpAdminOS:menu-bar-change', () => {
				config.menuBar = Object.assign({}, config.menuBar || {}, {
					auto_hide: shell.dataset.aosMenuBarAutoHide || 'fullscreen',
					recent_count: Number.parseInt(shell.dataset.aosMenuBarRecentCount, 10) || 0,
					show_background: shell.dataset.aosMenuBarBackground === '1'
				});
				if (openGroupId === 'system') {
					openPopover(getSystemGroup(), activeButton || systemButton);
				}
			});
			window.addEventListener('resize', closePopover);
		}

		function getMenuDefinition() {
			return {
				system: getSystemGroup(),
				groups: getRenderedGroups()
			};
		}

		return {
			bind,
			closePopover,
			commands,
			getMenuDefinition,
			render
		};
	};
})();
