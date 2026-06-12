<?php
/**
 * Shared native document persistence service.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Owns document create/read/update/delete behavior for native apps.
 */
final class PufferDesk_Document_Service {
	const CAPABILITY     = 'edit_posts';
	const KIND_STICKY    = 'sticky_note';
	const KIND_TEXT      = 'text_document';
	const FORMAT_DEFAULT = 'html';

	/**
	 * Virtual filesystem service.
	 *
	 * @var PufferDesk_Virtual_Filesystem
	 */
	private $virtual_filesystem;

	/**
	 * Constructor.
	 *
	 * @param PufferDesk_Virtual_Filesystem|null $virtual_filesystem Virtual filesystem service.
	 */
	public function __construct( $virtual_filesystem = null ) {
		$this->virtual_filesystem = $virtual_filesystem instanceof PufferDesk_Virtual_Filesystem ? $virtual_filesystem : new PufferDesk_Virtual_Filesystem();
	}

	/**
	 * Shared document labels used by PHP services and runtime config.
	 *
	 * @return array<string,string>
	 */
	public static function get_default_labels() {
		return array(
			/* translators: %s: Source document title. */
			'copyNameFormat'   => __( '%s copy', 'pufferdesk-admin-desktop' ),
			'stickyNote'       => __( 'Sticky Note', 'pufferdesk-admin-desktop' ),
			'untitledDocument' => __( 'Untitled Document', 'pufferdesk-admin-desktop' ),
		);
	}

	/**
	 * Get a shared document label.
	 *
	 * @param string $key Label key.
	 * @return string
	 */
	public static function get_default_label( $key ) {
		$labels = self::get_default_labels();

		return isset( $labels[ $key ] ) ? $labels[ $key ] : $key;
	}

	/**
	 * Whether the current user can use native document features.
	 *
	 * @return bool
	 */
	public function current_user_can_use_documents() {
		return current_user_can( self::CAPABILITY );
	}

	/**
	 * Create a document.
	 *
	 * @param array<string,mixed> $args Document payload.
	 * @return array<string,mixed>|WP_Error
	 */
	public function create_document( $args ) {
		if ( ! $this->current_user_can_use_documents() ) {
			return $this->permission_error();
		}

		$args    = is_array( $args ) ? $args : array();
		$kind    = $this->normalize_kind( isset( $args['kind'] ) ? $args['kind'] : self::KIND_TEXT );
		$content = $this->sanitize_content( isset( $args['content'] ) ? $args['content'] : '' );
		$title   = $this->sanitize_title( isset( $args['title'] ) ? $args['title'] : '' );
		$title   = $title ? $title : $this->derive_title( $content, self::KIND_STICKY === $kind ? self::get_default_label( 'stickyNote' ) : self::get_default_label( 'untitledDocument' ) );
		$parent_path = $this->normalize_parent_path( isset( $args['parentPath'] ) ? $args['parentPath'] : '', $kind );

		$post_id = wp_insert_post(
			array(
				'post_author'  => get_current_user_id(),
				'post_content' => $content,
				'post_status'  => 'draft',
				'post_title'   => $title,
				'post_type'    => PufferDesk_Document_Post_Type::POST_TYPE,
			),
			true
		);

		if ( is_wp_error( $post_id ) ) {
			return $post_id;
		}

		update_post_meta( $post_id, PufferDesk_Document_Post_Type::META_KIND, $kind );
		update_post_meta( $post_id, PufferDesk_Document_Post_Type::META_FORMAT, self::FORMAT_DEFAULT );
		update_post_meta( $post_id, PufferDesk_Document_Post_Type::META_PARENT_PATH, $parent_path );

		$color = $this->sanitize_color( isset( $args['color'] ) ? $args['color'] : '' );
		if ( '' !== $color ) {
			update_post_meta( $post_id, PufferDesk_Document_Post_Type::META_COLOR, $color );
		}

		return $this->get_document( $post_id );
	}

