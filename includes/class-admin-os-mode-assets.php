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
	 * Theme registry.
	 *
	 * @var Admin_OS_Mode_Theme_Registry
	 */
	private $theme_registry;

	/**
	 * Constructor.
	 *
	 * @param Admin_OS_Mode_Router           $router Router.
	 * @param Admin_OS_Mode_User_Preferences $preferences Preferences.
	 * @param Admin_OS_Mode_App_Registry     $app_registry App registry.
	 * @param Admin_OS_Mode_Theme_Registry   $theme_registry Theme registry.
	 */
	public function __construct(
		Admin_OS_Mode_Router $router,
		Admin_OS_Mode_User_Preferences $preferences,
		Admin_OS_Mode_App_Registry $app_registry,
		Admin_OS_Mode_Theme_Registry $theme_registry
	) {
		$this->router         = $router;
		$this->preferences    = $preferences;
		$this->app_registry   = $app_registry;
		$this->theme_registry = $theme_registry;
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

		$apps  = $this->app_registry->get_apps();
		$theme = $this->theme_registry->get_current_theme( $this->preferences );

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
				ADMIN_OS_MODE_VERSION
			);
			$style_dependency = $style_handle;
		}

		$config_handle = $use_dist ? $this->enqueue_dist_script() : $this->enqueue_core_scripts();

		wp_add_inline_script(
			$config_handle,
			'window.adminOSMode = ' . wp_json_encode( $this->get_runtime_config( $apps, $theme ) ) . ';',
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
				ADMIN_OS_MODE_VERSION
			);

			return 'admin-os-mode-core-admin-chrome';
		}

		wp_enqueue_style(
			'admin-os-mode-core',
			ADMIN_OS_MODE_URL . 'assets/dist/css/admin-os-mode-core.min.css',
			array( 'dashicons' ),
			ADMIN_OS_MODE_VERSION
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
			ADMIN_OS_MODE_VERSION,
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
				'path' => 'assets/js/core/windows/session-store.js',
				'deps' => array( 'admin-os-mode-storage' ),
			),
			'admin-os-mode-window-factory' => array(
				'path' => 'assets/js/core/windows/window-factory.js',
				'deps' => array( 'admin-os-mode-dom' ),
			),
			'admin-os-mode-window-manager' => array(
				'path' => 'assets/js/core/windows/window-manager.js',
				'deps' => array( 'admin-os-mode-dom', 'admin-os-mode-session-store', 'admin-os-mode-window-factory' ),
			),
			'admin-os-mode-settings-app'   => array(
				'path' => 'assets/js/core/apps/settings-app.js',
				'deps' => array( 'admin-os-mode-dom', 'admin-os-mode-storage', 'admin-os-mode-api-client' ),
			),
			'admin-os-mode-app-launcher'   => array(
				'path' => 'assets/js/core/apps/app-launcher.js',
				'deps' => array( 'admin-os-mode-dom', 'admin-os-mode-settings-app' ),
			),
			'admin-os-mode-search'         => array(
				'path' => 'assets/js/core/shell/search.js',
				'deps' => array( 'admin-os-mode-config' ),
			),
			'admin-os-mode-clock'          => array(
				'path' => 'assets/js/core/shell/clock.js',
				'deps' => array( 'admin-os-mode-config' ),
			),
			'admin-os-mode-boot'           => array(
				'path' => 'assets/js/core/boot.js',
				'deps' => array( 'admin-os-mode-window-manager', 'admin-os-mode-app-launcher', 'admin-os-mode-search', 'admin-os-mode-clock' ),
			),
		);

		foreach ( $scripts as $handle => $script ) {
			wp_enqueue_script(
				$handle,
				ADMIN_OS_MODE_URL . $script['path'],
				$script['deps'],
				ADMIN_OS_MODE_VERSION,
				true
			);
		}

		return 'admin-os-mode-config';
	}

	/**
	 * Runtime data passed from WordPress into the shell.
	 *
	 * @param array<int,array<string,mixed>> $apps Apps.
	 * @param array<string,mixed>            $theme Current theme.
	 * @return array<string,mixed>
	 */
	private function get_runtime_config( $apps, $theme ) {
		return array(
			'apps'       => $apps,
			'ajaxUrl'    => admin_url( 'admin-ajax.php' ),
			'classicUrl' => $this->router->get_toggle_url( false ),
			'shellUrl'   => $this->router->get_shell_url(),
			'siteName'   => get_bloginfo( 'name' ),
			'themes'     => $this->theme_registry->get_selectable_themes(),
			'userId'     => get_current_user_id(),
			'storageKey' => 'adminOSMode:' . get_current_user_id() . ':' . $theme['id'] . ':session',
			'nonce'      => wp_create_nonce( Admin_OS_Mode_Settings_Controller::NONCE_ACTION ),
			'theme'      => $theme,
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
					'admin-os-mode-core-desktop'    => 'assets/css/core/desktop.css',
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
				ADMIN_OS_MODE_VERSION
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
	 * Remove the admin top offset inside embedded iframe apps.
	 */
	public function print_iframe_head_style() {
		if ( ! $this->router->is_iframe_request() ) {
			return;
		}

		echo '<style>html.wp-toolbar{padding-top:0!important;}</style>';
	}
}
