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
	const ANGIE_PAGE_SLUG = 'angie-app';

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

	/**
	 * Resolve the default iframe compatibility for a WordPress admin screen.
	 *
	 * @param string $slug Admin menu or submenu slug.
	 * @param string $url Admin URL.
	 * @return string
	 */
	public static function iframe_compatibility( $slug, $url = '' ) {
		$page_slug     = self::get_admin_page_slug( $slug, $url );
		$compatibility = self::ANGIE_PAGE_SLUG === $page_slug
			? PufferDesk_App_Normalizer::IFRAME_COMPATIBILITY_CLASSIC
			: PufferDesk_App_Normalizer::IFRAME_COMPATIBILITY_EMBED;

		/**
		 * Filter iframe compatibility for WordPress admin screens.
		 *
		 * Return PufferDesk_App_Normalizer::IFRAME_COMPATIBILITY_CLASSIC when a
		 * screen must open in the standard WordPress admin instead of a window iframe.
		 *
		 * @param string $compatibility Compatibility policy.
		 * @param string $slug Admin menu or submenu slug.
		 * @param string $url Admin URL.
		 */
		return PufferDesk_App_Normalizer::normalize_iframe_compatibility(
			apply_filters( 'pufferdesk_admin_screen_iframe_compatibility', $compatibility, $slug, $url )
		);
	}

	/**
	 * Get the admin.php?page slug from a menu slug or URL.
	 *
	 * @param string $slug Admin menu or submenu slug.
	 * @param string $url Admin URL.
	 * @return string
	 */
	private static function get_admin_page_slug( $slug, $url ) {
		foreach ( array( $slug, $url ) as $candidate ) {
			$page_slug = self::get_admin_page_slug_from_value( $candidate );
			if ( '' !== $page_slug ) {
				return $page_slug;
			}
		}

		return sanitize_key( (string) $slug );
	}

	/**
	 * Extract an admin.php?page slug from a string.
	 *
	 * @param string $value URL or menu slug.
	 * @return string
	 */
	private static function get_admin_page_slug_from_value( $value ) {
		$value = trim( (string) $value );
		if ( '' === $value ) {
			return '';
		}

		$query = '';
		$parts = wp_parse_url( $value );
		if ( is_array( $parts ) && ! empty( $parts['query'] ) ) {
			$query = (string) $parts['query'];
		} elseif ( false !== strpos( $value, '?' ) ) {
			$query = (string) wp_parse_url( '/' . ltrim( $value, '/' ), PHP_URL_QUERY );
		}

		if ( '' === $query ) {
			return sanitize_key( $value );
		}

		parse_str( $query, $query_vars );

		return isset( $query_vars['page'] ) && is_scalar( $query_vars['page'] )
			? sanitize_key( (string) $query_vars['page'] )
			: '';
	}
}
