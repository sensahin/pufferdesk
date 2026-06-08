<?php
/**
 * Asset loading and admin chrome classes.
 *
 * @package WPAdminOS
 */

defined( 'ABSPATH' ) || exit;

/**
 * Enqueues core behavior and selected theme assets.
 */
final class WP_AdminOS_Assets {
	/**
	 * Router.
	 *
	 * @var WP_AdminOS_Router
	 */
	private $router;

	/**
	 * Preferences.
	 *
	 * @var WP_AdminOS_User_Preferences
	 */
	private $preferences;

	/**
	 * App registry.
	 *
	 * @var WP_AdminOS_App_Registry
	 */
	private $app_registry;

	/**
	 * Widget registry.
	 *
	 * @var WP_AdminOS_Widget_Registry
	 */
	private $widget_registry;

	/**
	 * Theme registry.
	 *
	 * @var WP_AdminOS_Theme_Registry
	 */
	private $theme_registry;

	/**
	 * Wallpaper registry.
	 *
	 * @var WP_AdminOS_Wallpaper_Registry
	 */
	private $wallpaper_registry;

	/**
	 * Workspace state service.
	 *
	 * @var WP_AdminOS_Workspace_State
	 */
	private $workspace_state;

	/**
	 * Constructor.
	 *
	 * @param WP_AdminOS_Router           $router Router.
	 * @param WP_AdminOS_User_Preferences $preferences Preferences.
	 * @param WP_AdminOS_App_Registry     $app_registry App registry.
	 * @param WP_AdminOS_Widget_Registry  $widget_registry Widget registry.
	 * @param WP_AdminOS_Theme_Registry   $theme_registry Theme registry.
	 * @param WP_AdminOS_Wallpaper_Registry $wallpaper_registry Wallpaper registry.
	 * @param WP_AdminOS_Workspace_State  $workspace_state Workspace state service.
	 */
	public function __construct(
		WP_AdminOS_Router $router,
		WP_AdminOS_User_Preferences $preferences,
		WP_AdminOS_App_Registry $app_registry,
		WP_AdminOS_Widget_Registry $widget_registry,
		WP_AdminOS_Theme_Registry $theme_registry,
		WP_AdminOS_Wallpaper_Registry $wallpaper_registry,
		WP_AdminOS_Workspace_State $workspace_state
	) {
		$this->router             = $router;
		$this->preferences        = $preferences;
		$this->app_registry       = $app_registry;
		$this->widget_registry    = $widget_registry;
		$this->theme_registry     = $theme_registry;
		$this->wallpaper_registry = $wallpaper_registry;
		$this->workspace_state    = $workspace_state;
	}

	/**
	 * Enqueue shell assets.
	 *
	 * @param string $hook Current admin hook.
	 */
	public function enqueue( $hook ) {
		$is_shell  = 'toplevel_page_' . WP_AdminOS_Router::PAGE_SLUG === $hook;
		$is_iframe = $this->router->is_iframe_request();
		$use_dist  = $this->should_use_dist_assets();

		if ( ! $is_shell && ! $is_iframe ) {
			return;
		}

		$style_dependency = $use_dist
			? $this->enqueue_dist_core_styles( $is_shell )
			: $this->enqueue_core_styles( $is_shell );

		if ( ! $is_shell ) {
			return;
		}

		if ( current_user_can( 'upload_files' ) ) {
			wp_enqueue_media();
		}

		$apps          = $this->app_registry->get_apps();
		$app_locations = $this->preferences->get_app_locations( $apps );
		$folders       = $this->app_registry->get_folders( $apps );
		$widgets       = $this->widget_registry->get_widgets();
		$theme         = $this->theme_registry->get_current_theme( $this->preferences );

		foreach ( $theme['stylesheet_stack'] as $index => $stylesheet ) {
			$stylesheet_path = WP_ADMINOS_DIR . 'assets/css/themes/' . $stylesheet;
			if ( ! file_exists( $stylesheet_path ) ) {
				continue;
			}

			$theme_asset = $this->get_theme_stylesheet_asset( $stylesheet, $use_dist );
			$style_handle = 'wp-adminos-theme-' . $theme['id'] . '-' . (int) $index;
			wp_enqueue_style(
				$style_handle,
				WP_ADMINOS_URL . $theme_asset,
				array( $style_dependency ),
				$this->get_asset_version( $theme_asset )
			);
			$style_dependency = $style_handle;
		}

		$config_handle = $use_dist ? $this->enqueue_dist_script() : $this->enqueue_core_scripts();

		wp_add_inline_script(
			$config_handle,
			'window.wpAdminOS = ' . wp_json_encode( $this->get_runtime_config( $apps, $folders, $widgets, $theme, $app_locations ) ) . ';',
			'before'
		);
	}

	/**
	 * Whether release assets should be used.
	 *
	 * @return bool
	 */
	private function should_use_dist_assets() {
		if ( defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ) {
			return false;
		}

		return file_exists( WP_ADMINOS_DIR . 'assets/dist/css/wp-adminos-core.min.css' )
			&& file_exists( WP_ADMINOS_DIR . 'assets/dist/js/wp-adminos.min.js' );
	}

	/**
	 * Enqueue the built core CSS asset.
	 *
	 * @param bool $include_shell Whether shell component CSS is needed.
	 * @return string Last enqueued style handle.
	 */
	private function enqueue_dist_core_styles( $include_shell ) {
		if ( ! $include_shell ) {
			wp_enqueue_style(
				'wp-adminos-core-admin-chrome',
				WP_ADMINOS_URL . 'assets/css/core/admin-chrome.css',
				array( 'dashicons' ),
				$this->get_asset_version( 'assets/css/core/admin-chrome.css' )
			);

			return 'wp-adminos-core-admin-chrome';
		}

		wp_enqueue_style(
			'wp-adminos-core',
			WP_ADMINOS_URL . 'assets/dist/css/wp-adminos-core.min.css',
			array( 'dashicons' ),
			$this->get_asset_version( 'assets/dist/css/wp-adminos-core.min.css' )
		);

		return 'wp-adminos-core';
	}

	/**
	 * Get a source or dist theme stylesheet path.
	 *
	 * @param string $stylesheet Source stylesheet path below assets/css/themes.
	 * @param bool   $use_dist Whether dist assets should be preferred.
	 * @return string Asset path relative to the plugin root.
	 */
	private function get_theme_stylesheet_asset( $stylesheet, $use_dist ) {
		if ( $use_dist ) {
			$dist_stylesheet = 'assets/dist/css/themes/' . preg_replace( '/\.css$/', '.min.css', $stylesheet );
			if ( file_exists( WP_ADMINOS_DIR . $dist_stylesheet ) ) {
				return $dist_stylesheet;
			}
		}

		return 'assets/css/themes/' . $stylesheet;
	}

	/**
	 * Enqueue the built shell script.
	 *
	 * @return string Script handle that should receive runtime config.
	 */
	private function enqueue_dist_script() {
		wp_enqueue_script(
			'wp-adminos-app',
			WP_ADMINOS_URL . 'assets/dist/js/wp-adminos.min.js',
			array(),
			$this->get_asset_version( 'assets/dist/js/wp-adminos.min.js' ),
			true
		);

		return 'wp-adminos-app';
	}

