(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.shell = window.PufferDesk.shell || {};

	const fallback = Object.freeze({
		areas: Object.freeze({
			DESKTOP: 'desktop',
			DOCK: 'dock',
			FOLDER: 'folder',
			STATUS: 'status',
			TRASH: 'trash',
			WIDGET: 'widget',
			WINDOW: 'window'
		}),
		itemTypes: Object.freeze({
			APP: 'app',
			DOCUMENT: 'document',
			FOLDER: 'folder',
			TRASH_ITEM: 'trash-item',
			WIDGET: 'widget'
		}),
		keys: Object.freeze({
			DESKTOP_BACKGROUND: 'desktop.background',
			DESKTOP_ITEM: 'desktop.item',
			DOCK_BACKGROUND: 'dock.background',
			DOCK_ITEM: 'dock.item',
			FOLDER_BACKGROUND: 'folder.background',
			FOLDER_ITEM: 'folder.item',
			FOLDER_SIDEBAR: 'folder.sidebar',
			FOLDER_TAB: 'folder.tab',
			FOLDER_TOOLBAR: 'folder.toolbar',
			TRASH_ITEM: 'trash.item',
			WIDGET_ITEM: 'widget.item',
			WINDOW_TITLEBAR: 'window.titlebar'
		}),
		nonItemDataTargets: Object.freeze(['desktop', 'dock', 'folder-content', 'folder-toolbar', 'folder-tab', 'window']),
		targets: Object.freeze({
			DESKTOP: 'desktop',
			DESKTOP_APP: 'desktop-app',
			DESKTOP_FOLDER: 'desktop-folder',
			DOCK: 'dock',
			DOCK_APP: 'dock-app',
			DOCUMENT: 'document',
			FOLDER: 'folder',
			FOLDER_APP: 'folder-app',
			FOLDER_CONTENT: 'folder-content',
			FOLDER_SIDEBAR: 'folder-sidebar-item',
			FOLDER_TAB: 'folder-tab',
			FOLDER_TOOLBAR: 'folder-toolbar',
			SOUND_STATUS: 'sound-status',
			STICKY_NOTE: 'sticky-note',
			TRASH_ITEM: 'trash-item',
			WIDGET: 'widget',
			WINDOW: 'window'
		}),
		targetTypes: Object.freeze({
			BACKGROUND: 'background',
			ITEM: 'item',
			SIDEBAR: 'sidebar',
			STATUS: 'status',
			TAB: 'tab',
			TITLEBAR: 'titlebar',
			TOOLBAR: 'toolbar'
		})
	});

	function getContract() {
		const config = window.PufferDesk.config;
		const contracts = config && typeof config.getContracts === 'function' ? config.getContracts() : {};

		return contracts.contextMenu && typeof contracts.contextMenu === 'object' ? contracts.contextMenu : {};
	}

	function objectContract(key) {
		const value = getContract()[key];

		return Object.freeze(Object.assign({}, fallback[key], value && typeof value === 'object' && !Array.isArray(value) ? value : {}));
	}

	function listContract(key) {
		const value = getContract()[key];

		return Object.freeze(Array.isArray(value) && value.length ? value.slice() : fallback[key].slice());
	}

	window.PufferDesk.shell.contextMenuConstants = Object.freeze({
		get areas() {
			return objectContract('areas');
		},
		get itemTypes() {
			return objectContract('itemTypes');
		},
		get keys() {
			return objectContract('keys');
		},
		get nonItemDataTargets() {
			return listContract('nonItemDataTargets');
		},
		get targets() {
			return objectContract('targets');
		},
		get targetTypes() {
			return objectContract('targetTypes');
		}
	});
})();