	/**
	 * Duplicate a document into a target parent path.
	 *
	 * @param int                 $document_id Source document post ID.
	 * @param array<string,mixed> $args Duplicate payload.
	 * @return array<string,mixed>|WP_Error
	 */
	public function duplicate_document( $document_id, $args = array() ) {
		$post = $this->get_document_post( $document_id );
		if ( is_wp_error( $post ) ) {
			return $post;
		}

		if ( ! $this->current_user_can_edit_document( $post ) ) {
			return $this->permission_error();
		}

		$args        = is_array( $args ) ? $args : array();
		$kind        = $this->get_document_kind( $post );
		$parent_path = array_key_exists( 'parentPath', $args )
			? $this->normalize_parent_path( $args['parentPath'], $kind )
			: $this->get_document_parent_path( $post, $kind );
		$title       = array_key_exists( 'title', $args )
			? $this->sanitize_title( $args['title'] )
			: '';

		if ( '' === $title ) {
			$title = $this->get_copy_title( get_the_title( $post ) );
		}

		return $this->create_document(
			array(
				'color'      => get_post_meta( $post->ID, PufferDesk_Document_Post_Type::META_COLOR, true ),
				'content'    => get_post_field( 'post_content', $post->ID, 'raw' ),
				'kind'       => $kind,
				'parentPath' => $parent_path,
				'title'      => $title,
			)
		);
	}

	/**
	 * Update a document.
	 *
	 * @param int                 $document_id Document post ID.
	 * @param array<string,mixed> $args Document payload.
	 * @return array<string,mixed>|WP_Error
	 */
	public function update_document( $document_id, $args ) {
		$post = $this->get_document_post( $document_id );
		if ( is_wp_error( $post ) ) {
			return $post;
		}

		if ( ! $this->current_user_can_edit_document( $post ) ) {
			return $this->permission_error();
		}

		$args    = is_array( $args ) ? $args : array();
		$updates = array(
			'ID' => (int) $post->ID,
		);
		$kind    = $this->get_document_kind( $post );

		if ( array_key_exists( 'kind', $args ) ) {
			$kind = $this->normalize_kind( $args['kind'] );
			update_post_meta( $post->ID, PufferDesk_Document_Post_Type::META_KIND, $kind );
		}

		if ( array_key_exists( 'content', $args ) ) {
			$updates['post_content'] = $this->sanitize_content( $args['content'] );
		}

		if ( array_key_exists( 'title', $args ) ) {
			$title = $this->sanitize_title( $args['title'] );
			if ( '' !== $title ) {
				$updates['post_title'] = $title;
			}
		} elseif ( self::KIND_STICKY === $kind && array_key_exists( 'content', $args ) ) {
			$updates['post_title'] = $this->derive_title( $updates['post_content'], self::get_default_label( 'stickyNote' ) );
		}

		if ( count( $updates ) > 1 ) {
			$result = wp_update_post( $updates, true );
			if ( is_wp_error( $result ) ) {
				return $result;
			}
		}

		if ( array_key_exists( 'color', $args ) ) {
			$color = $this->sanitize_color( $args['color'] );
			if ( '' === $color ) {
				delete_post_meta( $post->ID, PufferDesk_Document_Post_Type::META_COLOR );
			} else {
				update_post_meta( $post->ID, PufferDesk_Document_Post_Type::META_COLOR, $color );
			}
		}

		if ( array_key_exists( 'parentPath', $args ) ) {
			update_post_meta( $post->ID, PufferDesk_Document_Post_Type::META_PARENT_PATH, $this->normalize_parent_path( $args['parentPath'], $kind ) );
		}

		return $this->get_document( $post->ID );
	}

	/**
	 * Return a document by ID.
	 *
	 * @param int $document_id Document post ID.
	 * @return array<string,mixed>|WP_Error
	 */
	public function get_document( $document_id ) {
		$post = $this->get_document_post( $document_id );
		if ( is_wp_error( $post ) ) {
			return $post;
		}

		if ( ! $this->current_user_can_edit_document( $post ) ) {
			return $this->permission_error();
		}

		return $this->normalize_document( $post );
	}

