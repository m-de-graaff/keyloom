import type { NextApiRequest, NextApiResponse } from 'next';
import { createPagesApiHandler } from '@keyloom/nextjs';
import config from '@/keyloom.config';
export default createPagesApiHandler(config) as (req: NextApiRequest, res: NextApiResponse) => void;

