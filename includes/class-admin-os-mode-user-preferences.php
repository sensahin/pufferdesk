<?php
/**
 * Per-user Admin OS preferences.
 *
 * @package AdminOSMode
 */

defined( 'ABSPATH' ) || exit;

/**
 * Persists user-specific shell settings.
 */
final class Admin_OS_Mode_User_Preferences {
	const META_ENABLED = 'admin_os_mode_enabled';
	const META_THEME   = 'admin_os_mode_theme';

	/**
	 * Whether the current user should enter OS Mode by default.
	 *
	 * @param int $user_id Optional user ID.
	 * @return bool
	 */
	public function is_enabled( $user_id = 0 ) {
		$user_id = $user_id ? (int) $user_id : get_current_user_id();
		$value   = get_user_meta( $user_id, self::META_ENABLED, true );

		if ( '' === $value ) {
			return (bool) apply_filters( 'admin_os_mode_default_enabled', true );
		}

		return '1' === $value;
	}

	/**
	 * Save the mode preference.
	 *
	 * @param bool $enabled Whether OS Mode is enabled.
	 * @param int  $user_id Optional user ID.
	 */
	public function set_enabled( $enabled, $user_id = 0 ) {
		$user_id = $user_id ? (int) $user_id : get_current_user_id();
		update_user_meta( $user_id, self::META_ENABLED, $enabled ? '1' : '0' );
	}

	/**
	 * Get the user's selected theme.
	 *
	 * @param array<string,array<string,mixed>> $themes Available themes.
	 * @param int                               $user_id Optional user ID.
	 * @return string
	 */
	public function get_theme_id( $themes, $user_id = 0 ) {
		$user_id = $user_id ? (int) $user_id : get_current_user_id();
		$theme   = sanitize_key( (string) get_user_meta( $user_id, self::META_THEME, true ) );

		if ( $theme && isset( $themes[ $theme ] ) ) {
			return $theme;
		}

		$default = sanitize_key( (string) apply_filters( 'admin_os_mode_default_theme', 'modern-os' ) );
		if ( isset( $themes[ $default ] ) ) {
			return $default;
		}

		return key( $themes );
	}

	/**
	 * Save the selected theme.
	 *
	 * @param string                            $theme_id Theme ID.
	 * @param array<string,array<string,mixed>> $themes Available themes.
	 * @param int                               $user_id Optional user ID.
	 * @return true|WP_Error
	 */
	public function set_theme_id( $theme_id, $themes, $user_id = 0 ) {
		$theme_id = sanitize_key( $theme_id );
		if ( empty( $themes[ $theme_id ] ) || ! empty( $themes[ $theme_id ]['abstract'] ) ) {
			return new WP_Error(
				'admin_os_mode_invalid_theme',
				__( 'The selected Admin OS theme is not available.', 'admin-os-mode' )
			);
		}

		$user_id = $user_id ? (int) $user_id : get_current_user_id();
		update_user_meta( $user_id, self::META_THEME, $theme_id );

		return true;
	}
}
