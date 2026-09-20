const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const { authorizeRoles } = require('../../rbac/middlewares/rbac.middleware');
const {
  createOffer,
  getOffers,
  getOfferById,
  updateOffer,
  deleteOffer,
  uploadOfferPhoto,
} = require('../controllers/offer.controller');
const {
  createOfferSchema,
  updateOfferSchema,
  listOffersSchema,
} = require('../validators/offer.validator');
const { ROLES } = require('../../../constants');
const {
  upload,
  setUploadFolder,
  requireUploadedFile,
  validateUploadedFileSignatures,
} = require('../../../middlewares/upload.middleware');

const writeRoles = [ROLES.SUPER_ADMIN, ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER];

router.use(authenticate);

router.get('/', validate({ query: listOffersSchema }), getOffers);
router.get('/:id', getOfferById);
router.post('/', authorizeRoles(...writeRoles), validate({ body: createOfferSchema }), createOffer);
router.patch(
  '/:id',
  authorizeRoles(...writeRoles),
  validate({ body: updateOfferSchema }),
  updateOffer,
);
router.delete('/:id', authorizeRoles(...writeRoles), deleteOffer);
router.post(
  '/:id/photo',
  authorizeRoles(...writeRoles),
  setUploadFolder('offers'),
  upload.single('photo'),
  requireUploadedFile,
  validateUploadedFileSignatures,
  uploadOfferPhoto,
);

module.exports = router;
