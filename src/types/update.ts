export interface GitHubReleaseAsset {
  id: number;
  name: string;
  content_type: string;
  size: number;
  download_count: number;
  browser_download_url: string;
  created_at: string;
  updated_at: string;
}

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string;
  html_url: string;
  assets: GitHubReleaseAsset[];
}

export interface AppUpdateInfo {
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
  apkUrl: string;
  apkName: string;
  apkSize: number;
  updateAvailable: boolean;
  htmlUrl: string;
}

export interface UpdateCheckResult {
  status: 'UPDATE_AVAILABLE' | 'UP_TO_DATE' | 'NO_RELEASE' | 'ERROR';
  updateInfo?: AppUpdateInfo;
  message: string;
}
