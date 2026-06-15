<?php
/**
 * Asset loading and admin chrome classes.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Enqueues core behavior and selected theme assets.
 */
final class PufferDesk_Assets {
	/**
	 * Router.
	 *
	 * @var PufferDesk_Router
	 */
	private $router;

	/**
	 * Shell context builder.
	 *
	 * @var PufferDesk_Shell_Context
	 */
	private $shell_context;

	/**
	 * Runtime config builder.
	 *
	 * @var PufferDesk_Runtime_Config
	 */
	private $runtime_config;

	/**
	 * Asset manifest.
	 *
	 * @var PufferDesk_Asset_Manifest
	 */
	private $asset_manifest;

	/**
	 * Constructor.
	 *
	 * @param PufferDesk_Router         $router Router.
	 * @param PufferDesk_Shell_Context  $shell_context Shell context builder.
	 * @param PufferDesk_Runtime_Config $runtime_config Runtime config builder.
	 * @param PufferDesk_Asset_Manifest $asset_manifest Asset manifest.
	 */
	public function __construct(
		PufferDesk_Router $router,
		PufferDesk_Shell_Context $shell_context,
		PufferDesk_Runtime_Config $runtime_config,
		PufferDesk_Asset_Manifest $asset_manifest
	) {
		$this->router         = $router;
		$this->shell_context  = $shell_context;
		$this->runtime_config = $runtime_config;
		$this->asset_manifest = $asset_manifest;
	}

	/**
	 * Enqueue shell assets.
	 *
	 * @param string $hook Current admin hook.
	 */
	public function enqueue( $hook ) {
		$is_shell  = 'toplevel_page_' . PufferDesk_Router::PAGE_SLUG === $hook;
		$is_iframe = $this->router->is_iframe_request();
		$use_dist  = $this->should_use_dist_assets();

		if ( ! $is_shell && ! $is_iframe ) {
			return;
		}

			$style_dependency = $use_dist
				? $this->enqueue_dist_core_styles( $is_shell )
				: $this->enqueue_core_styles( $is_shell );
			$this->add_admin_chrome_inline_style( $style_dependency );

			if ( $is_iframe ) {
				$this->enqueue_iframe_script();
		}

		if ( ! $is_shell ) {
			return;
		}

		if ( current_user_can( 'upload_files' ) ) {
			wp_enqueue_media();
		}

		$context = $this->shell_context->get();
		$theme   = isset( $context['theme'] ) && is_array( $context['theme'] ) ? $context['theme'] : array();

		foreach ( isset( $theme['stylesheet_stack'] ) && is_array( $theme['stylesheet_stack'] ) ? $theme['stylesheet_stack'] : array() as $index => $stylesheet ) {
			$theme_asset = $this->get_theme_stylesheet_asset( $stylesheet, $use_dist );
			if ( ! file_exists( PUFFERDESK_DIR . $theme_asset ) ) {
				continue;
			}

			$style_handle = 'pufferdesk-theme-' . ( isset( $theme['id'] ) ? sanitize_key( $theme['id'] ) : 'current' ) . '-' . (int) $index;
			wp_enqueue_style(
				$style_handle,
				PUFFERDESK_URL . $theme_asset,
				array( $style_dependency ),
				$this->get_asset_version( $theme_asset )
				);
				$style_dependency = $style_handle;
			}
			$this->add_theme_mode_inline_styles( $style_dependency, $theme, $context );

			$config_handle = $use_dist ? $this->enqueue_dist_script() : $this->enqueue_core_scripts();

		wp_add_inline_script(
			$config_handle,
			'window.pufferDesk = ' . wp_json_encode( $this->runtime_config->get( $context ) ) . ';',
			'before'
		);
	}

	/**
	 * Whether release assets should be used.
	 *
	 * @return bool
	 */
	private function should_use_dist_assets() {
		$dist_available = file_exists( PUFFERDESK_DIR . $this->asset_manifest->get_dist_core_css() )
			&& file_exists( PUFFERDESK_DIR . $this->asset_manifest->get_dist_script() );

		if ( ! $dist_available ) {
			return false;
		}

		if ( defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG && $this->source_assets_available() ) {
			return false;
		}

		return true;
	}

	/**
	 * Whether readable source assets are available in this install.
	 *
	 * Release zips may ship only compiled assets and link to source files from readme.txt.
	 *
	 * @return bool
	 */
	private function source_assets_available() {
		$core_styles  = $this->asset_manifest->get_core_styles( true );
		$core_scripts = $this->asset_manifest->get_core_scripts();
		$first_style  = ! empty( $core_styles[0]['path'] ) ? $core_styles[0]['path'] : 'assets/css/core/admin-chrome.css';
		$first_script = ! empty( $core_scripts[0]['path'] ) ? $core_scripts[0]['path'] : 'assets/js/core/config.js';

		return file_exists( PUFFERDESK_DIR . $first_style ) && file_exists( PUFFERDESK_DIR . $first_script );
	}

