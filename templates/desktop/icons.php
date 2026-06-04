<?php
/**
 * Desktop folders.
 *
 * @package AdminOSMode
 */

defined( 'ABSPATH' ) || exit;

/**
 * @var array<int,array<string,string>> $folders
 */
?>
<section class="aos-desktop-icons" aria-label="<?php esc_attr_e( 'Desktop folders', 'admin-os-mode' ); ?>">
	<?php foreach ( $folders as $admin_os_mode_folder ) : ?>
		<button type="button" class="aos-desktop-icon" data-aos-open-folder="<?php echo esc_attr( $admin_os_mode_folder['id'] ); ?>">
			<span class="aos-icon-tile"><?php Admin_OS_Mode_Icon_Renderer::render( $admin_os_mode_folder['icon'] ); ?></span>
			<span><?php echo esc_html( $admin_os_mode_folder['label'] ); ?></span>
		</button>
	<?php endforeach; ?>
</section>
