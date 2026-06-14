<?php
/**
 * Settings domain registry.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Describes internal System Settings domains and their persistence contracts.
 */
final class PufferDesk_Settings_Registry {
	const CAPABILITY = 'read';
	const DOMAIN_APPEARANCE        = 'appearance';
	const DOMAIN_DESKTOP_DOCK      = 'desktop_dock';
	const DOMAIN_APP_LOCATIONS     = 'app_locations';
	const DOMAIN_APP_LOGIN_ITEMS   = 'app_login_items';
	const DOMAIN_DESKTOP_FOLDERS   = 'desktop_folders';
	const DOMAIN_DESKTOP_TRASH     = 'desktop_trash';
	const DOMAIN_MENU_BAR          = 'menu_bar';
	const DOMAIN_NOTIFICATIONS     = 'notifications';
	const DOMAIN_SOUNDS            = 'sounds';
	const DOMAIN_THEME             = 'theme';
	const DOMAIN_WALLPAPER         = 'wallpaper';
	const DOMAIN_WALLPAPER_UPLOADS = 'wallpaper_uploads';
	const DOMAIN_RESET             = 'reset';

	/**
	 * User preference contract.
	 *
	 * @var PufferDesk_User_Preferences
	 */
	private $preferences;

	/**
	 * Constructor.
	 *
	 * @param PufferDesk_User_Preferences|null $preferences User preference contract.
	 */
	public function __construct( $preferences = null ) {
		$this->preferences = $preferences instanceof PufferDesk_User_Preferences ? $preferences : new PufferDesk_User_Preferences();
	}

