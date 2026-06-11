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
		'order'     => PufferDesk_Window_Chrome_Contracts::get_control_ids(),
		'placement' => PufferDesk_Window_Chrome_Contracts::PLACEMENT_LEFT,
		'style'     => PufferDesk_Window_Chrome_Contracts::STYLE_TRAFFIC,
	)
);
$pufferdesk_title_config = wp_parse_args(
	isset( $pufferdesk_chrome['title'] ) && is_array( $pufferdesk_chrome['title'] ) ? $pufferdesk_chrome['title'] : array(),
	array(
		'alignment' => PufferDesk_Window_Chrome_Contracts::TITLE_ALIGNMENT_LEFT,
		'show_icon' => true,
	)
);
$pufferdesk_control_labels = wp_parse_args(
	isset( $pufferdesk_controls['labels'] ) && is_array( $pufferdesk_controls['labels'] ) ? $pufferdesk_controls['labels'] : array(),
	PufferDesk_Window_Chrome_Contracts::default_config()['controls']['labels']
);
$pufferdesk_control_order = isset( $pufferdesk_controls['order'] ) && is_array( $pufferdesk_controls['order'] )
	? array_values( array_intersect( $pufferdesk_controls['order'], PufferDesk_Window_Chrome_Contracts::get_control_ids() ) )
	: PufferDesk_Window_Chrome_Contracts::get_control_ids();
if ( empty( $pufferdesk_control_order ) ) {
	$pufferdesk_control_order = PufferDesk_Window_Chrome_Contracts::get_control_ids();
}
$pufferdesk_control_actions = PufferDesk_Window_Chrome_Contracts::get_control_dataset_attributes();
$pufferdesk_render_controls = static function ( $pufferdesk_control_order, $pufferdesk_control_actions, $pufferdesk_control_labels ) {
	?>
	<div class="pdk-window-controls">
		<?php foreach ( $pufferdesk_control_order as $pufferdesk_control ) : ?>
			<button type="button" class="pdk-window-control pdk-window-control-<?php echo esc_attr( $pufferdesk_control ); ?>" <?php echo esc_attr( $pufferdesk_control_actions[ $pufferdesk_control ] ); ?> aria-label="<?php echo esc_attr( $pufferdesk_control_labels[ $pufferdesk_control ] ); ?>">
				<span class="pdk-window-control-label"><?php echo esc_html( $pufferdesk_control_labels[ $pufferdesk_control ] ); ?></span>
			</button>
		<?php endforeach; ?>
	</div>
	<?php
};
$pufferdesk_placement = in_array( $pufferdesk_controls['placement'], PufferDesk_Window_Chrome_Contracts::get_control_placements(), true ) ? $pufferdesk_controls['placement'] : PufferDesk_Window_Chrome_Contracts::PLACEMENT_LEFT;
$pufferdesk_style     = in_array( $pufferdesk_controls['style'], PufferDesk_Window_Chrome_Contracts::get_control_styles(), true ) ? $pufferdesk_controls['style'] : PufferDesk_Window_Chrome_Contracts::STYLE_TRAFFIC;
$pufferdesk_alignment = in_array( $pufferdesk_title_config['alignment'], PufferDesk_Window_Chrome_Contracts::get_title_alignments(), true ) ? $pufferdesk_title_config['alignment'] : PufferDesk_Window_Chrome_Contracts::TITLE_ALIGNMENT_LEFT;
$pufferdesk_title     = isset( $title ) ? (string) $title : '';
?>
<div
	class="pdk-window-titlebar"
	data-pdk-drag-handle
	data-pdk-window-controls-placement="<?php echo esc_attr( $pufferdesk_placement ); ?>"
	data-pdk-window-controls-style="<?php echo esc_attr( $pufferdesk_style ); ?>"
	data-pdk-window-title-alignment="<?php echo esc_attr( $pufferdesk_alignment ); ?>"
>
	<?php if ( PufferDesk_Window_Chrome_Contracts::PLACEMENT_RIGHT !== $pufferdesk_placement ) : ?>
		<?php $pufferdesk_render_controls( $pufferdesk_control_order, $pufferdesk_control_actions, $pufferdesk_control_labels ); ?>
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
	<?php if ( PufferDesk_Window_Chrome_Contracts::PLACEMENT_RIGHT === $pufferdesk_placement ) : ?>
		<?php $pufferdesk_render_controls( $pufferdesk_control_order, $pufferdesk_control_actions, $pufferdesk_control_labels ); ?>
	<?php endif; ?>
</div>
