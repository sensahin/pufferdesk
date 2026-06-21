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
	 * Admin controller.
	 *
	 * @var PufferDesk_Admin_Controller
	 */
	private $admin_controller;

	/**
	 * Asset loader.
	 *
	 * @var PufferDesk_Assets
	 */
	private $assets;

	/**
	 * Embedded WordPress admin page context resolver.
	 *
	 * @var PufferDesk_Admin_Context_Resolver
	 */
	private $admin_context_resolver;

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
	 * Document post type registration.
	 *
	 * @var PufferDesk_Document_Post_Type
	 */
	private $document_post_type;

	/**
	 * Document controller.
	 *
	 * @var PufferDesk_Document_Controller
	 */
	private $document_controller;

	/**
	 * WordPress content search controller.
	 *
	 * @var PufferDesk_Content_Search_Controller
	 */
	private $content_search_controller;

	/**
	 * Notification controller.
	 *
	 * @var PufferDesk_Notification_Controller
	 */
	private $notification_controller;

	/**
	 * Native Users app data controller.
	 *
	 * @var PufferDesk_Users_Controller
	 */
	private $users_controller;

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
		$admin_menu_provider = new PufferDesk_Admin_Menu_App_Provider( new PufferDesk_App_Badge_Normalizer() );
		$app_registry       = new PufferDesk_App_Registry( $admin_menu_provider );
		$widget_registry    = new PufferDesk_Widget_Registry();
		$theme_registry     = new PufferDesk_Theme_Registry();
		$wallpaper_registry = new PufferDesk_Wallpaper_Registry();
		$workspace_state    = new PufferDesk_Workspace_State();
		$virtual_filesystem = new PufferDesk_Virtual_Filesystem();
		$content_search_service = new PufferDesk_Content_Search_Service();
		$document_service   = new PufferDesk_Document_Service( $virtual_filesystem );
		$onboarding_note    = new PufferDesk_Onboarding_Note(
			$workspace_state,
			$document_service,
			$virtual_filesystem
		);
		$notification_registry = new PufferDesk_Notification_Registry(
			$preferences,
			new PufferDesk_Notification_Normalizer()
		);
		$asset_manifest     = new PufferDesk_Asset_Manifest();
		$settings_registry  = new PufferDesk_Settings_Registry( $preferences );
		$this->admin_context_resolver = new PufferDesk_Admin_Context_Resolver( $admin_menu_provider );
		$this->router       = new PufferDesk_Router( $preferences );
		$shell_context      = new PufferDesk_Shell_Context(
			$preferences,
			$app_registry,
			$widget_registry,
			$theme_registry,
			$wallpaper_registry,
			$workspace_state,
			$virtual_filesystem,
			$onboarding_note
		);
		$runtime_config     = new PufferDesk_Runtime_Config(
			$this->router,
			$theme_registry,
			$settings_registry,
			$virtual_filesystem,
			$notification_registry,
			$preferences
		);
		$renderer       = new PufferDesk_Shell_Renderer(
			$shell_context
		);
		$this->admin_controller = new PufferDesk_Admin_Controller(
			$this->router,
			$renderer
		);
		$this->assets   = new PufferDesk_Assets(
			$this->router,
			$shell_context,
			$runtime_config,
			$asset_manifest,
			$this->admin_context_resolver
		);
		$this->settings_controller = new PufferDesk_Settings_Controller(
			$preferences,
			$app_registry,
			$theme_registry,
			$wallpaper_registry,
			$workspace_state,
			$settings_registry
		);
		$this->workspace_controller = new PufferDesk_Workspace_Controller(
			$preferences,
			$app_registry,
			$widget_registry,
			$theme_registry,
			$workspace_state
		);
		$this->document_post_type = new PufferDesk_Document_Post_Type();
		$this->content_search_controller = new PufferDesk_Content_Search_Controller( $content_search_service );
		$this->document_controller = new PufferDesk_Document_Controller( $document_service );
		$this->notification_controller = new PufferDesk_Notification_Controller( $notification_registry );
		$this->users_controller = new PufferDesk_Users_Controller();
	}

	/**
	 * Register WordPress hooks.
	 */
	private function hooks() {
		add_action( 'admin_init', array( $this->router, 'handle_mode_toggle' ) );
		add_action( 'admin_init', array( $this->router, 'prevent_iframe_shell_nesting' ), 0 );
		add_action( 'admin_init', array( $this->router, 'redirect_dashboard_to_shell' ) );
		add_filter( 'wp_redirect', array( $this->router, 'preserve_iframe_redirect' ), 10, 1 );
		add_action( 'admin_enqueue_scripts', array( $this->assets, 'enqueue' ) );
		add_action( 'admin_head', array( $this->assets, 'print_early_admin_chrome' ), 0 );
		add_action( 'in_admin_header', array( $this->assets, 'print_iframe_admin_context' ), 20 );
		add_filter( 'admin_body_class', array( $this->assets, 'add_admin_body_classes' ) );
		$this->document_post_type->hooks();
		$this->admin_controller->hooks();
		$this->settings_controller->hooks();
		$this->workspace_controller->hooks();
		$this->content_search_controller->hooks();
		$this->document_controller->hooks();
		$this->notification_controller->hooks();
		$this->users_controller->hooks();
	}
}
