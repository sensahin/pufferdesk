<?php
/**
 * Virtual desktop filesystem schema.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Owns canonical virtual paths and default desktop folders.
 */
final class PufferDesk_Virtual_Filesystem {
	const SCHEME             = 'pdk';
	const FOLDER_HOME        = 'home';
	const FOLDER_DESKTOP     = 'desktop';
	const FOLDER_DOCUMENTS   = 'documents';
	const FOLDER_NOTES       = 'notes';
	const FOLDER_STICKIES    = 'stickies';
	const FOLDER_TRASH       = 'trash';
	const KIND_STICKY_NOTE   = 'sticky_note';
	const KIND_TEXT_DOCUMENT = 'text_document';

	/**
	 * Stable virtual folder IDs exposed to browser runtime.
	 *
	 * @return array<string,string>
	 */
	public static function get_folder_ids() {
		return array(
			'HOME'      => self::FOLDER_HOME,
			'DESKTOP'   => self::FOLDER_DESKTOP,
			'DOCUMENTS' => self::FOLDER_DOCUMENTS,
			'NOTES'     => self::FOLDER_NOTES,
			'STICKIES'  => self::FOLDER_STICKIES,
			'TRASH'     => self::FOLDER_TRASH,
		);
	}

	/**
	 * Return system folder descriptors for the current site/user.
	 *
	 * @param array<string,mixed> $theme Current theme.
	 * @param int                 $user_id Optional user ID.
	 * @return array<int,array<string,mixed>>
	 */
	public function get_system_folders( $theme = array(), $user_id = 0 ) {
		$user_id = $user_id ? absint( $user_id ) : get_current_user_id();
		$labels  = $this->get_labels( $theme, $user_id );
		$paths   = $this->get_folder_paths( $user_id );

		return array(
			$this->create_folder(
				self::FOLDER_HOME,
				$labels['home'],
				$paths[ self::FOLDER_HOME ],
				'',
				$this->theme_icon( 'home.svg', 'dashicons-admin-home' ),
				'home'
			),
			$this->create_folder(
				self::FOLDER_DESKTOP,
				$labels['desktop'],
				$paths[ self::FOLDER_DESKTOP ],
				self::FOLDER_HOME,
				$this->theme_icon( 'folder.svg', 'dashicons-category' ),
				'desktop'
			),
			$this->create_folder(
				self::FOLDER_DOCUMENTS,
				$labels['documents'],
				$paths[ self::FOLDER_DOCUMENTS ],
				self::FOLDER_HOME,
				$this->theme_icon( 'folder.svg', 'dashicons-media-document' ),
				'documents'
			),
			$this->create_folder(
				self::FOLDER_NOTES,
				$labels['notes'],
				$paths[ self::FOLDER_NOTES ],
				self::FOLDER_HOME,
				$this->theme_icon( 'folder.svg', 'dashicons-edit-page' ),
				'notes'
			),
			$this->create_folder(
				self::FOLDER_STICKIES,
				$labels['stickies'],
				$paths[ self::FOLDER_STICKIES ],
				self::FOLDER_HOME,
				$this->theme_icon( 'folder.svg', 'dashicons-category' ),
				'stickies'
			),
			$this->create_folder(
				self::FOLDER_TRASH,
				$labels['trash'],
				$paths[ self::FOLDER_TRASH ],
				'',
				array(
					'type'     => PufferDesk_Icon_Renderer::TYPE_THEME,
					'name'     => 'trash-empty.svg',
					'fallback' => 'dashicons-trash',
				),
				'trash'
			),
		);
	}

	/**
	 * Return the system folders that should be shown as default desktop icons.
	 *
	 * Finder/Explorer surfaces still receive every system folder. This method
	 * owns only the desktop icon policy so sidebar navigation and virtual paths
	 * do not fork from the canonical filesystem schema.
	 *
	 * @param array<string,mixed> $theme Current theme.
	 * @param int                 $user_id Optional user ID.
	 * @return array<int,array<string,mixed>>
	 */
	public function get_desktop_system_folders( $theme = array(), $user_id = 0 ) {
		$folder_ids = $this->get_desktop_system_folder_ids( $theme );
		$folders    = $this->get_system_folders( $theme, $user_id );
		$allowed    = array_fill_keys( $folder_ids, true );

		return array_values(
			array_filter(
				$folders,
				static function ( $folder ) use ( $allowed ) {
					return is_array( $folder ) && isset( $folder['id'] ) && isset( $allowed[ $folder['id'] ] );
				}
			)
		);
	}