	/**
	 * List current-user documents.
	 *
	 * @param string $kind Optional document kind.
	 * @param string $parent_path Optional parent virtual path.
	 * @return array<int,array<string,mixed>>|WP_Error
	 */
	public function list_documents( $kind = '', $parent_path = '' ) {
		if ( ! $this->current_user_can_use_documents() ) {
			return $this->permission_error();
		}

		$kind        = '' !== $kind ? $this->normalize_kind( $kind ) : '';
		$parent_path = '' !== $parent_path ? $this->virtual_filesystem->normalize_path( $parent_path, '' ) : '';

		$posts = get_posts(
			array(
				'author'         => get_current_user_id(),
				'orderby'        => 'modified',
				'order'          => 'DESC',
				'post_status'    => array( 'draft', 'publish', 'private' ),
				'post_type'      => PufferDesk_Document_Post_Type::POST_TYPE,
				'posts_per_page' => 200,
			)
		);

		$documents = array();
		foreach ( $posts as $post ) {
			if ( '' !== $kind && $this->get_document_kind( $post ) !== $kind ) {
				continue;
			}

			$document = $this->normalize_document( $post );
			if ( '' !== $parent_path && $document['parentPath'] !== $parent_path ) {
				continue;
			}

			$documents[] = $document;
			if ( count( $documents ) >= 100 ) {
				break;
			}
		}

		return $documents;
	}

	/**
	 * Trash a document.
	 *
	 * @param int $document_id Document post ID.
	 * @return bool|WP_Error
	 */
	public function delete_document( $document_id ) {
		$post = $this->get_document_post( $document_id );
		if ( is_wp_error( $post ) ) {
			return $post;
		}

		if ( ! $this->current_user_can_edit_document( $post ) ) {
			return $this->permission_error();
		}

		return false !== wp_trash_post( $post->ID );
	}

	/**
	 * Normalize a document post for the browser runtime.
	 *
	 * @param WP_Post $post Document post.
	 * @return array<string,mixed>
	 */
	private function normalize_document( $post ) {
		$kind        = $this->get_document_kind( $post );
		$parent_path = $this->get_document_parent_path( $post, $kind );

		return array(
			'id'       => (int) $post->ID,
			'authorId' => (int) $post->post_author,
			'color'    => $this->sanitize_color( get_post_meta( $post->ID, PufferDesk_Document_Post_Type::META_COLOR, true ) ),
			'content'  => (string) get_post_field( 'post_content', $post->ID, 'raw' ),
			'created'  => get_post_time( 'c', false, $post ),
			'format'   => self::FORMAT_DEFAULT,
			'kind'     => $kind,
			'modified' => get_post_modified_time( 'c', false, $post ),
			'parentPath' => $parent_path,
			'path'     => $this->virtual_filesystem->join_path( $parent_path, 'document-' . (int) $post->ID ),
			'title'    => get_the_title( $post ),
		);
	}

	/**
	 * Get and validate a document post.
	 *
	 * @param int $document_id Document post ID.
	 * @return WP_Post|WP_Error
	 */
	private function get_document_post( $document_id ) {
		$post = get_post( absint( $document_id ) );
		if ( ! $post || PufferDesk_Document_Post_Type::POST_TYPE !== $post->post_type ) {
			return new WP_Error(
				'pufferdesk_document_not_found',
				__( 'Document not found.', 'pufferdesk-admin-desktop' ),
				array( 'status' => 404 )
			);
		}

		return $post;
	}

	/**
	 * Whether the current user owns this document.
	 *
	 * @param WP_Post $post Document post.
	 * @return bool
	 */
	private function current_user_can_edit_document( $post ) {
		return $this->current_user_can_use_documents() && (int) $post->post_author === get_current_user_id();
	}

