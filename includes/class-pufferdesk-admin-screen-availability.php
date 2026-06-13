<?php
/**
 * WordPress admin screen availability helpers.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Centralizes optional WordPress admin screen checks.
 */
final class PufferDesk_Admin_Screen_Availability {
	const SITE_HEALTH_CAPABILITY = 'view_site_health_checks';

	/**
	 * Whether the Site Health screen exists in this WordPress install.
	 *
	 * @return bool
	 */
	public static function is_site_health_available() {
		return file_exists( ABSPATH . 'wp-admin/site-health.php' );
	}

	/**
	 * Capability to use for Site Health on this WordPress install.
	 *
	 * @return string
	 */
	public static function site_health_capability() {
		return function_exists( 'wp_maybe_grant_site_health_caps' ) ? self::SITE_HEALTH_CAPABILITY : 'install_plugins';
	}

	/**
	 * Whether the current user can open the Site Health screen.
	 *
	 * @return bool
	 */
	public static function can_view_site_health() {
		return self::is_site_health_available() && current_user_can( self::site_health_capability() );
	}
}
