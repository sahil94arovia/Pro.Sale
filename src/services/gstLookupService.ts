import { INDIAN_STATES } from '../utils/constants';

export interface GSTVerificationResult {
  isValid: boolean;
  gstin: string;
  status: 'ACTIVE' | 'CANCELLED' | 'INACTIVE' | 'INVALID_FORMAT' | 'INVALID_STATE' | 'INVALID_CHECKSUM' | 'INCOMPLETE';
  tradeName: string;
  legalName: string;
  pan: string;
  taxpayerType: 'Regular' | 'Composition';
  constitution?: string;
  state: string;
  stateCode: string;
  city: string;
  pincode: string;
  address: string;
  registrationDate?: string;
  message: string;
  isLive?: boolean;
}

const CHAR_SET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Validates Indian GST Luhn Mod 36 Checksum
 */
export function verifyGSTChecksum(gstin: string): boolean {
  if (gstin.length !== 15) return false;
  try {
    let sum = 0;
    for (let i = 0; i < 14; i++) {
      const codePoint = CHAR_SET.indexOf(gstin[i]);
      if (codePoint === -1) return false;
      const factor = i % 2 === 0 ? 1 : 2;
      let addend = factor * codePoint;
      addend = Math.floor(addend / 36) + (addend % 36);
      sum += addend;
    }
    const remainder = sum % 36;
    const checkCodePoint = (36 - remainder) % 36;
    return CHAR_SET[checkCodePoint] === gstin[14];
  } catch {
    return false;
  }
}

/**
 * Validates and automatically verifies Indian GSTIN using real live Government GSTN search
 * and returns genuine registered office address, legal name, trade name, and tax classification.
 */
export async function verifyAndFetchGSTDetails(rawGstin: string): Promise<GSTVerificationResult> {
  const gstin = rawGstin.trim().toUpperCase();

  if (gstin.length < 15) {
    return {
      isValid: false,
      gstin,
      status: 'INCOMPLETE',
      tradeName: '',
      legalName: '',
      pan: '',
      taxpayerType: 'Regular',
      state: '',
      stateCode: '',
      city: '',
      pincode: '',
      address: '',
      message: 'GSTIN must be 15 characters.',
      isLive: false,
    };
  }

  // Strict GSTIN regex pattern
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstinRegex.test(gstin)) {
    return {
      isValid: false,
      gstin,
      status: 'INVALID_FORMAT',
      tradeName: '',
      legalName: '',
      pan: '',
      taxpayerType: 'Regular',
      state: '',
      stateCode: '',
      city: '',
      pincode: '',
      address: '',
      message: 'Invalid GSTIN format. Expected: 2-digit State + 10-digit PAN + 1-digit Entity + Z + Checksum.',
      isLive: false,
    };
  }

  const stateCode = gstin.substring(0, 2);
  const pan = gstin.substring(2, 12);
  const matchedState = INDIAN_STATES.find((s) => s.code === stateCode);

  if (!matchedState) {
    return {
      isValid: false,
      gstin,
      status: 'INVALID_STATE',
      tradeName: '',
      legalName: '',
      pan,
      taxpayerType: 'Regular',
      state: '',
      stateCode,
      city: '',
      pincode: '',
      address: '',
      message: `Invalid State Code '${stateCode}'. Not recognized in Indian GST portal.`,
      isLive: false,
    };
  }

  // 1. Attempt Real Live Government GST Lookup via Vite Backend
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    const response = await fetch(`/api/gst-lookup?gstin=${encodeURIComponent(gstin)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      if (data && data.success) {
        const rawStatus = (data.status || 'ACTIVE').toUpperCase();
        const status: GSTVerificationResult['status'] =
          rawStatus === 'ACTIVE' ? 'ACTIVE' : rawStatus === 'CANCELLED' ? 'CANCELLED' : 'INACTIVE';

        return {
          isValid: true,
          gstin: data.gstin || gstin,
          status,
          tradeName: data.tradeName || data.legalName || '',
          legalName: data.legalName || data.tradeName || '',
          pan: data.pan || pan,
          taxpayerType: data.taxpayerType === 'Composition' ? 'Composition' : 'Regular',
          constitution: data.constitution || '',
          state: data.state || matchedState.name,
          stateCode: data.stateCode || stateCode,
          city: data.city || '',
          pincode: data.pincode || '',
          address: data.address || '',
          registrationDate: data.registrationDate || '',
          message:
            status === 'ACTIVE'
              ? `✓ Live GSTN Verified: ${data.tradeName || data.legalName} (${data.constitution || data.taxpayerType})`
              : `⚠️ GST Status: ${status} in GST Portal.`,
          isLive: true,
        };
      }
    }
  } catch (err) {
    console.warn('[GST Lookup] Live API fetch error:', err);
  }

  // 2. Fallback: Offline validation
  // NOTE: We NEVER fabricate fake names or fake addresses!
  const checksumOk = verifyGSTChecksum(gstin);

  // Derive taxpayer entity type from 4th character of PAN
  const entityChar = pan.charAt(3);
  let constitution = 'Proprietorship';
  if (entityChar === 'C') constitution = 'Company';
  else if (entityChar === 'F') constitution = 'Partnership / LLP';
  else if (entityChar === 'H') constitution = 'HUF';
  else if (entityChar === 'T') constitution = 'Trust';

  return {
    isValid: checksumOk,
    gstin,
    status: checksumOk ? 'ACTIVE' : 'INVALID_CHECKSUM',
    tradeName: '',
    legalName: '',
    pan,
    taxpayerType: 'Regular',
    constitution,
    state: matchedState.name,
    stateCode,
    city: '',
    pincode: '',
    address: '',
    message: checksumOk
      ? 'GSTIN format & checksum valid. Live registry lookup offline; please enter trade name & address.'
      : 'Invalid GSTIN Luhn checksum. Please verify the number entered.',
    isLive: false,
  };
}
