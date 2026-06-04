<?php
/**
 * Main shell template.
 *
 * @package AdminOSMode
 */

defined( 'ABSPATH' ) || exit;

/**
 * Template variables:
 *
 * @var array<int,array<string,string>> $apps
 * @var array<int,array<string,string>> $folders
 * @var array<int,array<string,string>> $stats
 * @var WP_Post[]                       $recents
 * @var string                          $classic_link
 * @var string                          $classic_once
 * @var string                          $site_name
 * @var array<string,mixed>             $theme
 */
?>
<div class="aos-shell" data-admin-os-shell data-aos-theme="<?php echo esc_attr( $theme['id'] ); ?>" data-aos-theme-family="<?php echo esc_attr( $theme['family'] ); ?>" data-aos-theme-version="<?php echo esc_attr( $theme['version'] ); ?>">
	<?php
	$this->render_part(
		'shell/menu-bar.php',
		array(
			'classic_link' => $classic_link,
		)
	);

	$this->render_part(
		'shell/desktop.php',
		array(
			'apps'         => $apps,
			'folders'      => $folders,
			'stats'        => $stats,
			'recents'      => $recents,
			'classic_once' => $classic_once,
			'site_name'    => $site_name,
			'theme'        => $theme,
		)
	);
	?>
</div>
