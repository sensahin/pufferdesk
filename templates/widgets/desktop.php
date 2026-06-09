<?php
/**
 * Desktop widget layer.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * @var array<int,array<string,mixed>> $widgets
 * @var array<string,mixed>            $theme
 * @var array<string,mixed>            $workspace_state
 */

if ( empty( $widgets ) ) {
	return;
}
?>
<section class="pdk-widget-layer" aria-label="<?php esc_attr_e( 'Desktop widgets', 'pufferdesk-admin-desktop' ); ?>">
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
