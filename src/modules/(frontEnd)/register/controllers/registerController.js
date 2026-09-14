const { BaseController } = require('../../../../core');
const Users = require('../../../admin/users/models/usersModel');
const Group = require('../../../admin/groups/models/groupModel');
const tokenService = require('../../../../services/tokenService');
const emailService = require('../../../../services/emailService');

class RegisterController extends BaseController {
  async sendOtp(req, res) {
    try {
      const { name, email, mobile, password, sex, groupId, memberId } = req.body;
      let { username } = req.body;

      if (!name || !email || !mobile || !groupId || !sex) {
        return this.error(res, 'All required fields must be provided', 400);
      }

      if (!username) {
        const baseName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        let isUnique = false;
        while (!isUnique) {
          username = `${baseName}${Math.floor(1000 + Math.random() * 9000)}`;
          const existing = await Users.findOne({ username });
          if (!existing) {
            isUnique = true;
          }
        }
      }

      // Check for existing active user
      let existingUser = await Users.findOne({
        $or: [{ email }, { mobile }, { username }],
      });

      if (existingUser) {
        if (existingUser.isActive) {
          if (existingUser.email === email) return this.error(res, 'Email is already registered', 400);
          if (existingUser.mobile === mobile) return this.error(res, 'Mobile number is already registered', 400);
          if (existingUser.username === username) return this.error(res, 'Username is already taken', 400);
        } else {
          // Overwrite old abandoned registration data
          existingUser.name = name;
          existingUser.mobile = mobile;
          existingUser.username = username;
          if (password) existingUser.password = password;
          existingUser.sex = sex;
          existingUser.groupId = groupId;
          existingUser.memberId = memberId;
        }
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 5 * 60000);

      // Create an inactive profile to store the OTP
      if (existingUser && !existingUser.isActive) {
        existingUser.otp = otp;
        existingUser.otpExpiry = otpExpiry;
        await existingUser.save();
      } else {
        const userData = {
          name,
          email,
          mobile,
          username,
          password,
          sex,
          groupId,
          memberId,
          isActive: false,
          status: 'Inactive',
          otp,
          otpExpiry,
          joinedDate: new Date().toISOString(),
        };
        await Users.create(userData);
      }

      const emailSubject = 'Your OTP for Registration';
      const emailHtml = `<p>Your OTP is: <strong>${otp}</strong></p><p>It will expire in 5 minutes.</p>`;
      await emailService.sendEmail(email, emailSubject, emailHtml);

      this.success(res, { message: 'OTP sent successfully to your email' }, 'OTP Sent', 200);
    } catch (error) {
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((val) => val.message);
        return this.error(res, messages.join(', '), 400);
      }
      this.error(res, error.message, 500);
    }
  }

  async register(req, res) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return this.error(res, 'Email ID and OTP are required', 400);
      }

      const user = await Users.findOne({ email, isActive: false });
      if (!user) {
        return this.error(res, 'Registration session expired or invalid. Please sign up again.', 400);
      }

      if (user.otp !== otp) {
        return this.error(res, 'Invalid OTP', 400);
      }

      if (user.otpExpiry < new Date()) {
        return this.error(res, 'OTP has expired', 400);
      }

      // Activate the user fully upon successful OTP verify
      user.isActive = true;
      user.status = 'Active';
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();

      // Generate Token
      const token = tokenService.generateToken({
        id: user._id,
        email: user.email,
        mobile: user.mobile,
        username: user.username,
        groupId: user.groupId,
        isFrontEnd: true,
      });

      const userObj = user.toObject();
      delete userObj.password;
      delete userObj.otp;
      delete userObj.otpExpiry;

      this.success(res, { token, user: userObj }, 'Registration successful', 201);
    } catch (error) {
      this.error(res, error.message, 500);
    }
  }

  async getGroups(req, res) {
    try {
      const groups = await Group.find({
        $or: [{ status: 'Active' }, { isActive: true }],
      })
        .sort({ createdAt: -1 })
        .lean();

      const filteredGroups = groups.filter((group) => group.id !== 'GRP-1');

      return this.success(res, filteredGroups, 'Groups fetched successfully', 200);
    } catch (error) {
      return this.error(res, error.message, 500);
    }
  }
}

module.exports = new RegisterController();
