<?php
/**
 * Main plugin orchestrator.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Wires the plugin services into WordPress hooks.
 */
final class PufferDesk_Plugin {
	/**
	 * Singleton instance.
	 *
	 * @var PufferDesk_Plugin|null
	 */
	private static $instance = null;

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
	 * Asset loader.
	 *
	 * @var PufferDesk_Assets
	 */
	private $assets;

	/**
	 * Settings controller.
	 *
	 * @var PufferDesk_Settings_Controller
	 */
	private $settings_controller;

	/**
	 * Workspace controller.
	 *
	 * @var PufferDesk_Workspace_Controller
	 */
	private $workspace_controller;

	/**
	 * Boot and return the singleton.
	 *
	 * @return PufferDesk_Plugin
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
		$preferences        = new PufferDesk_User_Preferences();
		$app_registry       = new PufferDesk_App_Registry();
		$widget_registry    = new PufferDesk_Widget_Registry();
		$theme_registry     = new PufferDesk_Theme_Registry();
		$wallpaper_registry = new PufferDesk_Wallpaper_Registry();
		$workspace_state    = new PufferDesk_Workspace_State();

		$this->router   = new PufferDesk_Router( $preferences );
		$this->renderer = new PufferDesk_Shell_Renderer(
			$this->router,
			$preferences,
			$app_registry,
			$widget_registry,
			$theme_registry,
			$wallpaper_registry,
			$workspace_state
		);
		$this->assets   = new PufferDesk_Assets(
			$this->router,
			$preferences,
			$app_registry,
			$widget_registry,
			$theme_registry,
			$wallpaper_registry,
			$workspace_state
		);
		$this->settings_controller = new PufferDesk_Settings_Controller(
			$preferences,
			$app_registry,
			$theme_registry,
			$wallpaper_registry,
			$workspace_state
		);
		$this->workspace_controller = new PufferDesk_Workspace_Controller(
			$preferences,
			$app_registry,
			$widget_registry,
			$theme_registry,
			$workspace_state
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
		$this->workspace_controller->hooks();
	}

	/**
	 * Register the OS shell page.
	 */
	public function register_admin_page() {
		add_menu_page(
			__( 'PufferDesk', 'pufferdesk-admin-desktop' ),
			__( 'PufferDesk', 'pufferdesk-admin-desktop' ),
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
		$label    = $is_shell ? __( 'Classic Admin', 'pufferdesk-admin-desktop' ) : __( 'PufferDesk', 'pufferdesk-admin-desktop' );
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
