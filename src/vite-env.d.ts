/// <reference types="vite/client" />

declare module 'virtual:visuals-data' {
  import { VisualFolder } from './types';
  export const visualFolders: VisualFolder[];
  export const generatedAt: string;
}
