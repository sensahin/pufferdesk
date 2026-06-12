<?php
/**
 * Shared product identity labels.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Owns stable product-facing labels used across shell surfaces.
 */
final class PufferDesk_Product_Labels {
	/**
	 * Main product label.
	 *
	 * @return string
	 */
	public static function name() {
		return __( 'PufferDesk', 'pufferdesk-admin-desktop' );
	}

	/**
	 * Classic admin fallback label.
	 *
	 * @return string
	 */
	public static function classic_admin() {
		return __( 'Classic Admin', 'pufferdesk-admin-desktop' );
	}

	/**
	 * Private document post type plural label.
	 *
	 * @return string
	 */
	public static function documents_name() {
		return __( 'PufferDesk Documents', 'pufferdesk-admin-desktop' );
	}

	/**
	 * Private document post type singular label.
	 *
	 * @return string
	 */
	public static function document_name() {
		return __( 'PufferDesk Document', 'pufferdesk-admin-desktop' );
	}
}
