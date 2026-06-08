<?php
/**
 * Shell dock.
 *
 * @package WPAdminOS
 */

defined( 'ABSPATH' ) || exit;

/**
 * @var array<int,array<string,string>> $apps
 * @var array<string,mixed>             $theme
 */
?>
<aside class="aos-dock" aria-label="<?php esc_attr_e( 'WP adminOS dock', 'wp-adminos' ); ?>">
	<?php foreach ( $apps as $wp_adminos_app ) : ?>
		<button
			type="button"
			class="aos-dock-item"
			data-aos-context="dock-app"
			data-aos-context-id="<?php echo esc_attr( $wp_adminos_app['id'] ); ?>"
			data-aos-context-label="<?php echo esc_attr( $wp_adminos_app['label'] ); ?>"
			data-aos-dock-tooltip="<?php echo esc_attr( $wp_adminos_app['label'] ); ?>"
			data-aos-open-app="<?php echo esc_attr( $wp_adminos_app['id'] ); ?>"
			aria-label="<?php echo esc_attr( $wp_adminos_app['label'] ); ?>"
		>
			<?php WP_AdminOS_Icon_Renderer::render( $wp_adminos_app['icon'], $theme ); ?>
			<span class="aos-dock-tooltip" aria-hidden="true"><?php echo esc_html( $wp_adminos_app['label'] ); ?></span>
			<span class="screen-reader-text"><?php echo esc_html( $wp_adminos_app['label'] ); ?></span>
		</button>
	<?php endforeach; ?>
</aside>
