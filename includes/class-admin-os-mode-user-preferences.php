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
	const META_WALLPAPER  = 'admin_os_mode_wallpaper';
	const META_WALLPAPER_UPLOADS = 'admin_os_mode_wallpaper_uploads';
	const WALLPAPER_UPLOAD_LIMIT = 12;

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
	 * Default wallpaper preference.
	 *
	 * @var array<string,mixed>
	 */
	private $default_wallpaper = array(
		'type'          => 'theme',
		'id'            => '',
		'attachment_id' => 0,
		'fit'           => 'cover',
		'position'      => 'center center',
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
	 * Get the user's wallpaper preference.
	 *
	 * @param int $user_id Optional user ID.
	 * @return array<string,mixed>
	 */
	public function get_wallpaper( $user_id = 0 ) {
		$user_id   = $user_id ? (int) $user_id : get_current_user_id();
		$wallpaper = get_user_meta( $user_id, self::META_WALLPAPER, true );

		return $this->sanitize_wallpaper( is_array( $wallpaper ) ? $wallpaper : array() );
	}

	/**
	 * Sanitize a wallpaper preference payload.
	 *
	 * @param array<string,mixed> $wallpaper Raw wallpaper data.
	 * @return array<string,mixed>
	 */
	public function sanitize_wallpaper( $wallpaper ) {
		$sanitized = $this->default_wallpaper;
		$type      = isset( $wallpaper['type'] ) ? sanitize_key( (string) $wallpaper['type'] ) : $sanitized['type'];

		if ( in_array( $type, array( 'theme', 'color', 'upload' ), true ) ) {
			$sanitized['type'] = $type;
		}

		if ( isset( $wallpaper['id'] ) ) {
			$sanitized['id'] = sanitize_key( (string) $wallpaper['id'] );
		}

		if ( isset( $wallpaper['attachment_id'] ) ) {
			$sanitized['attachment_id'] = absint( $wallpaper['attachment_id'] );
		}

		if ( isset( $wallpaper['fit'] ) ) {
			$fit = sanitize_key( (string) $wallpaper['fit'] );
			if ( in_array( $fit, array( 'cover', 'contain', 'auto' ), true ) ) {
				$sanitized['fit'] = $fit;
			}
		}

		if ( isset( $wallpaper['position'] ) ) {
			$position = sanitize_text_field( (string) $wallpaper['position'] );
			if ( in_array( $position, array( 'center center', 'top center', 'bottom center', 'center left', 'center right' ), true ) ) {
				$sanitized['position'] = $position;
			}
		}

		if ( 'upload' !== $sanitized['type'] ) {
			$sanitized['attachment_id'] = 0;
		}

		if ( 'upload' === $sanitized['type'] ) {
			$sanitized['id'] = '';
		}

		return $sanitized;
	}

	/**
	 * Save the user's wallpaper preference.
	 *
	 * @param array<string,mixed> $wallpaper Wallpaper data.
	 * @param int                 $user_id Optional user ID.
	 * @return array<string,mixed>
	 */
	public function set_wallpaper( $wallpaper, $user_id = 0 ) {
		$user_id   = $user_id ? (int) $user_id : get_current_user_id();
		$wallpaper = $this->sanitize_wallpaper( is_array( $wallpaper ) ? $wallpaper : array() );

		update_user_meta( $user_id, self::META_WALLPAPER, $wallpaper );
		if ( 'upload' === $wallpaper['type'] && ! empty( $wallpaper['attachment_id'] ) ) {
			$this->add_wallpaper_upload( $wallpaper['attachment_id'], $user_id );
		}

		return $wallpaper;
	}

	/**
	 * Get recently uploaded wallpaper attachment IDs for the user.
	 *
	 * @param int $user_id Optional user ID.
	 * @return array<int,int>
	 */
	public function get_wallpaper_uploads( $user_id = 0 ) {
		$user_id = $user_id ? (int) $user_id : get_current_user_id();
		$uploads = get_user_meta( $user_id, self::META_WALLPAPER_UPLOADS, true );

		return $this->sanitize_wallpaper_uploads( is_array( $uploads ) ? $uploads : array() );
	}

	/**
	 * Add an uploaded wallpaper to the user's recent wallpaper list.
	 *
	 * @param int $attachment_id Attachment ID.
	 * @param int $user_id Optional user ID.
	 * @return array<int,int>
	 */
	public function add_wallpaper_upload( $attachment_id, $user_id = 0 ) {
		$user_id       = $user_id ? (int) $user_id : get_current_user_id();
		$attachment_id = absint( $attachment_id );
		if ( ! $attachment_id ) {
			return $this->get_wallpaper_uploads( $user_id );
		}

		$uploads = $this->get_wallpaper_uploads( $user_id );
		if ( in_array( $attachment_id, $uploads, true ) ) {
			return $uploads;
		}

		$uploads = array_values(
			array_unique(
				array_merge(
					array( $attachment_id ),
					$uploads
				)
			)
		);
		$uploads = array_slice( $uploads, 0, self::WALLPAPER_UPLOAD_LIMIT );

		update_user_meta( $user_id, self::META_WALLPAPER_UPLOADS, $uploads );

		return $uploads;
	}

	/**
	 * Remove an uploaded wallpaper from the user's recent wallpaper list.
	 *
	 * @param int $attachment_id Attachment ID.
	 * @param int $user_id Optional user ID.
	 * @return array<int,int>
	 */
	public function remove_wallpaper_upload( $attachment_id, $user_id = 0 ) {
		$user_id       = $user_id ? (int) $user_id : get_current_user_id();
		$attachment_id = absint( $attachment_id );
		if ( ! $attachment_id ) {
			return $this->get_wallpaper_uploads( $user_id );
		}

		$uploads = array_values(
			array_filter(
				$this->get_wallpaper_uploads( $user_id ),
				function ( $upload_id ) use ( $attachment_id ) {
					return $attachment_id !== (int) $upload_id;
				}
			)
		);

		if ( empty( $uploads ) ) {
			delete_user_meta( $user_id, self::META_WALLPAPER_UPLOADS );
		} else {
			update_user_meta( $user_id, self::META_WALLPAPER_UPLOADS, $uploads );
		}

		return $uploads;
	}

	/**
	 * Reset the user's wallpaper preference to the active theme default.
	 *
	 * @param int $user_id Optional user ID.
	 */
	public function reset_wallpaper( $user_id = 0 ) {
		$user_id = $user_id ? (int) $user_id : get_current_user_id();
		delete_user_meta( $user_id, self::META_WALLPAPER );
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
	 * Sanitize uploaded wallpaper attachment IDs.
	 *
	 * @param array<int,mixed> $uploads Raw attachment IDs.
	 * @return array<int,int>
	 */
	private function sanitize_wallpaper_uploads( $uploads ) {
		$sanitized = array();

		foreach ( $uploads as $attachment_id ) {
			$attachment_id = absint( $attachment_id );
			if ( $attachment_id && ! in_array( $attachment_id, $sanitized, true ) ) {
				$sanitized[] = $attachment_id;
			}

			if ( count( $sanitized ) >= self::WALLPAPER_UPLOAD_LIMIT ) {
				break;
			}
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
