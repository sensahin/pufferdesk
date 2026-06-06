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
 * @var string                          $site_name
 * @var array<string,mixed>             $theme
 * @var array<string,mixed>             $wallpaper
 */
$admin_os_mode_shell_style_parts = array();
if ( ! empty( $wallpaper['css_variables'] ) && is_array( $wallpaper['css_variables'] ) ) {
	foreach ( $wallpaper['css_variables'] as $admin_os_mode_wallpaper_name => $admin_os_mode_wallpaper_value ) {
		if ( ! preg_match( '/^--aos-wallpaper-(image|size|position|repeat)$/', (string) $admin_os_mode_wallpaper_name ) ) {
			continue;
		}

		$admin_os_mode_wallpaper_value = str_replace( ';', '', (string) $admin_os_mode_wallpaper_value );
		if ( '' !== $admin_os_mode_wallpaper_value ) {
			$admin_os_mode_shell_style_parts[] = $admin_os_mode_wallpaper_name . ':' . $admin_os_mode_wallpaper_value;
		}
	}
}
$admin_os_mode_shell_style = implode( ';', $admin_os_mode_shell_style_parts );

$admin_os_mode_appearance = wp_parse_args(
	is_array( $appearance ) ? $appearance : array(),
	array(
		'mode'              => 'auto',
		'window_material'   => 'clear',
		'accent_color'      => 'multicolor',
		'icon_widget_style' => 'default',
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
	'data-aos-wallpaper-type'     => ! empty( $wallpaper['preference']['type'] ) ? $wallpaper['preference']['type'] : '',
	'data-aos-wallpaper-id'       => ! empty( $wallpaper['preference']['id'] ) ? $wallpaper['preference']['id'] : '',
	'data-aos-appearance-mode'    => $admin_os_mode_appearance['mode'],
	'data-aos-effective-appearance' => $admin_os_mode_effective_appearance,
	'data-aos-window-material'    => $admin_os_mode_appearance['window_material'],
	'data-aos-accent-color'       => $admin_os_mode_appearance['accent_color'],
	'data-aos-icon-widget-style'  => $admin_os_mode_appearance['icon_widget_style'],
	'data-aos-tint-windows'       => ! empty( $admin_os_mode_appearance['tint_windows'] ) ? '1' : '0',
);
if ( $admin_os_mode_shell_style ) {
	$admin_os_mode_shell_attributes['style'] = $admin_os_mode_shell_style;
}
?>
<div <?php foreach ( $admin_os_mode_shell_attributes as $admin_os_mode_attribute => $admin_os_mode_value ) : ?><?php echo esc_attr( $admin_os_mode_attribute ); ?><?php if ( '' !== $admin_os_mode_value ) : ?>="<?php echo esc_attr( $admin_os_mode_value ); ?>"<?php endif; ?> <?php endforeach; ?>>
	<?php
	$this->render_part(
		'shell/menu-bar.php',
		array(
			'site_name' => $site_name,
		)
	);

	$this->render_part(
		'shell/desktop.php',
		array(
			'apps'    => $apps,
			'widgets' => $widgets,
			'folders' => $folders,
			'theme'   => $theme,
		)
	);
	?>
</div>
