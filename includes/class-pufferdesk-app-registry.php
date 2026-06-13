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
				'id'    => PufferDesk_App_Ids::DASHBOARD,
				'label' => __( 'Dashboard', 'pufferdesk-admin-desktop' ),
				'url'   => add_query_arg( PufferDesk_Router::QUERY_CLASSIC, PufferDesk_Router::QUERY_TRUE_VALUE, admin_url( 'index.php' ) ),
				'icon'  => $this->theme_icon( 'dashboard.svg', 'dashicons-dashboard' ),
				'about' => $this->wordpress_core_about( __( 'Dashboard', 'pufferdesk-admin-desktop' ) ),
				'group' => PufferDesk_App_Normalizer::GROUP_CONTENT,
				'cap'   => self::DEFAULT_CAPABILITY,
			),
			array(
				'id'    => PufferDesk_App_Ids::POSTS,
				'label' => __( 'Posts', 'pufferdesk-admin-desktop' ),
				'url'   => admin_url( 'edit.php' ),
				'icon'  => $this->theme_icon( 'posts.svg', 'dashicons-admin-post' ),
				'about' => $this->wordpress_core_about( __( 'Posts', 'pufferdesk-admin-desktop' ) ),
				'group' => PufferDesk_App_Normalizer::GROUP_CONTENT,
				'cap'   => 'edit_posts',
			),
			array(
				'id'                 => PufferDesk_App_Ids::STICKY_NOTES,
				'label'              => __( 'Sticky Notes', 'pufferdesk-admin-desktop' ),
				'icon'               => $this->theme_icon( 'sticky-notes.svg', 'dashicons-sticky' ),
				'group'              => PufferDesk_App_Normalizer::GROUP_CONTENT,
				'cap'                => PufferDesk_Document_Service::CAPABILITY,
				'kind'               => PufferDesk_App_Normalizer::KIND_NATIVE,
				'native'             => PufferDesk_App_Ids::NATIVE_STICKY_NOTES,
				'window_persistence' => PufferDesk_App_Normalizer::WINDOW_PERSISTENCE_NONE,
			),
			array(
				'id'    => PufferDesk_App_Ids::PAGES,
				'label' => __( 'Pages', 'pufferdesk-admin-desktop' ),
				'url'   => admin_url( 'edit.php?post_type=page' ),
				'icon'  => $this->theme_icon( 'pages.svg', 'dashicons-admin-page' ),
				'about' => $this->wordpress_core_about( __( 'Pages', 'pufferdesk-admin-desktop' ) ),
				'group' => PufferDesk_App_Normalizer::GROUP_CONTENT,
				'cap'   => 'edit_pages',
			),
			array(
				'id'    => PufferDesk_App_Ids::MEDIA,
				'label' => __( 'Media', 'pufferdesk-admin-desktop' ),
				'url'   => admin_url( 'upload.php' ),
				'icon'  => $this->theme_icon( 'media.svg', 'dashicons-admin-media' ),
				'about' => $this->wordpress_core_about( __( 'Media', 'pufferdesk-admin-desktop' ) ),
				'group' => PufferDesk_App_Normalizer::GROUP_CONTENT,
				'cap'   => 'upload_files',
			),
			array(
				'id'    => PufferDesk_App_Ids::COMMENTS,
				'label' => __( 'Comments', 'pufferdesk-admin-desktop' ),
				'url'   => admin_url( 'edit-comments.php' ),
				'icon'  => $this->theme_icon( 'comments.svg', 'dashicons-admin-comments' ),
				'about' => $this->wordpress_core_about( __( 'Comments', 'pufferdesk-admin-desktop' ) ),
				'group' => PufferDesk_App_Normalizer::GROUP_CONTENT,
				'cap'   => 'edit_posts',
			),
			array(
				'id'    => PufferDesk_App_Ids::APPEARANCE,
				'label' => __( 'Appearance', 'pufferdesk-admin-desktop' ),
				'url'   => admin_url( 'themes.php' ),
				'icon'  => $this->theme_icon( 'appearance.svg', 'dashicons-admin-appearance' ),
				'about' => $this->wordpress_core_about( __( 'Appearance', 'pufferdesk-admin-desktop' ) ),
				'group' => PufferDesk_App_Normalizer::GROUP_SITE,
				'cap'   => 'switch_themes',
			),
			array(
				'id'    => PufferDesk_App_Ids::PLUGINS,
				'label' => __( 'Plugins', 'pufferdesk-admin-desktop' ),
				'url'   => admin_url( 'plugins.php' ),
				'icon'  => $this->theme_icon( 'plugins.svg', 'dashicons-admin-plugins' ),
				'about' => $this->wordpress_core_about( __( 'Plugins', 'pufferdesk-admin-desktop' ) ),
				'group' => PufferDesk_App_Normalizer::GROUP_SYSTEM,
				'cap'   => 'activate_plugins',
			),
			array(
				'id'    => PufferDesk_App_Ids::USERS,
				'label' => __( 'Users', 'pufferdesk-admin-desktop' ),
				'url'   => admin_url( 'users.php' ),
				'icon'  => $this->theme_icon( 'users.svg', 'dashicons-admin-users' ),
				'about' => $this->wordpress_core_about( __( 'Users', 'pufferdesk-admin-desktop' ) ),
				'group' => PufferDesk_App_Normalizer::GROUP_SYSTEM,
				'cap'   => 'list_users',
			),
			array(
				'id'     => PufferDesk_App_Ids::OS_SETTINGS,
				'label'  => __( 'System Settings', 'pufferdesk-admin-desktop' ),
				'icon'   => $this->theme_icon( 'os-settings.svg', 'dashicons-admin-customizer' ),
				'group'  => PufferDesk_App_Normalizer::GROUP_SYSTEM,
				'cap'    => self::DEFAULT_CAPABILITY,
				'kind'   => PufferDesk_App_Normalizer::KIND_NATIVE,
				'native' => PufferDesk_App_Ids::NATIVE_SETTINGS,
				'menu'   => $this->menu_normalizer->get_os_settings_menu(),
			),
			array(
				'id'    => PufferDesk_App_Ids::SETTINGS,
				'label' => __( 'Settings', 'pufferdesk-admin-desktop' ),
				'url'   => admin_url( 'options-general.php' ),
				'icon'  => $this->theme_icon( 'settings.svg', 'dashicons-admin-settings' ),
				'about' => $this->wordpress_core_about( __( 'Settings', 'pufferdesk-admin-desktop' ) ),
				'group' => PufferDesk_App_Normalizer::GROUP_SYSTEM,
				'cap'   => 'manage_options',
			),
			array(
				'id'    => PufferDesk_App_Ids::TOOLS,
				'label' => __( 'Tools', 'pufferdesk-admin-desktop' ),
				'url'   => admin_url( 'tools.php' ),
				'icon'  => $this->theme_icon( 'tools.svg', 'dashicons-admin-tools' ),
				'about' => $this->wordpress_core_about( __( 'Tools', 'pufferdesk-admin-desktop' ) ),
				'group' => PufferDesk_App_Normalizer::GROUP_SYSTEM,
				'cap'   => 'manage_options',
			),
			array(
				'id'     => PufferDesk_App_Ids::TRASH,
				'label'  => __( 'Trash', 'pufferdesk-admin-desktop' ),
				'icon'   => $this->theme_icon( 'trash-empty.svg', 'dashicons-trash' ),
				'group'  => PufferDesk_App_Normalizer::GROUP_SYSTEM,
				'cap'    => self::DEFAULT_CAPABILITY,
				'dock'   => array(
					'fixed'     => true,
					'placement' => 'end',
				),
				'kind'   => PufferDesk_App_Normalizer::KIND_NATIVE,
				'native' => PufferDesk_App_Ids::NATIVE_TRASH,
			),
		);

		if ( PufferDesk_Admin_Screen_Availability::is_site_health_available() ) {
			$apps[] = array(
				'id'    => PufferDesk_App_Ids::SITE_HEALTH,
				'label' => __( 'Site Health', 'pufferdesk-admin-desktop' ),
				'url'   => admin_url( 'site-health.php' ),
				'icon'  => $this->theme_icon( 'site-health.svg', 'dashicons-heart' ),
				'about' => $this->wordpress_core_about( __( 'Site Health', 'pufferdesk-admin-desktop' ) ),
				'group' => PufferDesk_App_Normalizer::GROUP_SYSTEM,
				'cap'   => PufferDesk_Admin_Screen_Availability::site_health_capability(),
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
		 * array( 'type' => 'image', 'src' => 'shared/icons/theme/posts.svg' )
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
			'type'     => PufferDesk_Icon_Renderer::TYPE_THEME,
			'name'     => $name,
			'fallback' => $fallback,
		);
	}

	/**
	 * Build About metadata for curated WordPress core admin apps.
	 *
	 * @param string $label App label.
	 * @return array<string,mixed>
	 */
	private function wordpress_core_about( $label ) {
		return PufferDesk_App_Normalizer::get_wordpress_core_about( $label );
	}
}
