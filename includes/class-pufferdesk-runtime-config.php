<?php
/**
 * Runtime configuration builder.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Converts resolved shell context into the browser runtime payload.
 */
final class PufferDesk_Runtime_Config {
	/**
	 * Request router.
	 *
	 * @var PufferDesk_Router
	 */
	private $router;

	/**
	 * Theme registry.
	 *
	 * @var PufferDesk_Theme_Registry
	 */
	private $theme_registry;

	/**
	 * Settings registry.
	 *
	 * @var PufferDesk_Settings_Registry
	 */
	private $settings_registry;

	/**
	 * User preferences.
	 *
	 * @var PufferDesk_User_Preferences
	 */
	private $preferences;

	/**
	 * Virtual filesystem service.
	 *
	 * @var PufferDesk_Virtual_Filesystem
	 */
	private $virtual_filesystem;

	/**
	 * Notification registry.
	 *
	 * @var PufferDesk_Notification_Registry
	 */
	private $notification_registry;

	/**
	 * WordPress admin bar menu provider.
	 *
	 * @var PufferDesk_Admin_Bar_Menu_Provider
	 */
	private $admin_bar_menu_provider;

	/**
	 * Constructor.
	 *
	 * @param PufferDesk_Router                       $router Request router.
	 * @param PufferDesk_Theme_Registry               $theme_registry Theme registry.
	 * @param PufferDesk_Settings_Registry            $settings_registry Settings registry.
	 * @param PufferDesk_Virtual_Filesystem|null      $virtual_filesystem Virtual filesystem service.
	 * @param PufferDesk_Notification_Registry|null   $notification_registry Notification registry.
	 * @param PufferDesk_User_Preferences|null        $preferences User preferences.
	 * @param PufferDesk_Admin_Bar_Menu_Provider|null $admin_bar_menu_provider Admin bar menu provider.
	 */
	public function __construct( PufferDesk_Router $router, PufferDesk_Theme_Registry $theme_registry, PufferDesk_Settings_Registry $settings_registry, $virtual_filesystem = null, $notification_registry = null, $preferences = null, $admin_bar_menu_provider = null ) {
		$this->router             = $router;
		$this->theme_registry     = $theme_registry;
		$this->settings_registry  = $settings_registry;
		$this->preferences        = $preferences instanceof PufferDesk_User_Preferences ? $preferences : new PufferDesk_User_Preferences();
		$this->virtual_filesystem = $virtual_filesystem instanceof PufferDesk_Virtual_Filesystem ? $virtual_filesystem : new PufferDesk_Virtual_Filesystem();
		$this->notification_registry = $notification_registry instanceof PufferDesk_Notification_Registry
			? $notification_registry
			: new PufferDesk_Notification_Registry( new PufferDesk_User_Preferences(), new PufferDesk_Notification_Normalizer() );
		$this->admin_bar_menu_provider = $admin_bar_menu_provider instanceof PufferDesk_Admin_Bar_Menu_Provider
			? $admin_bar_menu_provider
			: new PufferDesk_Admin_Bar_Menu_Provider();
	}

	/**
	 * Labels consumed by first-paint PHP shell templates.
	 *
	 * @param array<string,mixed> $theme Current theme.
	 * @return array<string,string>
	 */
	public static function get_shell_template_labels( $theme = array() ) {
		$theme        = is_array( $theme ) ? $theme : array();
		$shell        = isset( $theme['shell'] ) && is_array( $theme['shell'] ) ? $theme['shell'] : array();
		$shell_labels = isset( $shell['labels'] ) && is_array( $shell['labels'] ) ? $shell['labels'] : array();
		$menu         = isset( $theme['menu'] ) && is_array( $theme['menu'] ) ? $theme['menu'] : array();
		$menu_labels  = isset( $menu['labels'] ) && is_array( $menu['labels'] ) ? $menu['labels'] : array();
		$group_labels = wp_parse_args( $menu_labels, PufferDesk_App_Menu_Normalizer::get_default_group_labels() );

		return wp_parse_args(
			$shell_labels,
			array_merge(
				$group_labels,
				array(
					'desktop_apps'          => __( 'Desktop apps', 'pufferdesk' ),
					'desktop_folders'       => __( 'Desktop folders', 'pufferdesk' ),
					'desktop_widgets'       => __( 'Desktop widgets', 'pufferdesk' ),
					'launcher'              => __( 'Dock', 'pufferdesk' ),
					'menu_items'            => __( 'PufferDesk menus', 'pufferdesk' ),
					'open_system_menu'      => __( 'Open PufferDesk menu', 'pufferdesk' ),
					'pufferdesk_desktop'    => __( 'PufferDesk Desktop', 'pufferdesk' ),
					'search'                => __( 'Search', 'pufferdesk' ),
					'search_apps'           => __( 'Search apps', 'pufferdesk' ),
					'start'                 => __( 'Start', 'pufferdesk' ),
					'open_start'            => __( 'Open Start', 'pufferdesk' ),
					'status'                => __( 'Status', 'pufferdesk' ),
				)
			)
		);
	}

	/**
	 * Generic label composition format.
	 *
	 * @return string
	 */
	private static function get_combined_label_format() {
		/* translators: 1: first label fragment, 2: second label fragment. */
		return __( '%1$s %2$s', 'pufferdesk' );
	}

	/**
	 * Generic count and noun label format.
	 *
	 * @return string
	 */
	private static function get_item_count_format() {
		/* translators: 1: item count, 2: item label. */
		return __( '%1$d %2$s', 'pufferdesk' );
	}

	/**
	 * Generic window aria label format.
	 *
	 * @return string
	 */
	private static function get_window_title_format() {
		/* translators: %s: window title. */
		return __( '%s window', 'pufferdesk' );
	}

	/**
	 * Runtime data passed from WordPress into the shell.
	 *
	 * @param array<string,mixed> $context Resolved shell context.
	 * @return array<string,mixed>
	 */
	public function get( $context ) {
		$context = is_array( $context ) ? $context : array();
		$theme   = isset( $context['theme'] ) && is_array( $context['theme'] ) ? $context['theme'] : array();
		$theme_id = isset( $theme['id'] ) && is_string( $theme['id'] ) && '' !== $theme['id'] ? $theme['id'] : PufferDesk_User_Preferences::THEME_MODE_DEFAULT;
		$theme_mode = isset( $context['theme_mode'] ) && is_string( $context['theme_mode'] )
			? sanitize_key( $context['theme_mode'] )
			: $this->preferences->get_theme_mode( $this->theme_registry->get_themes() );
		$current_user = wp_get_current_user();
		$role_label   = $this->get_user_role_label( $current_user );

		return array(
			'appearance'     => isset( $context['appearance'] ) && is_array( $context['appearance'] ) ? $context['appearance'] : array(),
			'appLocations'   => isset( $context['app_locations'] ) && is_array( $context['app_locations'] ) ? $context['app_locations'] : array(),
			'appLoginItems'  => isset( $context['app_login_items'] ) && is_array( $context['app_login_items'] ) ? $context['app_login_items'] : array(),
			'apps'           => isset( $context['apps'] ) && is_array( $context['apps'] ) ? $context['apps'] : array(),
			'ajaxUrl'        => admin_url( 'admin-ajax.php' ),
			'classicUrl'     => $this->router->get_toggle_url( false ),
			'contracts'      => $this->get_contracts_config(),
			'contentSearch'  => $this->get_content_search_config(),
			'desktopDock'    => isset( $context['desktop_dock'] ) && is_array( $context['desktop_dock'] ) ? $context['desktop_dock'] : array(),
			'desktopFolders' => isset( $context['desktop_folders'] ) && is_array( $context['desktop_folders'] ) ? $context['desktop_folders'] : array(),
			'desktopTrash'   => isset( $context['desktop_trash'] ) && is_array( $context['desktop_trash'] ) ? $context['desktop_trash'] : array(),
			'dialogs'        => $this->get_dialogs_config( $theme ),
			'documents'      => $this->get_documents_config( $theme ),
			'iframe'         => $this->get_iframe_config(),
			'logoutUrl'      => $this->get_logout_url(),
			'media'          => array(
				'sharedIconsUrl' => esc_url_raw( PUFFERDESK_URL . 'assets/media/shared/icons/' ),
			),
			'menuBar'        => isset( $context['menu_bar'] ) && is_array( $context['menu_bar'] ) ? $context['menu_bar'] : array(),
			'nativeAdmin'    => $this->get_native_admin_config(),
			'notifications'  => $this->notification_registry->get_client_config(),
			'settings'       => $this->get_settings_config( $theme ),
			'shellCapabilities' => $this->get_shell_capabilities_config( $theme ),
			'shellChrome'    => isset( $theme['shell'] ) ? $theme['shell'] : array(),
			'shellUrl'       => $this->router->get_shell_url(),
			'siteInfo'       => $this->get_site_info_config( $theme ),
			'siteName'       => get_bloginfo( 'name' ),
			'productInfo'    => $this->get_product_info_config( $theme ),
			'system'         => $this->get_system_config( $theme ),
			'themeMode'      => $theme_mode,
			'themeModes'     => $this->get_theme_mode_options_config(),
			'themes'         => $this->theme_registry->get_selectable_themes(),
			'virtualFilesystem' => $this->virtual_filesystem->get_runtime_config( $theme ),
			'wallpaper'      => isset( $context['wallpaper'] ) && is_array( $context['wallpaper'] ) ? $context['wallpaper'] : array(),
			'workspace'      => array(
				'loadAction'  => PufferDesk_Workspace_Controller::ACTION_LOAD,
				'resetAction' => PufferDesk_Workspace_Controller::ACTION_RESET,
				'saveAction'  => PufferDesk_Workspace_Controller::ACTION_SAVE,
				'siteId'      => get_current_blog_id(),
				'themeId'     => $theme_id,
				'version'     => PufferDesk_Workspace_State::VERSION,
			),
			'workspaceState' => isset( $context['workspace_state'] ) && is_array( $context['workspace_state'] ) ? $context['workspace_state'] : array(),
			'userId'         => get_current_user_id(),
			'user'           => array(
				'avatar'     => get_avatar_url( $current_user->ID, array( 'size' => 192 ) ),
				'email'      => $current_user->user_email,
				'name'       => $current_user->display_name ? $current_user->display_name : $current_user->user_login,
				'profileUrl' => admin_url( 'profile.php' ),
				'role'       => $role_label,
				'subtitle'   => $role_label,
			),
			'storageKey'   => PufferDesk_Client_Storage_Keys::workspace_key( $theme_id ),
			'nonce'        => wp_create_nonce( PufferDesk_Settings_Controller::NONCE_ACTION ),
			'folders'      => isset( $context['folders'] ) && is_array( $context['folders'] ) ? $context['folders'] : array(),
			'infoPanel'    => $this->get_info_panel_config( $theme ),
			'menu'         => $this->get_menu_config( $theme ),
			'theme'        => $theme,
			'typography'   => isset( $theme['typography'] ) ? $theme['typography'] : array(),
			'widgets'      => isset( $context['widgets'] ) && is_array( $context['widgets'] ) ? $context['widgets'] : array(),
			'windowChrome' => isset( $theme['window_chrome'] ) ? $theme['window_chrome'] : array(),
		);
	}

	/**
	 * Runtime behavior and labels for embedded WordPress admin frames.
	 *
	 * @return array<string,mixed>
	 */
	private function get_iframe_config() {
		return array(
			'readyTimeoutMs' => 6000,
			'labels'         => array(
				'loadingTitle'       => __( 'Loading...', 'pufferdesk' ),
				'loadingDescription' => '',
				'errorTitle'         => __( 'This page could not be safely embedded.', 'pufferdesk' ),
				'errorDescription'   => __( 'PufferDesk kept the page covered because it did not confirm iframe mode.', 'pufferdesk' ),
				'retry'              => __( 'Retry', 'pufferdesk' ),
				'openClassic'        => __( 'Open in Classic Admin', 'pufferdesk' ),
			),
		);
	}

	/**
	 * Shared stable identifiers exposed to browser-side contracts.
	 *
	 * @return array<string,mixed>
	 */
	private function get_contracts_config() {
		return array(
			'appDescriptors' => PufferDesk_App_Normalizer::client_contract(),
			'appIds'       => PufferDesk_App_Ids::all(),
			'appBadgeTones' => PufferDesk_App_Badge_Normalizer::get_tone_ids(),
			'appLocations' => PufferDesk_User_Preferences::get_app_location_ids(),
			'themeModes'   => PufferDesk_User_Preferences::get_theme_mode_ids(),
			'icons'       => PufferDesk_Icon_Renderer::client_contract(),
			'menuGroups'  => PufferDesk_App_Menu_Normalizer::client_contract(),
			'nativeAppIds' => PufferDesk_App_Ids::native_all(),
			'commandIds'   => PufferDesk_Command_Ids::all(),
			'contextMenu'  => PufferDesk_Context_Menu_Contracts::client_contract(),
			'router'       => PufferDesk_Router::client_contract(),
			'settingsDomainIds' => PufferDesk_Settings_Registry::domain_ids(),
			'storageKeys'  => PufferDesk_Client_Storage_Keys::all(),
			'tooltipPlacements' => PufferDesk_Tooltip_Renderer::get_placement_ids(),
			'wallpaperTypes' => PufferDesk_Wallpaper_Registry::get_type_ids(),
			'windowChrome' => PufferDesk_Window_Chrome_Contracts::client_contract(),
			'workspace'    => array(
				'defaultState' => PufferDesk_Workspace_State::get_default_state(),
				'desktopIconPrefixes' => array(
					'app'      => PufferDesk_Workspace_State::DESKTOP_ICON_PREFIX_APP,
					'document' => PufferDesk_Workspace_State::DESKTOP_ICON_PREFIX_DOCUMENT,
					'folder'   => PufferDesk_Workspace_State::DESKTOP_ICON_PREFIX_FOLDER,
				),
				'sections'     => PufferDesk_Workspace_State::get_section_ids(),
				'windowKinds'  => PufferDesk_Workspace_State::get_window_kind_ids(),
				'windowPlacementPrefixes' => PufferDesk_Workspace_State::get_window_placement_prefixes(),
			),
		);
	}

