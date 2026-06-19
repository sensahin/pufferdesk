<?php
/**
 * Request routing and mode switching.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Owns URLs, request detection, redirects, and mode toggle handling.
 */
final class PufferDesk_Router {
	const PAGE_SLUG    = 'pufferdesk';
	const NONCE_TOGGLE = 'pufferdesk_toggle';
	const QUERY_CLASSIC     = 'pufferdesk_classic';
	const QUERY_IFRAME      = 'pufferdesk_iframe';
	const QUERY_MODE        = 'pufferdesk';
	const QUERY_PAGE        = 'page';
	const QUERY_REDIRECT_TO = 'redirect_to';
	const QUERY_TRUE_VALUE  = '1';

	/**
	 * User preferences service.
	 *
	 * @var PufferDesk_User_Preferences
	 */
	private $preferences;

	/**
	 * Constructor.
	 *
	 * @param PufferDesk_User_Preferences $preferences User preferences service.
	 */
	public function __construct( PufferDesk_User_Preferences $preferences ) {
		$this->preferences = $preferences;
	}

	/**
	 * Persist the user's chosen mode.
	 */
	public function handle_mode_toggle() {
		if ( ! isset( $_GET[ self::QUERY_MODE ] ) ) {
			return;
		}

		if ( ! is_user_logged_in() || ! current_user_can( 'read' ) ) {
			wp_die( esc_html__( 'You do not have permission to change PufferDesk.', 'pufferdesk' ) );
		}

		check_admin_referer( self::NONCE_TOGGLE );

		$enabled = self::QUERY_TRUE_VALUE === sanitize_text_field( wp_unslash( $_GET[ self::QUERY_MODE ] ) );
		$this->preferences->set_enabled( $enabled );

		$redirect = $enabled ? $this->get_shell_url() : admin_url( 'index.php' );
		if ( isset( $_GET[ self::QUERY_REDIRECT_TO ] ) ) {
			$redirect = wp_validate_redirect(
				esc_url_raw( wp_unslash( $_GET[ self::QUERY_REDIRECT_TO ] ) ),
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
	 * Prevent the desktop shell from rendering inside an embedded admin frame.
	 */
	public function prevent_iframe_shell_nesting() {
		if ( ! $this->is_iframe_request() || ! $this->is_shell_request() ) {
			return;
		}

		wp_safe_redirect( $this->get_classic_iframe_dashboard_url() );
		exit;
	}

	/**
	 * Preserve iframe mode when same-admin requests redirect.
	 *
	 * @param string $location Redirect location.
	 * @return string
	 */
	public function preserve_iframe_redirect( $location ) {
		if ( ! $this->is_iframe_request() || '' === (string) $location ) {
			return $location;
		}

		if ( $this->is_shell_url( $location ) ) {
			return $this->get_classic_iframe_dashboard_url();
		}

		if ( ! $this->is_admin_area_url( $location ) ) {
			return $location;
		}

		$args = array(
			self::QUERY_IFRAME => self::QUERY_TRUE_VALUE,
		);

		if ( $this->is_dashboard_url( $location ) || $this->is_classic_override_request() ) {
			$args[ self::QUERY_CLASSIC ] = self::QUERY_TRUE_VALUE;
		}

		return add_query_arg( $args, $location );
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
	 * Build a classic dashboard URL safe for iframe windows.
	 *
	 * @return string
	 */
	public function get_classic_iframe_dashboard_url() {
		return add_query_arg(
			array(
				self::QUERY_CLASSIC => self::QUERY_TRUE_VALUE,
				self::QUERY_IFRAME  => self::QUERY_TRUE_VALUE,
			),
			admin_url( 'index.php' )
		);
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
				self::QUERY_MODE        => $enabled ? self::QUERY_TRUE_VALUE : '0',
				self::QUERY_REDIRECT_TO => $redirect,
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
			&& isset( $_GET[ self::QUERY_PAGE ] )
			// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only routing query var.
			&& self::PAGE_SLUG === sanitize_key( wp_unslash( $_GET[ self::QUERY_PAGE ] ) );
	}

	/**
	 * Current request is an embedded admin app.
	 *
	 * @return bool
	 */
	public function is_iframe_request() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only iframe display flag.
		return is_admin() && isset( $_GET[ self::QUERY_IFRAME ] );
	}

	/**
	 * Current request bypasses automatic OS redirect once.
	 *
	 * @return bool
	 */
	public function is_classic_override_request() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only one-request redirect bypass.
		return isset( $_GET[ self::QUERY_CLASSIC ] );
	}

	/**
	 * Whether a URL belongs to any WordPress admin area.
	 *
	 * @param string $url URL to test.
	 * @return bool
	 */
	private function is_admin_area_url( $url ) {
		$resolved = $this->resolve_admin_url( $url );

		if ( '' === $resolved ) {
			return false;
		}

		foreach ( array( admin_url(), network_admin_url(), user_admin_url() ) as $admin_base ) {
			if ( 0 === strpos( $resolved, $admin_base ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Whether a URL points to the PufferDesk shell page.
	 *
	 * @param string $url URL to test.
	 * @return bool
	 */
	private function is_shell_url( $url ) {
		$resolved = $this->resolve_admin_url( $url );

		if ( '' === $resolved ) {
			return false;
		}

		$parts = wp_parse_url( $resolved );
		if ( empty( $parts['query'] ) ) {
			return false;
		}

		parse_str( $parts['query'], $query );

		return isset( $query[ self::QUERY_PAGE ] ) && self::PAGE_SLUG === sanitize_key( (string) $query[ self::QUERY_PAGE ] );
	}

	/**
	 * Whether a URL points to the WordPress dashboard entry.
	 *
	 * @param string $url URL to test.
	 * @return bool
	 */
	private function is_dashboard_url( $url ) {
		$resolved = $this->resolve_admin_url( $url );

		if ( '' === $resolved ) {
			return false;
		}

		$admin = wp_parse_url( admin_url( 'index.php' ) );
		$parts = wp_parse_url( $resolved );

		return ! empty( $parts['host'] )
			&& ! empty( $admin['host'] )
			&& $parts['host'] === $admin['host']
			&& ( isset( $parts['path'] ) ? untrailingslashit( $parts['path'] ) : '' ) === ( isset( $admin['path'] ) ? untrailingslashit( $admin['path'] ) : '' );
	}

	/**
	 * Resolve relative admin redirects against admin_url().
	 *
	 * @param string $url URL to resolve.
	 * @return string
	 */
	private function resolve_admin_url( $url ) {
		$url = trim( (string) $url );

		if ( '' === $url || 0 === strpos( $url, '#' ) ) {
			return '';
		}

		if ( preg_match( '#^https?://#i', $url ) ) {
			return $url;
		}

		if ( 0 === strpos( $url, '/' ) ) {
			$admin = wp_parse_url( admin_url() );
			if ( empty( $admin['scheme'] ) || empty( $admin['host'] ) ) {
				return '';
			}

			return $admin['scheme'] . '://' . $admin['host'] . $url;
		}

		return admin_url( ltrim( $url, '/' ) );
	}

	/**
	 * Client-safe route query key contract.
	 *
	 * @return array<string,mixed>
	 */
	public static function client_contract() {
		return array(
			'pageSlug' => self::PAGE_SLUG,
			'query'    => array(
				'classic'    => self::QUERY_CLASSIC,
				'iframe'     => self::QUERY_IFRAME,
				'mode'       => self::QUERY_MODE,
				'page'       => self::QUERY_PAGE,
				'redirectTo' => self::QUERY_REDIRECT_TO,
			),
			'values'   => array(
				'true' => self::QUERY_TRUE_VALUE,
			),
		);
	}
}
