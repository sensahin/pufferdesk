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
	const META_APPEARANCE = 'admin_os_mode_appearance';
	const META_ENABLED    = 'admin_os_mode_enabled';
	const META_THEME      = 'admin_os_mode_theme';

	/**
	 * Default shell appearance preferences.
	 *
	 * @var array<string,mixed>
	 */
	private $default_appearance = array(
		'mode'           => 'light',
		'window_material' => 'clear',
		'accent_color'   => 'multicolor',
		'highlight_color' => 'automatic',
		'icon_widget_style' => 'default',
		'folder_color'   => 'automatic',
		'tint_windows'   => true,
	);

	/**
	 * Allowed appearance preference values.
	 *
	 * @var array<string,array<int,string>>
	 */
	private $appearance_options = array(
		'mode'              => array( 'auto', 'light', 'dark' ),
		'window_material'   => array( 'clear', 'tinted' ),
		'accent_color'      => array( 'multicolor', 'blue', 'purple', 'pink', 'red', 'orange', 'yellow', 'green', 'graphite' ),
		'highlight_color'   => array( 'automatic' ),
		'icon_widget_style' => array( 'default', 'dark', 'clear', 'tinted' ),
		'folder_color'      => array( 'automatic' ),
	);

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

		$default = sanitize_key( (string) apply_filters( 'admin_os_mode_default_theme', 'adminos' ) );
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

	/**
	 * Get the user's appearance preferences.
	 *
	 * @param int $user_id Optional user ID.
	 * @return array<string,mixed>
	 */
	public function get_appearance( $user_id = 0 ) {
		$user_id    = $user_id ? (int) $user_id : get_current_user_id();
		$appearance = get_user_meta( $user_id, self::META_APPEARANCE, true );

		return $this->sanitize_appearance( is_array( $appearance ) ? $appearance : array() );
	}

	/**
	 * Save the user's appearance preferences.
	 *
	 * @param array<string,mixed> $appearance Appearance data.
	 * @param int                 $user_id Optional user ID.
	 * @return array<string,mixed>
	 */
	public function set_appearance( $appearance, $user_id = 0 ) {
		$user_id    = $user_id ? (int) $user_id : get_current_user_id();
		$appearance = $this->sanitize_appearance( is_array( $appearance ) ? $appearance : array() );

		update_user_meta( $user_id, self::META_APPEARANCE, $appearance );

		return $appearance;
	}

	/**
	 * Sanitize an appearance preference payload.
	 *
	 * @param array<string,mixed> $appearance Raw appearance data.
	 * @return array<string,mixed>
	 */
	private function sanitize_appearance( $appearance ) {
		$sanitized = $this->default_appearance;

		foreach ( $this->appearance_options as $key => $allowed ) {
			if ( ! array_key_exists( $key, $appearance ) ) {
				continue;
			}

			$value = sanitize_key( (string) $appearance[ $key ] );
			if ( in_array( $value, $allowed, true ) ) {
				$sanitized[ $key ] = $value;
			}
		}

		if ( array_key_exists( 'tint_windows', $appearance ) ) {
			$sanitized['tint_windows'] = $this->sanitize_boolean( $appearance['tint_windows'] );
		}

		return $sanitized;
	}

	/**
	 * Sanitize a boolean-like value from user meta or AJAX.
	 *
	 * @param mixed $value Raw value.
	 * @return bool
	 */
	private function sanitize_boolean( $value ) {
		if ( is_bool( $value ) ) {
			return $value;
		}

		if ( is_numeric( $value ) ) {
			return 1 === (int) $value;
		}

		return in_array( strtolower( (string) $value ), array( '1', 'true', 'yes', 'on' ), true );
	}
}