	/**
	 * Localized labels used by shared native info panels.
	 *
	 * @param array<string,mixed> $theme Active theme configuration.
	 * @return array<string,mixed>
	 */
	private function get_info_panel_config( $theme = array() ) {
		$labels = array(
			'aboutSiteTitle'            => __( 'About This Site', 'pufferdesk' ),
			'accessLabel'               => __( 'Visibility', 'pufferdesk' ),
			'applicationPlural'         => __( 'applications', 'pufferdesk' ),
			'applicationSingular'       => __( 'application', 'pufferdesk' ),
			'applyLabel'                => __( 'Apply', 'pufferdesk' ),
			'archiveAttribute'          => __( 'Archive', 'pufferdesk' ),
			'appsLabel'                 => __( 'Apps', 'pufferdesk' ),
			'attributesLabel'           => __( 'Attributes', 'pufferdesk' ),
			'cancelLabel'               => __( 'Cancel', 'pufferdesk' ),
			'capabilityAccess'          => __( 'Visible to users with matching WordPress capabilities', 'pufferdesk' ),
			'containsLabel'             => __( 'Contains', 'pufferdesk' ),
			'createdLabel'              => __( 'Added', 'pufferdesk' ),
			'documentFallbackTitle'     => __( 'Document', 'pufferdesk' ),
				/* translators: %s: item label. */
				'documentInfoTitle'         => __( '%s Details', 'pufferdesk' ),
			'fileFolderTypeLabel'       => __( 'File folder', 'pufferdesk' ),
			'filePlural'                => __( 'Files', 'pufferdesk' ),
			'fileSingular'              => __( 'File', 'pufferdesk' ),
			'folderFallbackTitle'       => __( 'Folder', 'pufferdesk' ),
				/* translators: %s: item label. */
				'folderInfoTitle'           => __( '%s Details', 'pufferdesk' ),
			'folderPlural'              => __( 'Folders', 'pufferdesk' ),
			'folderSingular'            => __( 'Folder', 'pufferdesk' ),
			/* translators: %s: folder contents count. */
			'folderSizeTemplate'        => __( '%s in this folder', 'pufferdesk' ),
			'generalSection'            => __( 'Overview', 'pufferdesk' ),
			'hiddenAttribute'           => __( 'Hidden', 'pufferdesk' ),
			'infoFallbackTitle'         => __( 'Details', 'pufferdesk' ),
			'itemPlural'                => __( 'items', 'pufferdesk' ),
			'itemSingular'              => __( 'item', 'pufferdesk' ),
			'itemCountTemplate'         => self::get_item_count_format(),
			'itemsLabel'                => __( 'Items', 'pufferdesk' ),
			'kindLabel'                 => __( 'Item type', 'pufferdesk' ),
			'lastOpenedLabel'           => __( 'Last opened', 'pufferdesk' ),
			'locationLabel'             => __( 'Location', 'pufferdesk' ),
			'modifiedLabel'             => __( 'Updated', 'pufferdesk' ),
			/* translators: %s: formatted modified date. */
			'modifiedTemplate'          => __( 'Updated %s', 'pufferdesk' ),
			'moreInfoLabel'             => __( 'Open details', 'pufferdesk' ),
			'moreInfoSection'           => __( 'Activity', 'pufferdesk' ),
			'nameSection'               => __( 'Name', 'pufferdesk' ),
			'noPreviewItems'            => __( 'No items to preview.', 'pufferdesk' ),
			'notAvailable'              => __( 'Not available', 'pufferdesk' ),
			'okLabel'                   => __( 'OK', 'pufferdesk' ),
			'pufferdeskFallback'        => PufferDesk_Product_Labels::name(),
			/* translators: %s: preview item count. */
			'previewAvailableTemplate'  => __( '%s available.', 'pufferdesk' ),
			'previewSection'            => __( 'Preview', 'pufferdesk' ),
			/* translators: 1: folder count, 2: folder label, 3: file count, 4: file label. */
			'propertiesContainsTemplate' => __( '%1$d %2$s, %3$d %4$s', 'pufferdesk' ),
			'propertiesCustomizeTab'     => __( 'Customize', 'pufferdesk' ),
			'propertiesGeneralTab'       => __( 'General', 'pufferdesk' ),
			'propertiesPreviousVersionsTab' => __( 'Previous Versions', 'pufferdesk' ),
			'propertiesSharingTab'       => __( 'Sharing', 'pufferdesk' ),
			'propertiesTabsLabel'        => __( 'Properties tabs', 'pufferdesk' ),
			'privateUserAccess'         => __( 'Only visible in this WordPress account', 'pufferdesk' ),
			'readOnlyAttribute'         => __( 'Read-only (Only applies to files in folder)', 'pufferdesk' ),
			'sharingPermissionsSection' => __( 'Visibility', 'pufferdesk' ),
			'siteHealthInfoTitle'       => __( 'Site diagnostics', 'pufferdesk' ),
			'sizeLabel'                 => __( 'Size', 'pufferdesk' ),
			'sizeOnDiskLabel'           => __( 'Size on disk', 'pufferdesk' ),
			'sourceLabel'               => __( 'Source', 'pufferdesk' ),
			'typeLabel'                 => __( 'Item type', 'pufferdesk' ),
			'whereLabel'                => __( 'Path', 'pufferdesk' ),
			'windowAriaLabel'           => self::get_window_title_format(),
			'wordpressSiteTitle'        => __( 'WordPress Site', 'pufferdesk' ),
			'zeroBytesLabel'            => __( '0 bytes', 'pufferdesk' ),
		);
		$theme_labels = $this->get_theme_info_panel_labels( $theme );

		if ( ! empty( $theme_labels ) ) {
			$labels = $this->merge_settings_labels( $labels, $theme_labels );
		}

		return array(
			'labels' => $labels,
		);
	}

	/**
	 * Theme-provided labels used by native info panels and related about surfaces.
	 *
	 * @param array<string,mixed> $theme Theme metadata.
	 * @return array<string,mixed>
	 */
	private function get_theme_info_panel_labels( $theme = array() ) {
		$theme_info_panel = isset( $theme['info_panel'] ) && is_array( $theme['info_panel'] ) ? $theme['info_panel'] : array();

		return isset( $theme_info_panel['labels'] ) && is_array( $theme_info_panel['labels'] ) ? $theme_info_panel['labels'] : array();
	}

	/**
	 * Resolve a single theme info-panel label with a localized fallback.
	 *
	 * @param array<string,mixed> $theme Theme metadata.
	 * @param string              $key Label key.
	 * @param string              $fallback Localized fallback.
	 * @return string
	 */
	private function get_theme_info_panel_label( $theme, $key, $fallback ) {
		$labels = $this->get_theme_info_panel_labels( $theme );

		return isset( $labels[ $key ] ) && is_string( $labels[ $key ] ) && '' !== $labels[ $key ] ? $labels[ $key ] : $fallback;
	}

	/**
	 * Build a logout URL suitable for runtime command data.
	 *
	 * WordPress logout helpers escape ampersands for HTML output. Runtime command
	 * payloads need raw query separators so nonce parameters survive navigation.
	 *
	 * @return string
	 */
	private function get_logout_url() {
		return esc_url_raw( html_entity_decode( wp_logout_url(), ENT_QUOTES ) );
	}

	/**
	 * Sticky Notes document runtime endpoints.
	 *
	 * @param array<string,mixed> $theme Active theme configuration.
	 * @return array<string,mixed>
	 */
	private function get_documents_config( $theme = array() ) {
		$window_chrome = PufferDesk_Window_Chrome_Contracts::default_config();
		$close_label   = isset( $window_chrome['controls']['labels'][ PufferDesk_Window_Chrome_Contracts::CONTROL_CLOSE ] )
			? $window_chrome['controls']['labels'][ PufferDesk_Window_Chrome_Contracts::CONTROL_CLOSE ]
			: PufferDesk_Window_Chrome_Contracts::CONTROL_CLOSE;
		$document_labels = PufferDesk_Document_Service::get_default_labels();
		$theme_documents = isset( $theme['documents'] ) && is_array( $theme['documents'] ) ? $theme['documents'] : array();
		$sticky_save_policy = isset( $theme_documents['stickyNoteSavePolicy'] ) && in_array( $theme_documents['stickyNoteSavePolicy'], array( 'ask-on-first-save', 'default-location' ), true )
			? $theme_documents['stickyNoteSavePolicy']
			: 'default-location';

		return array(
			'actions'      => array(
				'create'    => PufferDesk_Document_Controller::ACTION_CREATE,
				'delete'    => PufferDesk_Document_Controller::ACTION_DELETE,
				'duplicate' => PufferDesk_Document_Controller::ACTION_DUPLICATE,
				'get'       => PufferDesk_Document_Controller::ACTION_GET,
				'list'      => PufferDesk_Document_Controller::ACTION_LIST,
				'restore'   => PufferDesk_Document_Controller::ACTION_RESTORE,
				'update'    => PufferDesk_Document_Controller::ACTION_UPDATE,
			),
			'capabilities' => array(
				'canEdit' => current_user_can( PufferDesk_Document_Service::CAPABILITY ),
			),
			'kinds'        => array(
				'sticky' => PufferDesk_Document_Service::KIND_STICKY,
			),
			'openWith'     => array(
				array(
					'appId'         => PufferDesk_App_Ids::STICKY_NOTES,
					'documentKinds' => array( PufferDesk_Document_Service::KIND_STICKY ),
					'id'            => PufferDesk_App_Ids::STICKY_NOTES,
					'label'         => __( 'Sticky Notes', 'pufferdesk' ),
				),
			),
			'savePolicies' => array(
				'stickyNote' => $sticky_save_policy,
			),
			'labels'       => array(
				'bold'                         => __( 'Bold', 'pufferdesk' ),
				'bulletList'                   => __( 'Bullet list', 'pufferdesk' ),
				'cancel'                       => __( 'Cancel', 'pufferdesk' ),
				'close'                        => $close_label,
				'couldNotLoadStickyNotes'      => __( 'Could not load sticky notes.', 'pufferdesk' ),
				'delete'                       => __( 'Delete', 'pufferdesk' ),
				'deleteNote'                   => __( 'Delete Note', 'pufferdesk' ),
				'deleteStickyNote'             => __( 'Delete this note?', 'pufferdesk' ),
				'deleted'                      => __( 'Deleted', 'pufferdesk' ),
				'discardNote'                  => __( 'Discard Note', 'pufferdesk' ),
				'discardNoteMessage'           => __( 'Are you sure you want to discard this sticky note?', 'pufferdesk' ),
				'discardNoteTitle'             => __( "If you don't save this note, its contents will be lost.", 'pufferdesk' ),
				'formatting'                   => __( 'Formatting', 'pufferdesk' ),
				'fullscreenNote'               => __( 'Make Full Screen', 'pufferdesk' ),
				'hideNote'                     => __( 'Hide Note', 'pufferdesk' ),
				'imageUrlPrompt'               => __( 'Image URL', 'pufferdesk' ),
				'insertImage'                  => __( 'Insert image', 'pufferdesk' ),
				'italic'                       => __( 'Italic', 'pufferdesk' ),
				'loading'                      => __( 'Loading...', 'pufferdesk' ),
				'newNote'                      => __( 'New Note', 'pufferdesk' ),
				'newStickyNote'                => __( 'New Sticky Note', 'pufferdesk' ),
				'noSearchResults'              => __( 'No matching notes', 'pufferdesk' ),
				'noStickyNotes'                => __( 'No sticky notes', 'pufferdesk' ),
				'noteOptions'                  => __( 'Note options', 'pufferdesk' ),
				'notesList'                    => __( 'Notes list', 'pufferdesk' ),
				'save'                         => __( 'Save', 'pufferdesk' ),
				'saveAs'                       => __( 'Save As:', 'pufferdesk' ),
				'saveStickyNoteTitle'          => __( 'Save Sticky Note', 'pufferdesk' ),
				'saveEllipsis'                 => __( 'Save...', 'pufferdesk' ),
				'saveLocationUnavailable'      => __( 'No save locations available.', 'pufferdesk' ),
				'saved'                        => __( 'Saved', 'pufferdesk' ),
				'saving'                       => __( 'Saving...', 'pufferdesk' ),
				'search'                       => __( 'Search', 'pufferdesk' ),
				'searchPlaceholder'            => __( 'Search...', 'pufferdesk' ),
				'show'                         => __( 'Show', 'pufferdesk' ),
				'stickyNote'                   => $document_labels['stickyNote'],
				'stickyNotes'                  => __( 'Sticky Notes', 'pufferdesk' ),
				'stickyPlaceholder'            => __( 'Take a note...', 'pufferdesk' ),
				'stickyNotesServiceUnavailable' => __( 'Sticky Notes service unavailable.', 'pufferdesk' ),
				'strikethrough'                => __( 'Strikethrough', 'pufferdesk' ),
				'underline'                    => __( 'Underline', 'pufferdesk' ),
				'untitledStickyNote'           => $document_labels['untitledStickyNote'],
				'where'                        => __( 'Path:', 'pufferdesk' ),
			),
		);
	}

	/**
	 * WordPress content search runtime endpoints.
	 *
	 * @return array<string,mixed>
	 */
	private function get_content_search_config() {
		return array(
			'actions'    => array(
				'search' => PufferDesk_Content_Search_Controller::ACTION_SEARCH,
			),
			'debounceMs' => 160,
			'enabled'   => current_user_can( 'read' ),
			'limit'     => PufferDesk_Content_Search_Service::DEFAULT_LIMIT,
			'types'     => array(
				'attachment' => array(
					'groupLabel' => __( 'Media', 'pufferdesk' ),
					'label'      => __( 'Media', 'pufferdesk' ),
					'resultType' => 'wp_attachment',
				),
				'page'       => array(
					'groupLabel' => __( 'Pages', 'pufferdesk' ),
					'label'      => __( 'Page', 'pufferdesk' ),
					'resultType' => 'wp_page',
				),
				'post'       => array(
					'groupLabel' => __( 'Posts', 'pufferdesk' ),
					'label'      => __( 'Post', 'pufferdesk' ),
					'resultType' => 'wp_post',
				),
			),
		);
	}

	/**
	 * Shared shell dialog runtime metadata.
	 *
	 * @param array<string,mixed> $theme Current theme.
	 * @return array<string,mixed>
	 */
	private function get_dialogs_config( $theme = array() ) {
		$dialogs       = isset( $theme['dialogs'] ) && is_array( $theme['dialogs'] ) ? $theme['dialogs'] : array();
		$labels        = isset( $dialogs['labels'] ) && is_array( $dialogs['labels'] ) ? $dialogs['labels'] : array();
		$window_chrome = PufferDesk_Window_Chrome_Contracts::default_config();
		$close_label   = isset( $window_chrome['controls']['labels'][ PufferDesk_Window_Chrome_Contracts::CONTROL_CLOSE ] )
			? $window_chrome['controls']['labels'][ PufferDesk_Window_Chrome_Contracts::CONTROL_CLOSE ]
			: PufferDesk_Window_Chrome_Contracts::CONTROL_CLOSE;

		$dialogs['labels'] = wp_parse_args(
			$labels,
			array(
				'cancel'  => __( 'Cancel', 'pufferdesk' ),
				'close'   => $close_label,
				'confirm' => __( 'OK', 'pufferdesk' ),
			)
		);

		return $dialogs;
	}

	/**
	 * Get a compact label for the current user's primary WordPress role.
	 *
	 * @param WP_User $user User object.
	 * @return string
	 */
	private function get_user_role_label( $user ) {
		$roles = isset( $user->roles ) && is_array( $user->roles ) ? array_values( array_filter( $user->roles ) ) : array();

		if ( empty( $roles ) ) {
			return __( 'WordPress User', 'pufferdesk' );
		}

		$role       = sanitize_key( $roles[0] );
		$role_names = wp_roles()->role_names;

		if ( '' === $role ) {
			return __( 'WordPress User', 'pufferdesk' );
		}

		if ( isset( $role_names[ $role ] ) ) {
			return translate_user_role( $role_names[ $role ] );
		}

		return ucwords( str_replace( '_', ' ', $role ) );
	}

