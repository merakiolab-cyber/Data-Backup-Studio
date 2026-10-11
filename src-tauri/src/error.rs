use std::cell::Cell;

use backup_core::CoreError;
use backup_core::domain::{MAX_EXCLUDES, PathProblem, SettingsProblem, UiLocale};
use serde::Serialize;

/// Error returned to the frontend. Messages follow the UI language; details go to the log.
#[derive(Debug, thiserror::Error, Serialize, specta::Type)]
#[serde(tag = "kind", content = "message")]
pub enum AppError {
    #[error("{0}")]
    NotFound(String),
    #[error("{0}")]
    InvalidInput(String),
    #[error("{0}")]
    Conflict(String),
    #[error("{0}")]
    Io(String),
    #[error("{0}")]
    Internal(String),
}

thread_local! {
    static LOCALE: Cell<UiLocale> = const { Cell::new(UiLocale::Cs) };
}

/// Runs `work` so `From<CoreError>` and shell helpers use this locale.
pub fn with_locale<T>(locale: UiLocale, work: impl FnOnce() -> T) -> T {
    LOCALE.with(|slot| {
        let previous = slot.replace(locale);
        let result = work();
        slot.set(previous);
        result
    })
}

pub fn current_locale() -> UiLocale {
    LOCALE.with(Cell::get)
}

/// Command-boundary errors that are not `CoreError`.
#[derive(Debug, Clone, Copy)]
pub enum ShellKind {
    ConfigLocked,
    RunLocked,
    RunBusy,
    TaskJoin,
    FolderMissing,
    RunLogMissing,
    DataDirCreate,
    ExplorerSpawn,
}

