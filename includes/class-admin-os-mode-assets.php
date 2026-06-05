<?php
/**
 * Asset loading and admin chrome classes.
 *
 * @package AdminOSMode
 */

defined( 'ABSPATH' ) || exit;

/**
 * Enqueues core behavior and selected theme assets.
 */
final class Admin_OS_Mode_Assets {
	/**
	 * Router.
	 *
	 * @var Admin_OS_Mode_Router
	 */
	private $router;

	/**
	 * Preferences.
	 *
	 * @var Admin_OS_Mode_User_Preferences
	 */
	private $preferences;

	/**
	 * App registry.
	 *
	 * @var Admin_OS_Mode_App_Registry
	 */
	private $app_registry;

	/**
	 * Widget registry.
	 *
	 * @var Admin_OS_Mode_Widget_Registry
	 */
	private $widget_registry;

	/**
	 * Theme registry.
	 *
	 * @var Admin_OS_Mode_Theme_Registry
	 */
	private $theme_registry;

	/**
	 * Wallpaper registry.
	 *
	 * @var Admin_OS_Mode_Wallpaper_Registry
	 */
	private $wallpaper_registry;

	/**
	 * Constructor.
	 *
	 * @param Admin_OS_Mode_Router           $router Router.
	 * @param Admin_OS_Mode_User_Preferences $preferences Preferences.
	 * @param Admin_OS_Mode_App_Registry     $app_registry App registry.
	 * @param Admin_OS_Mode_Widget_Registry  $widget_registry Widget registry.
	 * @param Admin_OS_Mode_Theme_Registry   $theme_registry Theme registry.
	 * @param Admin_OS_Mode_Wallpaper_Registry $wallpaper_registry Wallpaper registry.
	 */
	public function __construct(
		Admin_OS_Mode_Router $router,
		Admin_OS_Mode_User_Preferences $preferences,
		Admin_OS_Mode_App_Registry $app_registry,
		Admin_OS_Mode_Widget_Registry $widget_registry,
		Admin_OS_Mode_Theme_Registry $theme_registry,
		Admin_OS_Mode_Wallpaper_Registry $wallpaper_registry
	) {
		$this->router             = $router;
		$this->preferences        = $preferences;
		$this->app_registry       = $app_registry;
		$this->widget_registry    = $widget_registry;
		$this->theme_registry     = $theme_registry;
		$this->wallpaper_registry = $wallpaper_registry;
	}

	/**
	 * Enqueue shell assets.
	 *
	 * @param string $hook Current admin hook.
	 */
	public function enqueue( $hook ) {
		$is_shell  = 'toplevel_page_' . Admin_OS_Mode_Router::PAGE_SLUG === $hook;
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

		$apps    = $this->app_registry->get_apps();
		$folders = $this->app_registry->get_folders( $apps );
		$widgets = $this->widget_registry->get_widgets();
		$theme   = $this->theme_registry->get_current_theme( $this->preferences );

		foreach ( $theme['stylesheet_stack'] as $index => $stylesheet ) {
			$stylesheet_path = ADMIN_OS_MODE_DIR . 'assets/css/themes/' . $stylesheet;
			if ( ! file_exists( $stylesheet_path ) ) {
				continue;
			}

			$theme_asset = $this->get_theme_stylesheet_asset( $stylesheet, $use_dist );
			$style_handle = 'admin-os-mode-theme-' . $theme['id'] . '-' . (int) $index;
			wp_enqueue_style(
				$style_handle,
				ADMIN_OS_MODE_URL . $theme_asset,
				array( $style_dependency ),
				$this->get_asset_version( $theme_asset )
			);
			$style_dependency = $style_handle;
		}

		$config_handle = $use_dist ? $this->enqueue_dist_script() : $this->enqueue_core_scripts();

		wp_add_inline_script(
			$config_handle,
			'window.adminOSMode = ' . wp_json_encode( $this->get_runtime_config( $apps, $folders, $widgets, $theme ) ) . ';',
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

		return file_exists( ADMIN_OS_MODE_DIR . 'assets/dist/css/admin-os-mode-core.min.css' )
			&& file_exists( ADMIN_OS_MODE_DIR . 'assets/dist/js/admin-os-mode.min.js' );
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
				'admin-os-mode-core-admin-chrome',
				ADMIN_OS_MODE_URL . 'assets/css/core/admin-chrome.css',
				array( 'dashicons' ),
				$this->get_asset_version( 'assets/css/core/admin-chrome.css' )
			);

			return 'admin-os-mode-core-admin-chrome';
		}

