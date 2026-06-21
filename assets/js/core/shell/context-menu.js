(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.shell = window.PufferDesk.shell || {};

	window.PufferDesk.shell.createContextMenuRegistry = function createContextMenuRegistry(config = {}, schema = null, context = {}) {
		const appMap = new Map((Array.isArray(config.apps) ? config.apps : []).map((app) => [app.id, app]));
		const appNavigation = window.PufferDesk.apps.appNavigation || null;
		const folderMap = new Map((Array.isArray(config.folders) ? config.folders : []).map((folder) => [folder.id, folder]));
		const menuConfig = config.menu && typeof config.menu === 'object' ? config.menu : {};
		const labels = menuConfig.labels && typeof menuConfig.labels === 'object' ? menuConfig.labels : {};
		const commandIds = (window.PufferDesk.shell && window.PufferDesk.shell.commands) || {};
		const appIds = window.PufferDesk.apps && window.PufferDesk.apps.ids ? window.PufferDesk.apps.ids : {};
		const defaultDashicon = window.PufferDesk.dom.getDefaultDashicon();
		const constants = window.PufferDesk.shell.contextMenuConstants || {};
		const targets = constants.targets || {};
		const itemTypes = constants.itemTypes || {};
		const shortcutContexts = window.PufferDesk.shell.shortcutContexts || {};
		const desktopIconManager = context.desktopIconManager || null;
		const folderManager = context.folderManager || null;
		const manager = context.manager || null;
		const stickyNoteManager = context.stickyNoteManager || window.PufferDesk.stickyNoteManager || null;
		const providers = new Map();
		const extensions = new Map();
		const menuSchema = schema || window.PufferDesk.shell.createMenuSchema();
			const themeSurfaces = config.theme && config.theme.surfaces && typeof config.theme.surfaces === 'object'
				? config.theme.surfaces
				: {};
			const folderMenuOptions = window.PufferDesk.apps && typeof window.PufferDesk.apps.createFolderMenuOptions === 'function'
			? window.PufferDesk.apps.createFolderMenuOptions({
				getMenuLabel: getLabel
			})
			: null;
		const folderViewModes = window.PufferDesk.apps && window.PufferDesk.apps.folderViewModes
			? window.PufferDesk.apps.folderViewModes
			: null;
		const appRouteMenuLimit = 8;
		const appDescriptorContracts = window.PufferDesk.config && typeof window.PufferDesk.config.getContractMap === 'function'
			? window.PufferDesk.config.getContractMap('appDescriptors', {})
			: {};
		const appSources = appDescriptorContracts.sources && typeof appDescriptorContracts.sources === 'object'
			? appDescriptorContracts.sources
			: {};

		function commandItem(label, command, options = {}) {
			return Object.assign({
				command,
				label
			}, options);
		}

		function shortcut(combo, options = {}) {
			return Object.assign({
				combo
			}, options);
		}

		function getLabel(key, fallback) {
			return typeof labels[key] === 'string' && labels[key] ? labels[key] : (fallback || key);
		}

		function getMenuContextKeys(detail = {}) {
			const keys = [
				detail.type || '',
				detail.contextKey || ''
			];

			if (detail.area && detail.targetType) {
				keys.push(`${detail.area}.${detail.targetType}`);
			}

			if (detail.area && detail.targetType === 'item') {
				keys.push(`${detail.area}.item`);
			}

			return Array.from(new Set(keys.filter(Boolean)));
		}

		function separator() {
			return { type: 'separator' };
		}

		function getClipboardItems(options = {}) {
			const includeCopy = options.includeCopy !== false;
			const includePaste = options.includePaste !== false;
			const items = [];

			if (includeCopy) {
				items.push(commandItem(getLabel('copy'), commandIds.CLIPBOARD_COPY, {
					icon: 'dashicons-clipboard',
					id: 'copy',
					shortcut: options.shortcutLabels === false ? '' : shortcut('primary+c')
				}));
			}
			if (includePaste) {
				items.push(commandItem(getLabel('paste'), commandIds.CLIPBOARD_PASTE, {
					hideWhenUnavailable: true,
					icon: 'dashicons-admin-page',
					id: 'paste',
					shortcut: options.shortcutLabels === false ? '' : shortcut('primary+v')
				}));
			}

			return items;
		}

		function getClipboardGroup(options = {}) {
			return {
				id: options.id || 'clipboard',
				items: getClipboardItems(options),
				label: getLabel('clipboard')
			};
		}

		function isPluginOwnedApp(app) {
			return Boolean(app && app.source === appSources.WP_PLUGIN);
		}

		function getNativeUsersConfig() {
			const nativeAdmin = config.nativeAdmin && typeof config.nativeAdmin === 'object' ? config.nativeAdmin : {};
			const nativeAdminApps = nativeAdmin.apps && typeof nativeAdmin.apps === 'object' ? nativeAdmin.apps : {};

			return appIds.USERS && nativeAdminApps[appIds.USERS] && typeof nativeAdminApps[appIds.USERS] === 'object'
				? nativeAdminApps[appIds.USERS]
				: {};
		}

		function appendUsersWorkflowItems(items, app) {
			if (!app || app.id !== appIds.USERS) {
				return;
			}

			const nativeUsers = getNativeUsersConfig();
			const workflowItems = [];

			if (nativeUsers.canCreate && commandIds.USER_CREATE) {
				workflowItems.push(commandItem(getLabel('add_user', 'Add User'), commandIds.USER_CREATE, {
					icon: 'dashicons-plus-alt2',
					id: 'add-user',
					target: app.id
				}));
			}

			if (nativeUsers.canProfile && commandIds.USER_OPEN_PROFILE) {
				workflowItems.push(commandItem(getLabel('open_profile', 'Open Profile'), commandIds.USER_OPEN_PROFILE, {
					icon: 'dashicons-id',
					id: 'open-profile',
					payload: {
						userId: config.userId || 0
					},
					target: app.id
				}));
			}

			if (workflowItems.length) {
				items.push(separator(), ...workflowItems);
			}
		}

		function actionStrip(items, options = {}) {
			return Object.assign({
				id: 'action-strip',
				items,
				label: getLabel('quick_actions'),
				type: 'action-strip'
			}, options);
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

		function getDocumentsConfig() {
			return config.documents && typeof config.documents === 'object' ? config.documents : {};
		}

		function getDocumentDataset(detail = {}) {
			return detail && detail.metadata && detail.metadata.dataset && typeof detail.metadata.dataset === 'object'
				? detail.metadata.dataset
				: {};
		}

		function normalizeDocumentId(value) {
			const raw = String(value || '').trim();
			const direct = raw.match(/^\d+$/);
			const prefixed = raw.match(/^document-(\d+)$/);
			const match = direct ? direct : prefixed;

			return match ? Number.parseInt(direct ? raw : match[1], 10) || 0 : 0;
		}

		function getDocumentId(detail = {}) {
			const dataset = getDocumentDataset(detail);

			return normalizeDocumentId(detail.documentId || dataset.pdkDocumentId || detail.id || detail.targetId || '');
		}

		function getDocumentKind(detail = {}) {
			const dataset = getDocumentDataset(detail);

			return detail.documentKind || dataset.pdkDocumentKind || '';
		}

		function getDocumentPayload(detail = {}) {
			const documentId = getDocumentId(detail);

			return {
				documentId: String(documentId || ''),
				documentKind: getDocumentKind(detail),
				folderId: detail.folderId || '',
				target: String(documentId || '')
			};
		}

		function documentHandlerSupportsKind(handler = {}, documentKind = '') {
			const kinds = Array.isArray(handler.documentKinds) ? handler.documentKinds : [];

			return !kinds.length || kinds.includes(documentKind);
		}

		function getDocumentOpenWithItems(detail = {}) {
			const documentsConfig = getDocumentsConfig();
			const handlers = Array.isArray(documentsConfig.openWith) ? documentsConfig.openWith : [];
			const payload = getDocumentPayload(detail);

			if (!payload.documentId) {
				return [];
			}

			return handlers
				.filter((handler) => handler && typeof handler === 'object' && documentHandlerSupportsKind(handler, payload.documentKind))
				.map((handler) => {
					const appId = handler.appId || handler.id || '';
					const app = appId ? appMap.get(appId) : null;

					return commandItem(handler.label || (app && app.label) || appId || getLabel('app'), commandIds.OPEN_WITH, {
						icon: handler.icon || (app && app.icon) || defaultDashicon,
						id: `open-with-${handler.id || appId || payload.documentKind || 'handler'}`,
						payload: Object.assign({}, payload, {
							appId,
							handlerId: handler.id || appId
						}),
						target: payload.documentId
					});
				})
				.filter((item) => item.target);
		}

		function getFolderTabDetails(detail = {}) {
			const win = detail.windowElement || null;
			const tabs = win
				? Array.from(win.querySelectorAll(`[data-pdk-context="${targets.FOLDER_TAB}"][data-pdk-context-id]`))
				: [];
			const tabId = detail.id || '';
			const index = tabs.findIndex((tab) => tab.dataset.pdkContextId === tabId);

			return {
				index,
				tabCount: tabs.length,
				tabId
			};
		}

		function getFolderSidebarSection(detail = {}) {
			const dataset = detail.targetElement && detail.targetElement.dataset
				? detail.targetElement.dataset
				: detail.metadata && detail.metadata.dataset && typeof detail.metadata.dataset === 'object'
					? detail.metadata.dataset
					: {};

			return dataset.pdkFolderSidebarSection || '';
		}

		function getFolderSidebarItems(detail = {}) {
			const section = getFolderSidebarSection(detail);
			const payload = {
				section,
				target: detail.id || ''
			};
			const items = [
				commandItem(getLabel('open_in_new_tab'), commandIds.OPEN_FOLDER_TAB, payload),
				separator(),
				commandItem(getLabel('remove_from_sidebar'), commandIds.FOLDER_SIDEBAR_REMOVE, Object.assign({}, payload, {
					hideWhenUnavailable: true
				}))
			];

			if (section !== 'recents') {
				items.push(
					separator(),
					commandItem(getLabel('get_info'), commandIds.FOLDER_GET_INFO, payload)
				);
			}

			return items;
		}

		function isTrashFolder(folder) {
			return Boolean(folder && folder.id === appIds.TRASH);
		}

		function isFileExplorerSurface() {
			return themeSurfaces.folder === 'file-explorer';
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

			const win = appId ? document.querySelector(`.pdk-window[data-pdk-app-window="${window.PufferDesk.dom.escapeAttribute(appId)}"]:not(.is-closed)`) : null;

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

			return commandItem(label, commandIds.DESKTOP_SORT_ICONS, {
				icon: active ? 'dashicons-yes' : '',
				payload: {
					mode
				}
			});
		}

		function getSortByItems() {
			return [
				sortByItem(getLabel('sort_none'), 'none'),
				separator(),
				sortByItem(getLabel('sort_snap_to_grid'), 'snap-to-grid'),
				separator(),
				sortByItem(getLabel('sort_name'), 'name'),
				sortByItem(getLabel('sort_kind'), 'kind'),
				sortByItem(getLabel('sort_last_modified_by'), 'last-modified-by'),
				sortByItem(getLabel('sort_date_last_opened'), 'date-last-opened'),
				sortByItem(getLabel('sort_date_added'), 'date-added'),
				sortByItem(getLabel('sort_date_modified'), 'date-modified'),
				sortByItem(getLabel('sort_date_created'), 'date-created'),
				sortByItem(getLabel('sort_size'), 'size')
			];
		}

		function getFolderToolbarDisplayMode(detail = {}) {
			const mode = detail.windowElement && detail.windowElement.dataset
				? detail.windowElement.dataset.pdkFolderToolbarDisplay
				: '';

			return folderViewModes && typeof folderViewModes.normalizeToolbarDisplayMode === 'function'
				? folderViewModes.normalizeToolbarDisplayMode(mode)
				: 'icon-text';
		}

		function getFolderContentFolderId(detail = {}) {
			const win = detail.windowElement || null;

			return detail.folderId || detail.id || (win && win.dataset ? win.dataset.pdkFolderWindow || '' : '');
		}

		function getFolderContentLayout(detail = {}) {
			const win = detail.windowElement || null;
			const windowLayout = win && win.dataset ? win.dataset.pdkFolderLayout || '' : '';

			return windowLayout || (themeSurfaces.folder === 'file-explorer' ? 'file-explorer' : 'finder');
		}

		function getFolderContentViewMode(detail = {}) {
			const win = detail.windowElement || null;

			return win && win.dataset ? win.dataset.pdkFolderViewMode || win.dataset.pdkExplorerViewMode || '' : '';
		}

		function getFolderContentSortMode(detail = {}) {
			const win = detail.windowElement || null;
			const mode = win && win.dataset ? win.dataset.pdkExplorerSortMode || '' : '';

			return folderViewModes && typeof folderViewModes.normalizeExplorerSortMode === 'function'
				? folderViewModes.normalizeExplorerSortMode(mode)
				: 'none';
		}

		function getFolderContentMenuItems(detail = {}) {
			const folderId = getFolderContentFolderId(detail);
			const layout = getFolderContentLayout(detail);

			return folderMenuOptions
					? folderMenuOptions.getFolderContentItems(folderId, {
						infoLabel: isFileExplorerSurface() ? getLabel('properties') : getLabel('get_info'),
						infoShortcut: isFileExplorerSurface() ? shortcut('secondary+enter') : '',
						layout,
						sortByLabel: getLabel('sort_by'),
						sortMode: getFolderContentSortMode(detail),
						viewMode: getFolderContentViewMode(detail)
					})
				: [];
		}

		function getAppRouteItems(app, options = {}) {
			const routeItems = appNavigation && typeof appNavigation.createMenuItems === 'function'
				? appNavigation.createMenuItems(app, options)
				: [];

			if (!app || app.id !== appIds.USERS || !routeItems.length) {
				return routeItems;
			}

			const nativeUsers = getNativeUsersConfig();

			return routeItems.filter((item) => {
				const url = String(item.url || '').toLowerCase();

				if (nativeUsers.canCreate && commandIds.USER_CREATE && url.includes('user-new.php')) {
					return false;
				}

				if (nativeUsers.canProfile && commandIds.USER_OPEN_PROFILE && url.includes('profile.php')) {
					return false;
				}

				return true;
			});
		}

		function capAppRouteItems(items) {
			if (!items.length || items.length <= appRouteMenuLimit) {
				return items;
			}

			return items.slice(0, Math.max(0, appRouteMenuLimit - 1)).concat([
				{
					icon: 'dashicons-menu-alt3',
					id: 'app-routes-more',
					items,
					label: getLabel('start_create_more', 'More...')
				}
			]);
		}

		function appendAppRouteItems(items, app, options = {}) {
			const routeItems = capAppRouteItems(getAppRouteItems(app, options));
			if (!routeItems.length) {
				return items;
			}

			if (items.length) {
				items.push(separator());
			}
			items.push(...routeItems);

			return items;
		}

		function appendOpenInBrowserTabItem(items, app, options = {}) {
			if (!app || !app.url) {
				return items;
			}

			items.push(commandItem(getLabel('open_in_browser_tab'), commandIds.WINDOW_OPEN_BROWSER_TAB, Object.assign({
				title: app.label || '',
				url: app.url
			}, options)));

			return items;
		}

		function folderToolbarDisplayItem(label, mode, detail = {}) {
			const active = getFolderToolbarDisplayMode(detail) === mode;

			return commandItem(label, commandIds.FOLDER_TOOLBAR_DISPLAY, {
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
				.map((folder) => commandItem(folder.label, commandIds.FOLDER_ADD_APP, {
					icon: folder.icon || 'dashicons-category',
					payload: {
						folderId: folder.id
					},
					target: app.id
			}));
			const items = [
				commandItem(getLabel('open'), commandIds.OPEN_APP, {
					icon: app.icon || defaultDashicon,
					target: app.id
				})
			];
			appendOpenInBrowserTabItem(items, app, {
				icon: 'dashicons-external'
			});
			appendAppRouteItems(items, app, {
				icon: 'dashicons-admin-links'
			});
			appendUsersWorkflowItems(items, app);

			if (folderId && isUserFolder(folderId)) {
				items.push(commandItem(getLabel('remove_from_folder'), commandIds.FOLDER_REMOVE_APP, {
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
					label: folderId ? getLabel('move_to_folder') : getLabel('add_to_folder')
				});
			}

			items.push(
				commandItem(getLabel('about'), commandIds.OPEN_ABOUT, {
					icon: 'dashicons-info-outline',
					target: app.id
				})
			);

			return items;
		}

		function getDockOptionsItem(app, state) {
			const optionItems = [
				state.open
					? commandItem(getLabel('keep_in_launcher'), commandIds.APP_KEEP_IN_DOCK, {
						target: app.id
					})
					: commandItem(getLabel('remove_from_launcher'), commandIds.APP_REMOVE_FROM_DOCK, {
						target: app.id
					}),
				commandItem(getLabel('open_at_login'), commandIds.APP_TOGGLE_LOGIN_ITEM, {
					target: app.id
				})
			];

			if (isPluginOwnedApp(app) && appIds.PLUGINS && appMap.has(appIds.PLUGINS)) {
				optionItems.push(commandItem(getLabel('uninstall', 'Uninstall'), commandIds.OPEN_APP, {
					id: 'uninstall-plugin',
					target: appIds.PLUGINS
				}));
			}

			return {
				id: 'dock-options',
				items: optionItems,
				label: getLabel('launcher_options')
			};
		}

		function getDockAppItems(app) {
			if (!app) {
				return [];
			}

			if (app.id === appIds.TRASH) {
				return [
					commandItem(getLabel('open'), commandIds.OPEN_APP, {
						target: app.id
					}),
					separator(),
					commandItem(getLabel('empty_trash'), commandIds.TRASH_EMPTY)
				];
			}

			if (app.id === appIds.STICKY_NOTES) {
				return getInlineStickyNotesDockItems(app);
			}

			const state = getAppWindowState(app.id);
			const items = [];

			if (state.open) {
				items.push(
					commandItem(state.hidden ? getLabel('show') : getLabel('hide'), state.hidden ? commandIds.WINDOW_FOCUS : commandIds.WINDOW_HIDE, {
						target: app.id
					}),
					commandItem(getLabel('quit'), commandIds.WINDOW_CLOSE, {
						target: app.id
					})
				);
			} else {
				items.push(commandItem(getLabel('open'), commandIds.OPEN_APP, {
					target: app.id
				}));
			}
			appendOpenInBrowserTabItem(items, app);
			appendAppRouteItems(items, app);
			appendUsersWorkflowItems(items, app);

			if (!isFixedDockApp(app)) {
				items.push(
					separator(),
					getDockOptionsItem(app, state)
				);
			}

			items.push(
				separator(),
				commandItem(getLabel('about'), commandIds.OPEN_ABOUT, {
					target: app.id
				})
			);

			return items;
		}

		function getInlineStickyNotesDockItems(app) {
			const hasHiddenNotes = Boolean(
				stickyNoteManager
				&& typeof stickyNoteManager.hasHiddenNotes === 'function'
				&& stickyNoteManager.hasHiddenNotes()
			);
			const state = getAppWindowState(app.id);
			const items = [
				commandItem(getLabel('new_note', getLabel('new_sticky_note')), commandIds.DOCUMENT_NEW_STICKY_NOTE, {
					icon: app.icon || defaultDashicon,
					target: app.id
				})
			];

			if (hasHiddenNotes) {
				items.push(commandItem(getLabel('show'), commandIds.DOCUMENT_OPEN_STICKY_NOTES, {
					icon: app.icon || defaultDashicon,
					target: app.id
				}));
			}

			if (app.url) {
				items.push(commandItem(getLabel('open_in_browser_tab'), commandIds.WINDOW_OPEN_BROWSER_TAB, {
					title: app.label || '',
					url: app.url
				}));
			}

			if (!isFixedDockApp(app)) {
				items.push(
					separator(),
					getDockOptionsItem(app, state)
				);
			}

			items.push(
				separator(),
				commandItem(getLabel('about'), commandIds.OPEN_ABOUT, {
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
					commandItem(getLabel('open'), commandIds.OPEN_FOLDER, {
						icon: folder.icon || 'dashicons-trash',
						target: folder.id
					}),
					commandItem(getLabel('open_in_new_tab'), commandIds.OPEN_FOLDER_TAB, {
						icon: 'dashicons-plus-alt2',
						target: folder.id
					}),
					separator(),
					commandItem(getLabel('empty_trash'), commandIds.TRASH_EMPTY, {
						icon: 'dashicons-trash'
					})
				];
			}

			const canMutateFolder = folder.user === true || isUserFolder(folder.id);
			const useExplorerMenu = isFileExplorerSurface();
			const items = [];

			if (!useExplorerMenu) {
				items.push(
					commandItem(getLabel('open'), commandIds.OPEN_FOLDER, {
						icon: folder.icon || 'dashicons-category',
						target: folder.id
					}),
					commandItem(getLabel('open_in_new_tab'), commandIds.OPEN_FOLDER_TAB, {
						icon: 'dashicons-plus-alt2',
						target: folder.id
					}),
					commandItem(getLabel('paste'), commandIds.CLIPBOARD_PASTE, {
						hideWhenUnavailable: true,
						icon: 'dashicons-admin-page',
						id: 'paste',
						shortcut: shortcut('primary+v')
					}),
					separator()
				);

				if (canMutateFolder) {
					items.push(
						commandItem(getLabel('move_to_trash'), commandIds.FOLDER_DELETE, {
							icon: 'dashicons-trash',
							target: folder.id
						}),
						separator()
					);
				}

				items.push(
					commandItem(getLabel('get_info'), commandIds.FOLDER_GET_INFO, {
						icon: 'dashicons-info-outline',
						target: folder.id
					})
				);

				if (canMutateFolder) {
					items.push(commandItem(getLabel('rename'), commandIds.FOLDER_RENAME, {
						icon: 'dashicons-edit',
						target: folder.id
					}));
				}

				if (canMutateFolder) {
					items.push(
						separator(),
						commandItem(getLabel('copy'), commandIds.CLIPBOARD_COPY, {
							icon: 'dashicons-clipboard',
							id: 'copy',
							shortcut: shortcut('primary+c')
						})
					);
				}

				return items;
			}

			if (useExplorerMenu && canMutateFolder) {
				items.push(actionStrip([
					commandItem(getLabel('cut'), commandIds.CLIPBOARD_CUT, {
						hideWhenUnavailable: true,
						icon: 'dashicons-admin-page',
						id: 'cut'
					}),
					commandItem(getLabel('copy'), commandIds.CLIPBOARD_COPY, {
						icon: 'dashicons-clipboard',
						id: 'copy'
					}),
					commandItem(getLabel('paste'), commandIds.CLIPBOARD_PASTE, {
						hideWhenUnavailable: true,
						icon: 'dashicons-admin-page',
						id: 'paste'
					}),
					commandItem(getLabel('rename'), commandIds.FOLDER_RENAME, {
						icon: 'dashicons-edit',
						id: 'rename',
						target: folder.id
					}),
					commandItem(getLabel('delete'), commandIds.FOLDER_DELETE, {
						icon: 'dashicons-trash',
						id: 'delete',
						target: folder.id
					})
				], {
					id: 'folder-actions'
				}));
			}

			items.push(
				commandItem(getLabel('open'), commandIds.OPEN_FOLDER, {
					icon: folder.icon || 'dashicons-category',
					shortcut: useExplorerMenu ? getLabel('enter_key') : '',
					target: folder.id
				}),
				commandItem(getLabel('open_in_new_tab'), commandIds.OPEN_FOLDER_TAB, {
					icon: 'dashicons-plus-alt2',
					target: folder.id
				})
			);

			if (useExplorerMenu) {
				items.push(
					commandItem(getLabel('open_in_new_window'), commandIds.OPEN_FOLDER_WINDOW, {
						icon: 'dashicons-external',
						id: 'open-in-new-window',
						target: folder.id
					})
				);
			}

			items.push(
				commandItem(useExplorerMenu ? getLabel('properties') : getLabel('get_info'), commandIds.FOLDER_GET_INFO, {
					icon: 'dashicons-info-outline',
					shortcut: useExplorerMenu ? shortcut('secondary+enter') : '',
					target: folder.id
				})
			);

			if (useExplorerMenu) {
				return items;
			}

			if (canMutateFolder && !useExplorerMenu) {
				items.push(
					separator(),
					commandItem(getLabel('rename'), commandIds.FOLDER_RENAME, {
						icon: 'dashicons-edit',
						target: folder.id
					}),
					commandItem(getLabel('move_to_trash'), commandIds.FOLDER_DELETE, {
						icon: 'dashicons-trash',
						target: folder.id
					})
				);
			}

			return items;
		}

		function getDocumentIcon(detail = {}) {
			const stickyKind = getDocumentsConfig().kinds && getDocumentsConfig().kinds.sticky ? getDocumentsConfig().kinds.sticky : '';

			return getDocumentKind(detail) === stickyKind ? 'dashicons-sticky' : 'dashicons-media-document';
		}

		function getDocumentOpenWithMenu(detail = {}) {
			const items = getDocumentOpenWithItems(detail);

			return items.length
				? {
					icon: 'dashicons-admin-generic',
					id: 'open-with',
					items,
					label: getLabel('open_with')
				}
				: null;
		}

		function getDocumentItems(detail = {}) {
			const payload = getDocumentPayload(detail);
			const documentId = payload.documentId;
			const documentIcon = getDocumentIcon(detail);
			const openWithMenu = getDocumentOpenWithMenu(detail);
			const useExplorerMenu = isFileExplorerSurface();
			const openItem = commandItem(getLabel('open'), commandIds.DOCUMENT_OPEN, {
				icon: documentIcon,
				shortcut: useExplorerMenu ? getLabel('enter_key') : '',
				payload,
				target: documentId
			});
			const renameItem = commandItem(getLabel('rename'), commandIds.DOCUMENT_RENAME, {
				icon: 'dashicons-edit',
				id: 'rename',
				payload,
				target: documentId
			});
			const moveToTrashItem = commandItem(useExplorerMenu ? getLabel('delete') : getLabel('move_to_trash'), commandIds.DOCUMENT_MOVE_TO_TRASH, {
				icon: 'dashicons-trash',
				id: useExplorerMenu ? 'delete' : 'move-to-trash',
				payload,
				target: documentId
			});
			const infoItem = commandItem(useExplorerMenu ? getLabel('properties') : getLabel('get_info'), commandIds.DOCUMENT_GET_INFO, {
				icon: 'dashicons-info-outline',
				shortcut: useExplorerMenu ? shortcut('secondary+enter') : '',
				payload,
				target: documentId
			});
			const items = [];

			if (useExplorerMenu) {
				items.push(actionStrip([
					commandItem(getLabel('cut'), commandIds.CLIPBOARD_CUT, {
						hideWhenUnavailable: true,
						icon: 'dashicons-admin-page',
						id: 'cut'
					}),
					commandItem(getLabel('copy'), commandIds.CLIPBOARD_COPY, {
						icon: 'dashicons-clipboard',
						id: 'copy'
					}),
					commandItem(getLabel('paste'), commandIds.CLIPBOARD_PASTE, {
						hideWhenUnavailable: true,
						icon: 'dashicons-admin-page',
						id: 'paste'
					}),
					renameItem,
					moveToTrashItem
				], {
					id: 'document-actions'
				}));
			}

			items.push(openItem);
			if (openWithMenu) {
				items.push(openWithMenu);
			}

			if (!useExplorerMenu) {
				items.push(
					commandItem(getLabel('paste'), commandIds.CLIPBOARD_PASTE, {
						hideWhenUnavailable: true,
						icon: 'dashicons-admin-page',
						id: 'paste',
						shortcut: shortcut('primary+v')
					}),
					separator(),
					moveToTrashItem,
					separator(),
					infoItem,
					renameItem,
					separator(),
					commandItem(getLabel('copy'), commandIds.CLIPBOARD_COPY, {
						icon: 'dashicons-clipboard',
						id: 'copy',
						shortcut: shortcut('primary+c')
					})
				);

				return items;
			}

			items.push(infoItem);

			return items;
		}

		function getTrashItemItems(item, fallbackId = '') {
			const trashId = item && item.id ? item.id : fallbackId;

			if (!trashId) {
				return [];
			}

			return [
				commandItem(getLabel('put_back'), commandIds.TRASH_RESTORE, {
					icon: 'dashicons-undo',
					target: trashId
				}),
				commandItem(getLabel('delete_immediately'), commandIds.TRASH_DELETE_IMMEDIATELY, {
					icon: 'dashicons-trash',
					target: trashId
				})
			];
		}

		function getWindowBrowserUrl(detail = {}, app = null) {
			const win = detail.windowElement || null;
			if (win && win.dataset && win.dataset.pdkWindowUrl) {
				return win.dataset.pdkWindowUrl;
			}

			return app && typeof app.url === 'string' ? app.url : '';
		}

		function normalizeMenu(definition, detail = {}) {
			const normalized = menuSchema.normalizeDefinition(definition, {
				appLabel: detail.label || getLabel('context_menu')
			});
			const groups = normalized.groups
				.map((group) => Object.assign({}, group, {
					items: sortMenuItems(group.items.filter((item) => item.type === 'separator' || item.type === 'action-strip' || item.command || item.label))
				}))
				.filter((group) => group.items.length);

			return { groups };
		}

		function sortMenuItems(items = []) {
			const hasExplicitOrder = items.some((item) => item && Number.isFinite(item.order));
			const normalized = items.map((item, index) => {
				const next = item && typeof item === 'object' ? Object.assign({}, item) : item;
				if (next && Array.isArray(next.items)) {
					next.items = sortMenuItems(next.items);
				}

				return {
					index,
					item: next
				};
			});

			if (!hasExplicitOrder) {
				return normalized.map((entry) => entry.item);
			}

			return normalized
				.sort((a, b) => {
					const orderA = Number.isFinite(a.item && a.item.order) ? a.item.order : 1000 + a.index;
					const orderB = Number.isFinite(b.item && b.item.order) ? b.item.order : 1000 + b.index;

					return orderA === orderB ? a.index - b.index : orderA - orderB;
				})
				.map((entry) => entry.item);
		}

		function registerProvider(type, provider) {
			if (!type || typeof provider !== 'function') {
				return;
			}

			providers.set(type, provider);
		}

		function normalizeExtensionDefinition(definition, detail = {}, options = {}) {
			const resolved = typeof definition === 'function' ? definition(detail) : definition;
			if (!resolved) {
				return { groups: [] };
			}

			if (Array.isArray(resolved)) {
				return normalizeMenu({
					groups: [
						{
							id: options.group || 'extensions',
							items: resolved,
							label: options.label || getLabel('extensions')
						}
					]
				}, detail);
			}

			if (resolved.groups || resolved.app || resolved.file || resolved.edit || resolved.view || resolved.go || resolved.window || resolved.help || resolved.site) {
				return normalizeMenu(resolved, detail);
			}

			return normalizeMenu({
				groups: [
					{
						id: options.group || 'extensions',
						items: [resolved],
						label: options.label || getLabel('extensions')
					}
				]
			}, detail);
		}

		function register(type, definition, options = {}) {
			if (!type || !definition) {
				return () => {};
			}

			const entries = extensions.get(type) || [];
			const entry = {
				definition,
				options
			};
			entries.push(entry);
			extensions.set(type, entries);

			return () => {
				const nextEntries = (extensions.get(type) || []).filter((item) => item !== entry);
				if (nextEntries.length) {
					extensions.set(type, nextEntries);
				} else {
					extensions.delete(type);
				}
			};
		}

		function getExtensionMenuForTarget(detail = {}) {
			const groups = [];

			getMenuContextKeys(detail).forEach((key) => {
				(extensions.get(key) || []).forEach((entry) => {
					const menu = normalizeExtensionDefinition(entry.definition, detail, entry.options);
					groups.push(...menu.groups);
				});
			});

			return { groups };
		}

		function getMenuForTarget(detail = {}) {
			const provider = providers.get(detail.type);
			const baseMenu = provider ? normalizeMenu(provider(detail), detail) : { groups: [] };
			const extensionMenu = getExtensionMenuForTarget(detail);

			return {
				groups: baseMenu.groups.concat(extensionMenu.groups)
			};
		}

		registerProvider(targets.DESKTOP, () => {
			return {
				groups: [
					{
						id: 'primary',
						items: [
							commandItem(getLabel('new_folder'), commandIds.FOLDER_CREATE, {
								icon: 'dashicons-category'
							}),
							commandItem(getLabel('new_sticky_note'), commandIds.DOCUMENT_NEW_STICKY_NOTE, {
								icon: 'dashicons-sticky'
							}),
							commandItem(getLabel('paste'), commandIds.CLIPBOARD_PASTE, {
								hideWhenUnavailable: true,
								icon: 'dashicons-admin-page',
								id: 'desktop-paste',
								shortcut: shortcut('primary+v')
							}),
							separator(),
							commandItem(getLabel('refresh'), commandIds.DESKTOP_REFRESH, {
								icon: 'dashicons-update',
								id: 'desktop-refresh'
							}),
							separator(),
							{
								icon: 'dashicons-sort',
								id: 'sort-by',
								items: getSortByItems(),
								label: getLabel('sort_by')
							},
							separator(),
							commandItem(getLabel('change_wallpaper'), commandIds.SETTINGS_OPEN_PANEL, {
								icon: 'dashicons-format-image',
								panel: 'wallpaper'
							}),
							commandItem(getLabel('system_settings'), commandIds.OPEN_APP, {
								icon: 'dashicons-admin-customizer',
								target: appIds.OS_SETTINGS
							}),
							separator(),
							commandItem(getLabel('reset_layout'), commandIds.SESSION_RESET_LAYOUT, {
								icon: 'dashicons-update'
							})
						]
					}
				]
			};
		});

		registerProvider(itemTypes.APP, (detail) => {
			const app = detail.app || appMap.get(detail.id);
			const groups = [];

			groups.push(getClipboardGroup());
			groups.push({
				id: 'primary',
				items: getAppItems(app, detail)
			});

			return { groups };
		});
		registerProvider(targets.DESKTOP_APP, (detail) => providers.get(itemTypes.APP)(detail));
		registerProvider(targets.FOLDER_APP, (detail) => providers.get(itemTypes.APP)(detail));

		registerProvider(targets.DOCK_APP, (detail) => {
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
		registerProvider(targets.DOCK, () => ({
			groups: [
				{
					id: 'primary',
					items: [
						commandItem(getLabel('show_all'), commandIds.WINDOW_SHOW_ALL, {
							icon: 'dashicons-visibility'
						}),
						commandItem(getLabel('launcher_settings'), commandIds.SETTINGS_OPEN_PANEL, {
							icon: defaultDashicon,
							panel: 'desktop-dock'
						})
					]
				}
			]
		}));

		registerProvider(itemTypes.FOLDER, (detail) => ({
			groups: [
				{
					id: 'primary',
					items: getFolderItems(detail.folder || getFolder(detail.id))
				}
			]
		}));
		registerProvider(targets.FOLDER_SIDEBAR, (detail) => ({
			groups: [
				{
					id: 'primary',
					items: getFolderSidebarItems(detail)
				}
			]
		}));
		registerProvider(targets.FOLDER_CONTENT, (detail) => {
			const folderId = getFolderContentFolderId(detail);
			const contentItems = getFolderContentMenuItems(detail);
			const refreshItem = commandItem(getLabel('refresh'), commandIds.FOLDER_REFRESH, {
				icon: 'dashicons-update',
				id: 'folder-content-refresh',
				payload: {
					folderId,
					target: folderId
				},
				target: folderId
			});
			const pasteItems = getClipboardItems({
				includeCopy: false,
				includeCut: false
			});
			const items = isFileExplorerSurface()
				? pasteItems.concat(refreshItem, separator(), contentItems)
				: [
					contentItems[0],
					contentItems[1],
					...pasteItems,
					separator(),
					contentItems[2],
					separator(),
					refreshItem,
					separator(),
					contentItems[3],
					contentItems[4],
					separator()
				];

			return {
				groups: [
					{
						id: 'primary',
						items
					}
				]
			};
		});
		registerProvider(targets.DOCUMENT, (detail) => ({
			groups: [
				{
					id: 'primary',
					items: getDocumentItems(detail)
				}
			]
		}));
		registerProvider(targets.STICKY_NOTE, (detail) => ({
			groups: [
				{
					id: 'primary',
					items: getDocumentItems(detail)
				}
			]
		}));
		registerProvider(targets.DESKTOP_FOLDER, (detail) => providers.get(itemTypes.FOLDER)(detail));
		registerProvider(targets.FOLDER_TAB, (detail) => {
			const tabDetails = getFolderTabDetails(detail);
			const payload = {
				folderId: detail.folderId || '',
				tabId: tabDetails.tabId,
				target: tabDetails.tabId
			};

			return {
				groups: [
					{
						id: 'primary',
						items: [
							commandItem(getLabel('close_tab'), commandIds.FOLDER_TAB_CLOSE, Object.assign({
								icon: 'dashicons-no-alt',
								shortcut: shortcut('primary+w', {
									contexts: [shortcutContexts.FOLDER_TAB]
								})
							}, payload)),
							commandItem(getLabel('close_other_tabs'), commandIds.FOLDER_TAB_CLOSE_OTHERS, Object.assign({
								disabled: tabDetails.tabCount <= 1
							}, payload)),
							commandItem(getLabel('move_tab_to_new_window'), commandIds.FOLDER_TAB_MOVE_TO_NEW_WINDOW, Object.assign({
								disabled: tabDetails.tabCount <= 1,
								icon: 'dashicons-external'
							}, payload))
						]
					}
				]
			};
		});
		registerProvider(targets.TRASH_ITEM, (detail) => ({
			groups: [
				{
					id: 'primary',
					items: getTrashItemItems(detail.trashItem || getTrashItem(detail.id), detail.id)
				}
			]
		}));

		registerProvider(targets.FOLDER_TOOLBAR, (detail) => ({
			groups: [
				{
					id: 'display',
					items: [
						folderToolbarDisplayItem(getLabel('icons_and_text'), 'icon-text', detail),
						folderToolbarDisplayItem(getLabel('icons_only'), 'icon-only', detail),
						folderToolbarDisplayItem(getLabel('text_only'), 'text-only', detail)
					]
				}
			]
		}));

		registerProvider(targets.WINDOW, (detail) => {
			const app = detail.appId ? appMap.get(detail.appId) : null;
			const browserUrl = getWindowBrowserUrl(detail, app);
			const items = [
				commandItem(getLabel('bring_to_front'), commandIds.WINDOW_FOCUS, {
					icon: 'dashicons-editor-expand'
				})
			];

			if (browserUrl) {
				items.push(commandItem(getLabel('open_in_browser_tab'), commandIds.WINDOW_OPEN_BROWSER_TAB, {
					icon: 'dashicons-external',
					title: detail.label || (app && app.label ? app.label : ''),
					url: browserUrl
				}));
			}

			items.push(
				commandItem(getLabel('window_minimize'), commandIds.WINDOW_MINIMIZE, {
					icon: 'dashicons-minus'
				}),
				commandItem(getLabel('window_close'), commandIds.WINDOW_CLOSE, {
					icon: 'dashicons-no-alt'
				})
			);

			if (app) {
				items.push(separator(), commandItem(getLabel('about'), commandIds.OPEN_ABOUT, {
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

		registerProvider(targets.WIDGET, (detail) => {
			return {
				groups: [
					{
						id: 'primary',
						items: [
							commandItem(getLabel('remove_widget'), commandIds.WIDGET_HIDE, {
								target: detail.id
							}),
							separator(),
							commandItem(getLabel('edit_widgets'), commandIds.SETTINGS_OPEN_PANEL, {
								panel: 'widgets'
							})
						]
					}
				]
			};
		});

		return {
			getMenuForTarget,
			register,
			registerProvider
		};
	};

	window.PufferDesk.shell.createContextMenuController = function createContextMenuController(shell, config = {}, context = {}) {
		const menuConfig = config.menu && typeof config.menu === 'object' ? config.menu : {};
		const labels = menuConfig.labels && typeof menuConfig.labels === 'object' ? menuConfig.labels : {};
		const schema = window.PufferDesk.shell.createMenuSchema(labels);
		const commands = context.commands || window.PufferDesk.shell.createCommandRegistry(shell, context);
		const registry = context.registry || window.PufferDesk.shell.createContextMenuRegistry(config, schema, context);
		const resolver = context.resolver || (window.PufferDesk.shell.createContextResolver
			? window.PufferDesk.shell.createContextResolver(shell, config, context)
			: null);
		const permissionResolver = context.permissionResolver || (window.PufferDesk.shell.createContextMenuPermissionResolver
			? window.PufferDesk.shell.createContextMenuPermissionResolver(config)
			: null);
		const positioner = context.positioner || (window.PufferDesk.shell.createContextMenuPositioner
			? window.PufferDesk.shell.createContextMenuPositioner(shell)
			: null);
		const itemRenderer = window.PufferDesk.shell.createMenuItemRenderer(commands, {
			positionSubmenu: positioner && typeof positioner.positionSubmenu === 'function'
				? positioner.positionSubmenu
				: null
		});
		const keyboardController = context.keyboardController || (window.PufferDesk.shell.createContextMenuKeyboardController
			? window.PufferDesk.shell.createContextMenuKeyboardController({
				onClose: closeMenu
			})
			: null);
		const themeAdapter = context.themeAdapter || (window.PufferDesk.shell.createContextMenuThemeAdapter
			? window.PufferDesk.shell.createContextMenuThemeAdapter(shell, config)
			: null);
		const folderManager = context.folderManager || null;
		const geometry = window.PufferDesk.geometry;
		const constants = window.PufferDesk.shell.contextMenuConstants || {};
		const targets = constants.targets || {};
		const eventNames = window.PufferDesk.events && window.PufferDesk.events.names ? window.PufferDesk.events.names : {};
		const nativeContextMenuSelector = [
			'[data-pdk-native-context-menu="1"]',
			'input',
			'textarea',
			'select',
			'[contenteditable="true"]',
			'[contenteditable="plaintext-only"]',
			'[role="textbox"]'
		].join(', ');
		const shellChromeSelector = [
			'[data-pdk-shell-surface]',
			'.pdk-menu-bar',
			'.pdk-brand',
			'.pdk-menu-items',
			'.pdk-status-area',
			'.pdk-taskbar-status',
			'.pdk-search-panel',
			'.pdk-search-results',
			'.pdk-notification-center',
			'.pdk-notification-toasts',
			'.pdk-menu-popover'
		].join(', ');
		const dockLongPressDelay = 560;
		const dockLongPressMoveTolerance = 8;
		let popover = null;
		let activeDetail = null;
		let activeContextTarget = null;
		let dockLongPress = null;
		let activeDockPressMenu = null;
		let keyboardCleanup = null;
		let bound = false;

		function getLabel(key, fallback) {
			return typeof labels[key] === 'string' && labels[key] ? labels[key] : (fallback || key);
		}

		function emit(name, detail = {}) {
			if (name && window.PufferDesk.events && typeof window.PufferDesk.events.emit === 'function') {
				window.PufferDesk.events.emit(name, detail);
			}
		}

		function setCommandContext(detail = {}) {
			if (commands && typeof commands.setActiveDetail === 'function') {
				commands.setActiveDetail(detail);
			}
		}

		function toElement(target) {
			if (!target) {
				return null;
			}

			return target.nodeType === 1 ? target : target.parentElement || null;
		}

		function setFacade() {
			window.PufferDesk.contextMenus = Object.assign({}, window.PufferDesk.contextMenus || {}, {
				close: closeMenu,
				getActiveContext() {
					return activeDetail;
				},
				getRegistry() {
					return registry;
				},
				openForElement,
				openMenu,
				register(type, definition, options) {
					return registry && typeof registry.register === 'function'
						? registry.register(type, definition, options)
						: () => {};
				},
				registerProvider(type, provider) {
					return registry && typeof registry.registerProvider === 'function'
						? registry.registerProvider(type, provider)
						: undefined;
				},
				resolve(target) {
					return resolver && typeof resolver.resolve === 'function' ? resolver.resolve(target) : null;
				}
			});
		}

		function getTrashItem(trashId) {
			return folderManager && typeof folderManager.getTrashItem === 'function' ? folderManager.getTrashItem(trashId) : null;
		}

		function getTargetLabel(target) {
			return target.dataset.pdkContextLabel
				|| target.getAttribute('aria-label')
				|| target.getAttribute('title')
				|| '';
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
			return windowId
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

		function isNativeContextMenuTarget(eventTarget) {
			const element = toElement(eventTarget);
			const nativeTarget = element && typeof element.closest === 'function'
				? element.closest(nativeContextMenuSelector)
				: null;

			return Boolean(nativeTarget && shell.contains(nativeTarget));
		}

		function isShellChromeContextTarget(eventTarget) {
			const element = toElement(eventTarget);
			const chrome = element && typeof element.closest === 'function'
				? element.closest(shellChromeSelector)
				: null;

			return Boolean(chrome && shell.contains(chrome));
		}

		function shouldSuppressNativeContextMenu(eventTarget) {
			if (isNativeContextMenuTarget(eventTarget)) {
				return false;
			}

			const element = toElement(eventTarget);
			const explicit = element && typeof element.closest === 'function'
				? element.closest('[data-pdk-context]')
				: null;

			const isWindowBody = Boolean(
				explicit
				&& shell.contains(explicit)
				&& isWindowRootContextTarget(explicit)
				&& !isWindowTitlebarEvent(element, explicit)
			);

			return isWindowBody || isShellChromeContextTarget(element);
		}

		function getTargetDetail(target) {
			const type = target.dataset.pdkContext || targets.DESKTOP;
			const id = target.dataset.pdkContextId || target.dataset.pdkOpenApp || target.dataset.pdkOpenFolder || target.dataset.pdkWidget || '';
			const windowElement = getContextWindowElement(target);
			const app = id && Array.isArray(config.apps) ? config.apps.find((item) => item.id === id) : null;
			const folder = id && folderManager && typeof folderManager.getFolder === 'function'
				? folderManager.getFolder(id)
				: (id && Array.isArray(config.folders) ? config.folders.find((item) => item.id === id) : null);
			const trashItem = type === targets.TRASH_ITEM && id ? getTrashItem(id) : null;
			const widget = id && Array.isArray(config.widgets) ? config.widgets.find((item) => item.id === id) : null;
			const detail = {
				app,
				appId: target.dataset.pdkAppWindow || (windowElement && windowElement.dataset ? windowElement.dataset.pdkAppWindow : '') || (app ? app.id : ''),
				folder,
				folderId: target.dataset.pdkFolderId || '',
				id,
				kind: type,
				label: getTargetLabel(target),
				targetElement: target,
				type,
				trashItem,
				trashItemId: target.dataset.pdkTrashItemId || '',
				widget,
				widgetElement: target.dataset.pdkWidget ? target : null,
				widgetId: target.dataset.pdkWidget || '',
				windowElement
			};

			if (!detail.label) {
				detail.label = app && app.label ? app.label : folder && folder.label ? folder.label : trashItem && trashItem.label ? trashItem.label : widget && widget.label ? widget.label : '';
			}

			if (!detail.label && windowElement && windowElement.dataset) {
				detail.label = windowElement.dataset.pdkWindowTitle || windowElement.getAttribute('aria-label') || '';
			}

			return detail;
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

		function closeMenu() {
			clearDockPressMenuHover();
			if (typeof keyboardCleanup === 'function') {
				keyboardCleanup();
				keyboardCleanup = null;
			}
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
			emit(eventNames.CONTEXT_MENU_CLOSE, {});
		}

		function positionDockMenu(detail = {}) {
			const target = detail.targetElement;
			if (!popover || !target || typeof target.getBoundingClientRect !== 'function') {
				return false;
			}

			const shellRect = shell.getBoundingClientRect();
			const targetRect = target.getBoundingClientRect();
			const dockPosition = shell.dataset.pdkDockPosition || 'bottom';
			const minLeft = 8;
			const minTop = 8;
			const maxLeft = Math.max(minLeft, shell.clientWidth - popover.offsetWidth - 8);
			const maxTop = Math.max(minTop, shell.clientHeight - popover.offsetHeight - 8);
			const targetCenterX = targetRect.left - shellRect.left + (targetRect.width / 2);
			const targetCenterY = targetRect.top - shellRect.top + (targetRect.height / 2);
			const gap = 26;
			const preferredMenuOffset = geometry.clamp(Math.round(popover.offsetWidth * 0.24), 52, 66);
			let left = targetCenterX - preferredMenuOffset;
			let top = targetRect.top - shellRect.top - popover.offsetHeight - gap;

			if (dockPosition === 'left') {
				left = targetRect.right - shellRect.left + gap;
				top = targetCenterY - (popover.offsetHeight / 2);
			} else if (dockPosition === 'right') {
				left = targetRect.left - shellRect.left - popover.offsetWidth - gap;
				top = targetCenterY - (popover.offsetHeight / 2);
			}

			left = geometry.clamp(Math.round(left), minLeft, maxLeft);
			top = geometry.clamp(Math.round(top), minTop, maxTop);
			delete popover.dataset.pdkDockContextPlacement;
			popover.style.left = `${left}px`;
			popover.style.top = `${top}px`;

			return true;
		}

		function positionMenu(clientX, clientY, detail = {}) {
			if (!popover) {
				return;
			}

			if (detail.type === targets.DOCK_APP && positionDockMenu(detail)) {
				return;
			}

			const shellRect = shell.getBoundingClientRect();
			const minLeft = 8;
			const minTop = 8;
			const maxLeft = Math.max(minLeft, shell.clientWidth - popover.offsetWidth - 8);
			const maxTop = Math.max(minTop, shell.clientHeight - popover.offsetHeight - 8);
			const left = geometry.clamp(Math.round(clientX - shellRect.left), minLeft, maxLeft);
			const top = geometry.clamp(Math.round(clientY - shellRect.top), minTop, maxTop);

			popover.style.left = `${left}px`;
			popover.style.top = `${top}px`;
		}

		function activateContextTarget(detail = {}) {
			if (!detail.targetElement || ![targets.DOCK_APP, targets.TRASH_ITEM].includes(detail.type)) {
				return;
			}

			activeContextTarget = detail.targetElement;
			activeContextTarget.classList.add('is-context-menu-active');
			if (detail.type === targets.DOCK_APP) {
				activeContextTarget.classList.add('is-tooltip-dismissed');
			}
		}

		function hasMenuItems(menuDefinition) {
			return Boolean(menuDefinition.groups.some((group) => group.items.length));
		}

		function trimMenuSeparators(items = []) {
			const trimmed = [];
			let previousWasSeparator = true;

			items.forEach((item) => {
				if (!item) {
					return;
				}

				if (item.type === 'separator') {
					if (!previousWasSeparator) {
						trimmed.push(item);
					}
					previousWasSeparator = true;
					return;
				}

				trimmed.push(item);
				previousWasSeparator = false;
			});

			while (trimmed.length && trimmed[trimmed.length - 1].type === 'separator') {
				trimmed.pop();
			}

			return trimmed;
		}

		function filterUnavailableItems(items = [], detail = {}) {
			return trimMenuSeparators((Array.isArray(items) ? items : []).map((item) => {
				if (!item) {
					return null;
				}

				if (item.type === 'separator') {
					return item;
				}

				if (
					item.hideWhenUnavailable
					&& item.command
					&& commands
					&& typeof commands.canExecute === 'function'
					&& !commands.canExecute(item, detail)
				) {
					return null;
				}

				if (Array.isArray(item.items) && item.items.length) {
					const next = Object.assign({}, item, {
						items: filterUnavailableItems(item.items, detail)
					});

					return next.items.length ? next : null;
				}

				return item;
			}).filter(Boolean));
		}

		function filterUnavailableMenuItems(menuDefinition, detail = {}) {
			const groups = menuDefinition && Array.isArray(menuDefinition.groups) ? menuDefinition.groups : [];

			return {
				groups: groups
					.map((group) => Object.assign({}, group, {
						items: filterUnavailableItems(group.items, detail)
					}))
					.filter((group) => group.items.length)
			};
		}

		function openMenu(detail, point) {
			try {
				const nextDetail = Object.assign({}, detail, {
					contextPoint: {
						clientX: point.x,
						clientY: point.y
					}
				});
				const menuDefinition = nextDetail.menuDefinition
					? schema.normalizeDefinition(nextDetail.menuDefinition, {
						appLabel: nextDetail.label || getLabel('context_menu')
					})
					: registry.getMenuForTarget(nextDetail);
				const filteredMenuDefinition = permissionResolver && typeof permissionResolver.filterMenu === 'function'
					? permissionResolver.filterMenu(menuDefinition, nextDetail)
					: menuDefinition;
				const visibleMenuDefinition = filterUnavailableMenuItems(filteredMenuDefinition, nextDetail);

				if (!hasMenuItems(visibleMenuDefinition)) {
					closeMenu();
					return false;
				}

				closeMenu();
				activeDetail = nextDetail;
				setCommandContext(activeDetail);
				emit(eventNames.CONTEXT_MENU_OPEN, {
					context: activeDetail
				});
				popover = document.createElement('div');
				popover.className = 'pdk-menu-popover pdk-context-menu';
				if (typeof activeDetail.menuClassName === 'string' && activeDetail.menuClassName) {
					activeDetail.menuClassName.split(/\s+/).filter(Boolean).forEach((className) => {
						popover.classList.add(className);
					});
				}
				popover.setAttribute('role', 'menu');
				popover.setAttribute('aria-label', activeDetail.label || getLabel('context_menu'));
				if (activeDetail.menuDataset && typeof activeDetail.menuDataset === 'object') {
					Object.keys(activeDetail.menuDataset).forEach((key) => {
						if (typeof key === 'string' && key && activeDetail.menuDataset[key] !== undefined) {
							popover.dataset[key] = String(activeDetail.menuDataset[key]);
						}
					});
				}
				if (themeAdapter && typeof themeAdapter.apply === 'function') {
					themeAdapter.apply(popover, activeDetail);
				} else {
					popover.dataset.pdkContextMenu = activeDetail.type;
				}
				popover.replaceChildren(...visibleMenuDefinition.groups.flatMap((group, groupIndex) => {
					const groupItems = group.items.map((item) => itemRenderer.createItem(item, activeDetail, (executedItem, executedContext) => {
						emit(eventNames.CONTEXT_MENU_ITEM_EXECUTE, {
							context: executedContext,
							item: executedItem
						});
						closeMenu();
					}));
					if (groupIndex === 0) {
						return groupItems;
					}

					const separator = document.createElement('span');
					separator.className = 'pdk-menu-separator';
					separator.setAttribute('role', 'separator');
					return [separator].concat(groupItems);
				}));

				shell.appendChild(popover);
				activateContextTarget(activeDetail);
				if (keyboardController && typeof keyboardController.bind === 'function') {
					keyboardCleanup = keyboardController.bind(popover);
				}
				popover.addEventListener('pointerover', emitHoveredItem);
				popover.addEventListener('focusin', emitHoveredItem);
				if (positioner && typeof positioner.positionAtPoint === 'function') {
					positioner.positionAtPoint(popover, point, activeDetail);
				} else {
					positionMenu(point.x, point.y, activeDetail);
				}
				if (activeDetail.autoFocusFirst && keyboardController && typeof keyboardController.focusFirst === 'function') {
					keyboardController.focusFirst(popover);
				}
				emit(eventNames.CONTEXT_MENU_RENDER, {
					context: activeDetail,
					menu: visibleMenuDefinition,
					popover
				});

				return true;
			} catch (error) {
				if (window.console && typeof window.console.error === 'function') {
					window.console.error('PufferDesk context menu failed.', error);
				}
				emit(eventNames.CONTEXT_MENU_ERROR, {
					context: detail || {},
					error
				});
				closeMenu();
				return false;
			}
		}

		function emitHoveredItem(event) {
			const item = event.target && typeof event.target.closest === 'function'
				? event.target.closest('[data-pdk-menu-item]')
				: null;

			if (!item || !popover || !popover.contains(item)) {
				return;
			}

			emit(eventNames.CONTEXT_MENU_ITEM_HOVER, {
				context: activeDetail,
				itemId: item.dataset.pdkMenuItem || ''
			});
		}

		function openForElement(target, point = {}) {
			if (!target || !shell.contains(target)) {
				closeMenu();
				return false;
			}

			const detail = resolver && typeof resolver.getTargetDetail === 'function' ? resolver.getTargetDetail(target) : getTargetDetail(target);
			if (!detail || !detail.type) {
				closeMenu();
				return false;
			}

			const rect = typeof target.getBoundingClientRect === 'function' ? target.getBoundingClientRect() : null;
			const opened = openMenu(detail, {
				x: Number.isFinite(point.x) ? point.x : rect ? rect.left + (rect.width / 2) : 0,
				y: Number.isFinite(point.y) ? point.y : rect ? rect.top + (rect.height / 2) : 0
			});
			if (opened && positioner && typeof positioner.positionAtElement === 'function') {
				positioner.positionAtElement(popover, target, point, activeDetail);
			}

			return opened;
		}

		function openFromEvent(event) {
			const keepsNativeContextMenu = resolver && typeof resolver.isNativeContextMenuTarget === 'function'
				? resolver.isNativeContextMenuTarget(event.target)
				: isNativeContextMenuTarget(event.target);
			if (keepsNativeContextMenu) {
				closeMenu();
				return false;
			}

			if (resolver && typeof resolver.isContextMenuDisabled === 'function' && resolver.isContextMenuDisabled(event.target)) {
				closeMenu();
				event.preventDefault();
				event.stopPropagation();
				return false;
			}

			const target = resolver && typeof resolver.resolveTarget === 'function' ? resolver.resolveTarget(event.target) : resolveTarget(event.target);
			if (!target) {
				closeMenu();
				if (resolver && typeof resolver.shouldSuppressNativeContextMenu === 'function' ? resolver.shouldSuppressNativeContextMenu(event.target) : shouldSuppressNativeContextMenu(event.target)) {
					event.preventDefault();
					event.stopPropagation();
				}
				return false;
			}

			const detail = resolver && typeof resolver.getTargetDetail === 'function' ? resolver.getTargetDetail(target) : getTargetDetail(target);
			emit(eventNames.CONTEXT_MENU_RESOLVE, {
				context: detail,
				event,
				target
			});
			const opened = openMenu(detail, {
				x: event.clientX,
				y: event.clientY
			});

			event.preventDefault();
			event.stopPropagation();

			return opened;
		}

		function getDockLongPressTarget(target) {
			const item = target && typeof target.closest === 'function'
				? target.closest(`[data-pdk-context="${targets.DOCK_APP}"]`)
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
			target.dataset.pdkDockLongPressOpen = '1';
			window.setTimeout(() => {
				if (target.dataset.pdkDockLongPressOpen === '1') {
					delete target.dataset.pdkDockLongPressOpen;
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
				? element.closest('.pdk-context-menu .pdk-menu-item:not(:disabled)')
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

			if (item && !item.classList.contains('pdk-menu-submenu-trigger')) {
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
				const target = getDockLongPressTarget(event.target) || shell.querySelector('[data-pdk-dock-long-press-open="1"]');
				if (!target || target.dataset.pdkDockLongPressOpen !== '1') {
					return;
				}

				delete target.dataset.pdkDockLongPressOpen;
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
			if (bound) {
				return;
			}

			bound = true;
			setFacade();
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

	window.PufferDesk.shell.createContextMenuManager = window.PufferDesk.shell.createContextMenuController;
})();
