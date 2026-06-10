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

	/**
	 * Get all settings domains keyed by stable domain ID.
	 *
	 * @return array<string,array<string,mixed>>
	 */
	public function get_domains() {
		$domains = array(
			'appearance'        => array(
				'id'           => 'appearance',
				'label'        => 'Appearance',
				'panel'        => 'appearance',
				'capability'   => self::CAPABILITY,
				'ajax_action'  => 'pufferdesk_save_appearance',
				'handler'      => 'save_appearance',
				'preference_key' => PufferDesk_User_Preferences::META_APPEARANCE,
				'reset_domain' => PufferDesk_User_Preferences::RESET_DOMAIN_APPEARANCE,
				'sanitizer'    => 'PufferDesk_User_Preferences::set_appearance',
				'default'      => array(
					'mode'              => 'auto',
					'window_material'   => 'clear',
					'accent_color'      => 'multicolor',
					'icon_widget_style' => 'default',
				),
			),
			'desktop_dock'      => array(
				'id'           => 'desktop_dock',
				'label'        => 'Desktop & Dock',
				'panel'        => 'desktop-dock',
				'capability'   => self::CAPABILITY,
				'ajax_action'  => 'pufferdesk_save_desktop_dock',
				'handler'      => 'save_desktop_dock',
				'preference_key' => PufferDesk_User_Preferences::META_DESKTOP_DOCK,
				'reset_domain' => PufferDesk_User_Preferences::RESET_DOMAIN_DESKTOP_DOCK,
				'sanitizer'    => 'PufferDesk_User_Preferences::set_desktop_dock',
				'default'      => array(
					'dock_size'              => 48,
					'dock_magnification'     => 0,
					'dock_position'          => 'bottom',
					'minimize_animation'     => 'genie',
					'minimize_into_app_icon' => false,
					'auto_hide_dock'         => false,
					'animate_opening_apps'   => true,
					'show_open_indicators'   => true,
					'wallpaper_click'        => 'never',
					'show_widgets_desktop'   => true,
					'dim_widgets'            => 'automatic',
				),
			),
			'app_locations'     => array(
				'id'           => 'app_locations',
				'label'        => 'App Locations',
				'panel'        => 'apps',
				'capability'   => self::CAPABILITY,
				'ajax_action'  => 'pufferdesk_save_app_locations',
				'handler'      => 'save_app_locations',
				'preference_key' => PufferDesk_User_Preferences::META_APP_LOCATIONS,
				'reset_domain' => PufferDesk_User_Preferences::RESET_DOMAIN_APP_LOCATIONS,
				'sanitizer'    => 'PufferDesk_User_Preferences::set_app_locations',
				'default'      => array(),
			),
			'app_login_items'   => array(
				'id'           => 'app_login_items',
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
			'desktop_folders'   => array(
				'id'           => 'desktop_folders',
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
			'desktop_trash'     => array(
				'id'           => 'desktop_trash',
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
			'menu_bar'          => array(
				'id'           => 'menu_bar',
				'label'        => 'Menu Bar',
				'panel'        => 'menu-bar',
				'capability'   => self::CAPABILITY,
				'ajax_action'  => 'pufferdesk_save_menu_bar',
				'handler'      => 'save_menu_bar',
				'preference_key' => PufferDesk_User_Preferences::META_MENU_BAR,
				'reset_domain' => PufferDesk_User_Preferences::RESET_DOMAIN_MENU_BAR,
				'sanitizer'    => 'PufferDesk_User_Preferences::set_menu_bar',
				'default'      => array(
					'auto_hide'       => 'fullscreen',
					'show_background' => false,
					'recent_count'    => 10,
				),
			),
			'theme'             => array(
				'id'           => 'theme',
				'label'        => 'Theme',
				'panel'        => 'appearance',
				'capability'   => self::CAPABILITY,
				'ajax_action'  => 'pufferdesk_save_theme',
				'handler'      => 'save_theme',
				'preference_key' => PufferDesk_User_Preferences::META_THEME,
				'reset_domain' => PufferDesk_User_Preferences::RESET_DOMAIN_THEME,
				'sanitizer'    => 'PufferDesk_User_Preferences::set_theme_id',
				'default'      => 'pufferdesk',
			),
			'wallpaper'         => array(
				'id'           => 'wallpaper',
				'label'        => 'Wallpaper',
				'panel'        => 'wallpaper',
				'capability'   => self::CAPABILITY,
				'ajax_action'  => 'pufferdesk_save_wallpaper',
				'handler'      => 'save_wallpaper',
				'preference_key' => PufferDesk_User_Preferences::META_WALLPAPER,
				'reset_domain' => PufferDesk_User_Preferences::RESET_DOMAIN_WALLPAPER,
				'sanitizer'    => 'PufferDesk_User_Preferences::sanitize_wallpaper',
				'default'      => array(
					'type'          => 'theme',
					'id'            => '',
					'attachment_id' => 0,
					'fit'           => 'cover',
					'position'      => 'center center',
				),
			),
			'wallpaper_uploads' => array(
				'id'           => 'wallpaper_uploads',
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
			'reset'             => array(
				'id'          => 'reset',
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
				return __( 'Appearance', 'pufferdesk-admin-desktop' );
			case 'desktop_dock':
				return __( 'Desktop & Dock', 'pufferdesk-admin-desktop' );
			case 'app_locations':
				return __( 'App Locations', 'pufferdesk-admin-desktop' );
			case 'app_login_items':
				return __( 'Login Items', 'pufferdesk-admin-desktop' );
			case 'desktop_folders':
				return __( 'Desktop Folders', 'pufferdesk-admin-desktop' );
			case 'desktop_trash':
				return __( 'Trash', 'pufferdesk-admin-desktop' );
			case 'menu_bar':
				return __( 'Menu Bar', 'pufferdesk-admin-desktop' );
			case 'theme':
				return __( 'Theme', 'pufferdesk-admin-desktop' );
			case 'wallpaper':
				return __( 'Wallpaper', 'pufferdesk-admin-desktop' );
			case 'wallpaper_uploads':
				return __( 'Wallpaper Uploads', 'pufferdesk-admin-desktop' );
			case 'reset':
				return __( 'Reset', 'pufferdesk-admin-desktop' );
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
			);
		}

		return $domains;
	}
}