	/**
	 * Runtime schema for browser services.
	 *
	 * @param array<string,mixed> $theme Current theme.
	 * @param int                 $user_id Optional user ID.
	 * @return array<string,mixed>
	 */
	public function get_runtime_config( $theme = array(), $user_id = 0 ) {
		$user_id = $user_id ? absint( $user_id ) : get_current_user_id();
		$folders = $this->get_system_folders( $theme, $user_id );
		$labels  = $this->get_labels( $theme, $user_id );
		$paths   = $this->get_folder_paths( $user_id );
		$display = array();

		foreach ( $folders as $folder ) {
			if ( empty( $folder['id'] ) ) {
				continue;
			}

			$folder_id             = (string) $folder['id'];
			$breadcrumbs           = $this->get_breadcrumbs( $folder_id, $theme, $labels );
			$display[ $folder_id ] = array(
				'breadcrumbs' => $breadcrumbs,
				'pathLabel'   => $this->format_display_path( $breadcrumbs, $theme ),
				'where'       => $this->format_display_path( $breadcrumbs, $theme ),
			);
		}

		return array(
			'scheme'       => self::SCHEME,
			'siteId'       => get_current_blog_id(),
			'userId'       => $user_id,
			'folderIds'    => self::get_folder_ids(),
			'folders'      => $folders,
			'defaultPaths' => array(
				self::KIND_STICKY_NOTE   => $paths[ self::FOLDER_STICKIES ],
				self::KIND_TEXT_DOCUMENT => $paths[ self::FOLDER_DOCUMENTS ],
				'sticky'                 => $paths[ self::FOLDER_STICKIES ],
				'text'                   => $paths[ self::FOLDER_DOCUMENTS ],
				self::FOLDER_DESKTOP     => $paths[ self::FOLDER_DESKTOP ],
				self::FOLDER_DOCUMENTS   => $paths[ self::FOLDER_DOCUMENTS ],
				self::FOLDER_NOTES       => $paths[ self::FOLDER_NOTES ],
				self::FOLDER_STICKIES    => $paths[ self::FOLDER_STICKIES ],
			),
			'display'      => $display,
			'labels'       => $labels,
		);
	}

	/**
	 * Default parent path for a document kind.
	 *
	 * @param mixed $kind Raw document kind.
	 * @param int   $user_id Optional user ID.
	 * @return string
	 */
	public function get_default_path_for_document_kind( $kind, $user_id = 0 ) {
		$paths = $this->get_folder_paths( $user_id );
		$kind  = sanitize_key( (string) $kind );

		if ( self::KIND_STICKY_NOTE === $kind ) {
			return $paths[ self::FOLDER_STICKIES ];
		}

		return $paths[ self::FOLDER_DOCUMENTS ];
	}

	/**
	 * Normalize a canonical virtual path for the current site/user.
	 *
	 * @param mixed  $path Raw path.
	 * @param string $fallback Fallback when invalid.
	 * @param int    $user_id Optional user ID.
	 * @return string
	 */
	public function normalize_path( $path, $fallback = '', $user_id = 0 ) {
		if ( ! is_scalar( $path ) ) {
			return $fallback;
		}

		$path = trim( (string) $path );
		if ( '' === $path ) {
			return $fallback;
		}

		$path = preg_replace( '#(?<!:)//+#', '/', $path );
		$path = rtrim( strtolower( (string) $path ), '/' );

		$site_id = get_current_blog_id();
		$user_id = $user_id ? absint( $user_id ) : get_current_user_id();

		if ( preg_match( '#^pdk://site/([0-9]+)/trash$#', $path, $matches ) ) {
			return absint( $matches[1] ) === absint( $site_id ) ? $path : $fallback;
		}

		if ( ! preg_match( '#^pdk://site/([0-9]+)/home/([0-9]+)(?:/([a-z0-9][a-z0-9_-]{0,79}(?:/[a-z0-9][a-z0-9_-]{0,79}){0,7}))?$#', $path, $matches ) ) {
			return $fallback;
		}

		if ( absint( $matches[1] ) !== absint( $site_id ) || absint( $matches[2] ) !== absint( $user_id ) ) {
			return $fallback;
		}

		return $path;
	}

