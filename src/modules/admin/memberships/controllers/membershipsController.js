const Transactions = require('../../transactions/models/transactionsModel');
const Membership = require('../models/membershipsModel');
const User = require('../../users/models/usersModel');
const emailService = require('../../../../services/emailService');

class MembershipsController {
  async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const query = {};
      if (req.query.status) {
        query.status = req.query.status;
      }

      const memberships = await Membership.find(query)
        .populate('userId', 'name email mobile sex username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Membership.countDocuments(query);

      res.status(200).json({
        success: true,
        data: memberships,
        total,
        page,
        pages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error('Error fetching memberships:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch memberships', error: error.message });
    }
  }

  async getById(req, res) {
    try {
      const { userId } = req.params;
      const data = await Membership.findOne({ userId }).sort({ _id: -1, createdAt: -1 });
      if (!data) {
        return res.status(404).json({ success: false, message: 'Membership not found' });
      }
      res.status(200).json({ success: true, data: data, message: 'Membership fetched successfully' });
    } catch (error) {
      console.error('Error fetching membership:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch membership', error: error.message });
    }
  }

  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, rejectReason } = req.body;

      if (!['Pending', 'Approved', 'Rejected', 'Suspended'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }

      const updateData = { status };
      if (status === 'Rejected' || status === 'Suspended') {
        updateData.rejectReason = rejectReason;
        updateData.rejectedAt = new Date();
      } else if (status === 'Approved') {
        updateData.approvedAt = new Date();
      }

      const membership = await Membership.findByIdAndUpdate(id, updateData, { new: true });

      if (membership && membership.userId) {
        if (status === 'Approved') {
          await User.findByIdAndUpdate(membership.userId, {
            memberId: membership.stateMembershipId || membership.centralMembershipId,
            status: 'Active',
          });

          // Send Approval Email
          try {
            const html = `
              <h2>Membership Approved</h2>
              <p>Dear ${membership.name},</p>
              <p>Your membership has been approved.</p>
              <p><strong>Central ID:</strong> ${membership.centralMembershipId}</p>
              ${membership.stateMembershipId ? `<p><strong>State ID:</strong> ${membership.stateMembershipId}</p>` : ''}
              <p>Thank you for joining us.</p>
            `;
            await emailService.sendEmail(membership.email, 'Membership Approved', html);
          } catch (err) {
            console.error('Failed to send approval email', err);
          }
        } else if (status === 'Rejected') {
          await User.findByIdAndUpdate(membership.userId, {
            memberId: null,
          });

          // Send Rejection Email
          try {
            const html = `
              <h2>Membership Rejected</h2>
              <p>Dear ${membership.name},</p>
              <p>Unfortunately, your membership application has been rejected.</p>
              <p><strong>Reason:</strong> ${rejectReason || 'No specific reason provided'}</p>
              <p>Please contact support for more details.</p>
            `;
            await emailService.sendEmail(membership.email, 'Membership Rejected', html);
          } catch (err) {
            console.error('Failed to send rejection email', err);
          }
        } else if (status === 'Suspended') {
          // Send Suspension Email
          try {
            const html = `
              <h2>Membership Suspended</h2>
              <p>Dear ${membership.name},</p>
              <p>Your membership has been suspended.</p>
              <p><strong>Reason:</strong> ${rejectReason || 'Administrative action'}</p>
              <p>Please contact support for more details.</p>
            `;
            await emailService.sendEmail(membership.email, 'Membership Suspended', html);
          } catch (err) {
            console.error('Failed to send suspension email', err);
          }
        }
      }

      if (!membership) {
        return res.status(404).json({ success: false, message: 'Membership not found' });
      }

      res.status(200).json({
        success: true,
        message: `Membership ${status.toLowerCase()} successfully`,
        data: membership,
      });
    } catch (error) {
      console.error('Error updating membership status:', error);
      res.status(500).json({ success: false, message: 'Failed to update status', error: error.message });
    }
  }
  async delete(req, res) {
    try {
      const { id } = req.params;
      const membership = await Membership.findById(id);
      if (!membership) {
        return res.status(404).json({ success: false, message: 'Membership not found' });
      }

      // Check if any transactions exist against this membership user ID or transactionRef
      const txnQuery = {
        $or: [
          ...(membership.userId ? [{ userId: membership.userId }] : []),
          ...(membership.transactionRef ? [{ transactionRef: membership.transactionRef }] : [])
        ]
      };

      if (txnQuery.$or.length > 0) {
        const txnCount = await Transactions.countDocuments(txnQuery);
        if (txnCount > 0) {
          return res.status(400).json({
            success: false,
            message: `Cannot delete membership for "${membership.name}": ${txnCount} transaction record(s) exist against this user.`
          });
        }
      }

      await Membership.findByIdAndDelete(id);
      res.status(200).json({
        success: true,
        message: 'Membership deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting membership:', error);
      res.status(500).json({ success: false, message: 'Failed to delete membership', error: error.message });
    }
  }

  async bulkDelete(req, res) {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'No membership IDs provided' });
      }

      const memberships = await Membership.find({ _id: { $in: ids } });
      if (memberships.length === 0) {
        return res.status(404).json({ success: false, message: 'No memberships found to delete' });
      }

      // Check which memberships have transactions against their userId or transactionRef
      const blockedMemberships = [];
      const deletableIds = [];

      for (const m of memberships) {
        const txnQuery = {
          $or: [
            ...(m.userId ? [{ userId: m.userId }] : []),
            ...(m.transactionRef ? [{ transactionRef: m.transactionRef }] : [])
          ]
        };

        let hasTransactions = false;
        if (txnQuery.$or.length > 0) {
          const count = await Transactions.countDocuments(txnQuery);
          if (count > 0) {
            hasTransactions = true;
          }
        }

        if (hasTransactions) {
          blockedMemberships.push(m.name || m.email || m._id);
        } else {
          deletableIds.push(m._id);
        }
      }

      if (blockedMemberships.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Transaction record(s) exist against user(s) (${blockedMemberships.join(', ')}). Delete not allowed when transactions exist.`
        });
      }

      await Membership.deleteMany({ _id: { $in: deletableIds } });

      res.status(200).json({
        success: true,
        deletedCount: deletableIds.length,
        message: `${deletableIds.length} membership(s) deleted successfully`,
      });
    } catch (error) {
      console.error('Error bulk deleting memberships:', error);
      res.status(500).json({ success: false, message: 'Failed to bulk delete memberships', error: error.message });
    }
  }
}

module.exports = new MembershipsController();
