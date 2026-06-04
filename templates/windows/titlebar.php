<?php
/**
 * Window titlebar.
 *
 * @package AdminOSMode
 */

defined( 'ABSPATH' ) || exit;

/**
 * @var string $title
 */
?>
<div class="aos-window-titlebar" data-aos-drag-handle>
	<div class="aos-window-controls" aria-hidden="true">
		<span></span><span></span><span></span>
	</div>
	<strong><?php echo esc_html( $title ); ?></strong>
	<div class="aos-window-actions">
		<button type="button" data-aos-minimize title="<?php esc_attr_e( 'Minimize', 'admin-os-mode' ); ?>"><span class="dashicons dashicons-minus"></span></button>
		<button type="button" data-aos-maximize title="<?php esc_attr_e( 'Maximize', 'admin-os-mode' ); ?>"><span class="dashicons dashicons-fullscreen-alt"></span></button>
	</div>
</div>
