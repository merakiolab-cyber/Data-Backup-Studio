//! Message-only window listening for `WM_DEVICECHANGE` so USB disks update without polling.

use serde::Serialize;
use tauri::{AppHandle, Manager};
use tauri_specta::Event;

use crate::state::AppState;

const WM_DEVICECHANGE: u32 = 0x0219;
const DBT_DEVICEARRIVAL: usize = 0x8000;
const DBT_DEVICEREMOVECOMPLETE: usize = 0x8004;
const DBT_DEVNODES_CHANGED: usize = 0x0007;

#[derive(Debug, Clone, Serialize, specta::Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct VolumesChangedEvent {
    pub kind: String,
}

pub fn start(app: AppHandle) {
    if let Err(err) = std::thread::Builder::new()
        .name("device-watch".into())
        .spawn(move || run_loop(app))
    {
        eprintln!("[device-watch] could not start: {err}");
    }
}

fn run_loop(app: AppHandle) {
    if let Err(err) = pump(app) {
        eprintln!("[device-watch] {err}");
    }
}

#[cfg(windows)]
fn pump(app: AppHandle) -> Result<(), String> {
    use std::ffi::c_void;

    use windows::Win32::Foundation::{HINSTANCE, HWND, LPARAM, LRESULT, WPARAM};
    use windows::Win32::System::LibraryLoader::GetModuleHandleW;
    use windows::Win32::UI::WindowsAndMessaging::{
        CREATESTRUCTW, CreateWindowExW, DefWindowProcW, DispatchMessageW, GWLP_USERDATA,
        GetMessageW, HWND_MESSAGE, MSG, RegisterClassExW, SetWindowLongPtrW, TranslateMessage,
        WINDOW_EX_STYLE, WINDOW_STYLE, WM_CREATE, WM_DESTROY, WNDCLASSEXW,
    };
    use windows::core::w;

    struct WatchCtx {
        app: AppHandle,
    }

    unsafe extern "system" fn wnd_proc(
        hwnd: HWND,
        msg: u32,
        wparam: WPARAM,
        lparam: LPARAM,
    ) -> LRESULT {
        if msg == WM_CREATE {
            let created = lparam.0 as *const CREATESTRUCTW;
            if !created.is_null() {
                let ctx = unsafe { (*created).lpCreateParams };
                unsafe { SetWindowLongPtrW(hwnd, GWLP_USERDATA, ctx as isize) };
            }
            return LRESULT(0);
        }
        if msg == WM_DEVICECHANGE {
            let kind = match wparam.0 {
                DBT_DEVICEARRIVAL => "arrived",
                DBT_DEVICEREMOVECOMPLETE => "removed",
                DBT_DEVNODES_CHANGED => "changed",
                _ => return unsafe { DefWindowProcW(hwnd, msg, wparam, lparam) },
            };
            let raw = unsafe {
                windows::Win32::UI::WindowsAndMessaging::GetWindowLongPtrW(hwnd, GWLP_USERDATA)
            } as *const WatchCtx;
            if !raw.is_null() {
                notify(unsafe { &*raw }, kind);
            }
            return LRESULT(1);
        }
        if msg == WM_DESTROY {
            return LRESULT(0);
        }
        unsafe { DefWindowProcW(hwnd, msg, wparam, lparam) }
    }

    fn notify(ctx: &WatchCtx, kind: &str) {
        if let Some(state) = ctx.app.try_state::<AppState>() {
            state.invalidate_live();
        }
        let _ = VolumesChangedEvent {
            kind: kind.to_owned(),
        }
        .emit(&ctx.app);
    }

    let class_name = w!("DataBackupStudioDeviceWatch");
    let module = unsafe { GetModuleHandleW(None) }.map_err(|err| err.to_string())?;
    let instance = HINSTANCE(module.0);
    let class = WNDCLASSEXW {
        cbSize: u32::try_from(std::mem::size_of::<WNDCLASSEXW>()).unwrap_or(80),
        lpfnWndProc: Some(wnd_proc),
        hInstance: instance,
        lpszClassName: class_name,
        ..Default::default()
    };
    let atom = unsafe { RegisterClassExW(&class) };
    if atom == 0 {
        return Err("RegisterClassExW failed".into());
    }

    let ctx = Box::new(WatchCtx { app });
    let hwnd = unsafe {
        CreateWindowExW(
            WINDOW_EX_STYLE::default(),
            class_name,
            w!(""),
            WINDOW_STYLE::default(),
            0,
            0,
            0,
            0,
            Some(HWND_MESSAGE),
            None,
            Some(instance),
            Some(Box::into_raw(ctx).cast::<c_void>()),
        )
    }
    .map_err(|err| err.to_string())?;

    if hwnd.is_invalid() {
        return Err("CreateWindowExW returned an invalid handle".into());
    }

    let mut message = MSG::default();
    while unsafe { GetMessageW(&mut message, None, 0, 0) }.as_bool() {
        unsafe {
            let _ = TranslateMessage(&message);
            DispatchMessageW(&message);
        }
    }
    Ok(())
}

#[cfg(not(windows))]
fn pump(_app: AppHandle) -> Result<(), String> {
    Ok(())
}
