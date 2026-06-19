<?php
/**
 * Desktop folder icons.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Template variables.
 *
 * @var array<int,array<string,string>> $folders
 * @var array<string,string>            $labels
 * @var array<string,mixed>             $theme
 * @var array<string,mixed>             $workspace_state
 */

if ( empty( $folders ) ) {
	return;
}

$pufferdesk_workspace_state        = isset( $workspace_state ) && is_array( $workspace_state ) ? $workspace_state : array();
$pufferdesk_labels                 = isset( $labels ) && is_array( $labels ) ? $labels : PufferDesk_Runtime_Config::get_shell_template_labels( isset( $theme ) && is_array( $theme ) ? $theme : array() );
$pufferdesk_folders_layer_restored = PufferDesk_Desktop_Layout::layer_has_saved_icon_positions( $folders, $pufferdesk_workspace_state, 'folder' );
$pufferdesk_folders_layer_class    = 'pdk-desktop-folders pdk-desktop-icon-layer';
$pufferdesk_folders_layer_class   .= $pufferdesk_folders_layer_restored ? ' is-managed' : '';
?>
<section class="<?php echo esc_attr( $pufferdesk_folders_layer_class ); ?>" aria-label="<?php echo esc_attr( isset( $pufferdesk_labels['desktop_folders'] ) ? $pufferdesk_labels['desktop_folders'] : 'desktop_folders' ); ?>">
	<?php foreach ( $folders as $pufferdesk_folder ) : ?>
		<button
			type="button"
			class="pdk-desktop-icon pdk-desktop-folder"
			data-pdk-context="<?php echo esc_attr( PufferDesk_Context_Menu_Contracts::TARGET_DESKTOP_FOLDER ); ?>"
			data-pdk-context-id="<?php echo esc_attr( $pufferdesk_folder['id'] ); ?>"
			data-pdk-context-label="<?php echo esc_attr( $pufferdesk_folder['label'] ); ?>"
			data-pdk-desktop-icon
			data-pdk-desktop-icon-id="<?php echo esc_attr( PufferDesk_Workspace_State::desktop_folder_icon_id( $pufferdesk_folder['id'] ) ); ?>"
			data-pdk-desktop-icon-kind="folder"
			data-pdk-open-folder="<?php echo esc_attr( $pufferdesk_folder['id'] ); ?>"
			<?php if ( $pufferdesk_folders_layer_restored ) : ?>
				<?php PufferDesk_Desktop_Layout::render_icon_attributes( PufferDesk_Workspace_State::desktop_folder_icon_id( $pufferdesk_folder['id'] ), $pufferdesk_workspace_state ); ?>
			<?php endif; ?>
			aria-label="<?php echo esc_attr( $pufferdesk_folder['label'] ); ?>"
		>
			<span class="pdk-app-icon">
				<?php PufferDesk_Icon_Renderer::render( $pufferdesk_folder['icon'], $theme ); ?>
			</span>
			<span class="pdk-desktop-app-label"><?php echo esc_html( $pufferdesk_folder['label'] ); ?></span>
		</button>
	<?php endforeach; ?>
</section>
