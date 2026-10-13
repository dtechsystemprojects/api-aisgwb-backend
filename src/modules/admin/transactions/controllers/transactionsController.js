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


  // @desc    Delete single transaction
  // @route   DELETE /api/admin/transactions/:id
  // @access  Private/Admin
  async deleteTransaction(req, res) {
    try {
      const { id } = req.params;
      const transaction = await Transactions.findByIdAndDelete(id);
      if (!transaction) {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }
      res.status(200).json({
        success: true,
        message: 'Transaction deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      res.status(500).json({
        success: false,
        message: 'Server Error: Could not delete transaction',
        error: error.message
      });
    }
  }

  // @desc    Bulk delete transactions
  // @route   POST /api/admin/transactions/bulk-delete
  // @access  Private/Admin
  async bulkDeleteTransactions(req, res) {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'No transaction IDs provided' });
      }
      await Transactions.deleteMany({ _id: { $in: ids } });
      res.status(200).json({
        success: true,
        message: `${ids.length} transactions deleted successfully`,
      });
    } catch (error) {
      console.error('Error bulk deleting transactions:', error);
      res.status(500).json({
        success: false,
        message: 'Server Error: Could not bulk delete transactions',
        error: error.message
      });
    }
  }
}

module.exports = new TransactionsController();
