<?php
/**
 * Desktop folder icons.
 *
 * @package AdminOSMode
 */

defined( 'ABSPATH' ) || exit;

/**
 * @var array<int,array<string,string>> $folders
 * @var array<string,mixed>             $theme
 */

if ( empty( $folders ) ) {
	return;
}
?>
<section class="aos-desktop-folders aos-desktop-icon-layer" aria-label="<?php esc_attr_e( 'Desktop folders', 'admin-os-mode' ); ?>">
	<?php foreach ( $folders as $admin_os_mode_folder ) : ?>
		<button
			type="button"
			class="aos-desktop-icon aos-desktop-folder"
			data-aos-context="desktop-folder"
			data-aos-context-id="<?php echo esc_attr( $admin_os_mode_folder['id'] ); ?>"
			data-aos-context-label="<?php echo esc_attr( $admin_os_mode_folder['label'] ); ?>"
			data-aos-desktop-icon
			data-aos-desktop-icon-id="<?php echo esc_attr( 'folder:' . $admin_os_mode_folder['id'] ); ?>"
			data-aos-desktop-icon-kind="folder"
			data-aos-open-folder="<?php echo esc_attr( $admin_os_mode_folder['id'] ); ?>"
			aria-label="<?php echo esc_attr( $admin_os_mode_folder['label'] ); ?>"
		>
			<span class="aos-app-icon">
				<?php Admin_OS_Mode_Icon_Renderer::render( $admin_os_mode_folder['icon'], $theme ); ?>
			</span>
			<span class="aos-desktop-app-label"><?php echo esc_html( $admin_os_mode_folder['label'] ); ?></span>
		</button>
	<?php endforeach; ?>
</section>