	/**
	 * Enqueue readable core scripts in dependency order.
	 *
	 * @return string Script handle that should receive runtime config.
	 */
	private function enqueue_core_scripts() {
		$scripts = array(
			'wp-adminos-config'         => array(
				'path' => 'assets/js/core/config.js',
				'deps' => array(),
			),
			'wp-adminos-dom'            => array(
				'path' => 'assets/js/core/dom.js',
				'deps' => array( 'wp-adminos-config' ),
			),
			'wp-adminos-storage'        => array(
				'path' => 'assets/js/core/services/storage.js',
				'deps' => array( 'wp-adminos-config' ),
			),
			'wp-adminos-api-client'     => array(
				'path' => 'assets/js/core/services/api-client.js',
				'deps' => array( 'wp-adminos-config' ),
			),
			'wp-adminos-session-store'  => array(
				'path' => 'assets/js/core/session/session-store.js',
				'deps' => array( 'wp-adminos-storage', 'wp-adminos-api-client' ),
			),
			'wp-adminos-reopen-policy'  => array(
				'path' => 'assets/js/core/session/reopen-policy.js',
				'deps' => array( 'wp-adminos-session-store' ),
			),
			'wp-adminos-appearance'     => array(
				'path' => 'assets/js/core/appearance.js',
				'deps' => array( 'wp-adminos-config' ),
			),
			'wp-adminos-desktop-dock'   => array(
				'path' => 'assets/js/core/desktop-dock.js',
				'deps' => array( 'wp-adminos-config' ),
			),
			'wp-adminos-wallpaper'      => array(
				'path' => 'assets/js/core/wallpaper.js',
				'deps' => array( 'wp-adminos-config' ),
			),
			'wp-adminos-menu-bar-state' => array(
				'path' => 'assets/js/core/menu-bar.js',
				'deps' => array( 'wp-adminos-config', 'wp-adminos-session-store' ),
			),
			'wp-adminos-window-factory' => array(
				'path' => 'assets/js/core/windows/window-factory.js',
				'deps' => array( 'wp-adminos-dom' ),
			),
			'wp-adminos-window-manager' => array(
				'path' => 'assets/js/core/windows/window-manager.js',
				'deps' => array( 'wp-adminos-dom', 'wp-adminos-session-store', 'wp-adminos-window-factory' ),
			),
			'wp-adminos-widget-manager' => array(
				'path' => 'assets/js/core/widgets/widget-manager.js',
				'deps' => array( 'wp-adminos-dom', 'wp-adminos-session-store' ),
			),
			'wp-adminos-desktop-icons'  => array(
				'path' => 'assets/js/core/desktop/desktop-icons.js',
				'deps' => array( 'wp-adminos-dom', 'wp-adminos-session-store' ),
			),
			'wp-adminos-folder-manager' => array(
				'path' => 'assets/js/core/desktop/folder-manager.js',
				'deps' => array( 'wp-adminos-dom', 'wp-adminos-api-client' ),
			),
			'wp-adminos-about-window'   => array(
				'path' => 'assets/js/core/apps/about-window.js',
				'deps' => array( 'wp-adminos-dom' ),
			),
			'wp-adminos-site-about-window' => array(
				'path' => 'assets/js/core/apps/site-about-window.js',
				'deps' => array( 'wp-adminos-dom' ),
			),
			'wp-adminos-app-surfaces'   => array(
				'path' => 'assets/js/core/apps/app-surfaces.js',
				'deps' => array( 'wp-adminos-dom' ),
			),
			'wp-adminos-native-apps'     => array(
				'path' => 'assets/js/core/apps/native-apps.js',
				'deps' => array(),
			),
			'wp-adminos-settings-labels' => array(
				'path' => 'assets/js/core/apps/settings/labels.js',
				'deps' => array(),
			),
			'wp-adminos-settings-ui'     => array(
				'path' => 'assets/js/core/apps/settings/ui.js',
				'deps' => array( 'wp-adminos-dom' ),
			),
			'wp-adminos-settings-panel-general' => array(
				'path' => 'assets/js/core/apps/settings/panel-general.js',
				'deps' => array( 'wp-adminos-settings-labels', 'wp-adminos-settings-ui' ),
			),
			'wp-adminos-settings-panel-profile' => array(
				'path' => 'assets/js/core/apps/settings/panel-profile.js',
				'deps' => array( 'wp-adminos-settings-labels', 'wp-adminos-settings-ui' ),
			),
			'wp-adminos-settings-panel-appearance' => array(
				'path' => 'assets/js/core/apps/settings/panel-appearance.js',
				'deps' => array( 'wp-adminos-settings-labels', 'wp-adminos-settings-ui' ),
			),
			'wp-adminos-settings-panel-desktop-dock' => array(
				'path' => 'assets/js/core/apps/settings/panel-desktop-dock.js',
				'deps' => array( 'wp-adminos-settings-labels', 'wp-adminos-settings-ui' ),
			),
			'wp-adminos-settings-panel-menu-bar' => array(
				'path' => 'assets/js/core/apps/settings/panel-menu-bar.js',
				'deps' => array( 'wp-adminos-settings-labels', 'wp-adminos-settings-ui' ),
			),
			'wp-adminos-settings-panel-wallpaper' => array(
				'path' => 'assets/js/core/apps/settings/panel-wallpaper.js',
				'deps' => array( 'wp-adminos-settings-labels', 'wp-adminos-settings-ui' ),
			),
			'wp-adminos-settings-app'   => array(
				'path' => 'assets/js/core/apps/settings-app.js',
				'deps' => array( 'wp-adminos-dom', 'wp-adminos-storage', 'wp-adminos-api-client', 'wp-adminos-appearance', 'wp-adminos-desktop-dock', 'wp-adminos-menu-bar-state', 'wp-adminos-wallpaper', 'wp-adminos-app-surfaces', 'wp-adminos-native-apps', 'wp-adminos-settings-labels', 'wp-adminos-settings-ui', 'wp-adminos-settings-panel-general', 'wp-adminos-settings-panel-profile', 'wp-adminos-settings-panel-appearance', 'wp-adminos-settings-panel-desktop-dock', 'wp-adminos-settings-panel-menu-bar', 'wp-adminos-settings-panel-wallpaper' ),
			),
			'wp-adminos-app-launcher'   => array(
				'path' => 'assets/js/core/apps/app-launcher.js',
				'deps' => array( 'wp-adminos-dom', 'wp-adminos-about-window', 'wp-adminos-site-about-window', 'wp-adminos-native-apps', 'wp-adminos-settings-app' ),
			),
			'wp-adminos-search'         => array(
				'path' => 'assets/js/core/shell/search.js',
				'deps' => array( 'wp-adminos-config' ),
			),
			'wp-adminos-shell-dialogs'  => array(
				'path' => 'assets/js/core/shell/dialogs.js',
				'deps' => array( 'wp-adminos-dom' ),
			),
			'wp-adminos-menu-commands'  => array(
				'path' => 'assets/js/core/shell/commands.js',
				'deps' => array( 'wp-adminos-dom', 'wp-adminos-app-surfaces' ),
			),
			'wp-adminos-menu-schema'    => array(
				'path' => 'assets/js/core/shell/menu-schema.js',
				'deps' => array( 'wp-adminos-config' ),
			),
			'wp-adminos-menu-renderer'  => array(
				'path' => 'assets/js/core/shell/menu-renderer.js',
				'deps' => array( 'wp-adminos-dom' ),
			),
			'wp-adminos-menu'           => array(
				'path' => 'assets/js/core/shell/menu.js',
				'deps' => array( 'wp-adminos-config', 'wp-adminos-menu-commands', 'wp-adminos-menu-schema', 'wp-adminos-menu-renderer' ),
			),
			'wp-adminos-context-menu'   => array(
				'path' => 'assets/js/core/shell/context-menu.js',
				'deps' => array( 'wp-adminos-config', 'wp-adminos-menu-commands', 'wp-adminos-menu-schema', 'wp-adminos-menu-renderer' ),
			),
			'wp-adminos-shortcuts'      => array(
				'path' => 'assets/js/core/shell/shortcuts.js',
				'deps' => array( 'wp-adminos-menu-commands', 'wp-adminos-menu' ),
			),
			'wp-adminos-clock'          => array(
				'path' => 'assets/js/core/shell/clock.js',
				'deps' => array( 'wp-adminos-config' ),
			),
			'wp-adminos-boot'           => array(
				'path' => 'assets/js/core/boot.js',
				'deps' => array( 'wp-adminos-appearance', 'wp-adminos-desktop-dock', 'wp-adminos-menu-bar-state', 'wp-adminos-wallpaper', 'wp-adminos-reopen-policy', 'wp-adminos-window-manager', 'wp-adminos-widget-manager', 'wp-adminos-desktop-icons', 'wp-adminos-folder-manager', 'wp-adminos-app-launcher', 'wp-adminos-search', 'wp-adminos-shell-dialogs', 'wp-adminos-menu', 'wp-adminos-context-menu', 'wp-adminos-shortcuts', 'wp-adminos-clock' ),
			),
		);

		foreach ( $scripts as $handle => $script ) {
			wp_enqueue_script(
				$handle,
				WP_ADMINOS_URL . $script['path'],
				$script['deps'],
				$this->get_asset_version( $script['path'] ),
				true
			);
		}

		return 'wp-adminos-config';
	}