	/**
	 * Get all settings domains keyed by stable domain ID.
	 *
	 * @return array<string,array<string,mixed>>
	 */
	public function get_domains() {
		$domains = array(
			self::DOMAIN_APPEARANCE => array(
				'id'           => self::DOMAIN_APPEARANCE,
				'label'        => 'Appearance',
				'panel'        => 'appearance',
				'capability'   => self::CAPABILITY,
				'ajax_action'  => 'pufferdesk_save_appearance',
				'handler'      => 'save_appearance',
				'preference_key' => PufferDesk_User_Preferences::META_APPEARANCE,
				'reset_domain' => PufferDesk_User_Preferences::RESET_DOMAIN_APPEARANCE,
				'sanitizer'    => 'PufferDesk_User_Preferences::set_appearance',
				'default'      => $this->preferences->get_default_appearance(),
				'options'      => $this->preferences->get_appearance_options(),
			),
			self::DOMAIN_DESKTOP_DOCK => array(
				'id'           => self::DOMAIN_DESKTOP_DOCK,
				'label'        => 'Desktop & Dock',
				'panel'        => 'desktop-dock',
				'capability'   => self::CAPABILITY,
				'ajax_action'  => 'pufferdesk_save_desktop_dock',
				'handler'      => 'save_desktop_dock',
				'preference_key' => PufferDesk_User_Preferences::META_DESKTOP_DOCK,
				'reset_domain' => PufferDesk_User_Preferences::RESET_DOMAIN_DESKTOP_DOCK,
				'sanitizer'    => 'PufferDesk_User_Preferences::set_desktop_dock',
				'default'      => $this->preferences->get_default_desktop_dock(),
				'options'      => $this->preferences->get_desktop_dock_options(),
			),
			self::DOMAIN_APP_LOCATIONS => array(
				'id'           => self::DOMAIN_APP_LOCATIONS,
				'label'        => 'App Locations',
				'panel'        => 'apps',
				'capability'   => self::CAPABILITY,
				'ajax_action'  => 'pufferdesk_save_app_locations',
				'handler'      => 'save_app_locations',
				'preference_key' => PufferDesk_User_Preferences::META_APP_LOCATIONS,
				'reset_domain' => PufferDesk_User_Preferences::RESET_DOMAIN_APP_LOCATIONS,
				'sanitizer'    => 'PufferDesk_User_Preferences::set_app_locations',
				'default'      => array(),
				'options'      => $this->preferences->get_app_location_options(),
			),
			self::DOMAIN_APP_LOGIN_ITEMS => array(
				'id'           => self::DOMAIN_APP_LOGIN_ITEMS,
				'label'        => 'Login Items',
				'panel'        => 'apps',
				'capability'   => self::CAPABILITY,
				'ajax_action'  => 'pufferdesk_save_app_login_items',
				'handler'      => 'save_app_login_items',
				'preference_key' => PufferDesk_User_Preferences::META_APP_LOGIN_ITEMS,
				'reset_domain' => PufferDesk_User_Preferences::RESET_DOMAIN_APP_LOGIN_ITEMS,
				'sanitizer'    => 'PufferDesk_User_Preferences::set_app_login_items',
				'default'      => array(),
			),
			self::DOMAIN_DESKTOP_FOLDERS => array(
				'id'           => self::DOMAIN_DESKTOP_FOLDERS,
				'label'        => 'Desktop Folders',
				'panel'        => 'apps',
				'capability'   => self::CAPABILITY,
				'ajax_action'  => 'pufferdesk_save_desktop_folders',
				'handler'      => 'save_desktop_folders',
				'preference_key' => PufferDesk_User_Preferences::META_DESKTOP_FOLDERS,
				'reset_domain' => PufferDesk_User_Preferences::RESET_DOMAIN_DESKTOP_FOLDERS,
				'sanitizer'    => 'PufferDesk_User_Preferences::set_desktop_folders',
				'default'      => array(),
			),
			self::DOMAIN_DESKTOP_TRASH => array(
				'id'           => self::DOMAIN_DESKTOP_TRASH,
				'label'        => 'Trash',
				'panel'        => 'apps',
				'capability'   => self::CAPABILITY,
				'ajax_action'  => 'pufferdesk_save_desktop_trash',
				'handler'      => 'save_desktop_trash',
				'preference_key' => PufferDesk_User_Preferences::META_DESKTOP_TRASH,
				'reset_domain' => PufferDesk_User_Preferences::RESET_DOMAIN_DESKTOP_TRASH,
				'sanitizer'    => 'PufferDesk_User_Preferences::set_desktop_trash',
				'default'      => array(),
			),
			self::DOMAIN_MENU_BAR => array(
				'id'           => self::DOMAIN_MENU_BAR,
				'label'        => 'Menu Bar',
				'panel'        => 'menu-bar',
				'capability'   => self::CAPABILITY,
				'ajax_action'  => 'pufferdesk_save_menu_bar',
				'handler'      => 'save_menu_bar',
				'preference_key' => PufferDesk_User_Preferences::META_MENU_BAR,
				'reset_domain' => PufferDesk_User_Preferences::RESET_DOMAIN_MENU_BAR,
				'sanitizer'    => 'PufferDesk_User_Preferences::set_menu_bar',
				'default'      => $this->preferences->get_default_menu_bar(),
				'options'      => $this->preferences->get_menu_bar_options(),
			),
			self::DOMAIN_NOTIFICATIONS => array(
				'id'           => self::DOMAIN_NOTIFICATIONS,
				'label'        => 'Notifications',
				'panel'        => 'notifications',
				'capability'   => self::CAPABILITY,
				'ajax_action'  => 'pufferdesk_save_notifications',
				'handler'      => 'save_notifications',
				'preference_key' => PufferDesk_User_Preferences::META_NOTIFICATIONS,
				'reset_domain' => PufferDesk_User_Preferences::RESET_DOMAIN_NOTIFICATIONS,
				'sanitizer'    => 'PufferDesk_User_Preferences::set_notifications',
				'default'      => $this->preferences->get_default_notifications(),
				'options'      => array(
					'severity' => $this->preferences->get_notification_severity_options(),
				),
			),
			self::DOMAIN_SOUNDS => array(
				'id'           => self::DOMAIN_SOUNDS,
				'label'        => 'Sound',
				'panel'        => 'sounds',
				'capability'   => self::CAPABILITY,
				'ajax_action'  => 'pufferdesk_save_sounds',
				'handler'      => 'save_sounds',
				'preference_key' => PufferDesk_User_Preferences::META_SOUNDS,
				'reset_domain' => PufferDesk_User_Preferences::RESET_DOMAIN_SOUNDS,
				'sanitizer'    => 'PufferDesk_User_Preferences::set_sounds',
				'default'      => $this->preferences->get_default_sounds(),
			),
			self::DOMAIN_THEME => array(
				'id'           => self::DOMAIN_THEME,
				'label'        => 'Theme',
				'panel'        => 'appearance',
				'capability'   => self::CAPABILITY,
				'ajax_action'  => 'pufferdesk_save_theme',
				'handler'      => 'save_theme',
				'preference_key' => PufferDesk_User_Preferences::META_THEME,
				'reset_domain' => PufferDesk_User_Preferences::RESET_DOMAIN_THEME,
				'sanitizer'    => 'PufferDesk_User_Preferences::set_theme_mode',
				'default'      => PufferDesk_User_Preferences::THEME_MODE_DEFAULT,
				'options'      => $this->preferences->get_theme_mode_options(),
			),
			self::DOMAIN_WALLPAPER => array(
				'id'           => self::DOMAIN_WALLPAPER,
				'label'        => 'Wallpaper',
				'panel'        => 'wallpaper',
				'capability'   => self::CAPABILITY,
				'ajax_action'  => 'pufferdesk_save_wallpaper',
				'handler'      => 'save_wallpaper',
				'preference_key' => PufferDesk_User_Preferences::META_WALLPAPER,
				'reset_domain' => PufferDesk_User_Preferences::RESET_DOMAIN_WALLPAPER,
				'sanitizer'    => 'PufferDesk_User_Preferences::sanitize_wallpaper',
				'default'      => $this->preferences->get_default_wallpaper(),
			),
			self::DOMAIN_WALLPAPER_UPLOADS => array(
				'id'           => self::DOMAIN_WALLPAPER_UPLOADS,
				'label'        => 'Wallpaper Uploads',
				'panel'        => 'wallpaper',
				'capability'   => self::CAPABILITY,
				'ajax_action'  => 'pufferdesk_remove_wallpaper_upload',
				'handler'      => 'remove_wallpaper_upload',
				'preference_key' => PufferDesk_User_Preferences::META_WALLPAPER_UPLOADS,
				'reset_domain' => PufferDesk_User_Preferences::RESET_DOMAIN_WALLPAPER_UPLOADS,
				'sanitizer'    => 'PufferDesk_User_Preferences::remove_wallpaper_upload',
				'default'      => array(),
			),
			self::DOMAIN_RESET => array(
				'id'          => self::DOMAIN_RESET,
				'label'       => 'Reset',
				'panel'       => 'workspace',
				'capability'  => self::CAPABILITY,
				'ajax_action' => 'pufferdesk_reset',
				'handler'     => 'reset_preferences',
				'sanitizer'   => 'PufferDesk_User_Preferences::reset_domains',
				'default'     => array(),
			),
		);

		/**
		 * Filter internal PufferDesk settings domain metadata.
		 *
		 * This describes existing persistence contracts only. Changing IDs,
		 * action names, preference keys, or reset domains can break saved user state.
		 *
		 * @param array<string,array<string,mixed>> $domains Domain metadata.
		 */
		return apply_filters( 'pufferdesk_settings_domains', $domains );
	}

