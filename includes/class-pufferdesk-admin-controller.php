<?php
/**
 * WordPress admin surface hooks.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Owns PufferDesk admin page and admin bar registration.
 */
final class PufferDesk_Admin_Controller {
	/**
	 * Request router.
	 *
	 * @var PufferDesk_Router
	 */
	private $router;

	/**
	 * Shell renderer.
	 *
	 * @var PufferDesk_Shell_Renderer
	 */
	private $renderer;

	/**
	 * Constructor.
	 *
	 * @param PufferDesk_Router         $router Request router.
	 * @param PufferDesk_Shell_Renderer $renderer Shell renderer.
	 */
	public function __construct( PufferDesk_Router $router, PufferDesk_Shell_Renderer $renderer ) {
		$this->router   = $router;
		$this->renderer = $renderer;
	}

	/**
	 * Register WordPress hooks.
	 */
	public function hooks() {
		add_action( 'admin_menu', array( $this, 'register_admin_page' ) );
		add_action( 'admin_bar_menu', array( $this, 'register_admin_bar_toggle' ), 90 );
	}

	/**
	 * Register the OS shell page.
	 */
	public function register_admin_page() {
		$product_label = PufferDesk_Product_Labels::name();

		add_menu_page(
			$product_label,
			$product_label,
			'read',
			PufferDesk_Router::PAGE_SLUG,
			array( $this->renderer, 'render' ),
			'dashicons-desktop',
			2
		);
	}

	/**
	 * Add the top-bar mode switch.
	 *
	 * @param WP_Admin_Bar $admin_bar Admin bar instance.
	 */
	public function register_admin_bar_toggle( $admin_bar ) {
		if ( ! is_admin() || ! is_user_logged_in() || ! current_user_can( 'read' ) ) {
			return;
		}

		$is_shell = $this->router->is_shell_request();
		$label    = $is_shell ? PufferDesk_Product_Labels::classic_admin() : PufferDesk_Product_Labels::name();
		$url      = $is_shell ? $this->router->get_toggle_url( false ) : $this->router->get_toggle_url( true );
		$class    = $is_shell ? 'pufferdesk-active' : '';

		$admin_bar->add_node(
			array(
				'parent' => 'top-secondary',
				'id'     => 'pufferdesk-toggle',
				'title'  => '<span class="ab-icon dashicons dashicons-desktop" aria-hidden="true"></span>'
					. '<span class="ab-label">' . esc_html( $label ) . '</span>',
				'href'   => $url,
				'meta'   => array(
					'class' => $class,
					'title' => $label,
				),
			)
		);
	}
}
