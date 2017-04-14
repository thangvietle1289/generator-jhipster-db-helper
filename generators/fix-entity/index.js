const generator = require('yeoman-generator');
const chalk = require('chalk');
const prompts = require('./prompts.js');
const fs = require('fs');


const jhipsterVar = {
    moduleName: 'fix-entity'
};


const jhipsterFunc = {};


module.exports = generator.extend({
    constructor: function (...args) { // eslint-disable-line object-shorthand
        generator.apply(this, args);
        // All information from entity generator
        this.entityConfig = this.options.entityConfig;
        this.entityTableName = this.options.entityConfig.entityTableName;
        this.dbhTableName = this.options.entityConfig.data.dbhTableName;
        this.fields = this.options.entityConfig.data.fields;

        // input from user (prompts.js will fill them)
        this.tableNameInput = null;
        this.columnsInput = [];
    },


    // check current project state, get configs, etc
    initializing() {
        this.log(chalk.bold.bgYellow('fix-entity generator'));
        this.log(chalk.bold.yellow('initializing'));
        this.composeWith('jhipster:modules',
            { jhipsterVar, jhipsterFunc },
            this.options.testmode ? { local: require.resolve('generator-jhipster/generators/modules') } : null
        );
        this.appConfig = jhipsterVar.jhipsterConfig;

        /* / TODO remove on prod
        this.prodDatabaseType = jhipsterVar.prodDatabaseType;
        this.log(chalk.blue('<<<<<BEFORE'));
        this.log(chalk.blue('entityConfig'));
        this.log(this.entityConfig);
        this.log(chalk.blue('fields'));
        this.log(this.fields);
        this.log(chalk.blue('jhipsterVar'));
        this.log(jhipsterVar);
        //*/
    },


    // prompt the user for options
    prompting: {
        askForTableName: prompts.askForTableName,
        askForColumnsName: prompts.askForColumnsName
    },


    // other Yeoman run loop steps would go here :

    // configuring() : Saving configurations and configure the project (creating .editorconfig files and other metadata files)

    // default() : If the method name doesn't match a priority, it will be pushed to this group.


    /**
     * After creating a new entity, replace the value of the table name.
     *
     * Allows consistent mapping with an existing database table without modifying JHipster's entity subgenerator.
     **/
    writing() {
        const files = {
            config: this.entityConfig.filename,
            ORM: `${jhipsterVar.javaDir}/domain/${this.entityConfig.entityClass}.java`,
            liquibase: `${jhipsterVar.resourceDir}config/liquibase/changelog/${this.entityConfig.data.changelogDate}_added_entity_${this.entityConfig.entityClass}.xml`
        };

        // Add/Change/Keep dbhTableName
        const replaceTableName = (paramFiles) => {
            const pattern = `"entityTableName": "${this.entityTableName}"`;
            const key = 'dbhTableName';
            const oldValue = this.dbhTableName;
            const newValue = this.tableNameInput;

            if (oldValue === undefined) {
                // '(\\s*)' is for capturing indentation
                jhipsterFunc.replaceContent(paramFiles.config, `(\\s*)${pattern}`, `$1${pattern},$1"${key}": "${newValue}"`, true);
            } else {
                jhipsterFunc.replaceContent(paramFiles.config, `"${key}": "${oldValue}`, `"${key}": "${newValue}`);
            }

            // We search either for our value or jhipster value, so it works even if user didn't accept JHipster overwrite after a regeneration
            jhipsterFunc.replaceContent(paramFiles.ORM, `@Table\\(name = "(${this.entityTableName}|${oldValue})`, `@Table(name = "${newValue}`, true);
            jhipsterFunc.replaceContent(paramFiles.liquibase, `\\<createTable tableName="(${this.entityTableName}|${oldValue})`, `<createTable tableName="${newValue}`);
        };

        // DEBUG : log where we are
        this.log(chalk.bold.yellow('writing'));

        // verify files exist
        for (const file in files) {
            // hasOwnProperty to avoid inherited properties
            if (files.hasOwnProperty(file) && !fs.existsSync(files[file])) {
                throw new Error(`JHipster-db-helper : File not found (${file}: ${files[file]}).`);
            }
        }

        replaceTableName(files);

        // Add/Change/Keep dbhColumnName for each field
        this.columnsInput.forEach((columnItem) => {
            const pattern = `"fieldName": "${columnItem.fieldName}"`;
            const key = 'dbhColumnName';
            const oldValue = columnItem.dbhColumnName;
            const newValue = columnItem.columnNameInput;

            if (oldValue === undefined) {
                // '(\\s*)' is for capturing indentation
                jhipsterFunc.replaceContent(files.config, `(\\s*)${pattern}`, `$1${pattern},$1"${key}": "${newValue}"`, true);
            } else {
                jhipsterFunc.replaceContent(files.config, `"${key}": "${oldValue}`, `"${key}": "${newValue}`);
            }

            // We search either for our value or jhipster value, so it works even if user didn't accept JHipster overwrite after a regeneration
            jhipsterFunc.replaceContent(files.ORM, `@Column\\(name = "(${columnItem.fieldNameAsDatabaseColumn}|${oldValue})`, `@Column(name = "${newValue}`, true);
            jhipsterFunc.replaceContent(files.liquibase, `\\<column name="(${columnItem.fieldNameAsDatabaseColumn}|${oldValue})`, `<column name="${newValue}`, true);
        });
    },


    // conflict() : Where conflicts are handled (used internally)

    // run installation (npm, bower, etc)
    install() {
        // DEBUG : log where we are
        this.log(chalk.bold.yellow('install'));
    },


    // cleanup, say goodbye
    end() {
        // DEBUG : log where we are
        this.log(chalk.bold.yellow('End of fix-entity generator'));
    }
});
