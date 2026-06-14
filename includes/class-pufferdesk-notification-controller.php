<?php
/**
 * Notification AJAX actions.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Handles notification refresh, read, and dismiss actions.
 */
final class PufferDesk_Notification_Controller {
	/**
	 * Notification registry.
	 *
	 * @var PufferDesk_Notification_Registry
	 */
	private $notifications;

	/**
	 * Constructor.
	 *
	 * @param PufferDesk_Notification_Registry $notifications Notification registry.
	 */
	public function __construct( PufferDesk_Notification_Registry $notifications ) {
		$this->notifications = $notifications;
	}

	/**
	 * Register AJAX hooks.
	 */
	public function hooks() {
		add_action( 'wp_ajax_' . PufferDesk_Notification_Registry::ACTION_REFRESH, array( $this, 'refresh' ) );
		add_action( 'wp_ajax_' . PufferDesk_Notification_Registry::ACTION_MARK_READ, array( $this, 'mark_read' ) );
		add_action( 'wp_ajax_' . PufferDesk_Notification_Registry::ACTION_MARK_ALL_READ, array( $this, 'mark_all_read' ) );
		add_action( 'wp_ajax_' . PufferDesk_Notification_Registry::ACTION_DISMISS, array( $this, 'dismiss' ) );
	}

	/**
	 * Refresh provider-backed notifications.
	 */
	public function refresh() {
		$this->authorize();

		wp_send_json_success(
			array(
				'notifications' => $this->notifications->get_client_config(),
			)
		);
	}

	/**
	 * Mark notifications read.
	 */
	public function mark_read() {
		$this->authorize();

		wp_send_json_success(
			array(
				'notifications' => $this->notifications->mark_read( $this->read_ids() ),
			)
		);
	}

	/**
	 * Mark every current notification read.
	 */
	public function mark_all_read() {
		$this->authorize();

		wp_send_json_success(
			array(
				'notifications' => $this->notifications->mark_all_read(),
			)
		);
	}

	/**
	 * Dismiss notifications.
	 */
	public function dismiss() {
		$this->authorize();

		wp_send_json_success(
			array(
				'notifications' => $this->notifications->dismiss( $this->read_ids() ),
			)
		);
	}

	/**
	 * Verify current user and nonce.
	 */
	private function authorize() {
		if ( ! is_user_logged_in() || ! current_user_can( 'read' ) ) {
			wp_send_json_error(
				array(
					'message' => __( 'You do not have permission to manage notifications.', 'pufferdesk' ),
				),
				403
			);
		}

		check_ajax_referer( PufferDesk_Settings_Controller::NONCE_ACTION, 'nonce' );
	}

	/**
	 * Read notification IDs from POST.
	 *
	 * @return array<int,string>
	 */
	private function read_ids() {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Verified by authorize().
		$raw = isset( $_POST['ids'] ) && ! is_array( $_POST['ids'] )
			// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Verified by authorize().
			? sanitize_textarea_field( wp_unslash( $_POST['ids'] ) )
			: '';
		$ids = json_decode( $raw, true );

		if ( is_array( $ids ) ) {
			return array_values(
				array_filter(
					array_map(
						static function ( $id ) {
							return sanitize_key( (string) $id );
						},
						$ids
					)
				)
			);
		}

		$id = sanitize_key( $raw );

		return '' === $id ? array() : array( $id );
	}
}
