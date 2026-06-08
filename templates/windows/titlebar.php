<?php
/**
 * Window titlebar.
 *
 * @package WPAdminOS
 */

defined( 'ABSPATH' ) || exit;

?>
<div class="aos-window-titlebar" data-aos-drag-handle>
	<div class="aos-window-controls">
		<button type="button" class="aos-window-control aos-window-control-close" data-aos-close aria-label="<?php esc_attr_e( 'Close', 'wp-adminos' ); ?>"></button>
		<button type="button" class="aos-window-control aos-window-control-minimize" data-aos-minimize aria-label="<?php esc_attr_e( 'Minimize', 'wp-adminos' ); ?>"></button>
		<button type="button" class="aos-window-control aos-window-control-maximize" data-aos-maximize aria-label="<?php esc_attr_e( 'Maximize', 'wp-adminos' ); ?>"></button>
	</div>
</div>
