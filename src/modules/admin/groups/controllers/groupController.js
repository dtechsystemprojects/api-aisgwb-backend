const { BaseController } = require('../../../../core');
const GroupService = require('../services/groupService');
class GroupController extends BaseController {
  /**
   * @description Fetch all groups
   * @route GET /groups
   * @access Private
   */
  async getAll(req, res) {
    try {
      const data = await GroupService.getAll();
      this.success(res, data, 'Groups fetched successfully');
    } catch (error) {
      this.error(res, error.message, 500);
    }
  }

  /**
   * @description Fetch group by ID
   * @route GET /groups/:id
   * @access Private
   */
  async getById(req, res) {
    try {
      const data = await GroupService.getById(req.params.id);
      if (!data) return this.error(res, 'Group not found', 404);
      this.success(res, data, 'Group fetched successfully');
    } catch (error) {
      this.error(res, error.message, 500);
    }
  }

  /**
   * @description Create new group
   * @route POST /groups
   * @access Private
   */
  async create(req, res) {
    try {
      const data = await GroupService.create(req.body);
      // Log Activities //
      await this.logActivity(req, 'Groups', data._id, 'CREATE', req.body);
      this.success(res, data, 'Group created successfully', 201);
    } catch (error) {
      this.error(res, error.message, 400);
    }
  }

  /**
   * @description Update group
   * @route PUT /groups/:id
   * @access Private
   */
  async update(req, res) {
    try {
      const data = await GroupService.update(req.params.id, req.body);
      if (!data) return this.error(res, 'Group not found', 404);
      // Log Activities //
      await this.logActivity(req, 'Groups', req.params.id, 'UPDATE', req.body);
      this.success(res, data, 'Group updated successfully');
    } catch (error) {
      this.error(res, error.message, 400);
    }
  }

  /**
   * @description Delete group
   * @route DELETE /groups/:id
   * @access Private
   */
  async delete(req, res) {
    try {
      const data = await GroupService.delete(req.params.id);
      if (!data) return this.error(res, 'Group not found', 404);
      // Log Activities //
      await this.logActivity(req, 'Groups', req.params.id, 'DELETE', data);
      this.success(res, null, 'Group deleted successfully');
    } catch (error) {
      this.error(res, error.message, 400);
    }
  }
}

module.exports = new GroupController();
