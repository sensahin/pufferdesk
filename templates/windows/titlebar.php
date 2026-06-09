<?php
/**
 * Window titlebar.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * @var array<string,mixed> $theme
 * @var array<string,mixed> $window_chrome
 * @var string              $title
 * @var mixed               $icon
 */
$pufferdesk_chrome = wp_parse_args(
	isset( $window_chrome ) && is_array( $window_chrome ) ? $window_chrome : ( isset( $theme['window_chrome'] ) && is_array( $theme['window_chrome'] ) ? $theme['window_chrome'] : array() ),
	array(
		'controls' => array(),
		'title'    => array(),
	)
);
$pufferdesk_controls = wp_parse_args(
	isset( $pufferdesk_chrome['controls'] ) && is_array( $pufferdesk_chrome['controls'] ) ? $pufferdesk_chrome['controls'] : array(),
	array(
		'labels'    => array(),
		'order'     => array( 'close', 'minimize', 'maximize' ),
		'placement' => 'left',
		'style'     => 'traffic',
	)
);
$pufferdesk_title_config = wp_parse_args(
	isset( $pufferdesk_chrome['title'] ) && is_array( $pufferdesk_chrome['title'] ) ? $pufferdesk_chrome['title'] : array(),
	array(
		'alignment' => 'left',
		'show_icon' => true,
	)
);
$pufferdesk_control_labels = wp_parse_args(
	isset( $pufferdesk_controls['labels'] ) && is_array( $pufferdesk_controls['labels'] ) ? $pufferdesk_controls['labels'] : array(),
	array(
		'close'    => __( 'Close', 'pufferdesk-admin-desktop' ),
		'minimize' => __( 'Minimize', 'pufferdesk-admin-desktop' ),
		'maximize' => __( 'Maximize', 'pufferdesk-admin-desktop' ),
	)
);
$pufferdesk_control_order = isset( $pufferdesk_controls['order'] ) && is_array( $pufferdesk_controls['order'] )
	? array_values( array_intersect( $pufferdesk_controls['order'], array( 'close', 'minimize', 'maximize' ) ) )
	: array( 'close', 'minimize', 'maximize' );
if ( empty( $pufferdesk_control_order ) ) {
	$pufferdesk_control_order = array( 'close', 'minimize', 'maximize' );
}
$pufferdesk_control_actions = array(
	'close'    => 'data-pdk-close',
	'minimize' => 'data-pdk-minimize',
	'maximize' => 'data-pdk-maximize',
);
$pufferdesk_placement = in_array( $pufferdesk_controls['placement'], array( 'left', 'right' ), true ) ? $pufferdesk_controls['placement'] : 'left';
$pufferdesk_style     = in_array( $pufferdesk_controls['style'], array( 'traffic', 'caption', 'toolbar', 'hidden' ), true ) ? $pufferdesk_controls['style'] : 'traffic';
$pufferdesk_alignment = in_array( $pufferdesk_title_config['alignment'], array( 'left', 'center', 'right' ), true ) ? $pufferdesk_title_config['alignment'] : 'left';
$pufferdesk_title     = isset( $title ) ? (string) $title : '';
?>
<div
	class="pdk-window-titlebar"
	data-pdk-drag-handle
	data-pdk-window-controls-placement="<?php echo esc_attr( $pufferdesk_placement ); ?>"
	data-pdk-window-controls-style="<?php echo esc_attr( $pufferdesk_style ); ?>"
	data-pdk-window-title-alignment="<?php echo esc_attr( $pufferdesk_alignment ); ?>"
>
	<?php if ( 'right' !== $pufferdesk_placement ) : ?>
		<div class="pdk-window-controls">
			<?php foreach ( $pufferdesk_control_order as $pufferdesk_control ) : ?>
				<button type="button" class="pdk-window-control pdk-window-control-<?php echo esc_attr( $pufferdesk_control ); ?>" <?php echo esc_attr( $pufferdesk_control_actions[ $pufferdesk_control ] ); ?> aria-label="<?php echo esc_attr( $pufferdesk_control_labels[ $pufferdesk_control ] ); ?>">
					<span class="pdk-window-control-label"><?php echo esc_html( $pufferdesk_control_labels[ $pufferdesk_control ] ); ?></span>
				</button>
			<?php endforeach; ?>
		</div>
	<?php endif; ?>
	<?php if ( '' !== $pufferdesk_title ) : ?>
		<span class="pdk-window-titlebar-label">
			<?php if ( ! empty( $pufferdesk_title_config['show_icon'] ) && isset( $icon ) && $icon ) : ?>
				<span class="pdk-window-titlebar-label-icon">
					<?php PufferDesk_Icon_Renderer::render( $icon, isset( $theme ) && is_array( $theme ) ? $theme : array() ); ?>
				</span>
			<?php endif; ?>
			<span class="pdk-window-titlebar-label-text"><?php echo esc_html( $pufferdesk_title ); ?></span>
		</span>
	<?php endif; ?>
	<?php if ( 'right' === $pufferdesk_placement ) : ?>
		<div class="pdk-window-controls">
			<?php foreach ( $pufferdesk_control_order as $pufferdesk_control ) : ?>
				<button type="button" class="pdk-window-control pdk-window-control-<?php echo esc_attr( $pufferdesk_control ); ?>" <?php echo esc_attr( $pufferdesk_control_actions[ $pufferdesk_control ] ); ?> aria-label="<?php echo esc_attr( $pufferdesk_control_labels[ $pufferdesk_control ] ); ?>">
					<span class="pdk-window-control-label"><?php echo esc_html( $pufferdesk_control_labels[ $pufferdesk_control ] ); ?></span>
				</button>
			<?php endforeach; ?>
		</div>
	<?php endif; ?>
</div>
