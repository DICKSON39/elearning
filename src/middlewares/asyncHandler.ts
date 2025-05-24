import { Response, NextFunction, Request } from "express";

/**
 * @desc - Avoids the problem of try catch not automatically passed
 * @param fn The asynchronous function to wrap async function
 * @returns  a function that executes the async function that catces the error
 */

export const asyncHandler = <T = any, R extends Request = Request>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
