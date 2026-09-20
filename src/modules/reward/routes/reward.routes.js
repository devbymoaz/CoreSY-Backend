const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const { authorizeRoles } = require('../../rbac/middlewares/rbac.middleware');
const {
  createReward,
  getRewards,
  getRewardById,
  updateReward,
  deleteReward,
  uploadRewardPhoto,
  redeemReward,
} = require('../controllers/reward.controller');
const {
  createRewardSchema,
  updateRewardSchema,
  listRewardsSchema,
  redeemRewardSchema,
} = require('../validators/reward.validator');
const { ROLES } = require('../../../constants');
const {
  upload,
  setUploadFolder,
  requireUploadedFile,
  validateUploadedFileSignatures,
} = require('../../../middlewares/upload.middleware');

const writeRoles = [ROLES.SUPER_ADMIN, ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER, ROLES.SUPPORT_ADMIN];

router.use(authenticate);

router.get('/', validate({ query: listRewardsSchema }), getRewards);
router.post('/redeem', validate({ body: redeemRewardSchema }), redeemReward);
router.get('/:id', getRewardById);
router.post('/', authorizeRoles(...writeRoles), validate({ body: createRewardSchema }), createReward);
router.patch(
  '/:id',
  authorizeRoles(...writeRoles),
  validate({ body: updateRewardSchema }),
  updateReward,
);
router.delete('/:id', authorizeRoles(...writeRoles), deleteReward);
router.post(
  '/:id/photo',
  authorizeRoles(...writeRoles),
  setUploadFolder('rewards'),
  upload.single('photo'),
  requireUploadedFile,
  validateUploadedFileSignatures,
  uploadRewardPhoto,
);

module.exports = router;
