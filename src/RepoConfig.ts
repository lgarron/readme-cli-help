export interface BlockConfig {
  command: string[];
  fence: string;
  allowExitCode?: number;
  onMismatchDuringCheck?: "error" | "warn" | "ignore";
}

export interface FileConfig {
  blocks: BlockConfig[];
}

export interface RepoConfig {
  // Workaround for https://github.com/YousefED/typescript-json-schema/issues/337#issuecomment-2010772013
  files: { [readmePath: string]: FileConfig };
}
