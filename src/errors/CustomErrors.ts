export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "NotFoundError";
    if (cause) (this as any).cause = cause;
  }
  static throw(message: string): never {
    throw new NotFoundError(message);
  }
}
export class DatabaseError extends Error {
  statusCode = 500;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "DatabaseError";
    if (cause) (this as any).cause = cause;
  }
  static throw(message: string): never {
    throw new DatabaseError(message);
  }
}
export class ValidationError extends Error {
  statusCode = 400;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "ValidationError";
    if (cause) (this as any).cause = cause;
  }
  static throw(message: string): never {
    throw new ValidationError(message);
  }
}
export class DuplicateKeyError extends Error {
  statusCode = 409;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "DuplicateKeyError";
    if (cause) (this as any).cause = cause;
  }
  static throw(message: string): never {
    throw new DuplicateKeyError(message);
  }
}
export default {
  NotFoundError,
  DatabaseError,
  ValidationError,
  DuplicateKeyError,
};
