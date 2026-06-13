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
	 * Sound event registry.
	 *
	 * @var PufferDesk_Sound_Registry
	 */
	private $sound_registry;

	/**
	 * Constructor.
	 *
	 * @param PufferDesk_Router            $router Request router.
	 * @param PufferDesk_Theme_Registry    $theme_registry Theme registry.
	 * @param PufferDesk_Settings_Registry $settings_registry Settings registry.
	 * @param PufferDesk_Virtual_Filesystem|null  $virtual_filesystem Virtual filesystem service.
	 * @param PufferDesk_Notification_Registry|null $notification_registry Notification registry.
	 * @param PufferDesk_User_Preferences|null    $preferences User preferences.
	 * @param PufferDesk_Sound_Registry|null      $sound_registry Sound event registry.
	 */
	public function __construct( PufferDesk_Router $router, PufferDesk_Theme_Registry $theme_registry, PufferDesk_Settings_Registry $settings_registry, $virtual_filesystem = null, $notification_registry = null, $preferences = null, $sound_registry = null ) {
		$this->router             = $router;
		$this->theme_registry     = $theme_registry;
		$this->settings_registry  = $settings_registry;
		$this->preferences        = $preferences instanceof PufferDesk_User_Preferences ? $preferences : new PufferDesk_User_Preferences();
		$this->virtual_filesystem = $virtual_filesystem instanceof PufferDesk_Virtual_Filesystem ? $virtual_filesystem : new PufferDesk_Virtual_Filesystem();
		$this->notification_registry = $notification_registry instanceof PufferDesk_Notification_Registry
			? $notification_registry
			: new PufferDesk_Notification_Registry( new PufferDesk_User_Preferences(), new PufferDesk_Notification_Normalizer() );
		$this->sound_registry = $sound_registry instanceof PufferDesk_Sound_Registry ? $sound_registry : new PufferDesk_Sound_Registry();
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
					'desktop_apps'          => __( 'Desktop apps', 'pufferdesk-admin-desktop' ),
					'desktop_folders'       => __( 'Desktop folders', 'pufferdesk-admin-desktop' ),
					'desktop_widgets'       => __( 'Desktop widgets', 'pufferdesk-admin-desktop' ),
					'launcher'              => __( 'Dock', 'pufferdesk-admin-desktop' ),
					'menu_items'            => __( 'PufferDesk menus', 'pufferdesk-admin-desktop' ),
					'open_system_menu'      => __( 'Open PufferDesk menu', 'pufferdesk-admin-desktop' ),
					'pufferdesk_desktop'    => __( 'PufferDesk Desktop', 'pufferdesk-admin-desktop' ),
					'search'                => __( 'Search', 'pufferdesk-admin-desktop' ),
					'search_apps'           => __( 'Search apps', 'pufferdesk-admin-desktop' ),
					'start'                 => __( 'Start', 'pufferdesk-admin-desktop' ),
					'open_start'            => __( 'Open Start', 'pufferdesk-admin-desktop' ),
					'status'                => __( 'Status', 'pufferdesk-admin-desktop' ),
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
		return __( '%1$s %2$s', 'pufferdesk-admin-desktop' );
	}

	/**
	 * Generic count and noun label format.
	 *
	 * @return string
	 */
	private static function get_item_count_format() {
		/* translators: 1: item count, 2: item label. */
		return __( '%1$d %2$s', 'pufferdesk-admin-desktop' );
	}

	/**
	 * Generic window aria label format.
	 *
	 * @return string
	 */
	private static function get_window_title_format() {
		/* translators: %s: window title. */
		return __( '%s window', 'pufferdesk-admin-desktop' );
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
		$theme_id = isset( $theme['id'] ) && is_string( $theme['id'] ) && '' !== $theme['id'] ? $theme['id'] : 'pufferdesk';
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
			'logoutUrl'      => $this->get_logout_url(),
			'media'          => array(
				'sharedIconsUrl' => esc_url_raw( PUFFERDESK_URL . 'assets/media/shared/icons/' ),
			),
			'menuBar'        => isset( $context['menu_bar'] ) && is_array( $context['menu_bar'] ) ? $context['menu_bar'] : array(),
			'notifications'  => $this->notification_registry->get_client_config(),
			'settings'       => $this->get_settings_config( $theme ),
			'shellCapabilities' => $this->get_shell_capabilities_config( $theme ),
			'shellChrome'    => isset( $theme['shell'] ) ? $theme['shell'] : array(),
			'shellUrl'       => $this->router->get_shell_url(),
			'siteInfo'       => $this->get_site_info_config(),
			'siteName'       => get_bloginfo( 'name' ),
			'sounds'         => $this->get_sounds_config( $theme ),
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
			'infoPanel'    => $this->get_info_panel_config(),
			'menu'         => $this->get_menu_config( $theme ),
			'theme'        => $theme,
			'typography'   => isset( $theme['typography'] ) ? $theme['typography'] : array(),
			'widgets'      => isset( $context['widgets'] ) && is_array( $context['widgets'] ) ? $context['widgets'] : array(),
			'windowChrome' => isset( $theme['window_chrome'] ) ? $theme['window_chrome'] : array(),
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
			),
		);
	}

	/**
	 * Localized labels used by shared native info panels.
	 *
	 * @return array<string,mixed>
	 */
	private function get_info_panel_config() {
		return array(
			'labels' => array(
				'aboutSiteTitle'            => __( 'About This Site', 'pufferdesk-admin-desktop' ),
				'accessLabel'               => __( 'Access', 'pufferdesk-admin-desktop' ),
				'applicationPlural'         => __( 'applications', 'pufferdesk-admin-desktop' ),
				'applicationSingular'       => __( 'application', 'pufferdesk-admin-desktop' ),
				'appsLabel'                 => __( 'Apps', 'pufferdesk-admin-desktop' ),
				'capabilityAccess'          => __( 'Visible to users with matching WordPress capabilities', 'pufferdesk-admin-desktop' ),
					'containsLabel'             => __( 'Contains', 'pufferdesk-admin-desktop' ),
					'createdLabel'              => __( 'Created', 'pufferdesk-admin-desktop' ),
					'documentFallbackTitle'     => __( 'Document', 'pufferdesk-admin-desktop' ),
					/* translators: %s: document label. */
					'documentInfoTitle'         => __( '%s Info', 'pufferdesk-admin-desktop' ),
					'folderFallbackTitle'       => __( 'Folder', 'pufferdesk-admin-desktop' ),
					/* translators: %s: folder label. */
					'folderInfoTitle'           => __( '%s Info', 'pufferdesk-admin-desktop' ),
					/* translators: %s: folder contents count. */
					'folderSizeTemplate'        => __( '%s in this folder', 'pufferdesk-admin-desktop' ),
					'generalSection'            => __( 'General:', 'pufferdesk-admin-desktop' ),
				'infoFallbackTitle'         => __( 'Info', 'pufferdesk-admin-desktop' ),
				'itemPlural'                => __( 'items', 'pufferdesk-admin-desktop' ),
				'itemSingular'              => __( 'item', 'pufferdesk-admin-desktop' ),
				'itemCountTemplate'         => self::get_item_count_format(),
				'itemsLabel'                => __( 'Items', 'pufferdesk-admin-desktop' ),
				'kindLabel'                 => __( 'Kind', 'pufferdesk-admin-desktop' ),
				'pufferdeskFallback'        => PufferDesk_Product_Labels::name(),
					'lastOpenedLabel'           => __( 'Last opened', 'pufferdesk-admin-desktop' ),
					'locked'                    => __( 'Locked', 'pufferdesk-admin-desktop' ),
					'modifiedLabel'             => __( 'Modified', 'pufferdesk-admin-desktop' ),
					/* translators: %s: formatted modified date. */
					'modifiedTemplate'          => __( 'Modified: %s', 'pufferdesk-admin-desktop' ),
					'moreInfoLabel'             => __( 'More Info...', 'pufferdesk-admin-desktop' ),
				'moreInfoSection'           => __( 'More Info:', 'pufferdesk-admin-desktop' ),
				'nameSection'               => __( 'Name:', 'pufferdesk-admin-desktop' ),
					'noPreviewItems'            => __( 'No items to preview.', 'pufferdesk-admin-desktop' ),
					'notAvailable'              => __( 'Not available', 'pufferdesk-admin-desktop' ),
					/* translators: %s: preview item count. */
					'previewAvailableTemplate'  => __( '%s available.', 'pufferdesk-admin-desktop' ),
					'previewSection'            => __( 'Preview:', 'pufferdesk-admin-desktop' ),
				'privateUserAccess'         => __( 'Private to this WordPress user', 'pufferdesk-admin-desktop' ),
				'sharedFolder'              => __( 'Shared folder', 'pufferdesk-admin-desktop' ),
				'sharingPermissionsSection' => __( 'Sharing & Permissions:', 'pufferdesk-admin-desktop' ),
				'siteHealthInfoTitle'       => __( 'Site Health Info', 'pufferdesk-admin-desktop' ),
					'sizeLabel'                 => __( 'Size', 'pufferdesk-admin-desktop' ),
					'sourceLabel'               => __( 'Source', 'pufferdesk-admin-desktop' ),
					'whereLabel'                => __( 'Where', 'pufferdesk-admin-desktop' ),
					'windowAriaLabel'           => self::get_window_title_format(),
				'wordpressSiteTitle'        => __( 'WordPress Site', 'pufferdesk-admin-desktop' ),
			),
		);
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
					'label'         => __( 'Sticky Notes', 'pufferdesk-admin-desktop' ),
				),
			),
			'savePolicies' => array(
				'stickyNote' => $sticky_save_policy,
			),
			'labels'       => array(
				'bold'                         => __( 'Bold', 'pufferdesk-admin-desktop' ),
				'bulletList'                   => __( 'Bullet list', 'pufferdesk-admin-desktop' ),
				'cancel'                       => __( 'Cancel', 'pufferdesk-admin-desktop' ),
				'close'                        => $close_label,
				'couldNotLoadStickyNotes'      => __( 'Could not load sticky notes.', 'pufferdesk-admin-desktop' ),
				'delete'                       => __( 'Delete', 'pufferdesk-admin-desktop' ),
				'deleteNote'                   => __( 'Delete Note', 'pufferdesk-admin-desktop' ),
				'deleteStickyNote'             => __( 'Delete this note?', 'pufferdesk-admin-desktop' ),
				'deleted'                      => __( 'Deleted', 'pufferdesk-admin-desktop' ),
				'discardNote'                  => __( 'Discard Note', 'pufferdesk-admin-desktop' ),
				'discardNoteMessage'           => __( 'Are you sure you want to discard this sticky note?', 'pufferdesk-admin-desktop' ),
				'discardNoteTitle'             => __( "If you don't save this note, its contents will be lost.", 'pufferdesk-admin-desktop' ),
				'formatting'                   => __( 'Formatting', 'pufferdesk-admin-desktop' ),
				'fullscreenNote'               => __( 'Make Full Screen', 'pufferdesk-admin-desktop' ),
				'hideNote'                     => __( 'Hide Note', 'pufferdesk-admin-desktop' ),
				'imageUrlPrompt'               => __( 'Image URL', 'pufferdesk-admin-desktop' ),
				'insertImage'                  => __( 'Insert image', 'pufferdesk-admin-desktop' ),
				'italic'                       => __( 'Italic', 'pufferdesk-admin-desktop' ),
				'loading'                      => __( 'Loading...', 'pufferdesk-admin-desktop' ),
				'newNote'                      => __( 'New Note', 'pufferdesk-admin-desktop' ),
				'newStickyNote'                => __( 'New Sticky Note', 'pufferdesk-admin-desktop' ),
				'noSearchResults'              => __( 'No matching notes', 'pufferdesk-admin-desktop' ),
				'noStickyNotes'                => __( 'No sticky notes', 'pufferdesk-admin-desktop' ),
				'noteOptions'                  => __( 'Note options', 'pufferdesk-admin-desktop' ),
				'notesList'                    => __( 'Notes list', 'pufferdesk-admin-desktop' ),
				'save'                         => __( 'Save', 'pufferdesk-admin-desktop' ),
				'saveAs'                       => __( 'Save As:', 'pufferdesk-admin-desktop' ),
				'saveStickyNoteTitle'          => __( 'Save Sticky Note', 'pufferdesk-admin-desktop' ),
				'saveEllipsis'                 => __( 'Save...', 'pufferdesk-admin-desktop' ),
				'saveLocationUnavailable'      => __( 'No save locations available.', 'pufferdesk-admin-desktop' ),
				'saved'                        => __( 'Saved', 'pufferdesk-admin-desktop' ),
				'saving'                       => __( 'Saving...', 'pufferdesk-admin-desktop' ),
				'search'                       => __( 'Search', 'pufferdesk-admin-desktop' ),
				'searchPlaceholder'            => __( 'Search...', 'pufferdesk-admin-desktop' ),
				'show'                         => __( 'Show', 'pufferdesk-admin-desktop' ),
				'stickyNote'                   => $document_labels['stickyNote'],
				'stickyNotes'                  => __( 'Sticky Notes', 'pufferdesk-admin-desktop' ),
				'stickyPlaceholder'            => __( 'Take a note...', 'pufferdesk-admin-desktop' ),
				'stickyNotesServiceUnavailable' => __( 'Sticky Notes service unavailable.', 'pufferdesk-admin-desktop' ),
				'strikethrough'                => __( 'Strikethrough', 'pufferdesk-admin-desktop' ),
				'underline'                    => __( 'Underline', 'pufferdesk-admin-desktop' ),
				'untitledStickyNote'           => $document_labels['untitledStickyNote'],
				'where'                        => __( 'Where:', 'pufferdesk-admin-desktop' ),
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
					'groupLabel' => __( 'Media', 'pufferdesk-admin-desktop' ),
					'label'      => __( 'Media', 'pufferdesk-admin-desktop' ),
					'resultType' => 'wp_attachment',
				),
				'page'       => array(
					'groupLabel' => __( 'Pages', 'pufferdesk-admin-desktop' ),
					'label'      => __( 'Page', 'pufferdesk-admin-desktop' ),
					'resultType' => 'wp_page',
				),
				'post'       => array(
					'groupLabel' => __( 'Posts', 'pufferdesk-admin-desktop' ),
					'label'      => __( 'Post', 'pufferdesk-admin-desktop' ),
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
				'cancel'  => __( 'Cancel', 'pufferdesk-admin-desktop' ),
				'close'   => $close_label,
				'confirm' => __( 'OK', 'pufferdesk-admin-desktop' ),
			)
		);

		return $dialogs;
	}

	/**
	 * Shared shell sound event map.
	 *
	 * @param array<string,mixed> $theme Resolved theme metadata.
	 * @return array<string,mixed>
	 */
	private function get_sounds_config( $theme ) {
		return $this->sound_registry->get_client_config( $theme, $this->preferences );
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
			return __( 'WordPress User', 'pufferdesk-admin-desktop' );
		}

		$role       = sanitize_key( $roles[0] );
		$role_names = wp_roles()->role_names;

		if ( '' === $role ) {
			return __( 'WordPress User', 'pufferdesk-admin-desktop' );
		}

		if ( isset( $role_names[ $role ] ) ) {
			return translate_user_role( $role_names[ $role ] );
		}

		return ucwords( str_replace( '_', ' ', $role ) );
	}

	/**
	 * Safe site details for the About This Site window.
	 *
	 * @return array<string,mixed>
	 */
	private function get_site_info_config() {
		global $wpdb;

		$theme           = wp_get_theme();
		$theme_name      = $theme->exists() ? $theme->get( 'Name' ) : __( 'Unknown', 'pufferdesk-admin-desktop' );
		$theme_version   = $theme->exists() ? $theme->get( 'Version' ) : '';
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
				'label' => __( 'PHP', 'pufferdesk-admin-desktop' ),
				'value' => PHP_VERSION,
			),
			array(
				'label' => __( 'Database', 'pufferdesk-admin-desktop' ),
				'value' => $database_label,
			),
			array(
				'label' => __( 'Server', 'pufferdesk-admin-desktop' ),
				'value' => $server_software,
			),
		);

		return array(
			'title'         => __( 'About This Site', 'pufferdesk-admin-desktop' ),
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
						__( 'WordPress %s', 'pufferdesk-admin-desktop' ),
						$wp_release_name
					)
					: __( 'WordPress', 'pufferdesk-admin-desktop' ),
				'value' => PufferDesk_App_Normalizer::format_about_version( $wp_version ),
			),
			'display'       => array(
				'buttonIcon'  => 'dashicons-admin-appearance',
				'buttonLabel' => __( 'Theme Settings...', 'pufferdesk-admin-desktop' ),
				'buttonTitle' => __( 'Themes', 'pufferdesk-admin-desktop' ),
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
								'label' => __( 'WordPress', 'pufferdesk-admin-desktop' ),
								'value' => $wp_label,
							),
						)
					),
					static function ( $row ) {
						return ! empty( $row['value'] );
					}
				)
			),
			'moreInfoLabel'   => __( 'More Info...', 'pufferdesk-admin-desktop' ),
			'moreInfoCommand' => PufferDesk_Command_Ids::SETTINGS_OPEN_PANEL,
			'moreInfoPanel'   => 'general-about',
			'moreInfoTitle'   => __( 'Site Health Info', 'pufferdesk-admin-desktop' ),
			'moreInfoUrl'     => current_user_can( 'view_site_health_checks' ) ? admin_url( 'site-health.php?tab=debug' ) : '',
			'footer'          => sprintf(
				/* translators: %s: PufferDesk plugin version. */
				__( 'PufferDesk %s · Built for WordPress admin.', 'pufferdesk-admin-desktop' ),
				PUFFERDESK_VERSION
			),
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
			return __( 'Unknown', 'pufferdesk-admin-desktop' );
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
			'launcher'             => __( 'Dock', 'pufferdesk-admin-desktop' ),
			'desktop_launcher'     => __( 'Desktop & Dock', 'pufferdesk-admin-desktop' ),
			'launcher_and_desktop' => __( 'Dock & Desktop', 'pufferdesk-admin-desktop' ),
			'launcher_position'    => __( 'Dock position on screen', 'pufferdesk-admin-desktop' ),
			'auto_hide_launcher'   => __( 'Automatically hide and show the Dock', 'pufferdesk-admin-desktop' ),
			'launcher_options'     => __( 'Options', 'pufferdesk-admin-desktop' ),
			'keep_in_launcher'     => __( 'Keep in Dock', 'pufferdesk-admin-desktop' ),
			'remove_from_launcher' => __( 'Remove from Dock', 'pufferdesk-admin-desktop' ),
			'open_at_login'        => __( 'Open at Login', 'pufferdesk-admin-desktop' ),
			'menu_bar'             => __( 'Menu Bar', 'pufferdesk-admin-desktop' ),
			'menu_bar_auto_hide'   => __( 'Automatically hide and show the menu bar', 'pufferdesk-admin-desktop' ),
			'menu_bar_background'  => __( 'Show menu bar background', 'pufferdesk-admin-desktop' ),
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
				'autoHide'   => $has_menu_bar,
				'background' => $has_menu_bar,
				'recent'     => 'global' === $app_menu,
			),
			'appLocations'      => array(
				'launcher' => $has_launcher,
				'desktop'  => true,
			),
			'appearance'        => array(
				'windowMaterial'  => isset( $theme['family'] ) && 'pufferdesk' === $theme['family'],
				'accentColor'     => true,
				'iconWidgetStyle' => true,
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
			),
			'labels'  => $labels,
		);
	}

	/**
	 * Theme mode options used by the Appearance settings panel.
	 *
	 * @return array<int,array<string,string>>
	 */
	private function get_theme_mode_options_config() {
		return array(
			array(
				'value' => PufferDesk_User_Preferences::THEME_MODE_AUTO,
				'label' => __( 'Auto', 'pufferdesk-admin-desktop' ),
			),
			array(
				'value' => PufferDesk_User_Preferences::THEME_MODE_PUFFERDESK,
				'label' => __( 'PufferDesk', 'pufferdesk-admin-desktop' ),
			),
			array(
				'value' => PufferDesk_User_Preferences::THEME_MODE_REDMOND,
				'label' => __( 'Redmond', 'pufferdesk-admin-desktop' ),
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
			array( 'value' => PufferDesk_User_Preferences::APP_LOCATION_DESKTOP, 'label' => __( 'Desktop', 'pufferdesk-admin-desktop' ) ),
			array( 'value' => PufferDesk_User_Preferences::APP_LOCATION_HIDDEN, 'label' => __( 'Hidden', 'pufferdesk-admin-desktop' ) ),
		);
		if ( ! empty( $capabilities['appLocations']['launcher'] ) ) {
			$app_location_options = array(
				array( 'value' => PufferDesk_User_Preferences::APP_LOCATION_DOCK, 'label' => $launcher_label ),
				array( 'value' => PufferDesk_User_Preferences::APP_LOCATION_DESKTOP, 'label' => __( 'Desktop', 'pufferdesk-admin-desktop' ) ),
				array( 'value' => PufferDesk_User_Preferences::APP_LOCATION_BOTH, 'label' => $launcher_and_desktop ),
				array( 'value' => PufferDesk_User_Preferences::APP_LOCATION_HIDDEN, 'label' => __( 'Hidden', 'pufferdesk-admin-desktop' ) ),
			);
		}

		$labels = array(
			'appTitle'     => __( 'Settings', 'pufferdesk-admin-desktop' ),
			'status'       => array(
				'saving'                 => __( 'Saving...', 'pufferdesk-admin-desktop' ),
				'removing'               => __( 'Removing...', 'pufferdesk-admin-desktop' ),
				'serviceUnavailable'     => __( 'Settings service unavailable.', 'pufferdesk-admin-desktop' ),
				'appearanceSaveError'    => __( 'Appearance could not be saved.', 'pufferdesk-admin-desktop' ),
				'appearanceSaved'        => __( 'Appearance saved.', 'pufferdesk-admin-desktop' ),
				'desktopDockSaveError'   => sprintf(
					/* translators: %s: theme-specific desktop and launcher settings label. */
					__( '%s could not be saved.', 'pufferdesk-admin-desktop' ),
					$desktop_launcher_label
				),
				'appLocationsSaveError'  => __( 'App locations could not be saved.', 'pufferdesk-admin-desktop' ),
				'appLocationsSaved'      => __( 'App locations saved.', 'pufferdesk-admin-desktop' ),
				'loginItemsSaveError'    => __( 'Login items could not be saved.', 'pufferdesk-admin-desktop' ),
				'loginItemsSaved'        => __( 'Login items saved.', 'pufferdesk-admin-desktop' ),
				'menuBarSaveError'       => sprintf(
					/* translators: %s: theme-specific menu bar label. */
					__( '%s could not be saved.', 'pufferdesk-admin-desktop' ),
					$menu_bar_label
				),
				'notificationsSaveError' => __( 'Notifications could not be saved.', 'pufferdesk-admin-desktop' ),
				'notificationsSaved'     => __( 'Notifications saved.', 'pufferdesk-admin-desktop' ),
				'soundsSaveError'        => __( 'Sound could not be saved.', 'pufferdesk-admin-desktop' ),
				'soundsSaved'            => __( 'Sound saved.', 'pufferdesk-admin-desktop' ),
				'wallpaperSaveError'     => __( 'Wallpaper could not be saved.', 'pufferdesk-admin-desktop' ),
				'wallpaperSaved'         => __( 'Wallpaper saved.', 'pufferdesk-admin-desktop' ),
				'photoRemoveError'       => __( 'Photo could not be removed.', 'pufferdesk-admin-desktop' ),
				'photoRemoved'           => __( 'Photo removed.', 'pufferdesk-admin-desktop' ),
				'themeSaveError'         => __( 'Theme could not be saved.', 'pufferdesk-admin-desktop' ),
				'themeSaved'             => __( 'Theme saved.', 'pufferdesk-admin-desktop' ),
				'themeSwitching'         => __( 'Switching theme...', 'pufferdesk-admin-desktop' ),
				'settingsResetError'     => __( 'PufferDesk settings could not be reset.', 'pufferdesk-admin-desktop' ),
				'mediaUnavailable'       => __( 'Media Library is not available for this user.', 'pufferdesk-admin-desktop' ),
				'invalidImage'           => __( 'Choose a valid image.', 'pufferdesk-admin-desktop' ),
			),
			'history'      => array(
				'back'    => __( 'Back', 'pufferdesk-admin-desktop' ),
				'forward' => __( 'Forward', 'pufferdesk-admin-desktop' ),
			),
			'sidebar'      => array(
				'searchPlaceholder' => __( 'Search', 'pufferdesk-admin-desktop' ),
				'searchLabel'       => __( 'Search settings', 'pufferdesk-admin-desktop' ),
				'navLabel'          => __( 'Settings sections', 'pufferdesk-admin-desktop' ),
				'items'             => array(
					array(
						'id'    => 'general',
						'label' => __( 'General', 'pufferdesk-admin-desktop' ),
						'icon'  => 'dashicons-admin-generic',
						'tone'  => 'gray',
					),
					array(
						'id'    => 'appearance',
						'label' => __( 'Appearance', 'pufferdesk-admin-desktop' ),
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
						'id'    => 'menu-bar',
						'label' => $menu_bar_label,
						'icon'  => 'dashicons-menu-alt3',
						'tone'  => 'gray',
						'visible' => ! empty( $capabilities['menuBar']['enabled'] ),
					),
					array(
						'id'    => 'notifications',
						'label' => __( 'Notifications', 'pufferdesk-admin-desktop' ),
						'icon'  => 'dashicons-bell',
						'tone'  => 'blue',
					),
					array(
						'id'    => 'sounds',
						'label' => __( 'Sound', 'pufferdesk-admin-desktop' ),
						'icon'  => 'dashicons-format-audio',
						'tone'  => 'green',
					),
					array(
						'id'    => 'wallpaper',
						'label' => __( 'Wallpaper', 'pufferdesk-admin-desktop' ),
						'icon'  => 'dashicons-format-image',
						'tone'  => 'cyan',
					),
					array(
						'id'    => 'widgets',
						'label' => __( 'Widgets', 'pufferdesk-admin-desktop' ),
						'icon'  => 'dashicons-screenoptions',
						'tone'  => 'green',
					),
					array(
						'id'    => 'apps',
						'label' => __( 'Apps', 'pufferdesk-admin-desktop' ),
						'icon'  => 'dashicons-grid-view',
						'tone'  => 'purple',
					),
					array(
						'id'    => 'workspace',
						'label' => __( 'Workspace', 'pufferdesk-admin-desktop' ),
						'icon'  => 'dashicons-layout',
						'tone'  => 'orange',
					),
					array(
						'id'    => 'system',
						'label' => __( 'System', 'pufferdesk-admin-desktop' ),
						'icon'  => 'dashicons-admin-tools',
						'tone'  => 'red',
					),
				),
			),
			'profile'      => array(
				'sectionLabel'             => __( 'WordPress Account', 'pufferdesk-admin-desktop' ),
				'defaultName'              => __( 'Admin', 'pufferdesk-admin-desktop' ),
				'defaultRole'              => __( 'WordPress User', 'pufferdesk-admin-desktop' ),
				'editProfileLabel'         => __( 'Edit profile', 'pufferdesk-admin-desktop' ),
				'editLabel'                => __( 'Edit', 'pufferdesk-admin-desktop' ),
				'profileTitle'             => __( 'WordPress Profile', 'pufferdesk-admin-desktop' ),
				'personalInfoLabel'        => __( 'Personal Information', 'pufferdesk-admin-desktop' ),
				'personalInfoDescription'  => __( 'Name, contact, website, and bio', 'pufferdesk-admin-desktop' ),
				'rolePermissionsLabel'     => __( 'Role & Permissions', 'pufferdesk-admin-desktop' ),
				'rolePermissionsDescription' => __( 'Current access level', 'pufferdesk-admin-desktop' ),
				'signOutLabel'             => __( 'Sign Out...', 'pufferdesk-admin-desktop' ),
			),
			'generalPanel' => array(
				'title'                     => __( 'General', 'pufferdesk-admin-desktop' ),
				'description'               => __( 'Manage site information, updates, language, privacy, and WordPress tools.', 'pufferdesk-admin-desktop' ),
				'fallbackWindowTitle'       => __( 'WordPress', 'pufferdesk-admin-desktop' ),
				'aboutTitle'                => __( 'About', 'pufferdesk-admin-desktop' ),
				'siteFallbackTitle'         => __( 'WordPress Site', 'pufferdesk-admin-desktop' ),
				'nameLabel'                 => __( 'Name', 'pufferdesk-admin-desktop' ),
				'addressLabel'              => __( 'Address', 'pufferdesk-admin-desktop' ),
				'wordpressHeading'          => __( 'WordPress', 'pufferdesk-admin-desktop' ),
				'displaysHeading'           => __( 'Displays', 'pufferdesk-admin-desktop' ),
				'diagnosticsHeading'        => __( 'Diagnostics', 'pufferdesk-admin-desktop' ),
				'diagnosticsTitle'          => __( 'Site Health', 'pufferdesk-admin-desktop' ),
				'diagnosticsDescription'    => __( 'WordPress diagnostics and environment report', 'pufferdesk-admin-desktop' ),
				'moreInfoLabel'             => __( 'More Info...', 'pufferdesk-admin-desktop' ),
				'moreInfoTitle'             => __( 'Site Health Info', 'pufferdesk-admin-desktop' ),
			),
			'appearance'   => array(
				'title'                 => __( 'Appearance', 'pufferdesk-admin-desktop' ),
				'appearanceLabel'       => __( 'Appearance', 'pufferdesk-admin-desktop' ),
				'materialLabel'         => __( 'Liquid Glass', 'pufferdesk-admin-desktop' ),
				'materialDescription'   => __( 'Choose your preferred Liquid Glass look.', 'pufferdesk-admin-desktop' ),
				'themeHeading'          => __( 'Theme', 'pufferdesk-admin-desktop' ),
				'colorLabel'            => __( 'Color', 'pufferdesk-admin-desktop' ),
				'iconWidgetStyleLabel'  => __( 'Icon & widget style', 'pufferdesk-admin-desktop' ),
				'themeLabel'            => __( 'Theme', 'pufferdesk-admin-desktop' ),
				'themeFallbackLabel'    => __( 'Theme', 'pufferdesk-admin-desktop' ),
				/* translators: 1: theme family label, 2: theme version label. */
				'themeVersionFormat'    => __( '%1$s · %2$s', 'pufferdesk-admin-desktop' ),
				'themeModeOptions'      => $this->get_theme_mode_options_config(),
				'modeOptions'           => array(
					array( 'value' => 'auto', 'label' => __( 'Auto', 'pufferdesk-admin-desktop' ) ),
					array( 'value' => 'light', 'label' => __( 'Light', 'pufferdesk-admin-desktop' ) ),
					array( 'value' => 'dark', 'label' => __( 'Dark', 'pufferdesk-admin-desktop' ) ),
				),
				'materialOptions'       => array(
					array( 'value' => 'clear', 'label' => __( 'Clear', 'pufferdesk-admin-desktop' ) ),
					array( 'value' => 'tinted', 'label' => __( 'Tinted', 'pufferdesk-admin-desktop' ) ),
				),
				'iconWidgetStyleOptions' => array(
					array( 'value' => 'default', 'label' => __( 'Default', 'pufferdesk-admin-desktop' ) ),
					array( 'value' => 'dark', 'label' => __( 'Dark', 'pufferdesk-admin-desktop' ) ),
					array( 'value' => 'clear', 'label' => __( 'Clear', 'pufferdesk-admin-desktop' ) ),
					array( 'value' => 'tinted', 'label' => __( 'Tinted', 'pufferdesk-admin-desktop' ) ),
				),
				'accentOptions'         => array(
					array( 'value' => 'multicolor', 'label' => __( 'Multicolor', 'pufferdesk-admin-desktop' ) ),
					array( 'value' => 'blue', 'label' => __( 'Blue', 'pufferdesk-admin-desktop' ) ),
					array( 'value' => 'purple', 'label' => __( 'Purple', 'pufferdesk-admin-desktop' ) ),
					array( 'value' => 'pink', 'label' => __( 'Pink', 'pufferdesk-admin-desktop' ) ),
					array( 'value' => 'red', 'label' => __( 'Red', 'pufferdesk-admin-desktop' ) ),
					array( 'value' => 'orange', 'label' => __( 'Orange', 'pufferdesk-admin-desktop' ) ),
					array( 'value' => 'yellow', 'label' => __( 'Yellow', 'pufferdesk-admin-desktop' ) ),
					array( 'value' => 'green', 'label' => __( 'Green', 'pufferdesk-admin-desktop' ) ),
					array( 'value' => 'graphite', 'label' => __( 'Graphite', 'pufferdesk-admin-desktop' ) ),
				),
			),
			'desktopDock'  => array(
				'headings' => array(
					'dock'    => $launcher_label,
					'apps'    => __( 'Apps', 'pufferdesk-admin-desktop' ),
					'desktop' => __( 'Desktop', 'pufferdesk-admin-desktop' ),
					'widgets' => __( 'Widgets', 'pufferdesk-admin-desktop' ),
				),
				'rows'     => array(
					'dockSize'                 => __( 'Size', 'pufferdesk-admin-desktop' ),
					'dockMagnification'        => __( 'Magnification', 'pufferdesk-admin-desktop' ),
					'dockPosition'             => $shell_labels['launcher_position'],
					'minimizeAnimation'         => __( 'Minimized window animation', 'pufferdesk-admin-desktop' ),
					'minimizeIntoAppIcon'       => __( 'Minimize windows into application icon', 'pufferdesk-admin-desktop' ),
					'autoHideDock'              => $shell_labels['auto_hide_launcher'],
					'animateOpeningApps'        => __( 'Animate opening applications', 'pufferdesk-admin-desktop' ),
					'showOpenIndicators'        => __( 'Show indicators for open applications', 'pufferdesk-admin-desktop' ),
					'wallpaperClick'            => __( 'Click wallpaper to show desktop', 'pufferdesk-admin-desktop' ),
					'wallpaperClickDescription' => __( 'Click wallpaper to move windows out of the way, revealing your desktop items and widgets.', 'pufferdesk-admin-desktop' ),
					'showWidgetsDesktop'        => __( 'Show widgets on desktop', 'pufferdesk-admin-desktop' ),
					'dimWidgets'                => __( 'Dim widgets on desktop', 'pufferdesk-admin-desktop' ),
				),
				'ranges'   => array(
					'small' => __( 'Small', 'pufferdesk-admin-desktop' ),
					'large' => __( 'Large', 'pufferdesk-admin-desktop' ),
					'off'   => __( 'Off', 'pufferdesk-admin-desktop' ),
				),
				'selectOptions' => array(
					'dock_position'      => array(
						array( 'value' => 'left', 'label' => __( 'Left', 'pufferdesk-admin-desktop' ) ),
						array( 'value' => 'bottom', 'label' => __( 'Bottom', 'pufferdesk-admin-desktop' ) ),
						array( 'value' => 'right', 'label' => __( 'Right', 'pufferdesk-admin-desktop' ) ),
					),
					'minimize_animation' => array(
						array( 'value' => 'genie', 'label' => $shell_labels['minimize_animation_genie'] ),
						array( 'value' => 'scale', 'label' => $shell_labels['minimize_animation_scale'] ),
					),
					'wallpaper_click'    => array(
						array( 'value' => 'always', 'label' => __( 'Always', 'pufferdesk-admin-desktop' ) ),
						array( 'value' => 'never', 'label' => __( 'Never', 'pufferdesk-admin-desktop' ) ),
					),
					'dim_widgets'        => array(
						array( 'value' => 'automatic', 'label' => __( 'Automatically', 'pufferdesk-admin-desktop' ) ),
						array( 'value' => 'always', 'label' => __( 'Always', 'pufferdesk-admin-desktop' ) ),
						array( 'value' => 'never', 'label' => __( 'Never', 'pufferdesk-admin-desktop' ) ),
					),
				),
				'appLocationOptions' => $app_location_options,
			),
			'menuBar'      => array(
				'rows'          => array(
					'autoHide'       => $shell_labels['menu_bar_auto_hide'],
					'showBackground' => $shell_labels['menu_bar_background'],
					'recentCount'    => __( 'Recent documents, applications, and servers', 'pufferdesk-admin-desktop' ),
				),
				'selectOptions' => array(
					'auto_hide'    => array(
						array( 'value' => 'always', 'label' => __( 'Always', 'pufferdesk-admin-desktop' ) ),
						array( 'value' => 'desktop', 'label' => __( 'On Desktop Only', 'pufferdesk-admin-desktop' ) ),
						array( 'value' => 'fullscreen', 'label' => __( 'In Full Screen Only', 'pufferdesk-admin-desktop' ) ),
						array( 'value' => 'never', 'label' => __( 'Never', 'pufferdesk-admin-desktop' ) ),
					),
					'recent_count' => array(
						array( 'value' => '0', 'label' => __( 'None', 'pufferdesk-admin-desktop' ) ),
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
				'title'       => __( 'Notifications', 'pufferdesk-admin-desktop' ),
				'description' => __( 'Choose which WordPress and PufferDesk events appear in Notification Center.', 'pufferdesk-admin-desktop' ),
				'headings'    => array(
					'behavior' => __( 'Behavior', 'pufferdesk-admin-desktop' ),
					'sources'  => __( 'Sources', 'pufferdesk-admin-desktop' ),
				),
				'rows'        => array(
					'enabled'      => __( 'Enable notifications', 'pufferdesk-admin-desktop' ),
					'showBadges'   => __( 'Show notification badges', 'pufferdesk-admin-desktop' ),
					'showToasts'   => __( 'Show notification banners', 'pufferdesk-admin-desktop' ),
					'quietMode'    => __( 'Quiet mode', 'pufferdesk-admin-desktop' ),
					'quietModeDescription' => __( 'Keep notifications in Notification Center without showing banners.', 'pufferdesk-admin-desktop' ),
					'playSound'    => __( 'Play sound', 'pufferdesk-admin-desktop' ),
					'historyDays'  => __( 'Keep history', 'pufferdesk-admin-desktop' ),
					'severity'     => __( 'Show', 'pufferdesk-admin-desktop' ),
				),
				'sourceLabels' => array(
					PufferDesk_User_Preferences::NOTIFICATION_SOURCE_WORDPRESS_UPDATES => __( 'WordPress updates', 'pufferdesk-admin-desktop' ),
					PufferDesk_User_Preferences::NOTIFICATION_SOURCE_COMMENTS          => __( 'Comments', 'pufferdesk-admin-desktop' ),
					PufferDesk_User_Preferences::NOTIFICATION_SOURCE_SITE_HEALTH       => __( 'Site Health', 'pufferdesk-admin-desktop' ),
					PufferDesk_User_Preferences::NOTIFICATION_SOURCE_PUFFERDESK        => __( 'PufferDesk system', 'pufferdesk-admin-desktop' ),
					PufferDesk_User_Preferences::NOTIFICATION_SOURCE_APPS              => __( 'Apps and plugins', 'pufferdesk-admin-desktop' ),
				),
				'severityOptions' => array(
					array( 'value' => 'all', 'label' => __( 'All notifications', 'pufferdesk-admin-desktop' ) ),
					array( 'value' => 'warnings', 'label' => __( 'Warnings and critical alerts', 'pufferdesk-admin-desktop' ) ),
					array( 'value' => 'critical', 'label' => __( 'Critical alerts only', 'pufferdesk-admin-desktop' ) ),
				),
				'historyOptions' => array(
					array( 'value' => '7', 'label' => __( '7 days', 'pufferdesk-admin-desktop' ) ),
					array( 'value' => '30', 'label' => __( '30 days', 'pufferdesk-admin-desktop' ) ),
					array( 'value' => '90', 'label' => __( '90 days', 'pufferdesk-admin-desktop' ) ),
				),
			),
			'sounds'        => array(
				'title'       => __( 'Sound', 'pufferdesk-admin-desktop' ),
				'description' => __( 'Control system sound effects used by PufferDesk.', 'pufferdesk-admin-desktop' ),
				'headings'    => array(
					'behavior' => __( 'Behavior', 'pufferdesk-admin-desktop' ),
					'output'   => __( 'Output', 'pufferdesk-admin-desktop' ),
				),
				'rows'        => array(
					'enabled' => __( 'Enable system sounds', 'pufferdesk-admin-desktop' ),
					'volume'  => __( 'Output volume', 'pufferdesk-admin-desktop' ),
				),
				'ranges'      => array(
					'low'  => __( 'Low', 'pufferdesk-admin-desktop' ),
					'high' => __( 'High', 'pufferdesk-admin-desktop' ),
				),
				'status'      => array(
					'title'          => __( 'Sound', 'pufferdesk-admin-desktop' ),
					'buttonLabel'    => __( 'Sound', 'pufferdesk-admin-desktop' ),
					'mutedLabel'     => __( 'Sound muted', 'pufferdesk-admin-desktop' ),
					'settings'       => __( 'Sound Settings', 'pufferdesk-admin-desktop' ),
					/* translators: %d: Sound output volume percentage. */
					'volumeValue'    => __( 'Volume %d%', 'pufferdesk-admin-desktop' ),
				),
			),
			'wallpaper'    => array(
				'wallpapersHeading'       => __( 'Wallpapers', 'pufferdesk-admin-desktop' ),
				'colorsHeading'           => __( 'Colors', 'pufferdesk-admin-desktop' ),
				'yourPhotosHeading'       => __( 'Your Photos', 'pufferdesk-admin-desktop' ),
				'addPhotoLabel'           => __( 'Add Photo...', 'pufferdesk-admin-desktop' ),
				'selectedPhotoLabel'      => __( 'Selected Photo', 'pufferdesk-admin-desktop' ),
				'removePhotoLabel'        => __( 'Remove photo', 'pufferdesk-admin-desktop' ),
				'showLessLabel'           => __( 'Show Less', 'pufferdesk-admin-desktop' ),
				/* translators: %d: number of wallpaper items. */
				'showAllLabel'            => __( 'Show All (%d)', 'pufferdesk-admin-desktop' ),
				'chooseWallpaperTitle'    => __( 'Choose Wallpaper', 'pufferdesk-admin-desktop' ),
				'useAsWallpaperLabel'     => __( 'Use as Wallpaper', 'pufferdesk-admin-desktop' ),
				'customWallpaperLabel'    => __( 'Custom Wallpaper', 'pufferdesk-admin-desktop' ),
			),
			'widgets'      => array(
				'title'             => __( 'Widgets', 'pufferdesk-admin-desktop' ),
				'description'       => __( 'Choose which desktop widgets are visible.', 'pufferdesk-admin-desktop' ),
				'emptyLabel'        => __( 'No widgets are registered for this account.', 'pufferdesk-admin-desktop' ),
				'showOnDesktopLabel' => __( 'Show on desktop', 'pufferdesk-admin-desktop' ),
			),
			'apps'         => array(
				'title'               => __( 'Apps', 'pufferdesk-admin-desktop' ),
				'description'         => __( 'Choose where apps appear and which apps open when PufferDesk starts.', 'pufferdesk-admin-desktop' ),
				'emptyLabel'          => __( 'No apps are available for this account.', 'pufferdesk-admin-desktop' ),
				'fixedPlacementLabel' => __( 'Fixed', 'pufferdesk-admin-desktop' ),
				'openAtLoginLabel'    => __( 'Open at login', 'pufferdesk-admin-desktop' ),
			),
			'workspace'    => array(
				'title'                   => __( 'Workspace', 'pufferdesk-admin-desktop' ),
				'cancelLabel'             => __( 'Cancel', 'pufferdesk-admin-desktop' ),
				'resettingLabel'          => __( 'Resetting...', 'pufferdesk-admin-desktop' ),
				'resetError'              => __( 'Workspace layout could not be reset.', 'pufferdesk-admin-desktop' ),
				'resetCurrentButton'      => __( 'Reset Current Theme Layout', 'pufferdesk-admin-desktop' ),
				'resetCurrentConfirmLabel' => __( 'Reset', 'pufferdesk-admin-desktop' ),
				'resetCurrentDescription' => __( 'Reset windows, widgets, desktop icons, and launcher order for the active theme.', 'pufferdesk-admin-desktop' ),
				'resetCurrentLabel'       => __( 'Current theme layout', 'pufferdesk-admin-desktop' ),
				'resetCurrentMessage'     => __( 'This resets the saved windows, widgets, desktop icons, and launcher order for the current theme.', 'pufferdesk-admin-desktop' ),
				'resetCurrentTitle'       => __( 'Reset Current Theme Layout?', 'pufferdesk-admin-desktop' ),
				'resetAllButton'          => __( 'Reset Layouts for All Themes', 'pufferdesk-admin-desktop' ),
				'resetAllConfirmLabel'    => __( 'Reset All', 'pufferdesk-admin-desktop' ),
				'resetAllDescription'     => __( 'Clear saved workspace layouts across every theme for this WordPress account.', 'pufferdesk-admin-desktop' ),
				'resetAllLabel'           => __( 'All theme layouts', 'pufferdesk-admin-desktop' ),
				'resetAllMessage'         => __( 'This resets saved workspace layouts for every PufferDesk theme for this WordPress account.', 'pufferdesk-admin-desktop' ),
				'resetAllTitle'           => __( 'Reset Layouts for All Themes?', 'pufferdesk-admin-desktop' ),
			),
			'system'       => array(
				'title'              => __( 'System', 'pufferdesk-admin-desktop' ),
				'restartLabel'       => __( 'Restart PufferDesk...', 'pufferdesk-admin-desktop' ),
				'restartDescription' => __( 'Reload PufferDesk and start a fresh shell session.', 'pufferdesk-admin-desktop' ),
				'classicLabel'       => __( 'Switch to Classic Admin...', 'pufferdesk-admin-desktop' ),
				'classicDescription' => __( 'Leave the shell and open the standard WordPress admin.', 'pufferdesk-admin-desktop' ),
				'eraseLabel'         => __( 'Erase All Content and Settings...', 'pufferdesk-admin-desktop' ),
				'eraseDescription'   => __( 'Reset PufferDesk preferences, wallpaper, apps, windows, widgets, and layout for this account.', 'pufferdesk-admin-desktop' ),
			),
		);

		$theme_settings = isset( $theme['settings'] ) && is_array( $theme['settings'] ) ? $theme['settings'] : array();
		$theme_labels   = isset( $theme_settings['labels'] ) && is_array( $theme_settings['labels'] ) ? $theme_settings['labels'] : array();

		return $this->merge_settings_labels( $labels, $theme_labels );
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
	 * General settings groups for WordPress-backed destinations.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	private function get_general_settings_groups() {
		return array_values(
			array_filter(
				array(
					array(
						'id'    => 'system',
						'items' => $this->filter_settings_rows(
							array(
								array(
									'id'          => 'about',
									'label'       => __( 'About', 'pufferdesk-admin-desktop' ),
									'description' => __( 'Site and WordPress environment details', 'pufferdesk-admin-desktop' ),
									'icon'        => 'dashicons-info-outline',
									'tone'        => 'gray',
									'panel'       => 'general-about',
								),
								array(
									'id'     => 'software-update',
									'label'  => __( 'Software Update', 'pufferdesk-admin-desktop' ),
									'icon'   => 'dashicons-update',
									'tone'   => 'gray',
									'url'    => admin_url( 'update-core.php' ),
									'title'  => __( 'WordPress Updates', 'pufferdesk-admin-desktop' ),
									'capany' => array( 'update_core', 'update_plugins', 'update_themes' ),
								),
								array(
									'id'    => 'site-health',
									'label' => __( 'Site Health', 'pufferdesk-admin-desktop' ),
									'icon'  => 'dashicons-heart',
									'tone'  => 'gray',
									'url'   => admin_url( 'site-health.php' ),
									'title' => __( 'Site Health', 'pufferdesk-admin-desktop' ),
									'cap'   => 'view_site_health_checks',
								),
							)
						),
					),
					array(
						'id'    => 'site',
						'items' => $this->filter_settings_rows(
							array(
								array(
									'id'    => 'date-time',
									'label' => __( 'Date & Time', 'pufferdesk-admin-desktop' ),
									'icon'  => 'dashicons-calendar-alt',
									'tone'  => 'blue',
									'url'   => admin_url( 'options-general.php#timezone_string' ),
									'title' => __( 'Date & Time', 'pufferdesk-admin-desktop' ),
									'cap'   => 'manage_options',
								),
								array(
									'id'    => 'language-region',
									'label' => __( 'Language & Region', 'pufferdesk-admin-desktop' ),
									'icon'  => 'dashicons-translation',
									'tone'  => 'blue',
									'url'   => admin_url( 'options-general.php#WPLANG' ),
									'title' => __( 'Language & Region', 'pufferdesk-admin-desktop' ),
									'cap'   => 'manage_options',
								),
								array(
									'id'    => 'permalinks',
									'label' => __( 'Permalinks', 'pufferdesk-admin-desktop' ),
									'icon'  => 'dashicons-admin-links',
									'tone'  => 'gray',
									'url'   => admin_url( 'options-permalink.php' ),
									'title' => __( 'Permalinks', 'pufferdesk-admin-desktop' ),
									'cap'   => 'manage_options',
								),
								array(
									'id'    => 'privacy',
									'label' => __( 'Privacy', 'pufferdesk-admin-desktop' ),
									'icon'  => 'dashicons-privacy',
									'tone'  => 'gray',
									'url'   => admin_url( 'options-privacy.php' ),
									'title' => __( 'Privacy', 'pufferdesk-admin-desktop' ),
									'cap'   => 'manage_privacy_options',
								),
								array(
									'id'    => 'import-export',
									'label' => __( 'Import & Export', 'pufferdesk-admin-desktop' ),
									'icon'  => 'dashicons-migrate',
									'tone'  => 'gray',
									'url'   => admin_url( 'import.php' ),
									'title' => __( 'Import & Export', 'pufferdesk-admin-desktop' ),
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
									'label'       => __( 'Erase All Content and Settings...', 'pufferdesk-admin-desktop' ),
									'description' => __( 'Reset PufferDesk preferences and layout for this account', 'pufferdesk-admin-desktop' ),
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
	 * @return array<string,mixed>
	 */
	private function get_system_config( $theme = array() ) {
		$current_user = wp_get_current_user();
		$user_label   = $current_user->display_name ? $current_user->display_name : $current_user->user_login;
		$shell_labels = $this->get_theme_shell_labels( $theme );

		return array(
			'actions' => array(
				'restart'       => array(
					'title'                => __( 'Are you sure you want to restart PufferDesk?', 'pufferdesk-admin-desktop' ),
					/* translators: {seconds}: seconds remaining before PufferDesk restarts automatically. */
					'message'              => __( 'If you do nothing, PufferDesk will restart automatically in {seconds} seconds.', 'pufferdesk-admin-desktop' ),
					'confirmLabel'         => __( 'Restart', 'pufferdesk-admin-desktop' ),
					'cancelLabel'          => __( 'Cancel', 'pufferdesk-admin-desktop' ),
					'reopenWindowsLabel'   => __( 'Reopen windows after restarting', 'pufferdesk-admin-desktop' ),
					'reopenWindowsDefault' => false,
					'countdownSeconds'     => 60,
					'icon'                 => 'power',
					'overlayMessage'       => __( 'Restarting PufferDesk...', 'pufferdesk-admin-desktop' ),
				),
				'switchClassic' => array(
					'title'                => __( 'Are you sure you want to switch to Classic Admin?', 'pufferdesk-admin-desktop' ),
					/* translators: {seconds}: seconds remaining before Classic Admin opens automatically. */
					'message'              => __( 'If you do nothing, Classic Admin will open automatically in {seconds} seconds.', 'pufferdesk-admin-desktop' ),
					'confirmLabel'         => __( 'Switch', 'pufferdesk-admin-desktop' ),
					'cancelLabel'          => __( 'Cancel', 'pufferdesk-admin-desktop' ),
					'reopenWindowsLabel'   => __( 'Reopen windows when returning to PufferDesk', 'pufferdesk-admin-desktop' ),
					'reopenWindowsDefault' => false,
					'countdownSeconds'     => 60,
					'icon'                 => 'dashicons-admin-site-alt3',
					'overlayMessage'       => __( 'Switching to Classic Admin...', 'pufferdesk-admin-desktop' ),
				),
				'logout'        => array(
					'title'                => sprintf(
						/* translators: %s: current user display name. */
						__( 'Are you sure you want to log out %s?', 'pufferdesk-admin-desktop' ),
						$user_label
					),
					/* translators: {seconds}: seconds remaining before the user is logged out automatically. */
					'message'              => __( 'If you do nothing, you will be logged out automatically in {seconds} seconds.', 'pufferdesk-admin-desktop' ),
					'confirmLabel'         => __( 'Log Out', 'pufferdesk-admin-desktop' ),
					'cancelLabel'          => __( 'Cancel', 'pufferdesk-admin-desktop' ),
					'reopenWindowsLabel'   => __( 'Reopen windows when logging back in', 'pufferdesk-admin-desktop' ),
					'reopenWindowsDefault' => false,
					'countdownSeconds'     => 60,
					'icon'                 => 'power',
					'overlayMessage'       => __( 'Logging out...', 'pufferdesk-admin-desktop' ),
				),
				'lock'          => array(
					'title'                => __( 'Lock PufferDesk?', 'pufferdesk-admin-desktop' ),
					'message'              => __( 'You will be signed out and returned to the WordPress login screen.', 'pufferdesk-admin-desktop' ),
					'confirmLabel'         => __( 'Lock', 'pufferdesk-admin-desktop' ),
					'cancelLabel'          => __( 'Cancel', 'pufferdesk-admin-desktop' ),
					'reopenWindowsLabel'   => __( 'Reopen windows when signing back in', 'pufferdesk-admin-desktop' ),
					'reopenWindowsDefault' => false,
					'countdownSeconds'     => 60,
					'icon'                 => 'power',
					'overlayMessage'       => __( 'Locking PufferDesk...', 'pufferdesk-admin-desktop' ),
				),
				'sleep'         => array(
					'title'                => __( 'Sleep PufferDesk?', 'pufferdesk-admin-desktop' ),
					'message'              => __( 'PufferDesk will close and Classic Admin will open.', 'pufferdesk-admin-desktop' ),
					'confirmLabel'         => __( 'Sleep', 'pufferdesk-admin-desktop' ),
					'cancelLabel'          => __( 'Cancel', 'pufferdesk-admin-desktop' ),
					'reopenWindowsLabel'   => __( 'Reopen windows when returning to PufferDesk', 'pufferdesk-admin-desktop' ),
					'reopenWindowsDefault' => false,
					'countdownSeconds'     => 60,
					'icon'                 => 'power',
					'overlayMessage'       => __( 'Putting PufferDesk to sleep...', 'pufferdesk-admin-desktop' ),
				),
				'shutdown'      => array(
					'title'                => __( 'Shut down PufferDesk?', 'pufferdesk-admin-desktop' ),
					'message'              => __( 'PufferDesk will close and Classic Admin will open.', 'pufferdesk-admin-desktop' ),
					'confirmLabel'         => __( 'Shut down', 'pufferdesk-admin-desktop' ),
					'cancelLabel'          => __( 'Cancel', 'pufferdesk-admin-desktop' ),
					'reopenWindowsLabel'   => __( 'Reopen windows when returning to PufferDesk', 'pufferdesk-admin-desktop' ),
					'reopenWindowsDefault' => false,
					'countdownSeconds'     => 60,
					'icon'                 => 'power',
					'overlayMessage'       => __( 'Shutting down PufferDesk...', 'pufferdesk-admin-desktop' ),
				),
				'eraseContentSettings' => array(
					'title'          => __( 'Erase All Content and Settings?', 'pufferdesk-admin-desktop' ),
					'message'        => sprintf(
						/* translators: %s: theme-specific launcher label, such as Dock or Taskbar. */
						__( 'This will reset PufferDesk settings, wallpaper, %s, windows, and layout for this WordPress account. WordPress site content will not be affected.', 'pufferdesk-admin-desktop' ),
						$shell_labels['launcher']
					),
					'confirmLabel'   => __( 'Erase', 'pufferdesk-admin-desktop' ),
					'cancelLabel'    => __( 'Cancel', 'pufferdesk-admin-desktop' ),
					'overlayMessage' => __( 'Erasing PufferDesk settings...', 'pufferdesk-admin-desktop' ),
				),
				'emptyTrash' => array(
					'title'        => $this->get_theme_menu_label( $theme, 'empty_trash_title', __( 'Empty Trash?', 'pufferdesk-admin-desktop' ) ),
					'message'      => __( 'This permanently deletes all trashed PufferDesk folder records, including folder contents. Apps and plugins are not deleted.', 'pufferdesk-admin-desktop' ),
					'confirmLabel' => $this->get_theme_menu_label( $theme, 'empty_trash', __( 'Empty Trash', 'pufferdesk-admin-desktop' ) ),
					'cancelLabel'  => __( 'Cancel', 'pufferdesk-admin-desktop' ),
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

		$config = array(
			'system'     => array(
				'groups' => array(
					array(
						'id'    => 'system',
						'label' => PufferDesk_Product_Labels::name(),
						'items' => array(
							array(
								'label'   => __( 'About This Site', 'pufferdesk-admin-desktop' ),
								'command' => PufferDesk_Command_Ids::OPEN_SITE_ABOUT,
								'icon'    => 'dashicons-info-outline',
							),
							array(
								'label'   => __( 'System Settings...', 'pufferdesk-admin-desktop' ),
								'command' => PufferDesk_Command_Ids::OPEN_APP,
								'target'  => PufferDesk_App_Ids::OS_SETTINGS,
								'icon'    => 'dashicons-admin-customizer',
							),
							array(
								'label'   => __( 'WordPress Updates...', 'pufferdesk-admin-desktop' ),
								'command' => PufferDesk_Command_Ids::OPEN_URL,
								'url'     => admin_url( 'update-core.php' ),
								'title'   => __( 'WordPress Updates', 'pufferdesk-admin-desktop' ),
								'icon'    => 'dashicons-update',
							),
							array(
								'type' => 'separator',
							),
							array(
								'id'       => 'recent-items',
								'label'    => __( 'Recent Items', 'pufferdesk-admin-desktop' ),
								'disabled' => true,
								'icon'     => 'dashicons-backup',
								'shortcut' => '>',
							),
							array(
								'type' => 'separator',
							),
							array(
								'id'       => 'close-active-window',
								'label'    => __( 'Close Active App', 'pufferdesk-admin-desktop' ),
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
								'label'   => __( 'Restart PufferDesk...', 'pufferdesk-admin-desktop' ),
								'command' => PufferDesk_Command_Ids::SHELL_RESTART,
								'icon'    => 'dashicons-update',
							),
							array(
								'label'   => __( 'Switch to Classic Admin...', 'pufferdesk-admin-desktop' ),
								'command' => PufferDesk_Command_Ids::SHELL_SWITCH_CLASSIC,
								'url'     => $this->router->get_toggle_url( false ),
								'icon'    => 'dashicons-admin-site-alt3',
							),
							array(
								'type' => 'separator',
							),
							array(
								'label'   => sprintf(
									/* translators: %s: current user display name. */
									__( 'Log Out %s...', 'pufferdesk-admin-desktop' ),
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
								'label'   => __( 'Dashboard', 'pufferdesk-admin-desktop' ),
								'command' => PufferDesk_Command_Ids::OPEN_APP,
								'target'  => PufferDesk_App_Ids::DASHBOARD,
							),
							array(
								'label'   => __( 'Visit Site', 'pufferdesk-admin-desktop' ),
								'command' => PufferDesk_Command_Ids::OPEN_EXTERNAL_URL,
								'url'     => home_url( '/' ),
							),
						),
					),
				),
			),
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
				'admin'                   => __( 'Admin', 'pufferdesk-admin-desktop' ),
				'app'                     => __( 'App', 'pufferdesk-admin-desktop' ),
				'apps'                    => __( 'Apps', 'pufferdesk-admin-desktop' ),
				'desktop'                 => __( 'Desktop', 'pufferdesk-admin-desktop' ),
				'desktop_folders'         => $template_labels['desktop_folders'],
				'folder'                  => __( 'Folder', 'pufferdesk-admin-desktop' ),
				'folders'                 => __( 'Folders', 'pufferdesk-admin-desktop' ),
				'folder_empty'            => __( 'This folder is empty.', 'pufferdesk-admin-desktop' ),
				'folder_suffix'           => __( 'Folder', 'pufferdesk-admin-desktop' ),
				'untitled_folder'         => PufferDesk_User_Preferences::get_default_folder_label(),
				'untitled_item'           => __( 'Untitled', 'pufferdesk-admin-desktop' ),
				'new'                     => __( 'New', 'pufferdesk-admin-desktop' ),
				'new_folder'              => __( 'New Folder', 'pufferdesk-admin-desktop' ),
				'new_note'                => __( 'New Note', 'pufferdesk-admin-desktop' ),
				'group'                   => __( 'Group', 'pufferdesk-admin-desktop' ),
				'more'                    => __( 'More', 'pufferdesk-admin-desktop' ),
				'share'                   => __( 'Share', 'pufferdesk-admin-desktop' ),
				'sort'                    => __( 'Sort', 'pufferdesk-admin-desktop' ),
				'new_sticky_note'         => __( 'New Sticky Note', 'pufferdesk-admin-desktop' ),
				'get_info'                => __( 'Get Info', 'pufferdesk-admin-desktop' ),
				'cancel'                  => __( 'Cancel', 'pufferdesk-admin-desktop' ),
				'open'                    => __( 'Open', 'pufferdesk-admin-desktop' ),
				'open_with'               => __( 'Open With', 'pufferdesk-admin-desktop' ),
				'show'                    => __( 'Show', 'pufferdesk-admin-desktop' ),
				'quit'                    => __( 'Quit', 'pufferdesk-admin-desktop' ),
				'about'                   => __( 'About', 'pufferdesk-admin-desktop' ),
				'open_in_browser_tab'     => __( 'Open in Browser Tab', 'pufferdesk-admin-desktop' ),
				'open_in_new_tab'         => __( 'Open in New Tab', 'pufferdesk-admin-desktop' ),
				'open_in_new_window'      => __( 'Open in New Window', 'pufferdesk-admin-desktop' ),
				'address'                 => __( 'Address', 'pufferdesk-admin-desktop' ),
				'pin_to_quick_access'     => __( 'Pin to Quick Access', 'pufferdesk-admin-desktop' ),
				'pin_to_start'            => __( 'Pin to Start', 'pufferdesk-admin-desktop' ),
				'properties'              => __( 'Properties', 'pufferdesk-admin-desktop' ),
				'compress_to'             => __( 'Compress to...', 'pufferdesk-admin-desktop' ),
				'zip_file'                => __( 'ZIP file', 'pufferdesk-admin-desktop' ),
				'compressed_folder'       => __( 'Compressed folder', 'pufferdesk-admin-desktop' ),
				'copy_as_path'            => __( 'Copy as path', 'pufferdesk-admin-desktop' ),
				'open_in_terminal'        => __( 'Open in Terminal', 'pufferdesk-admin-desktop' ),
				'show_more_options'       => __( 'Show more options', 'pufferdesk-admin-desktop' ),
				'enter_key'               => __( 'Enter', 'pufferdesk-admin-desktop' ),
				'new_tab'                 => __( 'New Tab', 'pufferdesk-admin-desktop' ),
				'close_tab'               => __( 'Close Tab', 'pufferdesk-admin-desktop' ),
				'close_other_tabs'        => __( 'Close Other Tabs', 'pufferdesk-admin-desktop' ),
				'move_tab_to_new_window'  => __( 'Move Tab to New Window', 'pufferdesk-admin-desktop' ),
				'folder_tabs'             => __( 'Folder Tabs', 'pufferdesk-admin-desktop' ),
				'add_to_folder'           => __( 'Add to Folder', 'pufferdesk-admin-desktop' ),
				'move_to_folder'          => __( 'Move to Folder', 'pufferdesk-admin-desktop' ),
				'remove_from_folder'      => __( 'Remove from Folder', 'pufferdesk-admin-desktop' ),
				'toolbar'                 => __( 'Toolbar', 'pufferdesk-admin-desktop' ),
				'icons_and_text'          => __( 'Icons and Text', 'pufferdesk-admin-desktop' ),
				'icons_only'              => __( 'Icons Only', 'pufferdesk-admin-desktop' ),
				'text_only'               => __( 'Text Only', 'pufferdesk-admin-desktop' ),
				'show_toolbar'            => __( 'Show Toolbar', 'pufferdesk-admin-desktop' ),
				'hide_toolbar'            => __( 'Hide Toolbar', 'pufferdesk-admin-desktop' ),
				'folder_command_bar'      => __( 'Folder Command Bar', 'pufferdesk-admin-desktop' ),
				'folder_toolbar'          => __( 'Folder Toolbar', 'pufferdesk-admin-desktop' ),
				'back_forward'            => __( 'Back/Forward', 'pufferdesk-admin-desktop' ),
				'close_window'            => __( 'Close Window', 'pufferdesk-admin-desktop' ),
				'system_settings'         => __( 'System Settings...', 'pufferdesk-admin-desktop' ),
				'start_search_label'      => __( 'Search apps, settings, and commands', 'pufferdesk-admin-desktop' ),
				'start_search_placeholder' => __( 'Search', 'pufferdesk-admin-desktop' ),
				'search_no_results'       => __( 'No results found', 'pufferdesk-admin-desktop' ),
				'search_group_app'        => __( 'Apps', 'pufferdesk-admin-desktop' ),
				'search_group_folder'     => __( 'Folders', 'pufferdesk-admin-desktop' ),
				'search_group_document'   => __( 'Documents', 'pufferdesk-admin-desktop' ),
				'search_group_wp_post'    => __( 'Posts', 'pufferdesk-admin-desktop' ),
				'search_group_wp_page'    => __( 'Pages', 'pufferdesk-admin-desktop' ),
				'search_group_wp_attachment' => __( 'Media', 'pufferdesk-admin-desktop' ),
				'search_group_setting'    => __( 'Settings', 'pufferdesk-admin-desktop' ),
				'search_group_command'    => __( 'Commands', 'pufferdesk-admin-desktop' ),
				'search_type_app'         => __( 'App', 'pufferdesk-admin-desktop' ),
				'search_type_folder'      => __( 'Folder', 'pufferdesk-admin-desktop' ),
				'search_type_document'    => __( 'Document', 'pufferdesk-admin-desktop' ),
				'search_type_wp_post'     => __( 'Post', 'pufferdesk-admin-desktop' ),
				'search_type_wp_page'     => __( 'Page', 'pufferdesk-admin-desktop' ),
				'search_type_wp_attachment' => __( 'Media', 'pufferdesk-admin-desktop' ),
				'search_type_setting'     => __( 'Setting', 'pufferdesk-admin-desktop' ),
				'search_type_command'     => __( 'Command', 'pufferdesk-admin-desktop' ),
				'start_pinned'            => __( 'Pinned', 'pufferdesk-admin-desktop' ),
				'start_recommended'       => __( 'Recommended', 'pufferdesk-admin-desktop' ),
				'start_no_recent_items'   => __( 'No recent items yet', 'pufferdesk-admin-desktop' ),
				'start_power'             => __( 'Power and session', 'pufferdesk-admin-desktop' ),
				'start_account'           => __( 'Account', 'pufferdesk-admin-desktop' ),
				'start_manage_account'    => __( 'Manage account', 'pufferdesk-admin-desktop' ),
				'start_sign_out'          => __( 'Sign out', 'pufferdesk-admin-desktop' ),
				'start_power_menu'        => __( 'Power options', 'pufferdesk-admin-desktop' ),
				'start_lock'              => __( 'Lock', 'pufferdesk-admin-desktop' ),
				'start_sleep'             => __( 'Sleep', 'pufferdesk-admin-desktop' ),
				'start_shutdown'          => __( 'Shut down', 'pufferdesk-admin-desktop' ),
				'start_restart'           => __( 'Restart', 'pufferdesk-admin-desktop' ),
				'undo'                    => __( 'Undo', 'pufferdesk-admin-desktop' ),
				'redo'                    => __( 'Redo', 'pufferdesk-admin-desktop' ),
				'cut'                     => __( 'Cut', 'pufferdesk-admin-desktop' ),
				'copy'                    => __( 'Copy', 'pufferdesk-admin-desktop' ),
				'copy_name_format'        => PufferDesk_Document_Service::get_default_label( 'copyNameFormat' ),
				'paste'                   => __( 'Paste', 'pufferdesk-admin-desktop' ),
				'save'                    => __( 'Save', 'pufferdesk-admin-desktop' ),
				'select_all'              => __( 'Select All', 'pufferdesk-admin-desktop' ),
				'sort_by'                 => __( 'Sort By', 'pufferdesk-admin-desktop' ),
				'sort_by_sentence'        => __( 'Sort by', 'pufferdesk-admin-desktop' ),
				'sort_name'               => __( 'Name', 'pufferdesk-admin-desktop' ),
				'sort_kind'               => __( 'Kind', 'pufferdesk-admin-desktop' ),
				'sort_snap_to_grid'       => __( 'Snap to Grid', 'pufferdesk-admin-desktop' ),
				'sort_last_modified_by'   => __( 'Last Modified By', 'pufferdesk-admin-desktop' ),
				'sort_date_last_opened'   => __( 'Date Last Opened', 'pufferdesk-admin-desktop' ),
				'sort_date_added'         => __( 'Date Added', 'pufferdesk-admin-desktop' ),
				'sort_date_modified'      => __( 'Date Modified', 'pufferdesk-admin-desktop' ),
				'sort_date_created'       => __( 'Date Created', 'pufferdesk-admin-desktop' ),
				'sort_size'               => __( 'Size', 'pufferdesk-admin-desktop' ),
					'sort_none'               => __( 'None', 'pufferdesk-admin-desktop' ),
					'type'                    => __( 'Type', 'pufferdesk-admin-desktop' ),
					'zero_bytes'              => __( 'Zero bytes', 'pufferdesk-admin-desktop' ),
					'bytes_unit'              => __( 'bytes', 'pufferdesk-admin-desktop' ),
					'kb_unit'                 => __( 'KB', 'pufferdesk-admin-desktop' ),
					'mb_unit'                 => __( 'MB', 'pufferdesk-admin-desktop' ),
					'gb_unit'                 => __( 'GB', 'pufferdesk-admin-desktop' ),
					/* translators: %s: time. */
					'today_at_time'           => __( 'Today at %s', 'pufferdesk-admin-desktop' ),
					/* translators: %s: time. */
					'yesterday_at_time'       => __( 'Yesterday at %s', 'pufferdesk-admin-desktop' ),
					/* translators: 1: date, 2: time. */
					'date_at_time'            => __( '%1$s at %2$s', 'pufferdesk-admin-desktop' ),
					'use_groups'              => __( 'Use Groups', 'pufferdesk-admin-desktop' ),
					'group_today'             => __( 'Today', 'pufferdesk-admin-desktop' ),
					'group_yesterday'         => __( 'Yesterday', 'pufferdesk-admin-desktop' ),
					'group_previous_7_days'   => __( 'Previous 7 Days', 'pufferdesk-admin-desktop' ),
					'group_previous_30_days'  => __( 'Previous 30 Days', 'pufferdesk-admin-desktop' ),
					'group_older'             => __( 'Older', 'pufferdesk-admin-desktop' ),
					'group_no_date'           => __( 'No Date', 'pufferdesk-admin-desktop' ),
					'group_numbers'           => __( '0-9', 'pufferdesk-admin-desktop' ),
					'group_other'             => __( 'Other', 'pufferdesk-admin-desktop' ),
					'group_size_small'        => __( 'Small', 'pufferdesk-admin-desktop' ),
					'group_size_medium'       => __( 'Medium', 'pufferdesk-admin-desktop' ),
					'group_size_large'        => __( 'Large', 'pufferdesk-admin-desktop' ),
					'group_size_huge'         => __( 'Huge', 'pufferdesk-admin-desktop' ),
					'show_view_options'       => __( 'Show View Options', 'pufferdesk-admin-desktop' ),
				'extra_large_icons'       => __( 'Extra large icons', 'pufferdesk-admin-desktop' ),
				'large_icons'             => __( 'Large icons', 'pufferdesk-admin-desktop' ),
				'medium_icons'            => __( 'Medium icons', 'pufferdesk-admin-desktop' ),
				'small_icons'             => __( 'Small icons', 'pufferdesk-admin-desktop' ),
				'list_view'               => __( 'List view', 'pufferdesk-admin-desktop' ),
				'list_view_short'         => __( 'List', 'pufferdesk-admin-desktop' ),
				'details_view'            => __( 'Details view', 'pufferdesk-admin-desktop' ),
				'details_view_short'      => __( 'Details', 'pufferdesk-admin-desktop' ),
				'tiles_view'              => __( 'Tiles', 'pufferdesk-admin-desktop' ),
				'content_view'            => __( 'Content', 'pufferdesk-admin-desktop' ),
				'as_icons'                => __( 'as Icons', 'pufferdesk-admin-desktop' ),
				'as_list'                 => __( 'as List', 'pufferdesk-admin-desktop' ),
				'details_pane'            => __( 'Details pane', 'pufferdesk-admin-desktop' ),
				'preview_pane'            => __( 'Preview pane', 'pufferdesk-admin-desktop' ),
				'preview'                 => __( 'Preview', 'pufferdesk-admin-desktop' ),
				'show'                    => __( 'Show', 'pufferdesk-admin-desktop' ),
				'reset_layout'            => __( 'Reset Layout', 'pufferdesk-admin-desktop' ),
				'refresh'                 => __( 'Refresh', 'pufferdesk-admin-desktop' ),
				'change_wallpaper'        => __( 'Change Wallpaper...', 'pufferdesk-admin-desktop' ),
				'explore_background'      => __( 'Explore background', 'pufferdesk-admin-desktop' ),
				'next_background'         => __( 'Next background', 'pufferdesk-admin-desktop' ),
				'display_settings'        => __( 'Display settings', 'pufferdesk-admin-desktop' ),
				'personalize'             => __( 'Personalize', 'pufferdesk-admin-desktop' ),
				'back'                    => __( 'Back', 'pufferdesk-admin-desktop' ),
				'forward'                 => __( 'Forward', 'pufferdesk-admin-desktop' ),
				'up'                      => __( 'Up', 'pufferdesk-admin-desktop' ),
				'recents'                 => __( 'Recents', 'pufferdesk-admin-desktop' ),
				'favorites'               => __( 'Favorites', 'pufferdesk-admin-desktop' ),
				'locations'               => __( 'Locations', 'pufferdesk-admin-desktop' ),
				'navigation_pane'         => __( 'Navigation pane', 'pufferdesk-admin-desktop' ),
				'remove_from_sidebar'     => __( 'Remove from Sidebar', 'pufferdesk-admin-desktop' ),
				'home'                    => __( 'Home', 'pufferdesk-admin-desktop' ),
				'gallery'                 => __( 'Gallery', 'pufferdesk-admin-desktop' ),
				'this_pc'                 => __( 'This PC', 'pufferdesk-admin-desktop' ),
				'network'                 => __( 'Network', 'pufferdesk-admin-desktop' ),
				'recent_item'             => __( 'Recent Item', 'pufferdesk-admin-desktop' ),
				'application'             => __( 'Application', 'pufferdesk-admin-desktop' ),
				'document'                => __( 'Document', 'pufferdesk-admin-desktop' ),
				'sticky_note'             => PufferDesk_Document_Service::get_default_label( 'stickyNote' ),
				'item_singular'           => __( 'item', 'pufferdesk-admin-desktop' ),
				'item_plural'             => __( 'items', 'pufferdesk-admin-desktop' ),
				'reload'                  => __( 'Reload', 'pufferdesk-admin-desktop' ),
				'reload_page'             => __( 'Reload Page', 'pufferdesk-admin-desktop' ),
				'zoom'                    => __( 'Zoom', 'pufferdesk-admin-desktop' ),
				'view'                    => __( 'View', 'pufferdesk-admin-desktop' ),
				'quick_actions'           => __( 'Quick Actions', 'pufferdesk-admin-desktop' ),
				'extensions'              => __( 'Extensions', 'pufferdesk-admin-desktop' ),
				'clear_menu'              => __( 'Clear Menu', 'pufferdesk-admin-desktop' ),
				'recent_group_system'     => __( 'System', 'pufferdesk-admin-desktop' ),
				'recent_group_wordpress'  => __( 'WordPress', 'pufferdesk-admin-desktop' ),
				'recent_group_plugins'    => __( 'Plugins', 'pufferdesk-admin-desktop' ),
				'recent_group_documents'  => __( 'Documents', 'pufferdesk-admin-desktop' ),
				/* translators: %s: active window or app title. */
				'close_item_format'       => __( 'Close %s', 'pufferdesk-admin-desktop' ),
				'app_badge_aria_label_format' => PufferDesk_App_Badge_Normalizer::get_aria_label_format(),
				/* translators: 1: action label, 2: target label. */
				'combined_label_format'   => self::get_combined_label_format(),
				/* translators: 1: action label, 2: target label. */
				'label_colon_format'      => __( '%1$s: %2$s', 'pufferdesk-admin-desktop' ),
				'item_count_format'       => self::get_item_count_format(),
				/* translators: %s: window title. */
				'window_title_format'     => self::get_window_title_format(),
				/* translators: %s: window title. */
				'window_restore_format'   => __( 'Restore %s', 'pufferdesk-admin-desktop' ),
				/* translators: 1: theme family label, 2: theme version label. */
				'theme_version_format'    => __( '%1$s · %2$s', 'pufferdesk-admin-desktop' ),
				'bring_to_front'          => __( 'Bring to Front', 'pufferdesk-admin-desktop' ),
				'show_all'                => __( 'Show All', 'pufferdesk-admin-desktop' ),
				'show_all_windows'        => __( 'Show All', 'pufferdesk-admin-desktop' ),
				'hide'                    => __( 'Hide', 'pufferdesk-admin-desktop' ),
				'hide_others'             => __( 'Hide Others', 'pufferdesk-admin-desktop' ),
				'remove_widget'           => __( 'Remove Widget', 'pufferdesk-admin-desktop' ),
				'edit_widgets'            => __( 'Edit Widgets...', 'pufferdesk-admin-desktop' ),
				'desktop_apps'            => $template_labels['desktop_apps'],
				'rename'                  => __( 'Rename', 'pufferdesk-admin-desktop' ),
				'action'                  => __( 'Action', 'pufferdesk-admin-desktop' ),
				'context_menu'            => __( 'Context Menu', 'pufferdesk-admin-desktop' ),
				'trash'                   => __( 'Trash', 'pufferdesk-admin-desktop' ),
				/* translators: %d: number of items in the trash. */
				'trash_item_count'        => __( 'Trash, %d item', 'pufferdesk-admin-desktop' ),
				/* translators: %d: number of items in the trash. */
				'trash_item_count_plural' => __( 'Trash, %d items', 'pufferdesk-admin-desktop' ),
				'pufferdesk_desktop'      => $template_labels['pufferdesk_desktop'],
				'pufferdesk_trash_source' => __( 'PufferDesk Trash', 'pufferdesk-admin-desktop' ),
				'pufferdesk_user_folder_source' => __( 'PufferDesk user folder', 'pufferdesk-admin-desktop' ),
				'pufferdesk_virtual_filesystem_source' => __( 'PufferDesk virtual filesystem', 'pufferdesk-admin-desktop' ),
				'wordpress_admin_group_source' => __( 'WordPress admin group', 'pufferdesk-admin-desktop' ),
				/* translators: %s: WordPress admin menu group label. */
				'wordpress_admin_menu_format' => __( 'WordPress Admin Menu > %s', 'pufferdesk-admin-desktop' ),
				'empty'                   => __( 'Empty', 'pufferdesk-admin-desktop' ),
				'move_to_trash'           => __( 'Move to Trash', 'pufferdesk-admin-desktop' ),
				'move_folder_to_trash_message' => __( 'This PufferDesk folder and its contents will be moved. Apps and plugins inside it stay installed and available.', 'pufferdesk-admin-desktop' ),
				'move_folder_to_trash_confirmation' => __( 'Are you sure you want to move this folder to Trash?', 'pufferdesk-admin-desktop' ),
				'move_folder_to_trash_confirm_label' => __( 'Move to Trash', 'pufferdesk-admin-desktop' ),
				'move_folder_to_trash_cancel_label' => __( 'Cancel', 'pufferdesk-admin-desktop' ),
				'move_folder_to_trash_window_title' => __( 'Move Folder', 'pufferdesk-admin-desktop' ),
				/* translators: %s: folder label. */
				'move_folder_to_trash_title_format' => __( 'Move "%s" to Trash?', 'pufferdesk-admin-desktop' ),
				/* translators: %d: number of selected folders. */
				'selected_folder_count_format' => __( '%d folders', 'pufferdesk-admin-desktop' ),
				'move_folders_to_trash_message' => __( 'These PufferDesk folders and their contents will be moved. Apps and plugins inside them stay installed and available.', 'pufferdesk-admin-desktop' ),
				'move_folders_to_trash_confirmation' => __( 'Are you sure you want to move these folders to Trash?', 'pufferdesk-admin-desktop' ),
				'move_folders_to_trash_confirm_label' => __( 'Move to Trash', 'pufferdesk-admin-desktop' ),
				'move_folders_to_trash_window_title' => __( 'Move Folders', 'pufferdesk-admin-desktop' ),
				/* translators: %d: number of selected folders. */
				'move_folders_to_trash_title_format' => __( 'Move %d folders to Trash?', 'pufferdesk-admin-desktop' ),
				'put_back'                => __( 'Put Back', 'pufferdesk-admin-desktop' ),
				'empty_trash'             => __( 'Empty Trash', 'pufferdesk-admin-desktop' ),
				'empty_trash_confirmation' => __( 'Empty Trash?', 'pufferdesk-admin-desktop' ),
				'delete'                  => __( 'Delete', 'pufferdesk-admin-desktop' ),
				'delete_immediately'      => __( 'Delete Immediately', 'pufferdesk-admin-desktop' ),
				'delete_immediately_title' => __( 'Delete Immediately?', 'pufferdesk-admin-desktop' ),
				'delete_immediately_message' => __( 'This permanently deletes the selected item. Apps and plugins are not deleted.', 'pufferdesk-admin-desktop' ),
				'delete_immediately_fallback_message' => __( 'Delete this item immediately?', 'pufferdesk-admin-desktop' ),
				'about_this_site'         => __( 'About This Site', 'pufferdesk-admin-desktop' ),
				'about_pufferdesk'        => __( 'About PufferDesk', 'pufferdesk-admin-desktop' ),
				'move_validator_unavailable' => __( 'The move validator is not available.', 'pufferdesk-admin-desktop' ),
				'move_not_applied'       => __( 'The move did not change workspace state.', 'pufferdesk-admin-desktop' ),
				'move_could_not_be_completed' => __( 'The move could not be completed.', 'pufferdesk-admin-desktop' ),
				'move_missing_item'      => __( 'Move requests must include a supported item id and type.', 'pufferdesk-admin-desktop' ),
				'move_unsupported_item_type' => __( 'Only apps, folders, and documents can be moved by the core move service.', 'pufferdesk-admin-desktop' ),
				'move_unknown_item'      => __( 'The moved item does not exist in the current workspace.', 'pufferdesk-admin-desktop' ),
				'move_locked_item'       => __( 'Locked or system items cannot be moved to that container.', 'pufferdesk-admin-desktop' ),
				'move_missing_source_container' => __( 'Move requests must include a source container.', 'pufferdesk-admin-desktop' ),
				'move_missing_target_container' => __( 'Move requests must include a target container.', 'pufferdesk-admin-desktop' ),
				'move_unknown_source_container' => __( 'The source container is not registered.', 'pufferdesk-admin-desktop' ),
				'move_unknown_target_container' => __( 'The target container is not registered.', 'pufferdesk-admin-desktop' ),
				'move_source_locked'     => __( 'The item cannot be moved out of its source container.', 'pufferdesk-admin-desktop' ),
				'move_target_rejected'   => __( 'The target container does not accept this item.', 'pufferdesk-admin-desktop' ),
				'move_system_folder'     => __( 'Only user-created folders can be moved between containers.', 'pufferdesk-admin-desktop' ),
				'move_trash_parent'      => __( 'Trash cannot be used as a folder parent.', 'pufferdesk-admin-desktop' ),
				'move_self_nesting'      => __( 'A folder cannot be moved into itself.', 'pufferdesk-admin-desktop' ),
				'move_descendant_nesting' => __( 'A folder cannot be moved into one of its descendants.', 'pufferdesk-admin-desktop' ),
				'move_app_already_on_desktop' => __( 'The app is already available on the desktop.', 'pufferdesk-admin-desktop' ),
				'move_duplicate_item'    => __( 'The target folder already contains this app.', 'pufferdesk-admin-desktop' ),
				'move_target_not_allowed' => __( 'The item model does not allow this drop target.', 'pufferdesk-admin-desktop' ),
				'keyboard_shortcuts'      => __( 'Keyboard Shortcuts', 'pufferdesk-admin-desktop' ),
				'keyboard_shortcuts_title' => __( 'Keyboard Shortcuts', 'pufferdesk-admin-desktop' ),
				'keyboard_shortcuts_search_placeholder' => __( 'Search shortcuts', 'pufferdesk-admin-desktop' ),
				'keyboard_shortcuts_clear_search' => __( 'Clear search', 'pufferdesk-admin-desktop' ),
				'keyboard_shortcuts_no_results' => __( 'No shortcuts found.', 'pufferdesk-admin-desktop' ),
				'keyboard_shortcuts_global' => __( 'Global', 'pufferdesk-admin-desktop' ),
				'keyboard_shortcuts_desktop' => __( 'Desktop', 'pufferdesk-admin-desktop' ),
				'keyboard_shortcuts_desktop_folders' => __( 'Desktop & Folders', 'pufferdesk-admin-desktop' ),
				'keyboard_shortcuts_windows' => __( 'Windows', 'pufferdesk-admin-desktop' ),
				'keyboard_shortcuts_folders' => __( 'Folders', 'pufferdesk-admin-desktop' ),
				'keyboard_shortcuts_folder_tabs' => __( 'Folder Tabs', 'pufferdesk-admin-desktop' ),
				'keyboard_shortcuts_text_editing' => __( 'Text Editing', 'pufferdesk-admin-desktop' ),
				'keyboard_shortcuts_dialogs' => __( 'Dialogs', 'pufferdesk-admin-desktop' ),
				'keyboard_shortcuts_search' => __( 'Search', 'pufferdesk-admin-desktop' ),
				'keyboard_shortcuts_other' => __( 'Other', 'pufferdesk-admin-desktop' ),
				'shortcut_key_backspace' => __( 'Backspace', 'pufferdesk-admin-desktop' ),
				'shortcut_key_delete'    => __( 'Delete', 'pufferdesk-admin-desktop' ),
				'shortcut_key_enter'     => __( 'Enter', 'pufferdesk-admin-desktop' ),
				'shortcut_key_escape'    => __( 'Esc', 'pufferdesk-admin-desktop' ),
				'shortcut_key_space'     => __( 'Space', 'pufferdesk-admin-desktop' ),
				'shortcut_key_tab'       => __( 'Tab', 'pufferdesk-admin-desktop' ),
				'shortcut_modifier_alt'  => __( 'Alt', 'pufferdesk-admin-desktop' ),
				'shortcut_modifier_control' => __( 'Ctrl', 'pufferdesk-admin-desktop' ),
				'shortcut_modifier_meta' => __( 'Meta', 'pufferdesk-admin-desktop' ),
				'shortcut_modifier_shift' => __( 'Shift', 'pufferdesk-admin-desktop' ),
				'shortcut_reserved_window_scope' => __( 'primary+w is reserved unless scoped to a PufferDesk window or tab.', 'pufferdesk-admin-desktop' ),
					'shortcut_reserved_clear_scope' => __( 'primary+n is reserved unless clearly scoped.', 'pufferdesk-admin-desktop' ),
					'shortcut_reserved_window_reason' => __( 'Scoped to PufferDesk windows.', 'pufferdesk-admin-desktop' ),
					/* translators: 1: keyboard shortcut label, 2: reserved browser or shell action label. */
					'shortcut_reserved_for_format' => __( '%1$s is reserved for %2$s.', 'pufferdesk-admin-desktop' ),
				/* translators: 1: keyboard shortcut label, 2: conflicting command label. */
				'shortcut_may_conflict_format' => __( '%1$s may conflict with %2$s.', 'pufferdesk-admin-desktop' ),
				/* translators: 1: keyboard shortcut label, 2: conflicting command label. */
				'shortcut_conflicts_with_format' => __( '%1$s conflicts with %2$s.', 'pufferdesk-admin-desktop' ),
				'shortcut_conflict_console' => __( 'PufferDesk shortcut conflict:', 'pufferdesk-admin-desktop' ),
				'shortcut_reserved_browser_back' => __( 'browser back', 'pufferdesk-admin-desktop' ),
				'shortcut_reserved_browser_forward' => __( 'browser forward', 'pufferdesk-admin-desktop' ),
				'shortcut_reserved_browser_history' => __( 'browser history', 'pufferdesk-admin-desktop' ),
				'shortcut_reserved_browser_location_bar' => __( 'browser location bar', 'pufferdesk-admin-desktop' ),
				'shortcut_reserved_browser_new_tab' => __( 'browser new tab', 'pufferdesk-admin-desktop' ),
				'shortcut_reserved_browser_next_tab' => __( 'browser next tab', 'pufferdesk-admin-desktop' ),
				'shortcut_reserved_browser_previous_tab' => __( 'browser previous tab', 'pufferdesk-admin-desktop' ),
				'shortcut_reserved_browser_print' => __( 'browser print', 'pufferdesk-admin-desktop' ),
				'shortcut_reserved_browser_private_window' => __( 'browser private window', 'pufferdesk-admin-desktop' ),
				'shortcut_reserved_browser_quit_application' => __( 'browser quit application', 'pufferdesk-admin-desktop' ),
				'shortcut_reserved_browser_reload' => __( 'browser reload', 'pufferdesk-admin-desktop' ),
				'shortcut_reserved_browser_reopen_closed_tab' => __( 'browser reopen closed tab', 'pufferdesk-admin-desktop' ),
				'shortcut_reserved_browser_save_page' => __( 'browser save page', 'pufferdesk-admin-desktop' ),
				'shortcut_reserved_developer_tools' => __( 'developer tools', 'pufferdesk-admin-desktop' ),
				'shortcut_reserved_developer_tools_console' => __( 'developer tools console', 'pufferdesk-admin-desktop' ),
				'shortcut_reserved_developer_tools_element_picker' => __( 'developer tools element picker', 'pufferdesk-admin-desktop' ),
				'shortcut_reserved_system_hide_application' => __( 'system hide application', 'pufferdesk-admin-desktop' ),
				'shortcut_reserved_system_hide_other_applications' => __( 'system hide other applications', 'pufferdesk-admin-desktop' ),
				'shortcut_reserved_system_minimize_window' => __( 'system minimize window', 'pufferdesk-admin-desktop' ),
				'shortcut_reserved_system_screenshot' => __( 'system screenshot', 'pufferdesk-admin-desktop' ),
				'shortcut_reserved_system_search' => __( 'system search', 'pufferdesk-admin-desktop' ),
					'wordpress_documentation' => __( 'WordPress Documentation', 'pufferdesk-admin-desktop' ),
					'support_forums'          => __( 'Support Forums', 'pufferdesk-admin-desktop' ),
					'launcher'                => $shell_labels['launcher'],
					'launcher_options'        => $shell_labels['launcher_options'],
					/* translators: %s: theme-specific launcher label, such as Dock or Taskbar. */
					'fixed_launcher_placement_format' => __( 'App has a fixed %s placement.', 'pufferdesk-admin-desktop' ),
				'app_unavailable'         => __( 'App unavailable.', 'pufferdesk-admin-desktop' ),
				'launcher_settings'       => $shell_labels['launcher_options'],
				'keep_in_launcher'        => $shell_labels['keep_in_launcher'],
				'remove_from_launcher'    => $shell_labels['remove_from_launcher'],
				'open_at_login'           => $shell_labels['open_at_login'],
				'window_close'            => $window_control_labels['close'],
				'window_minimize'         => $window_control_labels['minimize'],
				'window_maximize'         => $window_control_labels['maximize'],
				'window_restore'          => __( 'Restore', 'pufferdesk-admin-desktop' ),
				'window_move'             => __( 'Move', 'pufferdesk-admin-desktop' ),
				'window_size'             => __( 'Size', 'pufferdesk-admin-desktop' ),
				'sound'                   => __( 'Sound', 'pufferdesk-admin-desktop' ),
				'sound_mute'              => __( 'Mute', 'pufferdesk-admin-desktop' ),
				'sound_unmute'            => __( 'Unmute', 'pufferdesk-admin-desktop' ),
				'sound_settings'          => __( 'Sound Settings', 'pufferdesk-admin-desktop' ),
			),
		);

		$theme_labels = $this->get_theme_menu_labels( $theme );
		if ( ! empty( $theme_labels ) ) {
			$config['labels'] = wp_parse_args( $theme_labels, $config['labels'] );
		}

		return $config;
	}

}
