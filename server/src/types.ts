import { Request, Response } from "express";
import { Redis } from "ioredis";
import { createUpvoteLoader } from "./utils/createUpvoteLoader";
import { createUserLoader } from "./utils/createUserLoader";

export type Context = {
  req: Request & { session: Express.Session }; // declaration merge to allow to create a custom property on the session object
  res: Response;
  redisClient: Redis;
  userLoader: ReturnType<typeof createUserLoader>;
  upvoteLoader: ReturnType<typeof createUpvoteLoader>;
};