	/**
	 * Runtime data passed from WordPress into the shell.
	 *
	 * @param array<int,array<string,mixed>> $apps Apps.
	 * @param array<int,array<string,mixed>> $folders Folders.
	 * @param array<int,array<string,mixed>> $widgets Widgets.
	 * @param array<string,mixed>            $theme Current theme.
	 * @param array<string,string>           $app_locations App location map.
	 * @return array<string,mixed>
	 */
	private function get_runtime_config( $apps, $folders, $widgets, $theme, $app_locations ) {
		$current_user = wp_get_current_user();
		$role_label   = $this->get_user_role_label( $current_user );
		$desktop_folders = $this->preferences->get_desktop_folders( $apps );
		$workspace_folders = array_merge( $folders, $desktop_folders );
		$workspace_state   = $this->workspace_state->get_state( $theme['id'], $apps, $widgets, $workspace_folders );

		return array(
			'appearance'     => $this->preferences->get_appearance(),
			'appLocations'   => $app_locations,
			'appLoginItems'  => $this->preferences->get_app_login_items( $apps ),
			'apps'           => $apps,
			'ajaxUrl'        => admin_url( 'admin-ajax.php' ),
			'classicUrl'     => $this->router->get_toggle_url( false ),
			'desktopDock'    => $this->preferences->get_desktop_dock(),
			'desktopFolders' => $desktop_folders,
			'logoutUrl'      => $this->get_logout_url(),
			'menuBar'        => $this->preferences->get_menu_bar(),
			'settings'       => $this->get_settings_config( $theme ),
			'shellChrome'    => isset( $theme['shell'] ) ? $theme['shell'] : array(),
			'shellUrl'       => $this->router->get_shell_url(),
			'siteInfo'       => $this->get_site_info_config(),
			'siteName'       => get_bloginfo( 'name' ),
			'system'         => $this->get_system_config(),
			'themes'         => $this->theme_registry->get_selectable_themes(),
			'wallpaper'      => $this->wallpaper_registry->get_client_config( $theme, $this->preferences ),
			'workspace'      => array(
				'loadAction'  => 'wp_adminos_load_workspace_state',
				'resetAction' => 'wp_adminos_reset_workspace_state',
				'saveAction'  => 'wp_adminos_save_workspace_state',
				'siteId'      => get_current_blog_id(),
				'themeId'     => $theme['id'],
				'version'     => WP_AdminOS_Workspace_State::VERSION,
			),
			'workspaceState' => $workspace_state,
			'userId'         => get_current_user_id(),
			'user'           => array(
				'avatar'     => get_avatar_url( $current_user->ID, array( 'size' => 192 ) ),
				'email'      => $current_user->user_email,
				'name'       => $current_user->display_name ? $current_user->display_name : $current_user->user_login,
				'profileUrl' => admin_url( 'profile.php' ),
				'role'       => $role_label,
				'subtitle'   => $role_label,
			),
			'storageKey'   => 'wpAdminOS:' . get_current_user_id() . ':' . $theme['id'] . ':session',
			'nonce'        => wp_create_nonce( WP_AdminOS_Settings_Controller::NONCE_ACTION ),
			'folders'      => $folders,
			'menu'         => $this->get_menu_config( $theme ),
			'theme'        => $theme,
			'typography'   => isset( $theme['typography'] ) ? $theme['typography'] : array(),
			'widgets'      => $widgets,
			'windowChrome' => isset( $theme['window_chrome'] ) ? $theme['window_chrome'] : array(),
		);
	}

	/**
	 * Build a logout URL suitable for runtime command data.
	 *
	 * WordPress logout helpers escape ampersands for HTML output. Runtime command
	 * payloads need raw query separators so nonce parameters survive navigation.
	 *
	 * @return string
	 */
	private function get_logout_url() {
		return esc_url_raw( html_entity_decode( wp_logout_url(), ENT_QUOTES ) );
	}

	/**
	 * Get a compact label for the current user's primary WordPress role.
	 *
	 * @param WP_User $user User object.
	 * @return string
	 */
	private function get_user_role_label( $user ) {
		$roles = isset( $user->roles ) && is_array( $user->roles ) ? array_values( array_filter( $user->roles ) ) : array();

		if ( empty( $roles ) ) {
			return __( 'WordPress User', 'wp-adminos' );
		}

		$role       = sanitize_key( $roles[0] );
		$role_names = wp_roles()->role_names;

		if ( '' === $role ) {
			return __( 'WordPress User', 'wp-adminos' );
		}

		if ( isset( $role_names[ $role ] ) ) {
			return translate_user_role( $role_names[ $role ] );
		}

		return ucwords( str_replace( '_', ' ', $role ) );
	}

