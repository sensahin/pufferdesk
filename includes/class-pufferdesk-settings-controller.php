<?php
/**
 * Native System Settings actions.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Handles AJAX actions from the internal System Settings app.
 */
final class PufferDesk_Settings_Controller {
	const NONCE_ACTION = 'pufferdesk_settings';

	/**
	 * User preferences.
	 *
	 * @var PufferDesk_User_Preferences
	 */
	private $preferences;

	/**
	 * App registry.
	 *
	 * @var PufferDesk_App_Registry
	 */
	private $app_registry;

	/**
	 * Theme registry.
	 *
	 * @var PufferDesk_Theme_Registry
	 */
	private $theme_registry;

	/**
	 * Wallpaper registry.
	 *
	 * @var PufferDesk_Wallpaper_Registry
	 */
	private $wallpaper_registry;

	/**
	 * Workspace state service.
	 *
	 * @var PufferDesk_Workspace_State
	 */
	private $workspace_state;

	/**
	 * Settings registry.
	 *
	 * @var PufferDesk_Settings_Registry
	 */
	private $settings_registry;

	/**
	 * Constructor.
	 *
	 * @param PufferDesk_User_Preferences   $preferences User preferences.
	 * @param PufferDesk_App_Registry       $app_registry App registry.
	 * @param PufferDesk_Theme_Registry     $theme_registry Theme registry.
	 * @param PufferDesk_Wallpaper_Registry $wallpaper_registry Wallpaper registry.
	 * @param PufferDesk_Workspace_State    $workspace_state Workspace state service.
	 * @param PufferDesk_Settings_Registry  $settings_registry Settings registry.
	 */
	public function __construct(
		PufferDesk_User_Preferences $preferences,
		PufferDesk_App_Registry $app_registry,
		PufferDesk_Theme_Registry $theme_registry,
		PufferDesk_Wallpaper_Registry $wallpaper_registry,
		PufferDesk_Workspace_State $workspace_state,
		PufferDesk_Settings_Registry $settings_registry
	) {
		$this->preferences        = $preferences;
		$this->app_registry       = $app_registry;
		$this->theme_registry     = $theme_registry;
		$this->wallpaper_registry = $wallpaper_registry;
		$this->workspace_state    = $workspace_state;
		$this->settings_registry  = $settings_registry;
	}

	/**
	 * Register AJAX hooks.
	 */
	public function hooks() {
		foreach ( $this->settings_registry->get_ajax_actions() as $action => $metadata ) {
			if ( empty( $metadata['handler'] ) || ! method_exists( $this, $metadata['handler'] ) ) {
				continue;
			}

			add_action( 'wp_ajax_' . $action, array( $this, $metadata['handler'] ) );
		}
	}

	/**
	 * Save the current user's Desktop & Dock settings.
	 */
	public function save_desktop_dock() {
		$this->require_domain_access( 'desktop_dock', __( 'You do not have permission to change PufferDesk settings.', 'pufferdesk-admin-desktop' ) );

		$desktop_dock = $this->preferences->set_desktop_dock(
			array(
				'dock_size'                  => $this->read_post_value( 'dock_size' ),
				'dock_magnification'         => $this->read_post_value( 'dock_magnification' ),
				'dock_position'              => $this->read_post_value( 'dock_position' ),
				'minimize_animation'         => $this->read_post_value( 'minimize_animation' ),
				'minimize_into_app_icon'     => $this->read_post_value( 'minimize_into_app_icon' ),
				'auto_hide_dock'             => $this->read_post_value( 'auto_hide_dock' ),
				'animate_opening_apps'       => $this->read_post_value( 'animate_opening_apps' ),
				'show_open_indicators'       => $this->read_post_value( 'show_open_indicators' ),
				'wallpaper_click'            => $this->read_post_value( 'wallpaper_click' ),
				'show_widgets_desktop'       => $this->read_post_value( 'show_widgets_desktop' ),
				'dim_widgets'                => $this->read_post_value( 'dim_widgets' ),
			)
		);

		wp_send_json_success(
			array(
				'desktopDock' => $desktop_dock,
				'message'     => __( 'Desktop & Dock saved.', 'pufferdesk-admin-desktop' ),
			)
		);
	}

