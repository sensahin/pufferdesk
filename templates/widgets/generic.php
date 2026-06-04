<?php
/**
 * Generic desktop widget.
 *
 * @package AdminOSMode
 */

defined( 'ABSPATH' ) || exit;

/**
 * @var array<string,mixed> $widget
 * @var array<string,mixed> $theme
 */

?>
<section
	class="aos-widget"
	data-aos-widget="<?php echo esc_attr( $widget['id'] ); ?>"
	data-aos-widget-kind="<?php echo esc_attr( $widget['kind'] ); ?>"
	data-aos-widget-native="<?php echo esc_attr( $widget['native'] ); ?>"
	<?php Admin_OS_Mode_Widget_Layout::render_attributes( $widget ); ?>
	aria-label="<?php echo esc_attr( $widget['label'] ); ?>"
>
	<div class="aos-widget-handle" data-aos-widget-drag-handle>
		<span class="aos-widget-icon"><?php Admin_OS_Mode_Icon_Renderer::render( $widget['icon'], $theme ); ?></span>
		<strong><?php echo esc_html( $widget['label'] ); ?></strong>
	</div>
</section>
