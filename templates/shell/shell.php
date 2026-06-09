<?php
/**
 * Main shell template.
 *
 * @package PufferDesk
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
$pufferdesk_shell_style_parts = array();
if ( ! empty( $wallpaper['css_variables'] ) && is_array( $wallpaper['css_variables'] ) ) {
	foreach ( $wallpaper['css_variables'] as $pufferdesk_wallpaper_name => $pufferdesk_wallpaper_value ) {
		if ( ! preg_match( '/^--pdk-wallpaper-(image|size|position|repeat)$/', (string) $pufferdesk_wallpaper_name ) ) {
			continue;
		}

		$pufferdesk_wallpaper_value = str_replace( ';', '', (string) $pufferdesk_wallpaper_value );
		if ( '' !== $pufferdesk_wallpaper_value ) {
			$pufferdesk_shell_style_parts[] = $pufferdesk_wallpaper_name . ':' . $pufferdesk_wallpaper_value;
		}
	}
}

$pufferdesk_typography = isset( $theme['typography'] ) && is_array( $theme['typography'] ) ? $theme['typography'] : array();
$pufferdesk_typography_variable_map = array(
	'fonts'          => array(
		'ui'      => '--pdk-font-ui',
		'display' => '--pdk-font-display',
		'mono'    => '--pdk-font-mono',
	),
	'scale'          => array(
		'micro'            => '--pdk-text-micro',
		'small'            => '--pdk-text-small',
		'fine_print'       => '--pdk-text-fine-print',
		'footer'           => '--pdk-text-footer',
		'meta'             => '--pdk-text-meta',
		'caption'          => '--pdk-text-caption',
		'menu'             => '--pdk-text-menu',
		'body'             => '--pdk-text-body',
		'control'          => '--pdk-text-control',
		'dialog_title'     => '--pdk-text-dialog-title',
		'context_menu'     => '--pdk-text-context-menu',
		'context_menu_shortcut' => '--pdk-text-context-menu-shortcut',
		'label'            => '--pdk-text-label',
		'section_title'    => '--pdk-text-section-title',
		'settings_caption' => '--pdk-theme-settings-text-caption',
		'settings_body'    => '--pdk-theme-settings-text-body',
		'settings_label'   => '--pdk-theme-settings-text-label',
		'settings_heading' => '--pdk-theme-settings-text-heading',
		'settings_title'   => '--pdk-theme-settings-text-title',
		'profile_title'    => '--pdk-text-profile-title',
		'heading'          => '--pdk-text-heading',
		'about_title'      => '--pdk-text-about-title',
		'stat_value'       => '--pdk-text-stat-value',
		'display_title'    => '--pdk-text-display-title',
		'avatar'           => '--pdk-text-avatar',
		'widget_clock'     => '--pdk-text-widget-clock',
	),
	'line_heights'   => array(
		'tight'   => '--pdk-line-height-tight',
		'caption' => '--pdk-line-height-caption',
		'body'    => '--pdk-line-height-body',
		'display' => '--pdk-line-height-display',
	),
	'weights'        => array(
		'regular'      => '--pdk-weight-regular',
		'fine_print'   => '--pdk-weight-fine-print',
		'meta'         => '--pdk-weight-meta',
		'medium'       => '--pdk-weight-medium',
		'semibold'     => '--pdk-weight-semibold',
		'strong'       => '--pdk-weight-strong',
		'bold'         => '--pdk-weight-bold',
		'heading'      => '--pdk-weight-heading',
		'display'      => '--pdk-weight-display',
		'widget_clock' => '--pdk-weight-widget-clock',
	),
	'letter_spacing' => array(
		'default' => '--pdk-letter-spacing-default',
		'tight'   => '--pdk-letter-spacing-tight',
	),
);
foreach ( $pufferdesk_typography_variable_map as $pufferdesk_typography_section => $pufferdesk_typography_variables ) {
	if ( empty( $pufferdesk_typography[ $pufferdesk_typography_section ] ) || ! is_array( $pufferdesk_typography[ $pufferdesk_typography_section ] ) ) {
		continue;
	}

	foreach ( $pufferdesk_typography_variables as $pufferdesk_typography_key => $pufferdesk_typography_variable ) {
		if ( ! array_key_exists( $pufferdesk_typography_key, $pufferdesk_typography[ $pufferdesk_typography_section ] ) ) {
			continue;
		}

		$pufferdesk_typography_value = str_replace( ';', '', (string) $pufferdesk_typography[ $pufferdesk_typography_section ][ $pufferdesk_typography_key ] );
		if ( '' !== $pufferdesk_typography_value ) {
			$pufferdesk_shell_style_parts[] = $pufferdesk_typography_variable . ':' . $pufferdesk_typography_value;
		}
	}
}

$pufferdesk_appearance = wp_parse_args(
	is_array( $appearance ) ? $appearance : array(),
	array(
		'mode'              => 'auto',
		'window_material'   => 'clear',
		'accent_color'      => 'multicolor',
		'icon_widget_style' => 'default',
	)
);

$pufferdesk_desktop_dock = wp_parse_args(
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
		'wallpaper_click'        => 'never',
		'show_widgets_desktop'   => true,
		'dim_widgets'            => 'automatic',
	)
);
$pufferdesk_menu_bar     = wp_parse_args(
	is_array( $menu_bar ) ? $menu_bar : array(),
	array(
		'auto_hide'       => 'fullscreen',
		'show_background' => false,
		'recent_count'    => 10,
	)
);
	$pufferdesk_theme_shell  = wp_parse_args(
		isset( $theme['shell'] ) && is_array( $theme['shell'] ) ? $theme['shell'] : array(),
		array(
			'chrome'           => 'global-menu-dock',
			'top_bar'          => 'menu-bar',
			'launcher'         => 'dock',
			'system_menu'      => 'mark',
			'app_menu'         => 'global',
			'status_area'      => 'menu-bar',
			'launcher_search'  => false,
			'system_menu_icon' => 'pufferdesk-mark',
		)
	);
$pufferdesk_has_menu_bar  = 'menu-bar' === $pufferdesk_theme_shell['top_bar']
	|| 'global' === $pufferdesk_theme_shell['app_menu']
	|| 'menu-bar' === $pufferdesk_theme_shell['status_area']
	|| 'mark' === $pufferdesk_theme_shell['system_menu'];
$pufferdesk_has_launcher  = 'none' !== $pufferdesk_theme_shell['launcher'];
$pufferdesk_window_chrome = wp_parse_args(
	isset( $theme['window_chrome'] ) && is_array( $theme['window_chrome'] ) ? $theme['window_chrome'] : array(),
	array(
		'controls' => array(),
		'title'    => array(),
	)
);
$pufferdesk_window_controls = wp_parse_args(
	isset( $pufferdesk_window_chrome['controls'] ) && is_array( $pufferdesk_window_chrome['controls'] ) ? $pufferdesk_window_chrome['controls'] : array(),
	array(
		'placement' => 'left',
		'style'     => 'traffic',
	)
);
$pufferdesk_window_title = wp_parse_args(
	isset( $pufferdesk_window_chrome['title'] ) && is_array( $pufferdesk_window_chrome['title'] ) ? $pufferdesk_window_chrome['title'] : array(),
	array(
		'alignment' => 'left',
	)
);
$pufferdesk_dock_size          = max( 28, min( 72, (int) $pufferdesk_desktop_dock['dock_size'] ) );
$pufferdesk_dock_magnification = max( 0, min( 24, (int) $pufferdesk_desktop_dock['dock_magnification'] ) );
$pufferdesk_dock_icon_size     = max( 18, (int) round( $pufferdesk_dock_size * 0.56 ) );
$pufferdesk_dock_lift          = $pufferdesk_dock_magnification > 0 ? (int) round( 4 + $pufferdesk_dock_magnification / 3 ) : 0;
$pufferdesk_dock_scale         = $pufferdesk_dock_magnification > 0 ? number_format( 1 + $pufferdesk_dock_magnification / 55, 3, '.', '' ) : '1';
$pufferdesk_shell_style_parts[] = '--pdk-dock-item-size:' . $pufferdesk_dock_size . 'px';
$pufferdesk_shell_style_parts[] = '--pdk-dock-icon-size:' . $pufferdesk_dock_icon_size . 'px';
$pufferdesk_shell_style_parts[] = '--pdk-dock-tile-size:' . $pufferdesk_dock_size . 'px';
$pufferdesk_shell_style_parts[] = '--pdk-dock-hover-lift:' . $pufferdesk_dock_lift . 'px';
$pufferdesk_shell_style_parts[] = '--pdk-dock-hover-scale:' . $pufferdesk_dock_scale;
$pufferdesk_shell_style          = implode( ';', $pufferdesk_shell_style_parts );
$pufferdesk_effective_appearance = 'dark' === $pufferdesk_appearance['mode'] ? 'dark' : 'light';
$pufferdesk_menu_bar_auto_hide   = in_array( $pufferdesk_menu_bar['auto_hide'], array( 'always', 'desktop', 'fullscreen', 'never' ), true ) ? $pufferdesk_menu_bar['auto_hide'] : 'fullscreen';
$pufferdesk_menu_bar_hidden      = in_array( $pufferdesk_menu_bar_auto_hide, array( 'always', 'desktop' ), true );
$pufferdesk_shell_attributes     = array(
	'class'                           => 'pdk-shell',
	'data-pufferdesk-shell'           => '',
	'data-pdk-theme'                  => $theme['id'],
	'data-pdk-theme-family'           => $theme['family'],
	'data-pdk-theme-version'          => $theme['version'],
		'data-pdk-shell-chrome'           => $pufferdesk_theme_shell['chrome'],
		'data-pdk-shell-top-bar'          => $pufferdesk_theme_shell['top_bar'],
		'data-pdk-shell-launcher'         => $pufferdesk_theme_shell['launcher'],
		'data-pdk-shell-system-menu'      => $pufferdesk_theme_shell['system_menu'],
		'data-pdk-shell-app-menu'         => $pufferdesk_theme_shell['app_menu'],
		'data-pdk-shell-status-area'      => $pufferdesk_theme_shell['status_area'],
		'data-pdk-shell-launcher-search'  => ! empty( $pufferdesk_theme_shell['launcher_search'] ) ? '1' : '0',
		'data-pdk-shell-system-menu-icon' => $pufferdesk_theme_shell['system_menu_icon'],
		'data-pdk-shell-has-menu-bar'     => $pufferdesk_has_menu_bar ? '1' : '0',
		'data-pdk-shell-has-launcher'     => $pufferdesk_has_launcher ? '1' : '0',
	'data-pdk-window-controls-placement' => $pufferdesk_window_controls['placement'],
	'data-pdk-window-controls-style'  => $pufferdesk_window_controls['style'],
	'data-pdk-window-title-alignment' => $pufferdesk_window_title['alignment'],
	'data-pdk-wallpaper-type'         => ! empty( $wallpaper['preference']['type'] ) ? $wallpaper['preference']['type'] : '',
	'data-pdk-wallpaper-id'           => ! empty( $wallpaper['preference']['id'] ) ? $wallpaper['preference']['id'] : '',
	'data-pdk-menu-contrast'          => ! empty( $wallpaper['menu_contrast'] ) ? $wallpaper['menu_contrast'] : 'auto',
	'data-pdk-appearance-mode'        => $pufferdesk_appearance['mode'],
	'data-pdk-effective-appearance'   => $pufferdesk_effective_appearance,
	'data-pdk-window-material'        => $pufferdesk_appearance['window_material'],
	'data-pdk-accent-color'           => $pufferdesk_appearance['accent_color'],
	'data-pdk-icon-widget-style'      => $pufferdesk_appearance['icon_widget_style'],
	'data-pdk-dock-position'          => $pufferdesk_desktop_dock['dock_position'],
	'data-pdk-dock-auto-hide'         => ! empty( $pufferdesk_desktop_dock['auto_hide_dock'] ) ? '1' : '0',
	'data-pdk-dock-animate-apps'      => ! empty( $pufferdesk_desktop_dock['animate_opening_apps'] ) ? '1' : '0',
	'data-pdk-dock-show-indicators'   => ! empty( $pufferdesk_desktop_dock['show_open_indicators'] ) ? '1' : '0',
	'data-pdk-minimize-animation'     => $pufferdesk_desktop_dock['minimize_animation'],
	'data-pdk-minimize-into-app-icon' => ! empty( $pufferdesk_desktop_dock['minimize_into_app_icon'] ) ? '1' : '0',
	'data-pdk-wallpaper-click'        => $pufferdesk_desktop_dock['wallpaper_click'],
	'data-pdk-show-widgets-desktop'   => ! empty( $pufferdesk_desktop_dock['show_widgets_desktop'] ) ? '1' : '0',
	'data-pdk-dim-widgets'            => $pufferdesk_desktop_dock['dim_widgets'],
	'data-pdk-fullscreen-window'      => '0',
	'data-pdk-menu-bar-auto-hide'     => $pufferdesk_menu_bar_auto_hide,
	'data-pdk-menu-bar-background'    => ! empty( $pufferdesk_menu_bar['show_background'] ) ? '1' : '0',
	'data-pdk-menu-bar-hidden'        => $pufferdesk_menu_bar_hidden ? '1' : '0',
	'data-pdk-menu-bar-recent-count'  => (string) max( 0, min( 50, (int) $pufferdesk_menu_bar['recent_count'] ) ),
	'data-pdk-menu-bar-revealed'      => '0',
);
if ( $pufferdesk_shell_style ) {
	$pufferdesk_shell_attributes['style'] = $pufferdesk_shell_style;
}
?>
<div <?php foreach ( $pufferdesk_shell_attributes as $pufferdesk_attribute => $pufferdesk_value ) : ?><?php echo esc_attr( $pufferdesk_attribute ); ?><?php if ( '' !== $pufferdesk_value ) : ?>="<?php echo esc_attr( $pufferdesk_value ); ?>"<?php endif; ?> <?php endforeach; ?>>
	<?php
	if ( 'auto' === $pufferdesk_appearance['mode'] ) {
		// Resolve Auto appearance before shell surfaces paint.
		wp_print_inline_script_tag(
			'(function(){var shell=document.currentScript&&document.currentScript.parentElement;if(shell&&window.matchMedia){shell.dataset.pdkEffectiveAppearance=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}})();'
		);
	}
	?>
	<?php
	if ( $pufferdesk_has_menu_bar ) {
		$this->render_part(
			'shell/menu-bar.php',
			array(
				'site_name' => $site_name,
				'shell'     => $pufferdesk_theme_shell,
			)
		);
	}

	$this->render_part(
		'shell/desktop.php',
		array(
			'apps'            => $apps,
			'desktop_apps'    => isset( $desktop_apps ) && is_array( $desktop_apps ) ? $desktop_apps : array(),
			'dock_apps'       => isset( $dock_apps ) && is_array( $dock_apps ) ? $dock_apps : $apps,
			'widgets'         => $widgets,
			'folders'         => $folders,
			'theme'           => $theme,
			'shell'           => $pufferdesk_theme_shell,
			'workspace_state' => isset( $workspace_state ) && is_array( $workspace_state ) ? $workspace_state : array(),
		)
	);
	?>
</div>
