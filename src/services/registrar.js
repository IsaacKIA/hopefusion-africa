/**
 * Ghana (ORC / Registrar General's Department) Sandbox KYB Verification Service
 */

/**
 * Verifies a company registration number with the Ghana Registrar.
 * Ghana registration formats generally start with CS, CG, or PL, followed by digits and a 4-digit year.
 * Example: CS123452026, CG000452025
 * 
 * @param {string} registryNumber 
 * @param {string} country 
 * @returns {object} Verification status and company metadata
 */
export function verifyCompany(registryNumber, country) {
  if (!registryNumber || !country) {
    return { verified: false, error: 'Both registryNumber and country are required' };
  }

  const cleanCountry = country.trim().toUpperCase();
  if (cleanCountry !== 'GH' && cleanCountry !== 'GHANA') {
    return { verified: false, error: 'Only Ghana registry verification is supported at this stage' };
  }

  const cleanNumber = registryNumber.trim().toUpperCase();
  
  // Ghana registration number regex: CS/CG/PL followed by 5 to 10 digits and 4-digit year
  const ghanaFormatRegex = /^(CS|CG|PL)\d{5,10}\d{4}$/;

  if (!ghanaFormatRegex.test(cleanNumber)) {
    return { 
      verified: false, 
      error: 'Invalid Ghana registry number format. Expected CS, CG, or PL followed by registration digits and 4-digit year (e.g., CS123452026)' 
    };
  }

  // Derived mock company name from registration number digits
  const regId = cleanNumber.replace(/[^0-9]/g, '').slice(0, 5);
  const companyName = `GHANA INNOVATION HUB ${regId} LTD`;

  return {
    verified: true,
    company_name: companyName,
    registry_number: cleanNumber,
    incorporation_date: `${cleanNumber.slice(-4)}-01-15`,
    status: 'active',
    country: 'GH',
    registrar: 'Office of the Registrar of Companies (ORC) Ghana'
  };
}
