const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
};

const VERSION = '1.0.0';

function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function toPascalCase(str) {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

function getCamelName(modulePath) {
  const parts = modulePath.split(/[/\\]/);
  return toCamelCase(parts[parts.length - 1]);
}

function getPascalName(modulePath) {
  const parts = modulePath.split(/[/\\]/);
  return toPascalCase(parts[parts.length - 1]);
}

function createDirIfNotExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  }
  return false;
}

function directoryExists(dirPath) {
  return fs.existsSync(dirPath);
}

// depth of moduleInput (e.g. "user" = 1, "admin/user" = 2)
// module files live at src/modules/<input>/{controllers,models,...}
// so from controllers/ to src/ = depth+2 levels up
function getRelativeRoot(moduleInput) {
  const depth = moduleInput.split('/').length;
  return '../'.repeat(depth + 2);
}

function generateController(modulePath, camelName, pascalName, rootPath) {
  const dir = path.join(modulePath, 'controllers');
  createDirIfNotExists(dir);
  const content = `const { BaseController } = require('${rootPath}core');
  const ${pascalName}Service = require('../services/${camelName}Service');
  const Activities = require('../../activities/services/activitiesService');

class ${pascalName}Controller extends BaseController {
  async getAll(req, res) {
    try {
      const pageNum = parseInt(req.query.page, 10) || 1;
      const limitNum = parseInt(req.query.limit, 10) || 10;
      const data = await ${pascalName}Service.getAll(pageNum, limitNum);
      this.paginated(res, data.data, data.total, pageNum, limitNum, '${pascalName} fetched successfully');
    } catch (error) {
      this.error(res, error.message, 500);
    }
  }

  async getById(req, res) {
    try {
      const data = await ${pascalName}Service.getById(req.params.id);
      if (!data) return this.error(res, '${pascalName} not found', 404);
      this.success(res, data, '${pascalName} fetched successfully');
    } catch (error) {
      this.error(res, error.message, 500);
    }
  }

  async create(req, res) {
    try {
      const data = await ${pascalName}Service.create(req.body);
      // Log Activities //
      await Activities.create({
        user_id: req.admin._id,
        module_name: ${pascalName},
        module_id: data._id,
        action: 'CREATE',
        description: req.body,
        ip: req.connection.remoteAddress,
      });
      this.success(res, data, '${pascalName} created successfully', 201);
    } catch (error) {
      this.error(res, error.message, 400);
    }
  }

  async update(req, res) {
    try {
      const data = await ${pascalName}Service.update(req.params.id, req.body);
      // Log Activities //
      await Activities.create({
        user_id: req.admin._id,
        module_name: ${pascalName},
        module_id: req.params.id,
        action: 'UPDATE',
        description: req.body,
        ip: req.connection.remoteAddress,
      });
      this.success(res, data, '${pascalName} updated successfully');
    } catch (error) {
      this.error(res, error.message, 400);
    }
  }

  async status(req, res) {
    try {
      const status = req.body.status === 1 || req.body.status === true;
      const data = await ${pascalName}Service.status(req.params.id, status);
      //  Log Activities //
      await Activities.create({
        user_id: req.admin._id,
        module_name: ${pascalName},
        module_id: req.params.id,
        action: 'STATUS',
        description: req.body,
        ip: req.connection.remoteAddress,
      });
      this.success(res, data, '${pascalName} status updated successfully');
    } catch (error) {
      this.error(res, error.message, 400);
    }
  }

  async delete(req, res) {
    try {
      const data = await ${pascalName}Service.getById(req.params.id);
      // Log Activities //
      await Activities.create({
        user_id: req.admin._id,
        module_name: ${pascalName},
        module_id: req.params.id,
        action: 'DELETE',
        description: data,
        ip: req.connection.remoteAddress,
      });
      await ${pascalName}Service.delete(req.params.id);
      this.success(res, null, '${pascalName} deleted successfully');
    } catch (error) {
      this.error(res, error.message, 500);
    }
  }
}

module.exports = new ${pascalName}Controller();
`;
  fs.writeFileSync(path.join(dir, `${camelName}Controller.js`), content);
  log.success(`Controller created: controllers/${camelName}Controller.js`);
}

