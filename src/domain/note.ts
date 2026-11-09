export interface NoteMeta {
  /** Vault-relative path, e.g. "Projects/Website.md" */
  path: string;
  /** File name without extension */
  title: string;
  /** Parent folder path, "" for the vault root */
  folder: string;
  /** Last modified time in ms */
  mtime: number;
}

export interface NoteWithContent extends NoteMeta {
  content: string;
}
