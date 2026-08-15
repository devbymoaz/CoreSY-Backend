/**
 * Business validation tests.
 * Ensures owner account passwords are accepted only when strong.
 */

const { createBusinessSchema } = require('../src/modules/business/validators/business.validator');

const validBusiness = {
  name: 'Maaz Restaurant',
  type: 'RESTAURANT',
  category: 'Food & Beverage',
  description: 'A family restaurant serving Pakistani food.',
  ownerName: 'Maaz Shahid',
  ownerEmail: 'maazshahid@example.com',
  ownerPhone: '+923001234567',
  ownerPassword: 'Business@123',
  businessEmail: 'mmaaazrestaurant@ss.com',
  businessPhone: '+923111112222',
  registrationNumber: 'REG-2026-087',
  governorateId: 'a7f11770-5f94-445d-bd33-307cdba8f600',
  city: 'Lahore',
  address: 'Main Street, 123',
};

describe('Business Validators', () => {
  it('accepts a strong optional owner password', () => {
    const result = createBusinessSchema.safeParse(validBusiness);

    expect(result.success).toBe(true);
  });

  it('rejects a weak owner password', () => {
    const result = createBusinessSchema.safeParse({
      ...validBusiness,
      ownerPassword: 'password',
    });

    expect(result.success).toBe(false);
  });

  it('allows an existing owner to be linked without a password', () => {
    const existingOwnerBusiness = { ...validBusiness };
    delete existingOwnerBusiness.ownerPassword;
    const result = createBusinessSchema.safeParse(existingOwnerBusiness);

    expect(result.success).toBe(true);
  });
});
