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
 * @var array<int,array<string,string>> $stats
 * @var WP_Post[]                       $recents
 * @var string                          $classic_once
 * @var string                          $site_name
 * @var array<string,mixed>             $theme
 */
?>
<main class="aos-desktop" aria-label="<?php esc_attr_e( 'Admin OS desktop', 'admin-os-mode' ); ?>">
	<?php
	$this->render_part(
		'desktop/icons.php',
		array(
			'folders' => $folders,
			'theme'   => $theme,
		)
	);

	$this->render_part(
		'widgets/desktop.php',
		array(
			'widgets' => $widgets,
			'theme'   => $theme,
		)
	);

	$this->render_part(
		'apps/welcome.php',
		array(
			'apps'         => $apps,
			'stats'        => $stats,
			'recents'      => $recents,
			'classic_once' => $classic_once,
			'site_name'    => $site_name,
			'theme'        => $theme,
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
