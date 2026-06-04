<?php
/**
 * Desktop widget layer.
 *
 * @package AdminOSMode
 */

defined( 'ABSPATH' ) || exit;

/**
 * @var array<int,array<string,mixed>> $widgets
 * @var array<string,mixed>            $theme
 */

if ( empty( $widgets ) ) {
	return;
}
?>
<section class="aos-widget-layer" aria-label="<?php esc_attr_e( 'Desktop widgets', 'admin-os-mode' ); ?>">
	<?php foreach ( $widgets as $admin_os_mode_widget ) : ?>
		<?php
		$admin_os_mode_template = isset( $admin_os_mode_widget['template'] ) ? $admin_os_mode_widget['template'] : 'widgets/generic.php';
		if ( ! $this->template_exists( $admin_os_mode_template, $theme ) ) {
			$admin_os_mode_template = 'widgets/generic.php';
		}

		$this->render_part(
			$admin_os_mode_template,
			array(
				'widget' => $admin_os_mode_widget,
				'theme'  => $theme,
			)
		);
		?>
	<?php endforeach; ?>
</section>