	/**
	 * Join a child segment to a canonical virtual path.
	 *
	 * @param string $parent_path Parent path.
	 * @param string $segment Child segment.
	 * @return string
	 */
	public function join_path( $parent_path, $segment ) {
		$segment = sanitize_key( (string) $segment );

		if ( '' === $segment ) {
			return $parent_path;
		}

		return rtrim( (string) $parent_path, '/' ) . '/' . $segment;
	}

	/**
	 * Return canonical folder paths for the current site/user.
	 *
	 * @param int $user_id Optional user ID.
	 * @return array<string,string>
	 */
	private function get_folder_paths( $user_id = 0 ) {
		$user_id   = $user_id ? absint( $user_id ) : get_current_user_id();
		$site_id   = absint( get_current_blog_id() );
		$home_path = 'pdk://site/' . $site_id . '/home/' . absint( $user_id );

		return array(
			self::FOLDER_HOME      => $home_path,
			self::FOLDER_DESKTOP   => $home_path . '/desktop',
			self::FOLDER_DOCUMENTS => $home_path . '/documents',
			self::FOLDER_NOTES     => $home_path . '/notes',
			self::FOLDER_STICKIES  => $home_path . '/stickies',
			self::FOLDER_TRASH     => 'pdk://site/' . $site_id . '/trash',
		);
	}

	/**
	 * Create a folder descriptor.
	 *
	 * @param string              $id Folder ID.
	 * @param string              $label Folder label.
	 * @param string              $path Canonical virtual path.
	 * @param string              $parent_id Parent folder ID.
	 * @param string|array<mixed> $icon Icon descriptor.
	 * @param string              $special Special folder kind.
	 * @return array<string,mixed>
	 */
	private function create_folder( $id, $label, $path, $parent_id, $icon, $special ) {
		return array(
			'id'       => sanitize_key( $id ),
			'label'    => sanitize_text_field( $label ),
			'path'     => $path,
			'parentId' => sanitize_key( $parent_id ),
			'icon'     => PufferDesk_Icon_Renderer::normalize( $icon ),
			'kind'     => 'system',
			'special'  => sanitize_key( $special ),
			'source'   => __( 'PufferDesk virtual filesystem', 'pufferdesk-admin-desktop' ),
			'user'     => false,
			'virtual'  => true,
		);
	}

	/**
	 * Build a theme icon descriptor with a Dashicon fallback.
	 *
	 * @param string $name Theme icon file name.
	 * @param string $fallback Dashicon fallback.
	 * @return array<string,string>
	 */
	private function theme_icon( $name, $fallback ) {
		return array(
			'type'     => PufferDesk_Icon_Renderer::TYPE_THEME,
			'name'     => $name,
			'fallback' => $fallback,
		);
	}

	/**
	 * Theme-aware folder and path labels.
	 *
	 * @param array<string,mixed> $theme Current theme.
	 * @param int                 $user_id User ID.
	 * @return array<string,string>
	 */
	private function get_labels( $theme, $user_id ) {
		$user           = get_user_by( 'id', $user_id );
		$user_label     = $user && $user->display_name ? $user->display_name : ( $user && $user->user_login ? $user->user_login : __( 'User', 'pufferdesk-admin-desktop' ) );
		$trash          = $this->get_theme_menu_label( $theme, 'trash', __( 'Trash', 'pufferdesk-admin-desktop' ) );
		$is_redmond     = $this->is_redmond_theme( $theme );
		$home_label     = $is_redmond ? __( 'This PC', 'pufferdesk-admin-desktop' ) : sanitize_text_field( $user_label );
		$root_label     = $is_redmond ? __( 'This PC', 'pufferdesk-admin-desktop' ) : sanitize_text_field( $user_label );

		return array(
			'home'       => $home_label,
			'desktop'    => __( 'Desktop', 'pufferdesk-admin-desktop' ),
			'documents'  => __( 'Documents', 'pufferdesk-admin-desktop' ),
			'notes'      => __( 'Notes', 'pufferdesk-admin-desktop' ),
			'stickies'   => __( 'Sticky Notes', 'pufferdesk-admin-desktop' ),
			'trash'      => $trash,
			'thisPc'     => __( 'This PC', 'pufferdesk-admin-desktop' ),
			'localDisk'  => __( 'Local Disk', 'pufferdesk-admin-desktop' ),
			'users'      => __( 'Users', 'pufferdesk-admin-desktop' ),
			'root'       => $root_label,
		);
	}