	/**
	 * Save the current user's app placement settings.
	 */
	public function save_app_locations() {
		$this->require_domain_access( 'app_locations', __( 'You do not have permission to change PufferDesk settings.', 'pufferdesk-admin-desktop' ) );

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Verified by require_domain_access().
		$raw_locations = isset( $_POST['locations'] )
			// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Verified by require_domain_access().
			? sanitize_text_field( wp_unslash( $_POST['locations'] ) )
			: array();
		$locations     = is_string( $raw_locations ) ? json_decode( $raw_locations, true ) : $raw_locations;
		$apps          = $this->app_registry->get_apps();
		$app_locations = $this->preferences->set_app_locations(
			is_array( $locations ) ? $locations : array(),
			$apps
		);

		wp_send_json_success(
			array(
				'appLocations' => $app_locations,
				'message'      => __( 'App locations saved.', 'pufferdesk-admin-desktop' ),
			)
		);
	}

	/**
	 * Save apps that should open when PufferDesk starts.
	 */
	public function save_app_login_items() {
		$this->require_domain_access( 'app_login_items', __( 'You do not have permission to change PufferDesk settings.', 'pufferdesk-admin-desktop' ) );

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Verified by require_domain_access().
		$raw_items = isset( $_POST['items'] )
			// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Verified by require_domain_access().
			? sanitize_text_field( wp_unslash( $_POST['items'] ) )
			: array();
		$items     = is_string( $raw_items ) ? json_decode( $raw_items, true ) : $raw_items;
		$apps      = $this->app_registry->get_apps();
		$items     = $this->preferences->set_app_login_items(
			is_array( $items ) ? $items : array(),
			$apps
		);

		wp_send_json_success(
			array(
				'appLoginItems' => $items,
				'message'       => __( 'Login items saved.', 'pufferdesk-admin-desktop' ),
			)
		);
	}

	/**
	 * Save the current user's desktop folders.
	 */
	public function save_desktop_folders() {
		$this->require_domain_access( 'desktop_folders', __( 'You do not have permission to change PufferDesk folders.', 'pufferdesk-admin-desktop' ) );

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- The settings nonce is verified above.
		$raw_folders = isset( $_POST['folders'] ) && ! is_array( $_POST['folders'] )
			// phpcs:ignore WordPress.Security.NonceVerification.Missing -- The settings nonce is verified above.
			? sanitize_textarea_field( wp_unslash( $_POST['folders'] ) )
			: '[]';
		$folders = is_string( $raw_folders ) ? json_decode( $raw_folders, true ) : array();
		$apps    = $this->app_registry->get_apps();
		$folders = $this->preferences->set_desktop_folders(
			is_array( $folders ) ? $folders : array(),
			$apps
		);

		wp_send_json_success(
			array(
				'desktopFolders' => $folders,
				'message'        => __( 'Desktop folders saved.', 'pufferdesk-admin-desktop' ),
			)
		);
	}

	/**
	 * Save the current user's desktop Trash.
	 */
	public function save_desktop_trash() {
		$this->require_domain_access( 'desktop_trash', __( 'You do not have permission to change PufferDesk Trash.', 'pufferdesk-admin-desktop' ) );

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- The settings nonce is verified above.
		$raw_items = isset( $_POST['items'] ) && ! is_array( $_POST['items'] )
			// phpcs:ignore WordPress.Security.NonceVerification.Missing -- The settings nonce is verified above.
			? sanitize_textarea_field( wp_unslash( $_POST['items'] ) )
			: '[]';
		$items = is_string( $raw_items ) ? json_decode( $raw_items, true ) : array();
		$apps  = $this->app_registry->get_apps();
		$items = $this->preferences->set_desktop_trash(
			is_array( $items ) ? $items : array(),
			$apps
		);

		wp_send_json_success(
			array(
				'desktopTrash' => $items,
				'message'      => __( 'Trash saved.', 'pufferdesk-admin-desktop' ),
			)
		);
	}

	/**
	 * Save the current user's appearance settings.
	 */
	public function save_appearance() {
		$this->require_domain_access( 'appearance', __( 'You do not have permission to change PufferDesk settings.', 'pufferdesk-admin-desktop' ) );

		$appearance = $this->preferences->set_appearance(
			array(
				'mode'              => $this->read_post_value( 'mode' ),
				'window_material'   => $this->read_post_value( 'window_material' ),
				'accent_color'      => $this->read_post_value( 'accent_color' ),
				'icon_widget_style' => $this->read_post_value( 'icon_widget_style' ),
			)
		);

		wp_send_json_success(
			array(
				'appearance' => $appearance,
				'message'    => __( 'Appearance saved.', 'pufferdesk-admin-desktop' ),
			)
		);
	}

