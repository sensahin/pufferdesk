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
	 * Shell context builder.
	 *
	 * @var PufferDesk_Shell_Context
	 */
	private $shell_context;

	/**
	 * Current resolved theme during a render pass.
	 *
	 * @var array<string,mixed>|null
	 */
	private $current_theme = null;

	/**
	 * Constructor.
	 *
	 * @param PufferDesk_Shell_Context $shell_context Shell context builder.
	 */
	public function __construct( PufferDesk_Shell_Context $shell_context ) {
		$this->shell_context = $shell_context;
	}

	/**
	 * Render the OS shell page.
	 */
	public function render() {
		if ( ! current_user_can( 'read' ) ) {
			wp_die( esc_html__( 'You do not have permission to use PufferDesk.', 'pufferdesk' ) );
		}

		$context             = $this->shell_context->get();
		$theme               = isset( $context['theme'] ) && is_array( $context['theme'] ) ? $context['theme'] : array();
		$this->current_theme = $theme;

		$this->render_template(
			'shell/shell.php',
			array(
				'appearance'           => isset( $context['appearance'] ) ? $context['appearance'] : array(),
				'apps'                 => isset( $context['apps'] ) ? $context['apps'] : array(),
				'desktop_apps'         => isset( $context['desktop_apps'] ) ? $context['desktop_apps'] : array(),
				'desktop_dock'         => isset( $context['desktop_dock'] ) ? $context['desktop_dock'] : array(),
				'desktop_icon_folders' => isset( $context['desktop_icon_folders'] ) ? $context['desktop_icon_folders'] : array(),
				'dock_apps'            => isset( $context['dock_apps'] ) ? $context['dock_apps'] : array(),
				'menu_bar'             => isset( $context['menu_bar'] ) ? $context['menu_bar'] : array(),
				'widgets'              => isset( $context['widgets'] ) ? $context['widgets'] : array(),
				'folders'              => isset( $context['folders'] ) ? $context['folders'] : array(),
				'site_name'            => get_bloginfo( 'name' ),
				'theme'                => $theme,
				'wallpaper'            => isset( $context['wallpaper'] ) ? $context['wallpaper'] : array(),
				'workspace_state'      => isset( $context['workspace_state'] ) ? $context['workspace_state'] : array(),
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
		$template = PufferDesk_Path_Normalizer::normalize_relative_path( $template );
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
		$template = PufferDesk_Path_Normalizer::normalize_relative_path( $template );
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

}
