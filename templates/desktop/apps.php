<?php
/**
 * Desktop app icons.
 *
 * @package WPAdminOS
 */

defined( 'ABSPATH' ) || exit;

/**
 * @var array<int,array<string,string>> $apps
 * @var array<string,mixed>             $theme
 */

if ( empty( $apps ) ) {
	return;
}
?>
<section class="aos-desktop-apps aos-desktop-icon-layer" aria-label="<?php esc_attr_e( 'Desktop apps', 'wp-adminos' ); ?>">
	<?php foreach ( $apps as $wp_adminos_app ) : ?>
		<button
			type="button"
			class="aos-desktop-icon aos-desktop-app"
			data-aos-context="desktop-app"
			data-aos-context-id="<?php echo esc_attr( $wp_adminos_app['id'] ); ?>"
			data-aos-context-label="<?php echo esc_attr( $wp_adminos_app['label'] ); ?>"
			data-aos-desktop-icon
			data-aos-desktop-icon-id="<?php echo esc_attr( 'app:' . $wp_adminos_app['id'] ); ?>"
			data-aos-desktop-icon-kind="app"
			data-aos-open-app="<?php echo esc_attr( $wp_adminos_app['id'] ); ?>"
			aria-label="<?php echo esc_attr( $wp_adminos_app['label'] ); ?>"
		>
			<span class="aos-app-icon">
				<?php WP_AdminOS_Icon_Renderer::render( $wp_adminos_app['icon'], $theme ); ?>
			</span>
			<span class="aos-desktop-app-label"><?php echo esc_html( $wp_adminos_app['label'] ); ?></span>
		</button>
	<?php endforeach; ?>
</section>
