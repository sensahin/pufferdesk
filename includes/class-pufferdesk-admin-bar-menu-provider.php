<?php
/**
 * WordPress admin bar menu adapters.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Converts selected WordPress admin bar nodes into PufferDesk menu items.
 */
final class PufferDesk_Admin_Bar_Menu_Provider {
	const NEW_CONTENT_PARENT_ID = 'new-content';

	/**
	 * Standard WordPress + New item IDs.
	 *
	 * @var array<int,string>
	 */
	private $standard_new_content_ids = array(
		'new-post',
		'new-media',
		'new-page',
		'new-user',
	);

	/**
	 * Cached New Content menu items.
	 *
	 * @var array<string,array<int,array<string,mixed>>>|null
	 */
	private $new_content_groups = null;

	/**
	 * Get command-backed item groups from the WordPress admin bar + New menu.
	 *
	 * @return array<string,array<int,array<string,mixed>>>
	 */
	public function get_new_content_groups() {
		if ( null !== $this->new_content_groups ) {
			return $this->new_content_groups;
		}

		$groups = $this->get_empty_new_content_groups();
		if ( ! is_user_logged_in() ) {
			$this->new_content_groups = $groups;

			return $this->new_content_groups;
		}

		$nodes = $this->get_admin_bar_nodes();
		if ( empty( $nodes ) || empty( $nodes[ self::NEW_CONTENT_PARENT_ID ] ) ) {
			$this->new_content_groups = $groups;

			return $this->new_content_groups;
		}

		$children = $this->get_nodes_by_parent( $nodes );

		foreach ( isset( $children[ self::NEW_CONTENT_PARENT_ID ] ) ? $children[ self::NEW_CONTENT_PARENT_ID ] : array() as $node ) {
			$item = $this->normalize_new_content_node( $node, $children );
			if ( ! empty( $item ) ) {
				$group_id            = $this->is_standard_new_content_node( $node ) ? 'standard' : 'other';
				$groups[ $group_id ][] = $item;
			}
		}

		$this->new_content_groups = $groups;

		return $this->new_content_groups;
	}

	/**
	 * Empty New Content group shape.
	 *
	 * @return array<string,array<int,array<string,mixed>>>
	 */
	private function get_empty_new_content_groups() {
		return array(
			'standard' => array(),
			'other'    => array(),
		);
	}

	/**
	 * Whether an admin bar node is one of WordPress's standard + New items.
	 *
	 * @param object $node Admin bar node.
	 * @return bool
	 */
	private function is_standard_new_content_node( $node ) {
		return is_object( $node )
			&& ! empty( $node->id )
			&& in_array( sanitize_key( (string) $node->id ), $this->standard_new_content_ids, true );
	}

	/**
	 * Get a WordPress admin bar node snapshot.
	 *
	 * @return array<string,object>
	 */
	private function get_admin_bar_nodes() {
		global $wp_admin_bar;

		if ( class_exists( 'WP_Admin_Bar' ) && $wp_admin_bar instanceof WP_Admin_Bar ) {
			$nodes = $wp_admin_bar->get_nodes();
			if ( is_array( $nodes ) && isset( $nodes[ self::NEW_CONTENT_PARENT_ID ] ) ) {
				return $nodes;
			}
		}

		return $this->build_admin_bar_nodes_snapshot();
	}

	/**
	 * Build an isolated admin bar snapshot so runtime config is not tied to render timing.
	 *
	 * @return array<string,object>
	 */
	private function build_admin_bar_nodes_snapshot() {
		global $wp_admin_bar;

		if ( ! class_exists( 'WP_Admin_Bar' ) ) {
			require_once ABSPATH . WPINC . '/class-wp-admin-bar.php';
		}

		if ( ! class_exists( 'WP_Admin_Bar' ) ) {
			return array();
		}

		$snapshot = new WP_Admin_Bar();
		if ( class_exists( 'WP_Admin_Bar' ) && $wp_admin_bar instanceof WP_Admin_Bar && isset( $wp_admin_bar->user ) ) {
			$snapshot->user = is_object( $wp_admin_bar->user ) ? clone $wp_admin_bar->user : $wp_admin_bar->user;
			do_action_ref_array( 'admin_bar_menu', array( &$snapshot ) );
		}

		$nodes = $snapshot->get_nodes();
		$nodes = is_array( $nodes ) ? $nodes : array();
		if ( isset( $nodes[ self::NEW_CONTENT_PARENT_ID ] ) ) {
			return $nodes;
		}

		if ( function_exists( 'wp_admin_bar_new_content_menu' ) ) {
			wp_admin_bar_new_content_menu( $snapshot );
			$nodes = $snapshot->get_nodes();
		}

		return is_array( $nodes ) ? $nodes : array();
	}

