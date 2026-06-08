<?php
/**
 * Request routing and mode switching.
 *
 * @package WPAdminOS
 */

defined( 'ABSPATH' ) || exit;

/**
 * Owns URLs, request detection, redirects, and mode toggle handling.
 */
final class WP_AdminOS_Router {
	const PAGE_SLUG    = 'wp-adminos';
	const NONCE_TOGGLE = 'wp_adminos_toggle';

	/**
	 * User preferences service.
	 *
	 * @var WP_AdminOS_User_Preferences
	 */
	private $preferences;

	/**
	 * Constructor.
	 *
	 * @param WP_AdminOS_User_Preferences $preferences User preferences service.
	 */
	public function __construct( WP_AdminOS_User_Preferences $preferences ) {
		$this->preferences = $preferences;
	}

	/**
	 * Persist the user's chosen mode.
	 */
	public function handle_mode_toggle() {
		if ( ! isset( $_GET['wp_adminos'] ) ) {
			return;
		}

		if ( ! is_user_logged_in() || ! current_user_can( 'read' ) ) {
			wp_die( esc_html__( 'You do not have permission to change WP adminOS.', 'wp-adminos' ) );
		}

		check_admin_referer( self::NONCE_TOGGLE );

		$enabled = '1' === sanitize_text_field( wp_unslash( $_GET['wp_adminos'] ) );
		$this->preferences->set_enabled( $enabled );

		$redirect = $enabled ? $this->get_shell_url() : admin_url( 'index.php' );
		if ( isset( $_GET['redirect_to'] ) ) {
			$redirect = wp_validate_redirect(
				esc_url_raw( wp_unslash( $_GET['redirect_to'] ) ),
				$redirect
			);
		}

		wp_safe_redirect( $redirect );
		exit;
	}

	/**
	 * Send opted-in users to the shell from the dashboard entry point.
	 */
	public function redirect_dashboard_to_shell() {
		if ( wp_doing_ajax() || ! is_admin() || ! is_user_logged_in() || ! current_user_can( 'read' ) ) {
			return;
		}

		if ( $this->is_shell_request() || $this->is_iframe_request() || $this->is_classic_override_request() ) {
			return;
		}

		if ( ! $this->preferences->is_enabled() ) {
			return;
		}

		global $pagenow;
		if ( 'index.php' !== $pagenow ) {
			return;
		}

		wp_safe_redirect( $this->get_shell_url() );
		exit;
	}

	/**
	 * Build the shell URL.
	 *
	 * @return string
	 */
	public function get_shell_url() {
		return admin_url( 'admin.php?page=' . self::PAGE_SLUG );
	}

	/**
	 * Build a signed mode toggle URL.
	 *
	 * @param bool $enabled Target mode.
	 * @return string
	 */
	public function get_toggle_url( $enabled ) {
		$redirect = $enabled ? $this->get_shell_url() : admin_url( 'index.php' );

		return add_query_arg(
			array(
				'wp_adminos'   => $enabled ? '1' : '0',
				'redirect_to'   => $redirect,
				'_wpnonce'      => wp_create_nonce( self::NONCE_TOGGLE ),
			),
			admin_url( 'index.php' )
		);
	}

	/**
	 * Current request is the shell page.
	 *
	 * @return bool
	 */
	public function is_shell_request() {
		return is_admin()
			// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only routing query var.
			&& isset( $_GET['page'] )
			// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only routing query var.
			&& self::PAGE_SLUG === sanitize_key( wp_unslash( $_GET['page'] ) );
	}

	/**
	 * Current request is an embedded admin app.
	 *
	 * @return bool
	 */
	public function is_iframe_request() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only iframe display flag.
		return is_admin() && isset( $_GET['wp_adminos_iframe'] );
	}

	/**
	 * Current request bypasses automatic OS redirect once.
	 *
	 * @return bool
	 */
	public function is_classic_override_request() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only one-request redirect bypass.
		return isset( $_GET['wp_adminos_classic'] );
	}
}
