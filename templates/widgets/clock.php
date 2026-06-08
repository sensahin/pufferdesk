<?php
/**
 * Clock desktop widget.
 *
 * @package WPAdminOS
 */

defined( 'ABSPATH' ) || exit;

/**
 * @var array<string,mixed> $widget
 * @var array<string,mixed> $theme
 */

$wp_adminos_time = current_time( 'timestamp' );
?>
<section
	class="aos-widget aos-clock-widget"
	data-aos-context="widget"
	data-aos-context-id="<?php echo esc_attr( $widget['id'] ); ?>"
	data-aos-context-label="<?php echo esc_attr( $widget['label'] ); ?>"
	data-aos-widget="<?php echo esc_attr( $widget['id'] ); ?>"
	data-aos-widget-kind="<?php echo esc_attr( $widget['kind'] ); ?>"
	data-aos-widget-native="<?php echo esc_attr( $widget['native'] ); ?>"
	data-aos-widget-refresh="<?php echo esc_attr( $widget['refresh_interval'] ); ?>"
	<?php WP_AdminOS_Widget_Layout::render_attributes( $widget ); ?>
	aria-label="<?php echo esc_attr( $widget['label'] ); ?>"
>
	<div class="aos-widget-handle" data-aos-widget-drag-handle>
		<span class="aos-widget-icon"><?php WP_AdminOS_Icon_Renderer::render( $widget['icon'], $theme ); ?></span>
		<strong><?php echo esc_html( $widget['label'] ); ?></strong>
	</div>
	<time class="aos-widget-clock-time" data-aos-widget-clock datetime="<?php echo esc_attr( wp_date( DATE_W3C, $wp_adminos_time ) ); ?>">
		<?php echo esc_html( wp_date( get_option( 'time_format' ), $wp_adminos_time ) ); ?>
	</time>
	<time class="aos-widget-clock-date" data-aos-widget-clock-date datetime="<?php echo esc_attr( wp_date( 'Y-m-d', $wp_adminos_time ) ); ?>">
		<?php echo esc_html( wp_date( get_option( 'date_format' ), $wp_adminos_time ) ); ?>
	</time>
</section>
