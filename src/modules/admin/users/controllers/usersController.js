const { BaseController } = require('../../../../core');
const UsersService = require('../services/usersService');
const Membership = require('../../memberships/models/membershipsModel');
class UsersController extends BaseController {
  /**
   * @description Fetch all users with pagination
   * @route GET /users
   * @access Private
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async getAll(req, res) {
    try {
      const pageNum = parseInt(req.query.page, 10) || 1;
      const limitNum = parseInt(req.query.limit, 10) || 10;

      const data = await UsersService.getAll(pageNum, limitNum);
      this.paginated(res, data.data, data.total, pageNum, limitNum, 'Users fetched successfully');
    } catch (error) {
      this.error(res, error.message, 500);
    }
  }

  /**
   * @description Fetch user by ID
   * @route GET /users/:id
   * @access Private
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async getById(req, res) {
    try {
      const data = await UsersService.getById(req.params.id);
      if (!data) {
        return this.error(res, 'Users not found', 404);
      }
      this.success(res, data, 'Users fetched successfully');
    } catch (error) {
      this.error(res, error.message, 500);
    }
  }

  /**
   * @description Create new user
   * @route POST /users
   * @access Private
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async create(req, res) {
    try {
      const data = await UsersService.create(req.body);
      // Log Activities //
      await this.logActivity(req, 'Users', data._id, 'CREATE', req.body);
      this.success(res, data, 'Users created successfully', 201);
    } catch (error) {
      this.error(res, error.message, 400);
    }
  }

  /**
   * @description Update user
   * @route PUT /users/:id
   * @access Private
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async update(req, res) {
    try {
      const data = await UsersService.update(req.params.id, req.body);
      
      // Update Membership table data for this user if it exists
      const { name, email, mobile, phone, sex, gender } = req.body;
      const membershipUpdateData = {};
      if (name) membershipUpdateData.name = name;
      if (email) membershipUpdateData.email = email;
      if (mobile || phone) membershipUpdateData.phone = mobile || phone;
      if (sex || gender) membershipUpdateData.gender = sex || gender;

      if (Object.keys(membershipUpdateData).length > 0) {
        await Membership.updateMany(
          { userId: req.params.id },
          { $set: membershipUpdateData }
        );
      }

      // Log Activities //
      await this.logActivity(req, 'Users', req.params.id, 'UPDATE', req.body);
      this.success(res, data, 'Users updated successfully');
    } catch (error) {
      this.error(res, error.message, 400);
    }
  }

  /**
   * @description Update user status
   * @route PUT /users/:id/status
   * @access Private
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async status(req, res) {
    try {
      const status = req.body.status === 1 || req.body.status === true;
      const data = await UsersService.status(req.params.id, status);
      //  Log Activities //
      await this.logActivity(req, 'Users', req.params.id, 'STATUS', req.body);
      this.success(res, data, 'Users status updated successfully');
    } catch (error) {
      this.error(res, error.message, 400);
    }
  }

  /**
   * @description Delete user
   * @route DELETE /users/:id
   * @access Private
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async delete(req, res) {
    try {
      const data = await UsersService.getById(req.params.id);
      // Log Activities //
      await this.logActivity(req, 'Users', req.params.id, 'DELETE', data);
      await UsersService.delete(req.params.id);
      this.success(res, null, 'Users deleted successfully');
    } catch (error) {
      this.error(res, error.message, 500);
    }
  }
}

module.exports = new UsersController();