	/**
	 * Safe site details for the About This Site window.
	 *
	 * @param array<string,mixed> $theme Active theme configuration.
	 * @return array<string,mixed>
	 */
	private function get_site_info_config( $theme = array() ) {
		global $wpdb;

		$wp_theme        = wp_get_theme();
		$theme_name      = $wp_theme->exists() ? $wp_theme->get( 'Name' ) : __( 'Unknown', 'pufferdesk' );
		$theme_version   = $wp_theme->exists() ? $wp_theme->get( 'Version' ) : '';
		$wp_version      = get_bloginfo( 'version' );
		$wp_release_name = $this->get_wordpress_release_name( $wp_version );
		$database_label  = isset( $wpdb ) && method_exists( $wpdb, 'db_version' ) ? $wpdb->db_version() : '';
		$site_url        = home_url( '/' );
		$site_icon_url   = $this->get_site_identity_image_url();
		$server_software = $this->get_server_software_label();
		$tagline         = trim( get_bloginfo( 'description' ) );
		$site_url_label  = preg_replace( '#^https?://#', '', untrailingslashit( $site_url ) );
		$wp_label        = $wp_release_name
			? sprintf(
				self::get_combined_label_format(),
				$wp_release_name,
				$wp_version
			)
			: $wp_version;
		$rows            = array(
			array(
				'label' => __( 'PHP', 'pufferdesk' ),
				'value' => PHP_VERSION,
			),
			array(
				'label' => __( 'Database', 'pufferdesk' ),
				'value' => $database_label,
			),
			array(
				'label' => __( 'Server', 'pufferdesk' ),
				'value' => $server_software,
			),
		);

		return array(
			'title'         => __( 'About This Site', 'pufferdesk' ),
			'name'          => get_bloginfo( 'name' ),
			'url'           => $site_url_label,
			'tagline'       => $tagline,
			'aboutSubtitle' => $tagline ? $tagline : $site_url_label,
			'iconUrl'       => $site_icon_url,
			'wordpress'     => array(
				'icon'  => 'dashicons-wordpress',
				'title' => $wp_release_name
					? sprintf(
						/* translators: %s: WordPress release name. */
						__( 'WordPress %s', 'pufferdesk' ),
						$wp_release_name
					)
					: __( 'WordPress', 'pufferdesk' ),
				'value' => PufferDesk_App_Normalizer::format_about_version( $wp_version ),
			),
			'display'       => array(
				'buttonIcon'  => 'dashicons-admin-appearance',
				'buttonLabel' => __( 'Theme Settings...', 'pufferdesk' ),
				'buttonTitle' => __( 'Themes', 'pufferdesk' ),
				'buttonUrl'   => current_user_can( 'switch_themes' ) ? admin_url( 'themes.php' ) : '',
				'icon'        => 'dashicons-desktop',
				'title'       => $theme_name,
				'value'       => $theme_version
					? PufferDesk_App_Normalizer::format_about_version( $theme_version )
					: '',
			),
			'rows'          => array_values(
				array_filter(
					$rows,
					static function ( $row ) {
						return ! empty( $row['value'] );
					}
				)
			),
			'aboutRows'     => array_values(
				array_filter(
					array_merge(
						$rows,
						array(
							array(
								'label' => __( 'WordPress', 'pufferdesk' ),
								'value' => $wp_label,
							),
						)
					),
					static function ( $row ) {
						return ! empty( $row['value'] );
					}
				)
			),
			'moreInfoLabel'   => $this->get_theme_info_panel_label( $theme, 'moreInfoLabel', __( 'More Info...', 'pufferdesk' ) ),
			'moreInfoCommand' => PufferDesk_Command_Ids::SETTINGS_OPEN_PANEL,
			'moreInfoPanel'   => 'general-about',
			'moreInfoTitle'   => $this->get_theme_info_panel_label( $theme, 'siteHealthInfoTitle', __( 'Site Health Info', 'pufferdesk' ) ),
			'moreInfoUrl'     => PufferDesk_Admin_Screen_Availability::can_view_site_health() ? admin_url( 'site-health.php?tab=debug' ) : '',
			'footer'          => sprintf(
				/* translators: %s: PufferDesk plugin version. */
				__( 'PufferDesk %s · Built for WordPress admin.', 'pufferdesk' ),
				PUFFERDESK_VERSION
			),
		);
	}

	/**
	 * Safe product details for the About PufferDesk window.
	 *
	 * @param array<string,mixed> $theme Active theme configuration.
	 * @return array<string,mixed>
	 */
	private function get_product_info_config( $theme = array() ) {
		return array(
			'title'         => __( 'About PufferDesk', 'pufferdesk' ),
			'name'          => PufferDesk_Product_Labels::name(),
			'url'           => 'pufferdesk.com',
			'tagline'       => __( 'Turn your WordPress admin into a desktop.', 'pufferdesk' ),
			'aboutSubtitle' => __( 'Turn your WordPress admin into a desktop.', 'pufferdesk' ),
			'iconUrl'       => $this->get_product_identity_image_url(),
			'aboutLines'    => array(
				PufferDesk_App_Normalizer::format_about_version( PUFFERDESK_VERSION ),
				PufferDesk_App_Normalizer::format_about_author( 'Senol Sahin' ),
				__( 'GPLv2 or later', 'pufferdesk' ),
			),
			'aboutRows'     => array(
				array(
					'label' => __( 'Version', 'pufferdesk' ),
					'value' => PufferDesk_App_Normalizer::format_about_version( PUFFERDESK_VERSION ),
				),
				array(
					'label' => __( 'Author', 'pufferdesk' ),
					'value' => 'Senol Sahin',
				),
				array(
					'label' => __( 'License', 'pufferdesk' ),
					'value' => __( 'GPLv2 or later', 'pufferdesk' ),
				),
			),
			'moreInfoLabel'   => $this->get_theme_info_panel_label( $theme, 'moreInfoLabel', __( 'More Info...', 'pufferdesk' ) ),
			'moreInfoCommand' => PufferDesk_Command_Ids::OPEN_EXTERNAL_URL,
			'moreInfoTitle'   => PufferDesk_Product_Labels::name(),
			'moreInfoUrl'     => 'https://pufferdesk.com/',
			'footer'          => sprintf(
				/* translators: %s: PufferDesk plugin version. */
				__( 'PufferDesk %s · Built for WordPress admin.', 'pufferdesk' ),
				PUFFERDESK_VERSION
			),
		);
	}

	/**
	 * Original PufferDesk mark URL for product About surfaces.
	 *
	 * @return string
	 */
	private function get_product_identity_image_url() {
		$path = 'shared/icons/pufferdesk-mark.svg';
		$file = PUFFERDESK_DIR . 'assets/media/' . $path;

		if ( ! file_exists( $file ) ) {
			return '';
		}

		$version = filemtime( $file );
		if ( false === $version ) {
			$version = PUFFERDESK_VERSION;
		}

		return esc_url_raw(
			add_query_arg(
				'ver',
				(string) $version,
				PUFFERDESK_URL . 'assets/media/' . $path
			)
		);
	}

	/**
	 * WordPress release name matching the installed major/minor version.
	 *
	 * @param string $version WordPress version.
	 * @return string
	 */
	private function get_wordpress_release_name( $version ) {
		$release_names = array(
			'6.0' => 'Arturo O\'Farrill',
			'6.1' => 'Mikhail "Misha" Alperin',
			'6.2' => 'Dolphy',
			'6.3' => 'Lionel',
			'6.4' => 'Shirley',
			'6.5' => 'Regina',
			'6.6' => 'Dorsey',
			'6.7' => 'Rollins',
			'6.8' => 'Cecil',
			'6.9' => 'Gene Harris',
			'7.0' => 'Louis Armstrong',
		);

		if ( ! preg_match( '/^(\d+\.\d+)/', (string) $version, $matches ) ) {
			return '';
		}

		return isset( $release_names[ $matches[1] ] ) ? $release_names[ $matches[1] ] : '';
	}

	/**
	 * Site logo or icon URL for About This Site.
	 *
	 * @return string
	 */
	private function get_site_identity_image_url() {
		$logo_id = (int) get_theme_mod( 'custom_logo' );

		if ( $logo_id ) {
			$logo_url = wp_get_attachment_image_url( $logo_id, 'full' );
			if ( $logo_url ) {
				return esc_url_raw( $logo_url );
			}
		}

		$site_icon_url = get_site_icon_url( 256 );

		return $site_icon_url ? esc_url_raw( $site_icon_url ) : '';
	}

	/**
	 * Public web server software label without sensitive host details.
	 *
	 * @return string
	 */
	private function get_server_software_label() {
		$server_software = isset( $_SERVER['SERVER_SOFTWARE'] )
			? sanitize_text_field( wp_unslash( $_SERVER['SERVER_SOFTWARE'] ) )
			: '';

		if ( '' === $server_software ) {
			return __( 'Unknown', 'pufferdesk' );
		}

		return preg_replace( '/\s+/', ' ', $server_software );
	}

	/**
	 * Theme-provided shell labels with release-safe defaults.
	 *
	 * @param array<string,mixed> $theme Current theme.
	 * @return array<string,string>
	 */
	private function get_theme_shell_labels( $theme = array() ) {
		$defaults = array(
			'launcher'             => __( 'Launcher', 'pufferdesk' ),
			'desktop_launcher'     => __( 'Desktop & Launcher', 'pufferdesk' ),
			'launcher_and_desktop' => __( 'Launcher & Desktop', 'pufferdesk' ),
			'launcher_position'    => __( 'Launcher position on screen', 'pufferdesk' ),
			'auto_hide_launcher'   => __( 'Automatically hide the launcher', 'pufferdesk' ),
			'launcher_options'     => __( 'Launcher Options', 'pufferdesk' ),
			'keep_in_launcher'     => __( 'Keep in Launcher', 'pufferdesk' ),
			'remove_from_launcher' => __( 'Remove from Launcher', 'pufferdesk' ),
			'open_at_login'        => __( 'Open at startup', 'pufferdesk' ),
			'menu_bar'             => __( 'Top Bar', 'pufferdesk' ),
			'menu_bar_background'  => __( 'Show top bar background', 'pufferdesk' ),
		);
		$labels   = isset( $theme['shell']['labels'] ) && is_array( $theme['shell']['labels'] )
			? $theme['shell']['labels']
			: array();

		return wp_parse_args( $labels, $defaults );
	}

	/**
	 * Theme-provided menu labels.
	 *
	 * @param array<string,mixed> $theme Current theme.
	 * @return array<string,string>
	 */
	private function get_theme_menu_labels( $theme = array() ) {
		return isset( $theme['menu']['labels'] ) && is_array( $theme['menu']['labels'] )
			? $theme['menu']['labels']
			: array();
	}

	/**
	 * Get a theme-provided menu label.
	 *
	 * @param array<string,mixed> $theme Current theme.
	 * @param string              $key Label key.
	 * @param string              $fallback Default label.
	 * @return string
	 */
	private function get_theme_menu_label( $theme, $key, $fallback ) {
		$labels = $this->get_theme_menu_labels( $theme );

		return isset( $labels[ $key ] ) && is_string( $labels[ $key ] ) && '' !== $labels[ $key ]
			? $labels[ $key ]
			: $fallback;
	}

	/**
	 * Theme-provided window control labels with defaults.
	 *
	 * @param array<string,mixed> $theme Current theme.
	 * @return array<string,string>
	 */
	private function get_theme_window_control_labels( $theme = array() ) {
		$default_config = PufferDesk_Window_Chrome_Contracts::default_config();
		$defaults       = isset( $default_config['controls']['labels'] ) && is_array( $default_config['controls']['labels'] )
			? $default_config['controls']['labels']
			: array();
		$labels         = isset( $theme['window_chrome']['controls']['labels'] ) && is_array( $theme['window_chrome']['controls']['labels'] )
			? $theme['window_chrome']['controls']['labels']
			: array();

		return wp_parse_args( $labels, $defaults );
	}

	/**
	 * Shell surface capabilities derived from normalized theme metadata.
	 *
	 * @param array<string,mixed> $theme Current theme.
	 * @return array<string,mixed>
	 */
	private function get_shell_capabilities_config( $theme = array() ) {
		$shell       = isset( $theme['shell'] ) && is_array( $theme['shell'] ) ? $theme['shell'] : array();
		$launcher    = isset( $shell['launcher'] ) ? (string) $shell['launcher'] : 'dock';
		$top_bar     = isset( $shell['top_bar'] ) ? (string) $shell['top_bar'] : 'menu-bar';
		$system_menu = isset( $shell['system_menu'] ) ? (string) $shell['system_menu'] : 'mark';
		$app_menu    = isset( $shell['app_menu'] ) ? (string) $shell['app_menu'] : 'global';
		$status_area = isset( $shell['status_area'] ) ? (string) $shell['status_area'] : 'menu-bar';
		$has_launcher = 'none' !== $launcher;
		$has_menu_bar = 'menu-bar' === $top_bar || 'global' === $app_menu || 'menu-bar' === $status_area || 'mark' === $system_menu;

		return array(
			'hasLauncher'       => $has_launcher,
			'hasDock'           => 'dock' === $launcher,
			'hasTaskbar'        => 'taskbar' === $launcher || 'taskbar' === $top_bar || 'taskbar' === $status_area || 'start' === $system_menu,
			'hasMenuBar'        => $has_menu_bar,
			'hasGlobalAppMenu'  => 'global' === $app_menu,
			'hasSystemMenu'     => 'none' !== $system_menu,
			'hasStatusArea'     => 'none' !== $status_area,
			'launcher'          => array(
				'enabled'       => $has_launcher,
				'kind'          => $launcher,
				'position'      => 'dock' === $launcher,
				'magnification' => 'dock' === $launcher,
				'autoHide'      => $has_launcher,
				'indicators'    => $has_launcher,
			),
			'menuBar'           => array(
				'enabled'    => $has_menu_bar,
				'background' => $has_menu_bar,
				'recent'     => 'global' === $app_menu,
				),
				'appLocations'      => array(
					'launcher' => $has_launcher,
					'desktop'  => true,
				),
				'appearance'        => array(
					'accentColor' => true,
				),
			);
		}

	/**
	 * Settings data used by native System Settings panels.
	 *
	 * @param array<string,mixed> $theme Current theme.
	 * @return array<string,mixed>
	 */
	private function get_settings_config( $theme = array() ) {
		$labels         = $this->get_settings_labels_config( $theme );
		$general_labels = isset( $labels['generalPanel'] ) && is_array( $labels['generalPanel'] ) ? $labels['generalPanel'] : array();

		return array(
			'capabilities' => $this->get_shell_capabilities_config( $theme ),
			'domains'      => $this->settings_registry->get_client_domains(),
			'general' => array(
				'description' => isset( $general_labels['description'] ) ? $general_labels['description'] : '',
				'groups'      => $this->get_general_settings_groups(),
				'home'        => $this->get_general_settings_home_config(),
			),
			'labels'  => $labels,
		);
	}

