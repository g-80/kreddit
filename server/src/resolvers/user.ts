import {
  Resolver,
  Query,
  Ctx,
  Arg,
  Mutation,
  Field,
  ObjectType,
} from "type-graphql";
import { User } from "../entities/User";
import { Context } from "../types";
import { UsernamePasswordInput } from "./UsernamePasswordInput";
import argon2 from "argon2";
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from "../constants";
import { validataSignUp } from "../utils/validateSignUp";
import { sendEmail } from "../utils/sendEmail";
import { v4 } from "uuid";
import { QueryFailedError, getConnection } from "typeorm";
import { DatabaseError } from "pg-protocol";

@ObjectType()
class FieldError {
  @Field(() => String)
  field: string | undefined;
  @Field(() => String)
  message: string | undefined;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  @Mutation(() => UserResponse)
  async changePassword(
    @Arg("token", () => String) token: string,
    @Arg("newPassword", () => String) newPassword: string,
    @Ctx() { redisClient }: Context
  ): Promise<UserResponse> {
    if (newPassword.length <= 4) {
      return {
        errors: [
          {
            field: "newPassword",
            message: "Password length must be at least 5",
          },
        ],
      };
    }
    const key = FORGET_PASSWORD_PREFIX + token;
    const userId = await redisClient.get(key);
    if (!userId) {
      return {
        errors: [
          {
            field: "token",
            message: "Token expired",
          },
        ],
      };
    }
    const userIdNum = parseInt(userId); // redis stores token as string
    const user = await User.findOne(userIdNum);
    if (!user) {
      return {
        errors: [
          {
            field: "token",
            message: "User no longer exists",
          },
        ],
      };
    }

    await User.update(
      { id: userIdNum },
      { password: await argon2.hash(newPassword) }
    );
    await redisClient.del(key);
    return { user };
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email", () => String) email: string,
    @Ctx() { redisClient }: Context
  ) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // the email is not in db
      return true;
    }
    const token = v4();
    await redisClient.set(
      FORGET_PASSWORD_PREFIX + token,
      user.id,
      "ex",
      1000 * 60 * 60 * 24 * 3
    );
    await sendEmail(
      email,
      `<a href="http://localhost:3000/reset-password/${token}">reset password</a>`
    ); // change localhost to url
    return true;
  }

  @Query(() => User, { nullable: true })
  me(@Ctx() { req }: Context) {
    // if not logged in
    if (!req.session.userId) {
      return null;
    }
    return User.findOne(req.session.userId);
  }

  @Mutation(() => UserResponse)
  async signUp(
    @Arg("options", () => UsernamePasswordInput) options: UsernamePasswordInput,
    @Ctx() { req }: Context
  ): Promise<UserResponse> {
    const errors = validataSignUp(options);
    if (errors) {
      return { errors };
    }
    const hashedPassword = await argon2.hash(options.password);
    let user;
    try {
      const result = await getConnection()
        .createQueryBuilder()
        .insert()
        .into(User)
        .values({
          email: options.email,
          username: options.username,
          password: hashedPassword,
        })
        .returning("*")
        .execute();
      user = result.raw[0];
    } catch (err) {
      // using an if statement to check if the error is a query error
      if (err instanceof QueryFailedError) {
        const queryError = err.driverError as DatabaseError;
        if (queryError.code === "23505") {
          // duplicate username error
          return {
            errors: [
              {
                field: "username",
                message: "Username already exists",
              },
            ],
          };
        }
      }
    }
    // store user id session which will set a cookie on the user
    // and keeps them logged in
    req.session.userId = user.id;
    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("username", () => String) username: string,
    @Arg("password", () => String) password: string,
    @Ctx() { req }: Context
  ): Promise<UserResponse> {
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return {
        errors: [
          {
            field: "username",
            message: "Username does not exist",
          },
        ],
      };
    }
    const isValid = await argon2.verify(user.password, password);
    if (!isValid) {
      return {
        errors: [
          {
            field: "password",
            message: "Incorrect password",
          },
        ],
      };
    }
    req.session.userId = user.id;
    return { user };
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: Context) {
    return new Promise((resolve) =>
      req.session.destroy((err) => {
        if (err) {
          console.log(err);
          resolve(false);
          return;
        }

        // clear cookie only if session in redis is destroyed without errors
        res.clearCookie(COOKIE_NAME);
        resolve(true);
      })
    );
  }
}
