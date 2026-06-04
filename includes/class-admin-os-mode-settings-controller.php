<?php
/**
 * Native OS Settings actions.
 *
 * @package AdminOSMode
 */

defined( 'ABSPATH' ) || exit;

/**
 * Handles AJAX actions from the internal OS Settings app.
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
	 * Constructor.
	 *
	 * @param Admin_OS_Mode_User_Preferences $preferences User preferences.
	 * @param Admin_OS_Mode_Theme_Registry   $theme_registry Theme registry.
	 */
	public function __construct(
		Admin_OS_Mode_User_Preferences $preferences,
		Admin_OS_Mode_Theme_Registry $theme_registry
	) {
		$this->preferences    = $preferences;
		$this->theme_registry = $theme_registry;
	}

	/**
	 * Register AJAX hooks.
	 */
	public function hooks() {
		add_action( 'wp_ajax_admin_os_mode_save_appearance', array( $this, 'save_appearance' ) );
		add_action( 'wp_ajax_admin_os_mode_save_theme', array( $this, 'save_theme' ) );
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
				'highlight_color'   => $this->read_post_value( 'highlight_color' ),
				'icon_widget_style' => $this->read_post_value( 'icon_widget_style' ),
				'folder_color'      => $this->read_post_value( 'folder_color' ),
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