	/**
	 * Native WordPress admin experience config.
	 *
	 * @return array<string,mixed>
	 */
	private function get_native_admin_config() {
		$preferences       = $this->preferences->get_native_admin();
		$users_enabled     = ! empty( $preferences['users'] );
		$can_users         = current_user_can( PufferDesk_Users_Controller::CAPABILITY );
		$can_create_users  = current_user_can( PufferDesk_Users_Controller::CAPABILITY_CREATE );
		$can_edit_profile  = current_user_can( 'edit_user', get_current_user_id() );
		$features          = array(
			'directory' => $users_enabled && $can_users,
			'add'       => $users_enabled && $can_create_users,
			'profile'   => $users_enabled && $can_edit_profile,
		);

		return array(
			'preferences' => $preferences,
			'apps'        => array(
				PufferDesk_App_Ids::USERS => array(
					'actions'      => array(
						'create'        => PufferDesk_Users_Controller::ACTION_CREATE,
						'getProfile'    => PufferDesk_Users_Controller::ACTION_GET_PROFILE,
						'list'          => PufferDesk_Users_Controller::ACTION_LIST,
						'updateProfile' => PufferDesk_Users_Controller::ACTION_UPDATE_PROFILE,
					),
					'canAccess'    => $can_users,
					'canCreate'    => $can_create_users,
					'canProfile'   => $can_edit_profile,
					'capability'   => PufferDesk_Users_Controller::CAPABILITY,
					'enabled'      => ! empty( $features['directory'] ),
					'fallbackUrls' => array(
						'add'       => esc_url_raw( admin_url( 'user-new.php' ) ),
						'directory' => esc_url_raw( admin_url( 'users.php' ) ),
						'profile'   => esc_url_raw( admin_url( 'profile.php' ) ),
					),
					'defaultRole'  => $this->get_default_user_role(),
					'features'     => $features,
					'native'       => PufferDesk_App_Ids::NATIVE_USERS,
					'perPage'      => PufferDesk_Users_Controller::LIST_PER_PAGE,
					'preference'   => 'users',
					'roleOptions'  => $this->get_editable_user_role_options(),
				),
			),
			'labels'      => array(
				'users' => array(
					'addUser'           => __( 'Add User', 'pufferdesk' ),
					'addUserTitle'      => __( 'Add User', 'pufferdesk' ),
					'advancedDetails'   => __( 'Advanced Details', 'pufferdesk' ),
					'allRoles'          => __( 'All roles', 'pufferdesk' ),
					'bioLabel'          => __( 'Bio', 'pufferdesk' ),
					'cancel'            => __( 'Cancel', 'pufferdesk' ),
					'close'             => __( 'Close', 'pufferdesk' ),
					'createUser'        => __( 'Add User', 'pufferdesk' ),
					'detailsTitle'      => __( 'User Details', 'pufferdesk' ),
					'displayNameLabel'  => __( 'Display name', 'pufferdesk' ),
					'editInWordPress'   => __( 'Edit in WordPress', 'pufferdesk' ),
					'editProfile'       => __( 'Edit Profile', 'pufferdesk' ),
					'emailLabel'        => __( 'Email', 'pufferdesk' ),
					'emptyDescription'  => __( 'Try a different search term or role filter.', 'pufferdesk' ),
					'emptyTitle'        => __( 'No users found', 'pufferdesk' ),
					'firstNameLabel'    => __( 'First name', 'pufferdesk' ),
					'inviteLabel'       => __( 'Send the new user an email invitation', 'pufferdesk' ),
					'lastNameLabel'     => __( 'Last name', 'pufferdesk' ),
					'loading'           => __( 'Loading users...', 'pufferdesk' ),
					'loginLabel'        => __( 'Username', 'pufferdesk' ),
					'manualUsername'    => __( 'Set username manually', 'pufferdesk' ),
					'nameLabel'         => __( 'Name', 'pufferdesk' ),
					'nativeDisabled'    => __( 'This native workflow is disabled in Settings.', 'pufferdesk' ),
					'openProfile'       => __( 'Open Profile', 'pufferdesk' ),
					'paginationEmpty'   => __( 'No users', 'pufferdesk' ),
						/* translators: 1: Current page number, 2: Total page count. */
						'paginationPage'    => __( 'Page %1$d of %2$d', 'pufferdesk' ),
						/* translators: 1: First visible user number, 2: Last visible user number, 3: Total users. */
						'paginationRange'   => __( 'Showing %1$d-%2$d of %3$d', 'pufferdesk' ),
					'permissionDenied'  => __( 'You do not have permission to view users.', 'pufferdesk' ),
					'postsLabel'        => __( 'Posts', 'pufferdesk' ),
					'nextPage'          => __( 'Next', 'pufferdesk' ),
					'previousPage'      => __( 'Previous', 'pufferdesk' ),
					'profileTitle'      => __( 'Profile', 'pufferdesk' ),
					'registeredLabel'   => __( 'Registered', 'pufferdesk' ),
					'roleLabel'         => __( 'Role', 'pufferdesk' ),
					'saveProfile'       => __( 'Save Profile', 'pufferdesk' ),
					'saving'            => __( 'Saving...', 'pufferdesk' ),
					'searchLabel'       => __( 'Search users', 'pufferdesk' ),
					'searchPlaceholder' => __( 'Search users', 'pufferdesk' ),
					'serviceError'      => __( 'Users could not be loaded.', 'pufferdesk' ),
					'subtitle'          => __( 'WordPress account directory', 'pufferdesk' ),
					'usernameHelp'      => __( 'Leave blank to generate it from the email address.', 'pufferdesk' ),
					'urlLabel'          => __( 'Website', 'pufferdesk' ),
						/* translators: %d: Number of users. */
						'userCount'         => __( '%d users', 'pufferdesk' ),
					'userCreated'       => __( 'User added.', 'pufferdesk' ),
					'usersTitle'        => __( 'Users', 'pufferdesk' ),
				),
			),
		);
	}

	/**
	 * Get editable WordPress role choices for native user forms.
	 *
	 * @return array<int,array<string,string>>
	 */
	private function get_editable_user_role_options() {
		if ( ! current_user_can( 'promote_users' ) ) {
			return array();
		}

		if ( ! function_exists( 'get_editable_roles' ) ) {
			require_once ABSPATH . 'wp-admin/includes/user.php';
		}

		$roles   = function_exists( 'get_editable_roles' ) ? get_editable_roles() : array();
		$options = array();

		foreach ( $roles as $role => $data ) {
			$role = sanitize_key( (string) $role );
			if ( '' === $role ) {
				continue;
			}

			$options[] = array(
				'label' => translate_user_role( isset( $data['name'] ) ? $data['name'] : $role ),
				'value' => $role,
			);
		}

		usort(
			$options,
			static function ( $a, $b ) {
				return strcasecmp( $a['label'], $b['label'] );
			}
		);

		return $options;
	}

	/**
	 * Get the default assignable WordPress role for the current user.
	 *
	 * @return string
	 */
	private function get_default_user_role() {
		if ( ! function_exists( 'get_editable_roles' ) ) {
			require_once ABSPATH . 'wp-admin/includes/user.php';
		}

		$roles   = function_exists( 'get_editable_roles' ) ? get_editable_roles() : array();
		$default = sanitize_key( (string) get_option( 'default_role', 'subscriber' ) );

		if ( isset( $roles[ $default ] ) ) {
			return $default;
		}

		$role_keys = array_keys( $roles );

		return ! empty( $role_keys ) ? sanitize_key( (string) $role_keys[0] ) : '';
	}

	/**
	 * Theme mode options used by the Appearance settings panel.
	 *
	 * @return array<int,array<string,string>>
	 */
	private function get_theme_mode_options_config() {
		return array(
			array(
				'value' => PufferDesk_User_Preferences::THEME_MODE_DEFAULT,
				'label' => __( 'Default', 'pufferdesk' ),
			),
		);
	}

