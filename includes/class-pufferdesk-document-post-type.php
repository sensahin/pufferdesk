<?php
/**
 * Private Sticky Notes post type registration.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Registers the private content container used by Sticky Notes.
 */
final class PufferDesk_Document_Post_Type {
	const POST_TYPE   = 'pufferdesk_note';
	const META_KIND   = '_pufferdesk_document_kind';
	const META_COLOR  = '_pufferdesk_document_color';
	const META_FORMAT = '_pufferdesk_document_format';
	const META_PARENT_PATH = '_pufferdesk_document_parent_path';

	/**
	 * Register WordPress hooks.
	 */
	public function hooks() {
		add_action( 'init', array( $this, 'register' ) );
	}

	/**
	 * Register the private post type.
	 */
	public function register() {
		register_post_type(
			self::POST_TYPE,
			array(
				'labels'              => array(
					'name'          => PufferDesk_Product_Labels::documents_name(),
					'singular_name' => PufferDesk_Product_Labels::document_name(),
				),
				'capability_type'     => 'post',
				'delete_with_user'    => true,
				'exclude_from_search' => true,
				'has_archive'         => false,
				'map_meta_cap'        => true,
				'public'              => false,
				'publicly_queryable'  => false,
				'query_var'           => false,
				'rewrite'             => false,
				'show_in_admin_bar'   => false,
				'show_in_menu'        => false,
				'show_in_nav_menus'   => false,
				'show_in_rest'        => false,
				'show_ui'             => false,
				'supports'            => array( 'title', 'editor', 'author', 'revisions' ),
			)
		);
	}
}
