<?php
/**
 * Stable shell command identifiers.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Owns command IDs shared by PHP menu data and browser command handlers.
 */
final class PufferDesk_Command_Ids {
	const APP_KEEP_IN_DOCK              = 'app.keep-in-dock';
	const APP_REMOVE_FROM_DOCK          = 'app.remove-from-dock';
	const APP_TOGGLE_LOGIN_ITEM         = 'app.toggle-login-item';
	const CLIPBOARD_COPY                = 'clipboard.copy';
	const CLIPBOARD_CUT                 = 'clipboard.cut';
	const CLIPBOARD_PASTE               = 'clipboard.paste';
	const DESKTOP_ICON_RENAME           = 'desktop-icon.rename';
	const DESKTOP_REFRESH               = 'desktop.refresh';
	const DESKTOP_SORT_ICONS            = 'desktop.sort-icons';
	const DOCUMENT_NEW_STICKY_NOTE      = 'document.new-sticky-note';
	const DOCUMENT_OPEN_STICKY_NOTES    = 'document.open-sticky-notes';
	const DOCUMENT_OPEN                 = 'document.open';
	const DOCUMENT_SAVE                 = 'document.save';
	const FOLDER_ADD_APP                = 'folder.add-app';
	const FOLDER_CREATE                 = 'folder.create';
	const FOLDER_DELETE                      = 'folder.delete';
	const FOLDER_DELETE_SELECTED_IMMEDIATELY = 'folder.delete-selected-immediately';
	const FOLDER_DELETE_SELECTED             = 'folder.delete-selected';
	const FOLDER_GET_INFO                    = 'folder.get-info';
	const FOLDER_REFRESH                     = 'folder.refresh';
	const FOLDER_REMOVE_APP                  = 'folder.remove-app';
	const FOLDER_RENAME                      = 'folder.rename';
	const FOLDER_SET_SORT_MODE               = 'folder.set-sort-mode';
	const FOLDER_SET_VIEW_MODE               = 'folder.set-view-mode';
	const FOLDER_SIDEBAR_REMOVE              = 'folder.sidebar-remove';
	const FOLDER_TAB_CLOSE              = 'folder-tab.close';
	const FOLDER_TAB_CLOSE_OTHERS       = 'folder-tab.close-others';
	const FOLDER_TAB_CLOSE_RIGHT        = 'folder-tab.close-right';
	const FOLDER_TAB_DUPLICATE          = 'folder-tab.duplicate';
	const FOLDER_TOOLBAR_DISPLAY        = 'folder.toolbar-display';
	const HELP_KEYBOARD_SHORTCUTS       = 'help.keyboard-shortcuts';
	const NAVIGATE_URL                  = 'navigate-url';
	const NOOP                          = 'noop';
	const OPEN_ABOUT                    = 'open-about';
	const OPEN_APP                      = 'open-app';
	const OPEN_EXTERNAL_URL             = 'open-external-url';
	const OPEN_FOLDER                   = 'open-folder';
	const OPEN_FOLDER_TAB               = 'open-folder-tab';
	const OPEN_FOLDER_WINDOW            = 'open-folder-window';
	const OPEN_SITE_ABOUT               = 'open-site-about';
	const OPEN_URL                      = 'open-url';
	const RECENT_ITEMS_CLEAR            = 'recent-items.clear';
	const SESSION_RESET_LAYOUT          = 'session.reset-layout';
	const SETTINGS_OPEN_PANEL           = 'settings.open-panel';
	const SHELL_LOCK                    = 'shell.lock';
	const SHELL_FOCUS_SEARCH            = 'shell.focus-search';
	const SHELL_RESTART                 = 'shell.restart';
	const SHELL_SHUTDOWN                = 'shell.shutdown';
	const SHELL_SLEEP                   = 'shell.sleep';
	const SHELL_SWITCH_CLASSIC          = 'shell.switch-classic';
	const SOUND_TOGGLE_MUTE             = 'sound.toggle-mute';
	const SYSTEM_ERASE_CONTENT_SETTINGS = 'system.erase-content-settings';
	const TRASH_DELETE_IMMEDIATELY      = 'trash.delete-immediately';
	const TRASH_EMPTY                   = 'trash.empty';
	const TRASH_RESTORE                 = 'trash.restore';
	const USER_LOGOUT                   = 'user.logout';
	const WIDGET_HIDE                   = 'widget.hide';
	const WINDOW_CLOSE                  = 'window.close';
	const WINDOW_FOCUS                  = 'window.focus';
	const WINDOW_FOCUS_ID               = 'window.focus-id';
	const WINDOW_HIDE                   = 'window.hide';
	const WINDOW_HIDE_OTHERS            = 'window.hide-others';
	const WINDOW_HISTORY_BACK           = 'window.history-back';
	const WINDOW_HISTORY_FORWARD        = 'window.history-forward';
	const WINDOW_MINIMIZE               = 'window.minimize';
	const WINDOW_OPEN_BROWSER_TAB       = 'window.open-browser-tab';
	const WINDOW_RELOAD                 = 'window.reload';
	const WINDOW_SHOW_ALL               = 'window.show-all';
	const WINDOW_TOGGLE_MAXIMIZE        = 'window.toggle-maximize';

	/**
	 * Client-safe command ID map.
	 *
	 * @return array<string,string>
	 */
	public static function all() {
		$reflection = new ReflectionClass( __CLASS__ );

		return $reflection->getConstants();
	}
}
