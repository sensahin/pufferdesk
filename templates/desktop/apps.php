<?php
/**
 * Desktop app icons.
 *
 * @package WPAdminOS
 */

defined( 'ABSPATH' ) || exit;

/**
 * @var array<int,array<string,mixed>>  $apps
 * @var array<string,mixed>             $theme
 */

if ( empty( $apps ) ) {
	return;
}
?>
<section class="aos-desktop-apps aos-desktop-icon-layer" aria-label="<?php esc_attr_e( 'Desktop apps', 'wp-adminos' ); ?>">
	<?php foreach ( $apps as $wp_adminos_app ) : ?>
		<?php
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
			class="aos-desktop-icon aos-desktop-app"
			data-aos-context="desktop-app"
			data-aos-context-id="<?php echo esc_attr( $wp_adminos_app['id'] ); ?>"
			data-aos-context-label="<?php echo esc_attr( $wp_adminos_app_label ); ?>"
			data-aos-desktop-icon
			data-aos-desktop-icon-id="<?php echo esc_attr( 'app:' . $wp_adminos_app['id'] ); ?>"
			data-aos-desktop-icon-kind="app"
			data-aos-open-app="<?php echo esc_attr( $wp_adminos_app['id'] ); ?>"
			aria-label="<?php echo esc_attr( $wp_adminos_aria_label ); ?>"
		>
			<span class="aos-app-icon">
				<?php WP_AdminOS_Icon_Renderer::render( $wp_adminos_app['icon'], $theme ); ?>
				<?php if ( '' !== $wp_adminos_badge_text ) : ?>
					<span class="aos-app-badge aos-app-badge-<?php echo esc_attr( $wp_adminos_badge_tone ); ?>" aria-hidden="true"><?php echo esc_html( $wp_adminos_badge_text ); ?></span>
				<?php endif; ?>
			</span>
			<span class="aos-desktop-app-label"><?php echo esc_html( $wp_adminos_app_label ); ?></span>
		</button>
	<?php endforeach; ?>
</section>
