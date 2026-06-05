<?php
/**
 * Shell dock.
 *
 * @package AdminOSMode
 */

defined( 'ABSPATH' ) || exit;

/**
 * @var array<int,array<string,string>> $apps
 * @var array<string,mixed>             $theme
 */
?>
<aside class="aos-dock" aria-label="<?php esc_attr_e( 'Admin OS dock', 'admin-os-mode' ); ?>">
	<?php foreach ( $apps as $admin_os_mode_app ) : ?>
		<button
			type="button"
			class="aos-dock-item"
			data-aos-context="dock-app"
			data-aos-context-id="<?php echo esc_attr( $admin_os_mode_app['id'] ); ?>"
			data-aos-context-label="<?php echo esc_attr( $admin_os_mode_app['label'] ); ?>"
			data-aos-open-app="<?php echo esc_attr( $admin_os_mode_app['id'] ); ?>"
			title="<?php echo esc_attr( $admin_os_mode_app['label'] ); ?>"
		>
			<?php Admin_OS_Mode_Icon_Renderer::render( $admin_os_mode_app['icon'], $theme ); ?>
			<span class="screen-reader-text"><?php echo esc_html( $admin_os_mode_app['label'] ); ?></span>
		</button>
	<?php endforeach; ?>
</aside>
