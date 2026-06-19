import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const paths = [ 'assets/dist' ];

try {
	await execFileAsync('git', [ 'diff', '--quiet', '--', ...paths ]);
} catch (error) {
	console.error(
		'Built assets differ from the git index. Run `npm run build`, review the assets/dist changes, and include them with the related source changes.'
	);
	process.exit(typeof error.code === 'number' ? error.code : 1);
}
