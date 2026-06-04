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
 * @var array<int,array<string,mixed>>  $widgets
 * @var array<int,array<string,string>> $folders
 * @var array<int,array<string,string>> $stats
 * @var WP_Post[]                       $recents
 * @var string                          $classic_link
 * @var string                          $classic_once
 * @var string                          $site_name
 * @var array<string,mixed>             $theme
 */
$admin_os_mode_shell_style = '';
if ( ! empty( $theme['media']['wallpaper']['url'] ) ) {
	$admin_os_mode_wallpaper_url = str_replace(
		array( '"', '\\' ),
		array( '%22', '%5C' ),
		esc_url_raw( $theme['media']['wallpaper']['url'] )
	);

	if ( '' !== $admin_os_mode_wallpaper_url ) {
		$admin_os_mode_shell_style = '--aos-wallpaper-image:url("' . $admin_os_mode_wallpaper_url . '");';
	}
}
?>
<div class="aos-shell" data-admin-os-shell data-aos-theme="<?php echo esc_attr( $theme['id'] ); ?>" data-aos-theme-family="<?php echo esc_attr( $theme['family'] ); ?>" data-aos-theme-version="<?php echo esc_attr( $theme['version'] ); ?>"<?php if ( $admin_os_mode_shell_style ) : ?> style="<?php echo esc_attr( $admin_os_mode_shell_style ); ?>"<?php endif; ?>>
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
			'widgets'      => $widgets,
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
