import { GitHubRelease, GitHubReleaseAsset, AppUpdateInfo, UpdateCheckResult } from '../types/update';

export const CURRENT_VERSION = '1.0.1';
export const CURRENT_VERSION_CODE = 2;
export const GITHUB_REPO_OWNER = 'sahil94arovia';
export const GITHUB_REPO_NAME = 'Pro.Sale';
export const GITHUB_REPO_URL = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`;
export const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`;

const STORAGE_KEY_LAST_CHECK = 'prosale_last_update_check';
const STORAGE_KEY_DISMISSED_VERSION = 'prosale_dismissed_update_version';
const COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Parse a semantic version string (e.g. "1.0.10", "v1.0.0-rc1") into [major, minor, patch].
 */
export function parseSemVer(versionStr: string): [number, number, number] {
  if (!versionStr) return [0, 0, 0];
  const clean = versionStr.trim().replace(/^[vV]/, '');
  const mainPart = clean.split(/[-+]/)[0];
  const parts = mainPart.split('.');
  const major = parseInt(parts[0], 10) || 0;
  const minor = parseInt(parts[1], 10) || 0;
  const patch = parseInt(parts[2], 10) || 0;
  return [major, minor, patch];
}

/**
 * Compare two semver strings. Returns true if `latest` is strictly newer than `current`.
 * Supports comparison like "1.0.10" > "1.0.9".
 */
export function isNewerVersion(current: string, latest: string): boolean {
  const [cMaj, cMin, cPatch] = parseSemVer(current);
  const [lMaj, lMin, lPatch] = parseSemVer(latest);

  if (lMaj > cMaj) return true;
  if (lMaj < cMaj) return false;

  if (lMin > cMin) return true;
  if (lMin < cMin) return false;

  return lPatch > cPatch;
}

/**
 * Check GitHub for the latest release.
 * @param isManual If true, ignores the 12-hour cooldown.
 */
export async function checkForUpdates(isManual = false): Promise<UpdateCheckResult> {
  // 1. Cooldown check for automatic background requests
  if (!isManual) {
    const lastCheckStr = localStorage.getItem(STORAGE_KEY_LAST_CHECK);
    if (lastCheckStr) {
      const lastCheck = parseInt(lastCheckStr, 10);
      if (Date.now() - lastCheck < COOLDOWN_MS) {
        return {
          status: 'UP_TO_DATE',
          message: 'Recently checked for updates.',
        };
      }
    }
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(GITHUB_API_URL, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    // Update timestamp on any completed request
    try {
      localStorage.setItem(STORAGE_KEY_LAST_CHECK, Date.now().toString());
    } catch {
      // Ignore storage write issues
    }

    if (response.status === 404) {
      return {
        status: 'NO_RELEASE',
        message: 'No published releases found on GitHub.',
      };
    }

    if (response.status === 403 || response.status === 429) {
      return {
        status: 'ERROR',
        message: 'GitHub rate limit exceeded. Please try again later.',
      };
    }

    if (!response.ok) {
      return {
        status: 'ERROR',
        message: `GitHub returned status code ${response.status}`,
      };
    }

    const data = (await response.json()) as GitHubRelease;

    // Reject draft or prerelease builds for standard updates
    if (data.draft || data.prerelease) {
      return {
        status: 'NO_RELEASE',
        message: 'Latest release is marked as draft or pre-release.',
      };
    }

    const latestTag = data.tag_name || '';
    const latestVersion = latestTag.replace(/^[vV]/, '').trim();

    if (!latestVersion) {
      return {
        status: 'ERROR',
        message: 'Unable to parse version from release tag.',
      };
    }

    // Locate the APK asset
    const assets = (data.assets || []) as GitHubReleaseAsset[];
    const apkAsset =
      assets.find(
        (a) =>
          a.name.toLowerCase().endsWith('.apk') &&
          a.name.toUpperCase().startsWith('PROSALE')
      ) || assets.find((a) => a.name.toLowerCase().endsWith('.apk'));

    const updateAvailable = isNewerVersion(CURRENT_VERSION, latestVersion);

    const updateInfo: AppUpdateInfo = {
      currentVersion: CURRENT_VERSION,
      latestVersion,
      releaseName: data.name || latestTag,
      releaseNotes: data.body || 'No release notes provided.',
      publishedAt: data.published_at,
      apkUrl: apkAsset?.browser_download_url || '',
      apkName: apkAsset?.name || `PROSALE-v${latestVersion}.apk`,
      apkSize: apkAsset?.size || 0,
      updateAvailable,
      htmlUrl: data.html_url || GITHUB_REPO_URL,
    };

    if (updateAvailable) {
      return {
        status: 'UPDATE_AVAILABLE',
        updateInfo,
        message: `A newer version of PROSALE (v${latestVersion}) is available.`,
      };
    }

    return {
      status: 'UP_TO_DATE',
      updateInfo,
      message: `You're up to date. PROSALE v${CURRENT_VERSION} is the latest version.`,
    };
  } catch (err: any) {
    // Graceful silent fallback for offline, network errors, timeouts
    return {
      status: 'ERROR',
      message:
        err?.name === 'AbortError'
          ? 'Update check timed out. Please check your internet connection.'
          : 'Unable to connect to GitHub. PROSALE is running in offline mode.',
    };
  }
}

/**
 * Open the APK download URL using the system browser / Android download manager.
 */
export function openApkDownload(apkUrl: string): void {
  if (!apkUrl) return;
  window.open(apkUrl, '_system');
}

/**
 * Persist user dismissal of a specific update version so it does not re-prompt on every startup.
 */
export function setDismissedUpdateVersion(version: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_DISMISSED_VERSION, version);
  } catch {
    // Ignore storage errors
  }
}

export function isUpdateVersionDismissed(version: string): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_DISMISSED_VERSION) === version;
  } catch {
    return false;
  }
}

export const updateService = {
  CURRENT_VERSION,
  CURRENT_VERSION_CODE,
  GITHUB_REPO_URL,
  GITHUB_API_URL,
  parseSemVer,
  isNewerVersion,
  checkForUpdates,
  openApkDownload,
  setDismissedUpdateVersion,
  isUpdateVersionDismissed,
};
