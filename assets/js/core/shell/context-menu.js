(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.shell = window.PufferDesk.shell || {};

	window.PufferDesk.shell.createContextMenuRegistry = function createContextMenuRegistry(config = {}, schema = null, context = {}) {
		const appMap = new Map((Array.isArray(config.apps) ? config.apps : []).map((app) => [app.id, app]));
		const folderMap = new Map((Array.isArray(config.folders) ? config.folders : []).map((folder) => [folder.id, folder]));
		const widgetMap = new Map((Array.isArray(config.widgets) ? config.widgets : []).map((widget) => [widget.id, widget]));
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
		const themeFamily = config.theme && typeof config.theme.family === 'string' ? config.theme.family : '';
		const folderMenuOptions = window.PufferDesk.apps && typeof window.PufferDesk.apps.createFolderMenuOptions === 'function'
			? window.PufferDesk.apps.createFolderMenuOptions({
				getMenuLabel: getLabel
			})
			: null;
		const folderViewModes = window.PufferDesk.apps && window.PufferDesk.apps.folderViewModes
			? window.PufferDesk.apps.folderViewModes
			: null;

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

		function disabledItem(label, options = {}) {
			return commandItem(label, '', Object.assign({}, options, {
				disabled: true
			}));
		}

		function getSidebarAddLabel() {
			return themeFamily === 'redmond' ? getLabel('pin_to_quick_access') : getLabel('add_to_sidebar');
		}

		function getSidebarRemoveLabel() {
			return themeFamily === 'redmond' ? getLabel('unpin_from_quick_access') : getLabel('remove_from_sidebar');
		}

		function getClipboardItems(options = {}) {
			const includeCut = options.includeCut !== false && showsCutMenuItems();
			const includeCopy = options.includeCopy !== false;
			const includePaste = options.includePaste !== false;
			const items = [];

			if (includeCut) {
				items.push(commandItem(getLabel('cut'), commandIds.CLIPBOARD_CUT, {
					hideWhenUnavailable: true,
					icon: 'dashicons-admin-page',
					id: 'cut',
					shortcut: options.shortcutLabels === false ? '' : shortcut('primary+x')
				}));
			}
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

		function getTrashCount() {
			return folderManager && typeof folderManager.getTrashCount === 'function' ? folderManager.getTrashCount() : 0;
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

		function isTrashFolder(folder) {
			return Boolean(folder && folder.id === appIds.TRASH);
		}

		function isFileExplorerSurface() {
			return themeSurfaces.folder === 'file-explorer';
		}

		function isRedmondFamily() {
			return themeFamily === 'redmond';
		}

		function isPufferDeskFamily() {
			return themeFamily === 'pufferdesk';
		}

		function showsCutMenuItems() {
			return themeFamily !== 'pufferdesk';
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

			const win = appId ? document.querySelector(`[data-pdk-app-window="${window.PufferDesk.dom.escapeAttribute(appId)}"]:not(.is-closed)`) : null;

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

		function getRedmondDesktopViewItems() {
			return [
				disabledItem(getLabel('large_icons'), {
					icon: 'dashicons-screenoptions',
					id: 'desktop-view-large-icons'
				}),
				disabledItem(getLabel('medium_icons'), {
					icon: 'dashicons-screenoptions',
					id: 'desktop-view-medium-icons'
				}),
				disabledItem(getLabel('small_icons'), {
					icon: 'dashicons-screenoptions',
					id: 'desktop-view-small-icons'
				}),
				separator(),
				sortByItem(getLabel('sort_snap_to_grid'), 'snap-to-grid')
			];
		}

		function getRedmondDesktopSortByItems() {
			return [
				sortByItem(getLabel('sort_name'), 'name'),
				sortByItem(getLabel('sort_size'), 'size'),
				sortByItem(getLabel('sort_kind'), 'kind'),
				sortByItem(getLabel('sort_date_modified'), 'date-modified')
			];
		}

		function getRedmondDesktopMenu() {
			return {
				groups: [
					{
						id: 'primary',
						items: [
							commandItem(getLabel('paste'), commandIds.CLIPBOARD_PASTE, {
								hideWhenUnavailable: true,
								icon: 'dashicons-admin-page',
								id: 'desktop-paste',
								shortcut: shortcut('primary+v')
							}),
							separator(),
							{
								icon: 'dashicons-grid-view',
								id: 'desktop-view',
								items: getRedmondDesktopViewItems(),
								label: getLabel('view')
							},
							{
								icon: 'dashicons-sort',
								id: 'desktop-sort-by',
								items: getRedmondDesktopSortByItems(),
								label: getLabel('sort_by_sentence')
							},
							commandItem(getLabel('refresh'), commandIds.DESKTOP_REFRESH, {
								icon: 'dashicons-update',
								id: 'desktop-refresh'
							})
						]
					},
					{
						id: 'create',
						items: [
							{
								icon: 'dashicons-plus-alt2',
								id: 'desktop-new',
								items: [
									commandItem(getLabel('folder'), commandIds.FOLDER_CREATE, {
										icon: 'dashicons-category',
										id: 'desktop-new-folder'
									}),
									commandItem(getLabel('new_sticky_note'), commandIds.DOCUMENT_NEW_STICKY_NOTE, {
										icon: 'dashicons-sticky',
										id: 'desktop-new-sticky-note'
									})
								],
								label: getLabel('new')
							}
						]
					},
					{
						id: 'display',
						items: [
							commandItem(getLabel('explore_background'), commandIds.SETTINGS_OPEN_PANEL, {
								icon: 'dashicons-format-image',
								id: 'desktop-explore-background',
								panel: 'wallpaper'
							}),
							disabledItem(getLabel('next_background'), {
								icon: 'dashicons-format-gallery',
								id: 'desktop-next-background'
							}),
							commandItem(getLabel('display_settings'), commandIds.SETTINGS_OPEN_PANEL, {
								icon: 'dashicons-desktop',
								id: 'desktop-display-settings',
								panel: 'desktop-dock'
							}),
							commandItem(getLabel('personalize'), commandIds.SETTINGS_OPEN_PANEL, {
								icon: 'dashicons-edit',
								id: 'desktop-personalize',
								panel: 'appearance'
							})
						]
					},
					{
						id: 'system',
						items: [
							disabledItem(getLabel('open_in_terminal'), {
								icon: 'dashicons-editor-code',
								id: 'desktop-open-terminal'
							})
						]
					},
					{
						id: 'more-options',
						items: [
							disabledItem(getLabel('show_more_options'), {
								icon: 'dashicons-external',
								id: 'desktop-show-more-options'
							})
						]
					}
				]
			};
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
					sortByLabel: isRedmondFamily() ? getLabel('sort_by_sentence') : getLabel('sort_by'),
					sortMode: getFolderContentSortMode(detail),
					viewMode: getFolderContentViewMode(detail)
				})
				: [];
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

			if (detail.type === targets.DESKTOP_APP && isRedmondFamily() && app.id === appIds.TRASH) {
				return getRedmondRecycleBinItems(app);
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

			if (app.url) {
				items.push(commandItem(getLabel('open_in_browser_tab'), commandIds.WINDOW_OPEN_BROWSER_TAB, {
					icon: 'dashicons-external',
					title: app.label || '',
					url: app.url
				}));
			}

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

		function getRedmondRecycleBinItems(app) {
			const hasTrashItems = getTrashCount() > 0;

			return [
				actionStrip([
					commandItem(getLabel('rename'), commandIds.DESKTOP_ICON_RENAME, {
						icon: 'dashicons-edit',
						id: 'rename',
						target: app.id
					})
				], {
					id: 'recycle-bin-actions'
				}),
				commandItem(getLabel('open'), commandIds.OPEN_APP, {
					icon: app.icon || 'dashicons-trash',
					id: 'recycle-bin-open',
					shortcut: getLabel('enter_key'),
					target: app.id
				}),
				commandItem(getLabel('empty_trash'), commandIds.TRASH_EMPTY, {
					disabled: !hasTrashItems,
					icon: 'dashicons-trash',
					id: 'recycle-bin-empty'
				}),
				disabledItem(getLabel('pin_to_quick_access'), {
					icon: 'dashicons-admin-links',
					id: 'recycle-bin-pin-quick-access'
				}),
				disabledItem(getLabel('pin_to_start'), {
					icon: 'dashicons-admin-links',
					id: 'recycle-bin-pin-start'
				}),
				commandItem(getLabel('properties'), commandIds.FOLDER_GET_INFO, {
					icon: 'dashicons-admin-tools',
					id: 'recycle-bin-properties',
					shortcut: shortcut('secondary+enter'),
					target: appIds.TRASH
				}),
				separator(),
				disabledItem(getLabel('show_more_options'), {
					icon: 'dashicons-external',
					id: 'recycle-bin-show-more-options'
				})
			];
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

			if (app.id === appIds.STICKY_NOTES && isPufferDeskFamily()) {
				return getPufferDeskStickyNotesDockItems(app);
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

		function getPufferDeskStickyNotesDockItems(app) {
			const hasVisibleNotes = Boolean(
				stickyNoteManager
				&& typeof stickyNoteManager.hasOpenNotes === 'function'
				&& stickyNoteManager.hasOpenNotes()
			);
			const state = getAppWindowState(app.id);
			const items = [
				hasVisibleNotes
					? commandItem(getLabel('new_note', getLabel('new_sticky_note')), commandIds.DOCUMENT_NEW_STICKY_NOTE, {
						icon: app.icon || defaultDashicon,
						target: app.id
					})
					: commandItem(getLabel('open'), commandIds.DOCUMENT_OPEN_STICKY_NOTES, {
						icon: app.icon || defaultDashicon,
						target: app.id
					})
			];

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

		function getSoundPreferences() {
			if (window.PufferDesk.soundStatus && typeof window.PufferDesk.soundStatus.getPreferences === 'function') {
				return window.PufferDesk.soundStatus.getPreferences();
			}

			if (window.PufferDesk.sound && typeof window.PufferDesk.sound.getPreferences === 'function') {
				return window.PufferDesk.sound.getPreferences();
			}

			return {};
		}

		function isSoundMuted() {
			const preferences = getSoundPreferences();
			const volume = Number.parseInt(preferences.volume, 10);

			return preferences.enabled === false || (Number.isFinite(volume) && volume <= 0);
		}

		function getSoundStatusItems() {
			const muted = isSoundMuted();

			return [
				commandItem(muted ? getLabel('sound_unmute') : getLabel('sound_mute'), commandIds.SOUND_TOGGLE_MUTE, {
					icon: muted ? 'dashicons-controls-volumeon' : 'dashicons-controls-volumeoff',
					id: 'sound-toggle-mute'
				}),
				commandItem(getLabel('sound_settings'), commandIds.SETTINGS_OPEN_PANEL, {
					icon: 'dashicons-format-audio',
					id: 'sound-settings',
					panel: 'sounds'
				})
			];
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

				items.push(
					separator(),
					commandItem(getLabel('copy'), commandIds.CLIPBOARD_COPY, {
						icon: 'dashicons-clipboard',
						id: 'copy',
						shortcut: shortcut('primary+c')
					})
				);

				if (showsCutMenuItems()) {
					items.push(commandItem(getLabel('cut'), commandIds.CLIPBOARD_CUT, {
						hideWhenUnavailable: true,
						icon: 'dashicons-admin-page',
						id: 'cut',
						shortcut: shortcut('primary+x')
					}));
				}

				return items;
			}

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
					commandItem(getLabel('rename'), canMutateFolder ? commandIds.FOLDER_RENAME : '', {
						disabled: !canMutateFolder,
						icon: 'dashicons-edit',
						id: 'rename',
						target: folder.id
					}),
					commandItem(getLabel('delete'), canMutateFolder ? commandIds.FOLDER_DELETE : '', {
						disabled: !canMutateFolder,
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
				}),
				commandItem(getSidebarAddLabel(), commandIds.FOLDER_SIDEBAR_ADD, {
					hideWhenUnavailable: true,
					icon: 'dashicons-admin-links',
					id: useExplorerMenu ? 'pin-to-quick-access' : 'add-to-sidebar',
					payload: {
						icon: folder.icon || 'dashicons-category',
						label: folder.label || getLabel('folder'),
						targetId: folder.id,
						type: 'folder'
					},
					target: folder.id
				})
			);

			if (useExplorerMenu) {
				items.push(
					commandItem(getLabel('open_in_new_window'), commandIds.OPEN_FOLDER_WINDOW, {
						icon: 'dashicons-external',
						id: 'open-in-new-window',
						target: folder.id
					}),
					disabledItem(getLabel('pin_to_start'), {
						icon: 'dashicons-admin-links',
						id: 'pin-to-start'
					}),
					{
						icon: 'dashicons-archive',
						id: 'compress-to',
						items: [
							disabledItem(getLabel('zip_file')),
							disabledItem(getLabel('compressed_folder'))
						],
						label: getLabel('compress_to')
					},
					disabledItem(getLabel('copy_as_path'), {
						icon: 'dashicons-media-code',
						id: 'copy-as-path',
						shortcut: 'Ctrl+Shift+C'
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
				items.push(
					separator(),
					disabledItem(getLabel('open_in_terminal'), {
						icon: 'dashicons-editor-code',
						id: 'open-in-terminal'
					}),
					separator(),
					disabledItem(getLabel('show_more_options'), {
						icon: 'dashicons-external',
						id: 'show-more-options'
					})
				);
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
			if (isRedmondFamily()) {
				return getRedmondDesktopMenu();
			}

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

		registerProvider(itemTypes.APP, (detail) => ({
			groups: [
				getClipboardGroup(),
				{
					id: 'primary',
					items: getAppItems(detail.app || appMap.get(detail.id), detail)
				}
			]
		}));
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

		registerProvider(targets.SOUND_STATUS, () => ({
			groups: [
				{
					id: 'primary',
					items: getSoundStatusItems()
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
					items: [
						commandItem(getSidebarRemoveLabel(), commandIds.FOLDER_SIDEBAR_REMOVE, {
							icon: 'dashicons-no-alt',
							payload: {
								favoriteId: detail.id,
								targetId: detail.metadata && detail.metadata.dataset ? detail.metadata.dataset.pdkFolderSidebarTargetId || '' : '',
								type: detail.metadata && detail.metadata.dataset ? detail.metadata.dataset.pdkFolderSidebarFavoriteType || '' : ''
							},
							target: detail.id
						})
					]
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
					...pasteItems,
					separator(),
					contentItems[1],
					separator(),
					refreshItem,
					separator(),
					contentItems[2],
					contentItems[3],
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
				getClipboardGroup(),
				{
					id: 'primary',
					items: [
						commandItem(getLabel('open'), commandIds.DOCUMENT_OPEN, {
							icon: 'dashicons-media-document',
							target: detail.id
						}),
						commandItem(getSidebarAddLabel(), commandIds.FOLDER_SIDEBAR_ADD, {
							hideWhenUnavailable: true,
							icon: 'dashicons-admin-links',
							payload: {
								label: detail.label || getLabel('sticky_note'),
								targetId: detail.metadata && detail.metadata.dataset ? detail.metadata.dataset.pdkDocumentId || detail.id : detail.id,
								type: 'document'
							},
							target: detail.id
						}),
						commandItem(getLabel('move_to_trash'), commandIds.FOLDER_DELETE_SELECTED, {
							icon: 'dashicons-trash',
							payload: {
								folderId: detail.folderId || '',
								target: detail.folderId || ''
							},
							target: detail.folderId || ''
						})
					]
				}
			]
		}));
		registerProvider(targets.STICKY_NOTE, () => ({
			groups: [
				getClipboardGroup()
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
							commandItem(getLabel('close_tabs_to_right'), commandIds.FOLDER_TAB_CLOSE_RIGHT, Object.assign({
								disabled: tabDetails.index < 0 || tabDetails.index >= tabDetails.tabCount - 1
							}, payload)),
							separator(),
							commandItem(getLabel('duplicate_tab'), commandIds.FOLDER_TAB_DUPLICATE, Object.assign({
								icon: 'dashicons-admin-page'
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
			const win = detail.windowElement || null;
			const isHidden = Boolean(win && win.classList && (win.classList.contains('is-hidden') || win.classList.contains('is-minimizing') || win.classList.contains('is-show-desktop-hidden')));
			const isMaximized = Boolean(win && win.classList && win.classList.contains('is-maximized'));
			if (isRedmondFamily()) {
				return {
					groups: [
						{
							id: 'primary',
							items: [
								commandItem(getLabel('window_restore'), commandIds.WINDOW_FOCUS, {
									disabled: !isHidden,
									icon: 'dashicons-image-rotate'
								}),
								disabledItem(getLabel('window_move'), {
									icon: 'dashicons-move'
								}),
								disabledItem(getLabel('window_size'), {
									icon: 'dashicons-editor-expand'
								}),
								commandItem(getLabel('window_minimize'), commandIds.WINDOW_MINIMIZE, {
									icon: 'dashicons-minus'
								}),
								commandItem(isMaximized ? getLabel('window_restore') : getLabel('window_maximize'), commandIds.WINDOW_TOGGLE_MAXIMIZE, {
									icon: 'dashicons-editor-expand'
								}),
								separator(),
								commandItem(getLabel('window_close'), commandIds.WINDOW_CLOSE, {
									icon: 'dashicons-no-alt',
									shortcut: shortcut('secondary+f4', {
										contexts: [shortcutContexts.WINDOW]
									})
								})
							]
						}
					]
				};
			}
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
			const widget = detail.widget || widgetMap.get(detail.id);
			return {
				groups: [
					{
					id: 'primary',
					items: [
							commandItem(getLabel('hide_widget'), commandIds.WIDGET_HIDE, {
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
		const itemRenderer = window.PufferDesk.shell.createMenuItemRenderer(commands);
		const resolver = context.resolver || (window.PufferDesk.shell.createContextResolver
			? window.PufferDesk.shell.createContextResolver(shell, config, context)
			: null);
		const permissionResolver = context.permissionResolver || (window.PufferDesk.shell.createContextMenuPermissionResolver
			? window.PufferDesk.shell.createContextMenuPermissionResolver(config)
			: null);
		const positioner = context.positioner || (window.PufferDesk.shell.createContextMenuPositioner
			? window.PufferDesk.shell.createContextMenuPositioner(shell)
			: null);
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
		const dockLongPressDelay = 560;
		const dockLongPressMoveTolerance = 8;
		let popover = null;
		let activeDetail = null;
		let activeContextTarget = null;
		let dockLongPress = null;
		let activeDockPressMenu = null;
		let keyboardCleanup = null;
		let bound = false;

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
			const titlebar = eventTarget && typeof eventTarget.closest === 'function'
				? eventTarget.closest('.pdk-window-titlebar')
				: null;

			return Boolean(titlebar && win && titlebar.closest('.pdk-window') === win);
		}

		function shouldSuppressNativeContextMenu(eventTarget) {
			const explicit = eventTarget && typeof eventTarget.closest === 'function'
				? eventTarget.closest('[data-pdk-context]')
				: null;

			return Boolean(
				explicit
				&& shell.contains(explicit)
				&& isWindowRootContextTarget(explicit)
				&& !isWindowTitlebarEvent(eventTarget, explicit)
			);
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
			if (!eventTarget || !shell.contains(eventTarget)) {
				return null;
			}

			if (eventTarget.closest('.pdk-context-menu')) {
				return null;
			}

			const explicit = eventTarget.closest('[data-pdk-context]');
			if (explicit && shell.contains(explicit)) {
				if (isWindowRootContextTarget(explicit) && !isWindowTitlebarEvent(eventTarget, explicit)) {
					return null;
				}

				return explicit;
			}

			const desktop = shell.querySelector('.pdk-desktop');
			return desktop && desktop.contains(eventTarget) ? desktop : null;
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
			const nativeContextTarget = event.target && typeof event.target.closest === 'function'
				? event.target.closest('[data-pdk-native-context-menu="1"]')
				: null;
			if (nativeContextTarget && shell.contains(nativeContextTarget)) {
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
