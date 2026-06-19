<?php
/**
 * Generic desktop widget.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Template variables.
 *
 * @var array<string,mixed> $widget
 * @var array<string,mixed> $theme
 * @var array<string,mixed> $workspace_state
 */

?>
<section
	class="pdk-widget"
	data-pdk-context="<?php echo esc_attr( PufferDesk_Context_Menu_Contracts::TARGET_WIDGET ); ?>"
	data-pdk-context-id="<?php echo esc_attr( $widget['id'] ); ?>"
	data-pdk-context-label="<?php echo esc_attr( $widget['label'] ); ?>"
	data-pdk-widget="<?php echo esc_attr( $widget['id'] ); ?>"
	data-pdk-widget-kind="<?php echo esc_attr( $widget['kind'] ); ?>"
	data-pdk-widget-native="<?php echo esc_attr( $widget['native'] ); ?>"
	<?php PufferDesk_Widget_Layout::render_attributes( $widget, isset( $workspace_state ) && is_array( $workspace_state ) ? $workspace_state : array() ); ?>
	aria-label="<?php echo esc_attr( $widget['label'] ); ?>"
>
	<div class="pdk-widget-handle" data-pdk-widget-drag-handle>
		<span class="pdk-widget-icon"><?php PufferDesk_Icon_Renderer::render( $widget['icon'], $theme ); ?></span>
		<strong><?php echo esc_html( $widget['label'] ); ?></strong>
	</div>
</section>
