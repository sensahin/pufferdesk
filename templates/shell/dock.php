<?php
/**
 * Shell dock.
 *
 * @package WPAdminOS
 */

defined( 'ABSPATH' ) || exit;

/**
 * @var array<int,array<string,mixed>>  $apps
 * @var array<string,mixed>             $theme
 * @var array<string,mixed>             $shell
 */
$wp_adminos_shell = wp_parse_args(
	isset( $shell ) && is_array( $shell ) ? $shell : array(),
	array(
		'launcher'    => 'dock',
		'system_menu' => 'mark',
		'status_area' => 'menu-bar',
		'labels'      => array(),
	)
);
$wp_adminos_shell_labels = isset( $wp_adminos_shell['labels'] ) && is_array( $wp_adminos_shell['labels'] ) ? $wp_adminos_shell['labels'] : array();
$wp_adminos_launcher     = in_array( $wp_adminos_shell['launcher'], array( 'dock', 'taskbar' ), true ) ? $wp_adminos_shell['launcher'] : 'dock';
$wp_adminos_launcher_label = isset( $wp_adminos_shell_labels['launcher'] ) && '' !== $wp_adminos_shell_labels['launcher']
	? (string) $wp_adminos_shell_labels['launcher']
	: ( 'taskbar' === $wp_adminos_launcher ? __( 'Taskbar', 'wp-adminos' ) : __( 'Dock', 'wp-adminos' ) );
$wp_adminos_show_start   = 'taskbar' === $wp_adminos_launcher && 'start' === $wp_adminos_shell['system_menu'];
$wp_adminos_show_status  = 'taskbar' === $wp_adminos_launcher && 'taskbar' === $wp_adminos_shell['status_area'];
$wp_adminos_regular_apps = array();
$wp_adminos_fixed_apps   = array();

foreach ( $apps as $wp_adminos_app ) {
	if ( ! is_array( $wp_adminos_app ) ) {
		continue;
	}

	$wp_adminos_dock = isset( $wp_adminos_app['dock'] ) && is_array( $wp_adminos_app['dock'] ) ? $wp_adminos_app['dock'] : array();
	if ( ! empty( $wp_adminos_dock['fixed'] ) && 'end' === ( isset( $wp_adminos_dock['placement'] ) ? (string) $wp_adminos_dock['placement'] : 'end' ) ) {
		$wp_adminos_fixed_apps[] = $wp_adminos_app;
		continue;
	}

	$wp_adminos_regular_apps[] = $wp_adminos_app;
}

$wp_adminos_render_dock_app = static function ( $wp_adminos_app, $theme, $wp_adminos_fixed = false ) {
	$wp_adminos_app_label   = isset( $wp_adminos_app['label'] ) ? (string) $wp_adminos_app['label'] : '';
	$wp_adminos_app_badge   = isset( $wp_adminos_app['badge'] ) && is_array( $wp_adminos_app['badge'] ) ? $wp_adminos_app['badge'] : array();
	$wp_adminos_badge_text  = isset( $wp_adminos_app_badge['text'] ) ? (string) $wp_adminos_app_badge['text'] : '';
	$wp_adminos_badge_tone  = isset( $wp_adminos_app_badge['tone'] ) ? sanitize_html_class( (string) $wp_adminos_app_badge['tone'] ) : 'attention';
	$wp_adminos_badge_tone  = '' !== $wp_adminos_badge_tone ? $wp_adminos_badge_tone : 'attention';
	$wp_adminos_badge_label = isset( $wp_adminos_app_badge['aria_label'] ) ? (string) $wp_adminos_app_badge['aria_label'] : '';
	$wp_adminos_aria_label  = '' !== $wp_adminos_badge_label
		? sprintf(
			/* translators: 1: app label, 2: app badge accessibility label. */
			__( '%1$s, %2$s', 'wp-adminos' ),
			$wp_adminos_app_label,
			$wp_adminos_badge_label
		)
		: $wp_adminos_app_label;
	?>
	<button
		type="button"
		class="aos-dock-item<?php echo $wp_adminos_fixed ? ' aos-dock-fixed-item' : ''; ?>"
		data-aos-context="dock-app"
		data-aos-context-id="<?php echo esc_attr( $wp_adminos_app['id'] ); ?>"
		data-aos-context-label="<?php echo esc_attr( $wp_adminos_app_label ); ?>"
		data-aos-dock-tooltip="<?php echo esc_attr( $wp_adminos_app_label ); ?>"
		<?php if ( $wp_adminos_fixed ) : ?>
			data-aos-dock-fixed="end"
		<?php endif; ?>
		data-aos-open-app="<?php echo esc_attr( $wp_adminos_app['id'] ); ?>"
		draggable="false"
		aria-label="<?php echo esc_attr( $wp_adminos_aria_label ); ?>"
	>
		<?php WP_AdminOS_Icon_Renderer::render( $wp_adminos_app['icon'], $theme ); ?>
		<?php if ( '' !== $wp_adminos_badge_text ) : ?>
			<span class="aos-app-badge aos-app-badge-<?php echo esc_attr( $wp_adminos_badge_tone ); ?>" aria-hidden="true"><?php echo esc_html( $wp_adminos_badge_text ); ?></span>
		<?php endif; ?>
		<span class="aos-dock-tooltip" aria-hidden="true"><?php echo esc_html( $wp_adminos_app_label ); ?></span>
		<span class="screen-reader-text"><?php echo esc_html( $wp_adminos_app_label ); ?></span>
	</button>
	<?php
};
?>
<aside
	class="aos-dock aos-shell-launcher aos-shell-launcher-<?php echo esc_attr( $wp_adminos_launcher ); ?>"
	data-aos-shell-surface="launcher"
	data-aos-launcher-kind="<?php echo esc_attr( $wp_adminos_launcher ); ?>"
	aria-label="<?php echo esc_attr( $wp_adminos_launcher_label ); ?>"
>
	<?php if ( $wp_adminos_show_start ) : ?>
		<button type="button" class="aos-system-mark aos-taskbar-start" data-aos-system-menu aria-label="<?php esc_attr_e( 'Open WP adminOS menu', 'wp-adminos' ); ?>">
			<span class="aos-taskbar-start-icon" aria-hidden="true">
				<svg class="aos-system-mark-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false">
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
			<span class="aos-taskbar-start-label"><?php esc_html_e( 'Start', 'wp-adminos' ); ?></span>
		</button>
	<?php endif; ?>
	<?php foreach ( $wp_adminos_regular_apps as $wp_adminos_app ) : ?>
		<?php $wp_adminos_render_dock_app( $wp_adminos_app, $theme ); ?>
	<?php endforeach; ?>
	<?php if ( ! empty( $wp_adminos_fixed_apps ) ) : ?>
		<span class="aos-dock-separator" aria-hidden="true"></span>
		<?php foreach ( $wp_adminos_fixed_apps as $wp_adminos_app ) : ?>
			<?php $wp_adminos_render_dock_app( $wp_adminos_app, $theme, true ); ?>
		<?php endforeach; ?>
	<?php endif; ?>
	<span class="aos-dock-end-anchor" data-aos-launcher-end-anchor aria-hidden="true"></span>
	<?php if ( $wp_adminos_show_status ) : ?>
		<div class="aos-taskbar-status" aria-label="<?php esc_attr_e( 'Status', 'wp-adminos' ); ?>">
			<span class="aos-taskbar-clock" data-aos-clock><?php echo esc_html( date_i18n( 'D M j H:i' ) ); ?></span>
		</div>
	<?php endif; ?>
</aside>
