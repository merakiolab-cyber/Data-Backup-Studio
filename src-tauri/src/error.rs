use backup_core::CoreError;
use backup_core::domain::{MAX_EXCLUDES, PathProblem};
use serde::Serialize;

/// Error returned to the frontend. Messages are user-facing (Czech); details go to the log.
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

impl From<CoreError> for AppError {
    fn from(err: CoreError) -> Self {
        eprintln!("[core] {err}");
        match err {
            CoreError::VolumeNotConnected => {
                Self::NotFound("Disk není připojený. Připoj ho a zkus to znovu.".into())
            }
            CoreError::VolumeNotRegistered => {
                Self::NotFound("Disk už není mezi registrovanými.".into())
            }
            CoreError::VolumeAlreadyRegistered { name } => {
                Self::Conflict(format!("Tento disk je už registrovaný jako „{name}“."))
            }
            CoreError::AmbiguousVolume => Self::Conflict(
                "Jsou připojené dva disky se stejnou identitou (třeba klon). Odpoj jeden z nich."
                    .into(),
            ),
            CoreError::SystemVolume => {
                Self::InvalidInput("Systémový disk nejde použít jako cíl zálohy.".into())
            }
            CoreError::InvalidName(_) => Self::InvalidInput("Název musí mít 1 až 64 znaků.".into()),
            CoreError::Io { path, source } => Self::Io(format!(
                "Nepodařilo se pracovat se souborem {}: {source}",
                path.display()
            )),
            CoreError::Json { path, .. } => {
                Self::Internal(format!("Soubor {} je poškozený.", path.display()))
            }
            CoreError::UnsupportedSchema { .. } => Self::Internal(
                "Konfigurace pochází z novější verze aplikace. Aktualizuj aplikaci.".into(),
            ),
            CoreError::Win32 { .. } => {
                Self::Internal("Windows nevrátily informace o discích.".into())
            }
            CoreError::InvalidPath(problem) => Self::InvalidInput(path_problem(problem).into()),
            CoreError::InvalidExclude { pattern } => Self::InvalidInput(format!(
                "Vzor vyloučení „{pattern}“ není platný. Použij třeba *.tmp nebo **/node_modules/**."
            )),
            CoreError::TooManyExcludes => {
                Self::InvalidInput(format!("Vzorů vyloučení může být nejvýš {MAX_EXCLUDES}."))
            }
            CoreError::SourceTargetOverlap => Self::InvalidInput(
                "Cílová složka nesmí ležet ve zdrojové složce ani naopak.".into(),
            ),
            CoreError::TargetInUse { name } => Self::Conflict(format!(
                "Do této cílové složky už zálohuje úloha „{name}“. Vyber jinou složku."
            )),
            CoreError::JobNotFound => Self::NotFound("Úloha už neexistuje.".into()),
            CoreError::VolumeInUse { jobs } => Self::Conflict(format!(
                "Disk používá {jobs} {}. Nejdřív je uprav nebo smaž.",
                if jobs == 1 {
                    "úloha"
                } else if jobs < 5 {
                    "úlohy"
                } else {
                    "úloh"
                }
            )),
            CoreError::FolderNotFound { .. } => {
                Self::NotFound("Složka neexistuje nebo k ní nemáš přístup.".into())
            }
            CoreError::FolderNotOnVolume { .. } => Self::InvalidInput(
                "Složka není na místním ani USB disku. Síťové složky zatím nejsou podporované."
                    .into(),
            ),
        }
    }
}

fn path_problem(problem: PathProblem) -> &'static str {
    match problem {
        PathProblem::ForbiddenCharacter => {
            "Název složky obsahuje nepovolený znak (< > : \" | ? *)."
        }
        PathProblem::ParentReference => "Cesta nesmí obsahovat „.“ ani „..“.",
        PathProblem::TrailingDotOrSpace => "Název složky nesmí končit tečkou ani mezerou.",
        PathProblem::ReservedName => "Název složky je ve Windows vyhrazený (např. CON, NUL, COM1).",
        PathProblem::TooLong => "Cesta je příliš dlouhá.",
        PathProblem::TargetIsRoot => {
            "Zálohuj do složky, ne přímo do kořene disku – Zrcadlo by smazalo vše ostatní."
        }
        PathProblem::InsideAppFolder => "Do složky .databackupstudio se zálohovat nedá.",
    }
}

pub type AppResult<T> = Result<T, AppError>;
