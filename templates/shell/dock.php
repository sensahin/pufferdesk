<?php
/**
 * Shell dock.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * @var array<int,array<string,mixed>>  $apps
 * @var array<string,mixed>             $theme
 * @var array<string,mixed>             $shell
 */
$pufferdesk_shell = wp_parse_args(
	isset( $shell ) && is_array( $shell ) ? $shell : array(),
	array(
		'launcher'         => 'dock',
		'system_menu'      => 'mark',
		'status_area'      => 'menu-bar',
		'launcher_search'  => false,
		'system_menu_icon' => 'pufferdesk-mark',
		'labels'           => array(),
	)
);
$pufferdesk_shell_labels   = isset( $pufferdesk_shell['labels'] ) && is_array( $pufferdesk_shell['labels'] ) ? $pufferdesk_shell['labels'] : array();
$pufferdesk_launcher       = in_array( $pufferdesk_shell['launcher'], array( 'dock', 'taskbar' ), true ) ? $pufferdesk_shell['launcher'] : 'dock';
$pufferdesk_launcher_label = isset( $pufferdesk_shell_labels['launcher'] ) && '' !== $pufferdesk_shell_labels['launcher']
	? (string) $pufferdesk_shell_labels['launcher']
	: ( 'taskbar' === $pufferdesk_launcher ? __( 'Taskbar', 'pufferdesk-admin-desktop' ) : __( 'Dock', 'pufferdesk-admin-desktop' ) );
$pufferdesk_start_label     = isset( $pufferdesk_shell_labels['start'] ) && '' !== $pufferdesk_shell_labels['start'] ? (string) $pufferdesk_shell_labels['start'] : __( 'Start', 'pufferdesk-admin-desktop' );
$pufferdesk_open_start_label = isset( $pufferdesk_shell_labels['open_start'] ) && '' !== $pufferdesk_shell_labels['open_start'] ? (string) $pufferdesk_shell_labels['open_start'] : __( 'Open Start', 'pufferdesk-admin-desktop' );
$pufferdesk_search_label    = isset( $pufferdesk_shell_labels['search'] ) && '' !== $pufferdesk_shell_labels['search'] ? (string) $pufferdesk_shell_labels['search'] : __( 'Search', 'pufferdesk-admin-desktop' );
$pufferdesk_search_apps_label = isset( $pufferdesk_shell_labels['search_apps'] ) && '' !== $pufferdesk_shell_labels['search_apps'] ? (string) $pufferdesk_shell_labels['search_apps'] : __( 'Search apps', 'pufferdesk-admin-desktop' );
$pufferdesk_show_start      = 'taskbar' === $pufferdesk_launcher && 'start' === $pufferdesk_shell['system_menu'];
$pufferdesk_show_status     = 'taskbar' === $pufferdesk_launcher && 'taskbar' === $pufferdesk_shell['status_area'];
$pufferdesk_show_search     = 'taskbar' === $pufferdesk_launcher && ! empty( $pufferdesk_shell['launcher_search'] );
$pufferdesk_show_separator = ! array_key_exists( 'launcher_separator', $pufferdesk_shell ) || false !== (bool) $pufferdesk_shell['launcher_separator'];
$pufferdesk_system_menu_icon = isset( $pufferdesk_shell['system_menu_icon'] ) ? (string) $pufferdesk_shell['system_menu_icon'] : 'pufferdesk-mark';
if ( ! in_array( $pufferdesk_system_menu_icon, array( 'pufferdesk-mark', 'theme', 'none' ), true ) ) {
	$pufferdesk_system_menu_icon = 'pufferdesk-mark';
}
$pufferdesk_regular_apps = array();
$pufferdesk_fixed_apps   = array();

foreach ( $apps as $pufferdesk_app ) {
	if ( ! is_array( $pufferdesk_app ) ) {
		continue;
	}

	$pufferdesk_dock = isset( $pufferdesk_app['dock'] ) && is_array( $pufferdesk_app['dock'] ) ? $pufferdesk_app['dock'] : array();
	if ( ! empty( $pufferdesk_dock['fixed'] ) && 'end' === ( isset( $pufferdesk_dock['placement'] ) ? (string) $pufferdesk_dock['placement'] : 'end' ) ) {
		$pufferdesk_fixed_apps[] = $pufferdesk_app;
		continue;
	}

	$pufferdesk_regular_apps[] = $pufferdesk_app;
}

