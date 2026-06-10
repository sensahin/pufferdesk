(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.shell = window.PufferDesk.shell || {};

	window.PufferDesk.shell.createMenuController = function createMenuController(shell, config = {}, context = {}) {
		const systemButton = shell.querySelector('[data-pdk-system-menu]');
		const menu = shell.querySelector('[data-pdk-menu-items]');
		const dom = window.PufferDesk.dom;
		const geometry = window.PufferDesk.geometry;
		const appMap = new Map((Array.isArray(config.apps) ? config.apps : []).map((app) => [app.id, app]));
		const menuConfig = config.menu && typeof config.menu === 'object' ? config.menu : {};
		const labels = menuConfig.labels && typeof menuConfig.labels === 'object' ? menuConfig.labels : {};
		const schema = window.PufferDesk.shell.createMenuSchema(labels);
		const commands = context.commands || window.PufferDesk.shell.createCommandRegistry(shell, context);
		const itemRenderer = window.PufferDesk.shell.createMenuItemRenderer(commands);
		const transientSurfaces = window.PufferDesk.shell.transientSurfaces || null;
		const desktopIconManager = context.desktopIconManager || null;
		const launcher = context.launcher || null;
		const standardGroupIds = ['app', 'file', 'edit', 'view', 'go', 'window', 'help'];
		let activeDetail = { kind: 'desktop' };
		const persistentDefinition = menuConfig.persistent
			? schema.normalizeDefinition(menuConfig.persistent, {
				appLabel: labels.site || config.siteName || 'Site'
			})
			: { groups: [] };
		const systemDefinition = menuConfig.system
			? schema.normalizeDefinition(menuConfig.system, {
				appLabel: labels.system || 'PufferDesk'
			})
			: { groups: [] };
		const systemGroupBase = {
			id: 'system',
			label: systemDefinition.groups[0] && systemDefinition.groups[0].label ? systemDefinition.groups[0].label : 'PufferDesk'
		};
		const persistentGroupIds = new Set(persistentDefinition.groups.map((group) => group.id));
		let activeDefinition = getDesktopDefinition();
		let activeButton = null;
		let popover = null;
		let startFooterFlyout = null;
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
				!window.PufferDesk.session ||
				!window.PufferDesk.session.createSessionStore
			) {
				return { kind: 'desktop' };
			}

			const savedWindows = window.PufferDesk.session.createSessionStore(config.storageKey).getSection('windows', []);
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
				items.push(commandItem(getLabel('new_folder', 'New Folder'), 'folder.create', {
					icon: 'dashicons-category',
					shortcut: '⇧⌘N'
				}));
			}

			if (folderId) {
				items.push(commandItem(getLabel('get_info', 'Get Info'), 'folder.get-info', {
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
					items.push(commandItem(getLabel('open_in_browser_tab', 'Open in Browser Tab'), 'window.open-browser-tab', {
						icon: 'dashicons-external'
					}));
					items.push(separator());
				}

				items.push(commandItem(getLabel('close_window', 'Close Window'), 'window.close', {
					icon: 'dashicons-dismiss',
					shortcut: '⌘W'
				}));
			}

			if (!items.length) {
				items.push(commandItem(getLabel('system_settings', 'System Settings...'), 'open-app', {
					icon: 'dashicons-admin-customizer',
					target: 'os-settings'
				}));
			}

			return items;
		}

		function getEditItems() {
			return [
				{ disabled: true, label: getLabel('undo', 'Undo'), shortcut: '⌘Z' },
				{ disabled: true, label: getLabel('redo', 'Redo'), shortcut: '⇧⌘Z' },
				separator(),
				{ disabled: true, label: getLabel('cut', 'Cut'), shortcut: '⌘X' },
				{ disabled: true, label: getLabel('copy', 'Copy'), shortcut: '⌘C' },
				{ disabled: true, label: getLabel('paste', 'Paste'), shortcut: '⌘V' },
				separator(),
				{ disabled: true, label: getLabel('select_all', 'Select All'), shortcut: '⌘A' }
			];
		}

		function getSortByItems() {
			return [
				sortByItem(getLabel('sort_none', 'None'), 'none'),
				separator(),
				sortByItem(getLabel('sort_snap_to_grid', 'Snap to Grid'), 'snap-to-grid'),
				separator(),
				sortByItem(getLabel('sort_name', 'Name'), 'name'),
				sortByItem(getLabel('sort_kind', 'Kind'), 'kind'),
				sortByItem(getLabel('sort_last_modified_by', 'Last Modified By'), 'last-modified-by'),
				sortByItem(getLabel('sort_date_last_opened', 'Date Last Opened'), 'date-last-opened'),
				sortByItem(getLabel('sort_date_added', 'Date Added'), 'date-added'),
				sortByItem(getLabel('sort_date_modified', 'Date Modified'), 'date-modified'),
				sortByItem(getLabel('sort_date_created', 'Date Created'), 'date-created'),
				sortByItem(getLabel('sort_size', 'Size'), 'size')
			];
		}

		function getViewItems(detail = {}) {
			if (!isWindowDetail(detail)) {
				return [
					{
						icon: 'dashicons-sort',
						id: 'sort-by',
						items: getSortByItems(),
						label: getLabel('sort_by', 'Sort By')
					},
					separator(),
					commandItem(getLabel('reset_layout', 'Reset Layout'), 'session.reset-layout', {
						icon: 'dashicons-update'
					})
				];
			}

			if (isFolderWindowDetail(detail)) {
				return [
					commandItem(getLabel('refresh', 'Refresh'), 'folder.refresh', {
						icon: 'dashicons-update',
						target: getActiveFolderId(detail)
					}),
					separator(),
					folderToolbarDisplayItem(getLabel('icons_and_text', 'Icons and Text'), 'icon-text', detail),
					folderToolbarDisplayItem(getLabel('icons_only', 'Icons Only'), 'icon-only', detail),
					folderToolbarDisplayItem(getLabel('text_only', 'Text Only'), 'text-only', detail),
					separator(),
					commandItem(getLabel('zoom', 'Zoom'), 'window.toggle-maximize', {
						icon: 'dashicons-fullscreen-alt'
					})
				];
			}

			return [
				commandItem(getLabel('reload_page', 'Reload Page'), 'window.reload', {
					icon: 'dashicons-update',
					shortcut: '⌘R'
				}),
				separator(),
				commandItem(getLabel('zoom', 'Zoom'), 'window.toggle-maximize', {
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
					commandItem(getLabel('back', 'Back'), 'window.history-back', {
						icon: 'dashicons-arrow-left-alt2',
						shortcut: '⌘['
					}),
					commandItem(getLabel('forward', 'Forward'), 'window.history-forward', {
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
			const windows = Array.from(shell.querySelectorAll('.pdk-window:not(.is-closed)'));
			if (!windows.length) {
				return [];
			}

			return windows.map((win) => {
				const title = win.dataset.pdkWindowTitle || win.getAttribute('aria-label') || 'Window';
				const id = win.dataset.pdkWindowId || '';
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
						commandItem(getLabel('window_minimize', 'Minimize'), 'window.minimize', {
							icon: 'dashicons-minus',
							shortcut: '⌘M'
						}),
						commandItem(getLabel('zoom', 'Zoom'), 'window.toggle-maximize', {
							icon: 'dashicons-fullscreen-alt'
						}),
						commandItem(getLabel('window_close', 'Close'), 'window.close', {
							icon: 'dashicons-dismiss',
							shortcut: '⌘W'
						})
					]
					: [
						commandItem(getLabel('show_all_windows', 'Show All'), 'window.show-all', {
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
				commandItem(getLabel('about_this_site', 'About This Site'), 'open-site-about', {
					icon: 'dashicons-info-outline'
				}),
				commandItem(getLabel('wordpress_documentation', 'WordPress Documentation'), 'open-external-url', {
					icon: 'dashicons-editor-help',
					url: 'https://wordpress.org/documentation/'
				}),
				commandItem(getLabel('support_forums', 'Support Forums'), 'open-external-url', {
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
			const datasetCount = Number.parseInt(shell.dataset.pdkMenuBarRecentCount, 10);

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
				const recentItems = window.PufferDesk.menuBar
					? window.PufferDesk.menuBar.getRecentMenuItems(config, count)
					: [];
				const submenuItems = recentItems.length
					? recentItems.concat([
						{ type: 'separator' },
						{
							command: 'recent-items.clear',
							id: 'clear-recent-items',
							label: getLabel('clear_menu', 'Clear Menu')
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

		function isStartPanelGroup(group = {}) {
			return group.id === 'system'
				&& shell.dataset.pdkShellLauncher === 'taskbar'
				&& shell.dataset.pdkShellSystemMenu === 'start'
				&& shell.dataset.pdkThemeFamily === 'redmond';
		}

		function isVisibleStartApp(app) {
			const appLocations = config.appLocations && typeof config.appLocations === 'object' ? config.appLocations : {};

			return Boolean(app && app.id && app.label && appLocations[app.id] !== 'hidden');
		}

		function getPinnedStartApps() {
			const preferredIds = ['dashboard', 'posts', 'pages', 'media', 'comments', 'appearance', 'plugins', 'users', 'settings', 'tools', 'site-health', 'os-settings'];
			const byId = new Map();
			const apps = Array.isArray(config.apps) ? config.apps.filter(isVisibleStartApp) : [];

			preferredIds.forEach((appId) => {
				const app = appMap.get(appId);
				if (isVisibleStartApp(app)) {
					byId.set(app.id, app);
				}
			});

			apps.forEach((app) => {
				if (!byId.has(app.id)) {
					byId.set(app.id, app);
				}
			});

			return Array.from(byId.values()).slice(0, 12);
		}

		function createStartSectionHeading(label) {
			const heading = document.createElement('div');
			heading.className = 'pdk-start-section-heading';
			heading.textContent = label;

			return heading;
		}

		function createStartSearch() {
			const wrapper = document.createElement('label');
			const icon = document.createElement('span');
			const input = document.createElement('input');

			wrapper.className = 'pdk-start-search';
			icon.className = 'dashicons dashicons-search pdk-start-search-icon';
			icon.setAttribute('aria-hidden', 'true');
			input.type = 'search';
			input.className = 'pdk-start-search-input';
			input.autocomplete = 'off';
			input.placeholder = getLabel('start_search_placeholder', 'Search');
			input.setAttribute('aria-label', getLabel('start_search_label', 'Search apps, settings, and commands'));
			input.addEventListener('keydown', (event) => {
				if (event.key !== 'Enter') {
					return;
				}

				const query = input.value.trim();
				const foundApp = launcher && typeof launcher.runSearch === 'function'
					? launcher.runSearch(query)
					: getPinnedStartApps().find((app) => app.label.toLowerCase().includes(query.toLowerCase()) || app.id.includes(query.toLowerCase()));

				if (!foundApp || !launcher || typeof launcher.openApp !== 'function') {
					return;
				}

				event.preventDefault();
				launcher.openApp(foundApp.id);
				closePopover();
			});

			wrapper.append(icon, input);

			return wrapper;
		}

		function createStartPinnedItem(app) {
			const button = document.createElement('button');
			const icon = document.createElement('span');
			const label = document.createElement('span');

			button.type = 'button';
			button.className = 'pdk-start-pinned-item';
			button.dataset.pdkStartPinnedApp = app.id;
			button.setAttribute('aria-label', app.label);
			icon.className = 'pdk-start-pinned-icon';
			icon.appendChild(dom.createIcon(app.icon || 'dashicons-admin-generic'));
			label.className = 'pdk-start-pinned-label';
			label.textContent = app.label;
			button.append(icon, label);
			button.addEventListener('click', () => {
				commands.execute(commandItem(app.label, 'open-app', {
					icon: app.icon || 'dashicons-admin-generic',
					target: app.id
				}), activeDetail);
				closePopover();
			});

			return button;
		}

		function createStartActionButton(item, className) {
			const button = document.createElement('button');
			const icon = document.createElement('span');
			const label = document.createElement('span');
			const disabled = itemRenderer.getItemDisabled(item, activeDetail);

			button.type = 'button';
			button.className = className;
			button.disabled = disabled;
			button.dataset.pdkMenuItem = item.id || item.command || item.label;
			if (disabled) {
				button.setAttribute('aria-disabled', 'true');
			}

			if (item.icon) {
				icon.className = 'pdk-start-action-icon';
				icon.appendChild(dom.createIcon(item.icon));
				button.appendChild(icon);
			}

			label.className = 'pdk-start-action-label';
			label.textContent = item.label;
			button.appendChild(label);

			if (item.command && !disabled) {
				button.addEventListener('click', () => {
					commands.execute(item, activeDetail);
					closePopover();
				});
			}

			return button;
		}

		function getStartRecommendedItems(group) {
			const count = Math.min(4, getRecentCount());
			const recentItems = count && window.PufferDesk.menuBar
				? window.PufferDesk.menuBar.getRecentMenuItems(config, count)
				: [];

			if (recentItems.length) {
				return recentItems.slice(0, 4);
			}

			return group.items
				.filter((item) => item && item.command && ['open-site-about', 'open-app', 'open-url'].includes(item.command))
				.slice(0, 4);
		}

		function closeStartFooterFlyout() {
			if (!startFooterFlyout) {
				return;
			}

			const trigger = startFooterFlyout.pdkTrigger || null;
			if (trigger) {
				trigger.classList.remove('is-active');
				trigger.setAttribute('aria-expanded', 'false');
			}

			startFooterFlyout.remove();
			startFooterFlyout = null;
		}

		function createStartAvatar(user = {}) {
			const avatar = document.createElement('span');
			avatar.className = 'pdk-start-user-avatar';

			if (user.avatar) {
				const image = document.createElement('img');
				image.src = user.avatar;
				image.alt = '';
				image.loading = 'lazy';
				image.decoding = 'async';
				image.setAttribute('aria-hidden', 'true');
				avatar.appendChild(image);
			} else {
				avatar.appendChild(dom.createIcon('dashicons-admin-users'));
			}

			return avatar;
		}

		function getStartAccountItems() {
			const user = config.user && typeof config.user === 'object' ? config.user : {};

			return [
				commandItem(getLabel('start_manage_account', 'Manage account'), 'open-url', {
					icon: 'dashicons-admin-users',
					url: user.profileUrl || ''
				}),
				commandItem(getLabel('start_sign_out', 'Sign out'), 'user.logout', {
					icon: 'dashicons-migrate',
					target: config.logoutUrl || ''
				})
			];
		}

		function getStartPowerItems() {
			return [
				commandItem(getLabel('start_lock', 'Lock'), 'shell.lock', {
					icon: 'dashicons-lock',
					target: config.logoutUrl || ''
				}),
				commandItem(getLabel('start_sleep', 'Sleep'), 'shell.sleep', {
					icon: 'dashicons-hidden',
					target: config.classicUrl || ''
				}),
				commandItem(getLabel('start_shutdown', 'Shut down'), 'shell.shutdown', {
					icon: 'dashicons-migrate',
					target: config.classicUrl || ''
				}),
				commandItem(getLabel('start_restart', 'Restart'), 'shell.restart', {
					icon: 'dashicons-update'
				})
			];
		}

		function createStartFooterMenuItem(item) {
			const button = document.createElement('button');
			const icon = document.createElement('span');
			const label = document.createElement('span');
			const disabled = itemRenderer.getItemDisabled(item, activeDetail);

			button.type = 'button';
			button.className = 'pdk-start-footer-menu-item';
			button.disabled = disabled;
			button.dataset.pdkMenuItem = item.id || item.command || item.label;
			button.setAttribute('role', 'menuitem');
			if (disabled) {
				button.setAttribute('aria-disabled', 'true');
			}

			if (item.icon) {
				icon.className = 'pdk-start-footer-menu-icon';
				icon.appendChild(dom.createIcon(item.icon));
				button.appendChild(icon);
			}

			label.className = 'pdk-start-footer-menu-label';
			label.textContent = item.label;
			button.appendChild(label);

			if (item.command && !disabled) {
				button.addEventListener('click', () => {
					commands.execute(item, activeDetail);
					closeStartFooterFlyout();
					closePopover();
				});
			}

			return button;
		}

		function openStartFooterFlyout(trigger, kind, items, label) {
			if (startFooterFlyout && startFooterFlyout.pdkTrigger === trigger) {
				closeStartFooterFlyout();
				return;
			}

			closeStartFooterFlyout();

			const footer = trigger.closest('.pdk-start-footer');
			if (!footer) {
				return;
			}

			const flyout = document.createElement('div');
			flyout.className = `pdk-start-footer-flyout pdk-start-${kind}-menu`;
			flyout.dataset.pdkStartFooterFlyout = kind;
			flyout.pdkTrigger = trigger;
			flyout.setAttribute('role', 'menu');
			flyout.setAttribute('aria-label', label);
			flyout.replaceChildren(...items.map(createStartFooterMenuItem));

			trigger.classList.add('is-active');
			trigger.setAttribute('aria-expanded', 'true');
			footer.appendChild(flyout);
			startFooterFlyout = flyout;
		}

		function createStartAccountButton() {
			const user = config.user && typeof config.user === 'object' ? config.user : {};
			const button = document.createElement('button');
			const label = document.createElement('span');
			const name = user.name || getLabel('admin', 'Admin');

			button.type = 'button';
			button.className = 'pdk-start-footer-user pdk-start-account-button';
			button.dataset.pdkStartFooterMenuTrigger = 'account';
			button.setAttribute('aria-haspopup', 'menu');
			button.setAttribute('aria-expanded', 'false');
			button.setAttribute('aria-label', name);
			label.className = 'pdk-start-account-label';
			label.textContent = name;
			button.append(createStartAvatar(user), label);
			button.addEventListener('click', () => {
				openStartFooterFlyout(button, 'account', getStartAccountItems(), getLabel('start_account', 'Account'));
			});

			return button;
		}

		function createStartPowerButton() {
			const button = document.createElement('button');
			const icon = document.createElement('span');

			button.type = 'button';
			button.className = 'pdk-start-footer-power';
			button.dataset.pdkStartFooterMenuTrigger = 'power';
			button.setAttribute('aria-haspopup', 'menu');
			button.setAttribute('aria-expanded', 'false');
			button.setAttribute('aria-label', getLabel('start_power_menu', 'Power options'));
			icon.className = 'pdk-start-power-icon';
			icon.setAttribute('aria-hidden', 'true');
			button.appendChild(icon);
			button.addEventListener('click', () => {
				openStartFooterFlyout(button, 'power', getStartPowerItems(), getLabel('start_power_menu', 'Power options'));
			});

			return button;
		}

		function createStartPanelContent(group) {
			const pinnedSection = document.createElement('section');
			const pinnedGrid = document.createElement('div');
			const recommendedSection = document.createElement('section');
			const recommendedList = document.createElement('div');
			const footer = document.createElement('footer');
			const recommendedItems = getStartRecommendedItems(group);

			pinnedSection.className = 'pdk-start-section pdk-start-section-pinned';
			pinnedSection.appendChild(createStartSectionHeading(getLabel('start_pinned', 'Pinned')));
			pinnedGrid.className = 'pdk-start-pinned-grid';
			getPinnedStartApps().forEach((app) => {
				pinnedGrid.appendChild(createStartPinnedItem(app));
			});
			pinnedSection.appendChild(pinnedGrid);

			recommendedSection.className = 'pdk-start-section pdk-start-section-recommended';
			recommendedSection.appendChild(createStartSectionHeading(getLabel('start_recommended', 'Recommended')));
			recommendedList.className = 'pdk-start-recommended-list';
			if (recommendedItems.length) {
				recommendedItems.forEach((item) => {
					recommendedList.appendChild(createStartActionButton(item, 'pdk-start-recommended-item'));
				});
			} else {
				const empty = document.createElement('div');
				empty.className = 'pdk-start-recommended-empty';
				empty.textContent = getLabel('start_no_recent_items', 'No recent items yet');
				recommendedList.appendChild(empty);
			}
			recommendedSection.appendChild(recommendedList);

			footer.className = 'pdk-start-footer';
			footer.setAttribute('aria-label', getLabel('start_power', 'Power and session'));
			footer.append(createStartAccountButton(), createStartPowerButton());

			return [
				createStartSearch(),
				pinnedSection,
				recommendedSection,
				footer
			];
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
				label: getLabel('close_item_format', 'Close %s').replace('%s', title)
			});
		}

		function closePopover() {
			closeStartFooterFlyout();

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
			const opensAbove = shell.dataset.pdkShellLauncher === 'taskbar' || buttonRect.top > shellRect.top + shellRect.height / 2;
			const belowTop = Math.round(buttonRect.bottom - shellRect.top + 2);
			const aboveTop = Math.round(buttonRect.top - shellRect.top - popover.offsetHeight - 8);
			const top = opensAbove ? Math.max(8, aboveTop) : belowTop;
			const minLeft = 8;
			const maxLeft = Math.max(minLeft, shell.clientWidth - popover.offsetWidth - 8);
			const preferredLeft = opensAbove && button.hasAttribute('data-pdk-system-menu')
				? Math.round(buttonRect.left - shellRect.left + buttonRect.width / 2 - popover.offsetWidth / 2)
				: Math.round(buttonRect.left - shellRect.left);
			const left = geometry.clamp(preferredLeft, minLeft, maxLeft);

			popover.dataset.pdkMenuPlacement = opensAbove ? 'above' : 'below';
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

			if (transientSurfaces && typeof transientSurfaces.announce === 'function') {
				transientSurfaces.announce('menu', {
					groupId: group.id
				});
			}

			activeButton = button;
			openGroupId = group.id;
			activeButton.classList.add('is-active');
			activeButton.setAttribute('aria-expanded', 'true');

			popover = document.createElement('div');
			popover.className = 'pdk-menu-popover';
			popover.dataset.pdkMenuPopover = group.id;
			if (isStartPanelGroup(group)) {
				popover.classList.add('pdk-start-panel');
				popover.setAttribute('role', 'dialog');
			} else {
				popover.setAttribute('role', 'menu');
			}
			popover.setAttribute('aria-label', group.label);
			popover.replaceChildren(...(
				isStartPanelGroup(group)
					? createStartPanelContent(group)
					: group.items.map(createMenuItem)
			));

			shell.appendChild(popover);
			positionPopover(button);

			if (options.focus) {
				const firstEnabled = popover.querySelector('.pdk-start-search-input, .pdk-menu-item:not(:disabled), button:not(:disabled)');
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

			button.dataset.pdkMenuGroup = initialGroup.id;

			if (hasMenuItems(initialGroup)) {
				button.setAttribute('aria-haspopup', isStartPanelGroup(initialGroup) ? 'dialog' : 'menu');
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
			button.dataset.pdkMenuGroup = group.id;

			if (!group.command) {
				return;
			}

			button.dataset.pdkCommand = group.command;
			if (group.target) {
				button.dataset.pdkCommandTarget = group.target;
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
			if (!systemButton || systemButton.dataset.pdkSystemMenuBound === '1' || !hasMenuItems(getSystemGroup())) {
				return;
			}

			systemButton.dataset.pdkSystemMenuBound = '1';
			bindGroupButton(systemButton, getSystemGroup);
		}

		function bind() {
			if (!menu && !systemButton) {
				return;
			}

			bindSystemButton();
			if (menu) {
				render(getInitialActiveDetail());
				shell.addEventListener('pufferDesk:active-window-change', (event) => {
					render(event.detail || { kind: 'desktop' });
				});
			}
			document.addEventListener('pointerdown', (event) => {
				const target = event.target && event.target.nodeType === 1 ? event.target : event.target.parentElement;
				if (
					popover
					&& startFooterFlyout
					&& popover.contains(event.target)
					&& !startFooterFlyout.contains(event.target)
					&& (!target || !target.closest('[data-pdk-start-footer-menu-trigger]'))
				) {
					closeStartFooterFlyout();
				}

				if (
					popover
					&& !popover.contains(event.target)
					&& (!menu || !menu.contains(event.target))
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
			window.addEventListener('pufferDesk:recent-items-change', () => {
				if (openGroupId === 'system') {
					openPopover(getSystemGroup(), activeButton || systemButton);
				}
			});
			shell.addEventListener('pufferDesk:menu-bar-change', () => {
				config.menuBar = Object.assign({}, config.menuBar || {}, {
					auto_hide: shell.dataset.pdkMenuBarAutoHide || 'fullscreen',
					recent_count: Number.parseInt(shell.dataset.pdkMenuBarRecentCount, 10) || 0,
					show_background: shell.dataset.pdkMenuBarBackground === '1'
				});
				if (openGroupId === 'system') {
					openPopover(getSystemGroup(), activeButton || systemButton);
				}
			});
			window.addEventListener('resize', closePopover);
			if (transientSurfaces && typeof transientSurfaces.closeOnOther === 'function') {
				transientSurfaces.closeOnOther('menu', closePopover);
			}
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
