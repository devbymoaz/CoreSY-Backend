/**
 * Syrian governorates - shared static list and helpers.
 * Used for API fallback and resolving legacy static IDs to database records.
 */

const SYRIAN_GOVERNORATES = [
  { id: 'static-damascus', name: 'Damascus', nameAr: 'دمشق', code: 'DM' },
  { id: 'static-aleppo', name: 'Aleppo', nameAr: 'حلب', code: 'AL' },
  { id: 'static-homs', name: 'Homs', nameAr: 'حمص', code: 'HO' },
  { id: 'static-hama', name: 'Hama', nameAr: 'حماة', code: 'HA' },
  { id: 'static-latakia', name: 'Latakia', nameAr: 'اللاذقية', code: 'LA' },
  { id: 'static-tartus', name: 'Tartus', nameAr: 'طرطوس', code: 'TA' },
  { id: 'static-idlib', name: 'Idlib', nameAr: 'إدلب', code: 'ID' },
  { id: 'static-deir-ez-zor', name: 'Deir ez-Zor', nameAr: 'دير الزور', code: 'DZ' },
  { id: 'static-raqqa', name: 'Raqqa', nameAr: 'الرقة', code: 'RQ' },
  { id: 'static-hasakah', name: 'Hasakah', nameAr: 'الحسكة', code: 'HK' },
  { id: 'static-daraa', name: 'Daraa', nameAr: 'درعا', code: 'DR' },
  { id: 'static-quneitra', name: 'Quneitra', nameAr: 'القنيطرة', code: 'QU' },
  { id: 'static-suwayda', name: 'Suwayda', nameAr: 'السويداء', code: 'SW' },
  {
    id: 'static-damascus-countryside',
    name: 'Damascus Countryside',
    nameAr: 'ريف دمشق',
    code: 'RD',
  },
];

const findStaticGovernorate = (id) => SYRIAN_GOVERNORATES.find((g) => g.id === id);

const isStaticGovernorateId = (id) =>
  typeof id === 'string' && id.startsWith('static-');

module.exports = {
  SYRIAN_GOVERNORATES,
  findStaticGovernorate,
  isStaticGovernorateId,
};
