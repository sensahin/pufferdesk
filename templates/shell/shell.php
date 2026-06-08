<?php
/**
 * Main shell template.
 *
 * @package WPAdminOS
 */

defined( 'ABSPATH' ) || exit;

/**
 * Template variables:
 *
 * @var array<string,mixed>             $appearance
 * @var array<string,mixed>             $desktop_dock
 * @var array<string,mixed>             $menu_bar
 * @var array<int,array<string,string>> $apps
 * @var array<int,array<string,string>> $desktop_apps
 * @var array<int,array<string,string>> $dock_apps
 * @var array<int,array<string,mixed>>  $widgets
 * @var array<int,array<string,string>> $folders
 * @var string                          $site_name
 * @var array<string,mixed>             $theme
 * @var array<string,mixed>             $wallpaper
 * @var array<string,mixed>             $workspace_state
 */
$wp_adminos_shell_style_parts = array();
if ( ! empty( $wallpaper['css_variables'] ) && is_array( $wallpaper['css_variables'] ) ) {
	foreach ( $wallpaper['css_variables'] as $wp_adminos_wallpaper_name => $wp_adminos_wallpaper_value ) {
		if ( ! preg_match( '/^--aos-wallpaper-(image|size|position|repeat)$/', (string) $wp_adminos_wallpaper_name ) ) {
			continue;
		}

		$wp_adminos_wallpaper_value = str_replace( ';', '', (string) $wp_adminos_wallpaper_value );
		if ( '' !== $wp_adminos_wallpaper_value ) {
			$wp_adminos_shell_style_parts[] = $wp_adminos_wallpaper_name . ':' . $wp_adminos_wallpaper_value;
		}
	}
}

$wp_adminos_typography = isset( $theme['typography'] ) && is_array( $theme['typography'] ) ? $theme['typography'] : array();
$wp_adminos_typography_variable_map = array(
	'fonts'          => array(
		'ui'      => '--aos-font-ui',
		'display' => '--aos-font-display',
		'mono'    => '--aos-font-mono',
	),
	'scale'          => array(
		'micro'            => '--aos-text-micro',
		'small'            => '--aos-text-small',
		'fine_print'       => '--aos-text-fine-print',
		'footer'           => '--aos-text-footer',
		'meta'             => '--aos-text-meta',
		'caption'          => '--aos-text-caption',
		'menu'             => '--aos-text-menu',
		'body'             => '--aos-text-body',
		'control'          => '--aos-text-control',
		'dialog_title'     => '--aos-text-dialog-title',
		'context_menu'     => '--aos-text-context-menu',
		'context_menu_shortcut' => '--aos-text-context-menu-shortcut',
		'label'            => '--aos-text-label',
		'section_title'    => '--aos-text-section-title',
		'settings_caption' => '--aos-theme-settings-text-caption',
		'settings_body'    => '--aos-theme-settings-text-body',
		'settings_label'   => '--aos-theme-settings-text-label',
		'settings_heading' => '--aos-theme-settings-text-heading',
		'settings_title'   => '--aos-theme-settings-text-title',
		'profile_title'    => '--aos-text-profile-title',
		'heading'          => '--aos-text-heading',
		'about_title'      => '--aos-text-about-title',
		'stat_value'       => '--aos-text-stat-value',
		'display_title'    => '--aos-text-display-title',
		'avatar'           => '--aos-text-avatar',
		'widget_clock'     => '--aos-text-widget-clock',
	),
	'line_heights'   => array(
		'tight'   => '--aos-line-height-tight',
		'caption' => '--aos-line-height-caption',
		'body'    => '--aos-line-height-body',
		'display' => '--aos-line-height-display',
	),
	'weights'        => array(
		'regular'      => '--aos-weight-regular',
		'fine_print'   => '--aos-weight-fine-print',
		'meta'         => '--aos-weight-meta',
		'medium'       => '--aos-weight-medium',
		'semibold'     => '--aos-weight-semibold',
		'strong'       => '--aos-weight-strong',
		'bold'         => '--aos-weight-bold',
		'heading'      => '--aos-weight-heading',
		'display'      => '--aos-weight-display',
		'widget_clock' => '--aos-weight-widget-clock',
	),
	'letter_spacing' => array(
		'default' => '--aos-letter-spacing-default',
		'tight'   => '--aos-letter-spacing-tight',
	),
);
foreach ( $wp_adminos_typography_variable_map as $wp_adminos_typography_section => $wp_adminos_typography_variables ) {
	if ( empty( $wp_adminos_typography[ $wp_adminos_typography_section ] ) || ! is_array( $wp_adminos_typography[ $wp_adminos_typography_section ] ) ) {
		continue;
	}

	foreach ( $wp_adminos_typography_variables as $wp_adminos_typography_key => $wp_adminos_typography_variable ) {
		if ( ! array_key_exists( $wp_adminos_typography_key, $wp_adminos_typography[ $wp_adminos_typography_section ] ) ) {
			continue;
		}

		$wp_adminos_typography_value = str_replace( ';', '', (string) $wp_adminos_typography[ $wp_adminos_typography_section ][ $wp_adminos_typography_key ] );
		if ( '' !== $wp_adminos_typography_value ) {
			$wp_adminos_shell_style_parts[] = $wp_adminos_typography_variable . ':' . $wp_adminos_typography_value;
		}
	}
}