	/**
	 * Safe site details for the About This Site window.
	 *
	 * @return array<string,mixed>
	 */
	private function get_site_info_config() {
		global $wpdb;

		$theme           = wp_get_theme();
		$theme_name      = $theme->exists() ? $theme->get( 'Name' ) : __( 'Unknown', 'wp-adminos' );
		$theme_version   = $theme->exists() ? $theme->get( 'Version' ) : '';
		$wp_version      = get_bloginfo( 'version' );
		$wp_release_name = $this->get_wordpress_release_name( $wp_version );
		$database_label  = isset( $wpdb ) && method_exists( $wpdb, 'db_version' ) ? $wpdb->db_version() : '';
		$site_url        = home_url( '/' );
		$site_icon_url   = $this->get_site_identity_image_url();
		$server_software = $this->get_server_software_label();
		$tagline         = trim( get_bloginfo( 'description' ) );
		$site_url_label  = preg_replace( '#^https?://#', '', untrailingslashit( $site_url ) );
		$wp_label        = $wp_release_name
			? sprintf(
				/* translators: 1: WordPress release name, 2: WordPress version number. */
				__( '%1$s %2$s', 'wp-adminos' ),
				$wp_release_name,
				$wp_version
			)
			: $wp_version;
		$rows            = array(
			array(
				'label' => __( 'PHP', 'wp-adminos' ),
				'value' => PHP_VERSION,
			),
			array(
				'label' => __( 'Database', 'wp-adminos' ),
				'value' => $database_label,
			),
			array(
				'label' => __( 'Server', 'wp-adminos' ),
				'value' => $server_software,
			),
		);

		return array(
			'title'         => __( 'About This Site', 'wp-adminos' ),
			'name'          => get_bloginfo( 'name' ),
			'url'           => $site_url_label,
			'tagline'       => $tagline,
			'aboutSubtitle' => $tagline ? $tagline : $site_url_label,
			'iconUrl'       => $site_icon_url,
			'wordpress'     => array(
				'icon'  => 'dashicons-wordpress',
				'title' => $wp_release_name
					? sprintf(
						/* translators: %s: WordPress release name. */
						__( 'WordPress %s', 'wp-adminos' ),
						$wp_release_name
					)
					: __( 'WordPress', 'wp-adminos' ),
				'value' => sprintf(
					/* translators: %s: WordPress version number. */
					__( 'Version %s', 'wp-adminos' ),
					$wp_version
				),
			),
			'display'       => array(
				'buttonIcon'  => 'dashicons-admin-appearance',
				'buttonLabel' => __( 'Theme Settings...', 'wp-adminos' ),
				'buttonTitle' => __( 'Themes', 'wp-adminos' ),
				'buttonUrl'   => current_user_can( 'switch_themes' ) ? admin_url( 'themes.php' ) : '',
				'icon'        => 'dashicons-desktop',
				'title'       => $theme_name,
				'value'       => $theme_version
					? sprintf(
						/* translators: %s: theme version number. */
						__( 'Version %s', 'wp-adminos' ),
						$theme_version
					)
					: '',
			),
			'rows'          => array_values(
				array_filter(
					$rows,
					static function ( $row ) {
						return ! empty( $row['value'] );
					}
				)
			),
			'aboutRows'     => array_values(
				array_filter(
					array_merge(
						$rows,
						array(
							array(
								'label' => __( 'WordPress', 'wp-adminos' ),
								'value' => $wp_label,
							),
						)
					),
					static function ( $row ) {
						return ! empty( $row['value'] );
					}
				)
			),
			'moreInfoLabel'   => __( 'More Info...', 'wp-adminos' ),
			'moreInfoCommand' => 'settings.open-panel',
			'moreInfoPanel'   => 'general-about',
			'moreInfoTitle'   => __( 'Site Health Info', 'wp-adminos' ),
			'moreInfoUrl'     => current_user_can( 'view_site_health_checks' ) ? admin_url( 'site-health.php?tab=debug' ) : '',
			'footer'          => sprintf(
				/* translators: %s: WP adminOS plugin version. */
				__( 'WP adminOS %s · Built for WordPress admin.', 'wp-adminos' ),
				WP_ADMINOS_VERSION
			),
		);
	}

	/**
	 * WordPress release name matching the installed major/minor version.
	 *
	 * @param string $version WordPress version.
	 * @return string
	 */
	private function get_wordpress_release_name( $version ) {
		$release_names = array(
			'6.0' => 'Arturo O\'Farrill',
			'6.1' => 'Mikhail "Misha" Alperin',
			'6.2' => 'Dolphy',
			'6.3' => 'Lionel',
			'6.4' => 'Shirley',
			'6.5' => 'Regina',
			'6.6' => 'Dorsey',
			'6.7' => 'Rollins',
			'6.8' => 'Cecil',
			'6.9' => 'Gene Harris',
			'7.0' => 'Louis Armstrong',
		);

		if ( ! preg_match( '/^(\d+\.\d+)/', (string) $version, $matches ) ) {
			return '';
		}

		return isset( $release_names[ $matches[1] ] ) ? $release_names[ $matches[1] ] : '';
	}

	/**
	 * Site logo or icon URL for About This Site.
	 *
	 * @return string
	 */
	private function get_site_identity_image_url() {
		$logo_id = (int) get_theme_mod( 'custom_logo' );

		if ( $logo_id ) {
			$logo_url = wp_get_attachment_image_url( $logo_id, 'full' );
			if ( $logo_url ) {
				return esc_url_raw( $logo_url );
			}
		}

		$site_icon_url = get_site_icon_url( 256 );

		return $site_icon_url ? esc_url_raw( $site_icon_url ) : '';
	}

	/**
	 * Public web server software label without sensitive host details.
	 *
	 * @return string
	 */
	private function get_server_software_label() {
		$server_software = isset( $_SERVER['SERVER_SOFTWARE'] )
			? sanitize_text_field( wp_unslash( $_SERVER['SERVER_SOFTWARE'] ) )
			: '';

		if ( '' === $server_software ) {
			return __( 'Unknown', 'wp-adminos' );
		}

		return preg_replace( '/\s+/', ' ', $server_software );
	}

	/**
	 * Theme-provided shell labels with release-safe defaults.
	 *
	 * @param array<string,mixed> $theme Current theme.
	 * @return array<string,string>
	 */
	private function get_theme_shell_labels( $theme = array() ) {
		$defaults = array(
			'launcher'             => __( 'Dock', 'wp-adminos' ),
			'desktop_launcher'     => __( 'Desktop & Dock', 'wp-adminos' ),
			'launcher_and_desktop' => __( 'Dock & Desktop', 'wp-adminos' ),
			'launcher_position'    => __( 'Dock position on screen', 'wp-adminos' ),
			'auto_hide_launcher'   => __( 'Automatically hide and show the Dock', 'wp-adminos' ),
			'launcher_options'     => __( 'Options', 'wp-adminos' ),
			'keep_in_launcher'     => __( 'Keep in Dock', 'wp-adminos' ),
			'remove_from_launcher' => __( 'Remove from Dock', 'wp-adminos' ),
			'open_at_login'        => __( 'Open at Login', 'wp-adminos' ),
			'menu_bar'             => __( 'Menu Bar', 'wp-adminos' ),
			'menu_bar_auto_hide'   => __( 'Automatically hide and show the menu bar', 'wp-adminos' ),
			'menu_bar_background'  => __( 'Show menu bar background', 'wp-adminos' ),
		);
		$labels   = isset( $theme['shell']['labels'] ) && is_array( $theme['shell']['labels'] )
			? $theme['shell']['labels']
			: array();

		return wp_parse_args( $labels, $defaults );
	}

	/**
	 * Theme-provided window control labels with defaults.
	 *
	 * @param array<string,mixed> $theme Current theme.
	 * @return array<string,string>
	 */
	private function get_theme_window_control_labels( $theme = array() ) {
		$defaults = array(
			'close'    => __( 'Close', 'wp-adminos' ),
			'minimize' => __( 'Minimize', 'wp-adminos' ),
			'maximize' => __( 'Maximize', 'wp-adminos' ),
		);
		$labels   = isset( $theme['window_chrome']['controls']['labels'] ) && is_array( $theme['window_chrome']['controls']['labels'] )
			? $theme['window_chrome']['controls']['labels']
			: array();

		return wp_parse_args( $labels, $defaults );
	}

	/**
	 * Settings data used by native System Settings panels.
	 *
	 * @param array<string,mixed> $theme Current theme.
	 * @return array<string,mixed>
	 */
	private function get_settings_config( $theme = array() ) {
		return array(
			'general' => array(
				'description' => __( 'Manage site information, updates, language, privacy, and WordPress tools.', 'wp-adminos' ),
				'groups'      => $this->get_general_settings_groups(),
			),
			'labels'  => $this->get_settings_labels_config( $theme ),
		);
	}

