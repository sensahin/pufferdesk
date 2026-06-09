<?php
/**
 * Clock desktop widget.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * @var array<string,mixed> $widget
 * @var array<string,mixed> $theme
 * @var array<string,mixed> $workspace_state
 */

$pufferdesk_time = current_time( 'timestamp' );
?>
<section
	class="pdk-widget pdk-clock-widget"
	data-pdk-context="widget"
	data-pdk-context-id="<?php echo esc_attr( $widget['id'] ); ?>"
	data-pdk-context-label="<?php echo esc_attr( $widget['label'] ); ?>"
	data-pdk-widget="<?php echo esc_attr( $widget['id'] ); ?>"
	data-pdk-widget-kind="<?php echo esc_attr( $widget['kind'] ); ?>"
	data-pdk-widget-native="<?php echo esc_attr( $widget['native'] ); ?>"
	data-pdk-widget-refresh="<?php echo esc_attr( $widget['refresh_interval'] ); ?>"
	<?php PufferDesk_Widget_Layout::render_attributes( $widget, isset( $workspace_state ) && is_array( $workspace_state ) ? $workspace_state : array() ); ?>
	aria-label="<?php echo esc_attr( $widget['label'] ); ?>"
>
	<div class="pdk-clock-widget-face" data-pdk-widget-drag-handle>
		<time class="pdk-widget-clock-time" data-pdk-widget-clock datetime="<?php echo esc_attr( wp_date( DATE_W3C, $pufferdesk_time ) ); ?>">
			<?php echo esc_html( wp_date( get_option( 'time_format' ), $pufferdesk_time ) ); ?>
		</time>
		<time class="pdk-widget-clock-date" data-pdk-widget-clock-date datetime="<?php echo esc_attr( wp_date( 'Y-m-d', $pufferdesk_time ) ); ?>">
			<?php echo esc_html( wp_date( 'D, M j', $pufferdesk_time ) ); ?>
		</time>
	</div>
</section>
