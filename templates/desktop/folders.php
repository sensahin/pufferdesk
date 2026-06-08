<?php
/**
 * Desktop folder icons.
 *
 * @package WPAdminOS
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
<section class="aos-desktop-folders aos-desktop-icon-layer" aria-label="<?php esc_attr_e( 'Desktop folders', 'wp-adminos' ); ?>">
	<?php foreach ( $folders as $wp_adminos_folder ) : ?>
		<button
			type="button"
			class="aos-desktop-icon aos-desktop-folder"
			data-aos-context="desktop-folder"
			data-aos-context-id="<?php echo esc_attr( $wp_adminos_folder['id'] ); ?>"
			data-aos-context-label="<?php echo esc_attr( $wp_adminos_folder['label'] ); ?>"
			data-aos-desktop-icon
			data-aos-desktop-icon-id="<?php echo esc_attr( 'folder:' . $wp_adminos_folder['id'] ); ?>"
			data-aos-desktop-icon-kind="folder"
			data-aos-open-folder="<?php echo esc_attr( $wp_adminos_folder['id'] ); ?>"
			aria-label="<?php echo esc_attr( $wp_adminos_folder['label'] ); ?>"
		>
			<span class="aos-app-icon">
				<?php WP_AdminOS_Icon_Renderer::render( $wp_adminos_folder['icon'], $theme ); ?>
			</span>
			<span class="aos-desktop-app-label"><?php echo esc_html( $wp_adminos_folder['label'] ); ?></span>
		</button>
	<?php endforeach; ?>
</section>
