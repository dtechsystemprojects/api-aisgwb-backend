const { BaseController } = require('../../../core');
const AuthService = require('../services/authService');

class AuthController extends BaseController {
  async me(req, res) {
    try {
      const result = await AuthService.getProfile(req.admin._id);
      this.success(res, result, 'Profile fetched successfully');
    } catch (error) {
      this.error(res, error.message, 401);
    }
  }

  async register(req, res) {
    try {
      const user = await AuthService.register(req.body);
      this.success(res, user, 'Registered successfully', 201);
    } catch (error) {
      this.error(res, error.message, 400);
    }
  }

  async login_email(req, res) {
    try {
      const { email, password } = req.body;
      const data = await AuthService.login(email, password);
      this.success(res, data, 'Login successful');
    } catch (error) {
      this.error(res, error.message, 401);
    }
  }

  async login(req, res) {
    try {
      const { username, password } = req.body;
      const result = await AuthService.login(username, password);
      this.success(res, result, 'Login successful');
    } catch (error) {
      this.error(res, error.message, 400);
    }
  }
}

module.exports = new AuthController();
