import { config } from './config.ts';

const abs = (path: string): string => `${config.baseUrl}${path}`;

export const urls = {
  inbox: (): string => abs('/'),
};
