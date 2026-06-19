(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.events = window.PufferDesk.events || {};

	window.PufferDesk.events.names = Object.freeze({
		APP_RUNNING_STATE_CHANGED: 'app:running-state-changed',
		CONTEXT_MENU_CLOSE: 'contextmenu:close',
		CONTEXT_MENU_ERROR: 'contextmenu:error',
		CONTEXT_MENU_ITEM_EXECUTE: 'contextmenu:item:execute',
		CONTEXT_MENU_ITEM_HOVER: 'contextmenu:item:hover',
		CONTEXT_MENU_OPEN: 'contextmenu:open',
		CONTEXT_MENU_RENDER: 'contextmenu:render',
		CONTEXT_MENU_RESOLVE: 'contextmenu:resolve',
		DESKTOP_API_READY: 'desktop:api:ready',
		DESKTOP_APP_OPEN: 'desktop:app:open',
		DESKTOP_LAYOUT_CHANGED: 'desktop:layout:changed',
		DESKTOP_READY: 'desktop:ready',
		DESKTOP_WINDOW_ACTION_PREFIX: 'desktop:window:',
		DESKTOP_WINDOW_CREATE: 'desktop:window:create',
		DESKTOP_WINDOW_MOVE: 'desktop:window:move',
		DESKTOP_WINDOW_SHOW_ALL: 'desktop:window:showAll',
		DOCUMENTS_CHANGED: 'documents:changed',
		DRAG_CANCEL: 'drag:cancel',
		DRAG_HOVER: 'drag:hover',
		DRAG_LEAVE: 'drag:leave',
		DRAG_START: 'drag:start',
		DRAGDROP_CONTAINER_REGISTERED: 'dragdrop:container:registered',
		DRAGDROP_CONTAINER_UNREGISTERED: 'dragdrop:container:unregistered',
		DRAGDROP_ITEM_REGISTERED: 'dragdrop:item:registered',
		DRAGDROP_ITEM_UNREGISTERED: 'dragdrop:item:unregistered',
		DROP_VALIDATE: 'drop:validate',
		FOLDER_CONTENTS_CHANGED: 'folder:contents:changed',
		IFRAME_CONTEXT_CHANGED: 'iframe:contextChanged',
		ITEM_MOVE_ERROR: 'item:move:error',
		ITEM_MOVE_ROLLBACK: 'item:move:rollback',
		ITEM_MOVE_START: 'item:move:start',
		ITEM_MOVE_SUCCESS: 'item:move:success',
		NOTIFICATIONS_CHANGED: 'notifications:changed',
		NOTIFICATIONS_RECEIVED: 'notifications:received',
		NOTIFICATIONS_TOAST: 'notifications:toast',
		SHELL_TRANSIENT_SURFACE_OPENED: 'shell:transientSurfaceOpened',
		SOUNDS_PREFERENCES_CHANGED: 'sounds:preferencesChanged',
		WINDOW_CLOSED: 'window:closed',
		WINDOW_CREATED: 'window:created',
		WINDOW_FOCUSED: 'window:focused',
		WINDOW_STATE_CHANGED: 'window:stateChanged'
	});

	window.PufferDesk.events.domNames = Object.freeze({
		ACTIVE_WINDOW_CHANGE: 'pufferDesk:active-window-change',
		DESKTOP_DOCK_CHANGE: 'pufferDesk:desktop-dock-change',
		FOLDER_SELECTION_CHANGE: 'pufferDesk:folder-selection-change',
		FOLDER_TOOLBAR_DISPLAY_CHANGE: 'pufferDesk:folder-toolbar-display-change',
		FULLSCREEN_WINDOW_CHANGE: 'pufferDesk:fullscreen-window-change',
		MENU_BAR_CHANGE: 'pufferDesk:menu-bar-change',
		MENU_BAR_LAYOUT_CHANGE: 'pufferDesk:menu-bar-layout-change',
		RECENT_ITEMS_CHANGE: 'pufferDesk:recent-items-change',
		SHORTCUT_EXECUTE: 'pufferDesk:shortcut-execute',
		TRASH_CHANGE: 'pufferDesk:trash-change',
		WIDGETS_CHANGE: 'pufferDesk:widgets-change',
		WORKSPACE_STATE_CHANGED: 'pufferDesk:workspace-state-changed'
	});
})();