	/**
	 * Localized labels and option lists used by native System Settings panels.
	 *
	 * @param array<string,mixed> $theme Current theme.
	 * @return array<string,mixed>
	 */
	private function get_settings_labels_config( $theme = array() ) {
		$shell_labels           = $this->get_theme_shell_labels( $theme );
		$launcher_label         = $shell_labels['launcher'];
		$desktop_launcher_label = $shell_labels['desktop_launcher'];
		$launcher_and_desktop   = $shell_labels['launcher_and_desktop'];
		$menu_bar_label         = $shell_labels['menu_bar'];

		return array(
			'status'       => array(
				'saving'                 => __( 'Saving...', 'wp-adminos' ),
				'removing'               => __( 'Removing...', 'wp-adminos' ),
				'appearanceSaveError'    => __( 'Appearance could not be saved.', 'wp-adminos' ),
				'appearanceSaved'        => __( 'Appearance saved.', 'wp-adminos' ),
				'desktopDockSaveError'   => sprintf(
					/* translators: %s: theme-specific desktop and launcher settings label. */
					__( '%s could not be saved.', 'wp-adminos' ),
					$desktop_launcher_label
				),
				'appLocationsSaveError'  => __( 'App locations could not be saved.', 'wp-adminos' ),
				'appLocationsSaved'      => __( 'App locations saved.', 'wp-adminos' ),
				'menuBarSaveError'       => sprintf(
					/* translators: %s: theme-specific menu bar label. */
					__( '%s could not be saved.', 'wp-adminos' ),
					$menu_bar_label
				),
				'wallpaperSaveError'     => __( 'Wallpaper could not be saved.', 'wp-adminos' ),
				'wallpaperSaved'         => __( 'Wallpaper saved.', 'wp-adminos' ),
				'photoRemoveError'       => __( 'Photo could not be removed.', 'wp-adminos' ),
				'photoRemoved'           => __( 'Photo removed.', 'wp-adminos' ),
				'themeSaveError'         => __( 'Theme could not be saved.', 'wp-adminos' ),
				'themeSaved'             => __( 'Theme saved.', 'wp-adminos' ),
				'mediaUnavailable'       => __( 'Media Library is not available for this user.', 'wp-adminos' ),
				'invalidImage'           => __( 'Choose a valid image.', 'wp-adminos' ),
			),
			'history'      => array(
				'back'    => __( 'Back', 'wp-adminos' ),
				'forward' => __( 'Forward', 'wp-adminos' ),
			),
			'sidebar'      => array(
				'searchPlaceholder' => __( 'Search', 'wp-adminos' ),
				'searchLabel'       => __( 'Search settings', 'wp-adminos' ),
				'navLabel'          => __( 'Settings sections', 'wp-adminos' ),
				'items'             => array(
					array(
						'id'    => 'general',
						'label' => __( 'General', 'wp-adminos' ),
						'icon'  => 'dashicons-admin-generic',
						'tone'  => 'gray',
					),
					array(
						'id'    => 'appearance',
						'label' => __( 'Appearance', 'wp-adminos' ),
						'icon'  => 'dashicons-admin-appearance',
						'tone'  => 'blue',
					),
					array(
						'id'    => 'desktop-dock',
						'label' => $desktop_launcher_label,
						'icon'  => 'dashicons-desktop',
						'tone'  => 'indigo',
					),
					array(
						'id'    => 'menu-bar',
						'label' => $menu_bar_label,
						'icon'  => 'dashicons-menu-alt3',
						'tone'  => 'gray',
					),
					array(
						'id'    => 'wallpaper',
						'label' => __( 'Wallpaper', 'wp-adminos' ),
						'icon'  => 'dashicons-format-image',
						'tone'  => 'cyan',
					),
					array(
						'id'       => 'widgets',
						'label'    => __( 'Widgets', 'wp-adminos' ),
						'icon'     => 'dashicons-screenoptions',
						'tone'     => 'green',
						'disabled' => true,
					),
					array(
						'id'       => 'apps',
						'label'    => __( 'Apps', 'wp-adminos' ),
						'icon'     => 'dashicons-grid-view',
						'tone'     => 'purple',
						'disabled' => true,
					),
					array(
						'id'       => 'workspace',
						'label'    => __( 'Workspace', 'wp-adminos' ),
						'icon'     => 'dashicons-layout',
						'tone'     => 'orange',
						'disabled' => true,
					),
					array(
						'id'       => 'system',
						'label'    => __( 'System', 'wp-adminos' ),
						'icon'     => 'dashicons-admin-tools',
						'tone'     => 'red',
						'disabled' => true,
					),
				),
			),
			'profile'      => array(
				'sectionLabel'             => __( 'WordPress Account', 'wp-adminos' ),
				'defaultName'              => __( 'Admin', 'wp-adminos' ),
				'defaultRole'              => __( 'WordPress User', 'wp-adminos' ),
				'editProfileLabel'         => __( 'Edit profile', 'wp-adminos' ),
				'editLabel'                => __( 'Edit', 'wp-adminos' ),
				'profileTitle'             => __( 'WordPress Profile', 'wp-adminos' ),
				'personalInfoLabel'        => __( 'Personal Information', 'wp-adminos' ),
				'personalInfoDescription'  => __( 'Name, contact, website, and bio', 'wp-adminos' ),
				'rolePermissionsLabel'     => __( 'Role & Permissions', 'wp-adminos' ),
				'rolePermissionsDescription' => __( 'Current access level', 'wp-adminos' ),
				'signOutLabel'             => __( 'Sign Out...', 'wp-adminos' ),
			),
			'generalPanel' => array(
				'title'                     => __( 'General', 'wp-adminos' ),
				'description'               => __( 'Manage site information, updates, language, privacy, and WordPress tools.', 'wp-adminos' ),
				'fallbackWindowTitle'       => __( 'WordPress', 'wp-adminos' ),
				'aboutTitle'                => __( 'About', 'wp-adminos' ),
				'siteFallbackTitle'         => __( 'WordPress Site', 'wp-adminos' ),
				'nameLabel'                 => __( 'Name', 'wp-adminos' ),
				'addressLabel'              => __( 'Address', 'wp-adminos' ),
				'wordpressHeading'          => __( 'WordPress', 'wp-adminos' ),
				'displaysHeading'           => __( 'Displays', 'wp-adminos' ),
				'diagnosticsHeading'        => __( 'Diagnostics', 'wp-adminos' ),
				'diagnosticsTitle'          => __( 'Site Health', 'wp-adminos' ),
				'diagnosticsDescription'    => __( 'WordPress diagnostics and environment report', 'wp-adminos' ),
				'moreInfoLabel'             => __( 'More Info...', 'wp-adminos' ),
				'moreInfoTitle'             => __( 'Site Health Info', 'wp-adminos' ),
			),
			'appearance'   => array(
				'title'                 => __( 'Appearance', 'wp-adminos' ),
				'appearanceLabel'       => __( 'Appearance', 'wp-adminos' ),
				'materialLabel'         => __( 'Liquid Glass', 'wp-adminos' ),
				'materialDescription'   => __( 'Choose your preferred Liquid Glass look.', 'wp-adminos' ),
				'themeHeading'          => __( 'Theme', 'wp-adminos' ),
				'colorLabel'            => __( 'Color', 'wp-adminos' ),
				'iconWidgetStyleLabel'  => __( 'Icon & widget style', 'wp-adminos' ),
				'installedThemeHeading' => __( 'Installed Theme', 'wp-adminos' ),
				'themeLabel'            => __( 'Theme', 'wp-adminos' ),
				'applyThemeLabel'       => __( 'Apply Theme', 'wp-adminos' ),
				'themeFallbackLabel'    => __( 'Theme', 'wp-adminos' ),
				'modeOptions'           => array(
					array( 'value' => 'auto', 'label' => __( 'Auto', 'wp-adminos' ) ),
					array( 'value' => 'light', 'label' => __( 'Light', 'wp-adminos' ) ),
					array( 'value' => 'dark', 'label' => __( 'Dark', 'wp-adminos' ) ),
				),
				'materialOptions'       => array(
					array( 'value' => 'clear', 'label' => __( 'Clear', 'wp-adminos' ) ),
					array( 'value' => 'tinted', 'label' => __( 'Tinted', 'wp-adminos' ) ),
				),
				'iconWidgetStyleOptions' => array(
					array( 'value' => 'default', 'label' => __( 'Default', 'wp-adminos' ) ),
					array( 'value' => 'dark', 'label' => __( 'Dark', 'wp-adminos' ) ),
					array( 'value' => 'clear', 'label' => __( 'Clear', 'wp-adminos' ) ),
					array( 'value' => 'tinted', 'label' => __( 'Tinted', 'wp-adminos' ) ),
				),
				'accentOptions'         => array(
					array( 'value' => 'multicolor', 'label' => __( 'Multicolor', 'wp-adminos' ) ),
					array( 'value' => 'blue', 'label' => __( 'Blue', 'wp-adminos' ) ),
					array( 'value' => 'purple', 'label' => __( 'Purple', 'wp-adminos' ) ),
					array( 'value' => 'pink', 'label' => __( 'Pink', 'wp-adminos' ) ),
					array( 'value' => 'red', 'label' => __( 'Red', 'wp-adminos' ) ),
					array( 'value' => 'orange', 'label' => __( 'Orange', 'wp-adminos' ) ),
					array( 'value' => 'yellow', 'label' => __( 'Yellow', 'wp-adminos' ) ),
					array( 'value' => 'green', 'label' => __( 'Green', 'wp-adminos' ) ),
					array( 'value' => 'graphite', 'label' => __( 'Graphite', 'wp-adminos' ) ),
				),
			),
			'desktopDock'  => array(
				'headings' => array(
					'dock'    => $launcher_label,
					'apps'    => __( 'Apps', 'wp-adminos' ),
					'desktop' => __( 'Desktop', 'wp-adminos' ),
					'widgets' => __( 'Widgets', 'wp-adminos' ),
				),
				'rows'     => array(
					'dockSize'                 => __( 'Size', 'wp-adminos' ),
					'dockMagnification'        => __( 'Magnification', 'wp-adminos' ),
					'dockPosition'             => $shell_labels['launcher_position'],
					'minimizeAnimation'         => __( 'Minimized window animation', 'wp-adminos' ),
					'minimizeIntoAppIcon'       => __( 'Minimize windows into application icon', 'wp-adminos' ),
					'autoHideDock'              => $shell_labels['auto_hide_launcher'],
					'animateOpeningApps'        => __( 'Animate opening applications', 'wp-adminos' ),
					'showOpenIndicators'        => __( 'Show indicators for open applications', 'wp-adminos' ),
					'wallpaperClick'            => __( 'Click wallpaper to show desktop', 'wp-adminos' ),
					'wallpaperClickDescription' => __( 'Click wallpaper to move windows out of the way, revealing your desktop items and widgets.', 'wp-adminos' ),
					'showWidgetsDesktop'        => __( 'Show widgets on desktop', 'wp-adminos' ),
					'dimWidgets'                => __( 'Dim widgets on desktop', 'wp-adminos' ),
				),
				'ranges'   => array(
					'small' => __( 'Small', 'wp-adminos' ),
					'large' => __( 'Large', 'wp-adminos' ),
					'off'   => __( 'Off', 'wp-adminos' ),
				),
				'selectOptions' => array(
					'dock_position'      => array(
						array( 'value' => 'left', 'label' => __( 'Left', 'wp-adminos' ) ),
						array( 'value' => 'bottom', 'label' => __( 'Bottom', 'wp-adminos' ) ),
						array( 'value' => 'right', 'label' => __( 'Right', 'wp-adminos' ) ),
					),
					'minimize_animation' => array(
						array( 'value' => 'genie', 'label' => __( 'Genie Effect', 'wp-adminos' ) ),
						array( 'value' => 'scale', 'label' => __( 'Scale Effect', 'wp-adminos' ) ),
					),
					'wallpaper_click'    => array(
						array( 'value' => 'always', 'label' => __( 'Always', 'wp-adminos' ) ),
						array( 'value' => 'never', 'label' => __( 'Never', 'wp-adminos' ) ),
					),
					'dim_widgets'        => array(
						array( 'value' => 'automatic', 'label' => __( 'Automatically', 'wp-adminos' ) ),
						array( 'value' => 'always', 'label' => __( 'Always', 'wp-adminos' ) ),
						array( 'value' => 'never', 'label' => __( 'Never', 'wp-adminos' ) ),
					),
				),
				'appLocationOptions' => array(
					array( 'value' => 'dock', 'label' => $launcher_label ),
					array( 'value' => 'desktop', 'label' => __( 'Desktop', 'wp-adminos' ) ),
					array( 'value' => 'both', 'label' => $launcher_and_desktop ),
					array( 'value' => 'hidden', 'label' => __( 'Hidden', 'wp-adminos' ) ),
				),
			),
			'menuBar'      => array(
				'rows'          => array(
					'autoHide'       => $shell_labels['menu_bar_auto_hide'],
					'showBackground' => $shell_labels['menu_bar_background'],
					'recentCount'    => __( 'Recent documents, applications, and servers', 'wp-adminos' ),
				),
				'selectOptions' => array(
					'auto_hide'    => array(
						array( 'value' => 'always', 'label' => __( 'Always', 'wp-adminos' ) ),
						array( 'value' => 'desktop', 'label' => __( 'On Desktop Only', 'wp-adminos' ) ),
						array( 'value' => 'fullscreen', 'label' => __( 'In Full Screen Only', 'wp-adminos' ) ),
						array( 'value' => 'never', 'label' => __( 'Never', 'wp-adminos' ) ),
					),
					'recent_count' => array(
						array( 'value' => '0', 'label' => __( 'None', 'wp-adminos' ) ),
						array( 'value' => '5', 'label' => '5' ),
						array( 'value' => '10', 'label' => '10' ),
						array( 'value' => '15', 'label' => '15' ),
						array( 'value' => '20', 'label' => '20' ),
						array( 'value' => '30', 'label' => '30' ),
						array( 'value' => '50', 'label' => '50' ),
					),
				),
			),
			'wallpaper'    => array(
				'wallpapersHeading'       => __( 'Wallpapers', 'wp-adminos' ),
				'colorsHeading'           => __( 'Colors', 'wp-adminos' ),
				'yourPhotosHeading'       => __( 'Your Photos', 'wp-adminos' ),
				'addPhotoLabel'           => __( 'Add Photo...', 'wp-adminos' ),
				'selectedPhotoLabel'      => __( 'Selected Photo', 'wp-adminos' ),
				'removePhotoLabel'        => __( 'Remove photo', 'wp-adminos' ),
				'showLessLabel'           => __( 'Show Less', 'wp-adminos' ),
				/* translators: %d: number of wallpaper items. */
				'showAllLabel'            => __( 'Show All (%d)', 'wp-adminos' ),
				'chooseWallpaperTitle'    => __( 'Choose Wallpaper', 'wp-adminos' ),
				'useAsWallpaperLabel'     => __( 'Use as Wallpaper', 'wp-adminos' ),
				'customWallpaperLabel'    => __( 'Custom Wallpaper', 'wp-adminos' ),
			),
		);
	}

