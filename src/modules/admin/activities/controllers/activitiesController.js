const { BaseController } = require('../../../../core');
const ActivitiesService = require('../services/activitiesService');

class ActivitiesController extends BaseController {

  /**
   * @description Fetch all activities with pagination
   * @route GET /activities
   * @access Private
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async getAll(req, res) {
    try {
      const pageNum = parseInt(req.query.page, 10) || 1;
      const limitNum = parseInt(req.query.limit, 10) || 10;
      const data = await ActivitiesService.getAll(pageNum, limitNum);
      this.paginated(res, data.data, data.total, pageNum, limitNum, 'Activities fetched successfully');
    } catch (error) {
      this.error(res, error.message, 500);
    }
  }

  /**
   * @description Fetch activities by ID
   * @route GET /activities/:id
   * @access Private
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async getById(req, res) {
    try {
      const data = await ActivitiesService.getById(req.params.id);
      if (!data) return this.error(res, 'Activities not found', 404);
      this.success(res, data, 'Activities fetched successfully');
    } catch (error) {
      this.error(res, error.message, 500);
    }
  }

  /**
   * @description Create new activities
   * @route POST /activities
   * @access Private
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async create(req, res) {
    try {
      const data = await ActivitiesService.create(req.body);
      this.success(res, data, 'Activities created successfully', 201);
    } catch (error) {
      this.error(res, error.message, 400);
    }
  }

  /**
   * @description Update activities
   * @route PUT /activities/:id
   * @access Private
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async update(req, res) {
    try {
      const data = await ActivitiesService.update(req.params.id, req.body);
      this.success(res, data, 'Activities updated successfully');
    } catch (error) {
      this.error(res, error.message, 400);
    }
  }

  /**
   * @description Delete activities
   * @route DELETE /activities/:id
   * @access Private
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async delete(req, res) {
    try {
      await ActivitiesService.delete(req.params.id);
      this.success(res, null, 'Activities deleted successfully');
    } catch (error) {
      this.error(res, error.message, 500);
    }
  }
}

module.exports = new ActivitiesController();
