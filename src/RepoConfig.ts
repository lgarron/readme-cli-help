export interface CodeFenceConfig {
  command: string[];
  infoString: string;
  allowExitCode?: number;
  onMismatchDuringCheck?: "error" | "warn" | "ignore";
}

export interface FileConfig {
  codeFences: CodeFenceConfig[];
}

export interface RepoConfig {
  // Workaround for https://github.com/YousefED/typescript-json-schema/issues/337#issuecomment-2010772013
  files: { [readmePath: string]: FileConfig };
}
