const path = require('path');
const chalk = require('chalk');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const fs = require('fs-extra');
const { compose, replace } = require('ramda');

const createWidget = async ({ argv }) => {
	const { name } = argv;
	const replaceName = replace(/WidgetName/g)(name);
	const replaceStrings = replace(/<%name%>/g);
	const composeStrings = compose(replaceStrings(name));

	try {
		const src = path.resolve(__dirname, 'widget');
		const temp = path.resolve(__dirname, '__tmp__');

		// create temp copy of files
		await fs.copy(src, temp);

		// create dest folders
		await fs.ensureDir(path.resolve(__dirname, '../src/widgets'));
		await fs.mkdir(path.resolve(__dirname, `../src/widgets/${name}`));
		await fs.mkdir(path.resolve(__dirname, `../src/widgets/${name}/styles`));

		// .tsx file
		const _widget = path.resolve(__dirname, '__tmp__/WidgetName.tsx');
		const _newWidget = replaceName(_widget);
		await fs
			.copy(_widget, _newWidget)
			.then(() => {
				return fs.readFile(_widget, 'utf-8');
			})
			.then((file) => {
				const updatedFile = composeStrings(file);
				fs.writeFile(path.resolve(__dirname, `../src/widgets/${name}.tsx`), updatedFile);
			});

		// .spec.ts file
		const _test = path.resolve(__dirname, '__tmp__/WidgetName.spec.ts');
		const _newTest = replaceName(_test);
		await fs
			.copy(_test, _newTest)
			.then(() => {
				return fs.readFile(_test, 'utf-8');
			})
			.then((file) => {
				const updatedFile = composeStrings(file);
				fs.writeFile(path.resolve(__dirname, `../src/widgets/${name}.spec.ts`), updatedFile);
			});
		
		// .scss file
		const _sass = path.resolve(__dirname, '__tmp__/WidgetName/styles/WidgetName.scss');
		const _newSass = replaceName(_sass);
		await fs
			.copy(_sass, _newSass)
			.then(() => {
				return fs.readFile(_sass, 'utf-8');
			})
			.then((file) => {
				const updatedFile = composeStrings(file);
				fs.writeFile(path.resolve(__dirname, `../src/widgets/${name}/styles/${name}.scss`), updatedFile);
			});

		// delete files
		await fs.remove(temp);
	} catch (error) {
		console.info(chalk.red.bold(`Widget creation failed: ${error.message}\n`));
		return Promise.reject(new Error(`Widget creation failed: ${error.message}`));
	}
};

const create = {
	async handler(argv) {
		console.info(chalk.bold.underline(`Creating widget ${argv.name}...`));
		await createWidget({ argv });
		console.info(chalk.green.bold(`Widget ${argv.name} created.`));
	},
};

const argv = yargs(hideBin(process.argv))
	.option('name', {
		alias: 'n',
		type: 'string',
		description: 'Widget name',
	})
	.demandOption('name', 'Widget name is required')
	.help()
	.argv;

create.handler(argv);