	/**
	 * Breadcrumb labels for a folder.
	 *
	 * @param string              $folder_id Folder ID.
	 * @param array<string,mixed> $theme Current theme.
	 * @param array<string,string> $labels Theme labels.
	 * @return array<int,string>
	 */
	private function get_breadcrumbs( $folder_id, $theme, $labels ) {
		if ( $this->is_redmond_theme( $theme ) ) {
			if ( self::FOLDER_HOME === $folder_id ) {
				return array( $labels['thisPc'] );
			}

			if ( self::FOLDER_TRASH === $folder_id ) {
				return array( $labels['thisPc'], $labels['trash'] );
			}

			$crumbs = array( $labels['thisPc'], $labels['localDisk'] );
			if ( isset( $labels[ $folder_id ] ) ) {
				$crumbs[] = $labels[ $folder_id ];
			}

			return $crumbs;
		}

		if ( self::FOLDER_TRASH === $folder_id ) {
			return array( $labels['trash'] );
		}

		$crumbs = array( $labels['home'] );
		if ( self::FOLDER_HOME !== $folder_id && isset( $labels[ $folder_id ] ) ) {
			$crumbs[] = $labels[ $folder_id ];
		}

		return $crumbs;
	}

	/**
	 * Format breadcrumbs as a display path.
	 *
	 * @param array<int,string>   $breadcrumbs Breadcrumb labels.
	 * @param array<string,mixed> $theme Current theme.
	 * @return string
	 */
	private function format_display_path( $breadcrumbs, $theme ) {
		$separator = $this->is_redmond_theme( $theme ) ? ' > ' : ' / ';

		return implode( $separator, array_filter( array_map( 'sanitize_text_field', (array) $breadcrumbs ) ) );
	}

	/**
	 * Theme-aware default desktop system folder IDs.
	 *
	 * @param array<string,mixed> $theme Current theme.
	 * @return array<int,string>
	 */
	private function get_desktop_system_folder_ids( $theme ) {
		if ( $this->is_pufferdesk_theme( $theme ) ) {
			return array(
				self::FOLDER_DOCUMENTS,
				self::FOLDER_NOTES,
			);
		}

		if ( $this->is_redmond_theme( $theme ) ) {
			return array(
				self::FOLDER_HOME,
				self::FOLDER_DOCUMENTS,
				self::FOLDER_NOTES,
			);
		}

		return array(
			self::FOLDER_HOME,
			self::FOLDER_DESKTOP,
			self::FOLDER_DOCUMENTS,
			self::FOLDER_NOTES,
			self::FOLDER_STICKIES,
		);
	}

	/**
	 * Read a theme menu label.
	 *
	 * @param array<string,mixed> $theme Current theme.
	 * @param string              $key Label key.
	 * @param string              $fallback Fallback.
	 * @return string
	 */
	private function get_theme_menu_label( $theme, $key, $fallback ) {
		$labels = isset( $theme['menu']['labels'] ) && is_array( $theme['menu']['labels'] ) ? $theme['menu']['labels'] : array();

		return isset( $labels[ $key ] ) && is_string( $labels[ $key ] ) && '' !== $labels[ $key ] ? $labels[ $key ] : $fallback;
	}

	/**
	 * Whether the active theme uses Redmond-style filesystem vocabulary.
	 *
	 * @param array<string,mixed> $theme Current theme.
	 * @return bool
	 */
	private function is_redmond_theme( $theme ) {
		$family = isset( $theme['family'] ) ? sanitize_key( (string) $theme['family'] ) : '';

		return 'redmond' === $family;
	}

	/**
	 * Whether the active theme uses the bundled PufferDesk filesystem desktop.
	 *
	 * @param array<string,mixed> $theme Current theme.
	 * @return bool
	 */
	private function is_pufferdesk_theme( $theme ) {
		$family = isset( $theme['family'] ) ? sanitize_key( (string) $theme['family'] ) : '';

		return 'pufferdesk' === $family;
	}
}