	/**
	 * Localized labels and option lists used by native System Settings panels.
	 *
	 * @param array<string,mixed> $theme Current theme.
	 * @return array<string,mixed>
	 */
	private function get_settings_labels_config( $theme = array() ) {
		$shell_labels           = $this->get_theme_shell_labels( $theme );
		$capabilities           = $this->get_shell_capabilities_config( $theme );
		$launcher_label         = $shell_labels['launcher'];
		$desktop_launcher_label = $shell_labels['desktop_launcher'];
		$launcher_and_desktop   = $shell_labels['launcher_and_desktop'];
		$menu_bar_label         = $shell_labels['menu_bar'];
		$app_location_options   = array(
			array( 'value' => PufferDesk_User_Preferences::APP_LOCATION_DESKTOP, 'label' => __( 'Desktop', 'pufferdesk' ) ),
			array( 'value' => PufferDesk_User_Preferences::APP_LOCATION_HIDDEN, 'label' => __( 'Hidden', 'pufferdesk' ) ),
		);
		if ( ! empty( $capabilities['appLocations']['launcher'] ) ) {
			$app_location_options = array(
				array( 'value' => PufferDesk_User_Preferences::APP_LOCATION_DOCK, 'label' => $launcher_label ),
				array( 'value' => PufferDesk_User_Preferences::APP_LOCATION_DESKTOP, 'label' => __( 'Desktop', 'pufferdesk' ) ),
				array( 'value' => PufferDesk_User_Preferences::APP_LOCATION_BOTH, 'label' => $launcher_and_desktop ),
				array( 'value' => PufferDesk_User_Preferences::APP_LOCATION_HIDDEN, 'label' => __( 'Hidden', 'pufferdesk' ) ),
			);
		}

		$labels = array(
			'appTitle'     => __( 'Settings', 'pufferdesk' ),
			'status'       => array(
				'saving'                 => __( 'Saving...', 'pufferdesk' ),
				'removing'               => __( 'Removing...', 'pufferdesk' ),
				'serviceUnavailable'     => __( 'Settings service unavailable.', 'pufferdesk' ),
				'appearanceSaveError'    => __( 'Appearance could not be saved.', 'pufferdesk' ),
					'appearanceSaved'        => __( 'Appearance saved.', 'pufferdesk' ),
					'desktopDockSaveError'   => sprintf(
						/* translators: %s: settings section label. */
						__( '%s could not be saved.', 'pufferdesk' ),
						$desktop_launcher_label
					),
				'appLocationsSaveError'  => __( 'App locations could not be saved.', 'pufferdesk' ),
				'appLocationsSaved'      => __( 'App locations saved.', 'pufferdesk' ),
					'loginItemsSaveError'    => __( 'Login items could not be saved.', 'pufferdesk' ),
					'loginItemsSaved'        => __( 'Login items saved.', 'pufferdesk' ),
					'menuBarSaveError'       => sprintf(
						/* translators: %s: settings section label. */
						__( '%s could not be saved.', 'pufferdesk' ),
						$menu_bar_label
					),
				'nativeAdminSaveError'   => __( 'Native admin experiences could not be saved.', 'pufferdesk' ),
				'nativeAdminSaved'       => __( 'Native admin experiences saved.', 'pufferdesk' ),
				'notificationsSaveError' => __( 'Notifications could not be saved.', 'pufferdesk' ),
				'notificationsSaved'     => __( 'Notifications saved.', 'pufferdesk' ),
				'wallpaperSaveError'     => __( 'Wallpaper could not be saved.', 'pufferdesk' ),
				'wallpaperSaved'         => __( 'Wallpaper saved.', 'pufferdesk' ),
				'photoRemoveError'       => __( 'Photo could not be removed.', 'pufferdesk' ),
				'photoRemoved'           => __( 'Photo removed.', 'pufferdesk' ),
				'themeSaveError'         => __( 'Theme could not be saved.', 'pufferdesk' ),
				'themeSaved'             => __( 'Theme saved.', 'pufferdesk' ),
				'themeSwitching'         => __( 'Switching theme...', 'pufferdesk' ),
				'settingsResetError'     => __( 'PufferDesk settings could not be reset.', 'pufferdesk' ),
				'mediaUnavailable'       => __( 'Media Library is not available for this user.', 'pufferdesk' ),
				'invalidImage'           => __( 'Choose a valid image.', 'pufferdesk' ),
			),
			'history'      => array(
				'back'    => __( 'Back', 'pufferdesk' ),
				'forward' => __( 'Forward', 'pufferdesk' ),
			),
			'workspace'    => array(
				'cancelLabel'                  => __( 'Cancel', 'pufferdesk' ),
				'resetCurrentConfirmLabel'     => __( 'Reset Layout', 'pufferdesk' ),
				'resetCurrentMessage'          => __( 'This will reset windows, desktop icons, widgets, and folders for the current theme.', 'pufferdesk' ),
				'resetCurrentTitle'            => __( 'Reset layout?', 'pufferdesk' ),
			),
			'sidebar'      => array(
				'searchPlaceholder'            => __( 'Search', 'pufferdesk' ),
				'searchLabel'                  => __( 'Search settings', 'pufferdesk' ),
				'searchResultsTitle'           => __( 'Search results', 'pufferdesk' ),
				/* translators: %s: Settings search query. */
				'searchResultsSummary'         => __( 'Results for "%s"', 'pufferdesk' ),
				'searchNoResultsTitle'         => __( 'No settings found', 'pufferdesk' ),
				'searchNoResultsDescription'   => __( 'Try a different setting, label, or description.', 'pufferdesk' ),
				'searchOpenLabel'              => __( 'Open setting', 'pufferdesk' ),
				'navLabel'                     => __( 'Settings sections', 'pufferdesk' ),
				'items'                        => array(
					array(
						'id'    => 'general',
						'label' => __( 'General', 'pufferdesk' ),
						'icon'  => 'dashicons-admin-generic',
						'tone'  => 'gray',
					),
					array(
						'id'    => 'appearance',
						'label' => __( 'Appearance', 'pufferdesk' ),
						'icon'  => 'dashicons-admin-appearance',
						'tone'  => 'blue',
					),
					array(
						'id'    => 'desktop-dock',
						'label' => $desktop_launcher_label,
						'icon'  => 'dashicons-desktop',
						'tone'  => 'indigo',
					),
					array(
						'id'    => 'apps',
						'label' => __( 'Apps', 'pufferdesk' ),
						'icon'  => 'dashicons-screenoptions',
						'tone'  => 'purple',
					),
					array(
						'id'    => 'menu-bar',
						'label' => $menu_bar_label,
						'icon'  => 'dashicons-menu-alt3',
						'tone'  => 'gray',
						'visible' => ! empty( $capabilities['menuBar']['enabled'] ),
					),
					array(
						'id'    => 'native-admin',
						'label' => __( 'Admin Experiences', 'pufferdesk' ),
						'icon'  => 'dashicons-admin-site-alt3',
						'tone'  => 'indigo',
						'visible' => current_user_can( PufferDesk_Users_Controller::CAPABILITY ),
					),
					array(
						'id'    => 'notifications',
						'label' => __( 'Notifications', 'pufferdesk' ),
						'icon'  => 'dashicons-bell',
						'tone'  => 'blue',
					),
					array(
						'id'    => 'wallpaper',
						'label' => __( 'Wallpaper', 'pufferdesk' ),
						'icon'  => 'dashicons-format-image',
						'tone'  => 'cyan',
					),
					array(
						'id'    => 'widgets',
						'label' => __( 'Widgets', 'pufferdesk' ),
						'icon'  => 'dashicons-screenoptions',
						'tone'  => 'green',
					),
				),
			),
			'profile'      => array(
				'sectionLabel'             => __( 'WordPress Account', 'pufferdesk' ),
				'defaultName'              => __( 'Admin', 'pufferdesk' ),
				'defaultRole'              => __( 'WordPress User', 'pufferdesk' ),
				'editProfileLabel'         => __( 'Edit profile', 'pufferdesk' ),
				'editLabel'                => __( 'Edit', 'pufferdesk' ),
				'profileTitle'             => __( 'WordPress Profile', 'pufferdesk' ),
				'personalInfoLabel'        => __( 'Personal Information', 'pufferdesk' ),
				'personalInfoDescription'  => __( 'Name, contact, website, and bio', 'pufferdesk' ),
				'rolePermissionsLabel'     => __( 'Role & Permissions', 'pufferdesk' ),
				'rolePermissionsDescription' => __( 'Current access level', 'pufferdesk' ),
				'signOutLabel'             => __( 'Sign Out...', 'pufferdesk' ),
			),
			'generalPanel' => array(
				'title'                     => __( 'General', 'pufferdesk' ),
				'description'               => __( 'Manage site information, updates, language, privacy, and WordPress tools.', 'pufferdesk' ),
				'fallbackWindowTitle'       => __( 'WordPress', 'pufferdesk' ),
				'aboutTitle'                => __( 'About', 'pufferdesk' ),
				'siteFallbackTitle'         => __( 'WordPress Site', 'pufferdesk' ),
				'nameLabel'                 => __( 'Name', 'pufferdesk' ),
				'addressLabel'              => __( 'Address', 'pufferdesk' ),
				'wordpressHeading'          => __( 'WordPress', 'pufferdesk' ),
				'displaysHeading'           => __( 'Displays', 'pufferdesk' ),
				'diagnosticsHeading'        => __( 'Diagnostics', 'pufferdesk' ),
				'diagnosticsTitle'          => __( 'Site Health', 'pufferdesk' ),
				'diagnosticsDescription'    => __( 'WordPress diagnostics and environment report', 'pufferdesk' ),
				'moreInfoLabel'             => __( 'More Info...', 'pufferdesk' ),
				'moreInfoTitle'             => __( 'Site Health Info', 'pufferdesk' ),
				'home'                      => array(
					'siteSubtitleFallback'      => __( 'WordPress site', 'pufferdesk' ),
					'siteSettingsTitle'         => __( 'General Settings', 'pufferdesk' ),
					'renameLabel'               => __( 'Rename', 'pufferdesk' ),
					'updatesTitle'              => __( 'WordPress Update', 'pufferdesk' ),
					'updatesCurrent'            => __( 'Up to date', 'pufferdesk' ),
					'updatesAttention'          => __( 'Attention needed', 'pufferdesk' ),
					'updatesAttentionDescription' => __( 'WordPress updates are ready to review.', 'pufferdesk' ),
					'updatesActionLabel'        => __( 'Review now', 'pufferdesk' ),
					'recommendedTitle'          => __( 'Recommended settings', 'pufferdesk' ),
					'recommendedDescription'    => __( 'Recent and commonly used settings', 'pufferdesk' ),
					'personalizeTitle'          => __( 'Personalize your desktop', 'pufferdesk' ),
					'colorModeLabel'            => __( 'Color mode', 'pufferdesk' ),
					'browsePersonalizeLabel'    => __( 'Browse more backgrounds and colors', 'pufferdesk' ),
					'systemDescription'         => __( 'Launcher, desktop, apps, and widgets', 'pufferdesk' ),
					'notificationsDescription'  => __( 'Notification Center and alerts', 'pufferdesk' ),
					'appearanceDescription'     => __( 'Colors and theme', 'pufferdesk' ),
				),
			),
			'appearance'   => array(
				'title'                 => __( 'Appearance', 'pufferdesk' ),
				'appearanceLabel'       => __( 'Appearance', 'pufferdesk' ),
				'themeHeading'          => __( 'Style', 'pufferdesk' ),
				'colorLabel'            => __( 'Color', 'pufferdesk' ),
				'themeLabel'            => __( 'Theme', 'pufferdesk' ),
				'themeFallbackLabel'    => __( 'Theme', 'pufferdesk' ),
				/* translators: 1: theme family label, 2: theme version label. */
				'themeVersionFormat'    => __( '%1$s · %2$s', 'pufferdesk' ),
				'themeModeOptions'      => $this->get_theme_mode_options_config(),
				'modeOptions'           => array(
					array( 'value' => 'auto', 'label' => __( 'System', 'pufferdesk' ) ),
					array( 'value' => 'light', 'label' => __( 'Light', 'pufferdesk' ) ),
					array( 'value' => 'dark', 'label' => __( 'Dark', 'pufferdesk' ) ),
				),
				'accentOptions'         => array(
					array( 'value' => 'blue', 'label' => __( 'Blue', 'pufferdesk' ) ),
					array( 'value' => 'default', 'label' => __( 'Default', 'pufferdesk' ) ),
					array( 'value' => 'purple', 'label' => __( 'Purple', 'pufferdesk' ) ),
					array( 'value' => 'pink', 'label' => __( 'Pink', 'pufferdesk' ) ),
					array( 'value' => 'red', 'label' => __( 'Red', 'pufferdesk' ) ),
					array( 'value' => 'orange', 'label' => __( 'Orange', 'pufferdesk' ) ),
					array( 'value' => 'yellow', 'label' => __( 'Yellow', 'pufferdesk' ) ),
					array( 'value' => 'green', 'label' => __( 'Green', 'pufferdesk' ) ),
					array( 'value' => 'graphite', 'label' => __( 'Graphite', 'pufferdesk' ) ),
				),
			),
			'personalization' => array(
				'backgroundTitle'           => __( 'Background', 'pufferdesk' ),
				'backgroundDescription'     => __( 'Background image, color, slideshow', 'pufferdesk' ),
				'colorsTitle'               => __( 'Colors', 'pufferdesk' ),
				'colorsDescription'         => __( 'Accent color, transparency effects, color theme', 'pufferdesk' ),
				'themesTitle'               => __( 'Themes', 'pufferdesk' ),
				'themesDescription'         => __( 'Install, create, manage', 'pufferdesk' ),
				'taskbarTitle'              => $launcher_label,
				'taskbarDescription'        => sprintf(
					/* translators: %s: theme-specific launcher label. */
					__( '%s behaviors and system pins', 'pufferdesk' ),
					$launcher_label
				),
				'chooseModeLabel'           => __( 'Choose your mode', 'pufferdesk' ),
				'chooseModeDescription'     => __( 'Change the colors that appear in PufferDesk and your apps', 'pufferdesk' ),
				'accentColorLabel'          => __( 'Accent color', 'pufferdesk' ),
				'currentThemeLabel'         => __( 'Current theme', 'pufferdesk' ),
				'currentThemeDescription'   => __( 'Choose the theme used by this desktop.', 'pufferdesk' ),
				'taskbarItemsTitle'         => sprintf(
					/* translators: %s: theme-specific launcher label. */
					__( '%s items', 'pufferdesk' ),
					$launcher_label
				),
				'taskbarItemsDescription'   => sprintf(
					/* translators: %s: theme-specific launcher label. */
					__( 'Show or hide buttons that appear in the %s', 'pufferdesk' ),
					$launcher_label
				),
				'taskbarBehaviorsTitle'     => sprintf(
					/* translators: %s: theme-specific launcher label. */
					__( '%s behaviors', 'pufferdesk' ),
					$launcher_label
				),
				'taskbarBehaviorsDescription' => __( 'Alignment, hiding, and app indicators', 'pufferdesk' ),
			),
			'desktopDock'  => array(
				'headings' => array(
					'dock'    => $launcher_label,
					'apps'    => __( 'Apps', 'pufferdesk' ),
					'desktop' => __( 'Desktop', 'pufferdesk' ),
					'widgets' => __( 'Widgets', 'pufferdesk' ),
				),
				'rows'     => array(
					'dockSize'                 => __( 'Size', 'pufferdesk' ),
					'dockMagnification'        => __( 'Magnification', 'pufferdesk' ),
					'dockPosition'             => $shell_labels['launcher_position'],
					'minimizeAnimation'         => __( 'Minimized window animation', 'pufferdesk' ),
					'minimizeIntoAppIcon'       => __( 'Minimize windows into application icon', 'pufferdesk' ),
					'autoHideDock'              => $shell_labels['auto_hide_launcher'],
					'animateOpeningApps'        => __( 'Animate opening applications', 'pufferdesk' ),
					'showOpenIndicators'        => __( 'Show indicators for open applications', 'pufferdesk' ),
					'wallpaperClick'            => __( 'Click wallpaper to show desktop', 'pufferdesk' ),
					'wallpaperClickDescription' => __( 'Click wallpaper to move windows out of the way, revealing your desktop items and widgets.', 'pufferdesk' ),
					'showWidgetsDesktop'        => __( 'Show widgets on desktop', 'pufferdesk' ),
					'dimWidgets'                => __( 'Dim widgets on desktop', 'pufferdesk' ),
				),
				'ranges'   => array(
					'small' => __( 'Small', 'pufferdesk' ),
					'large' => __( 'Large', 'pufferdesk' ),
					'off'   => __( 'Off', 'pufferdesk' ),
				),
				'selectOptions' => array(
					'dock_position'      => array(
						array( 'value' => 'left', 'label' => __( 'Left', 'pufferdesk' ) ),
						array( 'value' => 'bottom', 'label' => __( 'Bottom', 'pufferdesk' ) ),
						array( 'value' => 'right', 'label' => __( 'Right', 'pufferdesk' ) ),
					),
					'minimize_animation' => array(
						array( 'value' => 'genie', 'label' => $shell_labels['minimize_animation_genie'] ),
						array( 'value' => 'scale', 'label' => $shell_labels['minimize_animation_scale'] ),
					),
					'wallpaper_click'    => array(
						array( 'value' => 'always', 'label' => __( 'Always', 'pufferdesk' ) ),
						array( 'value' => 'never', 'label' => __( 'Never', 'pufferdesk' ) ),
					),
					'dim_widgets'        => array(
						array( 'value' => 'automatic', 'label' => __( 'Automatically', 'pufferdesk' ) ),
						array( 'value' => 'always', 'label' => __( 'Always', 'pufferdesk' ) ),
						array( 'value' => 'never', 'label' => __( 'Never', 'pufferdesk' ) ),
					),
				),
				'appLocationOptions' => $app_location_options,
			),
			'menuBar'      => array(
				'rows'          => array(
					'showBackground' => $shell_labels['menu_bar_background'],
					'recentCount'    => __( 'Recent documents, applications, and servers', 'pufferdesk' ),
				),
				'selectOptions' => array(
					'recent_count' => array(
						array( 'value' => '0', 'label' => __( 'None', 'pufferdesk' ) ),
						array( 'value' => '5', 'label' => '5' ),
						array( 'value' => '10', 'label' => '10' ),
						array( 'value' => '15', 'label' => '15' ),
						array( 'value' => '20', 'label' => '20' ),
						array( 'value' => '30', 'label' => '30' ),
						array( 'value' => '50', 'label' => '50' ),
					),
				),
			),
			'notifications' => array(
				'headings'    => array(
					'behavior' => __( 'Behavior', 'pufferdesk' ),
					'sources'  => __( 'Sources', 'pufferdesk' ),
				),
				'rows'        => array(
					'enabled'      => __( 'Enable notifications', 'pufferdesk' ),
					'showBadges'   => __( 'Show notification badges', 'pufferdesk' ),
					'showToasts'   => __( 'Show notification banners', 'pufferdesk' ),
					'quietMode'    => __( 'Quiet mode', 'pufferdesk' ),
					'quietModeDescription' => __( 'Keep notifications in Notification Center without showing banners.', 'pufferdesk' ),
					'historyDays'  => __( 'Keep history', 'pufferdesk' ),
					'severity'     => __( 'Show', 'pufferdesk' ),
				),
				'sourceLabels' => array(
					PufferDesk_User_Preferences::NOTIFICATION_SOURCE_WORDPRESS_UPDATES => __( 'WordPress updates', 'pufferdesk' ),
					PufferDesk_User_Preferences::NOTIFICATION_SOURCE_COMMENTS          => __( 'Comments', 'pufferdesk' ),
					PufferDesk_User_Preferences::NOTIFICATION_SOURCE_SITE_HEALTH       => __( 'Site Health', 'pufferdesk' ),
					PufferDesk_User_Preferences::NOTIFICATION_SOURCE_PUFFERDESK        => __( 'PufferDesk system', 'pufferdesk' ),
					PufferDesk_User_Preferences::NOTIFICATION_SOURCE_APPS              => __( 'Apps and plugins', 'pufferdesk' ),
				),
				'severityOptions' => array(
					array( 'value' => 'all', 'label' => __( 'All notifications', 'pufferdesk' ) ),
					array( 'value' => 'warnings', 'label' => __( 'Warnings and critical alerts', 'pufferdesk' ) ),
					array( 'value' => 'critical', 'label' => __( 'Critical alerts only', 'pufferdesk' ) ),
				),
				'historyOptions' => array(
					array( 'value' => '7', 'label' => __( '7 days', 'pufferdesk' ) ),
					array( 'value' => '30', 'label' => __( '30 days', 'pufferdesk' ) ),
					array( 'value' => '90', 'label' => __( '90 days', 'pufferdesk' ) ),
				),
			),
			'wallpaper'    => array(
				'wallpapersHeading'       => __( 'Wallpapers', 'pufferdesk' ),
				'colorsHeading'           => __( 'Colors', 'pufferdesk' ),
				'yourPhotosHeading'       => __( 'Your Photos', 'pufferdesk' ),
				'addPhotoLabel'           => __( 'Add Photo...', 'pufferdesk' ),
				'selectedPhotoLabel'      => __( 'Selected Photo', 'pufferdesk' ),
				'removePhotoLabel'        => __( 'Remove photo', 'pufferdesk' ),
				'showLessLabel'           => __( 'Show Less', 'pufferdesk' ),
				/* translators: %d: number of wallpaper items. */
				'showAllLabel'            => __( 'Show All (%d)', 'pufferdesk' ),
				'chooseWallpaperTitle'    => __( 'Choose Wallpaper', 'pufferdesk' ),
				'useAsWallpaperLabel'     => __( 'Use as Wallpaper', 'pufferdesk' ),
				'customWallpaperLabel'    => __( 'Custom Wallpaper', 'pufferdesk' ),
			),
			'widgets'      => array(
				'title'             => __( 'Widgets', 'pufferdesk' ),
				'description'       => __( 'Choose which desktop widgets are visible.', 'pufferdesk' ),
				'desktopHeading'    => __( 'Display', 'pufferdesk' ),
				'emptyLabel'        => __( 'No widgets are registered for this account.', 'pufferdesk' ),
				'registeredHeading' => __( 'Widgets', 'pufferdesk' ),
				'showOnDesktopLabel' => __( 'Show on desktop', 'pufferdesk' ),
			),
			'apps'         => array(
				'headings'         => array(
					'locations' => __( 'Apps', 'pufferdesk' ),
				),
				'openAtLoginLabel' => __( 'Open at login', 'pufferdesk' ),
			),
			'nativeAdmin'  => array(
				'heading'                 => __( 'Native WordPress screens', 'pufferdesk' ),
				'usersDescription'        => __( 'Open Users, Add User, and Profile in native PufferDesk windows when available.', 'pufferdesk' ),
				'usersLabel'              => __( 'Use native Users experience', 'pufferdesk' ),
			),
		);

		$theme_settings = isset( $theme['settings'] ) && is_array( $theme['settings'] ) ? $theme['settings'] : array();
		$theme_labels   = isset( $theme_settings['labels'] ) && is_array( $theme_settings['labels'] ) ? $theme_settings['labels'] : array();
		$labels         = $this->merge_settings_labels( $labels, $theme_labels );
		$labels         = $this->remove_settings_sidebar_items( $labels, array( 'workspace', 'system' ) );

		return $labels;
	}

	/**
	 * Remove Settings sidebar entries by ID.
	 *
	 * @param array<string,mixed> $labels Labels config.
	 * @param array<int,string>   $item_ids Sidebar item IDs to remove.
	 * @return array<string,mixed>
	 */
	private function remove_settings_sidebar_items( $labels, $item_ids ) {
		if ( ! isset( $labels['sidebar']['items'] ) || ! is_array( $labels['sidebar']['items'] ) ) {
			return $labels;
		}

		$item_ids                    = array_fill_keys( array_map( 'sanitize_key', $item_ids ), true );
		$labels['sidebar']['items'] = array_values(
			array_filter(
				$labels['sidebar']['items'],
				static function ( $item ) use ( $item_ids ) {
					$id = isset( $item['id'] ) && is_scalar( $item['id'] ) ? sanitize_key( (string) $item['id'] ) : '';

					return '' === $id || ! isset( $item_ids[ $id ] );
				}
			)
		);

		return $labels;
	}

	/**
	 * Merge theme-provided Settings labels into localized defaults.
	 *
	 * Numeric arrays are replaced so ordered option and sidebar item lists remain intentional.
	 *
	 * @param array<string,mixed> $defaults Default labels.
	 * @param array<string,mixed> $overrides Theme label overrides.
	 * @return array<string,mixed>
	 */
	private function merge_settings_labels( $defaults, $overrides ) {
		if ( empty( $overrides ) || ! is_array( $overrides ) ) {
			return $defaults;
		}

		foreach ( $overrides as $key => $value ) {
			if ( is_array( $value ) && isset( $defaults[ $key ] ) && is_array( $defaults[ $key ] ) && ! $this->is_list_array( $value ) && ! $this->is_list_array( $defaults[ $key ] ) ) {
				$defaults[ $key ] = $this->merge_settings_labels( $defaults[ $key ], $value );
				continue;
			}

			$defaults[ $key ] = $value;
		}

		return $defaults;
	}

	/**
	 * Determine whether an array uses sequential numeric keys.
	 *
	 * @param array<mixed> $value Array to inspect.
	 * @return bool
	 */
	private function is_list_array( $value ) {
		if ( array() === $value ) {
			return true;
		}

		return array_keys( $value ) === range( 0, count( $value ) - 1 );
	}

	/**
	 * Home metadata for alternate Settings surfaces.
	 *
	 * @return array<string,mixed>
	 */
	private function get_general_settings_home_config() {
		$updates_badge = $this->get_wordpress_updates_menu_badge();
		$updates_count = isset( $updates_badge['count'] ) ? absint( $updates_badge['count'] ) : 0;
		$can_update    = current_user_can( 'update_core' ) || current_user_can( 'update_plugins' ) || current_user_can( 'update_themes' );

		return array(
			'siteSettingsUrl'  => current_user_can( 'manage_options' ) ? admin_url( 'options-general.php' ) : '',
			'wordpressUpdates' => array(
				'label'       => __( 'WordPress Update', 'pufferdesk' ),
				'title'       => __( 'WordPress Updates', 'pufferdesk' ),
				'url'         => $can_update ? admin_url( 'update-core.php' ) : '',
				'count'       => $updates_count,
				'badge'       => $updates_badge,
				'status'      => $updates_count > 0
					? __( 'Attention needed', 'pufferdesk' )
					: __( 'Up to date', 'pufferdesk' ),
				'description' => $updates_count > 0 && ! empty( $updates_badge['text'] )
					? sprintf(
						/* translators: %s: WordPress update count label. */
						__( '%s ready to review.', 'pufferdesk' ),
						$updates_badge['text']
					)
					: __( 'WordPress is up to date.', 'pufferdesk' ),
			),
			'helpLinks'        => array(
				array(
					'id'    => 'help',
					'label' => __( 'Get help', 'pufferdesk' ),
					'title' => __( 'PufferDesk Help', 'pufferdesk' ),
					'url'   => 'https://pufferdesk.com',
					'icon'  => 'dashicons-editor-help',
				),
				array(
					'id'    => 'feedback',
					'label' => __( 'Give feedback', 'pufferdesk' ),
					'title' => __( 'PufferDesk Feedback', 'pufferdesk' ),
					'url'   => 'https://pufferdesk.com',
					'icon'  => 'dashicons-format-chat',
				),
			),
		);
	}

