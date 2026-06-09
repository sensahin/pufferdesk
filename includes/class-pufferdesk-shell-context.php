<?php
/**
 * Shell context builder.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Resolves the shared shell state consumed by templates and runtime config.
 */
final class PufferDesk_Shell_Context {
	/**
	 * Preferences.
	 *
	 * @var PufferDesk_User_Preferences
	 */
	private $preferences;

	/**
	 * App registry.
	 *
	 * @var PufferDesk_App_Registry
	 */
	private $app_registry;

	/**
	 * Widget registry.
	 *
	 * @var PufferDesk_Widget_Registry
	 */
	private $widget_registry;

	/**
	 * Theme registry.
	 *
	 * @var PufferDesk_Theme_Registry
	 */
	private $theme_registry;

	/**
	 * Wallpaper registry.
	 *
	 * @var PufferDesk_Wallpaper_Registry
	 */
	private $wallpaper_registry;

	/**
	 * Workspace state service.
	 *
	 * @var PufferDesk_Workspace_State
	 */
	private $workspace_state;

	/**
	 * Constructor.
	 *
	 * @param PufferDesk_User_Preferences   $preferences Preferences.
	 * @param PufferDesk_App_Registry       $app_registry App registry.
	 * @param PufferDesk_Widget_Registry    $widget_registry Widget registry.
	 * @param PufferDesk_Theme_Registry     $theme_registry Theme registry.
	 * @param PufferDesk_Wallpaper_Registry $wallpaper_registry Wallpaper registry.
	 * @param PufferDesk_Workspace_State    $workspace_state Workspace state service.
	 */
	public function __construct(
		PufferDesk_User_Preferences $preferences,
		PufferDesk_App_Registry $app_registry,
		PufferDesk_Widget_Registry $widget_registry,
		PufferDesk_Theme_Registry $theme_registry,
		PufferDesk_Wallpaper_Registry $wallpaper_registry,
		PufferDesk_Workspace_State $workspace_state
	) {
		$this->preferences        = $preferences;
		$this->app_registry       = $app_registry;
		$this->widget_registry    = $widget_registry;
		$this->theme_registry     = $theme_registry;
		$this->wallpaper_registry = $wallpaper_registry;
		$this->workspace_state    = $workspace_state;
	}

	/**
	 * Resolve the current shell state.
	 *
	 * @return array<string,mixed>
	 */
	public function get() {
		$theme             = $this->theme_registry->get_current_theme( $this->preferences );
		$apps              = $this->theme_registry->apply_app_labels( $this->app_registry->get_apps(), $theme );
		$app_locations     = $this->preferences->get_effective_app_locations( $apps, $theme );
		$widgets           = $this->widget_registry->get_widgets();
		$folders           = $this->app_registry->get_folders( $apps );
		$desktop_folders   = $this->preferences->get_desktop_folders( $apps );
		$desktop_trash     = $this->preferences->get_desktop_trash( $apps );
		$workspace_folders = array_merge( $folders, $desktop_folders );
		$workspace_state   = $this->workspace_state->get_state( $theme['id'], $apps, $widgets, $workspace_folders );
		$dock_apps         = $this->preferences->filter_apps_for_surface( $apps, $app_locations, 'dock', $theme );

		return array(
			'appearance'        => $this->preferences->get_appearance(),
			'app_locations'     => $app_locations,
			'app_login_items'   => $this->preferences->get_app_login_items( $apps ),
			'apps'              => $apps,
			'desktop_apps'      => $this->preferences->filter_apps_for_surface( $apps, $app_locations, 'desktop', $theme ),
			'desktop_dock'      => $this->preferences->get_desktop_dock(),
			'desktop_folders'   => $desktop_folders,
			'desktop_trash'     => $desktop_trash,
			'dock_apps'         => $this->workspace_state->order_apps_for_dock( $dock_apps, $workspace_state ),
			'folders'           => $folders,
			'menu_bar'          => $this->preferences->get_menu_bar(),
			'theme'             => $theme,
			'wallpaper'         => $this->wallpaper_registry->get_client_config( $theme, $this->preferences ),
			'widgets'           => $widgets,
			'workspace_folders' => $workspace_folders,
			'workspace_state'   => $workspace_state,
		);
	}
}
