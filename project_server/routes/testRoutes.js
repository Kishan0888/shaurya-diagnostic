const router = require("express").Router();
const { protect, authorize } = require("../middleware/auth");
const testController = require("../controllers/testController");
const multer = require("multer");
const path = require("path");

const upload = multer({
  dest: path.join(__dirname, "../uploads/temp"),
});

router.get("/", protect, testController.getTests);
router.post("/", protect, authorize("admin"), testController.createTest);
router.post(
  "/import",
  protect,
  authorize("admin"),
  upload.single("file"),
  testController.importTests
);
router.put("/:id", protect, authorize("admin"), testController.updateTest);
router.delete("/:id", protect, authorize("admin"), testController.deleteTest);

module.exports = router;