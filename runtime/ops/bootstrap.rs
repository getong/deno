// Copyright 2018-2025 the Deno authors. MIT license.

use deno_core::OpState;
use deno_core::op2;
use deno_terminal::colors::ColorLevel;
use serde::Serialize;

use crate::BootstrapOptions;

deno_core::extension!(
  deno_bootstrap,
  ops = [
    op_bootstrap_args,
    op_bootstrap_pid,
    op_bootstrap_numcpus,
    op_bootstrap_user_agent,
    op_bootstrap_language,
    op_bootstrap_log_level,
    op_bootstrap_color_depth,
    op_bootstrap_no_color,
    op_bootstrap_stdout_no_color,
    op_bootstrap_stderr_no_color,
    op_bootstrap_unstable_args,
    op_bootstrap_is_from_unconfigured_runtime,
    op_snapshot_options,
  ],
  options = {
    snapshot_options: Option<SnapshotOptions>,
    is_from_unconfigured_runtime: bool,
  },
  state = |state, options| {
    if let Some(snapshot_options) = options.snapshot_options {
      state.put::<SnapshotOptions>(snapshot_options);
    }
    state.put(IsFromUnconfiguredRuntime(options.is_from_unconfigured_runtime));
  },
);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotOptions {
  pub ts_version: String,
  pub v8_version: &'static str,
  pub target: String,
}

struct IsFromUnconfiguredRuntime(bool);

impl Default for SnapshotOptions {
  fn default() -> Self {
    let arch = std::env::consts::ARCH;
    let platform = std::env::consts::OS;
    let target = match platform {
      "macos" => format!("{}-apple-darwin", arch),
      "linux" => format!("{}-unknown-linux-gnu", arch),
      "windows" => format!("{}-pc-windows-msvc", arch),
      rest => format!("{}-{}", arch, rest),
    };

    Self {
      ts_version: "n/a".to_owned(),
      v8_version: deno_core::v8::VERSION_STRING,
      target,
    }
  }
}

// Note: Called at snapshot time, op perf is not a concern.
#[op2]
#[serde]
pub fn op_snapshot_options(state: &mut OpState) -> SnapshotOptions {
  #[cfg(feature = "hmr")]
  {
    state.try_take::<SnapshotOptions>().unwrap_or_default()
  }
  #[cfg(not(feature = "hmr"))]
  {
    state.take::<SnapshotOptions>()
  }
}

#[op2]
#[serde]
pub fn op_bootstrap_args(state: &mut OpState) -> Vec<String> {
  state.borrow::<BootstrapOptions>().args.clone()
}

#[op2(fast)]
#[smi]
pub fn op_bootstrap_pid() -> u32 {
  std::process::id()
}

#[op2(fast)]
#[smi]
pub fn op_bootstrap_numcpus(state: &mut OpState) -> u32 {
  state.borrow::<BootstrapOptions>().cpu_count as u32
}

#[op2]
#[string]
pub fn op_bootstrap_user_agent(state: &mut OpState) -> String {
  state.borrow::<BootstrapOptions>().user_agent.clone()
}

#[op2]
#[serde]
pub fn op_bootstrap_unstable_args(state: &mut OpState) -> Vec<String> {
  let options = state.borrow::<BootstrapOptions>();
  let mut flags = Vec::with_capacity(options.unstable_features.len());
  for unstable_feature in &options.unstable_features {
    if let Some(granular_flag) =
      deno_features::UNSTABLE_FEATURES.get((*unstable_feature) as usize)
    {
      flags.push(format!("--unstable-{}", granular_flag.name));
    }
  }
  flags
}

#[op2]
#[string]
pub fn op_bootstrap_language(state: &mut OpState) -> String {
  state.borrow::<BootstrapOptions>().locale.clone()
}

#[op2(fast)]
#[smi]
pub fn op_bootstrap_log_level(state: &mut OpState) -> i32 {
  state.borrow::<BootstrapOptions>().log_level as i32
}

#[op2(fast)]
pub fn op_bootstrap_color_depth(state: &mut OpState) -> i32 {
  let options = state.borrow::<BootstrapOptions>();
  match options.color_level {
    ColorLevel::None => 1,
    ColorLevel::Ansi => 4,
    ColorLevel::Ansi256 => 8,
    ColorLevel::TrueColor => 24,
  }
}

#[op2(fast)]
pub fn op_bootstrap_no_color(_state: &mut OpState) -> bool {
  !deno_terminal::colors::use_color()
}

#[op2(fast)]
pub fn op_bootstrap_stdout_no_color(_state: &mut OpState) -> bool {
  if deno_terminal::colors::force_color() {
    return false;
  }

  !deno_terminal::is_stdout_tty() || !deno_terminal::colors::use_color()
}

#[op2(fast)]
pub fn op_bootstrap_stderr_no_color(_state: &mut OpState) -> bool {
  if deno_terminal::colors::force_color() {
    return false;
  }

  !deno_terminal::is_stderr_tty() || !deno_terminal::colors::use_color()
}

#[op2(fast)]
pub fn op_bootstrap_is_from_unconfigured_runtime(state: &mut OpState) -> bool {
  state.borrow::<IsFromUnconfiguredRuntime>().0
}
