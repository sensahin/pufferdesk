<?php
/**
 * Main plugin orchestrator.
 *
 * @package WPAdminOS
 */

defined( 'ABSPATH' ) || exit;

/**
 * Wires the plugin services into WordPress hooks.
 */
final class WP_AdminOS_Plugin {
	/**
	 * Singleton instance.
	 *
	 * @var WP_AdminOS_Plugin|null
	 */
	private static $instance = null;

	/**
	 * Request router.
	 *
	 * @var WP_AdminOS_Router
	 */
	private $router;

	/**
	 * Shell renderer.
	 *
	 * @var WP_AdminOS_Shell_Renderer
	 */
	private $renderer;

	/**
	 * Asset loader.
	 *
	 * @var WP_AdminOS_Assets
	 */
	private $assets;

	/**
	 * Settings controller.
	 *
	 * @var WP_AdminOS_Settings_Controller
	 */
	private $settings_controller;

	/**
	 * Boot and return the singleton.
	 *
	 * @return WP_AdminOS_Plugin
	 */
	public static function init() {
		if ( null === self::$instance ) {
			self::$instance = new self();
			self::$instance->hooks();
		}

		return self::$instance;
	}

	/**
	 * Build services.
	 */
	private function __construct() {
		$preferences        = new WP_AdminOS_User_Preferences();
		$app_registry       = new WP_AdminOS_App_Registry();
		$widget_registry    = new WP_AdminOS_Widget_Registry();
		$theme_registry     = new WP_AdminOS_Theme_Registry();
		$wallpaper_registry = new WP_AdminOS_Wallpaper_Registry();

		$this->router   = new WP_AdminOS_Router( $preferences );
		$this->renderer = new WP_AdminOS_Shell_Renderer(
			$this->router,
			$preferences,
			$app_registry,
			$widget_registry,
			$theme_registry,
			$wallpaper_registry
		);
		$this->assets   = new WP_AdminOS_Assets(
			$this->router,
			$preferences,
			$app_registry,
			$widget_registry,
			$theme_registry,
			$wallpaper_registry
		);
		$this->settings_controller = new WP_AdminOS_Settings_Controller(
			$preferences,
			$app_registry,
			$theme_registry,
			$wallpaper_registry
		);
	}

	/**
	 * Register WordPress hooks.
	 */
	private function hooks() {
		add_action( 'admin_init', array( $this->router, 'handle_mode_toggle' ) );
		add_action( 'admin_init', array( $this->router, 'redirect_dashboard_to_shell' ) );
		add_action( 'admin_menu', array( $this, 'register_admin_page' ) );
		add_action( 'admin_bar_menu', array( $this, 'register_admin_bar_toggle' ), 90 );
		add_action( 'admin_enqueue_scripts', array( $this->assets, 'enqueue' ) );
		add_filter( 'admin_body_class', array( $this->assets, 'add_admin_body_classes' ) );
		add_action( 'admin_head', array( $this->assets, 'print_iframe_head_style' ) );
		$this->settings_controller->hooks();
	}

	/**
	 * Register the OS shell page.
	 */
	public function register_admin_page() {
		add_menu_page(
			__( 'WP adminOS', 'wp-adminos' ),
			__( 'WP adminOS', 'wp-adminos' ),
			'read',
			WP_AdminOS_Router::PAGE_SLUG,
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
		$label    = $is_shell ? __( 'Classic Admin', 'wp-adminos' ) : __( 'WP adminOS', 'wp-adminos' );
		$url      = $is_shell ? $this->router->get_toggle_url( false ) : $this->router->get_toggle_url( true );
		$class    = $is_shell ? 'wp-adminos-active' : '';

		$admin_bar->add_node(
			array(
				'parent' => 'top-secondary',
				'id'     => 'wp-adminos-toggle',
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
