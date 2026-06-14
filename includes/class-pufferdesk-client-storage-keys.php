<?php
/**
 * Browser storage key contract.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Owns client-side storage key formats shared by PHP config and browser modules.
 */
final class PufferDesk_Client_Storage_Keys {
	const WORKSPACE_STORAGE_PREFIX     = 'pufferDesk:';
	const WORKSPACE_STORAGE_SEPARATOR  = ':';
	const WORKSPACE_STORAGE_SUFFIX     = ':session';
	const WORKSPACE_BROADCAST_PREFIX   = 'pufferDesk:workspace:';
	const REOPEN_FALLBACK_BASE         = 'pufferdesk';
	const REOPEN_SKIP_SUFFIX           = ':skip-window-restore-once';
	const SHORTCUT_CUSTOM_SUFFIX       = ':shortcuts:custom';
	const WALLPAPER_MENU_CONTRAST_PREFIX = 'pufferDesk:wallpaper-menu-contrast:';

	/**
	 * Build the local workspace cache key for a user/theme scope.
	 *
	 * @param string $theme_id Theme ID.
	 * @param int    $user_id Optional user ID.
	 * @return string
	 */
	public static function workspace_key( $theme_id, $user_id = 0 ) {
		$user_id = $user_id ? (int) $user_id : get_current_user_id();

		return self::WORKSPACE_STORAGE_PREFIX . absint( $user_id ) . self::WORKSPACE_STORAGE_SEPARATOR . (string) $theme_id . self::WORKSPACE_STORAGE_SUFFIX;
	}

	/**
	 * Client-safe key fragments used by browser storage helpers.
	 *
	 * @return array<string,string>
	 */
	public static function all() {
		return array(
			'workspaceStoragePrefix'      => self::WORKSPACE_STORAGE_PREFIX,
			'workspaceStorageSeparator'   => self::WORKSPACE_STORAGE_SEPARATOR,
			'workspaceStorageSuffix'      => self::WORKSPACE_STORAGE_SUFFIX,
			'workspaceBroadcastPrefix'    => self::WORKSPACE_BROADCAST_PREFIX,
			'reopenFallbackBase'          => self::REOPEN_FALLBACK_BASE,
			'reopenSkipSuffix'            => self::REOPEN_SKIP_SUFFIX,
			'shortcutCustomSuffix'        => self::SHORTCUT_CUSTOM_SUFFIX,
			'wallpaperMenuContrastPrefix' => self::WALLPAPER_MENU_CONTRAST_PREFIX,
		);
	}
}