	/**
	 * Save the current user's Menu Bar settings.
	 */
	public function save_menu_bar() {
		$this->require_domain_access( 'menu_bar', __( 'You do not have permission to change PufferDesk settings.', 'pufferdesk-admin-desktop' ) );

		$menu_bar = $this->preferences->set_menu_bar(
			array(
				'auto_hide'       => $this->read_post_value( 'auto_hide' ),
				'show_background' => $this->read_post_value( 'show_background' ),
				'recent_count'    => $this->read_post_value( 'recent_count' ),
			)
		);

		wp_send_json_success(
			array(
				'menuBar' => $menu_bar,
				'message' => __( 'Menu Bar saved.', 'pufferdesk-admin-desktop' ),
			)
		);
	}

	/**
	 * Save the current user's Notifications settings.
	 */
	public function save_notifications() {
		$this->require_domain_access( 'notifications', __( 'You do not have permission to change PufferDesk settings.', 'pufferdesk-admin-desktop' ) );

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Verified by require_domain_access().
		$raw_sources = isset( $_POST['sources'] ) && ! is_array( $_POST['sources'] )
			// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Verified by require_domain_access().
			? sanitize_textarea_field( wp_unslash( $_POST['sources'] ) )
			: '{}';
		$sources = is_string( $raw_sources ) ? json_decode( $raw_sources, true ) : array();

		$notifications = $this->preferences->set_notifications(
			array(
				'enabled'      => $this->read_post_value( 'enabled' ),
				'show_badges'  => $this->read_post_value( 'show_badges' ),
				'show_toasts'  => $this->read_post_value( 'show_toasts' ),
				'quiet_mode'   => $this->read_post_value( 'quiet_mode' ),
				'play_sound'   => $this->read_post_value( 'play_sound' ),
				'history_days' => $this->read_post_value( 'history_days' ),
				'severity'     => $this->read_post_value( 'severity' ),
				'sources'      => is_array( $sources ) ? $sources : array(),
			)
		);

		wp_send_json_success(
			array(
				'message'       => __( 'Notifications saved.', 'pufferdesk-admin-desktop' ),
				'notifications' => $notifications,
			)
		);
	}

	/**
	 * Save the current user's selected theme.
	 */
	public function save_theme() {
		$this->require_domain_access( 'theme', __( 'You do not have permission to change PufferDesk settings.', 'pufferdesk-admin-desktop' ) );

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Verified by require_domain_access().
		$theme_id = isset( $_POST['theme_id'] )
			// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Verified by require_domain_access().
			? sanitize_key( wp_unslash( $_POST['theme_id'] ) )
			: '';

		$result = $this->preferences->set_theme_id( $theme_id, $this->theme_registry->get_themes() );
		if ( is_wp_error( $result ) ) {
			wp_send_json_error(
				array(
					'message' => $result->get_error_message(),
				),
				400
			);
		}

		$theme = $this->theme_registry->get_current_theme( $this->preferences );
		wp_send_json_success(
			array(
				'message' => __( 'Theme saved.', 'pufferdesk-admin-desktop' ),
				'theme'   => array(
					'id'            => $theme['id'],
					'label'         => $theme['label'],
					'family'        => $theme['family'],
					'family_label'  => $theme['family_label'],
					'version'       => $theme['version'],
					'version_label' => $theme['version_label'],
				),
			)
		);
	}

