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
		$title   = $title ? $title : $this->derive_title( $content, self::KIND_STICKY === $kind ? __( 'Sticky Note', 'pufferdesk-admin-desktop' ) : __( 'Untitled Document', 'pufferdesk-admin-desktop' ) );

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

		$color = $this->sanitize_color( isset( $args['color'] ) ? $args['color'] : '' );
		if ( '' !== $color ) {
			update_post_meta( $post_id, PufferDesk_Document_Post_Type::META_COLOR, $color );
		}

		return $this->get_document( $post_id );
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
			$updates['post_title'] = $this->derive_title( $updates['post_content'], __( 'Sticky Note', 'pufferdesk-admin-desktop' ) );
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
	 * @return array<int,array<string,mixed>>|WP_Error
	 */
	public function list_documents( $kind = '' ) {
		if ( ! $this->current_user_can_use_documents() ) {
			return $this->permission_error();
		}

		$kind = '' !== $kind ? $this->normalize_kind( $kind ) : '';

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

			$documents[] = $this->normalize_document( $post );
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
		return array(
			'id'       => (int) $post->ID,
			'authorId' => (int) $post->post_author,
			'color'    => $this->sanitize_color( get_post_meta( $post->ID, PufferDesk_Document_Post_Type::META_COLOR, true ) ),
			'content'  => (string) get_post_field( 'post_content', $post->ID, 'raw' ),
			'created'  => get_post_time( 'c', false, $post ),
			'format'   => self::FORMAT_DEFAULT,
			'kind'     => $this->get_document_kind( $post ),
			'modified' => get_post_modified_time( 'c', false, $post ),
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
