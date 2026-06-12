<?php
/**
 * Desktop widget layer.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * @var array<int,array<string,mixed>> $widgets
 * @var array<string,string>           $labels
 * @var array<string,mixed>            $theme
 * @var array<string,mixed>            $workspace_state
 */

if ( empty( $widgets ) ) {
	return;
}
$pufferdesk_labels = isset( $labels ) && is_array( $labels ) ? $labels : PufferDesk_Runtime_Config::get_shell_template_labels( isset( $theme ) && is_array( $theme ) ? $theme : array() );
?>
<section class="pdk-widget-layer" aria-label="<?php echo esc_attr( isset( $pufferdesk_labels['desktop_widgets'] ) ? $pufferdesk_labels['desktop_widgets'] : 'desktop_widgets' ); ?>">
	<?php foreach ( $widgets as $pufferdesk_widget ) : ?>
		<?php
		$pufferdesk_template = isset( $pufferdesk_widget['template'] ) ? $pufferdesk_widget['template'] : 'widgets/generic.php';
		if ( ! $this->template_exists( $pufferdesk_template, $theme ) ) {
			$pufferdesk_template = 'widgets/generic.php';
		}

		$this->render_part(
			$pufferdesk_template,
			array(
				'widget'          => $pufferdesk_widget,
				'theme'           => $theme,
				'workspace_state' => isset( $workspace_state ) && is_array( $workspace_state ) ? $workspace_state : array(),
			)
		);
		?>
	<?php endforeach; ?>
</section>
