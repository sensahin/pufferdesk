<?php
/**
 * Workspace state AJAX actions.
 *
 * @package WPAdminOS
 */

defined( 'ABSPATH' ) || exit;

/**
 * Handles load/save/reset actions for user workspace state.
 */
final class WP_AdminOS_Workspace_Controller {
	/**
	 * User preferences.
	 *
	 * @var WP_AdminOS_User_Preferences
	 */
	private $preferences;

	/**
	 * App registry.
	 *
	 * @var WP_AdminOS_App_Registry
	 */
	private $app_registry;

	/**
	 * Widget registry.
	 *
	 * @var WP_AdminOS_Widget_Registry
	 */
	private $widget_registry;

	/**
	 * Theme registry.
	 *
	 * @var WP_AdminOS_Theme_Registry
	 */
	private $theme_registry;

	/**
	 * Workspace state service.
	 *
	 * @var WP_AdminOS_Workspace_State
	 */
	private $workspace_state;

	/**
	 * Constructor.
	 *
	 * @param WP_AdminOS_User_Preferences $preferences User preferences.
	 * @param WP_AdminOS_App_Registry     $app_registry App registry.
	 * @param WP_AdminOS_Widget_Registry  $widget_registry Widget registry.
	 * @param WP_AdminOS_Theme_Registry   $theme_registry Theme registry.
	 * @param WP_AdminOS_Workspace_State  $workspace_state Workspace state service.
	 */
	public function __construct(
		WP_AdminOS_User_Preferences $preferences,
		WP_AdminOS_App_Registry $app_registry,
		WP_AdminOS_Widget_Registry $widget_registry,
		WP_AdminOS_Theme_Registry $theme_registry,
		WP_AdminOS_Workspace_State $workspace_state
	) {
		$this->preferences     = $preferences;
		$this->app_registry    = $app_registry;
		$this->widget_registry = $widget_registry;
		$this->theme_registry  = $theme_registry;
		$this->workspace_state = $workspace_state;
	}

	/**
	 * Register AJAX hooks.
	 */
	public function hooks() {
		add_action( 'wp_ajax_wp_adminos_load_workspace_state', array( $this, 'load_state' ) );
		add_action( 'wp_ajax_wp_adminos_save_workspace_state', array( $this, 'save_state' ) );
		add_action( 'wp_ajax_wp_adminos_reset_workspace_state', array( $this, 'reset_state' ) );
	}

	/**
	 * Load current-user workspace state for a theme.
	 */
	public function load_state() {
		$this->authorize();

		$theme_id = $this->get_request_theme_id();
		$context  = $this->get_workspace_context();
		$state    = $this->workspace_state->get_state(
			$theme_id,
			$context['apps'],
			$context['widgets'],
			$context['folders']
		);

		wp_send_json_success(
			array(
				'workspaceState' => $state,
			)
		);
	}

	/**
	 * Save current-user workspace state for a theme.
	 */
	public function save_state() {
		$this->authorize();

		$theme_id            = $this->get_request_theme_id();
		$context             = $this->get_workspace_context();
		$payload             = $this->read_json_payload( 'state' );
		$expected_updated_at = $this->read_timestamp_value( 'expected_updated_at' );
		$state               = $this->workspace_state->set_state(
			$theme_id,
			is_array( $payload ) ? $payload : array(),
			$context['apps'],
			$context['widgets'],
			$context['folders'],
			0,
			$expected_updated_at
		);

		if ( is_wp_error( $state ) ) {
			$error_data = $state->get_error_data();
			$status     = is_array( $error_data ) && ! empty( $error_data['status'] ) ? absint( $error_data['status'] ) : 400;

			wp_send_json_error(
				array(
					'conflict'            => 'wp_adminos_workspace_conflict' === $state->get_error_code(),
					'currentUpdatedAt'    => is_array( $error_data ) && isset( $error_data['current_updated_at'] ) ? absint( $error_data['current_updated_at'] ) : 0,
					'message'             => $state->get_error_message(),
					'workspaceState'      => is_array( $error_data ) && isset( $error_data['workspace_state'] ) && is_array( $error_data['workspace_state'] )
						? $error_data['workspace_state']
						: $this->workspace_state->get_state( $theme_id, $context['apps'], $context['widgets'], $context['folders'] ),
				),
				$status
			);
		}

		wp_send_json_success(
			array(
				'message'        => __( 'Workspace saved.', 'wp-adminos' ),
				'workspaceState' => $state,
			)
		);
	}

