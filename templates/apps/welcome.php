<?php
/**
 * Welcome workspace window.
 *
 * @package AdminOSMode
 */

defined( 'ABSPATH' ) || exit;

/**
 * @var array<int,array<string,string>> $apps
 * @var array<int,array<string,string>> $stats
 * @var WP_Post[]                       $recents
 * @var string                          $classic_once
 * @var string                          $site_name
 * @var array<string,mixed>             $theme
 */
?>
<section class="aos-window aos-window-welcome is-active" data-aos-window="welcome" aria-label="<?php esc_attr_e( 'Workspace window', 'admin-os-mode' ); ?>">
	<?php
	$this->render_part(
		'windows/titlebar.php',
		array(
			'title' => $site_name,
		)
	);
	?>
	<div class="aos-window-body aos-welcome-body">
		<div class="aos-welcome-header">
			<div>
				<p><?php echo esc_html( $theme['welcome_kicker'] ); ?></p>
				<h1><?php echo esc_html( $site_name ); ?></h1>
			</div>
			<a href="<?php echo esc_url( $classic_once ); ?>"><?php esc_html_e( 'Open dashboard once in classic mode', 'admin-os-mode' ); ?></a>
		</div>

		<div class="aos-stats">
			<?php foreach ( $stats as $admin_os_mode_stat ) : ?>
				<div class="aos-stat">
					<span><?php echo esc_html( $admin_os_mode_stat['label'] ); ?></span>
					<strong><?php echo esc_html( $admin_os_mode_stat['value'] ); ?></strong>
				</div>
			<?php endforeach; ?>
		</div>

		<div class="aos-panel-grid">
			<section class="aos-panel">
				<h2><?php esc_html_e( 'Apps', 'admin-os-mode' ); ?></h2>
				<div class="aos-app-grid">
					<?php foreach ( $apps as $admin_os_mode_app ) : ?>
						<button type="button" class="aos-app-launcher" data-aos-open-app="<?php echo esc_attr( $admin_os_mode_app['id'] ); ?>">
							<span class="aos-app-icon"><?php Admin_OS_Mode_Icon_Renderer::render( $admin_os_mode_app['icon'] ); ?></span>
							<span><?php echo esc_html( $admin_os_mode_app['label'] ); ?></span>
						</button>
					<?php endforeach; ?>
				</div>
			</section>

			<section class="aos-panel">
				<h2><?php esc_html_e( 'Recent content', 'admin-os-mode' ); ?></h2>
				<?php if ( empty( $recents ) ) : ?>
					<p class="aos-empty"><?php esc_html_e( 'No recent posts or pages found.', 'admin-os-mode' ); ?></p>
				<?php else : ?>
					<ul class="aos-recent-list">
						<?php foreach ( $recents as $post ) : ?>
							<?php
							$post_type_object = get_post_type_object( $post->post_type );
							$admin_os_mode_type_label = $post_type_object ? $post_type_object->labels->singular_name : $post->post_type;
							?>
							<li>
								<button type="button" data-aos-open-url="<?php echo esc_url( get_edit_post_link( $post->ID, 'raw' ) ); ?>" data-aos-title="<?php echo esc_attr( get_the_title( $post ) ); ?>" data-aos-icon="dashicons-edit-page">
									<span><?php echo esc_html( get_the_title( $post ) ); ?></span>
									<small><?php echo esc_html( $admin_os_mode_type_label ); ?></small>
								</button>
							</li>
						<?php endforeach; ?>
					</ul>
				<?php endif; ?>
			</section>
		</div>
	</div>
</section>