	/**
	 * General settings groups for WordPress-backed destinations.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	private function get_general_settings_groups() {
		$system_rows = array(
			array(
				'id'          => 'about',
				'label'       => __( 'About', 'pufferdesk' ),
				'description' => __( 'Site and WordPress environment details', 'pufferdesk' ),
				'icon'        => 'dashicons-info-outline',
				'tone'        => 'gray',
				'panel'       => 'general-about',
			),
			array(
				'id'     => 'software-update',
				'label'  => __( 'Software Update', 'pufferdesk' ),
				'icon'   => 'dashicons-update',
				'tone'   => 'gray',
				'url'    => admin_url( 'update-core.php' ),
				'title'  => __( 'WordPress Updates', 'pufferdesk' ),
				'capany' => array( 'update_core', 'update_plugins', 'update_themes' ),
			),
		);

		if ( PufferDesk_Admin_Screen_Availability::is_site_health_available() ) {
			$system_rows[] = array(
				'id'    => 'site-health',
				'label' => __( 'Site Health', 'pufferdesk' ),
				'icon'  => 'dashicons-heart',
				'tone'  => 'gray',
				'url'   => admin_url( 'site-health.php' ),
				'title' => __( 'Site Health', 'pufferdesk' ),
				'cap'   => PufferDesk_Admin_Screen_Availability::site_health_capability(),
			);
		}

		return array_values(
			array_filter(
				array(
					array(
						'id'    => 'system',
						'items' => $this->filter_settings_rows( $system_rows ),
					),
					array(
						'id'    => 'site',
						'items' => $this->filter_settings_rows(
							array(
								array(
									'id'    => 'date-time',
									'label' => __( 'Date & Time', 'pufferdesk' ),
									'icon'  => 'dashicons-calendar-alt',
									'tone'  => 'blue',
									'url'   => admin_url( 'options-general.php#timezone_string' ),
									'title' => __( 'Date & Time', 'pufferdesk' ),
									'cap'   => 'manage_options',
								),
								array(
									'id'    => 'language-region',
									'label' => __( 'Language & Region', 'pufferdesk' ),
									'icon'  => 'dashicons-translation',
									'tone'  => 'blue',
									'url'   => admin_url( 'options-general.php#WPLANG' ),
									'title' => __( 'Language & Region', 'pufferdesk' ),
									'cap'   => 'manage_options',
								),
								array(
									'id'    => 'permalinks',
									'label' => __( 'Permalinks', 'pufferdesk' ),
									'icon'  => 'dashicons-admin-links',
									'tone'  => 'gray',
									'url'   => admin_url( 'options-permalink.php' ),
									'title' => __( 'Permalinks', 'pufferdesk' ),
									'cap'   => 'manage_options',
								),
								array(
									'id'    => 'privacy',
									'label' => __( 'Privacy', 'pufferdesk' ),
									'icon'  => 'dashicons-privacy',
									'tone'  => 'gray',
									'url'   => admin_url( 'options-privacy.php' ),
									'title' => __( 'Privacy', 'pufferdesk' ),
									'cap'   => 'manage_privacy_options',
								),
								array(
									'id'    => 'import-export',
									'label' => __( 'Import & Export', 'pufferdesk' ),
									'icon'  => 'dashicons-migrate',
									'tone'  => 'gray',
									'url'   => admin_url( 'import.php' ),
									'title' => __( 'Import & Export', 'pufferdesk' ),
									'cap'   => 'import',
								),
							)
						),
					),
					array(
						'id'    => 'reset',
						'items' => $this->filter_settings_rows(
							array(
								array(
									'id'          => 'erase-content-settings',
									'label'       => __( 'Reset PufferDesk Settings...', 'pufferdesk' ),
									'description' => __( 'Reset PufferDesk preferences, desktop folders, and layouts for this account. WordPress content is not deleted.', 'pufferdesk' ),
									'icon'        => 'dashicons-trash',
									'tone'        => 'red',
									'command'     => PufferDesk_Command_Ids::SYSTEM_ERASE_CONTENT_SETTINGS,
								),
							)
						),
					),
				),
				static function ( $group ) {
					return ! empty( $group['items'] );
				}
			)
		);
	}

	/**
	 * Badge descriptor for the WordPress Updates system menu item.
	 *
	 * @return array<string,mixed>
	 */
	private function get_wordpress_updates_menu_badge() {
		if ( ! current_user_can( 'update_core' ) && ! current_user_can( 'update_plugins' ) && ! current_user_can( 'update_themes' ) ) {
			return array();
		}

		require_once ABSPATH . 'wp-admin/includes/update.php';

		if ( ! function_exists( 'wp_get_update_data' ) ) {
			return array();
		}

		$update_data = wp_get_update_data();
		$counts      = isset( $update_data['counts'] ) && is_array( $update_data['counts'] ) ? $update_data['counts'] : array();
		$total       = isset( $counts['total'] ) ? absint( $counts['total'] ) : 0;
		if ( $total <= 0 ) {
			return array();
		}

		return array(
			'text'       => sprintf(
				/* translators: %d: total WordPress update count. */
				_n( '%d update', '%d updates', $total, 'pufferdesk' ),
				$total
			),
			'count'      => $total,
			'tone'       => PufferDesk_App_Badge_Normalizer::TONE_UPDATE,
			'aria_label' => sprintf(
				/* translators: %d: total WordPress update count. */
				_n( '%d WordPress update available', '%d WordPress updates available', $total, 'pufferdesk' ),
				$total
			),
			'source'     => 'wordpress-updates',
		);
	}

	/**
	 * Remove rows the current user cannot use.
	 *
	 * @param array<int,array<string,mixed>> $rows Rows.
	 * @return array<int,array<string,mixed>>
	 */
	private function filter_settings_rows( $rows ) {
		return array_values(
			array_filter(
				$rows,
				static function ( $row ) {
					if ( isset( $row['capany'] ) && is_array( $row['capany'] ) ) {
						foreach ( $row['capany'] as $capability ) {
							if ( current_user_can( $capability ) ) {
								return true;
							}
						}

						return false;
					}

					if ( isset( $row['cap'] ) && is_string( $row['cap'] ) ) {
						return current_user_can( $row['cap'] );
					}

					return true;
				}
			)
		);
	}

	/**
	 * Runtime data for PufferDesk shell actions.
	 *
	 * @param array<string,mixed> $theme Active theme configuration.
	 * @return array<string,mixed>
	 */
	private function get_system_config( $theme = array() ) {
		$current_user = wp_get_current_user();
		$user_label   = $current_user->display_name ? $current_user->display_name : $current_user->user_login;

		return array(
			'actions' => array(
				'restart'       => array(
					'title'                => __( 'Restart PufferDesk?', 'pufferdesk' ),
					/* translators: {seconds}: seconds remaining before PufferDesk restarts automatically. */
					'message'              => __( 'Reloads PufferDesk only. Your site content is unchanged. Auto-restarts in {seconds}s.', 'pufferdesk' ),
					'confirmLabel'         => __( 'Restart', 'pufferdesk' ),
					'cancelLabel'          => __( 'Cancel', 'pufferdesk' ),
					'reopenWindowsLabel'   => __( 'Reopen windows after restarting', 'pufferdesk' ),
					'reopenWindowsDefault' => false,
					'countdownSeconds'     => 60,
					'icon'                 => 'power',
					'overlayMessage'       => __( 'Restarting PufferDesk...', 'pufferdesk' ),
				),
				'switchClassic' => array(
					'title'                => __( 'Switch to Classic Admin?', 'pufferdesk' ),
					/* translators: {seconds}: seconds remaining before Classic Admin opens automatically. */
					'message'              => __( 'Leaves PufferDesk and opens the normal WordPress admin in {seconds}s.', 'pufferdesk' ),
					'confirmLabel'         => __( 'Switch', 'pufferdesk' ),
					'cancelLabel'          => __( 'Cancel', 'pufferdesk' ),
					'reopenWindowsLabel'   => __( 'Reopen windows when returning to PufferDesk', 'pufferdesk' ),
					'reopenWindowsDefault' => false,
					'countdownSeconds'     => 60,
					'icon'                 => 'dashicons-admin-site-alt3',
					'overlayMessage'       => __( 'Switching to Classic Admin...', 'pufferdesk' ),
				),
				'logout'        => array(
					'title'                => sprintf(
						/* translators: %s: current user display name. */
						__( 'Log out %s?', 'pufferdesk' ),
						$user_label
					),
					/* translators: {seconds}: seconds remaining before the user is logged out automatically. */
					'message'              => __( 'Ends your WordPress session and opens the login screen in {seconds}s.', 'pufferdesk' ),
					'confirmLabel'         => __( 'Log Out', 'pufferdesk' ),
					'cancelLabel'          => __( 'Cancel', 'pufferdesk' ),
					'reopenWindowsLabel'   => __( 'Reopen windows when logging back in', 'pufferdesk' ),
					'reopenWindowsDefault' => false,
					'countdownSeconds'     => 60,
					'icon'                 => 'power',
					'overlayMessage'       => __( 'Logging out...', 'pufferdesk' ),
				),
				'lock'          => array(
					'title'                => __( 'Lock PufferDesk?', 'pufferdesk' ),
					'message'              => __( 'You will be signed out and returned to the WordPress login screen.', 'pufferdesk' ),
					'confirmLabel'         => __( 'Lock', 'pufferdesk' ),
					'cancelLabel'          => __( 'Cancel', 'pufferdesk' ),
					'reopenWindowsLabel'   => __( 'Reopen windows when signing back in', 'pufferdesk' ),
					'reopenWindowsDefault' => false,
					'countdownSeconds'     => 60,
					'icon'                 => 'power',
					'overlayMessage'       => __( 'Locking PufferDesk...', 'pufferdesk' ),
				),
				'sleep'         => array(
					'title'                => __( 'Sleep PufferDesk?', 'pufferdesk' ),
					'message'              => __( 'PufferDesk will close and Classic Admin will open.', 'pufferdesk' ),
					'confirmLabel'         => __( 'Sleep', 'pufferdesk' ),
					'cancelLabel'          => __( 'Cancel', 'pufferdesk' ),
					'reopenWindowsLabel'   => __( 'Reopen windows when returning to PufferDesk', 'pufferdesk' ),
					'reopenWindowsDefault' => false,
					'countdownSeconds'     => 60,
					'icon'                 => 'power',
					'overlayMessage'       => __( 'Putting PufferDesk to sleep...', 'pufferdesk' ),
				),
				'shutdown'      => array(
					'title'                => __( 'Shut down PufferDesk?', 'pufferdesk' ),
					'message'              => __( 'PufferDesk will close and Classic Admin will open.', 'pufferdesk' ),
					'confirmLabel'         => __( 'Shut down', 'pufferdesk' ),
					'cancelLabel'          => __( 'Cancel', 'pufferdesk' ),
					'reopenWindowsLabel'   => __( 'Reopen windows when returning to PufferDesk', 'pufferdesk' ),
					'reopenWindowsDefault' => false,
					'countdownSeconds'     => 60,
					'icon'                 => 'power',
					'overlayMessage'       => __( 'Shutting down PufferDesk...', 'pufferdesk' ),
				),
				'eraseContentSettings' => array(
					'title'          => __( 'Reset PufferDesk Settings?', 'pufferdesk' ),
					'message'        => __( 'This will reset PufferDesk settings and layout. Your content will not be deleted.', 'pufferdesk' ),
					'confirmLabel'   => __( 'Reset', 'pufferdesk' ),
					'cancelLabel'    => __( 'Cancel', 'pufferdesk' ),
					'overlayMessage' => __( 'Resetting PufferDesk settings...', 'pufferdesk' ),
				),
				'emptyTrash' => array(
					'title'        => $this->get_theme_menu_label( $theme, 'empty_trash_title', __( 'Empty Trash?', 'pufferdesk' ) ),
					'message'      => __( 'This permanently deletes all trashed PufferDesk folder records, including folder contents. Apps and plugins are not deleted.', 'pufferdesk' ),
					'confirmLabel' => $this->get_theme_menu_label( $theme, 'empty_trash', __( 'Empty Trash', 'pufferdesk' ) ),
					'cancelLabel'  => __( 'Cancel', 'pufferdesk' ),
					'icon'         => 'dashicons-trash',
				),
			),
		);
	}