	/**
	 * Reset current-user workspace state.
	 */
	public function reset_state() {
		$this->authorize();

		$scope = sanitize_key( $this->read_post_value( 'scope' ) );
		if ( 'all' === $scope ) {
			$this->workspace_state->delete_all_states();
		} else {
			$this->workspace_state->delete_state( $this->get_request_theme_id() );
		}

		wp_send_json_success(
			array(
				'message'        => __( 'Workspace layout reset.', 'wp-adminos' ),
				'workspaceState' => $this->workspace_state->get_default_state(),
			)
		);
	}

	/**
	 * Ensure the request can mutate current-user workspace state.
	 */
	private function authorize() {
		if ( ! is_user_logged_in() || ! current_user_can( 'read' ) ) {
			wp_send_json_error(
				array(
					'message' => __( 'You do not have permission to change WP adminOS workspace state.', 'wp-adminos' ),
				),
				403
			);
		}

		check_ajax_referer( WP_AdminOS_Settings_Controller::NONCE_ACTION, 'nonce' );
	}

	/**
	 * Resolve and validate a request theme ID.
	 *
	 * @return string
	 */
	private function get_request_theme_id() {
		$theme_id = sanitize_key( $this->read_post_value( 'theme_id' ) );

		if ( '' === $theme_id ) {
			$current  = $this->theme_registry->get_current_theme( $this->preferences );
			$theme_id = isset( $current['id'] ) ? sanitize_key( (string) $current['id'] ) : '';
		}

		$themes = $this->theme_registry->get_themes();
		if ( empty( $themes[ $theme_id ] ) || ! empty( $themes[ $theme_id ]['abstract'] ) ) {
			wp_send_json_error(
				array(
					'message' => __( 'The selected WP adminOS theme is not available.', 'wp-adminos' ),
				),
				400
			);
		}

		return $theme_id;
	}

	/**
	 * Build registry context used by the workspace sanitizer.
	 *
	 * @return array<string,array<int,array<string,mixed>>>
	 */
	private function get_workspace_context() {
		$apps         = $this->app_registry->get_apps();
		$folders      = array_merge(
			$this->app_registry->get_folders( $apps ),
			$this->preferences->get_desktop_folders( $apps )
		);
		$widgets      = $this->widget_registry->get_widgets();

		return array(
			'apps'    => $apps,
			'folders' => $folders,
			'widgets' => $widgets,
		);
	}

	/**
	 * Read a scalar POST value.
	 *
	 * @param string $key POST key.
	 * @return string
	 */
	private function read_post_value( $key ) {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- AJAX handlers verify the settings nonce before calling this helper.
		if ( ! isset( $_POST[ $key ] ) || is_array( $_POST[ $key ] ) ) {
			return '';
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- AJAX handlers verify the settings nonce before calling this helper.
		return sanitize_text_field( wp_unslash( $_POST[ $key ] ) );
	}

	/**
	 * Read a JavaScript millisecond timestamp from POST.
	 *
	 * @param string $key POST key.
	 * @return int
	 */
	private function read_timestamp_value( $key ) {
		$value = $this->read_post_value( $key );
		if ( '' === $value || ! is_numeric( $value ) ) {
			return 0;
		}

		return max( 0, min( PHP_INT_MAX, (int) round( (float) $value ) ) );
	}

	/**
	 * Read a JSON POST payload.
	 *
	 * @param string $key POST key.
	 * @return mixed
	 */
	private function read_json_payload( $key ) {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- AJAX handlers verify the settings nonce before calling this helper.
		if ( ! isset( $_POST[ $key ] ) || is_array( $_POST[ $key ] ) ) {
			return array();
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- AJAX handlers verify the settings nonce before calling this helper. The decoded payload is sanitized by WP_AdminOS_Workspace_State.
		$raw     = sanitize_textarea_field( wp_unslash( $_POST[ $key ] ) );
		$decoded = json_decode( (string) $raw, true );

		return is_array( $decoded ) ? $decoded : array();
	}
}
