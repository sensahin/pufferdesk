(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.dragDrop = window.PufferDesk.dragDrop || {};

	window.PufferDesk.dragDrop.constants = Object.freeze({
		containerTypes: Object.freeze({
			DESKTOP: 'desktop',
			DOCK: 'dock',
			FOLDER: 'folder',
			FOLDER_SIDEBAR: 'folder-sidebar',
			FOLDER_SIDEBAR_FAVORITES: 'folder-sidebar:favorites',
			SIDEBAR_FAVORITES_LEGACY: 'sidebar-favorites',
			TRASH: 'trash'
		}),
		containerPrefixes: Object.freeze({
			FOLDER: 'folder:',
			FOLDER_SIDEBAR: 'folder-sidebar:'
		}),
		containerLabels: Object.freeze({
			DESKTOP: 'Desktop',
			DOCK: 'Dock',
			FOLDER_SIDEBAR_FAVORITES: 'Folder Sidebar Favorites',
			TRASH: 'Trash'
		}),
		messages: Object.freeze({
			MISSING_VALIDATOR: 'The move validator is not available.',
			MOVE_NOT_APPLIED: 'The move did not change workspace state.'
		}),
		targetKinds: Object.freeze({
			FOLDER_SIDEBAR_FAVORITES: 'folder-sidebar-favorites'
		}),
		itemTypes: Object.freeze({
			APP: 'app',
			FOLDER: 'folder'
		}),
		reasons: Object.freeze({
			DRAG_DROP: 'drag-drop',
			TRASH: 'trash'
		})
	});
})();
