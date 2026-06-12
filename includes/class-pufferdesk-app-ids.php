<?php
/**
 * Stable built-in app identifiers.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Owns PufferDesk's built-in app IDs and native renderer IDs.
 */
final class PufferDesk_App_Ids {
	const APPEARANCE   = 'appearance';
	const COMMENTS     = 'comments';
	const DASHBOARD    = 'dashboard';
	const MEDIA        = 'media';
	const OS_SETTINGS  = 'os-settings';
	const PAGES        = 'pages';
	const PLUGINS      = 'plugins';
	const POSTS        = 'posts';
	const SETTINGS     = 'settings';
	const SITE_HEALTH  = 'site-health';
	const STICKY_NOTES = 'sticky-notes';
	const TOOLS        = 'tools';
	const TRASH        = 'trash';
	const USERS        = 'users';
	const WOOCOMMERCE  = 'woocommerce';

	const NATIVE_SETTINGS     = 'settings';
	const NATIVE_STICKY_NOTES = 'sticky-notes';
	const NATIVE_TRASH        = 'trash';

	/**
	 * Client-safe built-in app ID map.
	 *
	 * @return array<string,string>
	 */
	public static function all() {
		return array(
			'APPEARANCE'   => self::APPEARANCE,
			'COMMENTS'     => self::COMMENTS,
			'DASHBOARD'    => self::DASHBOARD,
			'MEDIA'        => self::MEDIA,
			'OS_SETTINGS'  => self::OS_SETTINGS,
			'PAGES'        => self::PAGES,
			'PLUGINS'      => self::PLUGINS,
			'POSTS'        => self::POSTS,
			'SETTINGS'     => self::SETTINGS,
			'SITE_HEALTH'  => self::SITE_HEALTH,
			'STICKY_NOTES' => self::STICKY_NOTES,
			'TOOLS'        => self::TOOLS,
			'TRASH'        => self::TRASH,
			'USERS'        => self::USERS,
			'WOOCOMMERCE'  => self::WOOCOMMERCE,
		);
	}

	/**
	 * Client-safe native app renderer ID map.
	 *
	 * @return array<string,string>
	 */
	public static function native_all() {
		return array(
			'SETTINGS'     => self::NATIVE_SETTINGS,
			'STICKY_NOTES' => self::NATIVE_STICKY_NOTES,
			'TRASH'        => self::NATIVE_TRASH,
		);
	}
}
