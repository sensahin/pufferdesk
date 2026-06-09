<?php
/**
 * Shell renderer.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Collects shell data and renders templates.
 */
final class PufferDesk_Shell_Renderer {
	/**
	 * Router.
	 *
	 * @var PufferDesk_Router
	 */
	private $router;

	/**
	 * Preferences.
	 *
	 * @var PufferDesk_User_Preferences
	 */
	private $preferences;

	/**
	 * App registry.
	 *
	 * @var PufferDesk_App_Registry
	 */
	private $app_registry;

	/**
	 * Widget registry.
	 *
	 * @var PufferDesk_Widget_Registry
	 */
	private $widget_registry;

	/**
	 * Theme registry.
	 *
	 * @var PufferDesk_Theme_Registry
	 */
	private $theme_registry;

	/**
	 * Wallpaper registry.
	 *
	 * @var PufferDesk_Wallpaper_Registry
	 */
	private $wallpaper_registry;

	/**
	 * Workspace state service.
	 *
	 * @var PufferDesk_Workspace_State
	 */
	private $workspace_state;

	/**
	 * Current resolved theme during a render pass.
	 *
	 * @var array<string,mixed>|null
	 */
	private $current_theme = null;

	/**
	 * Constructor.
	 *
	 * @param PufferDesk_Router           $router Router.
	 * @param PufferDesk_User_Preferences $preferences Preferences.
	 * @param PufferDesk_App_Registry     $app_registry App registry.
	 * @param PufferDesk_Widget_Registry  $widget_registry Widget registry.
	 * @param PufferDesk_Theme_Registry   $theme_registry Theme registry.
	 * @param PufferDesk_Wallpaper_Registry $wallpaper_registry Wallpaper registry.
	 * @param PufferDesk_Workspace_State    $workspace_state Workspace state service.
	 */
	public function __construct(
		PufferDesk_Router $router,
		PufferDesk_User_Preferences $preferences,
		PufferDesk_App_Registry $app_registry,
		PufferDesk_Widget_Registry $widget_registry,
		PufferDesk_Theme_Registry $theme_registry,
		PufferDesk_Wallpaper_Registry $wallpaper_registry,
		PufferDesk_Workspace_State $workspace_state
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
	 * Render the OS shell page.
	 */
	public function render() {
		if ( ! current_user_can( 'read' ) ) {
			wp_die( esc_html__( 'You do not have permission to use PufferDesk.', 'pufferdesk-admin-desktop' ) );
		}

		$theme             = $this->theme_registry->get_current_theme( $this->preferences );
		$apps              = $this->theme_registry->apply_app_labels( $this->app_registry->get_apps(), $theme );
		$app_locations     = $this->preferences->get_effective_app_locations( $apps, $theme );
		$dock_apps         = $this->preferences->filter_apps_for_surface( $apps, $app_locations, 'dock', $theme );
		$desktop_apps      = $this->preferences->filter_apps_for_surface( $apps, $app_locations, 'desktop', $theme );
		$widgets           = $this->widget_registry->get_widgets();
		$folders           = $this->app_registry->get_folders( $apps );
		$desktop_folders   = $this->preferences->get_desktop_folders( $apps );
		$workspace_folders = array_merge( $folders, $desktop_folders );
		$appearance        = $this->preferences->get_appearance();
		$desktop_dock      = $this->preferences->get_desktop_dock();
		$menu_bar          = $this->preferences->get_menu_bar();
		$wallpaper         = $this->wallpaper_registry->get_client_config( $theme, $this->preferences );
		$workspace_state   = $this->workspace_state->get_state( $theme['id'], $apps, $widgets, $workspace_folders );
		$dock_apps         = $this->workspace_state->order_apps_for_dock( $dock_apps, $workspace_state );
		$this->current_theme = $theme;

		$this->render_template(
			'shell/shell.php',
			array(
				'appearance'      => $appearance,
				'apps'            => $apps,
				'desktop_apps'    => $desktop_apps,
				'desktop_dock'    => $desktop_dock,
				'dock_apps'       => $dock_apps,
				'menu_bar'        => $menu_bar,
				'widgets'         => $widgets,
				'folders'         => $folders,
				'site_name'       => get_bloginfo( 'name' ),
				'theme'           => $theme,
				'wallpaper'       => $wallpaper,
				'workspace_state' => $workspace_state,
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
				$candidates[] = PUFFERDESK_DIR . 'templates/themes/' . sanitize_key( $theme['id'] ) . '/' . $template;
			}

			if ( ! empty( $theme['family'] ) ) {
				$candidates[] = PUFFERDESK_DIR . 'templates/themes/' . sanitize_key( $theme['family'] ) . '/' . $template;
			}
		}

		$candidates[] = PUFFERDESK_DIR . 'templates/' . $template;

		foreach ( $candidates as $candidate ) {
			if ( file_exists( $candidate ) ) {
				return $candidate;
			}
		}

		return PUFFERDESK_DIR . 'templates/' . $template;
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
