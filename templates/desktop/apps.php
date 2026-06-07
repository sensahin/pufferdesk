<?php
/**
 * Desktop app icons.
 *
 * @package AdminOSMode
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
<section class="aos-desktop-apps" aria-label="<?php esc_attr_e( 'Desktop apps', 'admin-os-mode' ); ?>">
	<?php foreach ( $apps as $admin_os_mode_app ) : ?>
		<button
			type="button"
			class="aos-desktop-app"
			data-aos-context="desktop-app"
			data-aos-context-id="<?php echo esc_attr( $admin_os_mode_app['id'] ); ?>"
			data-aos-context-label="<?php echo esc_attr( $admin_os_mode_app['label'] ); ?>"
			data-aos-open-app="<?php echo esc_attr( $admin_os_mode_app['id'] ); ?>"
			aria-label="<?php echo esc_attr( $admin_os_mode_app['label'] ); ?>"
		>
			<span class="aos-app-icon">
				<?php Admin_OS_Mode_Icon_Renderer::render( $admin_os_mode_app['icon'], $theme ); ?>
			</span>
			<span class="aos-desktop-app-label"><?php echo esc_html( $admin_os_mode_app['label'] ); ?></span>
		</button>
	<?php endforeach; ?>
</section>
