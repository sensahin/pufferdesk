<?php
/**
 * Native System Settings actions.
 *
 * @package AdminOSMode
 */

defined( 'ABSPATH' ) || exit;

/**
 * Handles AJAX actions from the internal System Settings app.
 */
final class Admin_OS_Mode_Settings_Controller {
	const NONCE_ACTION = 'admin_os_mode_settings';

	/**
	 * User preferences.
	 *
	 * @var Admin_OS_Mode_User_Preferences
	 */
	private $preferences;

	/**
	 * Theme registry.
	 *
	 * @var Admin_OS_Mode_Theme_Registry
	 */
	private $theme_registry;

	/**
	 * Wallpaper registry.
	 *
	 * @var Admin_OS_Mode_Wallpaper_Registry
	 */
	private $wallpaper_registry;

	/**
	 * Constructor.
	 *
	 * @param Admin_OS_Mode_User_Preferences $preferences User preferences.
	 * @param Admin_OS_Mode_Theme_Registry   $theme_registry Theme registry.
	 * @param Admin_OS_Mode_Wallpaper_Registry $wallpaper_registry Wallpaper registry.
	 */
	public function __construct(
		Admin_OS_Mode_User_Preferences $preferences,
		Admin_OS_Mode_Theme_Registry $theme_registry,
		Admin_OS_Mode_Wallpaper_Registry $wallpaper_registry
	) {
		$this->preferences        = $preferences;
		$this->theme_registry     = $theme_registry;
		$this->wallpaper_registry = $wallpaper_registry;
	}

	/**
	 * Register AJAX hooks.
	 */
	public function hooks() {
		add_action( 'wp_ajax_admin_os_mode_save_appearance', array( $this, 'save_appearance' ) );
		add_action( 'wp_ajax_admin_os_mode_save_desktop_dock', array( $this, 'save_desktop_dock' ) );
		add_action( 'wp_ajax_admin_os_mode_save_theme', array( $this, 'save_theme' ) );
		add_action( 'wp_ajax_admin_os_mode_save_wallpaper', array( $this, 'save_wallpaper' ) );
		add_action( 'wp_ajax_admin_os_mode_remove_wallpaper_upload', array( $this, 'remove_wallpaper_upload' ) );
		add_action( 'wp_ajax_admin_os_mode_reset', array( $this, 'reset_preferences' ) );
	}

	/**
	 * Save the current user's Desktop & Dock settings.
	 */
	public function save_desktop_dock() {
		if ( ! is_user_logged_in() || ! current_user_can( 'read' ) ) {
			wp_send_json_error(
				array(
					'message' => __( 'You do not have permission to change Admin OS settings.', 'admin-os-mode' ),
				),
				403
			);
		}

		check_ajax_referer( self::NONCE_ACTION, 'nonce' );

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
				'message'     => __( 'Desktop & Dock saved.', 'admin-os-mode' ),
			)
		);
	}

	/**
	 * Save the current user's appearance settings.
	 */
	public function save_appearance() {
		if ( ! is_user_logged_in() || ! current_user_can( 'read' ) ) {
			wp_send_json_error(
				array(
					'message' => __( 'You do not have permission to change Admin OS settings.', 'admin-os-mode' ),
				),
				403
			);
		}

		check_ajax_referer( self::NONCE_ACTION, 'nonce' );

		$appearance = $this->preferences->set_appearance(
			array(
				'mode'              => $this->read_post_value( 'mode' ),
				'window_material'   => $this->read_post_value( 'window_material' ),
				'accent_color'      => $this->read_post_value( 'accent_color' ),
				'icon_widget_style' => $this->read_post_value( 'icon_widget_style' ),
				'tint_windows'      => $this->read_post_value( 'tint_windows' ),
			)
		);

		wp_send_json_success(
			array(
				'appearance' => $appearance,
				'message'    => __( 'Appearance saved.', 'admin-os-mode' ),
			)
		);
	}

	/**
	 * Save the current user's selected theme.
	 */
	public function save_theme() {
		if ( ! is_user_logged_in() || ! current_user_can( 'read' ) ) {
			wp_send_json_error(
				array(
					'message' => __( 'You do not have permission to change Admin OS settings.', 'admin-os-mode' ),
				),
				403
			);
		}

		check_ajax_referer( self::NONCE_ACTION, 'nonce' );

		$theme_id = isset( $_POST['theme_id'] )
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
				'message' => __( 'Theme saved.', 'admin-os-mode' ),
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
		if ( ! is_user_logged_in() || ! current_user_can( 'read' ) ) {
			wp_send_json_error(
				array(
					'message' => __( 'You do not have permission to change Admin OS settings.', 'admin-os-mode' ),
				),
				403
			);
		}

		check_ajax_referer( self::NONCE_ACTION, 'nonce' );

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
				'message'   => __( 'Wallpaper saved.', 'admin-os-mode' ),
				'wallpaper' => $this->wallpaper_registry->get_client_config( $theme, $this->preferences ),
			)
		);
	}

	/**
	 * Remove a saved uploaded wallpaper from the current user's photo list.
	 */
	public function remove_wallpaper_upload() {
		if ( ! is_user_logged_in() || ! current_user_can( 'read' ) ) {
			wp_send_json_error(
				array(
					'message' => __( 'You do not have permission to change Admin OS settings.', 'admin-os-mode' ),
				),
				403
			);
		}

		check_ajax_referer( self::NONCE_ACTION, 'nonce' );

		$attachment_id = absint( $this->read_post_value( 'attachment_id' ) );
		if ( ! $attachment_id ) {
			wp_send_json_error(
				array(
					'message' => __( 'Choose a valid photo to remove.', 'admin-os-mode' ),
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
				'message'   => __( 'Photo removed.', 'admin-os-mode' ),
				'wallpaper' => $this->wallpaper_registry->get_client_config( $theme, $this->preferences ),
			)
		);
	}

	/**
	 * Reset current-user Admin OS preference domains.
	 */
	public function reset_preferences() {
		if ( ! is_user_logged_in() || ! current_user_can( 'read' ) ) {
			wp_send_json_error(
				array(
					'message' => __( 'You do not have permission to reset Admin OS settings.', 'admin-os-mode' ),
				),
				403
			);
		}

		check_ajax_referer( self::NONCE_ACTION, 'nonce' );

		$profile = sanitize_key( $this->read_post_value( 'profile' ) );
		$domains = $this->preferences->get_reset_domains_for_profile( $profile );

		if ( empty( $domains ) ) {
			wp_send_json_error(
				array(
					'message' => __( 'Choose a valid Admin OS reset option.', 'admin-os-mode' ),
				),
				400
			);
		}

		$reset_domains = $this->preferences->reset_domains( $domains );

		wp_send_json_success(
			array(
				'client'       => array(
					'clearAllUserSessions' => true,
					'reload'               => true,
				),
				'message'      => __( 'Admin OS settings were reset.', 'admin-os-mode' ),
				'profile'      => $profile,
				'resetDomains' => $reset_domains,
			)
		);
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
