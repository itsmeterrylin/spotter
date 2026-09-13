import { Hono } from 'hono';
import { InboxPage } from './Inbox.tsx';

export const pages = new Hono();

pages.get('/', (c) => c.html(<InboxPage />));
