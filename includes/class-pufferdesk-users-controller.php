<?php
/**
 * Native Users app data controller.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Exposes WordPress user data and essential user workflows to the native Users app.
 */
final class PufferDesk_Users_Controller {
	const ACTION_CREATE = 'pufferdesk_create_user';
	const ACTION_GET_PROFILE = 'pufferdesk_get_user_profile';
	const ACTION_LIST = 'pufferdesk_list_users';
	const ACTION_UPDATE_PROFILE = 'pufferdesk_update_user_profile';
	const CAPABILITY = 'list_users';
	const CAPABILITY_CREATE = 'create_users';
	const LIST_PER_PAGE = 50;
	const LIST_PER_PAGE_MAX = 100;

	/**
	 * Register WordPress hooks.
	 */
	public function hooks() {
		add_action( 'wp_ajax_' . self::ACTION_LIST, array( $this, 'list_users' ) );
		add_action( 'wp_ajax_' . self::ACTION_CREATE, array( $this, 'create_user' ) );
		add_action( 'wp_ajax_' . self::ACTION_GET_PROFILE, array( $this, 'get_profile' ) );
		add_action( 'wp_ajax_' . self::ACTION_UPDATE_PROFILE, array( $this, 'update_profile' ) );
	}

	/**
	 * List users visible to the current account.
	 */
	public function list_users() {
		$this->authorize( self::CAPABILITY, __( 'You do not have permission to view users.', 'pufferdesk' ) );

		$page     = max( 1, absint( $this->read_post_value( 'page' ) ) );
		$per_page = $this->normalize_per_page( $this->read_post_value( 'per_page' ) );
		$search   = sanitize_text_field( $this->read_post_value( 'search' ) );
		$role     = sanitize_key( $this->read_post_value( 'role' ) );
		$query    = $this->query_users( $page, $per_page, $search, $role );
		$users    = $query['users'];
		$total    = $query['total'];
		$pages    = $query['pages'];
		$page     = $query['page'];

		wp_send_json_success(
			array(
				'roleOptions' => $this->get_editable_role_options(),
				'roles'       => $this->get_role_filter_options(),
				'pagination'  => array(
					'count'    => count( $users ),
					'from'     => ! empty( $users ) ? ( ( $page - 1 ) * $per_page ) + 1 : 0,
					'hasNext'  => $page < $pages,
					'hasPrev'  => $page > 1,
					'page'     => $page,
					'pages'    => $pages,
					'perPage'  => $per_page,
					'to'       => ! empty( $users ) ? ( ( $page - 1 ) * $per_page ) + count( $users ) : 0,
					'total'    => $total,
				),
				'total'       => $total,
				'users'       => array_values( array_map( array( $this, 'normalize_user' ), $users ) ),
			)
		);
	}

	/**
	 * Create a user from the essential native Add User form.
	 */
	public function create_user() {
		$this->authorize( self::CAPABILITY_CREATE, __( 'You do not have permission to add users.', 'pufferdesk' ) );

		$email = sanitize_email( $this->read_post_value( 'email' ) );
		$name  = sanitize_text_field( $this->read_post_value( 'name' ) );
		$role  = sanitize_key( $this->read_post_value( 'role' ) );
		$login = sanitize_user( $this->read_post_value( 'username' ), true );
		$first = sanitize_text_field( $this->read_post_value( 'first_name' ) );
		$last  = sanitize_text_field( $this->read_post_value( 'last_name' ) );
		$send  = $this->read_boolean_post_value( 'send_user_notification', true );

		if ( '' === $email || ! is_email( $email ) ) {
			$this->send_error( __( 'Enter a valid email address.', 'pufferdesk' ), 400 );
		}

		if ( email_exists( $email ) ) {
			$this->send_error( __( 'A user with that email address already exists.', 'pufferdesk' ), 400 );
		}

		$roles            = $this->get_editable_roles();
		$default_role     = $this->get_default_role( $roles );
		$can_assign_roles = $this->can_assign_roles();
		if ( '' === $role || ! $can_assign_roles ) {
			if ( '' !== $role && '' !== $default_role && $role !== $default_role ) {
				$this->send_error( __( 'You do not have permission to assign that role.', 'pufferdesk' ), 403 );
			}
			$role = $default_role;
		}

		if ( '' === $role || ! isset( $roles[ $role ] ) || ( $can_assign_roles && ! $this->can_assign_role_to_user( $role, 0 ) ) ) {
			$this->send_error( __( 'Choose a role you are allowed to assign.', 'pufferdesk' ), 400 );
		}

		if ( '' === $login ) {
			$login = $this->generate_username( $email, $name );
		}

		if ( username_exists( $login ) ) {
			$this->send_error( __( 'A user with that username already exists.', 'pufferdesk' ), 400 );
		}

		$payload = array(
			'user_login'   => $login,
			'user_email'   => $email,
			'user_pass'    => wp_generate_password( 24, true, true ),
			'display_name' => '' !== $name ? $name : $login,
			'first_name'   => $first,
			'last_name'    => $last,
		);

		if ( $can_assign_roles ) {
			$payload['role'] = $role;
		}

		$user_id = wp_insert_user( $payload );

		if ( is_wp_error( $user_id ) ) {
			$this->send_error( $user_id->get_error_message(), 400 );
		}

		if ( $send ) {
			wp_new_user_notification( (int) $user_id, null, 'user' );
		}

		$user = get_user_by( 'id', (int) $user_id );

		wp_send_json_success(
			array(
				'message' => __( 'User added.', 'pufferdesk' ),
				'user'    => $user instanceof WP_User ? $this->normalize_user( $user ) : null,
			)
		);
	}

