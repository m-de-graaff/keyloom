import { createNextHandler } from '@keyloom/nextjs';
import config from '@/keyloom.config';
export const { GET, POST } = createNextHandler(config);

