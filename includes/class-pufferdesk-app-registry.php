<?php
/**
 * Admin app registry.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Builds the app and folder data consumed by the shell.
 */
final class PufferDesk_App_Registry {
	const DEFAULT_CAPABILITY = 'read';

	/**
	 * WordPress admin menu app provider.
	 *
	 * @var PufferDesk_Admin_Menu_App_Provider
	 */
	private $admin_menu_provider;

	/**
	 * App normalizer.
	 *
	 * @var PufferDesk_App_Normalizer
	 */
	private $app_normalizer;

	/**
	 * App menu normalizer.
	 *
	 * @var PufferDesk_App_Menu_Normalizer
	 */
	private $menu_normalizer;

	/**
	 * Constructor.
	 *
	 * @param PufferDesk_Admin_Menu_App_Provider|null $admin_menu_provider Optional admin menu provider.
	 * @param PufferDesk_App_Normalizer|null         $app_normalizer Optional app normalizer.
	 * @param PufferDesk_App_Menu_Normalizer|null    $menu_normalizer Optional menu normalizer.
	 */
	public function __construct( $admin_menu_provider = null, $app_normalizer = null, $menu_normalizer = null ) {
		$badge_normalizer          = new PufferDesk_App_Badge_Normalizer();
		$this->menu_normalizer     = $menu_normalizer instanceof PufferDesk_App_Menu_Normalizer ? $menu_normalizer : new PufferDesk_App_Menu_Normalizer();
		$this->app_normalizer      = $app_normalizer instanceof PufferDesk_App_Normalizer ? $app_normalizer : new PufferDesk_App_Normalizer( $badge_normalizer, $this->menu_normalizer );
		$this->admin_menu_provider = $admin_menu_provider instanceof PufferDesk_Admin_Menu_App_Provider ? $admin_menu_provider : new PufferDesk_Admin_Menu_App_Provider( $badge_normalizer );
	}

