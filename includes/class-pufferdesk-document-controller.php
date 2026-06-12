<?php
/**
 * AJAX controller for Sticky Notes documents.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Exposes Sticky Notes document actions to the desktop runtime.
 */
final class PufferDesk_Document_Controller {
	const ACTION_LIST   = 'pufferdesk_list_documents';
	const ACTION_GET    = 'pufferdesk_get_document';
	const ACTION_CREATE = 'pufferdesk_create_document';
	const ACTION_UPDATE = 'pufferdesk_update_document';
	const ACTION_DELETE = 'pufferdesk_delete_document';
	const ACTION_DUPLICATE = 'pufferdesk_duplicate_document';
	const ACTION_RESTORE = 'pufferdesk_restore_document';

	/**
	 * Document service.
	 *
	 * @var PufferDesk_Document_Service
	 */
	private $documents;

	/**
	 * Constructor.
	 *
	 * @param PufferDesk_Document_Service $documents Document service.
	 */
	public function __construct( PufferDesk_Document_Service $documents ) {
		$this->documents = $documents;
	}

	/**
	 * Register WordPress hooks.
	 */
	public function hooks() {
		add_action( 'wp_ajax_' . self::ACTION_LIST, array( $this, 'list_documents' ) );
		add_action( 'wp_ajax_' . self::ACTION_GET, array( $this, 'get_document' ) );
		add_action( 'wp_ajax_' . self::ACTION_CREATE, array( $this, 'create_document' ) );
		add_action( 'wp_ajax_' . self::ACTION_UPDATE, array( $this, 'update_document' ) );
		add_action( 'wp_ajax_' . self::ACTION_DELETE, array( $this, 'delete_document' ) );
		add_action( 'wp_ajax_' . self::ACTION_DUPLICATE, array( $this, 'duplicate_document' ) );
		add_action( 'wp_ajax_' . self::ACTION_RESTORE, array( $this, 'restore_document' ) );
	}

	/**
	 * List Sticky Notes documents for the current user.
	 */
	public function list_documents() {
		$this->verify_request();

		$documents = $this->documents->list_documents( $this->get_post_string( 'kind' ), $this->get_parent_path() );
		if ( is_wp_error( $documents ) ) {
			$this->send_error( $documents );
		}

		wp_send_json_success(
			array(
				'documents' => $documents,
			)
		);
	}

	/**
	 * Get a single document.
	 */
	public function get_document() {
		$this->verify_request();

		$document = $this->documents->get_document( $this->get_post_id() );
		if ( is_wp_error( $document ) ) {
			$this->send_error( $document );
		}

		wp_send_json_success(
			array(
				'document' => $document,
			)
		);
	}

	/**
	 * Create a document.
	 */
	public function create_document() {
		$this->verify_request();

		$document = $this->documents->create_document(
			array(
				'color'   => $this->get_post_string( 'color' ),
				'content' => $this->get_post_string( 'content' ),
				'kind'    => $this->get_post_string( 'kind' ),
				'parentPath' => $this->get_parent_path(),
				'title'   => $this->get_post_string( 'title' ),
			)
		);

		if ( is_wp_error( $document ) ) {
			$this->send_error( $document );
		}

		wp_send_json_success(
			array(
				'document' => $document,
			)
		);
	}

	/**
	 * Update a document.
	 */
	public function update_document() {
		$this->verify_request();

		$payload = array();
		foreach ( array( 'color', 'content', 'kind', 'parentPath', 'title' ) as $key ) {
			if ( $this->has_post_string( $key ) ) {
				$payload[ $key ] = $this->get_post_string( $key );
			}
		}

		$document = $this->documents->update_document( $this->get_post_id(), $payload );

		if ( is_wp_error( $document ) ) {
			$this->send_error( $document );
		}

		wp_send_json_success(
			array(
				'document' => $document,
			)
		);
	}

	/**
	 * Duplicate a document.
	 */
	public function duplicate_document() {
		$this->verify_request();

		$payload = array();
		foreach ( array( 'parentPath', 'title' ) as $key ) {
			if ( $this->has_post_string( $key ) ) {
				$payload[ $key ] = $this->get_post_string( $key );
			}
		}

		$document = $this->documents->duplicate_document( $this->get_post_id(), $payload );
		if ( is_wp_error( $document ) ) {
			$this->send_error( $document );
		}

		wp_send_json_success(
			array(
				'document' => $document,
			)
		);
	}

	/**
	 * Trash or permanently delete a document.
	 */
	public function delete_document() {
		$this->verify_request();

		$deleted = $this->documents->delete_document( $this->get_post_id(), $this->get_post_bool( 'force' ) );
		if ( is_wp_error( $deleted ) ) {
			$this->send_error( $deleted );
		}

		wp_send_json_success(
			array(
				'deleted' => (bool) $deleted,
			)
		);
	}

	/**
	 * Restore a document from Trash.
	 */
	public function restore_document() {
		$this->verify_request();

		$document = $this->documents->restore_document(
			$this->get_post_id(),
			array(
				'parentPath' => $this->get_parent_path(),
			)
		);

		if ( is_wp_error( $document ) ) {
			$this->send_error( $document );
		}

		wp_send_json_success(
			array(
				'document' => $document,
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
					'message' => __( 'Security check failed.', 'pufferdesk-admin-desktop' ),
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
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- AJAX handlers verify the settings nonce before calling this helper.
		if ( ! isset( $_POST[ $key ] ) || is_array( $_POST[ $key ] ) ) {
			return '';
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Verified before calling this helper; document service sanitizes fields by semantic type.
		return (string) wp_unslash( $_POST[ $key ] );
	}

	/**
	 * Read a boolean-like scalar from POST.
	 *
	 * @param string $key POST key.
	 * @return bool
	 */
	private function get_post_bool( $key ) {
		$value = strtolower( $this->get_post_string( $key ) );

		return in_array( $value, array( '1', 'true', 'yes', 'on' ), true );
	}

	/**
	 * Whether a scalar POST value exists.
	 *
	 * @param string $key POST key.
	 * @return bool
	 */
	private function has_post_string( $key ) {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- AJAX handlers verify the settings nonce before calling this helper.
		return isset( $_POST[ $key ] ) && ! is_array( $_POST[ $key ] );
	}

	/**
	 * Read a document ID from POST.
	 *
	 * @return int
	 */
	private function get_post_id() {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- AJAX handlers verify the settings nonce before calling this helper.
		return isset( $_POST['id'] ) ? absint( $_POST['id'] ) : 0;
	}

	/**
	 * Read the canonical parent path from POST.
	 *
	 * @return string
	 */
	private function get_parent_path() {
		if ( $this->has_post_string( 'parentPath' ) ) {
			return $this->get_post_string( 'parentPath' );
		}

		return $this->get_post_string( 'path' );
	}

	/**
	 * Send a normalized AJAX error.
	 *
	 * @param WP_Error $error Error object.
	 */
	private function send_error( WP_Error $error ) {
		$data   = $error->get_error_data();
		$status = is_array( $data ) && ! empty( $data['status'] ) ? absint( $data['status'] ) : 400;

		wp_send_json_error(
			array(
				'code'    => $error->get_error_code(),
				'message' => $error->get_error_message(),
			),
			$status
		);
	}
}