impl AppError {
    pub fn from_core(err: CoreError, locale: UiLocale) -> Self {
        eprintln!("[core] {err}");
        let en = locale.is_english();
        match err {
            CoreError::VolumeNotConnected => Self::NotFound(if en {
                "The disk is not connected. Plug it in and try again.".into()
            } else {
                "Disk není připojený. Připoj ho a zkus to znovu.".into()
            }),
            CoreError::VolumeNotRegistered => Self::NotFound(if en {
                "The disk is no longer among the registered ones.".into()
            } else {
                "Disk už není mezi registrovanými.".into()
            }),
            CoreError::InvalidVolumeOrder => Self::InvalidInput(if en {
                "Could not reorder disks — refresh the list and try again.".into()
            } else {
                "Pořadí disků nešlo uložit — obnov seznam a zkus to znovu.".into()
            }),
            CoreError::VolumeAlreadyRegistered { name } => Self::Conflict(if en {
                format!("This disk is already registered as “{name}”.")
            } else {
                format!("Tento disk je už registrovaný jako „{name}“.")
            }),
            CoreError::AmbiguousVolume => Self::Conflict(if en {
                "Two disks with the same identity are connected (for example a clone). Unplug one of them.".into()
            } else {
                "Jsou připojené dva disky se stejnou identitou (třeba klon). Odpoj jeden z nich."
                    .into()
            }),
            CoreError::SystemVolume => Self::InvalidInput(if en {
                "The system disk cannot be used as a backup target.".into()
            } else {
                "Systémový disk nejde použít jako cíl zálohy.".into()
            }),
            CoreError::InvalidName(_) => Self::InvalidInput(if en {
                "The name must be 1 to 64 characters.".into()
            } else {
                "Název musí mít 1 až 64 znaků.".into()
            }),
            CoreError::Io { path, source } => Self::Io(if en {
                format!("Could not use the file {}: {source}", path.display())
            } else {
                format!(
                    "Nepodařilo se pracovat se souborem {}: {source}",
                    path.display()
                )
            }),
            CoreError::Json { path, .. } => Self::Internal(if en {
                format!("The file {} is damaged.", path.display())
            } else {
                format!("Soubor {} je poškozený.", path.display())
            }),
            CoreError::UnsupportedSchema { .. } => Self::Internal(if en {
                "This configuration comes from a newer app version. Update the app.".into()
            } else {
                "Konfigurace pochází z novější verze aplikace. Aktualizuj aplikaci.".into()
            }),
            CoreError::InvalidSettings(problem) => {
                Self::InvalidInput(settings_problem(problem, en).into())
            }
            CoreError::Win32 { .. } => Self::Internal(if en {
                "Windows did not return disk information.".into()
            } else {
                "Windows nevrátily informace o discích.".into()
            }),
            CoreError::InvalidPath(problem) => Self::InvalidInput(path_problem(problem, en).into()),
            CoreError::InvalidExclude { pattern } => Self::InvalidInput(if en {
                format!(
                    "The exclude pattern “{pattern}” is not valid. Use something like *.tmp or **/node_modules/**."
                )
            } else {
                format!(
                    "Vzor vyloučení „{pattern}“ není platný. Použij třeba *.tmp nebo **/node_modules/**."
                )
            }),
            CoreError::TooManyExcludes => Self::InvalidInput(if en {
                format!("You can have at most {MAX_EXCLUDES} exclude patterns.")
            } else {
                format!("Vzorů vyloučení může být nejvýš {MAX_EXCLUDES}.")
            }),
            CoreError::SourceTargetOverlap => Self::InvalidInput(if en {
                "The target folder must not lie inside the source folder, or the other way around."
                    .into()
            } else {
                "Cílová složka nesmí ležet ve zdrojové složce ani naopak.".into()
            }),
            CoreError::TargetInUse { name } => Self::Conflict(if en {
                format!(
                    "Job “{name}” already backs up to this target folder. Choose another folder."
                )
            } else {
                format!("Do této cílové složky už zálohuje úloha „{name}“. Vyber jinou složku.")
            }),
            CoreError::JobNotFound => Self::NotFound(if en {
                "The job no longer exists.".into()
            } else {
                "Úloha už neexistuje.".into()
            }),
            CoreError::GroupNotFound => Self::NotFound(if en {
                "The job group no longer exists.".into()
            } else {
                "Skupina úloh už neexistuje.".into()
            }),
            CoreError::TooManyGroups => Self::InvalidInput(if en {
                "Too many job groups. Remove or merge some first.".into()
            } else {
                "Příliš mnoho skupin úloh. Nejdřív některé smaž nebo slouč.".into()
            }),
            CoreError::VolumeInUse { jobs } => Self::Conflict(if en {
                format!(
                    "The disk is used by {jobs} {}. Edit or delete them first.",
                    if jobs == 1 { "job" } else { "jobs" }
                )
            } else {
                format!(
                    "Disk používá {jobs} {}. Nejdřív je uprav nebo smaž.",
                    if jobs == 1 {
                        "úloha"
                    } else if jobs < 5 {
                        "úlohy"
                    } else {
                        "úloh"
                    }
                )
            }),
            CoreError::FolderNotFound { .. } => Self::NotFound(if en {
                "The folder does not exist or you do not have access to it.".into()
            } else {
                "Složka neexistuje nebo k ní nemáš přístup.".into()
            }),
            CoreError::FolderNotOnVolume { .. } => Self::InvalidInput(if en {
                "The folder is not on a local or USB disk. Network folders are not supported yet."
                    .into()
            } else {
                "Složka není na místním ani USB disku. Síťové složky zatím nejsou podporované."
                    .into()
            }),
            CoreError::SourceEmpty => Self::Conflict(if en {
                "The source folder is empty or unreadable. The backup will not start, so nothing is deleted in the target.".into()
            } else {
                "Zdrojová složka je prázdná nebo nečitelná. Záloha se nespustí, aby se nic nesmazalo v cíli.".into()
            }),
            CoreError::SourceUnavailable => Self::NotFound(if en {
                "The source folder is not available. Check the disk and the path.".into()
            } else {
                "Zdrojová složka není dostupná. Zkontroluj disk a cestu.".into()
            }),
            CoreError::InsufficientSpace => Self::Conflict(if en {
                "There is not enough free space on the target disk for this backup.".into()
            } else {
                "Na cílovém disku není dost volného místa pro tuto zálohu.".into()
            }),
            CoreError::DeleteThresholdExceeded => Self::Conflict(if en {
                "Mirror would delete more files in the target than the threshold allows. Confirm it explicitly in the preview.".into()
            } else {
                "Zrcadlo by smazalo víc souborů v cíli, než dovoluje práh. Potvrď to výslovně v náhledu.".into()
            }),
            CoreError::VerifyFailed { path } => Self::Io(if en {
                format!(
                    "Copy verification failed for “{path}”. The file was not written to the target."
                )
            } else {
                format!("Ověření kopie selhalo u „{path}“. Soubor v cíli se nezapsal.")
            }),
            CoreError::Cancelled => Self::Conflict(if en {
                "The backup was cancelled.".into()
            } else {
                "Záloha byla zrušena.".into()
            }),
            CoreError::EndpointDisconnected => Self::NotFound(if en {
                "The source or target disk is not connected.".into()
            } else {
                "Zdrojový nebo cílový disk není připojený.".into()
            }),
            CoreError::EndpointNeedsConfirmation => Self::Conflict(if en {
                "The target disk needs confirmation on the Disks screen before a backup can run."
                    .into()
            } else {
                "Cílový disk potřebuje ověřit na obrazovce Disky, než půjde spustit zálohu.".into()
            }),
            CoreError::Database(message) => Self::Internal(if en {
                format!("Run history: {message}")
            } else {
                format!("Historie běhů: {message}")
            }),
            CoreError::RunNotFound => Self::NotFound(if en {
                "The run was not found in history.".into()
            } else {
                "Záznam běhu v historii nebyl nalezen.".into()
            }),
        }
    }

