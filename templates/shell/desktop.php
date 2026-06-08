<?php
/**
 * Desktop surface template.
 *
 * @package WPAdminOS
 */

defined( 'ABSPATH' ) || exit;

/**
 * @var array<int,array<string,string>> $apps
 * @var array<int,array<string,string>> $desktop_apps
 * @var array<int,array<string,string>> $dock_apps
 * @var array<int,array<string,mixed>>  $widgets
 * @var array<int,array<string,string>> $folders
 * @var array<string,mixed>             $theme
 * @var array<string,mixed>             $shell
 * @var array<string,mixed>             $workspace_state
 */
$wp_adminos_shell    = wp_parse_args(
	isset( $shell ) && is_array( $shell ) ? $shell : array(),
	array(
		'launcher'    => 'dock',
		'system_menu' => 'mark',
		'status_area' => 'menu-bar',
	)
);
$wp_adminos_launcher = isset( $wp_adminos_shell['launcher'] ) ? (string) $wp_adminos_shell['launcher'] : 'dock';
?>
<main
	class="aos-desktop"
	data-aos-context="desktop"
	data-aos-context-id="desktop"
	aria-label="<?php esc_attr_e( 'WP adminOS desktop', 'wp-adminos' ); ?>"
>
	<?php
	$this->render_part(
		'desktop/folders.php',
		array(
			'folders'         => $folders,
			'theme'           => $theme,
			'workspace_state' => isset( $workspace_state ) && is_array( $workspace_state ) ? $workspace_state : array(),
		)
	);

	$this->render_part(
		'desktop/apps.php',
		array(
			'apps'            => isset( $desktop_apps ) && is_array( $desktop_apps ) ? $desktop_apps : array(),
			'theme'           => $theme,
			'workspace_state' => isset( $workspace_state ) && is_array( $workspace_state ) ? $workspace_state : array(),
		)
	);

	$this->render_part(
		'widgets/desktop.php',
		array(
			'widgets'         => $widgets,
			'theme'           => $theme,
			'workspace_state' => isset( $workspace_state ) && is_array( $workspace_state ) ? $workspace_state : array(),
		)
	);

	if ( 'none' !== $wp_adminos_launcher ) {
		$this->render_part(
			'shell/dock.php',
			array(
				'apps'  => isset( $dock_apps ) && is_array( $dock_apps ) ? $dock_apps : $apps,
				'theme' => $theme,
				'shell' => $wp_adminos_shell,
			)
		);
	}
	?>
</main>
