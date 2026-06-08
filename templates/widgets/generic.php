<?php
/**
 * Generic desktop widget.
 *
 * @package WPAdminOS
 */

defined( 'ABSPATH' ) || exit;

/**
 * @var array<string,mixed> $widget
 * @var array<string,mixed> $theme
 */

?>
<section
	class="aos-widget"
	data-aos-context="widget"
	data-aos-context-id="<?php echo esc_attr( $widget['id'] ); ?>"
	data-aos-context-label="<?php echo esc_attr( $widget['label'] ); ?>"
	data-aos-widget="<?php echo esc_attr( $widget['id'] ); ?>"
	data-aos-widget-kind="<?php echo esc_attr( $widget['kind'] ); ?>"
	data-aos-widget-native="<?php echo esc_attr( $widget['native'] ); ?>"
	<?php WP_AdminOS_Widget_Layout::render_attributes( $widget ); ?>
	aria-label="<?php echo esc_attr( $widget['label'] ); ?>"
>
	<div class="aos-widget-handle" data-aos-widget-drag-handle>
		<span class="aos-widget-icon"><?php WP_AdminOS_Icon_Renderer::render( $widget['icon'], $theme ); ?></span>
		<strong><?php echo esc_html( $widget['label'] ); ?></strong>
	</div>
</section>