	/**
	 * Enqueue the built core CSS asset.
	 *
	 * @param bool $include_shell Whether shell component CSS is needed.
	 * @return string Last enqueued style handle.
	 */
	private function enqueue_dist_core_styles( $include_shell ) {
		if ( ! $include_shell ) {
			$admin_chrome      = $this->asset_manifest->get_admin_chrome_style();
			$admin_chrome_dist = $this->asset_manifest->get_dist_admin_chrome_css();
			$path              = file_exists( PUFFERDESK_DIR . $admin_chrome_dist ) ? $admin_chrome_dist : $admin_chrome['path'];
			wp_enqueue_style(
				$admin_chrome['handle'],
				PUFFERDESK_URL . $path,
				array( 'dashicons' ),
				$this->get_asset_version( $path )
			);

			return $admin_chrome['handle'];
		}

		$core_css = $this->asset_manifest->get_dist_core_css();
		wp_enqueue_style(
			'pufferdesk-core',
			PUFFERDESK_URL . $core_css,
			array( 'dashicons' ),
			$this->get_asset_version( $core_css )
		);

		return 'pufferdesk-core';
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
			if ( file_exists( PUFFERDESK_DIR . $dist_stylesheet ) ) {
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
		$script = $this->asset_manifest->get_dist_script();
		wp_enqueue_script(
			'pufferdesk-app',
			PUFFERDESK_URL . $script,
			array(),
			$this->get_asset_version( $script ),
			true
		);

		return 'pufferdesk-app';
	}

	/**
	 * Enqueue readable core scripts in dependency order.
	 *
	 * @return string Script handle that should receive runtime config.
	 */
	private function enqueue_core_scripts() {
		foreach ( $this->asset_manifest->get_core_scripts() as $script ) {
			wp_enqueue_script(
				$script['handle'],
				PUFFERDESK_URL . $script['path'],
				$script['deps'],
				$this->get_asset_version( $script['path'] ),
				true
			);
		}

		return $this->asset_manifest->get_config_script_handle();
	}

	/**
	 * Enqueue sticky iframe-mode helpers for embedded admin screens.
	 */
	private function enqueue_iframe_script() {
		$handle = 'pufferdesk-admin-iframe';
		$dist   = $this->asset_manifest->get_dist_iframe_script();
		$source = 'assets/js/core/admin-iframe.js';
		$path   = file_exists( PUFFERDESK_DIR . $dist ) ? $dist : $source;

		wp_enqueue_script(
			$handle,
			PUFFERDESK_URL . $path,
			array(),
			$this->get_asset_version( $path ),
			true
		);

		wp_add_inline_script(
			$handle,
			'window.pufferDeskIframe = ' . wp_json_encode(
				array(
					'adminBase'  => admin_url(),
					'queryKey'   => PufferDesk_Router::QUERY_IFRAME,
					'queryValue' => PufferDesk_Router::QUERY_TRUE_VALUE,
				)
			) . ';',
			'before'
		);
	}

	/**
	 * Enqueue semantic core styles in cascade order.
	 *
	 * @param bool $include_shell Whether shell component CSS is needed.
	 * @return string Last enqueued style handle.
	 */
	private function enqueue_core_styles( $include_shell ) {
		$dependency = 'dashicons';
		foreach ( $this->asset_manifest->get_core_styles( $include_shell ) as $style ) {
			wp_enqueue_style(
				$style['handle'],
				PUFFERDESK_URL . $style['path'],
				array( $dependency ),
				$this->get_asset_version( $style['path'] )
			);
			$dependency = $style['handle'];
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
			$classes .= ' pufferdesk-shell';
		}

		if ( $this->router->is_iframe_request() ) {
			$classes .= ' pufferdesk-iframe';
		}

		return $classes;
	}

	/**
	 * Remove the admin top offset inside shell and embedded iframe apps.
	 *
	 * @param string $style_handle Style handle receiving the inline rule.
	 */
	private function add_admin_chrome_inline_style( $style_handle ) {
		if ( '' === $style_handle ) {
			return;
		}

		wp_add_inline_style( $style_handle, 'html.wp-toolbar{padding-top:0!important;}' );
	}

	/**
	 * Add active appearance-mode token rules after the final theme stylesheet.
	 *
	 * @param string              $style_handle Style handle receiving the inline rules.
	 * @param array<string,mixed> $theme Current resolved theme.
	 * @param array<string,mixed> $context Current shell context.
	 */
	private function add_theme_mode_inline_styles( $style_handle, $theme, $context ) {
		if ( '' === $style_handle ) {
			return;
		}

		$token_styles = PufferDesk_Theme_Token_Renderer::get_shell_styles(
			$theme,
			isset( $context['wallpaper'] ) && is_array( $context['wallpaper'] ) ? $context['wallpaper'] : array(),
			isset( $context['desktop_dock'] ) && is_array( $context['desktop_dock'] ) ? $context['desktop_dock'] : array()
		);
		$mode_rules   = isset( $token_styles['mode_rules'] ) && is_array( $token_styles['mode_rules'] ) ? $token_styles['mode_rules'] : array();

		if ( empty( $mode_rules ) ) {
			return;
		}

		wp_add_inline_style( $style_handle, implode( "\n", $mode_rules ) );
	}

	/**
	 * Build a cache-busting asset version for edited source and dist files.
	 *
	 * @param string $path Asset path relative to the plugin root.
	 * @return string
	 */
	private function get_asset_version( $path ) {
		$file = PUFFERDESK_DIR . ltrim( $path, '/' );

		if ( file_exists( $file ) ) {
			return PUFFERDESK_VERSION . '-' . filemtime( $file );
		}

		return PUFFERDESK_VERSION;
	}
}
