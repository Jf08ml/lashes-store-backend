import { Response } from "express";

export default function sendResponse<T>(
  res: Response,
  statusCode: number,
  data: T,
  message?: string
) {
  res.status(statusCode).json({
    status: "success",
    data,
    message,
  });
}

type ResponseOptions<T> = {
  status?: number;
  success?: boolean;
  message?: string;
  data?: T | null;
  errors?: unknown;
  pagination?: unknown;
};

// Versión extendida
export function response<T>(res: Response, options: ResponseOptions<T>) {
  const {
    status = 200,
    success = true,
    message = "",
    data = null,
    errors = null,
    pagination = null,
  } = options;

  const payload: any = { success, message, data };
  if (errors) payload.errors = errors;
  if (pagination) payload.pagination = pagination;

  res.status(status).json(payload);
}
