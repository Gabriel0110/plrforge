use reqwest::StatusCode;
use semver::Version;
use serde::{Deserialize, Serialize};

const RELEASE_REPOSITORY: Option<&str> = option_env!("PLRFORGE_GITHUB_REPOSITORY");

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateStatus {
    pub state: String,
    pub current_version: String,
    pub latest_version: Option<String>,
    pub release_name: Option<String>,
    pub release_url: Option<String>,
    pub published_at: Option<String>,
    pub message: String,
}

#[derive(Debug, Deserialize)]
struct GitHubRelease {
    tag_name: String,
    name: Option<String>,
    published_at: Option<String>,
}

pub async fn check(current_version: &str) -> UpdateStatus {
    let Some(repository) = configured_repository() else {
        return status(
            "unconfigured",
            current_version,
            None,
            "Update checks will activate when a GitHub release repository is configured for the build.",
        );
    };

    let endpoint = format!("https://api.github.com/repos/{repository}/releases/latest");
    let response = match reqwest::Client::new()
        .get(endpoint)
        .header(
            reqwest::header::USER_AGENT,
            format!("PlrForge/{current_version}"),
        )
        .header(reqwest::header::ACCEPT, "application/vnd.github+json")
        .send()
        .await
    {
        Ok(response) => response,
        Err(error) => {
            return status(
                "error",
                current_version,
                None,
                &format!("Could not reach GitHub Releases: {error}"),
            );
        }
    };

    if response.status() == StatusCode::NOT_FOUND {
        return status(
            "error",
            current_version,
            None,
            "No published GitHub release was found for this update feed.",
        );
    }
    if !response.status().is_success() {
        return status(
            "error",
            current_version,
            None,
            &format!("GitHub Releases returned HTTP {}.", response.status()),
        );
    }
    let release = match response.json::<GitHubRelease>().await {
        Ok(release) => release,
        Err(error) => {
            return status(
                "error",
                current_version,
                None,
                &format!("GitHub returned invalid release metadata: {error}"),
            );
        }
    };
    compare_release(current_version, repository, release)
}

fn compare_release(
    current_version: &str,
    repository: &str,
    release: GitHubRelease,
) -> UpdateStatus {
    let latest_text = release.tag_name.trim_start_matches('v');
    let current = match Version::parse(current_version.trim_start_matches('v')) {
        Ok(version) => version,
        Err(error) => {
            return status(
                "error",
                current_version,
                None,
                &format!("The installed application version is invalid: {error}"),
            );
        }
    };
    let latest = match Version::parse(latest_text) {
        Ok(version) => version,
        Err(error) => {
            return status(
                "error",
                current_version,
                None,
                &format!("The latest release tag is not a semantic version: {error}"),
            );
        }
    };
    let available = latest > current;
    UpdateStatus {
        state: if available {
            "updateAvailable"
        } else {
            "upToDate"
        }
        .into(),
        current_version: current_version.into(),
        latest_version: Some(latest.to_string()),
        release_name: release.name,
        release_url: Some(format!(
            "https://github.com/{repository}/releases/tag/{}",
            release.tag_name
        )),
        published_at: release.published_at,
        message: if available {
            format!("PlrForge {latest} is available.")
        } else {
            format!("PlrForge {current} is the newest published version.")
        },
    }
}

fn status(state: &str, current: &str, latest: Option<&str>, message: &str) -> UpdateStatus {
    UpdateStatus {
        state: state.into(),
        current_version: current.into(),
        latest_version: latest.map(str::to_owned),
        release_name: None,
        release_url: None,
        published_at: None,
        message: message.into(),
    }
}

pub fn configured_repository() -> Option<&'static str> {
    RELEASE_REPOSITORY.filter(|repository| valid_repository(repository))
}

pub fn release_url_allowed(url: &str) -> bool {
    configured_repository().is_some_and(|repository| {
        url.starts_with(&format!("https://github.com/{repository}/releases/"))
    })
}

fn valid_repository(repository: &str) -> bool {
    let Some((owner, name)) = repository.split_once('/') else {
        return false;
    };
    !owner.is_empty()
        && !name.is_empty()
        && !name.contains('/')
        && owner.bytes().all(valid_repository_byte)
        && name.bytes().all(valid_repository_byte)
}

fn valid_repository_byte(byte: u8) -> bool {
    byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.')
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compares_semantic_release_versions() {
        let update = compare_release(
            "0.1.0",
            "example/plrforge",
            GitHubRelease {
                tag_name: "v0.2.0".into(),
                name: Some("Phase 4".into()),
                published_at: Some("2026-08-23T12:00:00Z".into()),
            },
        );
        assert_eq!(update.state, "updateAvailable");
        assert_eq!(update.latest_version.as_deref(), Some("0.2.0"));
        assert_eq!(
            update.release_url.as_deref(),
            Some("https://github.com/example/plrforge/releases/tag/v0.2.0")
        );
    }

    #[test]
    fn rejects_repository_values_that_could_change_the_origin() {
        assert!(valid_repository("example/plrforge"));
        assert!(!valid_repository("https://example.com/repo"));
        assert!(!valid_repository("example/repo/extra"));
        assert!(!valid_repository("example/repo?redirect=bad"));
    }
}