	/**
	 * Stable domain IDs exposed to browser config.
	 *
	 * @return array<string,string>
	 */
	public static function domain_ids() {
		return array(
			'APPEARANCE'        => self::DOMAIN_APPEARANCE,
			'DESKTOP_DOCK'      => self::DOMAIN_DESKTOP_DOCK,
			'APP_LOCATIONS'     => self::DOMAIN_APP_LOCATIONS,
			'APP_LOGIN_ITEMS'   => self::DOMAIN_APP_LOGIN_ITEMS,
			'DESKTOP_FOLDERS'   => self::DOMAIN_DESKTOP_FOLDERS,
			'DESKTOP_TRASH'     => self::DOMAIN_DESKTOP_TRASH,
			'MENU_BAR'          => self::DOMAIN_MENU_BAR,
			'NOTIFICATIONS'     => self::DOMAIN_NOTIFICATIONS,
			'SOUNDS'            => self::DOMAIN_SOUNDS,
			'THEME'             => self::DOMAIN_THEME,
			'WALLPAPER'         => self::DOMAIN_WALLPAPER,
			'WALLPAPER_UPLOADS' => self::DOMAIN_WALLPAPER_UPLOADS,
			'RESET'             => self::DOMAIN_RESET,
		);
	}

	/**
	 * Get one domain descriptor.
	 *
	 * @param string $domain_id Domain ID.
	 * @return array<string,mixed>
	 */
	public function get_domain( $domain_id ) {
		$domains   = $this->get_domains();
		$domain_id = sanitize_key( $domain_id );

		return isset( $domains[ $domain_id ] ) && is_array( $domains[ $domain_id ] )
			? $domains[ $domain_id ]
			: array();
	}

