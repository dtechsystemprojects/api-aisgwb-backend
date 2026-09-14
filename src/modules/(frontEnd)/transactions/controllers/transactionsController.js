
const Transactions = require('../../../admin/transactions/models/transactionsModel');
const exceljs = require('exceljs');

class TransactionsController {
  async getMyTransactions(req, res) {
    try {
      const userId = req.user._id;
      const transactions = await Transactions.find({ userId }).populate('eventId').sort({ createdAt: -1 });
      
      return res.status(200).json({
        success: true,
        data: transactions
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch your transactions',
        error: error.message
      });
    }
  }

  async exportMyTransactions(req, res) {
    try {
      const userId = req.user._id;
      const transactions = await Transactions.find({ userId }).populate('eventId').sort({ createdAt: -1 });

      const workbook = new exceljs.Workbook();
      const worksheet = workbook.addWorksheet('Transactions');

      worksheet.columns = [
        { header: 'Transaction Ref', key: 'transactionRef', width: 25 },
        { header: 'Date & Time', key: 'dateAndTime', width: 25 },
        { header: 'Description', key: 'description', width: 35 },
        { header: 'Payment Method', key: 'paymentMethod', width: 20 },
        { header: 'Amount (INR)', key: 'amount', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
      ];

      transactions.forEach((txn) => {
        worksheet.addRow({
          transactionRef: txn.transactionRef || txn._id.toString(),
          dateAndTime: txn.dateAndTime ? new Date(txn.dateAndTime).toLocaleString() : '',
          description: txn.description || (txn.eventId ? txn.eventId.title + ' Registration' : 'Payment'),
          paymentMethod: txn.paymentMethod || 'Online',
          amount: txn.amount || 0,
          status: txn.status || 'Pending'
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=Transactions.xlsx');

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Export Error:", error);
      return res.status(500).json({
        success: false,
        message: 'Failed to export transactions',
        error: error.message
      });
    }
  }

}

module.exports = new TransactionsController();
