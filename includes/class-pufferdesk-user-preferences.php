<?php
/**
 * Per-user PufferDesk preferences.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Persists user-specific shell settings.
 */
final class PufferDesk_User_Preferences {
	const META_APPEARANCE = 'pufferdesk_appearance';
	const META_APP_LOGIN_ITEMS = 'pufferdesk_app_login_items';
	const META_APP_LOCATIONS = 'pufferdesk_app_locations';
	const META_DESKTOP_DOCK = 'pufferdesk_desktop_dock';
	const META_DESKTOP_FOLDERS = 'pufferdesk_desktop_folders';
	const META_DESKTOP_TRASH = 'pufferdesk_desktop_trash';
	const META_ENABLED    = 'pufferdesk_enabled';
	const META_MENU_BAR   = 'pufferdesk_menu_bar';
	const META_NOTIFICATIONS = 'pufferdesk_notifications';
	const META_SOUNDS     = 'pufferdesk_sounds';
	const META_THEME      = 'pufferdesk_theme';
	const META_WALLPAPER  = 'pufferdesk_wallpaper';
	const META_WALLPAPER_UPLOADS = 'pufferdesk_wallpaper_uploads';
	const NOTIFICATION_SOURCE_WORDPRESS_UPDATES = 'wordpress_updates';
	const NOTIFICATION_SOURCE_COMMENTS          = 'comments';
	const NOTIFICATION_SOURCE_SITE_HEALTH       = 'site_health';
	const NOTIFICATION_SOURCE_PUFFERDESK        = 'pufferdesk';
	const NOTIFICATION_SOURCE_APPS              = 'apps';
	const APP_LOCATION_DOCK    = 'dock';
	const APP_LOCATION_DESKTOP = 'desktop';
	const APP_LOCATION_BOTH    = 'both';
	const APP_LOCATION_HIDDEN  = 'hidden';
	const WALLPAPER_UPLOAD_LIMIT = 12;
	const RESET_DOMAIN_APPEARANCE = 'appearance';
	const RESET_DOMAIN_APP_LOGIN_ITEMS = 'app_login_items';
	const RESET_DOMAIN_APP_LOCATIONS = 'app_locations';
	const RESET_DOMAIN_DESKTOP_DOCK = 'desktop_dock';
	const RESET_DOMAIN_DESKTOP_FOLDERS = 'desktop_folders';
	const RESET_DOMAIN_DESKTOP_TRASH = 'desktop_trash';
	const RESET_DOMAIN_MENU_BAR = 'menu_bar';
	const RESET_DOMAIN_NOTIFICATIONS = 'notifications';
	const RESET_DOMAIN_SOUNDS = 'sounds';
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
		'wallpaper_click'           => 'never',
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
	private $app_location_options = array(
		self::APP_LOCATION_DOCK,
		self::APP_LOCATION_DESKTOP,
		self::APP_LOCATION_BOTH,
		self::APP_LOCATION_HIDDEN,
	);

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
	 * Default notification preferences.
	 *
	 * @var array<string,mixed>
	 */
	private $default_notifications = array(
		'enabled'      => true,
		'show_badges'  => true,
		'show_toasts'  => true,
		'quiet_mode'   => false,
		'play_sound'   => false,
		'history_days' => 30,
		'severity'     => 'all',
		'sources'      => array(
			self::NOTIFICATION_SOURCE_WORDPRESS_UPDATES => true,
			self::NOTIFICATION_SOURCE_COMMENTS          => true,
			self::NOTIFICATION_SOURCE_SITE_HEALTH       => true,
			self::NOTIFICATION_SOURCE_PUFFERDESK        => true,
			self::NOTIFICATION_SOURCE_APPS              => true,
		),
	);

	/**
	 * Stable notification source IDs exposed to browser config.
	 *
	 * @return array<string,string>
	 */
	public static function notification_source_ids() {
		return array(
			'WORDPRESS_UPDATES' => self::NOTIFICATION_SOURCE_WORDPRESS_UPDATES,
			'COMMENTS'          => self::NOTIFICATION_SOURCE_COMMENTS,
			'SITE_HEALTH'       => self::NOTIFICATION_SOURCE_SITE_HEALTH,
			'PUFFERDESK'        => self::NOTIFICATION_SOURCE_PUFFERDESK,
			'APPS'              => self::NOTIFICATION_SOURCE_APPS,
		);
	}

