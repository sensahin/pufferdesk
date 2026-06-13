<?php
/**
 * WordPress content search service for shell search.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Builds compact, capability-aware WordPress content search results.
 */
final class PufferDesk_Content_Search_Service {
	const DEFAULT_LIMIT = 18;
	const MAX_LIMIT     = 36;

	/**
	 * Search WordPress content for the shell search surface.
	 *
	 * @param string              $query Search query.
	 * @param array<string,mixed> $args Search arguments.
	 * @return array<int,array<string,mixed>>
	 */
	public function search( $query, $args = array() ) {
		$query = $this->sanitize_query( $query );

		if ( '' === $query || ! current_user_can( 'read' ) ) {
			return array();
		}

		$limit      = $this->sanitize_limit( isset( $args['limit'] ) ? $args['limit'] : self::DEFAULT_LIMIT );
		$post_types = $this->get_post_types();
		$per_type   = max( 3, (int) ceil( $limit / max( 1, count( $post_types ) ) ) );
		$results    = array();

		foreach ( $post_types as $post_type ) {
			foreach ( $this->query_post_type( $post_type, $query, $per_type ) as $post ) {
				$result = $this->prepare_result( $post );

				if ( $result ) {
					$results[] = $result;
				}
			}
		}

		return array_slice( $results, 0, $limit );
	}

	/**
	 * Searchable built-in post types.
	 *
	 * @return array<int,string>
	 */
	private function get_post_types() {
		return array( 'post', 'page', 'attachment' );
	}

	/**
	 * Query a single post type.
	 *
	 * @param string $post_type Post type.
	 * @param string $query Search query.
	 * @param int    $limit Result limit.
	 * @return array<int,WP_Post>
	 */
	private function query_post_type( $post_type, $query, $limit ) {
		$post_type_object = get_post_type_object( $post_type );

		if ( ! $post_type_object || empty( $post_type_object->show_ui ) ) {
			return array();
		}

		$posts = get_posts(
			array(
				'has_password'           => false,
				'ignore_sticky_posts'    => true,
				'no_found_rows'          => true,
				'orderby'                => 'relevance',
				'order'                  => 'DESC',
				'post_status'            => $this->get_query_post_statuses( $post_type ),
				'post_type'              => $post_type,
				'posts_per_page'         => $limit,
				's'                      => $query,
				'update_post_meta_cache' => false,
				'update_post_term_cache' => false,
			)
		);

		return array_values( array_filter( $posts, array( $this, 'can_include_post' ) ) );
	}

	/**
	 * Post statuses to query before per-post capability filtering.
	 *
	 * @param string $post_type Post type.
	 * @return array<int,string>
	 */
	private function get_query_post_statuses( $post_type ) {
		if ( 'attachment' === $post_type ) {
			return array( 'inherit', 'private' );
		}

		return array( 'publish', 'future', 'draft', 'pending', 'private' );
	}

	/**
	 * Whether the current user may see and open this result in wp-admin.
	 *
	 * @param WP_Post $post Post object.
	 * @return bool
	 */
	private function can_include_post( $post ) {
		if ( ! $post instanceof WP_Post || ! $post->ID || ! current_user_can( 'edit_post', $post->ID ) ) {
			return false;
		}

		if ( in_array( $post->post_status, array( 'auto-draft', 'trash' ), true ) ) {
			return false;
		}

		$status = get_post_status_object( $post->post_status );

		return $status && ( empty( $status->internal ) || 'inherit' === $post->post_status );
	}

	/**
	 * Prepare a compact client result.
	 *
	 * @param WP_Post $post Post object.
	 * @return array<string,mixed>|null
	 */
	private function prepare_result( WP_Post $post ) {
		$type = $this->get_type_descriptor( $post->post_type );

		if ( ! $type ) {
			return null;
		}

		$title        = $this->get_post_title( $post );
		$status      = get_post_status_object( $post->post_status );
		$status_label = $status && ! empty( $status->label ) ? $status->label : $post->post_status;
		$snippet      = $this->get_post_snippet( $post );

		return array(
			'command'  => PufferDesk_Command_Ids::OPEN_URL,
			'icon'     => $type['icon'],
			'id'       => 'wp-content-' . $post->ID,
			'keywords' => $this->get_keywords( $post ),
			'label'    => $title,
			'postId'   => $post->ID,
			'postType' => $post->post_type,
			'snippet'  => $snippet,
			'subtitle' => sprintf(
				/* translators: 1: content type label, 2: post status label. */
				__( '%1$s - %2$s', 'pufferdesk-admin-desktop' ),
				$type['label'],
				$status_label
			),
			'target'   => (string) $post->ID,
			'title'    => $title,
			'type'     => $type['type'],
			'url'      => $this->get_edit_url( $post ),
		);
	}

