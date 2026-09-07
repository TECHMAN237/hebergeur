export interface VisualFile {
  name: string;
  url: string;
  sizeBytes: number;
  updatedAt: string;
}

export interface VisualFolder {
  name: string;
  displayName: string;
  folderPath: string;
  files: VisualFile[];
}