	/**
	 * General settings groups for WordPress-backed destinations.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	private function get_general_settings_groups() {
		return array_values(
			array_filter(
				array(
					array(
						'id'    => 'system',
						'items' => $this->filter_settings_rows(
							array(
								array(
									'id'          => 'about',
									'label'       => __( 'About', 'wp-adminos' ),
									'description' => __( 'Site and WordPress environment details', 'wp-adminos' ),
									'icon'        => 'dashicons-info-outline',
									'tone'        => 'gray',
									'panel'       => 'general-about',
								),
								array(
									'id'     => 'software-update',
									'label'  => __( 'Software Update', 'wp-adminos' ),
									'icon'   => 'dashicons-update',
									'tone'   => 'gray',
									'url'    => admin_url( 'update-core.php' ),
									'title'  => __( 'WordPress Updates', 'wp-adminos' ),
									'capany' => array( 'update_core', 'update_plugins', 'update_themes' ),
								),
								array(
									'id'    => 'site-health',
									'label' => __( 'Site Health', 'wp-adminos' ),
									'icon'  => 'dashicons-heart',
									'tone'  => 'gray',
									'url'   => admin_url( 'site-health.php' ),
									'title' => __( 'Site Health', 'wp-adminos' ),
									'cap'   => 'view_site_health_checks',
								),
							)
						),
					),
					array(
						'id'    => 'site',
						'items' => $this->filter_settings_rows(
							array(
								array(
									'id'    => 'date-time',
									'label' => __( 'Date & Time', 'wp-adminos' ),
									'icon'  => 'dashicons-calendar-alt',
									'tone'  => 'blue',
									'url'   => admin_url( 'options-general.php#timezone_string' ),
									'title' => __( 'Date & Time', 'wp-adminos' ),
									'cap'   => 'manage_options',
								),
								array(
									'id'    => 'language-region',
									'label' => __( 'Language & Region', 'wp-adminos' ),
									'icon'  => 'dashicons-translation',
									'tone'  => 'blue',
									'url'   => admin_url( 'options-general.php#WPLANG' ),
									'title' => __( 'Language & Region', 'wp-adminos' ),
									'cap'   => 'manage_options',
								),
								array(
									'id'    => 'permalinks',
									'label' => __( 'Permalinks', 'wp-adminos' ),
									'icon'  => 'dashicons-admin-links',
									'tone'  => 'gray',
									'url'   => admin_url( 'options-permalink.php' ),
									'title' => __( 'Permalinks', 'wp-adminos' ),
									'cap'   => 'manage_options',
								),
								array(
									'id'    => 'privacy',
									'label' => __( 'Privacy', 'wp-adminos' ),
									'icon'  => 'dashicons-privacy',
									'tone'  => 'gray',
									'url'   => admin_url( 'options-privacy.php' ),
									'title' => __( 'Privacy', 'wp-adminos' ),
									'cap'   => 'manage_privacy_options',
								),
								array(
									'id'    => 'import-export',
									'label' => __( 'Import & Export', 'wp-adminos' ),
									'icon'  => 'dashicons-migrate',
									'tone'  => 'gray',
									'url'   => admin_url( 'import.php' ),
									'title' => __( 'Import & Export', 'wp-adminos' ),
									'cap'   => 'import',
								),
							)
						),
					),
					array(
						'id'    => 'reset',
						'items' => $this->filter_settings_rows(
							array(
								array(
									'id'          => 'erase-content-settings',
									'label'       => __( 'Erase All Content and Settings...', 'wp-adminos' ),
									'description' => __( 'Reset WP adminOS preferences and layout for this account', 'wp-adminos' ),
									'icon'        => 'dashicons-trash',
									'tone'        => 'red',
									'command'     => 'system.erase-content-settings',
								),
							)
						),
					),
				),
				static function ( $group ) {
					return ! empty( $group['items'] );
				}
			)
		);
	}

	/**
	 * Remove rows the current user cannot use.
	 *
	 * @param array<int,array<string,mixed>> $rows Rows.
	 * @return array<int,array<string,mixed>>
	 */
	private function filter_settings_rows( $rows ) {
		return array_values(
			array_filter(
				$rows,
				static function ( $row ) {
					if ( isset( $row['capany'] ) && is_array( $row['capany'] ) ) {
						foreach ( $row['capany'] as $capability ) {
							if ( current_user_can( $capability ) ) {
								return true;
							}
						}

						return false;
					}

					if ( isset( $row['cap'] ) && is_string( $row['cap'] ) ) {
						return current_user_can( $row['cap'] );
					}

					return true;
				}
			)
		);
	}