	/**
	 * Group admin bar nodes by parent ID while preserving node order.
	 *
	 * @param array<string,object> $nodes Admin bar nodes.
	 * @return array<string,array<int,object>>
	 */
	private function get_nodes_by_parent( $nodes ) {
		$children = array();

		foreach ( $nodes as $node ) {
			if ( ! is_object( $node ) || empty( $node->id ) || empty( $node->parent ) ) {
				continue;
			}

			$parent = (string) $node->parent;
			if ( ! isset( $children[ $parent ] ) ) {
				$children[ $parent ] = array();
			}

			$children[ $parent ][] = $node;
		}

		return $children;
	}

	/**
	 * Normalize an admin bar node into a PufferDesk menu item.
	 *
	 * @param object                              $node Admin bar node.
	 * @param array<string,array<int,object>>     $children Nodes grouped by parent.
	 * @param array<string,bool>                  $seen Seen node IDs.
	 * @return array<string,mixed>
	 */
	private function normalize_new_content_node( $node, $children, $seen = array() ) {
		if ( ! is_object( $node ) || empty( $node->id ) ) {
			return array();
		}

		$id = sanitize_key( (string) $node->id );
		if ( '' === $id || isset( $seen[ $id ] ) ) {
			return array();
		}

		$seen[ $id ] = true;
		$label       = $this->format_standard_new_content_label(
			$this->normalize_node_label( isset( $node->title ) ? $node->title : '' ),
			$node
		);
		$url         = $this->normalize_node_url( isset( $node->href ) ? $node->href : '' );
		$child_items = array();

		foreach ( isset( $children[ $id ] ) ? $children[ $id ] : array() as $child ) {
			$item = $this->normalize_new_content_node( $child, $children, $seen );
			if ( ! empty( $item ) ) {
				$child_items[] = $item;
			}
		}

		if ( '' === $label || ( '' === $url && empty( $child_items ) ) ) {
			return array();
		}

		$item = array(
			'id'    => 'wp-admin-bar-' . $id,
			'label' => $label,
		);
		$icon = $this->get_standard_new_content_icon( $node );
		if ( '' !== $icon ) {
			$item['icon'] = $icon;
		}

		if ( '' !== $url ) {
			$item['command'] = $this->is_wordpress_admin_url( $url )
				? PufferDesk_Command_Ids::OPEN_URL
				: PufferDesk_Command_Ids::OPEN_EXTERNAL_URL;
			$item['url']     = $url;
			$item['title']   = $label;
		}

		if ( ! empty( $child_items ) ) {
			$item['items'] = $child_items;
		}

		return $item;
	}

	/**
	 * Format WordPress's standard + New items for create surfaces.
	 *
	 * @param string $label Raw node label.
	 * @param object $node Admin bar node.
	 * @return string
	 */
	private function format_standard_new_content_label( $label, $node ) {
		if ( '' === $label || ! $this->is_standard_new_content_node( $node ) ) {
			return $label;
		}

		if ( preg_match( '/^(new|add new)\b/i', $label ) ) {
			return $label;
		}

		return sprintf(
			/* translators: %s: content type label. */
			__( 'New %s', 'pufferdesk-admin-desktop' ),
			$label
		);
	}

	/**
	 * Get an icon for known WordPress standard + New items.
	 *
	 * @param object $node Admin bar node.
	 * @return string
	 */
	private function get_standard_new_content_icon( $node ) {
		if ( ! is_object( $node ) || empty( $node->id ) ) {
			return '';
		}

		$icons = array(
			'new-post'  => 'dashicons-admin-post',
			'new-media' => 'dashicons-admin-media',
			'new-page'  => 'dashicons-admin-page',
			'new-user'  => 'dashicons-admin-users',
		);
		$id    = sanitize_key( (string) $node->id );

		return isset( $icons[ $id ] ) ? $icons[ $id ] : '';
	}

	/**
	 * Normalize a node title into plain visible text.
	 *
	 * @param mixed $label Raw label.
	 * @return string
	 */
	private function normalize_node_label( $label ) {
		$label = wp_strip_all_tags( is_scalar( $label ) ? (string) $label : '' );
		$label = html_entity_decode( $label, ENT_QUOTES, get_bloginfo( 'charset' ) );

		return sanitize_text_field( trim( $label ) );
	}

	/**
	 * Normalize a node URL.
	 *
	 * @param mixed $url Raw URL.
	 * @return string
	 */
	private function normalize_node_url( $url ) {
		$url = is_scalar( $url ) ? trim( html_entity_decode( (string) $url, ENT_QUOTES ) ) : '';
		if ( '' === $url || '#' === $url ) {
			return '';
		}

		return esc_url_raw( $url );
	}

	/**
	 * Whether a URL belongs to one of the WordPress admin areas.
	 *
	 * @param string $url URL to test.
	 * @return bool
	 */
	private function is_wordpress_admin_url( $url ) {
		foreach ( array( admin_url(), network_admin_url(), user_admin_url() ) as $admin_base ) {
			if ( 0 === strpos( $url, $admin_base ) ) {
				return true;
			}
		}

		return false;
	}
}
