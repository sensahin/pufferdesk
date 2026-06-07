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
	const META_APP_LOCATIONS = 'admin_os_mode_app_locations';
	const META_DESKTOP_DOCK = 'admin_os_mode_desktop_dock';
	const META_DESKTOP_FOLDERS = 'admin_os_mode_desktop_folders';
	const META_ENABLED    = 'admin_os_mode_enabled';
	const META_MENU_BAR   = 'admin_os_mode_menu_bar';
	const META_THEME      = 'admin_os_mode_theme';
	const META_WALLPAPER  = 'admin_os_mode_wallpaper';
	const META_WALLPAPER_UPLOADS = 'admin_os_mode_wallpaper_uploads';
	const WALLPAPER_UPLOAD_LIMIT = 12;
	const RESET_DOMAIN_APPEARANCE = 'appearance';
	const RESET_DOMAIN_APP_LOCATIONS = 'app_locations';
	const RESET_DOMAIN_DESKTOP_DOCK = 'desktop_dock';
	const RESET_DOMAIN_DESKTOP_FOLDERS = 'desktop_folders';
	const RESET_DOMAIN_MENU_BAR = 'menu_bar';
	const RESET_DOMAIN_THEME = 'theme';
	const RESET_DOMAIN_WALLPAPER = 'wallpaper';
	const RESET_DOMAIN_WALLPAPER_UPLOADS = 'wallpaper_uploads';
	const RESET_PROFILE_ERASE_CONTENT_SETTINGS = 'erase_content_settings';

	/**
	 * Default shell appearance preferences.
	 *
	 * @var array<string,mixed>
	 */
	private $default_appearance = array(
		'mode'           => 'auto',
		'window_material' => 'clear',
		'accent_color'   => 'multicolor',
		'icon_widget_style' => 'default',
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
		'icon_widget_style' => array( 'default', 'dark', 'clear', 'tinted' ),
	);

	/**
	 * Default Desktop & Dock preferences.
	 *
	 * @var array<string,mixed>
	 */
	private $default_desktop_dock = array(
		'dock_size'                 => 48,
		'dock_magnification'        => 0,
		'dock_position'             => 'bottom',
		'minimize_animation'        => 'genie',
		'minimize_into_app_icon'    => false,
		'auto_hide_dock'            => false,
		'animate_opening_apps'      => true,
		'show_open_indicators'      => true,
		'wallpaper_click'           => 'always',
		'show_widgets_desktop'      => true,
		'dim_widgets'               => 'automatic',
	);

	/**
	 * Allowed Desktop & Dock preference values.
	 *
	 * @var array<string,array<int,string>>
	 */
	private $desktop_dock_options = array(
		'dock_position'      => array( 'left', 'bottom', 'right' ),
		'minimize_animation' => array( 'genie', 'scale' ),
		'wallpaper_click'    => array( 'always', 'never' ),
		'dim_widgets'        => array( 'automatic', 'always', 'never' ),
	);

	/**
	 * Allowed app location values.
	 *
	 * @var array<int,string>
	 */
	private $app_location_options = array( 'dock', 'desktop', 'both', 'hidden' );

	/**
	 * Default Menu Bar preferences.
	 *
	 * @var array<string,mixed>
	 */
	private $default_menu_bar = array(
		'auto_hide'       => 'fullscreen',
		'show_background' => false,
		'recent_count'    => 10,
	);

	/**
	 * Allowed Menu Bar preference values.
	 *
	 * @var array<string,array<int,string>>
	 */
	private $menu_bar_options = array(
		'auto_hide' => array( 'always', 'desktop', 'fullscreen', 'never' ),
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
	 * Get the user's Desktop & Dock preferences.
	 *
	 * @param int $user_id Optional user ID.
	 * @return array<string,mixed>
	 */
	public function get_desktop_dock( $user_id = 0 ) {
		$user_id      = $user_id ? (int) $user_id : get_current_user_id();
		$desktop_dock = get_user_meta( $user_id, self::META_DESKTOP_DOCK, true );

		return $this->sanitize_desktop_dock( is_array( $desktop_dock ) ? $desktop_dock : array() );
	}

	/**
	 * Save the user's Desktop & Dock preferences.
	 *
	 * @param array<string,mixed> $desktop_dock Desktop & Dock data.
	 * @param int                 $user_id Optional user ID.
	 * @return array<string,mixed>
	 */
	public function set_desktop_dock( $desktop_dock, $user_id = 0 ) {
		$user_id      = $user_id ? (int) $user_id : get_current_user_id();
		$desktop_dock = $this->sanitize_desktop_dock( is_array( $desktop_dock ) ? $desktop_dock : array() );

		update_user_meta( $user_id, self::META_DESKTOP_DOCK, $desktop_dock );

		return $desktop_dock;
	}

	/**
	 * Get the user's app placement preferences.
	 *
	 * @param array<int,array<string,mixed>> $apps Available apps.
	 * @param int                            $user_id Optional user ID.
	 * @return array<string,string>
	 */
	public function get_app_locations( $apps, $user_id = 0 ) {
		$user_id       = $user_id ? (int) $user_id : get_current_user_id();
		$app_locations = get_user_meta( $user_id, self::META_APP_LOCATIONS, true );

		return $this->sanitize_app_locations( is_array( $app_locations ) ? $app_locations : array(), $apps );
	}

	/**
	 * Save the user's app placement preferences.
	 *
	 * @param array<string,mixed>             $app_locations App location data.
	 * @param array<int,array<string,mixed>> $apps Available apps.
	 * @param int                            $user_id Optional user ID.
	 * @return array<string,string>
	 */
	public function set_app_locations( $app_locations, $apps, $user_id = 0 ) {
		$user_id       = $user_id ? (int) $user_id : get_current_user_id();
		$app_locations = $this->sanitize_app_locations( is_array( $app_locations ) ? $app_locations : array(), $apps );

		update_user_meta( $user_id, self::META_APP_LOCATIONS, $app_locations );

		return $app_locations;
	}

	/**
	 * Get the user's desktop folders.
	 *
	 * @param array<int,array<string,mixed>> $apps Available apps.
	 * @param int                            $user_id Optional user ID.
	 * @return array<int,array<string,mixed>>
	 */
	public function get_desktop_folders( $apps, $user_id = 0 ) {
		$user_id = $user_id ? (int) $user_id : get_current_user_id();
		$folders = get_user_meta( $user_id, self::META_DESKTOP_FOLDERS, true );

		return $this->sanitize_desktop_folders( is_array( $folders ) ? $folders : array(), $apps );
	}

	/**
	 * Save the user's desktop folders.
	 *
	 * @param array<int,array<string,mixed>> $folders Desktop folder data.
	 * @param array<int,array<string,mixed>> $apps Available apps.
	 * @param int                            $user_id Optional user ID.
	 * @return array<int,array<string,mixed>>
	 */
	public function set_desktop_folders( $folders, $apps, $user_id = 0 ) {
		$user_id = $user_id ? (int) $user_id : get_current_user_id();
		$folders = $this->sanitize_desktop_folders( is_array( $folders ) ? $folders : array(), $apps );

		if ( empty( $folders ) ) {
			delete_user_meta( $user_id, self::META_DESKTOP_FOLDERS );
		} else {
			update_user_meta( $user_id, self::META_DESKTOP_FOLDERS, $folders );
		}

		return $folders;
	}

	/**
	 * Filter apps for a shell launch surface.
	 *
	 * @param array<int,array<string,mixed>> $apps Available apps.
	 * @param array<string,string>           $app_locations App location map.
	 * @param string                         $surface Surface ID, either dock or desktop.
	 * @return array<int,array<string,mixed>>
	 */
	public function filter_apps_for_surface( $apps, $app_locations, $surface ) {
		$surface = sanitize_key( (string) $surface );
		if ( ! in_array( $surface, array( 'dock', 'desktop' ), true ) ) {
			return array();
		}

		return array_values(
			array_filter(
				(array) $apps,
				function ( $app ) use ( $app_locations, $surface ) {
					if ( ! is_array( $app ) || empty( $app['id'] ) ) {
						return false;
					}

					$id       = sanitize_key( (string) $app['id'] );
					$location = isset( $app_locations[ $id ] ) ? $app_locations[ $id ] : 'dock';

					return 'both' === $location || $surface === $location;
				}
			)
		);
	}

	/**
	 * Get the user's Menu Bar preferences.
	 *
	 * @param int $user_id Optional user ID.
	 * @return array<string,mixed>
	 */
	public function get_menu_bar( $user_id = 0 ) {
		$user_id  = $user_id ? (int) $user_id : get_current_user_id();
		$menu_bar = get_user_meta( $user_id, self::META_MENU_BAR, true );

		return $this->sanitize_menu_bar( is_array( $menu_bar ) ? $menu_bar : array() );
	}

	/**
	 * Save the user's Menu Bar preferences.
	 *
	 * @param array<string,mixed> $menu_bar Menu Bar data.
	 * @param int                 $user_id Optional user ID.
	 * @return array<string,mixed>
	 */
	public function set_menu_bar( $menu_bar, $user_id = 0 ) {
		$user_id  = $user_id ? (int) $user_id : get_current_user_id();
		$menu_bar = $this->sanitize_menu_bar( is_array( $menu_bar ) ? $menu_bar : array() );

		update_user_meta( $user_id, self::META_MENU_BAR, $menu_bar );

		return $menu_bar;
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
	 * Get reset domains for a named reset profile.
	 *
	 * Reset profiles are intentionally scoped to Admin OS preferences. They never
	 * delete WordPress content, users, roles, themes, plugins, or media files.
	 *
	 * @param string $profile Reset profile ID.
	 * @return array<int,string>
	 */
	public function get_reset_domains_for_profile( $profile ) {
		$profile = sanitize_key( (string) $profile );

		if ( self::RESET_PROFILE_ERASE_CONTENT_SETTINGS !== $profile ) {
			return array();
		}

		return array(
			self::RESET_DOMAIN_APPEARANCE,
			self::RESET_DOMAIN_APP_LOCATIONS,
			self::RESET_DOMAIN_DESKTOP_DOCK,
			self::RESET_DOMAIN_DESKTOP_FOLDERS,
			self::RESET_DOMAIN_MENU_BAR,
			self::RESET_DOMAIN_THEME,
			self::RESET_DOMAIN_WALLPAPER,
			self::RESET_DOMAIN_WALLPAPER_UPLOADS,
		);
	}

	/**
	 * Reset persisted user preference domains.
	 *
	 * @param array<int,string> $domains Reset domain IDs.
	 * @param int               $user_id Optional user ID.
	 * @return array<int,string> Domains that were processed.
	 */
	public function reset_domains( $domains, $user_id = 0 ) {
		$user_id   = $user_id ? (int) $user_id : get_current_user_id();
		$meta_keys = $this->get_reset_meta_keys();
		$reset     = array();

		foreach ( (array) $domains as $domain ) {
			$domain = sanitize_key( (string) $domain );

			if ( ! isset( $meta_keys[ $domain ] ) ) {
				continue;
			}

			delete_user_meta( $user_id, $meta_keys[ $domain ] );
			$reset[] = $domain;
		}

		return array_values( array_unique( $reset ) );
	}

	/**
	 * Sanitize a Desktop & Dock preference payload.
	 *
	 * @param array<string,mixed> $desktop_dock Raw Desktop & Dock data.
	 * @return array<string,mixed>
	 */
	public function sanitize_desktop_dock( $desktop_dock ) {
		$sanitized = $this->default_desktop_dock;

		if ( array_key_exists( 'dock_size', $desktop_dock ) ) {
			$sanitized['dock_size'] = $this->sanitize_range( $desktop_dock['dock_size'], 28, 72, $sanitized['dock_size'] );
		}

		if ( array_key_exists( 'dock_magnification', $desktop_dock ) ) {
			$sanitized['dock_magnification'] = $this->sanitize_range( $desktop_dock['dock_magnification'], 0, 24, $sanitized['dock_magnification'] );
		}

		foreach ( $this->desktop_dock_options as $key => $allowed ) {
			if ( ! array_key_exists( $key, $desktop_dock ) ) {
				continue;
			}

			$value = sanitize_key( (string) $desktop_dock[ $key ] );
			if ( in_array( $value, $allowed, true ) ) {
				$sanitized[ $key ] = $value;
			}
		}

		foreach ( $sanitized as $key => $value ) {
			if ( is_bool( $value ) && array_key_exists( $key, $desktop_dock ) ) {
				$sanitized[ $key ] = $this->sanitize_boolean( $desktop_dock[ $key ] );
			}
		}

		return $sanitized;
	}

	/**
	 * Sanitize app placement preferences.
	 *
	 * @param array<string,mixed>             $app_locations Raw app location data.
	 * @param array<int,array<string,mixed>> $apps Available apps.
	 * @return array<string,string>
	 */
	private function sanitize_app_locations( $app_locations, $apps ) {
		$sanitized = array();

		foreach ( (array) $apps as $app ) {
			if ( ! is_array( $app ) || empty( $app['id'] ) ) {
				continue;
			}

			$id       = sanitize_key( (string) $app['id'] );
			$location = isset( $app_locations[ $id ] ) ? sanitize_key( (string) $app_locations[ $id ] ) : 'dock';

			if ( ! in_array( $location, $this->app_location_options, true ) ) {
				$location = 'dock';
			}

			$sanitized[ $id ] = $location;
		}

		foreach ( (array) $app_locations as $raw_id => $raw_location ) {
			$id = sanitize_key( (string) $raw_id );
			if ( isset( $sanitized[ $id ] ) || ! $this->should_preserve_deferred_app_location( $id ) ) {
				continue;
			}

			$location = sanitize_key( (string) $raw_location );
			if ( in_array( $location, $this->app_location_options, true ) ) {
				$sanitized[ $id ] = $location;
			}
		}

		return $sanitized;
	}

	/**
	 * Whether an app location key may be preserved without a current registry match.
	 *
	 * Plugin-derived WordPress menu apps can be visible during a full admin page
	 * request but absent during admin-ajax.php depending on how the plugin wires its
	 * menu hooks. Preserve those per-user choices so the shell can apply them when
	 * the app appears again.
	 *
	 * @param string $id App ID.
	 * @return bool
	 */
	private function should_preserve_deferred_app_location( $id ) {
		return strlen( $id ) <= 120 && 0 === strpos( $id, 'wp-admin-' );
	}

	/**
	 * Sanitize desktop folder definitions.
	 *
	 * @param array<int,array<string,mixed>> $folders Raw desktop folders.
	 * @param array<int,array<string,mixed>> $apps Available apps.
	 * @return array<int,array<string,mixed>>
	 */
	private function sanitize_desktop_folders( $folders, $apps ) {
		$sanitized      = array();
		$folder_ids     = array();
		$folder_labels  = array();
		$reserved_ids   = array( 'content', 'site', 'system' );
		$available_apps = array();

		foreach ( (array) $apps as $app ) {
			if ( ! is_array( $app ) || empty( $app['id'] ) ) {
				continue;
			}

			$available_apps[ sanitize_key( (string) $app['id'] ) ] = true;
		}

		foreach ( (array) $folders as $folder ) {
			if ( ! is_array( $folder ) ) {
				continue;
			}

			$id = isset( $folder['id'] ) ? sanitize_key( (string) $folder['id'] ) : '';
			if ( '' === $id || isset( $folder_ids[ $id ] ) || in_array( $id, $reserved_ids, true ) ) {
				continue;
			}

			$label = isset( $folder['label'] ) ? sanitize_text_field( (string) $folder['label'] ) : '';
			$label = '' !== $label ? $label : __( 'untitled folder', 'admin-os-mode' );
			$label = $this->get_unique_desktop_folder_label( $label, $folder_labels );

			$folder_ids[ $id ] = true;
			$folder_labels[ strtolower( $label ) ] = true;

			$sanitized[] = array(
				'appIds'       => $this->sanitize_desktop_folder_app_ids(
					isset( $folder['appIds'] ) && is_array( $folder['appIds'] ) ? $folder['appIds'] : array(),
					$available_apps
				),
				'comment'      => isset( $folder['comment'] ) ? sanitize_textarea_field( (string) $folder['comment'] ) : '',
				'createdAt'    => $this->sanitize_desktop_folder_timestamp( isset( $folder['createdAt'] ) ? $folder['createdAt'] : '', gmdate( 'c' ) ),
				'icon'         => Admin_OS_Mode_Icon_Renderer::normalize(
					isset( $folder['icon'] )
						? $folder['icon']
						: array(
							'type'     => 'theme',
							'name'     => 'folder.svg',
							'fallback' => 'dashicons-category',
						)
				),
				'id'           => $id,
				'label'        => $label,
				'lastOpenedAt' => $this->sanitize_desktop_folder_timestamp( isset( $folder['lastOpenedAt'] ) ? $folder['lastOpenedAt'] : '', '' ),
				'modifiedAt'   => $this->sanitize_desktop_folder_timestamp( isset( $folder['modifiedAt'] ) ? $folder['modifiedAt'] : '', '' ),
			);

			if ( count( $sanitized ) >= 100 ) {
				break;
			}
		}

		return $sanitized;
	}

	/**
	 * Sanitize app ids inside a desktop folder.
	 *
	 * @param array<int,mixed>        $app_ids Raw app IDs.
	 * @param array<string,bool>      $available_apps App IDs visible in the current registry.
	 * @return array<int,string>
	 */
	private function sanitize_desktop_folder_app_ids( $app_ids, $available_apps ) {
		$sanitized = array();

		foreach ( $app_ids as $app_id ) {
			$app_id = sanitize_key( (string) $app_id );
			if ( '' === $app_id || isset( $sanitized[ $app_id ] ) ) {
				continue;
			}

			if ( isset( $available_apps[ $app_id ] ) || $this->should_preserve_deferred_app_location( $app_id ) ) {
				$sanitized[ $app_id ] = $app_id;
			}
		}

		return array_values( $sanitized );
	}

	/**
	 * Sanitize a desktop folder timestamp.
	 *
	 * @param mixed  $value Raw timestamp.
	 * @param string $fallback Fallback timestamp.
	 * @return string
	 */
	private function sanitize_desktop_folder_timestamp( $value, $fallback ) {
		if ( '' === $value || null === $value ) {
			return $fallback;
		}

		$time = strtotime( (string) $value );

		return false === $time ? $fallback : gmdate( 'c', $time );
	}

	/**
	 * Return a unique desktop folder label.
	 *
	 * @param string             $label Raw label.
	 * @param array<string,bool> $taken Already used lower-case labels.
	 * @return string
	 */
	private function get_unique_desktop_folder_label( $label, $taken ) {
		$base   = $label;
		$next   = $base;
		$suffix = 2;

		while ( isset( $taken[ strtolower( $next ) ] ) ) {
			$next = sprintf( '%s %d', $base, $suffix );
			$suffix++;
		}

		return $next;
	}

	/**
	 * Sanitize a Menu Bar preference payload.
	 *
	 * @param array<string,mixed> $menu_bar Raw Menu Bar data.
	 * @return array<string,mixed>
	 */
	public function sanitize_menu_bar( $menu_bar ) {
		$sanitized = $this->default_menu_bar;

		foreach ( $this->menu_bar_options as $key => $allowed ) {
			if ( ! array_key_exists( $key, $menu_bar ) ) {
				continue;
			}

			$value = sanitize_key( (string) $menu_bar[ $key ] );
			if ( in_array( $value, $allowed, true ) ) {
				$sanitized[ $key ] = $value;
			}
		}

		if ( array_key_exists( 'show_background', $menu_bar ) ) {
			$sanitized['show_background'] = $this->sanitize_boolean( $menu_bar['show_background'] );
		}

		if ( array_key_exists( 'recent_count', $menu_bar ) ) {
			$sanitized['recent_count'] = $this->sanitize_range( $menu_bar['recent_count'], 0, 50, $sanitized['recent_count'] );
		}

		return $sanitized;
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

		return $sanitized;
	}

	/**
	 * User meta keys that can be reset by Admin OS reset domains.
	 *
	 * @return array<string,string>
	 */
	private function get_reset_meta_keys() {
		return array(
			self::RESET_DOMAIN_APPEARANCE        => self::META_APPEARANCE,
			self::RESET_DOMAIN_APP_LOCATIONS     => self::META_APP_LOCATIONS,
			self::RESET_DOMAIN_DESKTOP_DOCK      => self::META_DESKTOP_DOCK,
			self::RESET_DOMAIN_DESKTOP_FOLDERS   => self::META_DESKTOP_FOLDERS,
			self::RESET_DOMAIN_MENU_BAR          => self::META_MENU_BAR,
			self::RESET_DOMAIN_THEME             => self::META_THEME,
			self::RESET_DOMAIN_WALLPAPER         => self::META_WALLPAPER,
			self::RESET_DOMAIN_WALLPAPER_UPLOADS => self::META_WALLPAPER_UPLOADS,
		);
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

	/**
	 * Sanitize a numeric range preference.
	 *
	 * @param mixed $value Raw value.
	 * @param int   $min Minimum value.
	 * @param int   $max Maximum value.
	 * @param int   $fallback Fallback value.
	 * @return int
	 */
	private function sanitize_range( $value, $min, $max, $fallback ) {
		if ( ! is_numeric( $value ) ) {
			return $fallback;
		}

		return max( $min, min( $max, (int) round( (float) $value ) ) );
	}
}
