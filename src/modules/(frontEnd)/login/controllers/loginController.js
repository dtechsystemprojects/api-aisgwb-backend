const { BaseController } = require('../../../../core');
const Users = require('../../../admin/users/models/usersModel');
const Group = require('../../../admin/groups/models/groupModel');
const tokenService = require('../../../../services/tokenService');
const emailService = require('../../../../services/emailService');
const Membership = require('../../../admin/memberships/models/membershipsModel');

class LoginController extends BaseController {
  async sendOtp(req, res) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return this.error(res, 'Email ID is required', 400);
      }

      const user = await Users.findOne({ email, isActive: true });
      if (!user) {
        return this.error(res, 'User not found or inactive', 404);
      }

      // Generate 6 digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Set OTP expiry to 5 minutes from now
      const otpExpiry = new Date(Date.now() + 5 * 60000);

      user.otp = otp;
      user.otpExpiry = otpExpiry;
      await user.save();

      // Send the OTP via Email
      const emailSubject = 'Your OTP for Login';
      const emailHtml = `<p>Your OTP is: <strong>${otp}</strong></p><p>It will expire in 5 minutes.</p>`;
      await emailService.sendEmail(user.email, emailSubject, emailHtml);
      
      this.success(res, { message: 'OTP sent successfully to your email' }, 'OTP Sent');
    } catch (error) {
      this.error(res, error.message, 500);
    }
  }

  async verifyOtp(req, res) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return this.error(res, 'Email ID and OTP are required', 400);
      }

      const user = await Users.findOne({ email, isActive: true });
      if (!user) {
        return this.error(res, 'User not found or inactive', 404);
      }

      if (user.otp !== otp) {
        return this.error(res, 'Invalid OTP', 400);
      }

      if (user.otpExpiry < new Date()) {
        return this.error(res, 'OTP has expired', 400);
      }

      // OTP is valid, clear it
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

      this.success(res, { token, user: userObj }, 'Login successful');
    } catch (error) {
      this.error(res, error.message, 500);
    }
  }

  async getProfile(req, res) {
    try {
      const user = await Users.findById(req.user._id).select('-password -otp -otpExpiry');
      if (!user) {
        return this.error(res, 'User not found', 404);
      }
      const userObj = user.toObject();
      const membership = await Membership.findOne({ userId: user._id }).sort({ createdAt: -1 }).lean();
      if (membership) {
        userObj.membership = membership;
      }

      this.success(res, { user: userObj }, 'Profile fetched successfully');
    } catch (error) {
      this.error(res, error.message, 500);
    }
  }

  async updateProfile(req, res) {
    try {
      const { name, username, email, mobile, groupId, memberId, sex, avatar } = req.body;
      const user = await Users.findById(req.user._id);
      
      if (!user) {
        return this.error(res, 'User not found', 404);
      }

      if (name) user.name = name;
      if (username) user.username = username;
      if (email) user.email = email;
      if (mobile) user.mobile = mobile;
      if (memberId !== undefined) user.memberId = memberId;
      if (sex) user.sex = sex;
      if (avatar !== undefined) user.avatar = avatar;

      if (groupId) {
        user.groupId = groupId;
        const groupDoc = await Group.findOne({ id: groupId });
        if (groupDoc) {
          user.group = groupDoc.name;
        }
      }

      await user.save();
      
      // Update Membership table data for this user
      const membershipUpdateData = {};
      if (name) membershipUpdateData.name = name;
      if (email) membershipUpdateData.email = email;
      if (mobile) membershipUpdateData.phone = mobile;
      if (sex) membershipUpdateData.gender = sex;

      if (Object.keys(membershipUpdateData).length > 0) {
        await Membership.updateMany(
          { userId: user._id },
          { $set: membershipUpdateData }
        );
      }
      
      // Re-issue token with updated data (especially groupId)
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

      this.success(res, { token, user: userObj }, 'Profile updated successfully');
    } catch (error) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        const fieldName = field === 'mobile' ? 'Mobile number' : (field.charAt(0).toUpperCase() + field.slice(1));
        return this.error(res, `${fieldName} is already in use by another account`, 400);
      }
      this.error(res, error.message, 500);
    }
  }

}

module.exports = new LoginController();