	/**
	 * Get editable profile data for a user.
	 */
	public function get_profile() {
		$user_id = absint( $this->read_post_value( 'user_id' ) );
		$user_id = $user_id ? $user_id : get_current_user_id();

		$this->authorize_user_edit( $user_id, __( 'You do not have permission to edit this user.', 'pufferdesk' ) );

		$user = get_user_by( 'id', $user_id );
		if ( ! $user instanceof WP_User ) {
			$this->send_error( __( 'User not found.', 'pufferdesk' ), 404 );
		}

		wp_send_json_success(
			array(
				'profile'     => $this->normalize_profile( $user ),
				'roleOptions' => $this->get_editable_role_options(),
			)
		);
	}

	/**
	 * Update essential profile fields.
	 */
	public function update_profile() {
		$user_id = absint( $this->read_post_value( 'user_id' ) );
		$user_id = $user_id ? $user_id : get_current_user_id();

		$this->authorize_user_edit( $user_id, __( 'You do not have permission to edit this user.', 'pufferdesk' ) );

		$user = get_user_by( 'id', $user_id );
		if ( ! $user instanceof WP_User ) {
			$this->send_error( __( 'User not found.', 'pufferdesk' ), 404 );
		}

		$email        = sanitize_email( $this->read_post_value( 'email' ) );
		$display_name = sanitize_text_field( $this->read_post_value( 'display_name' ) );
		$first_name   = sanitize_text_field( $this->read_post_value( 'first_name' ) );
		$last_name    = sanitize_text_field( $this->read_post_value( 'last_name' ) );
		$url          = esc_url_raw( $this->read_post_value( 'url' ) );
		$description  = sanitize_textarea_field( $this->read_post_value( 'description' ) );
		$role         = sanitize_key( $this->read_post_value( 'role' ) );

		if ( '' === $email || ! is_email( $email ) ) {
			$this->send_error( __( 'Enter a valid email address.', 'pufferdesk' ), 400 );
		}

		$email_user_id = email_exists( $email );
		if ( $email_user_id && (int) $email_user_id !== $user_id ) {
			$this->send_error( __( 'A user with that email address already exists.', 'pufferdesk' ), 400 );
		}

		$payload = array(
			'ID'           => $user_id,
			'user_email'   => $email,
			'display_name' => '' !== $display_name ? $display_name : $user->user_login,
			'first_name'   => $first_name,
			'last_name'    => $last_name,
			'user_url'     => $url,
			'description'  => $description,
		);

		if ( '' !== $role ) {
			if ( ! $this->can_edit_user_role( $user_id ) ) {
				$this->send_error( __( 'You do not have permission to assign that role.', 'pufferdesk' ), 403 );
			}

			$roles = $this->get_editable_roles();
			if ( ! isset( $roles[ $role ] ) || ! $this->can_assign_role_to_user( $role, $user_id ) ) {
				$this->send_error( __( 'Choose a role you are allowed to assign.', 'pufferdesk' ), 400 );
			}
			$payload['role'] = $role;
		}

		$result = wp_update_user( $payload );
		if ( is_wp_error( $result ) ) {
			$this->send_error( $result->get_error_message(), 400 );
		}

		$updated = get_user_by( 'id', $user_id );

		wp_send_json_success(
			array(
				'message' => __( 'Profile saved.', 'pufferdesk' ),
				'profile' => $updated instanceof WP_User ? $this->normalize_profile( $updated ) : null,
				'user'    => $updated instanceof WP_User ? $this->normalize_user( $updated ) : null,
			)
		);
	}

