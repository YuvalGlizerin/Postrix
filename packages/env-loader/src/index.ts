import dotenv from 'dotenv';

dotenv.config({ path: 'envs/default.env' });
dotenv.config({ path: `envs/${process.env.ENV}.env` });