		wp_enqueue_style(
			'admin-os-mode-core',
			ADMIN_OS_MODE_URL . 'assets/dist/css/admin-os-mode-core.min.css',
			array( 'dashicons' ),
			$this->get_asset_version( 'assets/dist/css/admin-os-mode-core.min.css' )
		);

		return 'admin-os-mode-core';
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
			if ( file_exists( ADMIN_OS_MODE_DIR . $dist_stylesheet ) ) {
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
			'admin-os-mode-app',
			ADMIN_OS_MODE_URL . 'assets/dist/js/admin-os-mode.min.js',
			array(),
			$this->get_asset_version( 'assets/dist/js/admin-os-mode.min.js' ),
			true
		);

		return 'admin-os-mode-app';
	}

	/**
	 * Enqueue readable core scripts in dependency order.
	 *
	 * @return string Script handle that should receive runtime config.
	 */
	private function enqueue_core_scripts() {
		$scripts = array(
			'admin-os-mode-config'         => array(
				'path' => 'assets/js/core/config.js',
				'deps' => array(),
			),
			'admin-os-mode-dom'            => array(
				'path' => 'assets/js/core/dom.js',
				'deps' => array( 'admin-os-mode-config' ),
			),
			'admin-os-mode-storage'        => array(
				'path' => 'assets/js/core/services/storage.js',
				'deps' => array( 'admin-os-mode-config' ),
			),
			'admin-os-mode-api-client'     => array(
				'path' => 'assets/js/core/services/api-client.js',
				'deps' => array( 'admin-os-mode-config' ),
			),
			'admin-os-mode-session-store'  => array(
				'path' => 'assets/js/core/session/session-store.js',
				'deps' => array( 'admin-os-mode-storage' ),
			),
			'admin-os-mode-reopen-policy'  => array(
				'path' => 'assets/js/core/session/reopen-policy.js',
				'deps' => array( 'admin-os-mode-session-store' ),
			),
			'admin-os-mode-appearance'     => array(
				'path' => 'assets/js/core/appearance.js',
				'deps' => array( 'admin-os-mode-config' ),
			),
			'admin-os-mode-wallpaper'      => array(
				'path' => 'assets/js/core/wallpaper.js',
				'deps' => array( 'admin-os-mode-config' ),
			),
			'admin-os-mode-window-factory' => array(
				'path' => 'assets/js/core/windows/window-factory.js',
				'deps' => array( 'admin-os-mode-dom' ),
			),
			'admin-os-mode-window-manager' => array(
				'path' => 'assets/js/core/windows/window-manager.js',
				'deps' => array( 'admin-os-mode-dom', 'admin-os-mode-session-store', 'admin-os-mode-window-factory' ),
			),
			'admin-os-mode-widget-manager' => array(
				'path' => 'assets/js/core/widgets/widget-manager.js',
				'deps' => array( 'admin-os-mode-dom', 'admin-os-mode-session-store' ),
			),
			'admin-os-mode-about-window'   => array(
				'path' => 'assets/js/core/apps/about-window.js',
				'deps' => array( 'admin-os-mode-dom' ),
			),
			'admin-os-mode-settings-app'   => array(
				'path' => 'assets/js/core/apps/settings-app.js',
				'deps' => array( 'admin-os-mode-dom', 'admin-os-mode-storage', 'admin-os-mode-api-client', 'admin-os-mode-appearance', 'admin-os-mode-wallpaper' ),
			),
			'admin-os-mode-app-launcher'   => array(
				'path' => 'assets/js/core/apps/app-launcher.js',
				'deps' => array( 'admin-os-mode-dom', 'admin-os-mode-about-window', 'admin-os-mode-settings-app' ),
			),
			'admin-os-mode-search'         => array(
				'path' => 'assets/js/core/shell/search.js',
				'deps' => array( 'admin-os-mode-config' ),
			),
			'admin-os-mode-shell-dialogs'  => array(
				'path' => 'assets/js/core/shell/dialogs.js',
				'deps' => array( 'admin-os-mode-dom' ),
			),
			'admin-os-mode-menu-commands'  => array(
				'path' => 'assets/js/core/shell/commands.js',
				'deps' => array( 'admin-os-mode-dom' ),
			),
			'admin-os-mode-menu-schema'    => array(
				'path' => 'assets/js/core/shell/menu-schema.js',
				'deps' => array( 'admin-os-mode-config' ),
			),
			'admin-os-mode-menu-renderer'  => array(
				'path' => 'assets/js/core/shell/menu-renderer.js',
				'deps' => array( 'admin-os-mode-dom' ),
			),
			'admin-os-mode-menu'           => array(
				'path' => 'assets/js/core/shell/menu.js',
				'deps' => array( 'admin-os-mode-config', 'admin-os-mode-menu-commands', 'admin-os-mode-menu-schema', 'admin-os-mode-menu-renderer' ),
			),
			'admin-os-mode-context-menu'   => array(
				'path' => 'assets/js/core/shell/context-menu.js',
				'deps' => array( 'admin-os-mode-config', 'admin-os-mode-menu-commands', 'admin-os-mode-menu-schema', 'admin-os-mode-menu-renderer' ),
			),
			'admin-os-mode-clock'          => array(
				'path' => 'assets/js/core/shell/clock.js',
				'deps' => array( 'admin-os-mode-config' ),
			),
			'admin-os-mode-boot'           => array(
				'path' => 'assets/js/core/boot.js',
				'deps' => array( 'admin-os-mode-appearance', 'admin-os-mode-wallpaper', 'admin-os-mode-reopen-policy', 'admin-os-mode-window-manager', 'admin-os-mode-widget-manager', 'admin-os-mode-app-launcher', 'admin-os-mode-search', 'admin-os-mode-shell-dialogs', 'admin-os-mode-menu', 'admin-os-mode-context-menu', 'admin-os-mode-clock' ),
			),
		);

		foreach ( $scripts as $handle => $script ) {
			wp_enqueue_script(
				$handle,
				ADMIN_OS_MODE_URL . $script['path'],
				$script['deps'],
				$this->get_asset_version( $script['path'] ),
				true
			);
		}

		return 'admin-os-mode-config';
	}

	/**
	 * Runtime data passed from WordPress into the shell.
	 *
	 * @param array<int,array<string,mixed>> $apps Apps.
	 * @param array<int,array<string,mixed>> $folders Folders.
	 * @param array<int,array<string,mixed>> $widgets Widgets.
	 * @param array<string,mixed>            $theme Current theme.
	 * @return array<string,mixed>
	 */
	private function get_runtime_config( $apps, $folders, $widgets, $theme ) {
		$current_user = wp_get_current_user();
		$role_label   = $this->get_user_role_label( $current_user );

		return array(
			'appearance' => $this->preferences->get_appearance(),
			'apps'       => $apps,
			'ajaxUrl'    => admin_url( 'admin-ajax.php' ),
			'classicUrl' => $this->router->get_toggle_url( false ),
			'shellUrl'   => $this->router->get_shell_url(),
			'siteName'   => get_bloginfo( 'name' ),
			'system'     => $this->get_system_config(),
			'themes'     => $this->theme_registry->get_selectable_themes(),
			'wallpaper'  => $this->wallpaper_registry->get_client_config( $theme, $this->preferences ),
			'userId'     => get_current_user_id(),
			'user'       => array(
				'avatar'     => get_avatar_url( $current_user->ID, array( 'size' => 192 ) ),
				'email'      => $current_user->user_email,
				'name'       => $current_user->display_name ? $current_user->display_name : $current_user->user_login,
				'profileUrl' => admin_url( 'profile.php' ),
				'role'       => $role_label,
				'subtitle'   => $role_label,
			),
			'storageKey' => 'adminOSMode:' . get_current_user_id() . ':' . $theme['id'] . ':session',
			'nonce'      => wp_create_nonce( Admin_OS_Mode_Settings_Controller::NONCE_ACTION ),
			'folders'    => $folders,
			'menu'       => $this->get_menu_config(),
			'theme'      => $theme,
			'widgets'    => $widgets,
		);
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
			return __( 'WordPress User', 'admin-os-mode' );
		}

		$role       = sanitize_key( $roles[0] );
		$role_names = wp_roles()->role_names;

		if ( '' === $role ) {
			return __( 'WordPress User', 'admin-os-mode' );
		}

		if ( isset( $role_names[ $role ] ) ) {
			return translate_user_role( $role_names[ $role ] );
		}

		return ucwords( str_replace( '_', ' ', $role ) );
	}

	/**
	 * Runtime data for the Admin OS system identity.
	 *
	 * @return array<string,mixed>
	 */
	private function get_system_config() {
		$current_user = wp_get_current_user();
		$user_label   = $current_user->display_name ? $current_user->display_name : $current_user->user_login;

		return array(
			'about' => array(
				'name'      => __( 'Admin OS', 'admin-os-mode' ),
				'version'   => sprintf(
					/* translators: %s: plugin version. */
					__( 'Version %s', 'admin-os-mode' ),
					ADMIN_OS_MODE_VERSION
				),
				'copyright' => __( 'Licensed under GPLv2 or later.', 'admin-os-mode' ),
				'rights'    => __( 'Built for WordPress admin.', 'admin-os-mode' ),
				'icon'      => array(
					'type'     => 'theme',
					'name'     => 'os-settings.svg',
					'fallback' => 'dashicons-admin-generic',
				),
			),
			'actions' => array(
				'restart'       => array(
					'title'                => __( 'Are you sure you want to restart Admin OS?', 'admin-os-mode' ),
					/* translators: {seconds}: seconds remaining before Admin OS restarts automatically. */
					'message'              => __( 'If you do nothing, Admin OS will restart automatically in {seconds} seconds.', 'admin-os-mode' ),
					'confirmLabel'         => __( 'Restart', 'admin-os-mode' ),
					'cancelLabel'          => __( 'Cancel', 'admin-os-mode' ),
					'reopenWindowsLabel'   => __( 'Reopen windows after restarting', 'admin-os-mode' ),
					'reopenWindowsDefault' => false,
					'countdownSeconds'     => 60,
					'icon'                 => 'power',
					'overlayMessage'       => __( 'Restarting Admin OS...', 'admin-os-mode' ),
				),
				'switchClassic' => array(
					'title'                => __( 'Are you sure you want to switch to Classic Admin?', 'admin-os-mode' ),
					/* translators: {seconds}: seconds remaining before Classic Admin opens automatically. */
					'message'              => __( 'If you do nothing, Classic Admin will open automatically in {seconds} seconds.', 'admin-os-mode' ),
					'confirmLabel'         => __( 'Switch', 'admin-os-mode' ),
					'cancelLabel'          => __( 'Cancel', 'admin-os-mode' ),
					'reopenWindowsLabel'   => __( 'Reopen windows when returning to Admin OS', 'admin-os-mode' ),
					'reopenWindowsDefault' => false,
					'countdownSeconds'     => 60,
					'icon'                 => 'dashicons-admin-site-alt3',
					'overlayMessage'       => __( 'Switching to Classic Admin...', 'admin-os-mode' ),
				),
				'logout'        => array(
					'title'                => sprintf(
						/* translators: %s: current user display name. */
						__( 'Are you sure you want to log out %s?', 'admin-os-mode' ),
						$user_label
					),
					/* translators: {seconds}: seconds remaining before the user is logged out automatically. */
					'message'              => __( 'If you do nothing, you will be logged out automatically in {seconds} seconds.', 'admin-os-mode' ),
					'confirmLabel'         => __( 'Log Out', 'admin-os-mode' ),
					'cancelLabel'          => __( 'Cancel', 'admin-os-mode' ),
					'reopenWindowsLabel'   => __( 'Reopen windows when logging back in', 'admin-os-mode' ),
					'reopenWindowsDefault' => false,
					'countdownSeconds'     => 60,
					'icon'                 => 'power',
					'overlayMessage'       => __( 'Logging out...', 'admin-os-mode' ),
				),
			),
		);
	}

	/**
	 * Localized menu defaults for the active-app menu bar.
	 *
	 * @return array<string,mixed>
	 */
	private function get_menu_config() {
		$current_user = wp_get_current_user();
		$user_label   = $current_user->display_name ? $current_user->display_name : $current_user->user_login;

		return array(
			'system'     => array(
				'groups' => array(
					array(
						'id'    => 'system',
						'label' => __( 'Admin OS', 'admin-os-mode' ),
						'items' => array(
							array(
								'label'   => __( 'About Admin OS', 'admin-os-mode' ),
								'command' => 'open-system-about',
								'icon'    => 'dashicons-info-outline',
							),
							array(
								'label'   => __( 'OS Settings...', 'admin-os-mode' ),
								'command' => 'open-app',
								'target'  => 'os-settings',
								'icon'    => 'dashicons-admin-customizer',
							),
							array(
								'label'   => __( 'WordPress Updates...', 'admin-os-mode' ),
								'command' => 'open-url',
								'url'     => admin_url( 'update-core.php' ),
								'title'   => __( 'WordPress Updates', 'admin-os-mode' ),
								'icon'    => 'dashicons-update',
							),
							array(
								'type' => 'separator',
							),
							array(
								'label'    => __( 'Recent Items', 'admin-os-mode' ),
								'disabled' => true,
								'icon'     => 'dashicons-backup',
								'shortcut' => '>',
							),
							array(
								'type' => 'separator',
							),
							array(
								'id'      => 'close-active-window',
								'label'   => __( 'Close Active App', 'admin-os-mode' ),
								'command' => 'window.close',
								'icon'    => 'dashicons-dismiss',
							),
							array(
								'type' => 'separator',
							),
							array(
								'label'   => __( 'Restart Admin OS...', 'admin-os-mode' ),
								'command' => 'shell.restart',
								'icon'    => 'dashicons-update',
							),
							array(
								'label'   => __( 'Switch to Classic Admin...', 'admin-os-mode' ),
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
									__( 'Log Out %s...', 'admin-os-mode' ),
									$user_label
								),
								'command' => 'user.logout',
								'url'     => wp_logout_url(),
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
								'label'   => __( 'Dashboard', 'admin-os-mode' ),
								'command' => 'open-app',
								'target'  => 'dashboard',
							),
							array(
								'label'   => __( 'Visit Site', 'admin-os-mode' ),
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
						'label' => __( 'File', 'admin-os-mode' ),
						'items' => array(),
					),
					array(
						'id'    => 'edit',
						'label' => __( 'Edit', 'admin-os-mode' ),
						'items' => array(),
					),
					array(
						'id'    => 'view',
						'label' => __( 'View', 'admin-os-mode' ),
						'items' => array(),
					),
					array(
						'id'    => 'go',
						'label' => __( 'Go', 'admin-os-mode' ),
						'items' => array(),
					),
					array(
						'id'    => 'window',
						'label' => __( 'Window', 'admin-os-mode' ),
						'items' => array(),
					),
					array(
						'id'    => 'help',
						'label' => __( 'Help', 'admin-os-mode' ),
						'items' => array(),
					),
				),
			),
			'labels'     => array(
				'site'          => get_bloginfo( 'name' ),
				'file'          => __( 'File', 'admin-os-mode' ),
				'edit'          => __( 'Edit', 'admin-os-mode' ),
				'view'          => __( 'View', 'admin-os-mode' ),
				'go'            => __( 'Go', 'admin-os-mode' ),
				'window'        => __( 'Window', 'admin-os-mode' ),
				'help'          => __( 'Help', 'admin-os-mode' ),
				'admin'         => __( 'Admin', 'admin-os-mode' ),
				'folder_suffix' => __( 'Folder', 'admin-os-mode' ),
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
			'admin-os-mode-core-admin-chrome' => 'assets/css/core/admin-chrome.css',
		);

		if ( $include_shell ) {
			$core_styles = array_merge(
				$core_styles,
				array(
					'admin-os-mode-core-shell'      => 'assets/css/core/shell.css',
					'admin-os-mode-core-dialogs'    => 'assets/css/core/dialogs.css',
					'admin-os-mode-core-context'    => 'assets/css/core/context-menu.css',
					'admin-os-mode-core-desktop'    => 'assets/css/core/desktop.css',
					'admin-os-mode-core-widgets'    => 'assets/css/core/widgets.css',
					'admin-os-mode-core-windows'    => 'assets/css/core/windows.css',
					'admin-os-mode-core-apps'       => 'assets/css/core/apps.css',
					'admin-os-mode-core-dock'       => 'assets/css/core/dock.css',
					'admin-os-mode-core-responsive' => 'assets/css/core/responsive.css',
				)
			);
		}

		$dependency = 'dashicons';
		foreach ( $core_styles as $handle => $path ) {
			wp_enqueue_style(
				$handle,
				ADMIN_OS_MODE_URL . $path,
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
			$classes .= ' admin-os-mode-shell';
		}

		if ( $this->router->is_iframe_request() ) {
			$classes .= ' admin-os-mode-iframe';
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
		$file = ADMIN_OS_MODE_DIR . ltrim( $path, '/' );

		if ( file_exists( $file ) ) {
			return ADMIN_OS_MODE_VERSION . '-' . filemtime( $file );
		}

		return ADMIN_OS_MODE_VERSION;
	}
}