	/**
	 * Verify nonce and capability.
	 *
	 * @param string $capability Capability.
	 * @param string $message Permission message.
	 */
	private function authorize( $capability, $message ) {
		if ( ! is_user_logged_in() || ! current_user_can( $capability ) ) {
			wp_send_json_error(
				array(
					'message' => $message,
				),
				403
			);
		}

		check_ajax_referer( PufferDesk_Settings_Controller::NONCE_ACTION, 'nonce' );
	}

	/**
	 * Verify nonce and per-user edit capability.
	 *
	 * @param int    $user_id User ID.
	 * @param string $message Permission message.
	 */
	private function authorize_user_edit( $user_id, $message ) {
		if ( ! is_user_logged_in() || ! current_user_can( 'edit_user', $user_id ) ) {
			wp_send_json_error(
				array(
					'message' => $message,
				),
				403
			);
		}

		check_ajax_referer( PufferDesk_Settings_Controller::NONCE_ACTION, 'nonce' );
	}

	/**
	 * Read a scalar POST value.
	 *
	 * @param string $key POST key.
	 * @return string
	 */
	private function read_post_value( $key ) {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- AJAX handlers verify the settings nonce before using POST values.
		if ( ! isset( $_POST[ $key ] ) || is_array( $_POST[ $key ] ) ) {
			return '';
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- AJAX handlers verify the settings nonce before using POST values.
		return sanitize_textarea_field( wp_unslash( $_POST[ $key ] ) );
	}

	/**
	 * Read a boolean POST value.
	 *
	 * @param string $key POST key.
	 * @param bool   $default Default value.
	 * @return bool
	 */
	private function read_boolean_post_value( $key, $default = false ) {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- AJAX handlers verify the settings nonce before using POST values.
		if ( ! isset( $_POST[ $key ] ) || is_array( $_POST[ $key ] ) ) {
			return (bool) $default;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- AJAX handlers verify the settings nonce before using POST values.
		$value = sanitize_text_field( wp_unslash( $_POST[ $key ] ) );

		if ( is_bool( $value ) ) {
			return $value;
		}

		if ( is_numeric( $value ) ) {
			return 1 === (int) $value;
		}

		return in_array( strtolower( (string) $value ), array( '1', 'true', 'yes', 'on' ), true );
	}

	/**
	 * Send a JSON error response.
	 *
	 * @param string $message Error message.
	 * @param int    $status HTTP status.
	 */
	private function send_error( $message, $status = 400 ) {
		wp_send_json_error(
			array(
				'message' => $message,
			),
			$status
		);
	}

	/**
	 * Normalize requested users per page.
	 *
	 * @param mixed $value Raw per-page value.
	 * @return int
	 */
	private function normalize_per_page( $value ) {
		$per_page = absint( $value );

		if ( $per_page <= 0 ) {
			return self::LIST_PER_PAGE;
		}

		return min( self::LIST_PER_PAGE_MAX, max( 1, $per_page ) );
	}

	/**
	 * Query one paged slice of users.
	 *
	 * @param int    $page Page number.
	 * @param int    $per_page Users per page.
	 * @param string $search Search text.
	 * @param string $role Role filter.
	 * @return array{users:array<int,WP_User>,total:int,pages:int,page:int}
	 */
	private function query_users( $page, $per_page, $search = '', $role = '' ) {
		if ( '' !== $role && ! $this->role_exists( $role ) ) {
			return array(
				'page'  => 1,
				'pages' => 0,
				'total' => 0,
				'users' => array(),
			);
		}

		$args = array(
			'count_total' => true,
			'fields'      => 'all_with_meta',
			'number'      => $per_page,
			'orderby'     => 'display_name',
			'order'       => 'ASC',
			'paged'       => $page,
		);

		if ( '' !== $search ) {
			$args['search']         = '*' . $search . '*';
			$args['search_columns'] = array( 'user_login', 'user_email', 'user_url', 'user_nicename', 'display_name' );
		}

		if ( '' !== $role ) {
			$args['role'] = $role;
		}

		$query = new WP_User_Query( $args );
		$users = $query->get_results();
		$total = (int) $query->get_total();
		$pages = $total > 0 ? (int) ceil( $total / $per_page ) : 0;

		if ( $pages > 0 && $page > $pages ) {
			$args['paged'] = $pages;
			$query         = new WP_User_Query( $args );
			$users         = $query->get_results();
			$total         = (int) $query->get_total();
			$page          = $pages;
		}

		return array(
			'page'  => $page,
			'pages' => $pages,
			'total' => $total,
			'users' => array_values( array_filter( $users, array( $this, 'is_wp_user' ) ) ),
		);
	}

	/**
	 * Check whether a value is a WordPress user.
	 *
	 * @param mixed $user User candidate.
	 * @return bool
	 */
	private function is_wp_user( $user ) {
		return $user instanceof WP_User;
	}

	/**
	 * Check whether a role key is registered.
	 *
	 * @param string $role Role key.
	 * @return bool
	 */
	private function role_exists( $role ) {
		$role     = sanitize_key( (string) $role );
		$wp_roles = wp_roles();

		return '' !== $role && isset( $wp_roles->roles[ $role ] );
	}

	/**
	 * Build role filter options from whole-site role counts.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	private function get_role_filter_options() {
		$counts = count_users();
		$roles  = isset( $counts['avail_roles'] ) && is_array( $counts['avail_roles'] ) ? $counts['avail_roles'] : array();
		$options = array();
		foreach ( $roles as $role => $count ) {
			$role  = sanitize_key( (string) $role );
			$count = absint( $count );
			if ( '' === $role || $count <= 0 ) {
				continue;
			}

			$options[] = array(
				'count' => $count,
				'label' => $this->get_role_label( $role ),
				'value' => $role,
			);
		}

		usort(
			$options,
			static function ( $a, $b ) {
				return strcasecmp( $a['label'], $b['label'] );
			}
		);

		return $options;
	}

	/**
	 * Get role choices editable by the current user.
	 *
	 * @return array<string,array<string,mixed>>
	 */
	private function get_editable_roles() {
		if ( ! function_exists( 'get_editable_roles' ) ) {
			require_once ABSPATH . 'wp-admin/includes/user.php';
		}

		return function_exists( 'get_editable_roles' ) ? get_editable_roles() : array();
	}

	/**
	 * Get role choices for native create/profile forms.
	 *
	 * @return array<int,array<string,string>>
	 */
	private function get_editable_role_options() {
		if ( ! $this->can_assign_roles() ) {
			return array();
		}

		$options = array();
		foreach ( $this->get_editable_roles() as $role => $data ) {
			$role      = sanitize_key( (string) $role );
			$role_name = isset( $data['name'] ) ? $data['name'] : $role;

			if ( '' === $role ) {
				continue;
			}

			$options[] = array(
				'label' => translate_user_role( $role_name ),
				'value' => $role,
			);
		}

		usort(
			$options,
			static function ( $a, $b ) {
				return strcasecmp( $a['label'], $b['label'] );
			}
		);

		return $options;
	}

	/**
	 * Get the default assignable role.
	 *
	 * @param array<string,array<string,mixed>> $roles Editable roles.
	 * @return string
	 */
	private function get_default_role( $roles ) {
		$default = sanitize_key( (string) get_option( 'default_role', 'subscriber' ) );

		if ( isset( $roles[ $default ] ) ) {
			return $default;
		}

		$keys = array_keys( $roles );

		return ! empty( $keys ) ? sanitize_key( (string) $keys[0] ) : '';
	}

	/**
	 * Generate a unique username from email/name.
	 *
	 * @param string $email Email address.
	 * @param string $name Display name.
	 * @return string
	 */
	private function generate_username( $email, $name = '' ) {
		$base = '' !== $name ? $name : preg_replace( '/@.*/', '', $email );
		$base = sanitize_user( $base, true );
		$base = '' !== $base ? $base : 'user';
		$name = $base;
		$index = 2;

		while ( username_exists( $name ) ) {
			$name = $base . $index;
			$index++;
		}

		return $name;
	}

	/**
	 * Check whether the current user can edit the target user's role.
	 *
	 * @param int $user_id User ID.
	 * @return bool
	 */
	private function can_edit_user_role( $user_id ) {
		return current_user_can( 'promote_user', $user_id );
	}

	/**
	 * Check whether the current user can assign user roles.
	 *
	 * @return bool
	 */
	private function can_assign_roles() {
		return current_user_can( 'promote_users' );
	}

	/**
	 * Check whether the requested role is safe to assign.
	 *
	 * @param string $role Role key.
	 * @param int    $user_id User ID, or 0 for a new user.
	 * @return bool
	 */
	private function can_assign_role_to_user( $role, $user_id = 0 ) {
		$role = sanitize_key( (string) $role );

		if ( '' === $role || ! $this->role_exists( $role ) || ! $this->can_assign_roles() ) {
			return false;
		}

		if ( $user_id <= 0 || get_current_user_id() !== (int) $user_id || ( is_multisite() && current_user_can( 'manage_network_users' ) ) ) {
			return true;
		}

		$wp_roles       = wp_roles();
		$potential_role = isset( $wp_roles->role_objects[ $role ] ) ? $wp_roles->role_objects[ $role ] : null;

		return $potential_role && $potential_role->has_cap( 'promote_users' );
	}

	/**
	 * Normalize a user for the browser.
	 *
	 * @param WP_User $user User object.
	 * @return array<string,mixed>
	 */
	private function normalize_user( WP_User $user ) {
		$role_labels = array();
		foreach ( (array) $user->roles as $role ) {
			$role = sanitize_key( (string) $role );
			if ( '' !== $role ) {
				$role_labels[] = $this->get_role_label( $role );
			}
		}

		$registered = isset( $user->user_registered ) ? (string) $user->user_registered : '';
		$edit_url   = current_user_can( 'edit_user', $user->ID )
			? get_edit_user_link( $user->ID )
			: '';

		return array(
			'id'              => (int) $user->ID,
			'avatar'          => get_avatar_url( $user->ID, array( 'size' => 128 ) ),
			'canEdit'         => current_user_can( 'edit_user', $user->ID ),
			'displayName'     => $user->display_name ? $user->display_name : $user->user_login,
			'editUrl'         => $edit_url ? esc_url_raw( $edit_url ) : '',
			'email'           => $user->user_email,
			'login'           => $user->user_login,
			'name'            => trim( $user->first_name . ' ' . $user->last_name ),
			'postsCount'      => count_user_posts( $user->ID, 'post', true ),
			'registered'      => $registered,
			'registeredLabel' => $registered ? mysql2date( get_option( 'date_format' ), $registered ) : '',
			'roleLabel'       => ! empty( $role_labels ) ? implode( ', ', $role_labels ) : __( 'No role', 'pufferdesk' ),
			'roleLabels'      => $role_labels,
			'roles'           => array_values( array_map( 'sanitize_key', (array) $user->roles ) ),
			'url'             => esc_url_raw( $user->user_url ),
		);
	}

	/**
	 * Normalize editable profile data for the browser.
	 *
	 * @param WP_User $user User object.
	 * @return array<string,mixed>
	 */
	private function normalize_profile( WP_User $user ) {
		$normalized = $this->normalize_user( $user );

		return array_merge(
			$normalized,
			array(
				'canEditRole' => $this->can_edit_user_role( $user->ID ),
				'description' => (string) get_user_meta( $user->ID, 'description', true ),
				'firstName'   => (string) get_user_meta( $user->ID, 'first_name', true ),
				'lastName'    => (string) get_user_meta( $user->ID, 'last_name', true ),
			)
		);
	}

	/**
	 * Get a translated role label.
	 *
	 * @param string $role Role key.
	 * @return string
	 */
	private function get_role_label( $role ) {
		$wp_roles = wp_roles();
		$role     = sanitize_key( (string) $role );
		$name     = isset( $wp_roles->roles[ $role ]['name'] ) ? $wp_roles->roles[ $role ]['name'] : $role;

		return translate_user_role( $name );
	}
}
