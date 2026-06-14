<?php
/**
 * AJAX controller for WordPress content search.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Exposes searchable WordPress content to the desktop runtime.
 */
final class PufferDesk_Content_Search_Controller {
	const ACTION_SEARCH = 'pufferdesk_search_content';

	/**
	 * Content search service.
	 *
	 * @var PufferDesk_Content_Search_Service
	 */
	private $search;

	/**
	 * Constructor.
	 *
	 * @param PufferDesk_Content_Search_Service $search Content search service.
	 */
	public function __construct( PufferDesk_Content_Search_Service $search ) {
		$this->search = $search;
	}

	/**
	 * Register WordPress hooks.
	 */
	public function hooks() {
		add_action( 'wp_ajax_' . self::ACTION_SEARCH, array( $this, 'search_content' ) );
	}

	/**
	 * Search posts, pages, and media for the current user.
	 */
	public function search_content() {
		$this->verify_request();

		if ( ! current_user_can( 'read' ) ) {
			wp_send_json_error(
				array(
					'message' => __( 'You are not allowed to search content.', 'pufferdesk' ),
				),
				403
			);
		}

		wp_send_json_success(
			array(
				'results' => $this->search->search(
					$this->get_post_string( 'query' ),
					array(
						'limit' => $this->get_post_int( 'limit' ),
					)
				),
			)
		);
	}

	/**
	 * Verify the shared shell AJAX nonce.
	 */
	private function verify_request() {
		if ( ! check_ajax_referer( PufferDesk_Settings_Controller::NONCE_ACTION, 'nonce', false ) ) {
			wp_send_json_error(
				array(
					'message' => __( 'Security check failed.', 'pufferdesk' ),
				),
				403
			);
		}
	}

	/**
	 * Read a scalar string from POST.
	 *
	 * @param string $key POST key.
	 * @return string
	 */
	private function get_post_string( $key ) {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- AJAX handlers verify the shared shell nonce before calling this helper.
		if ( ! isset( $_POST[ $key ] ) || is_array( $_POST[ $key ] ) ) {
			return '';
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Verified before calling this helper; service sanitizes by semantic type.
		return (string) wp_unslash( $_POST[ $key ] );
	}

	/**
	 * Read an integer from POST.
	 *
	 * @param string $key POST key.
	 * @return int
	 */
	private function get_post_int( $key ) {
		return absint( $this->get_post_string( $key ) );
	}
}
