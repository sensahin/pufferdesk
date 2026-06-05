<?php
/**
 * Desktop surface template.
 *
 * @package AdminOSMode
 */

defined( 'ABSPATH' ) || exit;

/**
 * @var array<int,array<string,string>> $apps
 * @var array<int,array<string,mixed>>  $widgets
 * @var array<int,array<string,string>> $folders
 * @var array<string,mixed>             $theme
 */
?>
<main
	class="aos-desktop"
	data-aos-context="desktop"
	data-aos-context-id="desktop"
	aria-label="<?php esc_attr_e( 'Admin OS desktop', 'admin-os-mode' ); ?>"
>
	<?php
	$this->render_part(
		'widgets/desktop.php',
		array(
			'widgets' => $widgets,
			'theme'   => $theme,
		)
	);

	$this->render_part(
		'shell/dock.php',
		array(
			'apps' => $apps,
			'theme' => $theme,
		)
	);
	?>
</main>