	/**
	 * Runtime data for WP adminOS shell actions.
	 *
	 * @return array<string,mixed>
	 */
	private function get_system_config() {
		$current_user = wp_get_current_user();
		$user_label   = $current_user->display_name ? $current_user->display_name : $current_user->user_login;

		return array(
			'actions' => array(
				'restart'       => array(
					'title'                => __( 'Are you sure you want to restart WP adminOS?', 'wp-adminos' ),
					/* translators: {seconds}: seconds remaining before WP adminOS restarts automatically. */
					'message'              => __( 'If you do nothing, WP adminOS will restart automatically in {seconds} seconds.', 'wp-adminos' ),
					'confirmLabel'         => __( 'Restart', 'wp-adminos' ),
					'cancelLabel'          => __( 'Cancel', 'wp-adminos' ),
					'reopenWindowsLabel'   => __( 'Reopen windows after restarting', 'wp-adminos' ),
					'reopenWindowsDefault' => false,
					'countdownSeconds'     => 60,
					'icon'                 => 'power',
					'overlayMessage'       => __( 'Restarting WP adminOS...', 'wp-adminos' ),
				),
				'switchClassic' => array(
					'title'                => __( 'Are you sure you want to switch to Classic Admin?', 'wp-adminos' ),
					/* translators: {seconds}: seconds remaining before Classic Admin opens automatically. */
					'message'              => __( 'If you do nothing, Classic Admin will open automatically in {seconds} seconds.', 'wp-adminos' ),
					'confirmLabel'         => __( 'Switch', 'wp-adminos' ),
					'cancelLabel'          => __( 'Cancel', 'wp-adminos' ),
					'reopenWindowsLabel'   => __( 'Reopen windows when returning to WP adminOS', 'wp-adminos' ),
					'reopenWindowsDefault' => false,
					'countdownSeconds'     => 60,
					'icon'                 => 'dashicons-admin-site-alt3',
					'overlayMessage'       => __( 'Switching to Classic Admin...', 'wp-adminos' ),
				),
				'logout'        => array(
					'title'                => sprintf(
						/* translators: %s: current user display name. */
						__( 'Are you sure you want to log out %s?', 'wp-adminos' ),
						$user_label
					),
					/* translators: {seconds}: seconds remaining before the user is logged out automatically. */
					'message'              => __( 'If you do nothing, you will be logged out automatically in {seconds} seconds.', 'wp-adminos' ),
					'confirmLabel'         => __( 'Log Out', 'wp-adminos' ),
					'cancelLabel'          => __( 'Cancel', 'wp-adminos' ),
					'reopenWindowsLabel'   => __( 'Reopen windows when logging back in', 'wp-adminos' ),
					'reopenWindowsDefault' => false,
					'countdownSeconds'     => 60,
					'icon'                 => 'power',
					'overlayMessage'       => __( 'Logging out...', 'wp-adminos' ),
				),
				'eraseContentSettings' => array(
					'title'          => __( 'Erase All Content and Settings?', 'wp-adminos' ),
					'message'        => __( 'This will reset WP adminOS settings, wallpaper, dock, windows, and layout for this WordPress account. WordPress site content will not be affected.', 'wp-adminos' ),
					'confirmLabel'   => __( 'Erase', 'wp-adminos' ),
					'cancelLabel'    => __( 'Cancel', 'wp-adminos' ),
					'overlayMessage' => __( 'Erasing WP adminOS settings...', 'wp-adminos' ),
				),
			),
		);
	}

