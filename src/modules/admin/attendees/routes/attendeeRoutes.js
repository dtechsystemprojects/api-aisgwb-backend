const express = require("express");
const router = express.Router();
const attendeesController = require("../controllers/attendeesController");

router.post("/", attendeesController.createAttendee);
router.get("/", attendeesController.getAttendees);
router.get("/:id", attendeesController.getAttendeeById);
router.put("/:id", attendeesController.updateAttendee);
router.delete("/:id", attendeesController.deleteAttendee);
router.post("/:id/resend-ticket", attendeesController.resendTicket);

module.exports = router;
