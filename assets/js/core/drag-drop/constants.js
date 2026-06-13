(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.dragDrop = window.PufferDesk.dragDrop || {};

	function getRuntimeLabels() {
		const config = window.PufferDesk.config && typeof window.PufferDesk.config.get === 'function'
			? window.PufferDesk.config.get()
			: {};
		const menu = config.menu && typeof config.menu === 'object' ? config.menu : {};

		return menu.labels && typeof menu.labels === 'object' ? menu.labels : {};
	}

	function getLabel(labels, key) {
		const value = labels[key];

		return typeof value === 'string' && value ? value : key;
	}

	const labels = getRuntimeLabels();

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
			DESKTOP: getLabel(labels, 'desktop'),
			DOCK: getLabel(labels, 'launcher'),
			FOLDER_SIDEBAR_FAVORITES: getLabel(labels, 'favorites'),
			TRASH: getLabel(labels, 'trash')
		}),
		messages: Object.freeze({
			ALREADY_ON_DESKTOP: getLabel(labels, 'move_app_already_on_desktop'),
			DESCENDANT_NESTING: getLabel(labels, 'move_descendant_nesting'),
			DUPLICATE_ITEM: getLabel(labels, 'move_duplicate_item'),
			LOCKED_ITEM: getLabel(labels, 'move_locked_item'),
			MISSING_ITEM: getLabel(labels, 'move_missing_item'),
			MISSING_SOURCE_CONTAINER: getLabel(labels, 'move_missing_source_container'),
			MISSING_TARGET_CONTAINER: getLabel(labels, 'move_missing_target_container'),
			MISSING_VALIDATOR: getLabel(labels, 'move_validator_unavailable'),
			MOVE_EXCEPTION: getLabel(labels, 'move_could_not_be_completed'),
			MOVE_NOT_APPLIED: getLabel(labels, 'move_not_applied'),
			SELF_NESTING: getLabel(labels, 'move_self_nesting'),
			SOURCE_LOCKED: getLabel(labels, 'move_source_locked'),
			SYSTEM_FOLDER_MOVE: getLabel(labels, 'move_system_folder'),
			TARGET_NOT_ALLOWED: getLabel(labels, 'move_target_not_allowed'),
			TARGET_REJECTED: getLabel(labels, 'move_target_rejected'),
			TRASH_PARENT: getLabel(labels, 'move_trash_parent'),
			UNKNOWN_ITEM: getLabel(labels, 'move_unknown_item'),
			UNKNOWN_SOURCE_CONTAINER: getLabel(labels, 'move_unknown_source_container'),
			UNKNOWN_TARGET_CONTAINER: getLabel(labels, 'move_unknown_target_container'),
			UNSUPPORTED_ITEM_TYPE: getLabel(labels, 'move_unsupported_item_type')
		}),
		targetKinds: Object.freeze({
			FOLDER_SIDEBAR_FAVORITES: 'folder-sidebar-favorites'
		}),
		itemTypes: Object.freeze({
			APP: 'app',
			DOCUMENT: 'document',
			FOLDER: 'folder'
		}),
		reasons: Object.freeze({
			DRAG_DROP: 'drag-drop',
			TRASH: 'trash'
		})
	});
})();
