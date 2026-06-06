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
 * @var array<string,mixed>             $desktop_dock
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

$admin_os_mode_desktop_dock = wp_parse_args(
	is_array( $desktop_dock ) ? $desktop_dock : array(),
	array(
		'dock_size'              => 48,
		'dock_magnification'     => 0,
		'dock_position'          => 'bottom',
		'minimize_animation'     => 'genie',
		'minimize_into_app_icon' => false,
		'auto_hide_dock'         => false,
		'animate_opening_apps'   => true,
		'show_open_indicators'   => true,
		'wallpaper_click'        => 'always',
		'show_widgets_desktop'   => true,
		'dim_widgets'            => 'automatic',
	)
);
$admin_os_mode_dock_size          = max( 28, min( 72, (int) $admin_os_mode_desktop_dock['dock_size'] ) );
$admin_os_mode_dock_magnification = max( 0, min( 24, (int) $admin_os_mode_desktop_dock['dock_magnification'] ) );
$admin_os_mode_dock_icon_size     = max( 18, (int) round( $admin_os_mode_dock_size * 0.56 ) );
$admin_os_mode_dock_lift          = $admin_os_mode_dock_magnification > 0 ? (int) round( 4 + $admin_os_mode_dock_magnification / 3 ) : 0;
$admin_os_mode_dock_scale         = $admin_os_mode_dock_magnification > 0 ? number_format( 1 + $admin_os_mode_dock_magnification / 55, 3, '.', '' ) : '1';
$admin_os_mode_shell_style_parts[] = '--aos-dock-item-size:' . $admin_os_mode_dock_size . 'px';
$admin_os_mode_shell_style_parts[] = '--aos-dock-icon-size:' . $admin_os_mode_dock_icon_size . 'px';
$admin_os_mode_shell_style_parts[] = '--aos-dock-tile-size:' . $admin_os_mode_dock_size . 'px';
$admin_os_mode_shell_style_parts[] = '--aos-dock-hover-lift:' . $admin_os_mode_dock_lift . 'px';
$admin_os_mode_shell_style_parts[] = '--aos-dock-hover-scale:' . $admin_os_mode_dock_scale;
$admin_os_mode_shell_style          = implode( ';', $admin_os_mode_shell_style_parts );
$admin_os_mode_effective_appearance = 'dark' === $admin_os_mode_appearance['mode'] ? 'dark' : 'light';
$admin_os_mode_shell_attributes     = array(
	'class'                           => 'aos-shell',
	'data-admin-os-shell'             => '',
	'data-aos-theme'                  => $theme['id'],
	'data-aos-theme-family'           => $theme['family'],
	'data-aos-theme-version'          => $theme['version'],
	'data-aos-wallpaper-type'         => ! empty( $wallpaper['preference']['type'] ) ? $wallpaper['preference']['type'] : '',
	'data-aos-wallpaper-id'           => ! empty( $wallpaper['preference']['id'] ) ? $wallpaper['preference']['id'] : '',
	'data-aos-menu-contrast'          => ! empty( $wallpaper['menu_contrast'] ) ? $wallpaper['menu_contrast'] : 'auto',
	'data-aos-appearance-mode'        => $admin_os_mode_appearance['mode'],
	'data-aos-effective-appearance'   => $admin_os_mode_effective_appearance,
	'data-aos-window-material'        => $admin_os_mode_appearance['window_material'],
	'data-aos-accent-color'           => $admin_os_mode_appearance['accent_color'],
	'data-aos-icon-widget-style'      => $admin_os_mode_appearance['icon_widget_style'],
	'data-aos-tint-windows'           => ! empty( $admin_os_mode_appearance['tint_windows'] ) ? '1' : '0',
	'data-aos-dock-position'          => $admin_os_mode_desktop_dock['dock_position'],
	'data-aos-dock-auto-hide'         => ! empty( $admin_os_mode_desktop_dock['auto_hide_dock'] ) ? '1' : '0',
	'data-aos-dock-animate-apps'      => ! empty( $admin_os_mode_desktop_dock['animate_opening_apps'] ) ? '1' : '0',
	'data-aos-dock-show-indicators'   => ! empty( $admin_os_mode_desktop_dock['show_open_indicators'] ) ? '1' : '0',
	'data-aos-minimize-animation'     => $admin_os_mode_desktop_dock['minimize_animation'],
	'data-aos-minimize-into-app-icon' => ! empty( $admin_os_mode_desktop_dock['minimize_into_app_icon'] ) ? '1' : '0',
	'data-aos-wallpaper-click'        => $admin_os_mode_desktop_dock['wallpaper_click'],
	'data-aos-show-widgets-desktop'   => ! empty( $admin_os_mode_desktop_dock['show_widgets_desktop'] ) ? '1' : '0',
	'data-aos-dim-widgets'            => $admin_os_mode_desktop_dock['dim_widgets'],
);
if ( $admin_os_mode_shell_style ) {
	$admin_os_mode_shell_attributes['style'] = $admin_os_mode_shell_style;
}
?>
<div <?php foreach ( $admin_os_mode_shell_attributes as $admin_os_mode_attribute => $admin_os_mode_value ) : ?><?php echo esc_attr( $admin_os_mode_attribute ); ?><?php if ( '' !== $admin_os_mode_value ) : ?>="<?php echo esc_attr( $admin_os_mode_value ); ?>"<?php endif; ?> <?php endforeach; ?>>
	<?php
	if ( 'auto' === $admin_os_mode_appearance['mode'] ) {
		// Resolve Auto appearance before the menu bar and dock paint.
		wp_print_inline_script_tag(
			'(function(){var shell=document.currentScript&&document.currentScript.parentElement;if(shell&&window.matchMedia){shell.dataset.aosEffectiveAppearance=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}})();'
		);
	}
	?>
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
