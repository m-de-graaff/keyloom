import express from 'express';
const app = express();
app.get('/ping', (_req, res) => res.send('pong'));
app.listen(3001, () => console.log('Express example on :3001'));


