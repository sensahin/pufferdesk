<?php
/**
 * Desktop widget layer.
 *
 * @package WPAdminOS
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
<section class="aos-widget-layer" aria-label="<?php esc_attr_e( 'Desktop widgets', 'wp-adminos' ); ?>">
	<?php foreach ( $widgets as $wp_adminos_widget ) : ?>
		<?php
		$wp_adminos_template = isset( $wp_adminos_widget['template'] ) ? $wp_adminos_widget['template'] : 'widgets/generic.php';
		if ( ! $this->template_exists( $wp_adminos_template, $theme ) ) {
			$wp_adminos_template = 'widgets/generic.php';
		}

		$this->render_part(
			$wp_adminos_template,
			array(
				'widget' => $wp_adminos_widget,
				'theme'  => $theme,
			)
		);
		?>
	<?php endforeach; ?>
</section>