$pufferdesk_render_dock_app = static function ( $pufferdesk_app, $theme, $pufferdesk_fixed = false ) {
	$pufferdesk_app_label  = isset( $pufferdesk_app['label'] ) ? (string) $pufferdesk_app['label'] : '';
	$pufferdesk_app_badge  = isset( $pufferdesk_app['badge'] ) && is_array( $pufferdesk_app['badge'] ) ? $pufferdesk_app['badge'] : array();
	$pufferdesk_aria_label = PufferDesk_App_Badge_Renderer::get_aria_label( $pufferdesk_app_label, $pufferdesk_app_badge );
	?>
	<button
		type="button"
		class="pdk-dock-item pdk-tooltip-trigger<?php echo $pufferdesk_fixed ? ' pdk-dock-fixed-item' : ''; ?>"
		data-pdk-context="<?php echo esc_attr( PufferDesk_Context_Menu_Contracts::TARGET_DOCK_APP ); ?>"
		data-pdk-context-id="<?php echo esc_attr( $pufferdesk_app['id'] ); ?>"
		data-pdk-context-label="<?php echo esc_attr( $pufferdesk_app_label ); ?>"
		<?php echo PufferDesk_Tooltip_Renderer::get_trigger_attributes( $pufferdesk_app_label, array( 'surface' => 'dock' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		<?php if ( $pufferdesk_fixed ) : ?>
			data-pdk-dock-fixed="end"
		<?php endif; ?>
		data-pdk-open-app="<?php echo esc_attr( $pufferdesk_app['id'] ); ?>"
		draggable="false"
		aria-label="<?php echo esc_attr( $pufferdesk_aria_label ); ?>"
	>
		<?php PufferDesk_Icon_Renderer::render( $pufferdesk_app['icon'], $theme ); ?>
		<?php PufferDesk_App_Badge_Renderer::render( $pufferdesk_app_badge ); ?>
		<?php PufferDesk_Tooltip_Renderer::render( $pufferdesk_app_label, array( 'surface' => 'dock' ) ); ?>
		<span class="screen-reader-text"><?php echo esc_html( $pufferdesk_app_label ); ?></span>
	</button>
	<?php
};
$pufferdesk_launcher_classes = array(
	'pdk-dock',
	'pdk-shell-launcher',
	'pdk-shell-launcher-' . $pufferdesk_launcher,
);
if ( $pufferdesk_show_search ) {
	$pufferdesk_launcher_classes[] = 'pdk-shell-launcher-has-search';
}
?>
<aside
	class="<?php echo esc_attr( implode( ' ', $pufferdesk_launcher_classes ) ); ?>"
	data-pdk-context="<?php echo esc_attr( PufferDesk_Context_Menu_Contracts::TARGET_DOCK ); ?>"
	data-pdk-context-id="<?php echo esc_attr( $pufferdesk_launcher ); ?>"
	data-pdk-context-label="<?php echo esc_attr( $pufferdesk_launcher_label ); ?>"
	data-pdk-shell-surface="launcher"
	data-pdk-launcher-kind="<?php echo esc_attr( $pufferdesk_launcher ); ?>"
	aria-label="<?php echo esc_attr( $pufferdesk_launcher_label ); ?>"
>
	<?php if ( $pufferdesk_show_start ) : ?>
		<button type="button" class="pdk-system-mark pdk-taskbar-start" data-pdk-system-menu aria-label="<?php echo esc_attr( $pufferdesk_open_start_label ); ?>">
			<?php if ( 'none' !== $pufferdesk_system_menu_icon ) : ?>
				<span class="pdk-taskbar-start-icon pdk-taskbar-start-icon-<?php echo esc_attr( $pufferdesk_system_menu_icon ); ?>" aria-hidden="true">
					<?php if ( 'pufferdesk-mark' === $pufferdesk_system_menu_icon ) : ?>
						<svg class="pdk-system-mark-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false">
							<circle cx="12" cy="12" r="3" />
							<path d="M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 1 1 4.5 4.5 4.5 4.5 0 1 1-4.5 4.5" />
							<path d="M12 7.5V9" />
							<path d="M7.5 12H9" />
							<path d="M16.5 12H15" />
							<path d="M12 16.5V15" />
							<path d="m8 8 1.88 1.88" />
							<path d="M14.12 9.88 16 8" />
							<path d="m8 16 1.88-1.88" />
							<path d="M14.12 14.12 16 16" />
						</svg>
					<?php endif; ?>
				</span>
			<?php endif; ?>
			<span class="pdk-taskbar-start-label"><?php echo esc_html( $pufferdesk_start_label ); ?></span>
		</button>
	<?php endif; ?>
	<?php if ( $pufferdesk_show_search ) : ?>
		<label class="pdk-taskbar-search">
			<svg class="pdk-taskbar-search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
				<circle cx="11" cy="11" r="6.5" />
				<path d="m16 16 4 4" />
			</svg>
			<input type="search" class="pdk-taskbar-search-input" data-pdk-search autocomplete="off" placeholder="<?php echo esc_attr( $pufferdesk_search_label ); ?>" aria-label="<?php echo esc_attr( $pufferdesk_search_apps_label ); ?>">
		</label>
	<?php endif; ?>
	<?php foreach ( $pufferdesk_regular_apps as $pufferdesk_app ) : ?>
		<?php $pufferdesk_render_dock_app( $pufferdesk_app, $theme ); ?>
	<?php endforeach; ?>
	<?php if ( ! empty( $pufferdesk_fixed_apps ) ) : ?>
		<?php if ( $pufferdesk_show_separator ) : ?>
			<span class="pdk-dock-separator" aria-hidden="true"></span>
		<?php endif; ?>
		<?php foreach ( $pufferdesk_fixed_apps as $pufferdesk_app ) : ?>
			<?php $pufferdesk_render_dock_app( $pufferdesk_app, $theme, true ); ?>
		<?php endforeach; ?>
	<?php endif; ?>
	<span class="pdk-dock-end-anchor" data-pdk-launcher-end-anchor aria-hidden="true"></span>
	<?php if ( $pufferdesk_show_status ) : ?>
		<div class="pdk-taskbar-status" aria-label="<?php esc_attr_e( 'Status', 'pufferdesk-admin-desktop' ); ?>">
			<span class="pdk-sound-status-slot" data-pdk-sound-status></span>
			<button type="button" class="pdk-notification-button pdk-taskbar-notification-button" data-pdk-notification-toggle aria-label="<?php esc_attr_e( 'Open Notifications', 'pufferdesk-admin-desktop' ); ?>">
				<svg class="pdk-notification-button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
					<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
					<path d="M13.73 21a2 2 0 0 1-3.46 0" />
				</svg>
			</button>
			<span class="pdk-taskbar-clock" data-pdk-clock><?php echo esc_html( date_i18n( 'D M j H:i' ) ); ?></span>
		</div>
	<?php endif; ?>
</aside>
