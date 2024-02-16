import express, { type Request, type Response } from 'express'

process.title = 'core-service'

const app = express()

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, World from Google Cloud Functions!')
})

console.log('yo')

export const core = app;
