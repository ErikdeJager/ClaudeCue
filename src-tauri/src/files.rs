//! Read-only file access for the markdown viewer (#40): list a repo's markdown
//! files and read a text file, with strict path validation (reject `..`/symlink
//! escapes out of the repo). Content is returned verbatim and treated as
//! untrusted by the frontend (rendered as sanitized markdown, no raw HTML).

use std::fs;
use std::path::Path;

/// Directory names skipped while listing (heavy / build / vendored dirs).
const SKIP_DIRS: &[&str] = &[
    "node_modules",
    "target",
    "dist",
    "build",
    "vendor",
    "out",
    ".next",
];
const LIST_CAP: usize = 500;
const MAX_DEPTH: usize = 8;
const MAX_FILE_BYTES: u64 = 5 * 1024 * 1024;

/// Repo `*.md`/`*.markdown` files as repo-relative paths (sorted), excluding
/// hidden + heavy dirs, capped. A non-readable dir yields an empty list.
pub fn list_markdown_files(repo: impl AsRef<Path>) -> Vec<String> {
    let repo = repo.as_ref();
    let mut out = Vec::new();
    collect(repo, repo, &mut out, 0);
    out.sort();
    out
}

fn collect(root: &Path, dir: &Path, out: &mut Vec<String>, depth: usize) {
    if out.len() >= LIST_CAP || depth > MAX_DEPTH {
        return;
    }
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        if out.len() >= LIST_CAP {
            return;
        }
        let path = entry.path();
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if path.is_dir() {
            // Skip hidden (.git, .github, …) and heavy build/dep dirs.
            if name.starts_with('.') || SKIP_DIRS.contains(&name.as_ref()) {
                continue;
            }
            collect(root, &path, out, depth + 1);
        } else if is_markdown(&path) {
            if let Ok(rel) = path.strip_prefix(root) {
                out.push(rel.to_string_lossy().replace('\\', "/"));
            }
        }
    }
}

fn is_markdown(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| e.eq_ignore_ascii_case("md") || e.eq_ignore_ascii_case("markdown"))
        .unwrap_or(false)
}

/// Read a repo-relative text file, validating it stays inside `repo` — the
/// canonical-path check rejects `..` and symlinks that escape the repo (and an
/// absolute `file` resolves outside, so it's rejected too). Capped at a few MB.
pub fn read_text_file(repo: impl AsRef<Path>, file: &str) -> Result<String, String> {
    let repo = repo.as_ref();
    let canon_repo = repo.canonicalize().map_err(|e| e.to_string())?;
    let canon_target = repo.join(file).canonicalize().map_err(|e| e.to_string())?;
    if !canon_target.starts_with(&canon_repo) {
        return Err("path is outside the repository".to_string());
    }
    let len = fs::metadata(&canon_target)
        .map_err(|e| e.to_string())?
        .len();
    if len > MAX_FILE_BYTES {
        return Err("file is too large to display".to_string());
    }
    fs::read_to_string(&canon_target).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn tmp(tag: &str) -> PathBuf {
        let mut p = std::env::temp_dir();
        p.push(format!("claudecue-files-{tag}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&p);
        fs::create_dir_all(&p).unwrap();
        p
    }

    #[test]
    fn lists_markdown_excluding_heavy_and_hidden_dirs() {
        let dir = tmp("list");
        fs::write(dir.join("README.md"), "# hi").unwrap();
        fs::create_dir_all(dir.join("docs")).unwrap();
        fs::write(dir.join("docs/guide.md"), "g").unwrap();
        fs::create_dir_all(dir.join("node_modules/pkg")).unwrap();
        fs::write(dir.join("node_modules/pkg/x.md"), "skip").unwrap();
        fs::create_dir_all(dir.join(".git")).unwrap();
        fs::write(dir.join(".git/notes.md"), "skip").unwrap();
        fs::write(dir.join("notes.txt"), "nope").unwrap();

        let files = list_markdown_files(&dir);
        assert!(files.contains(&"README.md".to_string()));
        assert!(files.contains(&"docs/guide.md".to_string()));
        assert!(!files.iter().any(|f| f.contains("node_modules")));
        assert!(!files.iter().any(|f| f.contains(".git")));
        assert!(!files.iter().any(|f| f.ends_with(".txt")));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn reads_a_file_inside_the_repo() {
        let dir = tmp("read");
        fs::write(dir.join("a.md"), "hello").unwrap();
        assert_eq!(read_text_file(&dir, "a.md").unwrap(), "hello");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn rejects_path_traversal() {
        let dir = tmp("traversal");
        fs::write(dir.join("a.md"), "x").unwrap();
        // Escaping the repo must be rejected (canonical path lands outside, or
        // the target doesn't exist and canonicalize fails) — never read.
        assert!(read_text_file(&dir, "../../../../../../etc/hosts").is_err());
        let _ = fs::remove_dir_all(&dir);
    }
}
