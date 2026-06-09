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

$pufferdesk_theme_tokens       = isset( $theme['tokens'] ) && is_array( $theme['tokens'] ) ? $theme['tokens'] : array();
$pufferdesk_token_variable_map = array(
	'color'    => array(
		'ink'        => '--pdk-ink',
		'muted'      => '--pdk-muted',
		'desktop_bg' => '--pdk-desktop-bg',
		'accent'     => '--pdk-accent',
		'accent_ink' => '--pdk-accent-ink',
		'highlight'  => '--pdk-highlight',
	),
	'material' => array(
		'clear_bg'          => '--pdk-material-clear-bg',
		'clear_border'      => '--pdk-material-clear-border',
		'clear_filter'      => '--pdk-material-clear-filter',
		'clear_shadow'      => '--pdk-material-clear-shadow',
		'regular_bg'        => '--pdk-material-regular-bg',
		'regular_border'    => '--pdk-material-regular-border',
		'regular_filter'    => '--pdk-material-regular-filter',
		'regular_shadow'    => '--pdk-material-regular-shadow',
		'tinted_bg'         => '--pdk-material-tinted-bg',
		'tinted_border'     => '--pdk-material-tinted-border',
		'solid_bg'          => '--pdk-material-solid-bg',
		'solid_border'      => '--pdk-material-solid-border',
		'card_shadow'       => '--pdk-material-card-shadow',
		'control_bg'        => '--pdk-material-control-bg',
		'control_hover_bg'  => '--pdk-material-control-hover-bg',
		'control_active_bg' => '--pdk-material-control-active-bg',
		'control_border'    => '--pdk-material-control-border',
		'control_filter'    => '--pdk-material-control-filter',
		'bar_bg'            => '--pdk-material-bar-bg',
		'bar_border'        => '--pdk-material-bar-border',
		'bar_filter'        => '--pdk-material-bar-filter',
		'bar_shadow'        => '--pdk-material-bar-shadow',
		'popover_bg'        => '--pdk-material-popover-bg',
		'popover_border'    => '--pdk-material-popover-border',
		'popover_filter'    => '--pdk-material-popover-filter',
		'popover_shadow'    => '--pdk-material-popover-shadow',
		'dialog_bg'         => '--pdk-material-dialog-bg',
		'dialog_border'     => '--pdk-material-dialog-border',
		'dialog_filter'     => '--pdk-material-dialog-filter',
		'dialog_shadow'     => '--pdk-material-dialog-shadow',
	),
	'spacing'  => array(
		'window_safe_edge'   => '--pdk-window-safe-edge',
		'dock_screen_edge'   => '--pdk-dock-screen-edge',
		'dock_hover_lift'    => '--pdk-dock-hover-lift',
		'dock_icon_size'     => '--pdk-dock-icon-size',
		'dock_item_size'     => '--pdk-dock-item-size',
		'dock_tile_size'     => '--pdk-dock-tile-size',
		'scrollbar_size'     => '--pdk-scrollbar-size',
		'app_badge_size'     => '--pdk-app-badge-size',
		'app_badge_padding_x' => '--pdk-app-badge-padding-x',
		'app_badge_max_width' => '--pdk-app-badge-max-width',
	),
	'radius'   => array(
		'window'           => '--pdk-window-radius',
		'window_maximized' => '--pdk-window-maximized-radius',
		'menu_popover'     => '--pdk-menu-popover-radius',
	),
	'border'   => array(
		'line'       => '--pdk-line',
		'window_bar' => '--pdk-window-bar-border',
		'tile'       => '--pdk-tile-border',
		'dock'       => '--pdk-dock-border',
	),
	'shadow'   => array(
		'default'      => '--pdk-shadow',
		'card'         => '--pdk-card-shadow',
		'dialog'       => '--pdk-dialog-shadow',
		'menu_popover' => '--pdk-menu-popover-shadow',
	),
	'context_menu' => array(
		'bg'               => '--pdk-menu-popover-bg',
		'border'           => '--pdk-menu-popover-border',
		'filter'           => '--pdk-menu-popover-filter',
		'shadow'           => '--pdk-menu-popover-shadow',
		'radius'           => '--pdk-menu-popover-radius',
		'ink'              => '--pdk-menu-popover-ink',
		'muted'            => '--pdk-menu-popover-muted',
		'separator'        => '--pdk-menu-popover-separator',
		'hover_bg'         => '--pdk-menu-item-hover-bg',
		'hover_ink'        => '--pdk-menu-item-hover-ink',
		'disabled'         => '--pdk-menu-item-disabled',
		'selection_bg'     => '--pdk-menu-selection-bg',
		'selection_border' => '--pdk-menu-selection-border',
		'selection_shadow' => '--pdk-menu-selection-shadow',
		'sheen'            => '--pdk-menu-popover-sheen',
		'sheen_opacity'    => '--pdk-menu-popover-sheen-opacity',
		'padding'          => '--pdk-context-menu-padding',
		'item_radius'      => '--pdk-context-menu-item-radius',
		'item_height'      => '--pdk-context-menu-item-height',
		'item_gap'         => '--pdk-context-menu-item-gap',
		'item_padding_x'   => '--pdk-context-menu-item-padding-x',
		'icon_size'        => '--pdk-context-menu-icon-size',
		'separator_margin' => '--pdk-context-menu-separator-margin',
	),
	'settings_surface' => array(
		'window_bg'                  => '--pdk-settings-window-bg',
		'body_bg'                    => '--pdk-settings-body-bg',
		'main_bg'                    => '--pdk-settings-main-bg',
		'card_bg'                    => '--pdk-settings-card-bg',
		'card_border'                => '--pdk-settings-card-border',
		'sidebar_bg'                 => '--pdk-settings-sidebar-bg',
		'sidebar_border'             => '--pdk-settings-sidebar-border',
		'sidebar_filter'             => '--pdk-settings-sidebar-filter',
		'sidebar_shadow'             => '--pdk-settings-sidebar-shadow',
		'sidebar_radius'             => '--pdk-settings-sidebar-panel-radius',
		'sidebar_reflection_filter'  => '--pdk-settings-sidebar-reflection-filter',
		'sidebar_reflection_mask'    => '--pdk-settings-sidebar-reflection-mask',
		'sidebar_reflection_opacity' => '--pdk-settings-sidebar-reflection-opacity',
		'sidebar_gloss'              => '--pdk-settings-sidebar-gloss',
		'search_bg'                  => '--pdk-settings-search-bg',
		'search_border'              => '--pdk-settings-search-border',
		'search_shadow'              => '--pdk-settings-search-shadow',
		'search_filter'              => '--pdk-settings-search-filter',
		'control_radius'             => '--pdk-settings-control-radius',
		'section_bg'                 => '--pdk-settings-section-bg',
		'section_hover_bg'           => '--pdk-settings-section-hover-bg',
		'section_active_bg'          => '--pdk-settings-section-active-bg',
		'sidebar_active_bg'          => '--pdk-settings-sidebar-active-bg',
		'sidebar_active_ink'         => '--pdk-settings-sidebar-active-ink',
		'sidebar_hover_bg'           => '--pdk-settings-sidebar-hover-bg',
		'titlebar_bg'                => '--pdk-settings-titlebar-bg',
		'titlebar_back_disabled'     => '--pdk-settings-titlebar-back-disabled',
	),
	'window_chrome' => array(
		'surface_bg'                  => '--pdk-panel',
		'surface_border'              => '--pdk-line',
		'surface_shadow'              => '--pdk-shadow',
		'bar_bg'                      => '--pdk-window-bar-bg',
		'bar_border'                  => '--pdk-window-bar-border',
		'regular_bg'                  => '--pdk-material-regular-bg',
		'regular_border'              => '--pdk-material-regular-border',
		'regular_filter'              => '--pdk-material-regular-filter',
		'regular_shadow'              => '--pdk-material-regular-shadow',
		'liquid_window_bg'            => '--pdk-liquid-glass-window-bg',
		'liquid_window_border'        => '--pdk-liquid-glass-window-border',
		'liquid_window_filter'        => '--pdk-liquid-glass-window-filter',
		'liquid_window_shadow'        => '--pdk-liquid-glass-window-shadow',
		'folder_window_border'        => '--pdk-folder-window-border',
		'folder_window_shadow'        => '--pdk-folder-window-shadow',
		'file_explorer_window_radius' => '--pdk-file-explorer-window-radius',
	),
	'explorer' => array(
		'surface_bg'                   => '--pdk-redmond-explorer-surface-bg',
		'titlebar_bg'                  => '--pdk-redmond-explorer-titlebar-bg',
		'toolbar_bg'                   => '--pdk-redmond-explorer-toolbar-bg',
		'addressbar_bg'                => '--pdk-redmond-explorer-addressbar-bg',
		'command_bg'                   => '--pdk-redmond-explorer-command-bg',
		'sidebar_bg'                   => '--pdk-redmond-explorer-sidebar-bg',
		'sidebar_border'               => '--pdk-redmond-explorer-sidebar-border',
		'sidebar_heading'              => '--pdk-explorer-sidebar-heading',
		'sidebar_selected_bg'          => '--pdk-redmond-explorer-sidebar-selected-bg',
		'sidebar_selected_border'      => '--pdk-redmond-explorer-sidebar-selected-border',
		'row_hover_bg'                 => '--pdk-redmond-explorer-row-hover-bg',
		'field_bg'                     => '--pdk-redmond-explorer-field-bg',
		'field_border'                 => '--pdk-redmond-explorer-field-border',
		'search_bg'                    => '--pdk-redmond-explorer-search-bg',
		'hover_bg'                     => '--pdk-redmond-explorer-hover-bg',
		'selection_bg'                 => '--pdk-redmond-explorer-selection-bg',
		'selection_border'             => '--pdk-redmond-explorer-selection-border',
		'tab_bg'                       => '--pdk-redmond-explorer-tab-bg',
		'tab_inactive_bg'              => '--pdk-redmond-explorer-tab-inactive-bg',
		'tab_border'                   => '--pdk-redmond-explorer-tab-border',
		'tab_shadow'                   => '--pdk-redmond-explorer-tab-shadow',
		'statusbar_bg'                 => '--pdk-redmond-explorer-statusbar-bg',
		'finder_divider'               => '--pdk-finder-divider',
		'finder_sidebar_active_bg'     => '--pdk-finder-sidebar-active-bg',
		'finder_sidebar_active_ink'    => '--pdk-finder-sidebar-active-ink',
		'finder_tabbar_bg'             => '--pdk-finder-tabbar-bg',
		'finder_tabbar_border'         => '--pdk-finder-tabbar-border',
		'finder_tab_bg'                => '--pdk-finder-tab-bg',
		'finder_tab_hover_bg'          => '--pdk-finder-tab-hover-bg',
		'finder_tab_active_bg'         => '--pdk-finder-tab-active-bg',
		'finder_tab_active_border'     => '--pdk-finder-tab-active-border',
		'finder_tab_close_bg'          => '--pdk-finder-tab-close-bg',
		'finder_tab_close_hover_bg'    => '--pdk-finder-tab-close-hover-bg',
		'finder_tab_add_bg'            => '--pdk-finder-tab-add-bg',
		'finder_tab_add_hover_bg'      => '--pdk-finder-tab-add-hover-bg',
		'finder_tab_add_border'        => '--pdk-finder-tab-add-border',
	),
);
foreach ( $pufferdesk_token_variable_map as $pufferdesk_token_section => $pufferdesk_token_variables ) {
	if ( empty( $pufferdesk_theme_tokens[ $pufferdesk_token_section ] ) || ! is_array( $pufferdesk_theme_tokens[ $pufferdesk_token_section ] ) ) {
		continue;
	}

	foreach ( $pufferdesk_token_variables as $pufferdesk_token_key => $pufferdesk_token_variable ) {
		if ( ! array_key_exists( $pufferdesk_token_key, $pufferdesk_theme_tokens[ $pufferdesk_token_section ] ) ) {
			continue;
		}

		$pufferdesk_token_value = str_replace( ';', '', (string) $pufferdesk_theme_tokens[ $pufferdesk_token_section ][ $pufferdesk_token_key ] );
		if ( '' !== $pufferdesk_token_value ) {
			$pufferdesk_shell_style_parts[] = $pufferdesk_token_variable . ':' . $pufferdesk_token_value;
		}
	}
}

