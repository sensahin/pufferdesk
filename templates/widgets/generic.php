<?php
/**
 * Generic desktop widget.
 *
 * @package AdminOSMode
 */

defined( 'ABSPATH' ) || exit;

/**
 * @var array<string,mixed> $widget
 */

$admin_os_mode_position = isset( $widget['default_position'] ) && is_array( $widget['default_position'] ) ? $widget['default_position'] : array();
$admin_os_mode_size     = isset( $widget['default_size'] ) && is_array( $widget['default_size'] ) ? $widget['default_size'] : array();
$admin_os_mode_left     = isset( $admin_os_mode_position['left'] ) ? absint( $admin_os_mode_position['left'] ) : 24;
$admin_os_mode_top      = isset( $admin_os_mode_position['top'] ) ? absint( $admin_os_mode_position['top'] ) : 24;
$admin_os_mode_width    = isset( $admin_os_mode_size['width'] ) ? max( 120, absint( $admin_os_mode_size['width'] ) ) : 220;
$admin_os_mode_height   = isset( $admin_os_mode_size['height'] ) ? max( 80, absint( $admin_os_mode_size['height'] ) ) : 112;
?>
<section
	class="aos-widget"
	data-aos-widget="<?php echo esc_attr( $widget['id'] ); ?>"
	data-aos-widget-kind="<?php echo esc_attr( $widget['kind'] ); ?>"
	data-aos-widget-native="<?php echo esc_attr( $widget['native'] ); ?>"
	data-aos-widget-left="<?php echo esc_attr( $admin_os_mode_left ); ?>"
	data-aos-widget-top="<?php echo esc_attr( $admin_os_mode_top ); ?>"
	data-aos-widget-width="<?php echo esc_attr( $admin_os_mode_width ); ?>"
	data-aos-widget-height="<?php echo esc_attr( $admin_os_mode_height ); ?>"
	style="<?php echo esc_attr( sprintf( 'left:%dpx;top:%dpx;width:%dpx;height:%dpx;', $admin_os_mode_left, $admin_os_mode_top, $admin_os_mode_width, $admin_os_mode_height ) ); ?>"
	aria-label="<?php echo esc_attr( $widget['label'] ); ?>"
>
	<div class="aos-widget-handle" data-aos-widget-drag-handle>
		<span class="aos-widget-icon"><?php Admin_OS_Mode_Icon_Renderer::render( $widget['icon'] ); ?></span>
		<strong><?php echo esc_html( $widget['label'] ); ?></strong>
	</div>
</section>
