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
 * @var array<string,mixed>             $appearance
 * @var array<int,array<string,string>> $apps
 * @var array<int,array<string,mixed>>  $widgets
 * @var array<int,array<string,string>> $folders
 * @var array<int,array<string,string>> $stats
 * @var WP_Post[]                       $recents
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

$admin_os_mode_appearance = wp_parse_args(
	is_array( $appearance ) ? $appearance : array(),
	array(
		'mode'              => 'light',
		'window_material'   => 'clear',
		'accent_color'      => 'multicolor',
		'highlight_color'   => 'automatic',
		'icon_widget_style' => 'default',
		'folder_color'      => 'automatic',
		'tint_windows'      => true,
	)
);
$admin_os_mode_effective_appearance = 'dark' === $admin_os_mode_appearance['mode'] ? 'dark' : 'light';
$admin_os_mode_shell_attributes     = array(
	'class'                       => 'aos-shell',
	'data-admin-os-shell'         => '',
	'data-aos-theme'              => $theme['id'],
	'data-aos-theme-family'       => $theme['family'],
	'data-aos-theme-version'      => $theme['version'],
	'data-aos-appearance-mode'    => $admin_os_mode_appearance['mode'],
	'data-aos-effective-appearance' => $admin_os_mode_effective_appearance,
	'data-aos-window-material'    => $admin_os_mode_appearance['window_material'],
	'data-aos-accent-color'       => $admin_os_mode_appearance['accent_color'],
	'data-aos-highlight-color'    => $admin_os_mode_appearance['highlight_color'],
	'data-aos-icon-widget-style'  => $admin_os_mode_appearance['icon_widget_style'],
	'data-aos-folder-color'       => $admin_os_mode_appearance['folder_color'],
	'data-aos-tint-windows'       => ! empty( $admin_os_mode_appearance['tint_windows'] ) ? '1' : '0',
);
if ( $admin_os_mode_shell_style ) {
	$admin_os_mode_shell_attributes['style'] = $admin_os_mode_shell_style;
}
?>
<div <?php foreach ( $admin_os_mode_shell_attributes as $admin_os_mode_attribute => $admin_os_mode_value ) : ?><?php echo esc_attr( $admin_os_mode_attribute ); ?><?php if ( '' !== $admin_os_mode_value ) : ?>="<?php echo esc_attr( $admin_os_mode_value ); ?>"<?php endif; ?> <?php endforeach; ?>>
	<?php
	$this->render_part(
		'shell/menu-bar.php'
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
