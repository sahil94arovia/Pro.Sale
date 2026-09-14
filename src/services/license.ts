// Pro.Sale Enterprise Licensing & Feature Gating Engine
export type PlanType = 'trial' | 'silver' | 'gold';

export interface LicenseState {
  plan: PlanType;
  isActivated: boolean;
  licenseKey?: string;
  activatedAt?: string;
  trialStartDate?: string;
  trialDaysRemaining: number;
}

export type GatedFeature =
  | 'BARCODE'
  | 'GSTR_REPORTS'
  | 'PROFIT_ANALYTICS'
  | 'EINVOICE'
  | 'MULTI_FIRM';

const LICENSE_STORAGE_KEY = 'prosale_license_v2';
const TRIAL_DURATION_DAYS = 6;
// Official hidden license keys specified by vendor
const GOLD_LICENSE_KEY = '50020171elasorp09';
const SILVER_LICENSE_KEY = '50020171elasorp01';

export const licenseService = {
  // Validate format and authenticity against private vendor keys
  validateLicenseKey(key: string): { valid: boolean; tier?: 'gold' | 'silver'; message?: string } {
    if (!key || typeof key !== 'string') {
      return { valid: false, message: 'License key cannot be empty.' };
    }

    const cleaned = key.trim().toLowerCase().replace(/\s+/g, '');

    // Official vendor private keys
    if (cleaned === GOLD_LICENSE_KEY) {
      return { valid: true, tier: 'gold' };
    }
    if (cleaned === SILVER_LICENSE_KEY) {
      return { valid: true, tier: 'silver' };
    }

    return {
      valid: false,
      message: 'Invalid License Key. Please enter an authentic Pro.Sale license key.',
    };
  },

  getLicenseState(): LicenseState {
    try {
      const raw = localStorage.getItem(LICENSE_STORAGE_KEY);
      if (raw) {
        const parsed: Partial<LicenseState> = JSON.parse(raw);
        if (parsed.plan === 'gold' || parsed.plan === 'silver') {
          // Double verify that the stored key is valid
          if (parsed.licenseKey && this.validateLicenseKey(parsed.licenseKey).valid) {
            return {
              plan: parsed.plan,
              isActivated: true,
              licenseKey: parsed.licenseKey,
              activatedAt: parsed.activatedAt,
              trialDaysRemaining: 0,
            };
          }
        }

        // Trial mode
        const startDate = parsed.trialStartDate ? new Date(parsed.trialStartDate) : new Date();
        const now = new Date();
        const diffMs = now.getTime() - startDate.getTime();
        const daysPassed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.max(0, TRIAL_DURATION_DAYS - daysPassed);

        return {
          plan: 'trial',
          isActivated: false,
          trialStartDate: parsed.trialStartDate || new Date().toISOString(),
          trialDaysRemaining: daysRemaining,
        };
      }
    } catch {
      // Fallback
    }

    // Default: 6-day evaluation trial
    return {
      plan: 'trial',
      isActivated: false,
      trialStartDate: new Date().toISOString(),
      trialDaysRemaining: TRIAL_DURATION_DAYS,
    };
  },

  startTrial(): LicenseState {
    const trialState: LicenseState = {
      plan: 'trial',
      isActivated: false,
      trialStartDate: new Date().toISOString(),
      trialDaysRemaining: TRIAL_DURATION_DAYS,
    };
    localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(trialState));
    this.notifyLicenseChanged();
    return trialState;
  },

  activateLicense(key: string): { success: boolean; plan: PlanType; message: string } {
    const validation = this.validateLicenseKey(key);
    if (!validation.valid || !validation.tier) {
      return {
        success: false,
        plan: 'trial',
        message: validation.message || 'Invalid License Key. Please enter an authentic Pro.Sale license key.',
      };
    }

    const state: LicenseState = {
      plan: validation.tier,
      isActivated: true,
      licenseKey: key.trim().toUpperCase(),
      activatedAt: new Date().toISOString(),
      trialDaysRemaining: 0,
    };

    localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(state));
    this.notifyLicenseChanged();

    return {
      success: true,
      plan: validation.tier,
      message:
        validation.tier === 'gold'
          ? 'Pro.Sale Gold Edition (Lifetime Access) successfully unlocked!'
          : 'Pro.Sale Silver Edition successfully activated!',
    };
  },

  isTrialExpired(): boolean {
    const state = this.getLicenseState();
    return state.plan === 'trial' && state.trialDaysRemaining <= 0;
  },

  canAccessFeature(feature: GatedFeature): boolean {
    const state = this.getLicenseState();

    // Gold has complete unrestricted access
    if (state.plan === 'gold' && state.isActivated) return true;

    // Active trial has Silver evaluation access only during the 6 days
    if (state.plan === 'trial') {
      if (state.trialDaysRemaining <= 0) return false;
      switch (feature) {
        case 'BARCODE':
        case 'GSTR_REPORTS':
        case 'EINVOICE':
        case 'MULTI_FIRM':
          return false; // Locked in Silver evaluation
        case 'PROFIT_ANALYTICS':
          return true;
        default:
          return true;
      }
    }

    // Silver tier restrictions (Lifetime)
    if (state.plan === 'silver' && state.isActivated) {
      switch (feature) {
        case 'BARCODE':
        case 'GSTR_REPORTS':
        case 'EINVOICE':
        case 'MULTI_FIRM':
          return false; // Locked in Silver
        case 'PROFIT_ANALYTICS':
          return true; // Basic profit accessible
        default:
          return true;
      }
    }

    return false;
  },

  notifyLicenseChanged() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('prosale_license_updated', {
          detail: { state: this.getLicenseState() },
        })
      );
    }
  },
};
