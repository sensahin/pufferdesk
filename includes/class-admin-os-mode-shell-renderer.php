<?php
/**
 * Shell renderer.
 *
 * @package AdminOSMode
 */

defined( 'ABSPATH' ) || exit;

/**
 * Collects shell data and renders templates.
 */
final class Admin_OS_Mode_Shell_Renderer {
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
	 * Dashboard data.
	 *
	 * @var Admin_OS_Mode_Dashboard_Data
	 */
	private $dashboard_data;

	/**
	 * Current resolved theme during a render pass.
	 *
	 * @var array<string,mixed>|null
	 */
	private $current_theme = null;

	/**
	 * Constructor.
	 *
	 * @param Admin_OS_Mode_Router           $router Router.
	 * @param Admin_OS_Mode_User_Preferences $preferences Preferences.
	 * @param Admin_OS_Mode_App_Registry     $app_registry App registry.
	 * @param Admin_OS_Mode_Widget_Registry  $widget_registry Widget registry.
	 * @param Admin_OS_Mode_Theme_Registry   $theme_registry Theme registry.
	 * @param Admin_OS_Mode_Dashboard_Data   $dashboard_data Dashboard data.
	 */
	public function __construct(
		Admin_OS_Mode_Router $router,
		Admin_OS_Mode_User_Preferences $preferences,
		Admin_OS_Mode_App_Registry $app_registry,
		Admin_OS_Mode_Widget_Registry $widget_registry,
		Admin_OS_Mode_Theme_Registry $theme_registry,
		Admin_OS_Mode_Dashboard_Data $dashboard_data
	) {
		$this->router          = $router;
		$this->preferences     = $preferences;
		$this->app_registry    = $app_registry;
		$this->widget_registry = $widget_registry;
		$this->theme_registry  = $theme_registry;
		$this->dashboard_data  = $dashboard_data;
	}

	/**
	 * Render the OS shell page.
	 */
	public function render() {
		if ( ! current_user_can( 'read' ) ) {
			wp_die( esc_html__( 'You do not have permission to use Admin OS Mode.', 'admin-os-mode' ) );
		}

		$apps    = $this->app_registry->get_apps();
		$widgets = $this->widget_registry->get_widgets();
		$folders = $this->app_registry->get_folders( $apps );
		$theme   = $this->theme_registry->get_current_theme( $this->preferences );
		$this->current_theme = $theme;

		$this->render_template(
			'shell/shell.php',
			array(
				'apps'         => $apps,
				'widgets'      => $widgets,
				'folders'      => $folders,
				'stats'        => $this->dashboard_data->get_stats(),
				'recents'      => $this->dashboard_data->get_recent_content(),
				'classic_once' => admin_url( 'index.php?admin_os_classic=1' ),
				'site_name'    => get_bloginfo( 'name' ),
				'theme'        => $theme,
			)
		);
	}

	/**
	 * Render a reusable template part.
	 *
	 * @param string              $template Template path relative to templates/.
	 * @param array<string,mixed> $data Template data.
	 */
	public function render_part( $template, $data = array() ) {
		$this->render_template( $template, $data );
	}

	/**
	 * Check whether a template can resolve for the active theme.
	 *
	 * @param string                    $template Template path relative to templates/.
	 * @param array<string,mixed>|mixed $theme Theme data.
	 * @return bool
	 */
	public function template_exists( $template, $theme = null ) {
		$template = $this->normalize_template_path( $template );
		if ( '' === $template ) {
			return false;
		}

		if ( null === $theme && is_array( $this->current_theme ) ) {
			$theme = $this->current_theme;
		}

		return file_exists( $this->resolve_template_path( $template, $theme ) );
	}

	/**
	 * Include a template with scoped data.
	 *
	 * @param string              $template Template path relative to templates/.
	 * @param array<string,mixed> $data Template data.
	 */
	private function render_template( $template, $data ) {
		$template = $this->normalize_template_path( $template );
		if ( '' === $template ) {
			return;
		}

		if ( ! isset( $data['theme'] ) && is_array( $this->current_theme ) ) {
			$data['theme'] = $this->current_theme;
		}

		$path = $this->resolve_template_path( $template, isset( $data['theme'] ) ? $data['theme'] : null );
		if ( ! file_exists( $path ) ) {
			return;
		}

		extract( $data, EXTR_SKIP );
		include $path;
	}

	/**
	 * Resolve a template path with theme and family overrides.
	 *
	 * Resolution order:
	 * 1. templates/themes/{theme_id}/{template}
	 * 2. templates/themes/{family}/{template}
	 * 3. templates/{template}
	 *
	 * @param string                    $template Template path.
	 * @param array<string,mixed>|mixed $theme Current theme.
	 * @return string
	 */
	private function resolve_template_path( $template, $theme ) {
		$candidates = array();

		if ( is_array( $theme ) ) {
			if ( ! empty( $theme['id'] ) ) {
				$candidates[] = ADMIN_OS_MODE_DIR . 'templates/themes/' . sanitize_key( $theme['id'] ) . '/' . $template;
			}

			if ( ! empty( $theme['family'] ) ) {
				$candidates[] = ADMIN_OS_MODE_DIR . 'templates/themes/' . sanitize_key( $theme['family'] ) . '/' . $template;
			}
		}

		$candidates[] = ADMIN_OS_MODE_DIR . 'templates/' . $template;

		foreach ( $candidates as $candidate ) {
			if ( file_exists( $candidate ) ) {
				return $candidate;
			}
		}

		return ADMIN_OS_MODE_DIR . 'templates/' . $template;
	}

	/**
	 * Sanitize a relative template path while preserving semantic folders.
	 *
	 * @param string $template Template path.
	 * @return string
	 */
	private function normalize_template_path( $template ) {
		$template = str_replace( '\\', '/', (string) $template );
		$template = ltrim( $template, '/' );
		$parts    = array_filter( explode( '/', $template ) );

		$normalized = array();
		foreach ( $parts as $part ) {
			if ( '.' === $part || '..' === $part ) {
				continue;
			}

			$part = sanitize_file_name( $part );
			if ( '' !== $part ) {
				$normalized[] = $part;
			}
		}

		return implode( '/', $normalized );
	}
}
