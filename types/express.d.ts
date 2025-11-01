declare namespace Express {
  interface Request {
    userId?: string;
    user?: { id: string; role: string };
    userRole?: string;
    userPermission?: string[];
  }
}