<?php
/**
 * Window titlebar.
 *
 * @package WPAdminOS
 */

defined( 'ABSPATH' ) || exit;

/**
 * @var array<string,mixed> $theme
 * @var array<string,mixed> $window_chrome
 * @var string              $title
 * @var mixed               $icon
 */
$wp_adminos_chrome = wp_parse_args(
	isset( $window_chrome ) && is_array( $window_chrome ) ? $window_chrome : ( isset( $theme['window_chrome'] ) && is_array( $theme['window_chrome'] ) ? $theme['window_chrome'] : array() ),
	array(
		'controls' => array(),
		'title'    => array(),
	)
);
$wp_adminos_controls = wp_parse_args(
	isset( $wp_adminos_chrome['controls'] ) && is_array( $wp_adminos_chrome['controls'] ) ? $wp_adminos_chrome['controls'] : array(),
	array(
		'labels'    => array(),
		'order'     => array( 'close', 'minimize', 'maximize' ),
		'placement' => 'left',
		'style'     => 'traffic',
	)
);
$wp_adminos_title_config = wp_parse_args(
	isset( $wp_adminos_chrome['title'] ) && is_array( $wp_adminos_chrome['title'] ) ? $wp_adminos_chrome['title'] : array(),
	array(
		'alignment' => 'left',
		'show_icon' => true,
	)
);
$wp_adminos_control_labels = wp_parse_args(
	isset( $wp_adminos_controls['labels'] ) && is_array( $wp_adminos_controls['labels'] ) ? $wp_adminos_controls['labels'] : array(),
	array(
		'close'    => __( 'Close', 'wp-adminos' ),
		'minimize' => __( 'Minimize', 'wp-adminos' ),
		'maximize' => __( 'Maximize', 'wp-adminos' ),
	)
);
$wp_adminos_control_order = isset( $wp_adminos_controls['order'] ) && is_array( $wp_adminos_controls['order'] )
	? array_values( array_intersect( $wp_adminos_controls['order'], array( 'close', 'minimize', 'maximize' ) ) )
	: array( 'close', 'minimize', 'maximize' );
if ( empty( $wp_adminos_control_order ) ) {
	$wp_adminos_control_order = array( 'close', 'minimize', 'maximize' );
}
$wp_adminos_control_actions = array(
	'close'    => 'data-aos-close',
	'minimize' => 'data-aos-minimize',
	'maximize' => 'data-aos-maximize',
);
$wp_adminos_placement = in_array( $wp_adminos_controls['placement'], array( 'left', 'right' ), true ) ? $wp_adminos_controls['placement'] : 'left';
$wp_adminos_style     = in_array( $wp_adminos_controls['style'], array( 'traffic', 'caption', 'toolbar', 'hidden' ), true ) ? $wp_adminos_controls['style'] : 'traffic';
$wp_adminos_alignment = in_array( $wp_adminos_title_config['alignment'], array( 'left', 'center', 'right' ), true ) ? $wp_adminos_title_config['alignment'] : 'left';
$wp_adminos_title     = isset( $title ) ? (string) $title : '';
?>
<div
	class="aos-window-titlebar"
	data-aos-drag-handle
	data-aos-window-controls-placement="<?php echo esc_attr( $wp_adminos_placement ); ?>"
	data-aos-window-controls-style="<?php echo esc_attr( $wp_adminos_style ); ?>"
	data-aos-window-title-alignment="<?php echo esc_attr( $wp_adminos_alignment ); ?>"
>
	<?php if ( 'right' !== $wp_adminos_placement ) : ?>
		<div class="aos-window-controls">
			<?php foreach ( $wp_adminos_control_order as $wp_adminos_control ) : ?>
				<button type="button" class="aos-window-control aos-window-control-<?php echo esc_attr( $wp_adminos_control ); ?>" <?php echo esc_attr( $wp_adminos_control_actions[ $wp_adminos_control ] ); ?> aria-label="<?php echo esc_attr( $wp_adminos_control_labels[ $wp_adminos_control ] ); ?>">
					<span class="aos-window-control-label"><?php echo esc_html( $wp_adminos_control_labels[ $wp_adminos_control ] ); ?></span>
				</button>
			<?php endforeach; ?>
		</div>
	<?php endif; ?>
	<?php if ( '' !== $wp_adminos_title ) : ?>
		<span class="aos-window-titlebar-label">
			<?php if ( ! empty( $wp_adminos_title_config['show_icon'] ) && isset( $icon ) && $icon ) : ?>
				<span class="aos-window-titlebar-label-icon">
					<?php WP_AdminOS_Icon_Renderer::render( $icon, isset( $theme ) && is_array( $theme ) ? $theme : array() ); ?>
				</span>
			<?php endif; ?>
			<span class="aos-window-titlebar-label-text"><?php echo esc_html( $wp_adminos_title ); ?></span>
		</span>
	<?php endif; ?>
	<?php if ( 'right' === $wp_adminos_placement ) : ?>
		<div class="aos-window-controls">
			<?php foreach ( $wp_adminos_control_order as $wp_adminos_control ) : ?>
				<button type="button" class="aos-window-control aos-window-control-<?php echo esc_attr( $wp_adminos_control ); ?>" <?php echo esc_attr( $wp_adminos_control_actions[ $wp_adminos_control ] ); ?> aria-label="<?php echo esc_attr( $wp_adminos_control_labels[ $wp_adminos_control ] ); ?>">
					<span class="aos-window-control-label"><?php echo esc_html( $wp_adminos_control_labels[ $wp_adminos_control ] ); ?></span>
				</button>
			<?php endforeach; ?>
		</div>
	<?php endif; ?>
</div>