	/**
	 * Default sound preferences.
	 *
	 * @var array<string,mixed>
	 */
	private $default_sounds = array(
		'enabled' => true,
		'volume'  => 70,
	);

	/**
	 * Allowed notification severity filters.
	 *
	 * @var array<int,string>
	 */
	private $notification_severity_options = array( 'all', 'warnings', 'critical' );

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
		'type'          => PufferDesk_Wallpaper_Registry::TYPE_THEME,
		'id'            => '',
		'attachment_id' => 0,
		'fit'           => 'cover',
		'position'      => 'center center',
	);

	/**
	 * Default Appearance preferences.
	 *
	 * @return array<string,mixed>
	 */
	public function get_default_appearance() {
		return $this->default_appearance;
	}

	/**
	 * Allowed Appearance preference values.
	 *
	 * @return array<string,array<int,string>>
	 */
	public function get_appearance_options() {
		return $this->appearance_options;
	}

	/**
	 * Default Desktop & Dock preferences.
	 *
	 * @return array<string,mixed>
	 */
	public function get_default_desktop_dock() {
		return $this->default_desktop_dock;
	}

	/**
	 * Allowed Desktop & Dock preference values.
	 *
	 * @return array<string,array<int,string>>
	 */
	public function get_desktop_dock_options() {
		return $this->desktop_dock_options;
	}

	/**
	 * Get stable app location values for browser contracts.
	 *
	 * @return array<string,string>
	 */
	public static function get_app_location_ids() {
		return array(
			'DOCK'    => self::APP_LOCATION_DOCK,
			'DESKTOP' => self::APP_LOCATION_DESKTOP,
			'BOTH'    => self::APP_LOCATION_BOTH,
			'HIDDEN'  => self::APP_LOCATION_HIDDEN,
		);
	}

	/**
	 * Allowed app location values.
	 *
	 * @return array<int,string>
	 */
	public function get_app_location_options() {
		return $this->app_location_options;
	}

	/**
	 * Default Menu Bar preferences.
	 *
	 * @return array<string,mixed>
	 */
	public function get_default_menu_bar() {
		return $this->default_menu_bar;
	}

	/**
	 * Allowed Menu Bar preference values.
	 *
	 * @return array<string,array<int,string>>
	 */
	public function get_menu_bar_options() {
		return $this->menu_bar_options;
	}

	/**
	 * Default notification preferences.
	 *
	 * @return array<string,mixed>
	 */
	public function get_default_notifications() {
		return $this->default_notifications;
	}

	/**
	 * Allowed notification severity filters.
	 *
	 * @return array<int,string>
	 */
	public function get_notification_severity_options() {
		return $this->notification_severity_options;
	}

	/**
	 * Default sound preferences.
	 *
	 * @return array<string,mixed>
	 */
	public function get_default_sounds() {
		return $this->default_sounds;
	}

	/**
	 * Default wallpaper preference.
	 *
	 * @return array<string,mixed>
	 */
	public function get_default_wallpaper() {
		return $this->default_wallpaper;
	}

	/**
	 * Whether the current user should enter PufferDesk by default.
	 *
	 * @param int $user_id Optional user ID.
	 * @return bool
	 */
	public function is_enabled( $user_id = 0 ) {
		$user_id = $user_id ? (int) $user_id : get_current_user_id();
		$value   = get_user_meta( $user_id, self::META_ENABLED, true );

		if ( '' === $value ) {
			return (bool) apply_filters( 'pufferdesk_default_enabled', true );
		}

		return '1' === $value;
	}

	/**
	 * Save the mode preference.
	 *
	 * @param bool $enabled Whether PufferDesk is enabled.
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

		$default = sanitize_key( (string) apply_filters( 'pufferdesk_default_theme', 'pufferdesk' ) );
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
				'pufferdesk_invalid_theme',
				__( 'The selected PufferDesk theme is not available.', 'pufferdesk-admin-desktop' )
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
	 * Get app placement preferences after applying theme-fixed app placement.
	 *
	 * @param array<int,array<string,mixed>> $apps Available apps.
	 * @param array<string,mixed>            $theme Current theme.
	 * @param int                            $user_id Optional user ID.
	 * @return array<string,string>
	 */
	public function get_effective_app_locations( $apps, $theme = array(), $user_id = 0 ) {
		return $this->apply_theme_fixed_app_locations( $this->get_app_locations( $apps, $user_id ), $apps, $theme );
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
	 * Get apps that should open when PufferDesk starts.
	 *
	 * @param array<int,array<string,mixed>> $apps Available apps.
	 * @param int                            $user_id Optional user ID.
	 * @return array<int,string>
	 */
	public function get_app_login_items( $apps, $user_id = 0 ) {
		$user_id = $user_id ? (int) $user_id : get_current_user_id();
		$items   = get_user_meta( $user_id, self::META_APP_LOGIN_ITEMS, true );

		return $this->sanitize_app_login_items( is_array( $items ) ? $items : array(), $apps );
	}

	/**
	 * Save apps that should open when PufferDesk starts.
	 *
	 * @param array<int,mixed>               $items App IDs.
	 * @param array<int,array<string,mixed>> $apps Available apps.
	 * @param int                            $user_id Optional user ID.
	 * @return array<int,string>
	 */
	public function set_app_login_items( $items, $apps, $user_id = 0 ) {
		$user_id = $user_id ? (int) $user_id : get_current_user_id();
		$items   = $this->sanitize_app_login_items( is_array( $items ) ? $items : array(), $apps );

		if ( empty( $items ) ) {
			delete_user_meta( $user_id, self::META_APP_LOGIN_ITEMS );
		} else {
			update_user_meta( $user_id, self::META_APP_LOGIN_ITEMS, $items );
		}

		return $items;
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
	 * Get the user's desktop Trash.
	 *
	 * @param array<int,array<string,mixed>> $apps Available apps.
	 * @param int                            $user_id Optional user ID.
	 * @return array<int,array<string,mixed>>
	 */
	public function get_desktop_trash( $apps, $user_id = 0 ) {
		$user_id = $user_id ? (int) $user_id : get_current_user_id();
		$items   = get_user_meta( $user_id, self::META_DESKTOP_TRASH, true );

		return $this->sanitize_desktop_trash( is_array( $items ) ? $items : array(), $apps );
	}

	/**
	 * Save the user's desktop Trash.
	 *
	 * @param array<int,array<string,mixed>> $items Desktop Trash item data.
	 * @param array<int,array<string,mixed>> $apps Available apps.
	 * @param int                            $user_id Optional user ID.
	 * @return array<int,array<string,mixed>>
	 */
	public function set_desktop_trash( $items, $apps, $user_id = 0 ) {
		$user_id = $user_id ? (int) $user_id : get_current_user_id();
		$items   = $this->sanitize_desktop_trash( is_array( $items ) ? $items : array(), $apps );

		if ( empty( $items ) ) {
			delete_user_meta( $user_id, self::META_DESKTOP_TRASH );
		} else {
			update_user_meta( $user_id, self::META_DESKTOP_TRASH, $items );
		}

		return $items;
	}

	/**
	 * Filter apps for a shell launch surface.
	 *
	 * @param array<int,array<string,mixed>> $apps Available apps.
	 * @param array<string,string>           $app_locations App location map.
	 * @param string                         $surface Surface ID, either dock or desktop.
	 * @param array<string,mixed>            $theme Current theme.
	 * @return array<int,array<string,mixed>>
	 */
	public function filter_apps_for_surface( $apps, $app_locations, $surface, $theme = array() ) {
		$surface = sanitize_key( (string) $surface );
		if ( ! in_array( $surface, array( self::APP_LOCATION_DOCK, self::APP_LOCATION_DESKTOP ), true ) ) {
			return array();
		}

		return array_values(
			array_filter(
				(array) $apps,
				function ( $app ) use ( $app_locations, $surface, $theme ) {
					if ( ! is_array( $app ) || empty( $app['id'] ) ) {
						return false;
					}

					$id       = sanitize_key( (string) $app['id'] );
					$location = isset( $app_locations[ $id ] ) ? $app_locations[ $id ] : self::APP_LOCATION_DOCK;

					if ( $this->is_fixed_dock_app( $app ) ) {
						$location = $this->get_theme_fixed_app_location( $app, $theme );
					}

					return self::APP_LOCATION_BOTH === $location || $surface === $location;
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
	 * Get the user's notification preferences.
	 *
	 * @param int $user_id Optional user ID.
	 * @return array<string,mixed>
	 */
	public function get_notifications( $user_id = 0 ) {
		$user_id       = $user_id ? (int) $user_id : get_current_user_id();
		$notifications = get_user_meta( $user_id, self::META_NOTIFICATIONS, true );

		return $this->sanitize_notifications( is_array( $notifications ) ? $notifications : array() );
	}

	/**
	 * Save the user's notification preferences.
	 *
	 * @param array<string,mixed> $notifications Notification preference data.
	 * @param int                 $user_id Optional user ID.
	 * @return array<string,mixed>
	 */
	public function set_notifications( $notifications, $user_id = 0 ) {
		$user_id       = $user_id ? (int) $user_id : get_current_user_id();
		$notifications = $this->sanitize_notifications( is_array( $notifications ) ? $notifications : array() );

		update_user_meta( $user_id, self::META_NOTIFICATIONS, $notifications );

		return $notifications;
	}

	/**
	 * Get the user's sound preferences.
	 *
	 * @param int $user_id Optional user ID.
	 * @return array<string,mixed>
	 */
	public function get_sounds( $user_id = 0 ) {
		$user_id = $user_id ? (int) $user_id : get_current_user_id();
		$sounds  = get_user_meta( $user_id, self::META_SOUNDS, true );

		return $this->sanitize_sounds( is_array( $sounds ) ? $sounds : array() );
	}

	/**
	 * Save the user's sound preferences.
	 *
	 * @param array<string,mixed> $sounds Sound preference data.
	 * @param int                 $user_id Optional user ID.
	 * @return array<string,mixed>
	 */
	public function set_sounds( $sounds, $user_id = 0 ) {
		$user_id = $user_id ? (int) $user_id : get_current_user_id();
		$sounds  = $this->sanitize_sounds( is_array( $sounds ) ? $sounds : array() );

		update_user_meta( $user_id, self::META_SOUNDS, $sounds );

		return $sounds;
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

		if ( in_array( $type, PufferDesk_Wallpaper_Registry::get_type_ids(), true ) ) {
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

		if ( PufferDesk_Wallpaper_Registry::TYPE_UPLOAD !== $sanitized['type'] ) {
			$sanitized['attachment_id'] = 0;
		}

		if ( PufferDesk_Wallpaper_Registry::TYPE_UPLOAD === $sanitized['type'] ) {
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
		if ( PufferDesk_Wallpaper_Registry::TYPE_UPLOAD === $wallpaper['type'] && ! empty( $wallpaper['attachment_id'] ) ) {
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
	 * Reset profiles are intentionally scoped to PufferDesk preferences. They never
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
			self::RESET_DOMAIN_APP_LOGIN_ITEMS,
			self::RESET_DOMAIN_APP_LOCATIONS,
			self::RESET_DOMAIN_DESKTOP_DOCK,
			self::RESET_DOMAIN_DESKTOP_FOLDERS,
			self::RESET_DOMAIN_DESKTOP_TRASH,
			self::RESET_DOMAIN_MENU_BAR,
			self::RESET_DOMAIN_NOTIFICATIONS,
			self::RESET_DOMAIN_SOUNDS,
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
	 * Sanitize notification preferences.
	 *
	 * @param array<string,mixed> $notifications Raw notification preferences.
	 * @return array<string,mixed>
	 */
	public function sanitize_notifications( $notifications ) {
		$sanitized = $this->default_notifications;

		foreach ( array( 'enabled', 'show_badges', 'show_toasts', 'quiet_mode', 'play_sound' ) as $key ) {
			if ( array_key_exists( $key, $notifications ) ) {
				$sanitized[ $key ] = $this->sanitize_boolean( $notifications[ $key ] );
			}
		}

		if ( array_key_exists( 'history_days', $notifications ) ) {
			$sanitized['history_days'] = $this->sanitize_range( $notifications['history_days'], 1, 90, $sanitized['history_days'] );
		}

		if ( array_key_exists( 'severity', $notifications ) ) {
			$severity = sanitize_key( (string) $notifications['severity'] );
			if ( in_array( $severity, $this->notification_severity_options, true ) ) {
				$sanitized['severity'] = $severity;
			}
		}

		$sources = isset( $notifications['sources'] ) && is_array( $notifications['sources'] ) ? $notifications['sources'] : array();
		foreach ( $sanitized['sources'] as $source => $enabled ) {
			if ( array_key_exists( $source, $sources ) ) {
				$sanitized['sources'][ $source ] = $this->sanitize_boolean( $sources[ $source ] );
			}
		}

		return $sanitized;
	}

	/**
	 * Sanitize sound preferences.
	 *
	 * @param array<string,mixed> $sounds Raw sound preferences.
	 * @return array<string,mixed>
	 */
	public function sanitize_sounds( $sounds ) {
		$sanitized = $this->default_sounds;

		if ( array_key_exists( 'enabled', $sounds ) ) {
			$sanitized['enabled'] = $this->sanitize_boolean( $sounds['enabled'] );
		}

		if ( array_key_exists( 'volume', $sounds ) ) {
			$sanitized['volume'] = $this->sanitize_range( $sounds['volume'], 0, 100, $sanitized['volume'] );
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
			$location = isset( $app_locations[ $id ] ) ? sanitize_key( (string) $app_locations[ $id ] ) : self::APP_LOCATION_DOCK;

			if ( ! in_array( $location, $this->app_location_options, true ) ) {
				$location = self::APP_LOCATION_DOCK;
			}
			if ( $this->is_fixed_dock_app( $app ) ) {
				$location = self::APP_LOCATION_DOCK;
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
	 * Apply theme-defined locations for fixed launcher apps.
	 *
	 * @param array<string,string>           $app_locations Sanitized app locations.
	 * @param array<int,array<string,mixed>> $apps Available apps.
	 * @param array<string,mixed>            $theme Current theme.
	 * @return array<string,string>
	 */
	private function apply_theme_fixed_app_locations( $app_locations, $apps, $theme ) {
		$locations = is_array( $app_locations ) ? $app_locations : array();

		foreach ( (array) $apps as $app ) {
			if ( ! $this->is_fixed_dock_app( $app ) || empty( $app['id'] ) ) {
				continue;
			}

			$locations[ sanitize_key( (string) $app['id'] ) ] = $this->get_theme_fixed_app_location( $app, $theme );
		}

		return $locations;
	}

	/**
	 * Get a fixed launcher's effective location for the current theme.
	 *
	 * @param array<string,mixed> $app App data.
	 * @param array<string,mixed> $theme Current theme.
	 * @return string
	 */
	private function get_theme_fixed_app_location( $app, $theme ) {
		if ( empty( $app['id'] ) ) {
			return self::APP_LOCATION_DOCK;
		}

		$app_id    = sanitize_key( (string) $app['id'] );
		$locations = isset( $theme['shell']['fixed_app_locations'] ) && is_array( $theme['shell']['fixed_app_locations'] )
			? $theme['shell']['fixed_app_locations']
			: array();
		$location  = isset( $locations[ $app_id ] ) ? sanitize_key( (string) $locations[ $app_id ] ) : self::APP_LOCATION_DOCK;

		return in_array( $location, $this->app_location_options, true ) ? $location : self::APP_LOCATION_DOCK;
	}

	/**
	 * Determine whether an app has a fixed Dock placement.
	 *
	 * @param array<string,mixed> $app App data.
	 * @return bool
	 */
	private function is_fixed_dock_app( $app ) {
		return is_array( $app )
			&& ! empty( $app['dock'] )
			&& is_array( $app['dock'] )
			&& ! empty( $app['dock']['fixed'] );
	}

	/**
	 * Sanitize app login item IDs.
	 *
	 * @param array<int,mixed>               $items Raw app IDs.
	 * @param array<int,array<string,mixed>> $apps Available apps.
	 * @return array<int,string>
	 */
	private function sanitize_app_login_items( $items, $apps ) {
		$available = array();
		$sanitized = array();

		foreach ( (array) $apps as $app ) {
			if ( ! is_array( $app ) || empty( $app['id'] ) ) {
				continue;
			}

			$available[ sanitize_key( (string) $app['id'] ) ] = true;
		}

		foreach ( (array) $items as $raw_id ) {
			$id = sanitize_key( (string) $raw_id );
			if ( '' === $id || isset( $sanitized[ $id ] ) ) {
				continue;
			}

			if ( isset( $available[ $id ] ) || $this->should_preserve_deferred_app_location( $id ) ) {
				$sanitized[ $id ] = $id;
			}
		}

		return array_values( $sanitized );
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
	 * Sanitize desktop Trash records.
	 *
	 * Desktop Trash currently stores PufferDesk-owned user folder snapshots only.
	 * Apps inside those folders are registry references; they are never deleted by
	 * Trash and missing plugin-derived references are dropped during sanitization.
	 *
	 * @param array<int,array<string,mixed>> $items Raw Trash records.
	 * @param array<int,array<string,mixed>> $apps Available apps.
	 * @return array<int,array<string,mixed>>
	 */
	private function sanitize_desktop_trash( $items, $apps ) {
		$sanitized = array();
		$seen      = array();

		foreach ( (array) $items as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}

			$type = isset( $item['type'] ) ? sanitize_key( (string) $item['type'] ) : 'folder';
			if ( 'folder' !== $type ) {
				continue;
			}

			$folder = $this->sanitize_desktop_folders(
				array( isset( $item['folder'] ) && is_array( $item['folder'] ) ? $item['folder'] : array() ),
				$apps
			);
			if ( empty( $folder[0] ) ) {
				continue;
			}

			$folder = $folder[0];
			$id     = isset( $item['id'] ) ? sanitize_key( (string) $item['id'] ) : '';
			$id     = '' !== $id ? $id : 'folder-' . $folder['id'];
			if ( isset( $seen[ $id ] ) ) {
				continue;
			}

			$label = isset( $item['label'] ) ? sanitize_text_field( (string) $item['label'] ) : '';
			$label = '' !== $label ? $label : $folder['label'];

			$sanitized[] = array(
				'folder'    => $folder,
				'icon'      => $folder['icon'],
				'id'        => $id,
				'label'     => $label,
				'restore'   => $this->sanitize_desktop_trash_restore( isset( $item['restore'] ) && is_array( $item['restore'] ) ? $item['restore'] : array() ),
				'trashedAt' => $this->sanitize_desktop_folder_timestamp( isset( $item['trashedAt'] ) ? $item['trashedAt'] : '', gmdate( 'c' ) ),
				'type'      => 'folder',
			);
			$seen[ $id ] = true;

			if ( count( $sanitized ) >= 100 ) {
				break;
			}
		}

		return $sanitized;
	}

	/**
	 * Sanitize desktop Trash restore metadata.
	 *
	 * @param array<string,mixed> $restore Raw restore metadata.
	 * @return array<string,mixed>
	 */
		private function sanitize_desktop_trash_restore( $restore ) {
			$previous_parent = isset( $restore['previousParent'] ) ? sanitize_key( (string) $restore['previousParent'] ) : 'desktop';
			$previous_parent = ( '' !== $previous_parent && 'trash' !== $previous_parent ) ? $previous_parent : 'desktop';
			$sanitized = array(
				'previousParent' => $previous_parent,
			);

		if ( isset( $restore['desktopPosition'] ) && is_array( $restore['desktopPosition'] ) ) {
			$position = array();
			$left     = $this->sanitize_layout_number( isset( $restore['desktopPosition']['left'] ) ? $restore['desktopPosition']['left'] : null );
			$top      = $this->sanitize_layout_number( isset( $restore['desktopPosition']['top'] ) ? $restore['desktopPosition']['top'] : null );

			if ( null !== $left ) {
				$position['left'] = $left;
			}

			if ( null !== $top ) {
				$position['top'] = $top;
			}

			if ( ! empty( $position ) ) {
				$sanitized['desktopPosition'] = $position;
			}
		}

		return $sanitized;
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
		$reserved_ids   = array( 'content', 'desktop', 'documents', 'home', 'notes', 'site', 'stickies', 'system', 'trash' );
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
				$label = '' !== $label ? $label : __( 'untitled folder', 'pufferdesk-admin-desktop' );
				$label = $this->get_unique_desktop_folder_label( $label, $folder_labels );
				$parent_id = isset( $folder['parentId'] ) ? sanitize_key( (string) $folder['parentId'] ) : 'desktop';
				$parent_id = ( '' !== $parent_id && 'trash' !== $parent_id && $parent_id !== $id ) ? $parent_id : 'desktop';

				$folder_ids[ $id ] = true;
				$folder_labels[ strtolower( $label ) ] = true;

			$sanitized[] = array(
				'appIds'       => $this->sanitize_desktop_folder_app_ids(
					isset( $folder['appIds'] ) && is_array( $folder['appIds'] ) ? $folder['appIds'] : array(),
					$available_apps
				),
				'comment'      => isset( $folder['comment'] ) ? sanitize_textarea_field( (string) $folder['comment'] ) : '',
				'createdAt'    => $this->sanitize_desktop_folder_timestamp( isset( $folder['createdAt'] ) ? $folder['createdAt'] : '', gmdate( 'c' ) ),
				'icon'         => $this->get_desktop_folder_icon(),
				'id'           => $id,
					'label'        => $label,
					'lastOpenedAt' => $this->sanitize_desktop_folder_timestamp( isset( $folder['lastOpenedAt'] ) ? $folder['lastOpenedAt'] : '', '' ),
					'modifiedAt'   => $this->sanitize_desktop_folder_timestamp( isset( $folder['modifiedAt'] ) ? $folder['modifiedAt'] : '', '' ),
					'parentId'     => $parent_id,
				);

			if ( count( $sanitized ) >= 100 ) {
				break;
			}
		}

		return $sanitized;
	}

	/**
	 * Return the standard user folder icon descriptor.
	 *
	 * @return array<string,mixed>
	 */
	private function get_desktop_folder_icon() {
		return PufferDesk_Icon_Renderer::normalize(
			array(
				'type'     => PufferDesk_Icon_Renderer::TYPE_THEME,
				'name'     => 'folder.svg',
				'fallback' => 'dashicons-category',
			)
		);
	}

	/**
	 * Sanitize a layout coordinate.
	 *
	 * @param mixed $value Raw value.
	 * @return int|null
	 */
	private function sanitize_layout_number( $value ) {
		if ( ! is_numeric( $value ) ) {
			return null;
		}

		return max( 0, min( 5000, (int) round( (float) $value ) ) );
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
	 * User meta keys that can be reset by PufferDesk reset domains.
	 *
	 * @return array<string,string>
	 */
	private function get_reset_meta_keys() {
		return array(
			self::RESET_DOMAIN_APPEARANCE        => self::META_APPEARANCE,
			self::RESET_DOMAIN_APP_LOGIN_ITEMS   => self::META_APP_LOGIN_ITEMS,
			self::RESET_DOMAIN_APP_LOCATIONS     => self::META_APP_LOCATIONS,
			self::RESET_DOMAIN_DESKTOP_DOCK      => self::META_DESKTOP_DOCK,
			self::RESET_DOMAIN_DESKTOP_FOLDERS   => self::META_DESKTOP_FOLDERS,
			self::RESET_DOMAIN_DESKTOP_TRASH     => self::META_DESKTOP_TRASH,
			self::RESET_DOMAIN_MENU_BAR          => self::META_MENU_BAR,
			self::RESET_DOMAIN_NOTIFICATIONS     => self::META_NOTIFICATIONS,
			self::RESET_DOMAIN_SOUNDS            => self::META_SOUNDS,
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
