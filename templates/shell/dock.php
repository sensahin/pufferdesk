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
 */
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
<aside class="aos-dock" aria-label="<?php esc_attr_e( 'WP adminOS dock', 'wp-adminos' ); ?>">
	<?php foreach ( $wp_adminos_regular_apps as $wp_adminos_app ) : ?>
		<?php $wp_adminos_render_dock_app( $wp_adminos_app, $theme ); ?>
	<?php endforeach; ?>
	<?php if ( ! empty( $wp_adminos_fixed_apps ) ) : ?>
		<span class="aos-dock-separator" aria-hidden="true"></span>
		<?php foreach ( $wp_adminos_fixed_apps as $wp_adminos_app ) : ?>
			<?php $wp_adminos_render_dock_app( $wp_adminos_app, $theme, true ); ?>
		<?php endforeach; ?>
	<?php endif; ?>
</aside>
