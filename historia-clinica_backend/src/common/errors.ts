export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export const notFound = (msg = "Not Found") => new HttpError(404, msg);
export const badRequest = (msg = "Bad Request") => new HttpError(400, msg);
export const conflict = (msg = "Conflict") => new HttpError(409, msg);