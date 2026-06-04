<?php
/**
 * Dashboard data provider.
 *
 * @package AdminOSMode
 */

defined( 'ABSPATH' ) || exit;

/**
 * Supplies lightweight shell dashboard metrics.
 */
final class Admin_OS_Mode_Dashboard_Data {
	/**
	 * Build dashboard stats.
	 *
	 * @return array<int,array<string,string>>
	 */
	public function get_stats() {
		$post_counts    = wp_count_posts( 'post' );
		$page_counts    = wp_count_posts( 'page' );
		$comment_counts = wp_count_comments();
		$media_counts   = wp_count_posts( 'attachment' );

		$stats = array(
			array(
				'label' => __( 'Posts', 'admin-os-mode' ),
				'value' => isset( $post_counts->publish ) ? number_format_i18n( (int) $post_counts->publish ) : '0',
			),
			array(
				'label' => __( 'Pages', 'admin-os-mode' ),
				'value' => isset( $page_counts->publish ) ? number_format_i18n( (int) $page_counts->publish ) : '0',
			),
			array(
				'label' => __( 'Media', 'admin-os-mode' ),
				'value' => isset( $media_counts->inherit ) ? number_format_i18n( (int) $media_counts->inherit ) : '0',
			),
			array(
				'label' => __( 'Comments', 'admin-os-mode' ),
				'value' => isset( $comment_counts->approved ) ? number_format_i18n( (int) $comment_counts->approved ) : '0',
			),
		);

		if ( current_user_can( 'activate_plugins' ) ) {
			$active_plugins = (array) get_option( 'active_plugins', array() );
			if ( is_multisite() ) {
				$active_plugins = array_merge( $active_plugins, array_keys( (array) get_site_option( 'active_sitewide_plugins', array() ) ) );
			}

			$stats[] = array(
				'label' => __( 'Active plugins', 'admin-os-mode' ),
				'value' => number_format_i18n( count( array_unique( $active_plugins ) ) ),
			);
		}

		return $stats;
	}

	/**
	 * Recent posts and pages for the welcome window.
	 *
	 * @return WP_Post[]
	 */
	public function get_recent_content() {
		return get_posts(
			array(
				'post_type'      => array( 'post', 'page' ),
				'post_status'    => array( 'publish', 'draft', 'pending', 'future', 'private' ),
				'posts_per_page' => 5,
				'orderby'        => 'modified',
				'order'          => 'DESC',
				'no_found_rows'  => true,
			)
		);
	}
}
