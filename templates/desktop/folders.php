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
 * @var array<string,mixed>             $workspace_state
 */

if ( empty( $folders ) ) {
	return;
}

$wp_adminos_workspace_state        = isset( $workspace_state ) && is_array( $workspace_state ) ? $workspace_state : array();
$wp_adminos_folders_layer_restored = WP_AdminOS_Desktop_Layout::layer_has_saved_icon_positions( $folders, $wp_adminos_workspace_state, 'folder' );
$wp_adminos_folders_layer_class    = 'aos-desktop-folders aos-desktop-icon-layer';
$wp_adminos_folders_layer_class   .= $wp_adminos_folders_layer_restored ? ' is-managed' : '';
?>
<section class="<?php echo esc_attr( $wp_adminos_folders_layer_class ); ?>" aria-label="<?php esc_attr_e( 'Desktop folders', 'wp-adminos' ); ?>">
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
			<?php if ( $wp_adminos_folders_layer_restored ) : ?>
				<?php WP_AdminOS_Desktop_Layout::render_icon_attributes( 'folder:' . $wp_adminos_folder['id'], $wp_adminos_workspace_state ); ?>
			<?php endif; ?>
			aria-label="<?php echo esc_attr( $wp_adminos_folder['label'] ); ?>"
		>
			<span class="aos-app-icon">
				<?php WP_AdminOS_Icon_Renderer::render( $wp_adminos_folder['icon'], $theme ); ?>
			</span>
			<span class="aos-desktop-app-label"><?php echo esc_html( $wp_adminos_folder['label'] ); ?></span>
		</button>
	<?php endforeach; ?>
</section>
