<?php
/**
 * Desktop surface template.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Template variables.
 *
 * @var array<int,array<string,string>> $apps
 * @var array<int,array<string,string>> $desktop_apps
 * @var array<int,array<string,string>> $dock_apps
 * @var array<int,array<string,mixed>>  $widgets
 * @var array<int,array<string,string>> $folders
 * @var array<string,mixed>             $theme
 * @var array<string,mixed>             $shell
 * @var array<string,string>            $labels
 * @var array<string,string>            $notification_labels
 * @var array<string,mixed>             $workspace_state
 * @var PufferDesk_Shell_Renderer       $pufferdesk_renderer
 */
$pufferdesk_labels   = isset( $labels ) && is_array( $labels ) ? $labels : PufferDesk_Runtime_Config::get_shell_template_labels( isset( $theme ) && is_array( $theme ) ? $theme : array() );
$pufferdesk_shell    = wp_parse_args(
	isset( $shell ) && is_array( $shell ) ? $shell : array(),
	array(
		'launcher'    => 'dock',
		'system_menu' => 'mark',
		'status_area' => 'menu-bar',
	)
);
$pufferdesk_launcher = isset( $pufferdesk_shell['launcher'] ) ? (string) $pufferdesk_shell['launcher'] : 'dock';
?>
<div
	class="pdk-desktop"
	data-pdk-context="<?php echo esc_attr( PufferDesk_Context_Menu_Contracts::TARGET_DESKTOP ); ?>"
	data-pdk-context-id="<?php echo esc_attr( PufferDesk_Context_Menu_Contracts::TARGET_DESKTOP ); ?>"
	aria-label="<?php echo esc_attr( isset( $pufferdesk_labels['pufferdesk_desktop'] ) ? $pufferdesk_labels['pufferdesk_desktop'] : 'pufferdesk_desktop' ); ?>"
>
	<?php
	$pufferdesk_renderer->render_part(
		'desktop/folders.php',
		array(
			'folders'         => $folders,
			'labels'          => $pufferdesk_labels,
			'theme'           => $theme,
			'workspace_state' => isset( $workspace_state ) && is_array( $workspace_state ) ? $workspace_state : array(),
		)
	);

	$pufferdesk_renderer->render_part(
		'desktop/apps.php',
		array(
			'apps'            => isset( $desktop_apps ) && is_array( $desktop_apps ) ? $desktop_apps : array(),
			'labels'          => $pufferdesk_labels,
			'theme'           => $theme,
			'workspace_state' => isset( $workspace_state ) && is_array( $workspace_state ) ? $workspace_state : array(),
		)
	);

	$pufferdesk_renderer->render_part(
		'widgets/desktop.php',
		array(
			'widgets'         => $widgets,
			'labels'          => $pufferdesk_labels,
			'theme'           => $theme,
			'workspace_state' => isset( $workspace_state ) && is_array( $workspace_state ) ? $workspace_state : array(),
		)
	);

	if ( 'none' !== $pufferdesk_launcher ) {
		$pufferdesk_renderer->render_part(
			'shell/dock.php',
			array(
				'apps'  => isset( $dock_apps ) && is_array( $dock_apps ) ? $dock_apps : $apps,
				'labels' => $pufferdesk_labels,
				'notification_labels' => isset( $notification_labels ) && is_array( $notification_labels ) ? $notification_labels : PufferDesk_Notification_Registry::get_default_labels(),
				'theme'  => $theme,
				'shell'  => $pufferdesk_shell,
			)
		);
	}
	?>
</div>