function generateModel(modulePath, camelName, pascalName) {
  const dir = path.join(modulePath, 'models');
  createDirIfNotExists(dir);
  const content = `const mongoose = require('mongoose');

const ${camelName}Schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

${camelName}Schema.index({ name: 1 });

module.exports = mongoose.model('${pascalName}', ${camelName}Schema);
`;
  fs.writeFileSync(path.join(dir, `${camelName}Model.js`), content);
  log.success(`Model created: models/${camelName}Model.js`);
}

function generateService(modulePath, camelName, pascalName, rootPath) {
  const dir = path.join(modulePath, 'services');
  createDirIfNotExists(dir);
  const content = `const ${pascalName} = require('../models/${camelName}Model');
  const { formatPagination } = require('${rootPath}utils/helpers');
  const logger = require('${rootPath}services/logger');

module.exports = {
  async getAll(page = 1, limit = 10) {
    try {
      const { skip } = formatPagination(page, limit);
      const total = await ${pascalName}.countDocuments();
      const data = await ${pascalName}.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
      return { data, total };
    } catch (error) {
      logger.error('Error in getAll:', error);
      throw error;
    }
  },

  async getById(id) {
    try {
      return await ${pascalName}.findById(id);
    } catch (error) {
      logger.error('Error in getById:', error);
      throw error;
    }
  },

  async create(data) {
    try {
      const existing = await ${pascalName}.findOne({ name: data.name });
      if (existing) throw new Error('Name already exists');
      return await ${pascalName}.create(data);
    } catch (error) {
      logger.error('Error in create:', error);
      throw error;
    }
  },

  async update(id, data) {
    try {
      return await ${pascalName}.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    } catch (error) {
      logger.error('Error in update:', error);
      throw error;
    }
  },

  async status(id, status) {
    try {
      return await ${pascalName}.findByIdAndUpdate(id, { isActive: Boolean(status) }, { new: true, runValidators: true });
    } catch (error) {
      logger.error('Error in status:', error);
      throw error;
    }
  },

  async delete(id) {
    try {
      return await ${pascalName}.findByIdAndDelete(id);
    } catch (error) {
      logger.error('Error in delete:', error);
      throw error;
    }
  },
};
`;
  fs.writeFileSync(path.join(dir, `${camelName}Service.js`), content);
  log.success(`Service created: services/${camelName}Service.js`);
}

function generateValidator(modulePath, camelName, pascalName) {
  const dir = path.join(modulePath, 'validators');
  createDirIfNotExists(dir);
  const content = `const Joi = require('joi');

module.exports = {
  create${pascalName}: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    description: Joi.string().allow('').max(500),
  }),

  update${pascalName}: Joi.object({
    name: Joi.string().min(3).max(100).optional(),
    description: Joi.string().allow('').max(500),
  }),
};
`;
  fs.writeFileSync(path.join(dir, `${camelName}Validator.js`), content);
  log.success(`Validator created: validators/${camelName}Validator.js`);
}

function generateRoutes(modulePath, camelName, pascalName, rootPath) {
  const dir = path.join(modulePath, 'routes');
  createDirIfNotExists(dir);
  const content = `const express = require('express');
const ${camelName}Controller = require('../controllers/${camelName}Controller');
const { validate, authenticate } = require('${rootPath}middlewares');
const ${camelName}Validator = require('../validators/${camelName}Validator');

const router = express.Router();

router.get('/', authenticate, ${camelName}Controller.getAll.bind(${camelName}Controller));
router.get('/:id', authenticate, ${camelName}Controller.getById.bind(${camelName}Controller));
router.post('/', authenticate, validate(${camelName}Validator.create${pascalName}), ${camelName}Controller.create.bind(${camelName}Controller));
router.put('/:id', authenticate, validate(${camelName}Validator.update${pascalName}), ${camelName}Controller.update.bind(${camelName}Controller));
router.patch('/status/:id', authenticate, ${camelName}Controller.status.bind(${camelName}Controller));
router.delete('/:id', authenticate, ${camelName}Controller.delete.bind(${camelName}Controller));

module.exports = router;
`;
  fs.writeFileSync(path.join(dir, `${camelName}Routes.js`), content);
  log.success(`Routes created: routes/${camelName}Routes.js`);
}

