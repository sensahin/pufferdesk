(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};

	window.PufferDesk.apps.createFolderRenderer = function createFolderRenderer(options = {}) {
		const getFolderApps = typeof options.getFolderApps === 'function' ? options.getFolderApps : () => [];
		const getFolderChildFolders = typeof options.getFolderChildFolders === 'function' ? options.getFolderChildFolders : () => [];
		const getFolderDocuments = typeof options.getFolderDocuments === 'function' ? options.getFolderDocuments : () => [];
		const getTrashItems = typeof options.getTrashItems === 'function' ? options.getTrashItems : () => [];
		const getMenuLabel = typeof options.getMenuLabel === 'function' ? options.getMenuLabel : (key, fallback) => fallback || key;
		const getExplorerSortMode = typeof options.getExplorerSortMode === 'function' ? options.getExplorerSortMode : () => 'none';
		const setExplorerSortMode = typeof options.setExplorerSortMode === 'function' ? options.setExplorerSortMode : () => '';
		const renderer = options.launcherRenderer || {};
		const textEncoder = typeof window.TextEncoder === 'function' ? new window.TextEncoder() : null;

		function normalizeLayout(win) {
			return win && win.dataset && win.dataset.pdkFolderLayout === 'file-explorer' ? 'file-explorer' : 'finder';
		}

		function getViewMode(win) {
			if (!win || !win.dataset) {
				return '';
			}

			return normalizeLayout(win) === 'file-explorer'
				? win.dataset.pdkExplorerViewMode || win.dataset.pdkFolderViewMode || ''
				: win.dataset.pdkFolderViewMode || win.dataset.pdkExplorerViewMode || '';
		}

		function isColumnListView(win) {
			const mode = getViewMode(win);

			return normalizeLayout(win) === 'finder' ? mode === 'list' : ['list', 'details'].includes(mode);
		}

		function getListColumns(layout) {
			if (layout === 'file-explorer') {
				return [
					{ id: 'name', label: getMenuLabel('sort_name'), sort: 'name' },
					{ id: 'date-modified', label: getMenuLabel('sort_date_modified'), sort: 'date-modified' },
					{ id: 'kind', label: getMenuLabel('type'), sort: 'kind' },
					{ id: 'size', label: getMenuLabel('sort_size'), sort: 'size' }
				];
			}

			return [
				{ id: 'name', label: getMenuLabel('sort_name'), sort: 'name' },
				{ id: 'size', label: getMenuLabel('sort_size'), sort: 'size' },
				{ id: 'kind', label: getMenuLabel('sort_kind'), sort: 'kind' },
				{ id: 'date-added', label: getMenuLabel('sort_date_added'), sort: 'date-added' }
			];
		}

		function getDocumentId(item = {}) {
			const rawId = item.document && item.document.id ? item.document.id : item.id;
			const direct = Number.parseInt(rawId, 10);
			const match = String(rawId || '').match(/(\d+)$/);

			if (Number.isFinite(direct) && direct > 0) {
				return direct;
			}

			return match ? Number.parseInt(match[1], 10) || 0 : 0;
		}

		function getDocumentContentSize(item = {}) {
			const content = item.document && typeof item.document.content === 'string' ? item.document.content : '';

			if (!content) {
				return 0;
			}

			return textEncoder ? textEncoder.encode(content).length : content.length;
		}

		function getItemKindLabel(item) {
			if (item && item.type === 'folder') {
				return getMenuLabel('folder');
			}

			if (item && item.type === 'document') {
				return item.kindLabel || getMenuLabel('document');
			}

			return getMenuLabel('application');
		}

		function getItemDateValue(item, key) {
			const value = item && item.type === 'document'
				? (
					key === 'date-added'
						? item.document && item.document.created ? item.document.created : item.created || ''
						: item.document && item.document.modified ? item.document.modified : item.modified || ''
				)
				: (
					key === 'date-added'
						? item && item.folder && item.folder.createdAt ? item.folder.createdAt : item && item.createdAt ? item.createdAt : ''
						: item && item.folder && item.folder.modifiedAt ? item.folder.modifiedAt : item && item.modifiedAt ? item.modifiedAt : ''
				);
			const timestamp = Date.parse(value);

			return Number.isFinite(timestamp) ? timestamp : 0;
		}

		function getItemSizeValue(item) {
			if (item && item.type === 'document') {
				return Number.isFinite(item.size) ? item.size : getDocumentContentSize(item);
			}

			return Number.isFinite(item && item.size) ? item.size : 0;
		}

		function getListMetadata(item = {}) {
			return {
				dateAdded: getItemDateValue(item, 'date-added'),
				dateModified: getItemDateValue(item, 'date-modified'),
				documentId: item.type === 'document' ? getDocumentId(item) : 0,
				kindLabel: getItemKindLabel(item),
				size: getItemSizeValue(item)
			};
		}

		function getTrashKindLabel(item = {}) {
			if (item && item.type === 'document') {
				const documentData = item.document && typeof item.document === 'object' ? item.document : {};

				if (item.kindLabel) {
					return item.kindLabel;
				}

				if (documentData.kindLabel) {
					return documentData.kindLabel;
				}

				if (documentData.kind === 'sticky') {
					return getMenuLabel('sticky_note');
				}

				return getMenuLabel('document');
			}

			return getMenuLabel('folder');
		}

		function getTrashDisplayItems(win = null) {
			const items = getTrashItems().map((item) => {
				const isDocument = item && item.type === 'document';
				const documentData = isDocument && item.document && typeof item.document === 'object' ? item.document : {};
				const trashDate = item && item.trashedAt ? item.trashedAt : '';
				const documentForList = isDocument ? Object.assign({}, documentData, {
					created: trashDate || documentData.created || '',
					modified: trashDate || documentData.modified || ''
				}) : {};
				const normalized = {
					icon: item && item.icon ? item.icon : isDocument ? 'dashicons-media-document' : 'dashicons-category',
					id: item && item.id ? item.id : '',
					label: item && item.label ? item.label : (isDocument ? documentData.title || getMenuLabel('document') : getMenuLabel('folder')),
					originalType: item && item.type ? item.type : 'folder',
					trashItem: item,
					type: isDocument ? 'document' : 'folder'
				};
				const listMeta = getListMetadata(Object.assign({}, normalized, {
					created: trashDate,
					createdAt: trashDate,
					document: documentForList,
					kindLabel: getTrashKindLabel(item),
					modified: trashDate,
					modifiedAt: trashDate,
					size: item && Number.isFinite(item.size) ? item.size : 0
				}));

				return Object.assign({}, normalized, {
					listMeta
				});
			});

			return sortExplorerFolderItems(items, win);
		}

		function isSameCalendarDate(first, second) {
			return first.getFullYear() === second.getFullYear()
				&& first.getMonth() === second.getMonth()
				&& first.getDate() === second.getDate();
		}

		function formatLabelTemplate(template, values = []) {
			let sequentialIndex = 0;
			const source = typeof template === 'string' ? template : '';

			return source
				.replace(/%(\d+)\$s/g, (match, index) => {
					const value = values[Number.parseInt(index, 10) - 1];

					return value === undefined ? match : String(value);
				})
				.replace(/%s/g, (match) => {
					const value = values[sequentialIndex];
					sequentialIndex += 1;

					return value === undefined ? match : String(value);
				});
		}

		function formatFinderDate(date) {
			const now = new Date();
			const yesterday = new Date(now);
			const time = date.toLocaleTimeString([], {
				hour: '2-digit',
				minute: '2-digit'
			});

			yesterday.setDate(now.getDate() - 1);

			if (isSameCalendarDate(date, now)) {
				return formatLabelTemplate(getMenuLabel('today_at_time'), [time]);
			}

			if (isSameCalendarDate(date, yesterday)) {
				return formatLabelTemplate(getMenuLabel('yesterday_at_time'), [time]);
			}

			const dateOptions = {
				day: 'numeric',
				month: 'short'
			};

			if (date.getFullYear() !== now.getFullYear()) {
				dateOptions.year = 'numeric';
			}

			const dateLabel = date.toLocaleDateString([], dateOptions);

			return formatLabelTemplate(getMenuLabel('date_at_time'), [dateLabel, time]);
		}

		function formatDate(timestamp, layout) {
			if (!timestamp) {
				return '';
			}

			const date = new Date(timestamp);

			if (!Number.isFinite(date.getTime())) {
				return '';
			}

			if (layout === 'file-explorer') {
				return date.toLocaleString([], {
					day: 'numeric',
					hour: 'numeric',
					minute: '2-digit',
					month: 'numeric',
					year: 'numeric'
				});
			}

			return formatFinderDate(date);
		}

		function formatSize(bytes, layout, item = {}) {
			const size = Number.isFinite(bytes) ? Math.max(0, bytes) : 0;

			if (size === 0) {
				return layout === 'finder' || item.type === 'document' ? getMenuLabel('zero_bytes') : '';
			}

			if (size < 1024) {
				return `${size} ${getMenuLabel('bytes_unit')}`;
			}

			const units = [
				getMenuLabel('kb_unit'),
				getMenuLabel('mb_unit'),
				getMenuLabel('gb_unit')
			];
			let value = size / 1024;
			let unitIndex = 0;

			while (value >= 1024 && unitIndex < units.length - 1) {
				value /= 1024;
				unitIndex += 1;
			}

			return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[unitIndex]}`;
		}

		function getColumnValue(item, columnId, layout) {
			const metadata = item && item.listMeta ? item.listMeta : getListMetadata(item);

			if (columnId === 'size') {
				return formatSize(metadata.size, layout, item);
			}

			if (columnId === 'kind') {
				return metadata.kindLabel;
			}

			if (columnId === 'date-added') {
				return formatDate(metadata.dateAdded, layout);
			}

			if (columnId === 'date-modified') {
				return formatDate(metadata.dateModified, layout);
			}

			return item && item.label ? item.label : '';
		}

		function compareNumbers(first, second) {
			const firstValue = Number.isFinite(first) ? first : 0;
			const secondValue = Number.isFinite(second) ? second : 0;

			return firstValue - secondValue;
		}

		function sortExplorerFolderItems(items, win) {
			const sortMode = getExplorerSortMode(win);
			const collator = new Intl.Collator(undefined, {
				numeric: true,
				sensitivity: 'base'
			});
			const normalized = Array.isArray(items) ? items.slice() : [];

			if (sortMode === 'name') {
				return normalized.sort((a, b) => collator.compare(a && a.label ? a.label : '', b && b.label ? b.label : ''));
			}

			if (sortMode === 'kind') {
				return normalized.sort((a, b) => {
					const firstKind = a && a.listMeta ? a.listMeta.kindLabel : getItemKindLabel(a);
					const secondKind = b && b.listMeta ? b.listMeta.kindLabel : getItemKindLabel(b);
					const kindCompare = collator.compare(firstKind, secondKind);

					return kindCompare || collator.compare(a && a.label ? a.label : '', b && b.label ? b.label : '');
				});
			}

			if (sortMode === 'date-added' || sortMode === 'date-modified' || sortMode === 'size') {
				return normalized.sort((a, b) => {
					const firstMeta = a && a.listMeta ? a.listMeta : getListMetadata(a);
					const secondMeta = b && b.listMeta ? b.listMeta : getListMetadata(b);
					const valueCompare = sortMode === 'size'
						? compareNumbers(firstMeta.size, secondMeta.size)
						: compareNumbers(firstMeta[sortMode === 'date-added' ? 'dateAdded' : 'dateModified'], secondMeta[sortMode === 'date-added' ? 'dateAdded' : 'dateModified']);

					return valueCompare || collator.compare(a && a.label ? a.label : '', b && b.label ? b.label : '');
				});
			}

			return normalized;
		}

		function getDisplayItems(folderId, win = null) {
			const folderItems = getFolderChildFolders(folderId).map((folder) => ({
				folder,
				icon: folder.icon || 'dashicons-category',
				id: folder.id,
				label: folder.label || getMenuLabel('folder'),
				listMeta: getListMetadata({
					folder,
					type: 'folder'
				}),
				type: 'folder'
			}));
			const appItems = getFolderApps(folderId).map((app) => ({
				app,
				icon: app.icon,
				id: app.id,
				label: app.label || app.id,
				listMeta: getListMetadata({
					app,
					type: 'app'
				}),
				type: 'app'
			}));
			const documentItems = getFolderDocuments(folderId).map((documentItem) => Object.assign({
				listMeta: getListMetadata(documentItem),
				type: 'document'
			}, documentItem));
			const items = folderItems.concat(appItems, documentItems);

			return sortExplorerFolderItems(items, win);
		}

		function createDisplayButton(item, folderId = '', removable = false, win = null) {
			if (item && item.trashItem && typeof renderer.createTrashItemButton === 'function') {
				return renderer.createTrashItemButton(item.trashItem);
			}

			if (item && item.type === 'folder' && typeof renderer.createFolderButton === 'function') {
				return renderer.createFolderButton(item.folder, folderId, win);
			}

			if (item && item.type === 'document' && typeof renderer.createDocumentButton === 'function') {
				return renderer.createDocumentButton(item, folderId, win);
			}

			return typeof renderer.createAppButton === 'function'
				? renderer.createAppButton(item.app, folderId, removable)
				: document.createTextNode('');
		}

		function createListCell(columnId, value) {
			const cell = document.createElement('span');

			cell.className = `pdk-folder-list-cell pdk-folder-list-cell-${columnId}`;
			cell.textContent = value || '';

			return cell;
		}

		function enhanceDisplayButtonForList(button, item, layout) {
			const columns = getListColumns(layout);
			const nameCell = createListCell('name', '');

			if (!button || !button.classList) {
				return button;
			}

			button.classList.add('pdk-folder-list-row');
			button.dataset.pdkFolderListItemType = item && item.type ? item.type : '';
			if (item && item.trashItem) {
				button.dataset.pdkFolderListSource = 'trash';
			}
			Array.from(button.childNodes).forEach((node) => {
				nameCell.appendChild(node);
			});
			button.replaceChildren(nameCell);
			columns.slice(1).forEach((column) => {
				button.appendChild(createListCell(column.id, getColumnValue(item, column.id, layout)));
			});

			return button;
		}

		function createListHeader(folderId, win, layout) {
			const header = document.createElement('div');
			const activeSort = getExplorerSortMode(win);

			header.className = 'pdk-folder-list-header';
			header.setAttribute('role', 'row');
			getListColumns(layout).forEach((column) => {
				const button = document.createElement('button');
				const active = activeSort === column.sort;

				button.type = 'button';
				button.className = `pdk-folder-list-heading pdk-folder-list-heading-${column.id}`;
				button.dataset.pdkFolderListSort = column.sort;
				button.setAttribute('role', 'columnheader');
				button.setAttribute('aria-label', column.label);
				button.setAttribute('aria-sort', active ? 'ascending' : 'none');
				button.textContent = column.label;
				if (active) {
					button.classList.add('is-active');
				}
				button.addEventListener('click', (event) => {
					event.preventDefault();
					event.stopPropagation();
					setExplorerSortMode(win, column.sort, {
						folderId
					});
				});
				header.appendChild(button);
			});

			return header;
		}

		function createItemGrid(folderId, win = null, options = {}) {
			const grid = document.createElement('div');
			const isTrash = Boolean(options.trash);
			const removable = Boolean(options.removable);
			const items = isTrash ? getTrashDisplayItems(win) : getDisplayItems(folderId, win);
			const layout = normalizeLayout(win);
			const listView = isColumnListView(win);

			grid.className = [
				'pdk-app-grid',
				'pdk-finder-grid',
				isTrash ? 'pdk-finder-trash-grid' : '',
				listView ? `pdk-folder-list pdk-folder-list-layout-${layout}` : ''
			].filter(Boolean).join(' ');
			if (listView) {
				grid.appendChild(createListHeader(folderId, win, layout));
			}
			items.forEach((item) => {
				const button = createDisplayButton(item, folderId, removable, win);

				grid.appendChild(listView ? enhanceDisplayButtonForList(button, item, layout) : button);
			});

			return grid;
		}

		return {
			createDisplayButton,
			createItemGrid,
			getDisplayItems,
			getTrashDisplayItems,
			sortExplorerFolderItems
		};
	};
})();