	/**
	 * Save the current user's wallpaper preference.
	 */
	public function save_wallpaper() {
		$this->require_domain_access( 'wallpaper', __( 'You do not have permission to change PufferDesk settings.', 'pufferdesk-admin-desktop' ) );

		$wallpaper = $this->preferences->sanitize_wallpaper(
			array(
				'type'          => $this->read_post_value( 'type' ),
				'id'            => $this->read_post_value( 'id' ),
				'attachment_id' => $this->read_post_value( 'attachment_id' ),
				'fit'           => $this->read_post_value( 'fit' ),
				'position'      => $this->read_post_value( 'position' ),
			)
		);
		$theme     = $this->theme_registry->get_current_theme( $this->preferences );
		$result    = $this->wallpaper_registry->validate_preference( $wallpaper, $theme );

		if ( is_wp_error( $result ) ) {
			wp_send_json_error(
				array(
					'message' => $result->get_error_message(),
				),
				400
			);
		}

		$this->preferences->set_wallpaper( $wallpaper );

		wp_send_json_success(
			array(
				'message'   => __( 'Wallpaper saved.', 'pufferdesk-admin-desktop' ),
				'wallpaper' => $this->wallpaper_registry->get_client_config( $theme, $this->preferences ),
			)
		);
	}

	/**
	 * Remove a saved uploaded wallpaper from the current user's photo list.
	 */
	public function remove_wallpaper_upload() {
		$this->require_domain_access( 'wallpaper_uploads', __( 'You do not have permission to change PufferDesk settings.', 'pufferdesk-admin-desktop' ) );

		$attachment_id = absint( $this->read_post_value( 'attachment_id' ) );
		if ( ! $attachment_id ) {
			wp_send_json_error(
				array(
					'message' => __( 'Choose a valid photo to remove.', 'pufferdesk-admin-desktop' ),
				),
				400
			);
		}

		$current_wallpaper = $this->preferences->get_wallpaper();
		$this->preferences->remove_wallpaper_upload( $attachment_id );
		if (
			'upload' === $current_wallpaper['type'] &&
			$attachment_id === (int) $current_wallpaper['attachment_id']
		) {
			$this->preferences->reset_wallpaper();
		}

		$theme = $this->theme_registry->get_current_theme( $this->preferences );

		wp_send_json_success(
			array(
				'message'   => __( 'Photo removed.', 'pufferdesk-admin-desktop' ),
				'wallpaper' => $this->wallpaper_registry->get_client_config( $theme, $this->preferences ),
			)
		);
	}

	/**
	 * Reset current-user PufferDesk preference domains.
	 */
	public function reset_preferences() {
		$this->require_domain_access( 'reset', __( 'You do not have permission to reset PufferDesk settings.', 'pufferdesk-admin-desktop' ) );

		$profile = sanitize_key( $this->read_post_value( 'profile' ) );
		$domains = $this->preferences->get_reset_domains_for_profile( $profile );

		if ( empty( $domains ) ) {
			wp_send_json_error(
				array(
					'message' => __( 'Choose a valid PufferDesk reset option.', 'pufferdesk-admin-desktop' ),
				),
				400
			);
		}

		$reset_domains          = $this->preferences->reset_domains( $domains );
		$workspace_states_reset = $this->workspace_state->delete_all_states();

		wp_send_json_success(
			array(
				'client'       => array(
					'clearAllUserSessions' => true,
					'reload'               => true,
				),
				'message'      => __( 'PufferDesk settings were reset.', 'pufferdesk-admin-desktop' ),
				'profile'      => $profile,
				'resetDomains' => $reset_domains,
				'workspaceStatesReset' => $workspace_states_reset,
			)
		);
	}

	/**
	 * Verify settings nonce and current-user capability for a settings domain.
	 *
	 * @param string $domain_id Settings domain ID.
	 * @param string $message Permission error message.
	 */
	private function require_domain_access( $domain_id, $message ) {
		$domain     = $this->settings_registry->get_domain( $domain_id );
		$capability = isset( $domain['capability'] ) ? sanitize_key( $domain['capability'] ) : PufferDesk_Settings_Registry::CAPABILITY;

		if ( ! is_user_logged_in() || ! current_user_can( $capability ) ) {
			wp_send_json_error(
				array(
					'message' => $message,
				),
				403
			);
		}

		check_ajax_referer( self::NONCE_ACTION, 'nonce' );
	}

	/**
	 * Read a scalar POST value.
	 *
	 * @param string $key POST key.
	 * @return string
	 */
	private function read_post_value( $key ) {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- AJAX handlers verify the settings nonce before calling this helper.
		if ( ! isset( $_POST[ $key ] ) || is_array( $_POST[ $key ] ) ) {
			return '';
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- AJAX handlers verify the settings nonce before calling this helper.
		return sanitize_text_field( wp_unslash( $_POST[ $key ] ) );
	}
}
