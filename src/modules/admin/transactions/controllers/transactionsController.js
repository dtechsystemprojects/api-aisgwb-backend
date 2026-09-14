const Transactions = require('../models/transactionsModel');

class TransactionsController {
  
  // @desc    Get all transactions
  // @route   GET /api/admin/transactions
  // @access  Private/Admin
  async getTransactions(req, res) {
    try {
      const transactions = await Transactions.find()
        .populate('userId', 'name email mobile')
        .populate('bookingId', 'bookingStatus paymentStatus')
        .populate('eventId', 'title startDate startTime venueLocation')
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        count: transactions.length,
        data: transactions
      });
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({
        success: false,
        message: 'Server Error: Could not fetch transactions',
        error: error.message
      });
    }
  }

}

module.exports = new TransactionsController();
