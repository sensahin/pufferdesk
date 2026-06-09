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
		'launcher'    => 'dock',
		'system_menu' => 'mark',
		'status_area' => 'menu-bar',
		'labels'      => array(),
	)
);
$pufferdesk_shell_labels = isset( $pufferdesk_shell['labels'] ) && is_array( $pufferdesk_shell['labels'] ) ? $pufferdesk_shell['labels'] : array();
$pufferdesk_launcher     = in_array( $pufferdesk_shell['launcher'], array( 'dock', 'taskbar' ), true ) ? $pufferdesk_shell['launcher'] : 'dock';
$pufferdesk_launcher_label = isset( $pufferdesk_shell_labels['launcher'] ) && '' !== $pufferdesk_shell_labels['launcher']
	? (string) $pufferdesk_shell_labels['launcher']
	: ( 'taskbar' === $pufferdesk_launcher ? __( 'Taskbar', 'pufferdesk-admin-desktop' ) : __( 'Dock', 'pufferdesk-admin-desktop' ) );
$pufferdesk_show_start   = 'taskbar' === $pufferdesk_launcher && 'start' === $pufferdesk_shell['system_menu'];
$pufferdesk_show_status  = 'taskbar' === $pufferdesk_launcher && 'taskbar' === $pufferdesk_shell['status_area'];
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
	$pufferdesk_app_label   = isset( $pufferdesk_app['label'] ) ? (string) $pufferdesk_app['label'] : '';
	$pufferdesk_app_badge   = isset( $pufferdesk_app['badge'] ) && is_array( $pufferdesk_app['badge'] ) ? $pufferdesk_app['badge'] : array();
	$pufferdesk_badge_text  = isset( $pufferdesk_app_badge['text'] ) ? (string) $pufferdesk_app_badge['text'] : '';
	$pufferdesk_badge_tone  = isset( $pufferdesk_app_badge['tone'] ) ? sanitize_html_class( (string) $pufferdesk_app_badge['tone'] ) : 'attention';
	$pufferdesk_badge_tone  = '' !== $pufferdesk_badge_tone ? $pufferdesk_badge_tone : 'attention';
	$pufferdesk_badge_label = isset( $pufferdesk_app_badge['aria_label'] ) ? (string) $pufferdesk_app_badge['aria_label'] : '';
	$pufferdesk_aria_label  = '' !== $pufferdesk_badge_label
		? sprintf(
			/* translators: 1: app label, 2: app badge accessibility label. */
			__( '%1$s, %2$s', 'pufferdesk-admin-desktop' ),
			$pufferdesk_app_label,
			$pufferdesk_badge_label
		)
		: $pufferdesk_app_label;
	?>
	<button
		type="button"
		class="pdk-dock-item<?php echo $pufferdesk_fixed ? ' pdk-dock-fixed-item' : ''; ?>"
		data-pdk-context="dock-app"
		data-pdk-context-id="<?php echo esc_attr( $pufferdesk_app['id'] ); ?>"
		data-pdk-context-label="<?php echo esc_attr( $pufferdesk_app_label ); ?>"
		data-pdk-dock-tooltip="<?php echo esc_attr( $pufferdesk_app_label ); ?>"
		<?php if ( $pufferdesk_fixed ) : ?>
			data-pdk-dock-fixed="end"
		<?php endif; ?>
		data-pdk-open-app="<?php echo esc_attr( $pufferdesk_app['id'] ); ?>"
		draggable="false"
		aria-label="<?php echo esc_attr( $pufferdesk_aria_label ); ?>"
	>
		<?php PufferDesk_Icon_Renderer::render( $pufferdesk_app['icon'], $theme ); ?>
		<?php if ( '' !== $pufferdesk_badge_text ) : ?>
			<span class="pdk-app-badge pdk-app-badge-<?php echo esc_attr( $pufferdesk_badge_tone ); ?>" aria-hidden="true"><?php echo esc_html( $pufferdesk_badge_text ); ?></span>
		<?php endif; ?>
		<span class="pdk-dock-tooltip" aria-hidden="true"><?php echo esc_html( $pufferdesk_app_label ); ?></span>
		<span class="screen-reader-text"><?php echo esc_html( $pufferdesk_app_label ); ?></span>
	</button>
	<?php
};
?>
<aside
	class="pdk-dock pdk-shell-launcher pdk-shell-launcher-<?php echo esc_attr( $pufferdesk_launcher ); ?>"
	data-pdk-shell-surface="launcher"
	data-pdk-launcher-kind="<?php echo esc_attr( $pufferdesk_launcher ); ?>"
	aria-label="<?php echo esc_attr( $pufferdesk_launcher_label ); ?>"
>
	<?php if ( $pufferdesk_show_start ) : ?>
		<button type="button" class="pdk-system-mark pdk-taskbar-start" data-pdk-system-menu aria-label="<?php esc_attr_e( 'Open PufferDesk menu', 'pufferdesk-admin-desktop' ); ?>">
			<span class="pdk-taskbar-start-icon" aria-hidden="true">
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
			</span>
			<span class="pdk-taskbar-start-label"><?php esc_html_e( 'Start', 'pufferdesk-admin-desktop' ); ?></span>
		</button>
	<?php endif; ?>
	<?php foreach ( $pufferdesk_regular_apps as $pufferdesk_app ) : ?>
		<?php $pufferdesk_render_dock_app( $pufferdesk_app, $theme ); ?>
	<?php endforeach; ?>
	<?php if ( ! empty( $pufferdesk_fixed_apps ) ) : ?>
		<span class="pdk-dock-separator" aria-hidden="true"></span>
		<?php foreach ( $pufferdesk_fixed_apps as $pufferdesk_app ) : ?>
			<?php $pufferdesk_render_dock_app( $pufferdesk_app, $theme, true ); ?>
		<?php endforeach; ?>
	<?php endif; ?>
	<span class="pdk-dock-end-anchor" data-pdk-launcher-end-anchor aria-hidden="true"></span>
	<?php if ( $pufferdesk_show_status ) : ?>
		<div class="pdk-taskbar-status" aria-label="<?php esc_attr_e( 'Status', 'pufferdesk-admin-desktop' ); ?>">
			<span class="pdk-taskbar-clock" data-pdk-clock><?php echo esc_html( date_i18n( 'D M j H:i' ) ); ?></span>
		</div>
	<?php endif; ?>
</aside>
