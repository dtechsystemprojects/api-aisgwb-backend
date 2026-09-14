const Activities = require('../modules/admin/activities/services/activitiesService');

class BaseController {
  success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  error(res, message = 'Error', statusCode = 400, data = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      data,
    });
  }

  paginated(res, data, total, page, limit, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  }

  async logActivity(req, moduleName, moduleId, action, description) {
    try {
      if (req.admin && req.admin._id) {
        await Activities.create({
          user_id: req.admin._id,
          module_name: moduleName,
          module_id: moduleId,
          action: action,
          description: description,
          ip: req.headers?.['x-forwarded-for'] || req.connection?.remoteAddress || req.ip,
        });
      }
    } catch (error) {
      console.error(`Failed to log activity for ${moduleName}:`, error.message);
    }
  }
}

module.exports = BaseController;