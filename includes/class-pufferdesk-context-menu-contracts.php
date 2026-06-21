<?php
/**
 * Shared context menu platform identifiers.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Owns stable context menu target and classification IDs.
 */
final class PufferDesk_Context_Menu_Contracts {
	const TARGET_DESKTOP            = 'desktop';
	const TARGET_DESKTOP_APP        = 'desktop-app';
	const TARGET_DESKTOP_FOLDER     = 'desktop-folder';
	const TARGET_DOCK               = 'dock';
	const TARGET_DOCK_APP           = 'dock-app';
	const TARGET_DOCUMENT           = 'document';
	const TARGET_FOLDER             = 'folder';
	const TARGET_FOLDER_APP         = 'folder-app';
	const TARGET_FOLDER_CONTENT     = 'folder-content';
	const TARGET_FOLDER_SIDEBAR     = 'folder-sidebar-item';
	const TARGET_FOLDER_TAB         = 'folder-tab';
	const TARGET_FOLDER_TOOLBAR     = 'folder-toolbar';
	const TARGET_STICKY_NOTE        = 'sticky-note';
	const TARGET_TRASH_ITEM         = 'trash-item';
	const TARGET_WIDGET             = 'widget';
	const TARGET_WINDOW             = 'window';

	const AREA_DESKTOP = 'desktop';
	const AREA_DOCK    = 'dock';
	const AREA_FOLDER  = 'folder';
	const AREA_STATUS  = 'status';
	const AREA_TRASH   = 'trash';
	const AREA_WIDGET  = 'widget';
	const AREA_WINDOW  = 'window';

	const TARGET_TYPE_BACKGROUND = 'background';
	const TARGET_TYPE_ITEM       = 'item';
	const TARGET_TYPE_SIDEBAR    = 'sidebar';
	const TARGET_TYPE_STATUS     = 'status';
	const TARGET_TYPE_TAB        = 'tab';
	const TARGET_TYPE_TITLEBAR   = 'titlebar';
	const TARGET_TYPE_TOOLBAR    = 'toolbar';

	const ITEM_TYPE_APP        = 'app';
	const ITEM_TYPE_DOCUMENT   = 'document';
	const ITEM_TYPE_FOLDER     = 'folder';
	const ITEM_TYPE_TRASH_ITEM = 'trash-item';
	const ITEM_TYPE_WIDGET     = 'widget';

	const KEY_DESKTOP_BACKGROUND = 'desktop.background';
	const KEY_DESKTOP_ITEM       = 'desktop.item';
	const KEY_DOCK_BACKGROUND    = 'dock.background';
	const KEY_DOCK_ITEM          = 'dock.item';
	const KEY_FOLDER_BACKGROUND  = 'folder.background';
	const KEY_FOLDER_ITEM        = 'folder.item';
	const KEY_FOLDER_SIDEBAR     = 'folder.sidebar';
	const KEY_FOLDER_TAB         = 'folder.tab';
	const KEY_FOLDER_TOOLBAR     = 'folder.toolbar';
	const KEY_TRASH_ITEM         = 'trash.item';
	const KEY_WIDGET_ITEM        = 'widget.item';
	const KEY_WINDOW_TITLEBAR    = 'window.titlebar';

	/**
	 * Browser-facing context menu contract.
	 *
	 * @return array<string,mixed>
	 */
	public static function client_contract() {
		return array(
			'targets'            => self::target_ids(),
			'areas'              => self::area_ids(),
			'targetTypes'        => self::target_type_ids(),
			'itemTypes'          => self::item_type_ids(),
			'keys'               => self::context_key_ids(),
			'nonItemDataTargets' => array(
				self::TARGET_DESKTOP,
				self::TARGET_DOCK,
				self::TARGET_FOLDER_CONTENT,
				self::TARGET_FOLDER_TAB,
				self::TARGET_FOLDER_TOOLBAR,
				self::TARGET_WINDOW,
			),
		);
	}