	/**
	 * Result type metadata.
	 *
	 * @param string $post_type Post type.
	 * @return array<string,string>|null
	 */
	private function get_type_descriptor( $post_type ) {
		$types = array(
			'post'       => array(
				'icon'  => 'dashicons-admin-post',
				'label' => __( 'Post', 'pufferdesk-admin-desktop' ),
				'type'  => 'wp_post',
			),
			'page'       => array(
				'icon'  => 'dashicons-admin-page',
				'label' => __( 'Page', 'pufferdesk-admin-desktop' ),
				'type'  => 'wp_page',
			),
			'attachment' => array(
				'icon'  => 'dashicons-admin-media',
				'label' => __( 'Media', 'pufferdesk-admin-desktop' ),
				'type'  => 'wp_attachment',
			),
		);

		return isset( $types[ $post_type ] ) ? $types[ $post_type ] : null;
	}

	/**
	 * Admin URL for the matching content item.
	 *
	 * @param WP_Post $post Post object.
	 * @return string
	 */
	private function get_edit_url( WP_Post $post ) {
		if ( 'attachment' === $post->post_type ) {
			return esc_url_raw( admin_url( 'upload.php?item=' . absint( $post->ID ) ) );
		}

		return esc_url_raw( get_edit_post_link( $post->ID, 'raw' ) );
	}

	/**
	 * Plain text post title.
	 *
	 * @param WP_Post $post Post object.
	 * @return string
	 */
	private function get_post_title( WP_Post $post ) {
		$title = trim( wp_strip_all_tags( get_the_title( $post ), true ) );

		if ( '' !== $title ) {
			return html_entity_decode( $title, ENT_QUOTES, get_bloginfo( 'charset' ) );
		}

		return 'attachment' === $post->post_type
			? __( 'Untitled media item', 'pufferdesk-admin-desktop' )
			: __( 'Untitled', 'pufferdesk-admin-desktop' );
	}

	/**
	 * Compact content snippet.
	 *
	 * @param WP_Post $post Post object.
	 * @return string
	 */
	private function get_post_snippet( WP_Post $post ) {
		$text = '';

		if ( 'attachment' === $post->post_type ) {
			$text = $post->post_excerpt ? $post->post_excerpt : $this->get_attachment_filename( $post->ID );
		} elseif ( has_excerpt( $post ) ) {
			$text = get_the_excerpt( $post );
		} else {
			$text = $post->post_content;
		}

		$text = trim( preg_replace( '/\s+/', ' ', wp_strip_all_tags( strip_shortcodes( (string) $text ), true ) ) );

		return '' === $text ? '' : html_entity_decode( wp_html_excerpt( $text, 140, '...' ), ENT_QUOTES, get_bloginfo( 'charset' ) );
	}

	/**
	 * Search keywords not already present in title/snippet.
	 *
	 * @param WP_Post $post Post object.
	 * @return array<int,string>
	 */
	private function get_keywords( WP_Post $post ) {
		$keywords = array( $post->post_type, $post->post_status );

		if ( 'attachment' === $post->post_type ) {
			$keywords[] = get_post_mime_type( $post );
			$keywords[] = $this->get_attachment_filename( $post->ID );
		}

		return array_values( array_filter( array_map( 'strval', $keywords ) ) );
	}

	/**
	 * Public attachment filename without exposing the server path.
	 *
	 * @param int $post_id Attachment ID.
	 * @return string
	 */
	private function get_attachment_filename( $post_id ) {
		$file = get_attached_file( $post_id );

		return is_string( $file ) && '' !== $file ? wp_basename( $file ) : '';
	}

	/**
	 * Sanitize search query.
	 *
	 * @param mixed $query Raw query.
	 * @return string
	 */
	private function sanitize_query( $query ) {
		return trim( sanitize_text_field( (string) $query ) );
	}

	/**
	 * Sanitize result limit.
	 *
	 * @param mixed $limit Raw limit.
	 * @return int
	 */
	private function sanitize_limit( $limit ) {
		$limit = absint( $limit );

		if ( ! $limit ) {
			return self::DEFAULT_LIMIT;
		}

		return min( self::MAX_LIMIT, max( 1, $limit ) );
	}
}