$pufferdesk_mode_token_style_rules = array();
$pufferdesk_mode_tokens            = isset( $theme['mode_tokens'] ) && is_array( $theme['mode_tokens'] ) ? $theme['mode_tokens'] : array();
$pufferdesk_theme_id_for_tokens    = isset( $theme['id'] ) ? sanitize_key( (string) $theme['id'] ) : '';
foreach ( array( 'light', 'dark' ) as $pufferdesk_mode_token_mode ) {
	if ( empty( $pufferdesk_mode_tokens[ $pufferdesk_mode_token_mode ] ) || ! is_array( $pufferdesk_mode_tokens[ $pufferdesk_mode_token_mode ] ) ) {
		continue;
	}

	$pufferdesk_mode_token_style_parts = array();
	foreach ( $pufferdesk_token_variable_map as $pufferdesk_token_section => $pufferdesk_token_variables ) {
		if ( empty( $pufferdesk_mode_tokens[ $pufferdesk_mode_token_mode ][ $pufferdesk_token_section ] ) || ! is_array( $pufferdesk_mode_tokens[ $pufferdesk_mode_token_mode ][ $pufferdesk_token_section ] ) ) {
			continue;
		}

		foreach ( $pufferdesk_token_variables as $pufferdesk_token_key => $pufferdesk_token_variable ) {
			if ( ! array_key_exists( $pufferdesk_token_key, $pufferdesk_mode_tokens[ $pufferdesk_mode_token_mode ][ $pufferdesk_token_section ] ) ) {
				continue;
			}

			$pufferdesk_token_value = str_replace( ';', '', (string) $pufferdesk_mode_tokens[ $pufferdesk_mode_token_mode ][ $pufferdesk_token_section ][ $pufferdesk_token_key ] );
			if ( '' !== $pufferdesk_token_value ) {
				$pufferdesk_mode_token_style_parts[] = $pufferdesk_token_variable . ':' . $pufferdesk_token_value;
			}
		}
	}

	if ( '' !== $pufferdesk_theme_id_for_tokens && ! empty( $pufferdesk_mode_token_style_parts ) ) {
		$pufferdesk_mode_token_style_rules[] = '.pdk-shell[data-pdk-theme=' . $pufferdesk_theme_id_for_tokens . '][data-pdk-effective-appearance=' . $pufferdesk_mode_token_mode . ']{' . implode( ';', $pufferdesk_mode_token_style_parts ) . '}';
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
<?php if ( ! empty( $pufferdesk_mode_token_style_rules ) ) : ?>
<style id="pufferdesk-theme-mode-tokens"><?php echo esc_html( implode( "\n", $pufferdesk_mode_token_style_rules ) ); ?></style>
<?php endif; ?>
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