	/**
	 * Context target IDs.
	 *
	 * @return array<string,string>
	 */
	public static function target_ids() {
		return array(
			'DESKTOP'        => self::TARGET_DESKTOP,
			'DESKTOP_APP'    => self::TARGET_DESKTOP_APP,
			'DESKTOP_FOLDER' => self::TARGET_DESKTOP_FOLDER,
			'DOCK'           => self::TARGET_DOCK,
			'DOCK_APP'       => self::TARGET_DOCK_APP,
			'DOCUMENT'       => self::TARGET_DOCUMENT,
			'FOLDER'         => self::TARGET_FOLDER,
			'FOLDER_APP'     => self::TARGET_FOLDER_APP,
			'FOLDER_CONTENT' => self::TARGET_FOLDER_CONTENT,
			'FOLDER_SIDEBAR' => self::TARGET_FOLDER_SIDEBAR,
			'FOLDER_TAB'     => self::TARGET_FOLDER_TAB,
			'FOLDER_TOOLBAR' => self::TARGET_FOLDER_TOOLBAR,
			'STICKY_NOTE'    => self::TARGET_STICKY_NOTE,
			'TRASH_ITEM'     => self::TARGET_TRASH_ITEM,
			'WIDGET'         => self::TARGET_WIDGET,
			'WINDOW'         => self::TARGET_WINDOW,
		);
	}

	/**
	 * Context area IDs.
	 *
	 * @return array<string,string>
	 */
	public static function area_ids() {
		return array(
			'DESKTOP' => self::AREA_DESKTOP,
			'DOCK'    => self::AREA_DOCK,
			'FOLDER'  => self::AREA_FOLDER,
			'STATUS'  => self::AREA_STATUS,
			'TRASH'   => self::AREA_TRASH,
			'WIDGET'  => self::AREA_WIDGET,
			'WINDOW'  => self::AREA_WINDOW,
		);
	}

	/**
	 * Context target type IDs.
	 *
	 * @return array<string,string>
	 */
	public static function target_type_ids() {
		return array(
			'BACKGROUND' => self::TARGET_TYPE_BACKGROUND,
			'ITEM'       => self::TARGET_TYPE_ITEM,
			'SIDEBAR'    => self::TARGET_TYPE_SIDEBAR,
			'STATUS'     => self::TARGET_TYPE_STATUS,
			'TAB'        => self::TARGET_TYPE_TAB,
			'TITLEBAR'   => self::TARGET_TYPE_TITLEBAR,
			'TOOLBAR'    => self::TARGET_TYPE_TOOLBAR,
		);
	}

	/**
	 * Context item type IDs.
	 *
	 * @return array<string,string>
	 */
	public static function item_type_ids() {
		return array(
			'APP'        => self::ITEM_TYPE_APP,
			'DOCUMENT'   => self::ITEM_TYPE_DOCUMENT,
			'FOLDER'     => self::ITEM_TYPE_FOLDER,
			'TRASH_ITEM' => self::ITEM_TYPE_TRASH_ITEM,
			'WIDGET'     => self::ITEM_TYPE_WIDGET,
		);
	}

	/**
	 * Context key IDs.
	 *
	 * @return array<string,string>
	 */
	public static function context_key_ids() {
		return array(
			'DESKTOP_BACKGROUND' => self::KEY_DESKTOP_BACKGROUND,
			'DESKTOP_ITEM'       => self::KEY_DESKTOP_ITEM,
			'DOCK_BACKGROUND'    => self::KEY_DOCK_BACKGROUND,
			'DOCK_ITEM'          => self::KEY_DOCK_ITEM,
			'FOLDER_BACKGROUND'  => self::KEY_FOLDER_BACKGROUND,
			'FOLDER_ITEM'        => self::KEY_FOLDER_ITEM,
			'FOLDER_SIDEBAR'     => self::KEY_FOLDER_SIDEBAR,
			'FOLDER_TAB'         => self::KEY_FOLDER_TAB,
			'FOLDER_TOOLBAR'     => self::KEY_FOLDER_TOOLBAR,
			'TRASH_ITEM'         => self::KEY_TRASH_ITEM,
			'WIDGET_ITEM'        => self::KEY_WIDGET_ITEM,
			'WINDOW_TITLEBAR'    => self::KEY_WINDOW_TITLEBAR,
		);
	}
}