	/**
	 * App registry for the first shell.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	public function get_apps() {
		$apps = array(
			array(
				'id'    => 'dashboard',
				'label' => __( 'Dashboard', 'pufferdesk-admin-desktop' ),
				'url'   => admin_url( 'index.php?pufferdesk_classic=1' ),
				'icon'  => $this->theme_icon( 'dashboard.svg', 'dashicons-dashboard' ),
				'group' => 'content',
				'cap'   => self::DEFAULT_CAPABILITY,
			),
			array(
				'id'    => 'posts',
				'label' => __( 'Posts', 'pufferdesk-admin-desktop' ),
				'url'   => admin_url( 'edit.php' ),
				'icon'  => $this->theme_icon( 'posts.svg', 'dashicons-admin-post' ),
				'group' => 'content',
				'cap'   => 'edit_posts',
			),
			array(
				'id'                 => 'sticky-notes',
				'label'              => __( 'Sticky Notes', 'pufferdesk-admin-desktop' ),
				'icon'               => $this->theme_icon( 'sticky-notes.svg', 'dashicons-sticky' ),
				'group'              => 'content',
				'cap'                => PufferDesk_Document_Service::CAPABILITY,
				'kind'               => 'native',
				'native'             => 'sticky-notes',
				'window_persistence' => 'none',
			),
			array(
				'id'     => 'text-editor',
				'label'  => __( 'Text Editor', 'pufferdesk-admin-desktop' ),
				'icon'   => $this->theme_icon( 'text-editor.svg', 'dashicons-edit-page' ),
				'group'  => 'content',
				'cap'    => PufferDesk_Document_Service::CAPABILITY,
				'kind'   => 'native',
				'native' => 'text-editor',
			),
			array(
				'id'    => 'pages',
				'label' => __( 'Pages', 'pufferdesk-admin-desktop' ),
				'url'   => admin_url( 'edit.php?post_type=page' ),
				'icon'  => $this->theme_icon( 'pages.svg', 'dashicons-admin-page' ),
				'group' => 'content',
				'cap'   => 'edit_pages',
			),
			array(
				'id'    => 'media',
				'label' => __( 'Media', 'pufferdesk-admin-desktop' ),
				'url'   => admin_url( 'upload.php' ),
				'icon'  => $this->theme_icon( 'media.svg', 'dashicons-admin-media' ),
				'group' => 'content',
				'cap'   => 'upload_files',
			),
			array(
				'id'    => 'comments',
				'label' => __( 'Comments', 'pufferdesk-admin-desktop' ),
				'url'   => admin_url( 'edit-comments.php' ),
				'icon'  => $this->theme_icon( 'comments.svg', 'dashicons-admin-comments' ),
				'group' => 'content',
				'cap'   => 'edit_posts',
			),
			array(
				'id'    => 'appearance',
				'label' => __( 'Appearance', 'pufferdesk-admin-desktop' ),
				'url'   => admin_url( 'themes.php' ),
				'icon'  => $this->theme_icon( 'appearance.svg', 'dashicons-admin-appearance' ),
				'group' => 'site',
				'cap'   => 'switch_themes',
			),
			array(
				'id'    => 'plugins',
				'label' => __( 'Plugins', 'pufferdesk-admin-desktop' ),
				'url'   => admin_url( 'plugins.php' ),
				'icon'  => $this->theme_icon( 'plugins.svg', 'dashicons-admin-plugins' ),
				'group' => 'system',
				'cap'   => 'activate_plugins',
			),
			array(
				'id'    => 'users',
				'label' => __( 'Users', 'pufferdesk-admin-desktop' ),
				'url'   => admin_url( 'users.php' ),
				'icon'  => $this->theme_icon( 'users.svg', 'dashicons-admin-users' ),
				'group' => 'system',
				'cap'   => 'list_users',
			),
			array(
				'id'     => 'os-settings',
				'label'  => __( 'System Settings', 'pufferdesk-admin-desktop' ),
				'icon'   => $this->theme_icon( 'os-settings.svg', 'dashicons-admin-customizer' ),
				'group'  => 'system',
				'cap'    => self::DEFAULT_CAPABILITY,
				'kind'   => 'native',
				'native' => 'settings',
				'menu'   => $this->menu_normalizer->get_os_settings_menu(),
			),
			array(
				'id'    => 'settings',
				'label' => __( 'Settings', 'pufferdesk-admin-desktop' ),
				'url'   => admin_url( 'options-general.php' ),
				'icon'  => $this->theme_icon( 'settings.svg', 'dashicons-admin-settings' ),
				'group' => 'system',
				'cap'   => 'manage_options',
			),
			array(
				'id'    => 'tools',
				'label' => __( 'Tools', 'pufferdesk-admin-desktop' ),
				'url'   => admin_url( 'tools.php' ),
				'icon'  => $this->theme_icon( 'tools.svg', 'dashicons-admin-tools' ),
				'group' => 'system',
				'cap'   => 'manage_options',
			),
			array(
				'id'     => 'trash',
				'label'  => __( 'Trash', 'pufferdesk-admin-desktop' ),
				'icon'   => $this->theme_icon( 'trash-empty.svg', 'dashicons-trash' ),
				'group'  => 'system',
				'cap'    => self::DEFAULT_CAPABILITY,
				'dock'   => array(
					'fixed'     => true,
					'placement' => 'end',
				),
				'kind'   => 'native',
				'native' => 'trash',
			),
			array(
				'id'    => 'site-health',
				'label' => __( 'Site Health', 'pufferdesk-admin-desktop' ),
				'url'   => admin_url( 'site-health.php' ),
				'icon'  => $this->theme_icon( 'site-health.svg', 'dashicons-heart' ),
				'group' => 'system',
				'cap'   => 'view_site_health_checks',
			),
		);

		if ( class_exists( 'WooCommerce' ) || current_user_can( 'manage_woocommerce' ) ) {
			$apps[] = array(
				'id'    => 'woocommerce',
				'label' => __( 'WooCommerce', 'pufferdesk-admin-desktop' ),
				'url'   => admin_url( 'admin.php?page=wc-admin' ),
				'icon'  => $this->theme_icon( 'woocommerce.svg', 'dashicons-cart' ),
				'group' => 'site',
				'cap'   => 'manage_woocommerce',
			);
		}

		$apps = $this->admin_menu_provider->merge( $apps );
		$apps = array_values( array_filter( $apps, array( $this->app_normalizer, 'current_user_can_access_app' ) ) );

		/**
		 * Filter the shell app registry.
		 *
		 * Each app accepts id, label, url, icon, group, cap, kind, native,
		 * dock, window_persistence, and menu.
		 * Missing, empty, or non-scalar cap values default to read during normalization.
		 * Icons may be a Dashicon string or a descriptor:
		 * array( 'type' => 'dashicon', 'value' => 'dashicons-admin-post' )
		 * array( 'type' => 'image', 'src' => 'themes/pufferdesk/default/icons/posts.svg' )
		 * array( 'type' => 'theme', 'name' => 'posts.svg', 'fallback' => 'dashicons-admin-post' )
		 * About windows may define about name, version, copyright, rights, and icon.
		 * Menus use array( 'groups' => array( ... ) ) with command-backed items.
		 *
		 * @param array<int,array<string,mixed>> $apps Registered apps.
		 */
		$apps = apply_filters( 'pufferdesk_apps', $apps );

		return $this->app_normalizer->normalize_apps( $apps );
	}

	/**
	 * Built-in folder registry.
	 *
	 * User-created desktop folders are stored separately in user preferences.
	 *
	 * @param array<int,array<string,mixed>> $apps Visible apps.
	 * @return array<int,array<string,mixed>>
	 */
	public function get_folders( $apps ) {
		return array();
	}

	/**
	 * Build a theme-aware icon descriptor with a Dashicon fallback.
	 *
	 * @param string $name Theme icon file name.
	 * @param string $fallback Dashicon fallback class.
	 * @return array<string,string>
	 */
	private function theme_icon( $name, $fallback ) {
		return array(
			'type'     => 'theme',
			'name'     => $name,
			'fallback' => $fallback,
		);
	}
}