	/**
	 * Localized menu defaults for the active-app menu bar.
	 *
	 * @param array<string,mixed> $theme Current theme.
	 * @return array<string,mixed>
	 */
	private function get_menu_config( $theme = array() ) {
		$current_user          = wp_get_current_user();
		$user_label            = $current_user->display_name ? $current_user->display_name : $current_user->user_login;
		$shell_labels          = $this->get_theme_shell_labels( $theme );
		$window_control_labels = $this->get_theme_window_control_labels( $theme );
		$group_labels          = PufferDesk_App_Menu_Normalizer::get_default_group_labels();
		$template_labels       = self::get_shell_template_labels( $theme );
		$updates_badge         = $this->get_wordpress_updates_menu_badge();
		$updates_item          = array(
			'label'   => __( 'WordPress Updates...', 'pufferdesk' ),
			'command' => PufferDesk_Command_Ids::OPEN_URL,
			'url'     => admin_url( 'update-core.php' ),
			'title'   => __( 'WordPress Updates', 'pufferdesk' ),
			'icon'    => 'dashicons-update',
		);
		if ( ! empty( $updates_badge ) ) {
			$updates_item['badge'] = $updates_badge;
		}

		$config = array(
			'system'     => array(
				'groups' => array(
					array(
						'id'    => 'system',
						'label' => PufferDesk_Product_Labels::name(),
						'items' => array(
							array(
								'label'   => __( 'About PufferDesk', 'pufferdesk' ),
								'command' => PufferDesk_Command_Ids::OPEN_SYSTEM_ABOUT,
								'icon'    => 'dashicons-info-outline',
							),
							array(
								'label'   => __( 'System Settings...', 'pufferdesk' ),
								'command' => PufferDesk_Command_Ids::OPEN_APP,
								'target'  => PufferDesk_App_Ids::OS_SETTINGS,
								'icon'    => 'dashicons-admin-customizer',
							),
							$updates_item,
							array(
								'type' => 'separator',
							),
							array(
								'id'       => 'recent-items',
								'label'    => __( 'Recent Items', 'pufferdesk' ),
								'disabled' => true,
								'icon'     => 'dashicons-backup',
								'shortcut' => '>',
							),
							array(
								'type' => 'separator',
							),
							array(
								'id'       => 'close-active-window',
								'label'    => __( 'Close Active App', 'pufferdesk' ),
								'command'  => PufferDesk_Command_Ids::WINDOW_CLOSE,
								'icon'     => 'dashicons-dismiss',
								'shortcut' => array(
									'combo'    => 'primary+w',
									'contexts' => array( 'window' ),
								),
							),
							array(
								'type' => 'separator',
							),
							array(
								'label'   => __( 'Restart PufferDesk...', 'pufferdesk' ),
								'command' => PufferDesk_Command_Ids::SHELL_RESTART,
								'icon'    => 'dashicons-update',
							),
							array(
								'label'   => __( 'Switch to Classic Admin...', 'pufferdesk' ),
								'command' => PufferDesk_Command_Ids::SHELL_SWITCH_CLASSIC,
								'url'     => $this->router->get_toggle_url( false ),
								'icon'    => 'dashicons-admin-site-alt3',
							),
							array(
								'type' => 'separator',
							),
							array(
								'label'   => __( 'Manage Account...', 'pufferdesk' ),
								'command' => PufferDesk_Command_Ids::USER_OPEN_PROFILE,
								'target'  => (string) get_current_user_id(),
								'url'     => admin_url( 'profile.php' ),
								'icon'    => 'dashicons-admin-users',
							),
							array(
								'label'   => sprintf(
									/* translators: %s: current user display name. */
									__( 'Log Out %s...', 'pufferdesk' ),
									$user_label
								),
								'command' => PufferDesk_Command_Ids::USER_LOGOUT,
								'url'     => $this->get_logout_url(),
								'icon'    => 'dashicons-migrate',
							),
						),
					),
				),
			),
			'persistent' => array(
				'groups' => array(
					array(
						'id'    => PufferDesk_App_Menu_Normalizer::GROUP_SITE,
						'label' => get_bloginfo( 'name' ),
						'items' => array(
							array(
								'label'   => __( 'Dashboard', 'pufferdesk' ),
								'command' => PufferDesk_Command_Ids::OPEN_APP,
								'target'  => PufferDesk_App_Ids::DASHBOARD,
							),
							array(
								'label'   => __( 'Visit Site', 'pufferdesk' ),
								'command' => PufferDesk_Command_Ids::OPEN_EXTERNAL_URL,
								'url'     => home_url( '/' ),
							),
						),
					),
				),
			),
			'newContent' => $this->admin_bar_menu_provider->get_new_content_groups(),
			'desktop'    => array(
				'groups' => array(
					array(
						'id'    => PufferDesk_App_Menu_Normalizer::GROUP_FILE,
						'label' => $group_labels[ PufferDesk_App_Menu_Normalizer::GROUP_FILE ],
						'items' => array(),
					),
					array(
						'id'    => PufferDesk_App_Menu_Normalizer::GROUP_EDIT,
						'label' => $group_labels[ PufferDesk_App_Menu_Normalizer::GROUP_EDIT ],
						'items' => array(),
					),
					array(
						'id'    => PufferDesk_App_Menu_Normalizer::GROUP_VIEW,
						'label' => $group_labels[ PufferDesk_App_Menu_Normalizer::GROUP_VIEW ],
						'items' => array(),
					),
					array(
						'id'    => PufferDesk_App_Menu_Normalizer::GROUP_GO,
						'label' => $group_labels[ PufferDesk_App_Menu_Normalizer::GROUP_GO ],
						'items' => array(),
					),
					array(
						'id'    => PufferDesk_App_Menu_Normalizer::GROUP_WINDOW,
						'label' => $group_labels[ PufferDesk_App_Menu_Normalizer::GROUP_WINDOW ],
						'items' => array(),
					),
					array(
						'id'    => PufferDesk_App_Menu_Normalizer::GROUP_HELP,
						'label' => $group_labels[ PufferDesk_App_Menu_Normalizer::GROUP_HELP ],
						'items' => array(),
					),
				),
			),
			'labels'     => array(
				PufferDesk_App_Menu_Normalizer::GROUP_SITE => get_bloginfo( 'name' ),
				PufferDesk_App_Menu_Normalizer::GROUP_FILE => $group_labels[ PufferDesk_App_Menu_Normalizer::GROUP_FILE ],
				PufferDesk_App_Menu_Normalizer::GROUP_EDIT => $group_labels[ PufferDesk_App_Menu_Normalizer::GROUP_EDIT ],
				PufferDesk_App_Menu_Normalizer::GROUP_VIEW => $group_labels[ PufferDesk_App_Menu_Normalizer::GROUP_VIEW ],
				PufferDesk_App_Menu_Normalizer::GROUP_GO => $group_labels[ PufferDesk_App_Menu_Normalizer::GROUP_GO ],
				PufferDesk_App_Menu_Normalizer::GROUP_WINDOW => $group_labels[ PufferDesk_App_Menu_Normalizer::GROUP_WINDOW ],
				PufferDesk_App_Menu_Normalizer::GROUP_HELP => $group_labels[ PufferDesk_App_Menu_Normalizer::GROUP_HELP ],
				'system'                  => PufferDesk_Product_Labels::name(),
				'admin'                   => __( 'Admin', 'pufferdesk' ),
				'app'                     => __( 'App', 'pufferdesk' ),
				'apps'                    => __( 'Apps', 'pufferdesk' ),
				'desktop'                 => __( 'Desktop', 'pufferdesk' ),
				'desktop_folders'         => $template_labels['desktop_folders'],
				'folder'                  => __( 'Folder', 'pufferdesk' ),
				'folders'                 => __( 'Folders', 'pufferdesk' ),
				'folder_empty'            => __( 'This folder is empty.', 'pufferdesk' ),
				'folder_suffix'           => __( 'Folder', 'pufferdesk' ),
				'untitled_folder'         => PufferDesk_User_Preferences::get_default_folder_label(),
				'untitled_item'           => __( 'Untitled', 'pufferdesk' ),
				'new'                     => __( 'New', 'pufferdesk' ),
				'new_folder'              => __( 'New Folder', 'pufferdesk' ),
				'new_note'                => __( 'New Note', 'pufferdesk' ),
				'add_user'                => __( 'Add User', 'pufferdesk' ),
				'open_profile'            => __( 'Open Profile', 'pufferdesk' ),
				'group'                   => __( 'Group', 'pufferdesk' ),
				'more'                    => __( 'More', 'pufferdesk' ),
				'sort'                    => __( 'Sort', 'pufferdesk' ),
				'new_sticky_note'         => __( 'New Sticky Note', 'pufferdesk' ),
				'get_info'                => __( 'Details', 'pufferdesk' ),
				'cancel'                  => __( 'Cancel', 'pufferdesk' ),
				'open'                    => __( 'Open', 'pufferdesk' ),
				'open_with'               => __( 'Open With', 'pufferdesk' ),
				'show'                    => __( 'Show', 'pufferdesk' ),
				'quit'                    => __( 'Quit', 'pufferdesk' ),
				'about'                   => __( 'About', 'pufferdesk' ),
				'open_in_browser_tab'     => __( 'Open in Browser Tab', 'pufferdesk' ),
				'open_in_new_tab'         => __( 'Open in New Tab', 'pufferdesk' ),
				'open_in_new_window'      => __( 'Open in New Window', 'pufferdesk' ),
				'address'                 => __( 'Address', 'pufferdesk' ),
				'properties'              => __( 'Properties', 'pufferdesk' ),
				'enter_key'               => __( 'Enter', 'pufferdesk' ),
				'new_tab'                 => __( 'New Tab', 'pufferdesk' ),
				'close_tab'               => __( 'Close Tab', 'pufferdesk' ),
				'close_other_tabs'        => __( 'Close Other Tabs', 'pufferdesk' ),
				'move_tab_to_new_window'  => __( 'Move Tab to New Window', 'pufferdesk' ),
				'folder_tabs'             => __( 'Folder Tabs', 'pufferdesk' ),
				'add_to_folder'           => __( 'Add to Folder', 'pufferdesk' ),
				'move_to_folder'          => __( 'Move to Folder', 'pufferdesk' ),
				'remove_from_folder'      => __( 'Remove from Folder', 'pufferdesk' ),
				'toolbar'                 => __( 'Toolbar', 'pufferdesk' ),
				'icons_and_text'          => __( 'Icons and Text', 'pufferdesk' ),
				'icons_only'              => __( 'Icons Only', 'pufferdesk' ),
				'text_only'               => __( 'Text Only', 'pufferdesk' ),
				'show_toolbar'            => __( 'Show Toolbar', 'pufferdesk' ),
				'hide_toolbar'            => __( 'Hide Toolbar', 'pufferdesk' ),
				'folder_command_bar'      => __( 'Folder Command Bar', 'pufferdesk' ),
				'folder_toolbar'          => __( 'Folder Toolbar', 'pufferdesk' ),
				'back_forward'            => __( 'Back/Forward', 'pufferdesk' ),
				'close_window'            => __( 'Close Window', 'pufferdesk' ),
				'system_settings'         => __( 'System Settings...', 'pufferdesk' ),
				'start_search_label'      => __( 'Search apps, settings, and commands', 'pufferdesk' ),
				'start_search_placeholder' => __( 'Search', 'pufferdesk' ),
				'search_no_results'       => __( 'No results found', 'pufferdesk' ),
				'search_group_app'        => __( 'Apps', 'pufferdesk' ),
				'search_group_app_route'  => __( 'App Sections', 'pufferdesk' ),
				'search_group_folder'     => __( 'Folders', 'pufferdesk' ),
				'search_group_document'   => __( 'Documents', 'pufferdesk' ),
				'search_group_wp_post'    => __( 'Posts', 'pufferdesk' ),
				'search_group_wp_page'    => __( 'Pages', 'pufferdesk' ),
				'search_group_wp_attachment' => __( 'Media', 'pufferdesk' ),
				'search_group_setting'    => __( 'Settings', 'pufferdesk' ),
				'search_group_command'    => __( 'Commands', 'pufferdesk' ),
				'search_type_app'         => __( 'App', 'pufferdesk' ),
				'search_type_app_route'   => __( 'App Section', 'pufferdesk' ),
				'search_type_folder'      => __( 'Folder', 'pufferdesk' ),
				'search_type_document'    => __( 'Document', 'pufferdesk' ),
				'search_type_wp_post'     => __( 'Post', 'pufferdesk' ),
				'search_type_wp_page'     => __( 'Page', 'pufferdesk' ),
				'search_type_wp_attachment' => __( 'Media', 'pufferdesk' ),
				'search_type_setting'     => __( 'Setting', 'pufferdesk' ),
				'search_type_command'     => __( 'Command', 'pufferdesk' ),
				'start_pinned'            => __( 'Pinned', 'pufferdesk' ),
				'start_create'            => __( 'Create', 'pufferdesk' ),
				'start_create_more'       => __( 'More...', 'pufferdesk' ),
				'start_recommended'       => __( 'Recommended', 'pufferdesk' ),
				'start_no_recent_items'   => __( 'No recent items yet', 'pufferdesk' ),
				'start_power'             => __( 'Power and session', 'pufferdesk' ),
				'start_account'           => __( 'Account', 'pufferdesk' ),
				'start_manage_account'    => __( 'Manage account', 'pufferdesk' ),
				'start_sign_out'          => __( 'Sign out', 'pufferdesk' ),
				'start_power_menu'        => __( 'Power options', 'pufferdesk' ),
				'start_lock'              => __( 'Lock', 'pufferdesk' ),
				'start_sleep'             => __( 'Sleep', 'pufferdesk' ),
				'start_shutdown'          => __( 'Shut down', 'pufferdesk' ),
				'start_restart'           => __( 'Restart', 'pufferdesk' ),
				'undo'                    => __( 'Undo', 'pufferdesk' ),
				'redo'                    => __( 'Redo', 'pufferdesk' ),
				'cut'                     => __( 'Cut', 'pufferdesk' ),
				'copy'                    => __( 'Copy', 'pufferdesk' ),
				'copy_name_format'        => PufferDesk_Document_Service::get_default_label( 'copyNameFormat' ),
				'paste'                   => __( 'Paste', 'pufferdesk' ),
				'save'                    => __( 'Save', 'pufferdesk' ),
				'select_all'              => __( 'Select All', 'pufferdesk' ),
				'sort_by'                 => __( 'Sort By', 'pufferdesk' ),
				'sort_by_sentence'        => __( 'Sort by', 'pufferdesk' ),
				'sort_name'               => __( 'Name', 'pufferdesk' ),
				'sort_kind'               => __( 'Kind', 'pufferdesk' ),
				'sort_snap_to_grid'       => __( 'Snap to Grid', 'pufferdesk' ),
				'sort_last_modified_by'   => __( 'Last Modified By', 'pufferdesk' ),
				'sort_date_last_opened'   => __( 'Date Last Opened', 'pufferdesk' ),
				'sort_date_added'         => __( 'Date Added', 'pufferdesk' ),
				'sort_date_modified'      => __( 'Date Modified', 'pufferdesk' ),
				'sort_date_created'       => __( 'Date Created', 'pufferdesk' ),
				'sort_size'               => __( 'Size', 'pufferdesk' ),
					'sort_none'               => __( 'None', 'pufferdesk' ),
					'type'                    => __( 'Type', 'pufferdesk' ),
					'zero_bytes'              => __( 'Zero bytes', 'pufferdesk' ),
					'bytes_unit'              => __( 'bytes', 'pufferdesk' ),
					'kb_unit'                 => __( 'KB', 'pufferdesk' ),
					'mb_unit'                 => __( 'MB', 'pufferdesk' ),
					'gb_unit'                 => __( 'GB', 'pufferdesk' ),
					/* translators: %s: time. */
					'today_at_time'           => __( 'Today at %s', 'pufferdesk' ),
					/* translators: %s: time. */
					'yesterday_at_time'       => __( 'Yesterday at %s', 'pufferdesk' ),
					/* translators: 1: date, 2: time. */
					'date_at_time'            => __( '%1$s at %2$s', 'pufferdesk' ),
					'use_groups'              => __( 'Use Groups', 'pufferdesk' ),
					'group_today'             => __( 'Today', 'pufferdesk' ),
					'group_yesterday'         => __( 'Yesterday', 'pufferdesk' ),
					'group_previous_7_days'   => __( 'Previous 7 Days', 'pufferdesk' ),
					'group_previous_30_days'  => __( 'Previous 30 Days', 'pufferdesk' ),
					'group_older'             => __( 'Older', 'pufferdesk' ),
					'group_no_date'           => __( 'No Date', 'pufferdesk' ),
					'group_numbers'           => __( '0-9', 'pufferdesk' ),
					'group_other'             => __( 'Other', 'pufferdesk' ),
					'group_size_small'        => __( 'Small', 'pufferdesk' ),
					'group_size_medium'       => __( 'Medium', 'pufferdesk' ),
					'group_size_large'        => __( 'Large', 'pufferdesk' ),
					'group_size_huge'         => __( 'Huge', 'pufferdesk' ),
				'extra_large_icons'       => __( 'Extra large icons', 'pufferdesk' ),
				'large_icons'             => __( 'Large icons', 'pufferdesk' ),
				'medium_icons'            => __( 'Medium icons', 'pufferdesk' ),
				'small_icons'             => __( 'Small icons', 'pufferdesk' ),
				'list_view'               => __( 'List view', 'pufferdesk' ),
				'list_view_short'         => __( 'List', 'pufferdesk' ),
				'details_view'            => __( 'Details view', 'pufferdesk' ),
				'details_view_short'      => __( 'Details', 'pufferdesk' ),
				'tiles_view'              => __( 'Tiles', 'pufferdesk' ),
				'content_view'            => __( 'Content', 'pufferdesk' ),
				'as_icons'                => __( 'as Icons', 'pufferdesk' ),
				'as_list'                 => __( 'as List', 'pufferdesk' ),
					'auto_arrange_icons'      => __( 'Auto arrange icons', 'pufferdesk' ),
				'align_icons_to_grid'     => __( 'Align icons to grid', 'pufferdesk' ),
				'reset_layout'            => __( 'Reset Layout...', 'pufferdesk' ),
				'refresh'                 => __( 'Refresh', 'pufferdesk' ),
				'change_wallpaper'        => __( 'Change Wallpaper...', 'pufferdesk' ),
				'explore_background'      => __( 'Explore background', 'pufferdesk' ),
				'next_background'         => __( 'Next background', 'pufferdesk' ),
				'display_settings'        => __( 'Display settings', 'pufferdesk' ),
				'personalize'             => __( 'Personalize', 'pufferdesk' ),
				'back'                    => __( 'Back', 'pufferdesk' ),
				'forward'                 => __( 'Forward', 'pufferdesk' ),
				'up'                      => __( 'Up', 'pufferdesk' ),
				'recents'                 => __( 'Recents', 'pufferdesk' ),
				'favorites'               => __( 'Favorites', 'pufferdesk' ),
				'locations'               => __( 'Locations', 'pufferdesk' ),
				'navigation_pane'         => __( 'Navigation pane', 'pufferdesk' ),
				'remove_from_sidebar'     => __( 'Remove from Sidebar', 'pufferdesk' ),
				'home'                    => __( 'Home', 'pufferdesk' ),
				'gallery'                 => __( 'Gallery', 'pufferdesk' ),
				'this_pc'                 => __( 'This PC', 'pufferdesk' ),
				'network'                 => __( 'Network', 'pufferdesk' ),
				'recent_item'             => __( 'Recent Item', 'pufferdesk' ),
				'application'             => __( 'Application', 'pufferdesk' ),
				'document'                => __( 'Document', 'pufferdesk' ),
				'sticky_note'             => PufferDesk_Document_Service::get_default_label( 'stickyNote' ),
				'item_singular'           => __( 'item', 'pufferdesk' ),
				'item_plural'             => __( 'items', 'pufferdesk' ),
				'reload'                  => __( 'Reload', 'pufferdesk' ),
				'reload_page'             => __( 'Reload Page', 'pufferdesk' ),
				'zoom'                    => __( 'Zoom', 'pufferdesk' ),
				'view'                    => __( 'View', 'pufferdesk' ),
				'quick_actions'           => __( 'Quick Actions', 'pufferdesk' ),
				'extensions'              => __( 'Extensions', 'pufferdesk' ),
				'clear_menu'              => __( 'Clear Menu', 'pufferdesk' ),
				'recent_group_system'     => __( 'System', 'pufferdesk' ),
				'recent_group_wordpress'  => __( 'WordPress', 'pufferdesk' ),
				'recent_group_plugins'    => __( 'Plugins', 'pufferdesk' ),
				'recent_group_documents'  => __( 'Documents', 'pufferdesk' ),
				/* translators: %s: active window or app title. */
				'close_item_format'       => __( 'Close %s', 'pufferdesk' ),
				'app_badge_aria_label_format' => PufferDesk_App_Badge_Normalizer::get_aria_label_format(),
				/* translators: 1: action label, 2: target label. */
				'combined_label_format'   => self::get_combined_label_format(),
				/* translators: 1: action label, 2: target label. */
				'label_colon_format'      => __( '%1$s: %2$s', 'pufferdesk' ),
				'item_count_format'       => self::get_item_count_format(),
				/* translators: %s: window title. */
				'window_title_format'     => self::get_window_title_format(),
				/* translators: %s: window title. */
				'window_restore_format'   => __( 'Restore %s', 'pufferdesk' ),
				/* translators: 1: theme family label, 2: theme version label. */
				'theme_version_format'    => __( '%1$s · %2$s', 'pufferdesk' ),
				'bring_to_front'          => __( 'Bring to Front', 'pufferdesk' ),
				'show_all'                => __( 'Show All', 'pufferdesk' ),
				'show_all_windows'        => __( 'Show All', 'pufferdesk' ),
				'hide'                    => __( 'Hide', 'pufferdesk' ),
				'hide_others'             => __( 'Hide Others', 'pufferdesk' ),
				'remove_widget'           => __( 'Remove Widget', 'pufferdesk' ),
				'edit_widgets'            => __( 'Edit Widgets...', 'pufferdesk' ),
				'desktop_apps'            => $template_labels['desktop_apps'],
				'rename'                  => __( 'Rename', 'pufferdesk' ),
				'action'                  => __( 'Action', 'pufferdesk' ),
				'context_menu'            => __( 'Context Menu', 'pufferdesk' ),
				'trash'                   => __( 'Trash', 'pufferdesk' ),
				/* translators: %d: number of items in the trash. */
				'trash_item_count'        => __( 'Trash, %d item', 'pufferdesk' ),
				/* translators: %d: number of items in the trash. */
				'trash_item_count_plural' => __( 'Trash, %d items', 'pufferdesk' ),
				'pufferdesk_desktop'      => $template_labels['pufferdesk_desktop'],
				'pufferdesk_trash_source' => __( 'PufferDesk Trash', 'pufferdesk' ),
				'pufferdesk_user_folder_source' => __( 'PufferDesk user folder', 'pufferdesk' ),
				'pufferdesk_virtual_filesystem_source' => __( 'PufferDesk virtual filesystem', 'pufferdesk' ),
				'wordpress_admin_group_source' => __( 'WordPress admin group', 'pufferdesk' ),
				/* translators: %s: WordPress admin menu group label. */
				'wordpress_admin_menu_format' => __( 'WordPress Admin Menu > %s', 'pufferdesk' ),
				'empty'                   => __( 'Empty', 'pufferdesk' ),
				'move_to_trash'           => __( 'Move to Trash', 'pufferdesk' ),
				'move_folder_to_trash_message' => __( 'This PufferDesk folder and its contents will be moved. Apps and plugins inside it stay installed and available.', 'pufferdesk' ),
				'move_folder_to_trash_confirmation' => __( 'Are you sure you want to move this folder to Trash?', 'pufferdesk' ),
				'move_folder_to_trash_confirm_label' => __( 'Move to Trash', 'pufferdesk' ),
				'move_folder_to_trash_cancel_label' => __( 'Cancel', 'pufferdesk' ),
				'move_folder_to_trash_window_title' => __( 'Move Folder', 'pufferdesk' ),
				/* translators: %s: folder label. */
				'move_folder_to_trash_title_format' => __( 'Move "%s" to Trash?', 'pufferdesk' ),
				/* translators: %d: number of selected folders. */
				'selected_folder_count_format' => __( '%d folders', 'pufferdesk' ),
				'move_folders_to_trash_message' => __( 'These PufferDesk folders and their contents will be moved. Apps and plugins inside them stay installed and available.', 'pufferdesk' ),
				'move_folders_to_trash_confirmation' => __( 'Are you sure you want to move these folders to Trash?', 'pufferdesk' ),
				'move_folders_to_trash_confirm_label' => __( 'Move to Trash', 'pufferdesk' ),
				'move_folders_to_trash_window_title' => __( 'Move Folders', 'pufferdesk' ),
				/* translators: %d: number of selected folders. */
				'move_folders_to_trash_title_format' => __( 'Move %d folders to Trash?', 'pufferdesk' ),
				'put_back'                => __( 'Put Back', 'pufferdesk' ),
				'empty_trash'             => __( 'Empty Trash', 'pufferdesk' ),
				'empty_trash_confirmation' => __( 'Empty Trash?', 'pufferdesk' ),
				'delete'                  => __( 'Delete', 'pufferdesk' ),
				'delete_immediately'      => __( 'Delete Immediately', 'pufferdesk' ),
				'delete_immediately_title' => __( 'Delete Immediately?', 'pufferdesk' ),
				'delete_immediately_message' => __( 'This permanently deletes the selected item. Apps and plugins are not deleted.', 'pufferdesk' ),
				'delete_immediately_fallback_message' => __( 'Delete this item immediately?', 'pufferdesk' ),
				'about_this_site'         => __( 'About This Site', 'pufferdesk' ),
				'about_pufferdesk'        => __( 'About PufferDesk', 'pufferdesk' ),
				'move_validator_unavailable' => __( 'The move validator is not available.', 'pufferdesk' ),
				'move_not_applied'       => __( 'The move did not change workspace state.', 'pufferdesk' ),
				'move_could_not_be_completed' => __( 'The move could not be completed.', 'pufferdesk' ),
				'move_missing_item'      => __( 'Move requests must include a supported item id and type.', 'pufferdesk' ),
				'move_unsupported_item_type' => __( 'Only apps, folders, and documents can be moved by the core move service.', 'pufferdesk' ),
				'move_unknown_item'      => __( 'The moved item does not exist in the current workspace.', 'pufferdesk' ),
				'move_locked_item'       => __( 'Locked or system items cannot be moved to that container.', 'pufferdesk' ),
				'move_missing_source_container' => __( 'Move requests must include a source container.', 'pufferdesk' ),
				'move_missing_target_container' => __( 'Move requests must include a target container.', 'pufferdesk' ),
				'move_unknown_source_container' => __( 'The source container is not registered.', 'pufferdesk' ),
				'move_unknown_target_container' => __( 'The target container is not registered.', 'pufferdesk' ),
				'move_source_locked'     => __( 'The item cannot be moved out of its source container.', 'pufferdesk' ),
				'move_target_rejected'   => __( 'The target container does not accept this item.', 'pufferdesk' ),
				'move_system_folder'     => __( 'Only user-created folders can be moved between containers.', 'pufferdesk' ),
				'move_trash_parent'      => __( 'Trash cannot be used as a folder parent.', 'pufferdesk' ),
				'move_self_nesting'      => __( 'A folder cannot be moved into itself.', 'pufferdesk' ),
				'move_descendant_nesting' => __( 'A folder cannot be moved into one of its descendants.', 'pufferdesk' ),
				'move_app_already_on_desktop' => __( 'The app is already available on the desktop.', 'pufferdesk' ),
				'move_duplicate_item'    => __( 'The target folder already contains this app.', 'pufferdesk' ),
				'move_target_not_allowed' => __( 'The item model does not allow this drop target.', 'pufferdesk' ),
				'keyboard_shortcuts'      => __( 'Keyboard Shortcuts', 'pufferdesk' ),
				'keyboard_shortcuts_title' => __( 'Keyboard Shortcuts', 'pufferdesk' ),
				'keyboard_shortcuts_search_placeholder' => __( 'Search shortcuts', 'pufferdesk' ),
				'keyboard_shortcuts_clear_search' => __( 'Clear search', 'pufferdesk' ),
				'keyboard_shortcuts_no_results' => __( 'No shortcuts found.', 'pufferdesk' ),
				'keyboard_shortcuts_global' => __( 'Global', 'pufferdesk' ),
				'keyboard_shortcuts_desktop' => __( 'Desktop', 'pufferdesk' ),
				'keyboard_shortcuts_desktop_folders' => __( 'Desktop & Folders', 'pufferdesk' ),
				'keyboard_shortcuts_windows' => __( 'Window Management', 'pufferdesk' ),
				'keyboard_shortcuts_folders' => __( 'Folders', 'pufferdesk' ),
				'keyboard_shortcuts_folder_tabs' => __( 'Folder Tabs', 'pufferdesk' ),
				'keyboard_shortcuts_text_editing' => __( 'Text Editing', 'pufferdesk' ),
				'keyboard_shortcuts_dialogs' => __( 'Dialogs', 'pufferdesk' ),
				'keyboard_shortcuts_search' => __( 'Search', 'pufferdesk' ),
				'keyboard_shortcuts_other' => __( 'Other', 'pufferdesk' ),
				'shortcut_key_backspace' => __( 'Backspace', 'pufferdesk' ),
				'shortcut_key_delete'    => __( 'Delete', 'pufferdesk' ),
				'shortcut_key_enter'     => __( 'Enter', 'pufferdesk' ),
				'shortcut_key_escape'    => __( 'Esc', 'pufferdesk' ),
				'shortcut_key_space'     => __( 'Space', 'pufferdesk' ),
				'shortcut_key_tab'       => __( 'Tab', 'pufferdesk' ),
				'shortcut_modifier_alt'  => __( 'Alt', 'pufferdesk' ),
				'shortcut_modifier_control' => __( 'Ctrl', 'pufferdesk' ),
				'shortcut_modifier_meta' => __( 'Meta', 'pufferdesk' ),
				'shortcut_modifier_shift' => __( 'Shift', 'pufferdesk' ),
				'shortcut_reserved_window_scope' => __( 'primary+w is reserved unless scoped to a PufferDesk window or tab.', 'pufferdesk' ),
					'shortcut_reserved_clear_scope' => __( 'primary+n is reserved unless clearly scoped.', 'pufferdesk' ),
					'shortcut_reserved_window_reason' => __( 'Scoped to PufferDesk windows.', 'pufferdesk' ),
					/* translators: 1: keyboard shortcut label, 2: reserved browser or shell action label. */
					'shortcut_reserved_for_format' => __( '%1$s is reserved for %2$s.', 'pufferdesk' ),
				/* translators: 1: keyboard shortcut label, 2: conflicting command label. */
				'shortcut_may_conflict_format' => __( '%1$s may conflict with %2$s.', 'pufferdesk' ),
				/* translators: 1: keyboard shortcut label, 2: conflicting command label. */
				'shortcut_conflicts_with_format' => __( '%1$s conflicts with %2$s.', 'pufferdesk' ),
				'shortcut_conflict_console' => __( 'PufferDesk shortcut conflict:', 'pufferdesk' ),
				'shortcut_reserved_browser_back' => __( 'browser back', 'pufferdesk' ),
				'shortcut_reserved_browser_forward' => __( 'browser forward', 'pufferdesk' ),
				'shortcut_reserved_browser_history' => __( 'browser history', 'pufferdesk' ),
				'shortcut_reserved_browser_location_bar' => __( 'browser location bar', 'pufferdesk' ),
				'shortcut_reserved_browser_new_tab' => __( 'browser new tab', 'pufferdesk' ),
				'shortcut_reserved_browser_next_tab' => __( 'browser next tab', 'pufferdesk' ),
				'shortcut_reserved_browser_previous_tab' => __( 'browser previous tab', 'pufferdesk' ),
				'shortcut_reserved_browser_print' => __( 'browser print', 'pufferdesk' ),
				'shortcut_reserved_browser_private_window' => __( 'browser private window', 'pufferdesk' ),
				'shortcut_reserved_browser_quit_application' => __( 'browser quit application', 'pufferdesk' ),
				'shortcut_reserved_browser_reload' => __( 'browser reload', 'pufferdesk' ),
				'shortcut_reserved_browser_reopen_closed_tab' => __( 'browser reopen closed tab', 'pufferdesk' ),
				'shortcut_reserved_browser_save_page' => __( 'browser save page', 'pufferdesk' ),
				'shortcut_reserved_developer_tools' => __( 'developer tools', 'pufferdesk' ),
				'shortcut_reserved_developer_tools_console' => __( 'developer tools console', 'pufferdesk' ),
				'shortcut_reserved_developer_tools_element_picker' => __( 'developer tools element picker', 'pufferdesk' ),
				'shortcut_reserved_system_hide_application' => __( 'system hide application', 'pufferdesk' ),
				'shortcut_reserved_system_hide_other_applications' => __( 'system hide other applications', 'pufferdesk' ),
				'shortcut_reserved_system_minimize_window' => __( 'system minimize window', 'pufferdesk' ),
				'shortcut_reserved_system_screenshot' => __( 'system screenshot', 'pufferdesk' ),
				'shortcut_reserved_system_search' => __( 'system search', 'pufferdesk' ),
					'wordpress_documentation' => __( 'WordPress Documentation', 'pufferdesk' ),
					'support_forums'          => __( 'Support Forums', 'pufferdesk' ),
					'launcher'                => $shell_labels['launcher'],
					'launcher_options'        => $shell_labels['launcher_options'],
					/* translators: %s: theme-specific launcher label, such as Dock or Taskbar. */
					'fixed_launcher_placement_format' => __( 'App has a fixed %s placement.', 'pufferdesk' ),
				'app_unavailable'         => __( 'App unavailable.', 'pufferdesk' ),
					'launcher_settings'       => $shell_labels['launcher_options'],
					'keep_in_launcher'        => $shell_labels['keep_in_launcher'],
					'remove_from_launcher'    => $shell_labels['remove_from_launcher'],
					'open_at_login'           => $shell_labels['open_at_login'],
					'uninstall'               => __( 'Uninstall', 'pufferdesk' ),
					'window_close'            => $window_control_labels['close'],
				'window_minimize'         => $window_control_labels['minimize'],
				'window_maximize'         => $window_control_labels['maximize'],
				'window_restore'          => __( 'Restore', 'pufferdesk' ),
				'window_move'             => __( 'Move', 'pufferdesk' ),
				'window_size'             => __( 'Size', 'pufferdesk' ),
			),
		);

		$theme_labels = $this->get_theme_menu_labels( $theme );
		if ( ! empty( $theme_labels ) ) {
			$config['labels'] = wp_parse_args( $theme_labels, $config['labels'] );
		}

		return $config;
	}

}