	/**
	 * Localized menu defaults for the active-app menu bar.
	 *
	 * @param array<string,mixed> $theme Current theme.
	 * @return array<string,mixed>
	 */
	private function get_menu_config( $theme = array() ) {
		$current_user          = wp_get_current_user();
		$user_label            = $current_user->display_name ? $current_user->display_name : $current_user->user_login;
		$shell_labels          = $this->get_theme_shell_labels( $theme );
		$window_control_labels = $this->get_theme_window_control_labels( $theme );

		return array(
			'system'     => array(
				'groups' => array(
					array(
						'id'    => 'system',
						'label' => __( 'WP adminOS', 'wp-adminos' ),
						'items' => array(
							array(
								'label'   => __( 'About This Site', 'wp-adminos' ),
								'command' => 'open-site-about',
								'icon'    => 'dashicons-info-outline',
							),
							array(
								'label'   => __( 'System Settings...', 'wp-adminos' ),
								'command' => 'open-app',
								'target'  => 'os-settings',
								'icon'    => 'dashicons-admin-customizer',
							),
							array(
								'label'   => __( 'WordPress Updates...', 'wp-adminos' ),
								'command' => 'open-url',
								'url'     => admin_url( 'update-core.php' ),
								'title'   => __( 'WordPress Updates', 'wp-adminos' ),
								'icon'    => 'dashicons-update',
							),
							array(
								'type' => 'separator',
							),
							array(
								'id'       => 'recent-items',
								'label'    => __( 'Recent Items', 'wp-adminos' ),
								'disabled' => true,
								'icon'     => 'dashicons-backup',
								'shortcut' => '>',
							),
							array(
								'type' => 'separator',
							),
							array(
								'id'       => 'close-active-window',
								'label'    => __( 'Close Active App', 'wp-adminos' ),
								'command'  => 'window.close',
								'icon'     => 'dashicons-dismiss',
								'shortcut' => '⌘W',
							),
							array(
								'type' => 'separator',
							),
							array(
								'label'   => __( 'Restart WP adminOS...', 'wp-adminos' ),
								'command' => 'shell.restart',
								'icon'    => 'dashicons-update',
							),
							array(
								'label'   => __( 'Switch to Classic Admin...', 'wp-adminos' ),
								'command' => 'shell.switch-classic',
								'url'     => $this->router->get_toggle_url( false ),
								'icon'    => 'dashicons-admin-site-alt3',
							),
							array(
								'type' => 'separator',
							),
							array(
								'label'   => sprintf(
									/* translators: %s: current user display name. */
									__( 'Log Out %s...', 'wp-adminos' ),
									$user_label
								),
								'command' => 'user.logout',
								'url'     => $this->get_logout_url(),
								'icon'    => 'dashicons-migrate',
							),
						),
					),
				),
			),
			'persistent' => array(
				'groups' => array(
					array(
						'id'    => 'site',
						'label' => get_bloginfo( 'name' ),
						'items' => array(
							array(
								'label'   => __( 'Dashboard', 'wp-adminos' ),
								'command' => 'open-app',
								'target'  => 'dashboard',
							),
							array(
								'label'   => __( 'Visit Site', 'wp-adminos' ),
								'command' => 'open-external-url',
								'url'     => home_url( '/' ),
							),
						),
					),
				),
			),
			'desktop'    => array(
				'groups' => array(
					array(
						'id'    => 'file',
						'label' => __( 'File', 'wp-adminos' ),
						'items' => array(),
					),
					array(
						'id'    => 'edit',
						'label' => __( 'Edit', 'wp-adminos' ),
						'items' => array(),
					),
					array(
						'id'    => 'view',
						'label' => __( 'View', 'wp-adminos' ),
						'items' => array(),
					),
					array(
						'id'    => 'go',
						'label' => __( 'Go', 'wp-adminos' ),
						'items' => array(),
					),
					array(
						'id'    => 'window',
						'label' => __( 'Window', 'wp-adminos' ),
						'items' => array(),
					),
					array(
						'id'    => 'help',
						'label' => __( 'Help', 'wp-adminos' ),
						'items' => array(),
					),
				),
			),
			'labels'     => array(
				'site'                   => get_bloginfo( 'name' ),
				'file'                   => __( 'File', 'wp-adminos' ),
				'edit'                   => __( 'Edit', 'wp-adminos' ),
				'view'                   => __( 'View', 'wp-adminos' ),
				'go'                     => __( 'Go', 'wp-adminos' ),
				'window'                 => __( 'Window', 'wp-adminos' ),
				'help'                   => __( 'Help', 'wp-adminos' ),
				'admin'                  => __( 'Admin', 'wp-adminos' ),
				'folder_suffix'          => __( 'Folder', 'wp-adminos' ),
				'launcher'               => $shell_labels['launcher'],
				'launcher_options'       => $shell_labels['launcher_options'],
				'keep_in_launcher'       => $shell_labels['keep_in_launcher'],
				'remove_from_launcher'   => $shell_labels['remove_from_launcher'],
				'open_at_login'          => $shell_labels['open_at_login'],
				'window_close'           => $window_control_labels['close'],
				'window_minimize'        => $window_control_labels['minimize'],
				'window_maximize'        => $window_control_labels['maximize'],
			),
		);
	}

	/**
	 * Enqueue semantic core styles in cascade order.
	 *
	 * @param bool $include_shell Whether shell component CSS is needed.
	 * @return string Last enqueued style handle.
	 */
	private function enqueue_core_styles( $include_shell ) {
		$core_styles = array(
			'wp-adminos-core-admin-chrome' => 'assets/css/core/admin-chrome.css',
		);

		if ( $include_shell ) {
			$core_styles = array_merge(
				$core_styles,
				array(
					'wp-adminos-core-shell'      => 'assets/css/core/shell.css',
					'wp-adminos-core-dialogs'    => 'assets/css/core/dialogs.css',
					'wp-adminos-core-context'    => 'assets/css/core/context-menu.css',
					'wp-adminos-core-desktop'    => 'assets/css/core/desktop.css',
					'wp-adminos-core-widgets'    => 'assets/css/core/widgets.css',
					'wp-adminos-core-windows'    => 'assets/css/core/windows.css',
					'wp-adminos-core-apps'       => 'assets/css/core/apps.css',
					'wp-adminos-core-dock'       => 'assets/css/core/dock.css',
					'wp-adminos-core-responsive' => 'assets/css/core/responsive.css',
				)
			);
		}

		$dependency = 'dashicons';
		foreach ( $core_styles as $handle => $path ) {
			wp_enqueue_style(
				$handle,
				WP_ADMINOS_URL . $path,
				array( $dependency ),
				$this->get_asset_version( $path )
			);
			$dependency = $handle;
		}

		return $dependency;
	}

	/**
	 * Add body classes for targeted admin chrome changes.
	 *
	 * @param string $classes Existing admin body classes.
	 * @return string
	 */
	public function add_admin_body_classes( $classes ) {
		if ( $this->router->is_shell_request() ) {
			$classes .= ' wp-adminos-shell';
		}

		if ( $this->router->is_iframe_request() ) {
			$classes .= ' wp-adminos-iframe';
		}

		return $classes;
	}

	/**
	 * Remove the admin top offset inside shell and embedded iframe apps.
	 */
	public function print_iframe_head_style() {
		if ( ! $this->router->is_shell_request() && ! $this->router->is_iframe_request() ) {
			return;
		}

		echo '<style>html.wp-toolbar{padding-top:0!important;}</style>';
	}

	/**
	 * Build a cache-busting asset version for edited source and dist files.
	 *
	 * @param string $path Asset path relative to the plugin root.
	 * @return string
	 */
	private function get_asset_version( $path ) {
		$file = WP_ADMINOS_DIR . ltrim( $path, '/' );

		if ( file_exists( $file ) ) {
			return WP_ADMINOS_VERSION . '-' . filemtime( $file );
		}

		return WP_ADMINOS_VERSION;
	}
}
