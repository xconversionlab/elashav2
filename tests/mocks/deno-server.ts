export function serve(handler: (req: Request) => Promise<Response>) {
  return handler;
}