    pub fn shell(kind: ShellKind, locale: UiLocale, detail: Option<&str>) -> Self {
        let en = locale.is_english();
        match kind {
            ShellKind::ConfigLocked => Self::Internal(if en {
                "Internal error: configuration is locked.".into()
            } else {
                "Interní chyba: konfigurace je zamčená.".into()
            }),
            ShellKind::RunLocked => Self::Internal(if en {
                "Internal error: run state is locked.".into()
            } else {
                "Interní chyba: stav běhu je zamčený.".into()
            }),
            ShellKind::RunBusy => Self::Conflict(if en {
                "Another backup is already running. Wait for it to finish, or cancel it.".into()
            } else {
                "Jiná záloha právě běží. Počkej na dokončení, nebo ji zruš.".into()
            }),
            ShellKind::TaskJoin => Self::Internal(if en {
                format!("Internal task error: {}", detail.unwrap_or("unknown"))
            } else {
                format!("Interní chyba úlohy: {}", detail.unwrap_or("neznámá"))
            }),
            ShellKind::FolderMissing => Self::NotFound(if en {
                "The folder does not exist or the disk is not connected.".into()
            } else {
                "Složka neexistuje nebo disk není připojený.".into()
            }),
            ShellKind::RunLogMissing => Self::NotFound(if en {
                "The file log for this run is no longer available.".into()
            } else {
                "Souborový záznam tohoto běhu už není k dispozici.".into()
            }),
            ShellKind::DataDirCreate => Self::Io(if en {
                format!(
                    "Could not prepare the app data folder: {}",
                    detail.unwrap_or("unknown")
                )
            } else {
                format!(
                    "Složku s daty aplikace se nepodařilo připravit: {}",
                    detail.unwrap_or("neznámá")
                )
            }),
            ShellKind::ExplorerSpawn => Self::Io(if en {
                format!("Could not start Explorer: {}", detail.unwrap_or("unknown"))
            } else {
                format!(
                    "Průzkumník se nepodařilo spustit: {}",
                    detail.unwrap_or("neznámá")
                )
            }),
        }
    }
}

impl From<CoreError> for AppError {
    fn from(err: CoreError) -> Self {
        Self::from_core(err, current_locale())
    }
}

fn settings_problem(problem: SettingsProblem, en: bool) -> &'static str {
    match (problem, en) {
        (SettingsProblem::CopyParallelism, false) => "Počet souběžných kopií musí být 1 až 8.",
        (SettingsProblem::CopyParallelism, true) => "Parallel copies must be between 1 and 8.",
        (SettingsProblem::MtimeTolerance, false) => {
            "Tolerance času souboru musí být 0 až 10 sekund."
        }
        (SettingsProblem::MtimeTolerance, true) => {
            "File time tolerance must be between 0 and 10 seconds."
        }
        (SettingsProblem::DeleteThreshold, false) => "Práh mazání musí být 5 až 80 procent.",
        (SettingsProblem::DeleteThreshold, true) => {
            "The delete threshold must be between 5 and 80 percent."
        }
    }
}

fn path_problem(problem: PathProblem, en: bool) -> &'static str {
    match (problem, en) {
        (PathProblem::ForbiddenCharacter, false) => {
            "Název složky obsahuje nepovolený znak (< > : \" | ? *)."
        }
        (PathProblem::ForbiddenCharacter, true) => {
            "The folder name contains a forbidden character (< > : \" | ? *)."
        }
        (PathProblem::ParentReference, false) => "Cesta nesmí obsahovat „.“ ani „..“.",
        (PathProblem::ParentReference, true) => "The path must not contain “.” or “..”.",
        (PathProblem::TrailingDotOrSpace, false) => "Název složky nesmí končit tečkou ani mezerou.",
        (PathProblem::TrailingDotOrSpace, true) => {
            "The folder name must not end with a dot or a space."
        }
        (PathProblem::ReservedName, false) => {
            "Název složky je ve Windows vyhrazený (např. CON, NUL, COM1)."
        }
        (PathProblem::ReservedName, true) => {
            "The folder name is reserved in Windows (for example CON, NUL, COM1)."
        }
        (PathProblem::TooLong, false) => "Cesta je příliš dlouhá.",
        (PathProblem::TooLong, true) => "The path is too long.",
        (PathProblem::TargetIsRoot, false) => {
            "Zálohuj do složky, ne přímo do kořene disku – Zrcadlo by smazalo vše ostatní."
        }
        (PathProblem::TargetIsRoot, true) => {
            "Back up into a folder, not the disk root – Mirror would delete everything else."
        }
        (PathProblem::InsideAppFolder, false) => "Do složky .databackupstudio se zálohovat nedá.",
        (PathProblem::InsideAppFolder, true) => {
            "You cannot back up into the .databackupstudio folder."
        }
    }
}

pub type AppResult<T> = Result<T, AppError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn core_errors_follow_locale() {
        let cs = AppError::from_core(CoreError::JobNotFound, UiLocale::Cs);
        let en = AppError::from_core(CoreError::JobNotFound, UiLocale::En);
        assert!(cs.to_string().contains("Úloha"));
        assert!(en.to_string().contains("job"));
        let busy = AppError::shell(ShellKind::RunBusy, UiLocale::En, None);
        assert!(busy.to_string().contains("already running"));
    }
}
