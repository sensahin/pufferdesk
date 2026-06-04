<?php
/**
 * Window titlebar.
 *
 * @package AdminOSMode
 */

defined( 'ABSPATH' ) || exit;

?>
<div class="aos-window-titlebar" data-aos-drag-handle>
	<div class="aos-window-controls">
		<button type="button" class="aos-window-control aos-window-control-close" data-aos-close aria-label="<?php esc_attr_e( 'Close', 'admin-os-mode' ); ?>" title="<?php esc_attr_e( 'Close', 'admin-os-mode' ); ?>"></button>
		<button type="button" class="aos-window-control aos-window-control-minimize" data-aos-minimize aria-label="<?php esc_attr_e( 'Minimize', 'admin-os-mode' ); ?>" title="<?php esc_attr_e( 'Minimize', 'admin-os-mode' ); ?>"></button>
		<button type="button" class="aos-window-control aos-window-control-maximize" data-aos-maximize aria-label="<?php esc_attr_e( 'Maximize', 'admin-os-mode' ); ?>" title="<?php esc_attr_e( 'Maximize', 'admin-os-mode' ); ?>"></button>
	</div>
</div>
