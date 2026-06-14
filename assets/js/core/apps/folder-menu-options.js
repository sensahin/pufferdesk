(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};

	window.PufferDesk.apps.createFolderMenuOptions = function createFolderMenuOptions(options = {}) {
		const folderViewModes = window.PufferDesk.apps.folderViewModes;
		const getMenuLabel = typeof options.getMenuLabel === 'function' ? options.getMenuLabel : (key, fallback) => fallback;
		const commandIds = (window.PufferDesk.shell && window.PufferDesk.shell.commands) || {};

		function menuItem(label, command, itemOptions = {}) {
			return Object.assign({
				command,
				label
			}, itemOptions);
		}

		function separator() {
			return { type: 'separator' };
		}

		function modeItem(label, command, mode, activeMode, folderId, itemOptions = {}) {
			return menuItem(label, command, Object.assign({
				icon: mode === activeMode ? 'dashicons-yes' : '',
				payload: {
					folderId,
					mode,
					target: folderId
				},
				target: folderId
			}, itemOptions));
		}

		function getViewModeOptions(layout) {
			return folderViewModes && typeof folderViewModes.getOptions === 'function'
				? folderViewModes.getOptions(layout)
				: [];
		}

		function getViewModeLabel(option) {
			return folderViewModes && typeof folderViewModes.getLabel === 'function'
				? folderViewModes.getLabel(option, getMenuLabel)
				: '';
		}

		function getViewModeItems(folderId, itemOptions = {}) {
			const layout = itemOptions.layout || 'finder';
			const activeMode = folderViewModes && typeof folderViewModes.normalize === 'function'
				? folderViewModes.normalize(itemOptions.activeMode || '', layout)
				: (itemOptions.activeMode || '');
			const items = [];
			let previousGroup = '';

			getViewModeOptions(layout).forEach((option) => {
				if (previousGroup && previousGroup !== option.group) {
					items.push(separator());
				}

				items.push(modeItem(getViewModeLabel(option), commandIds.FOLDER_SET_VIEW_MODE, option.mode, activeMode, folderId));
				previousGroup = option.group;
			});

			return items;
		}

		function getSortModeItems(folderId, itemOptions = {}) {
			const activeMode = itemOptions.activeMode || 'none';
			const layout = itemOptions.layout || 'finder';
			const dateItem = layout === 'file-explorer'
				? modeItem(getMenuLabel('sort_date_modified'), commandIds.FOLDER_SET_SORT_MODE, 'date-modified', activeMode, folderId)
				: modeItem(getMenuLabel('sort_date_added'), commandIds.FOLDER_SET_SORT_MODE, 'date-added', activeMode, folderId);
			const kindLabel = layout === 'file-explorer' ? getMenuLabel('type') : getMenuLabel('sort_kind');

			return [
				modeItem(getMenuLabel('sort_none'), commandIds.FOLDER_SET_SORT_MODE, 'none', activeMode, folderId),
				separator(),
				modeItem(getMenuLabel('sort_name'), commandIds.FOLDER_SET_SORT_MODE, 'name', activeMode, folderId),
				dateItem,
				modeItem(kindLabel, commandIds.FOLDER_SET_SORT_MODE, 'kind', activeMode, folderId),
				modeItem(getMenuLabel('sort_size'), commandIds.FOLDER_SET_SORT_MODE, 'size', activeMode, folderId)
			];
		}

		function getGroupModeOptions(layout) {
			return folderViewModes && typeof folderViewModes.getGroupOptions === 'function'
				? folderViewModes.getGroupOptions(layout)
				: [];
		}

		function getGroupModeItems(folderId, itemOptions = {}) {
			const layout = itemOptions.layout || 'finder';
			const activeMode = itemOptions.activeMode || 'none';

			return getGroupModeOptions(layout).map((option, index) => {
				const item = modeItem(getMenuLabel(option.key), commandIds.FOLDER_SET_GROUP_MODE, option.mode, activeMode, folderId);

				return index === 1
					? [separator(), item]
					: item;
			}).flat();
		}

		function getFolderContentItems(folderId, itemOptions = {}) {
			const layout = itemOptions.layout || 'finder';
			const viewItems = getViewModeItems(folderId, {
				activeMode: itemOptions.viewMode || '',
				layout
			});
			const sortItems = getSortModeItems(folderId, {
				activeMode: itemOptions.sortMode || 'none',
				layout
			});
			const groupItems = getGroupModeItems(folderId, {
				activeMode: itemOptions.groupMode || 'none',
				layout
			});
			const infoLabel = itemOptions.infoLabel || getMenuLabel('get_info');
			const sortByLabel = itemOptions.sortByLabel || getMenuLabel('sort_by');

			return [
				menuItem(getMenuLabel('new_folder'), commandIds.FOLDER_CREATE, {
					hideWhenUnavailable: true,
					icon: 'dashicons-category',
					id: 'folder-content-new-folder',
					payload: {
						folderId,
						parentId: folderId,
						target: folderId
					},
					target: folderId
				}),
				menuItem(getMenuLabel('new_sticky_note'), commandIds.DOCUMENT_NEW_STICKY_NOTE, {
					hideWhenUnavailable: true,
					icon: 'dashicons-sticky',
					id: 'folder-content-new-sticky-note',
					payload: {
						folderId,
						parentId: folderId,
						target: folderId
					},
					target: folderId
				}),
				menuItem(infoLabel, commandIds.FOLDER_GET_INFO, {
					icon: 'dashicons-info-outline',
					payload: {
						folderId,
						target: folderId
					},
					shortcut: itemOptions.infoShortcut || '',
					target: folderId
				}),
				{
					icon: 'dashicons-grid-view',
					id: 'folder-content-view',
					items: viewItems,
					label: getMenuLabel('view')
				},
				{
					icon: 'dashicons-sort',
					id: 'folder-content-sort-by',
					items: sortItems,
					label: sortByLabel
				},
				{
					icon: 'dashicons-screenoptions',
					id: 'folder-content-group-by',
					items: groupItems,
					label: getMenuLabel('group')
				}
			];
		}

		return {
			getFolderContentItems,
			getGroupModeItems,
			getSortModeItems,
			getViewModeItems,
			getViewModeOptions,
			menuItem,
			modeItem,
			separator
		};
	};
})();