function generateConfig(modulePath, camelName) {
  const dir = path.join(modulePath, 'config');
  createDirIfNotExists(dir);
  const content = `module.exports = {\n  // Add your module configuration here\n};\n`;
  fs.writeFileSync(path.join(dir, `${camelName}Config.js`), content);
  log.success(`Config created: config/${camelName}Config.js`);
}

function generateModuleIndex(modulePath, camelName) {
  const content = `const routes = require('./routes/${camelName}Routes');

module.exports = { routes };
`;
  fs.writeFileSync(path.join(modulePath, 'index.js'), content);
  log.success(`Index created: index.js`);
}

function handleCreateModule() {
  if (args.length < 2) {
    log.error('Module name is required');
    console.log('Usage: node cli.js create:module <module-name>');
    process.exit(1);
  }

  let moduleInput = args[1].replace(/\\/g, '/');

  const modulePath = path.join(__dirname, 'src', 'modules', ...moduleInput.split('/'));
  const camelName = getCamelName(moduleInput);
  const pascalName = getPascalName(moduleInput);
  const rootPath = getRelativeRoot(moduleInput);

  if (directoryExists(modulePath)) {
    if (!args.includes('--force')) {
      log.error(`Module "${moduleInput}" already exists!`);
      log.info(`Use --force flag to overwrite:\nnode cli.js create:module ${moduleInput} --force`);
      process.exit(1);
    }
    fs.rmSync(modulePath, { recursive: true, force: true });
    log.warning(`Existing module removed.`);
  }

  log.info(`Creating module: "${moduleInput}"`);
  createDirIfNotExists(modulePath);

  generateController(modulePath, camelName, pascalName, rootPath);
  generateModel(modulePath, camelName, pascalName);
  generateService(modulePath, camelName, pascalName, rootPath);
  generateValidator(modulePath, camelName, pascalName);
  generateRoutes(modulePath, camelName, pascalName, rootPath);
  generateConfig(modulePath, camelName);
  generateModuleIndex(modulePath, camelName);

  log.success(`\n✓ Module "${moduleInput}" created successfully!`);
  log.info(`Module location: ${modulePath}`);
  console.log(`
${colors.bright}Next steps:${colors.reset}

1. Register routes if auto-loading is not enabled
2. Add business logic in services/${camelName}Service.js
3. Update validators as needed
4. Test APIs

Controller : controllers/${camelName}Controller.js
Model      : models/${camelName}Model.js
Service    : services/${camelName}Service.js
`);
}

function showHelp() {
  console.log(`
${colors.bright}Node.js CI4 Architecture - CLI Module Generator v${VERSION}${colors.reset}

${colors.bright}Usage:${colors.reset}
  node cli.js [command] [options]

${colors.bright}Commands:${colors.reset}
  create:module <name>    Generate a new module scaffold
  --help                  Show this help message
  --version               Show version

${colors.bright}Examples:${colors.reset}
  node cli.js create:module user-role
  node cli.js create:module admin/user-role
  node cli.js create:module email-template

${colors.bright}Generated Structure:${colors.reset}
  src/modules/<name>/
    controllers/{name}Controller.js
    models/{name}Model.js
    services/{name}Service.js
    routes/{name}Routes.js
    validators/{name}Validator.js
    config/{name}Config.js
    index.js
  `);
}

if (args.length === 0 || args[0] === '--help') {
  showHelp();
} else if (args[0] === '--version') {
  console.log(`v${VERSION}`);
} else if (args[0] === 'create:module') {
  handleCreateModule();
} else {
  log.error(`Unknown command: ${args[0]}`);
  log.info('Run "node cli.js --help" for usage information');
  process.exit(1);
}