	/**
	 * Get AJAX action metadata keyed by action name.
	 *
	 * @return array<string,array<string,string>>
	 */
	public function get_ajax_actions() {
		$actions = array();

		foreach ( $this->get_domains() as $domain_id => $domain ) {
			if ( empty( $domain['ajax_action'] ) || empty( $domain['handler'] ) ) {
				continue;
			}

			$action  = sanitize_key( $domain['ajax_action'] );
			$handler = sanitize_key( $domain['handler'] );
			if ( '' === $action || '' === $handler ) {
				continue;
			}

			$actions[ $action ] = array(
				'domain'  => ! empty( $domain['id'] ) ? sanitize_key( $domain['id'] ) : sanitize_key( $domain_id ),
				'handler' => $handler,
			);
		}

		return $actions;
	}

	/**
	 * Localized label for a core settings domain.
	 *
	 * Domain contracts are read during plugin bootstrap to register AJAX hooks,
	 * so translations are intentionally delayed until client metadata is built.
	 *
	 * @param string $domain_id Domain ID.
	 * @param string $fallback  Fallback label.
	 * @return string
	 */
	private function get_client_domain_label( $domain_id, $fallback ) {
		switch ( $domain_id ) {
			case 'appearance':
				return __( 'Appearance', 'pufferdesk' );
			case 'desktop_dock':
				return __( 'Desktop & Dock', 'pufferdesk' );
			case 'app_locations':
				return __( 'App Locations', 'pufferdesk' );
			case 'app_login_items':
				return __( 'Login Items', 'pufferdesk' );
			case 'desktop_folders':
				return __( 'Desktop Folders', 'pufferdesk' );
			case 'desktop_trash':
				return __( 'Trash', 'pufferdesk' );
			case 'menu_bar':
				return __( 'Menu Bar', 'pufferdesk' );
			case 'notifications':
				return __( 'Notifications', 'pufferdesk' );
			case 'sounds':
				return __( 'Sound', 'pufferdesk' );
			case 'theme':
				return __( 'Theme', 'pufferdesk' );
			case 'wallpaper':
				return __( 'Wallpaper', 'pufferdesk' );
			case 'wallpaper_uploads':
				return __( 'Wallpaper Uploads', 'pufferdesk' );
			case 'reset':
				return __( 'Reset', 'pufferdesk' );
			default:
				return $fallback;
		}
	}

	/**
	 * Client-safe settings domain metadata.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	public function get_client_domains() {
		$domains = array();

		foreach ( $this->get_domains() as $domain ) {
			if ( empty( $domain['id'] ) ) {
				continue;
			}

			$domain_id = sanitize_key( $domain['id'] );
			$label     = isset( $domain['label'] ) ? sanitize_text_field( $domain['label'] ) : $domain_id;

			$domains[] = array(
				'id'          => $domain_id,
				'label'       => $this->get_client_domain_label( $domain_id, $label ),
				'panel'       => isset( $domain['panel'] ) ? sanitize_key( $domain['panel'] ) : '',
				'capability'  => isset( $domain['capability'] ) ? sanitize_key( $domain['capability'] ) : self::CAPABILITY,
				'action'      => isset( $domain['ajax_action'] ) ? sanitize_key( $domain['ajax_action'] ) : '',
				'resetDomain' => isset( $domain['reset_domain'] ) ? sanitize_key( $domain['reset_domain'] ) : '',
				'default'     => isset( $domain['default'] ) ? $domain['default'] : null,
				'options'     => isset( $domain['options'] ) && is_array( $domain['options'] ) ? $domain['options'] : array(),
			);
		}

		return $domains;
	}
}