$wp_adminos_appearance = wp_parse_args(
	is_array( $appearance ) ? $appearance : array(),
	array(
		'mode'              => 'auto',
		'window_material'   => 'clear',
		'accent_color'      => 'multicolor',
		'icon_widget_style' => 'default',
	)
);

$wp_adminos_desktop_dock = wp_parse_args(
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
$wp_adminos_menu_bar     = wp_parse_args(
	is_array( $menu_bar ) ? $menu_bar : array(),
	array(
		'auto_hide'       => 'fullscreen',
		'show_background' => false,
		'recent_count'    => 10,
	)
);
$wp_adminos_theme_shell  = wp_parse_args(
	isset( $theme['shell'] ) && is_array( $theme['shell'] ) ? $theme['shell'] : array(),
	array(
		'chrome'      => 'global-menu-dock',
		'top_bar'     => 'menu-bar',
		'launcher'    => 'dock',
		'system_menu' => 'mark',
		'app_menu'    => 'global',
		'status_area' => 'menu-bar',
	)
);
$wp_adminos_window_chrome = wp_parse_args(
	isset( $theme['window_chrome'] ) && is_array( $theme['window_chrome'] ) ? $theme['window_chrome'] : array(),
	array(
		'controls' => array(),
		'title'    => array(),
	)
);
$wp_adminos_window_controls = wp_parse_args(
	isset( $wp_adminos_window_chrome['controls'] ) && is_array( $wp_adminos_window_chrome['controls'] ) ? $wp_adminos_window_chrome['controls'] : array(),
	array(
		'placement' => 'left',
		'style'     => 'traffic',
	)
);
$wp_adminos_window_title = wp_parse_args(
	isset( $wp_adminos_window_chrome['title'] ) && is_array( $wp_adminos_window_chrome['title'] ) ? $wp_adminos_window_chrome['title'] : array(),
	array(
		'alignment' => 'left',
	)
);
$wp_adminos_dock_size          = max( 28, min( 72, (int) $wp_adminos_desktop_dock['dock_size'] ) );
$wp_adminos_dock_magnification = max( 0, min( 24, (int) $wp_adminos_desktop_dock['dock_magnification'] ) );
$wp_adminos_dock_icon_size     = max( 18, (int) round( $wp_adminos_dock_size * 0.56 ) );
$wp_adminos_dock_lift          = $wp_adminos_dock_magnification > 0 ? (int) round( 4 + $wp_adminos_dock_magnification / 3 ) : 0;
$wp_adminos_dock_scale         = $wp_adminos_dock_magnification > 0 ? number_format( 1 + $wp_adminos_dock_magnification / 55, 3, '.', '' ) : '1';
$wp_adminos_shell_style_parts[] = '--aos-dock-item-size:' . $wp_adminos_dock_size . 'px';
$wp_adminos_shell_style_parts[] = '--aos-dock-icon-size:' . $wp_adminos_dock_icon_size . 'px';
$wp_adminos_shell_style_parts[] = '--aos-dock-tile-size:' . $wp_adminos_dock_size . 'px';
$wp_adminos_shell_style_parts[] = '--aos-dock-hover-lift:' . $wp_adminos_dock_lift . 'px';
$wp_adminos_shell_style_parts[] = '--aos-dock-hover-scale:' . $wp_adminos_dock_scale;
$wp_adminos_shell_style          = implode( ';', $wp_adminos_shell_style_parts );
$wp_adminos_effective_appearance = 'dark' === $wp_adminos_appearance['mode'] ? 'dark' : 'light';
$wp_adminos_menu_bar_auto_hide   = in_array( $wp_adminos_menu_bar['auto_hide'], array( 'always', 'desktop', 'fullscreen', 'never' ), true ) ? $wp_adminos_menu_bar['auto_hide'] : 'fullscreen';
$wp_adminos_menu_bar_hidden      = in_array( $wp_adminos_menu_bar_auto_hide, array( 'always', 'desktop' ), true );
$wp_adminos_shell_attributes     = array(
	'class'                           => 'aos-shell',
	'data-wp-adminos-shell'           => '',
	'data-aos-theme'                  => $theme['id'],
	'data-aos-theme-family'           => $theme['family'],
	'data-aos-theme-version'          => $theme['version'],
	'data-aos-shell-chrome'           => $wp_adminos_theme_shell['chrome'],
	'data-aos-shell-top-bar'          => $wp_adminos_theme_shell['top_bar'],
	'data-aos-shell-launcher'         => $wp_adminos_theme_shell['launcher'],
	'data-aos-shell-system-menu'      => $wp_adminos_theme_shell['system_menu'],
	'data-aos-shell-app-menu'         => $wp_adminos_theme_shell['app_menu'],
	'data-aos-shell-status-area'      => $wp_adminos_theme_shell['status_area'],
	'data-aos-window-controls-placement' => $wp_adminos_window_controls['placement'],
	'data-aos-window-controls-style'  => $wp_adminos_window_controls['style'],
	'data-aos-window-title-alignment' => $wp_adminos_window_title['alignment'],
	'data-aos-wallpaper-type'         => ! empty( $wallpaper['preference']['type'] ) ? $wallpaper['preference']['type'] : '',
	'data-aos-wallpaper-id'           => ! empty( $wallpaper['preference']['id'] ) ? $wallpaper['preference']['id'] : '',
	'data-aos-menu-contrast'          => ! empty( $wallpaper['menu_contrast'] ) ? $wallpaper['menu_contrast'] : 'auto',
	'data-aos-appearance-mode'        => $wp_adminos_appearance['mode'],
	'data-aos-effective-appearance'   => $wp_adminos_effective_appearance,
	'data-aos-window-material'        => $wp_adminos_appearance['window_material'],
	'data-aos-accent-color'           => $wp_adminos_appearance['accent_color'],
	'data-aos-icon-widget-style'      => $wp_adminos_appearance['icon_widget_style'],
	'data-aos-dock-position'          => $wp_adminos_desktop_dock['dock_position'],
	'data-aos-dock-auto-hide'         => ! empty( $wp_adminos_desktop_dock['auto_hide_dock'] ) ? '1' : '0',
	'data-aos-dock-animate-apps'      => ! empty( $wp_adminos_desktop_dock['animate_opening_apps'] ) ? '1' : '0',
	'data-aos-dock-show-indicators'   => ! empty( $wp_adminos_desktop_dock['show_open_indicators'] ) ? '1' : '0',
	'data-aos-minimize-animation'     => $wp_adminos_desktop_dock['minimize_animation'],
	'data-aos-minimize-into-app-icon' => ! empty( $wp_adminos_desktop_dock['minimize_into_app_icon'] ) ? '1' : '0',
	'data-aos-wallpaper-click'        => $wp_adminos_desktop_dock['wallpaper_click'],
	'data-aos-show-widgets-desktop'   => ! empty( $wp_adminos_desktop_dock['show_widgets_desktop'] ) ? '1' : '0',
	'data-aos-dim-widgets'            => $wp_adminos_desktop_dock['dim_widgets'],
	'data-aos-fullscreen-window'      => '0',
	'data-aos-menu-bar-auto-hide'     => $wp_adminos_menu_bar_auto_hide,
	'data-aos-menu-bar-background'    => ! empty( $wp_adminos_menu_bar['show_background'] ) ? '1' : '0',
	'data-aos-menu-bar-hidden'        => $wp_adminos_menu_bar_hidden ? '1' : '0',
	'data-aos-menu-bar-recent-count'  => (string) max( 0, min( 50, (int) $wp_adminos_menu_bar['recent_count'] ) ),
	'data-aos-menu-bar-revealed'      => '0',
);
if ( $wp_adminos_shell_style ) {
	$wp_adminos_shell_attributes['style'] = $wp_adminos_shell_style;
}
?>
<div <?php foreach ( $wp_adminos_shell_attributes as $wp_adminos_attribute => $wp_adminos_value ) : ?><?php echo esc_attr( $wp_adminos_attribute ); ?><?php if ( '' !== $wp_adminos_value ) : ?>="<?php echo esc_attr( $wp_adminos_value ); ?>"<?php endif; ?> <?php endforeach; ?>>
	<?php
	if ( 'auto' === $wp_adminos_appearance['mode'] ) {
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
			'apps'            => $apps,
			'desktop_apps'    => isset( $desktop_apps ) && is_array( $desktop_apps ) ? $desktop_apps : array(),
			'dock_apps'       => isset( $dock_apps ) && is_array( $dock_apps ) ? $dock_apps : $apps,
			'widgets'         => $widgets,
			'folders'         => $folders,
			'theme'           => $theme,
			'workspace_state' => isset( $workspace_state ) && is_array( $workspace_state ) ? $workspace_state : array(),
		)
	);
	?>
</div>