	/**
	 * Get normalized document kind from post meta.
	 *
	 * @param WP_Post $post Document post.
	 * @return string
	 */
	private function get_document_kind( $post ) {
		return $this->normalize_kind( get_post_meta( $post->ID, PufferDesk_Document_Post_Type::META_KIND, true ) );
	}

	/**
	 * Get and persist the normalized parent virtual path.
	 *
	 * @param WP_Post $post Document post.
	 * @param string  $kind Document kind.
	 * @return string
	 */
	private function get_document_parent_path( $post, $kind ) {
		$stored = get_post_meta( $post->ID, PufferDesk_Document_Post_Type::META_PARENT_PATH, true );
		$path   = $this->normalize_parent_path( $stored, $kind );

		if ( $path !== $stored ) {
			update_post_meta( $post->ID, PufferDesk_Document_Post_Type::META_PARENT_PATH, $path );
		}

		return $path;
	}

	/**
	 * Normalize a document parent virtual path.
	 *
	 * @param mixed  $path Raw path.
	 * @param string $kind Document kind.
	 * @return string
	 */
	private function normalize_parent_path( $path, $kind ) {
		$fallback = $this->virtual_filesystem->get_default_path_for_document_kind( $kind );

		return $this->virtual_filesystem->normalize_path( $path, $fallback );
	}

	/**
	 * Normalize a document kind.
	 *
	 * @param mixed $kind Raw kind.
	 * @return string
	 */
	private function normalize_kind( $kind ) {
		$kind = sanitize_key( (string) $kind );

		return in_array( $kind, array( self::KIND_STICKY, self::KIND_TEXT ), true ) ? $kind : self::KIND_TEXT;
	}

	/**
	 * Sanitize document HTML.
	 *
	 * @param mixed $content Raw content.
	 * @return string
	 */
	private function sanitize_content( $content ) {
		return wp_kses_post( (string) $content );
	}

	/**
	 * Sanitize an optional title.
	 *
	 * @param mixed $title Raw title.
	 * @return string
	 */
	private function sanitize_title( $title ) {
		return sanitize_text_field( (string) $title );
	}

	/**
	 * Sanitize a color descriptor.
	 *
	 * @param mixed $color Raw color.
	 * @return string
	 */
	private function sanitize_color( $color ) {
		$color = sanitize_key( (string) $color );

		return strlen( $color ) <= 40 ? $color : '';
	}

	/**
	 * Derive a compact title from content.
	 *
	 * @param string $content Content.
	 * @param string $fallback Fallback title.
	 * @return string
	 */
	private function derive_title( $content, $fallback ) {
		$text  = trim( preg_replace( '/\s+/', ' ', wp_strip_all_tags( (string) $content, true ) ) );
		$title = '' !== $text ? $this->truncate_text( $text, 80 ) : $fallback;

		return sanitize_text_field( $title );
	}

	/**
	 * Return a copy title for duplicated documents.
	 *
	 * @param string $title Source title.
	 * @return string
	 */
	private function get_copy_title( $title ) {
		$title = $this->sanitize_title( $title );
		$title = '' !== $title ? $title : self::get_default_label( 'untitledDocument' );

		return sanitize_text_field(
			sprintf(
				self::get_default_label( 'copyNameFormat' ),
				$title
			)
		);
	}

	/**
	 * Truncate text without requiring mbstring.
	 *
	 * @param string $text Text.
	 * @param int    $length Max length.
	 * @return string
	 */
	private function truncate_text( $text, $length ) {
		if ( function_exists( 'mb_substr' ) ) {
			return mb_substr( $text, 0, $length );
		}

		return substr( $text, 0, $length );
	}

	/**
	 * Create a permissions error.
	 *
	 * @return WP_Error
	 */
	private function permission_error() {
		return new WP_Error(
			'pufferdesk_document_forbidden',
			__( 'You do not have permission to edit PufferDesk documents.', 'pufferdesk-admin-desktop' ),
			array( 'status' => 403 )
		);
	}
}
