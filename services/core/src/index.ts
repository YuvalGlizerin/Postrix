import { HttpFunction } from '@google-cloud/functions-framework/build/src/functions';

export const helloWorld: HttpFunction = (req, res) => {
  // test
  res.send('Hello, World 1722');
};

export function sum(a: number, b: number) {
  return a + b;
}
