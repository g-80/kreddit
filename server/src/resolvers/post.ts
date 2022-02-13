import {
  Resolver,
  Query,
  Arg,
  Int,
  Mutation,
  Field,
  InputType,
  ObjectType,
  Ctx,
  UseMiddleware,
  FieldResolver,
  Root,
} from "type-graphql";
import { Post } from "../entities/Post";
import { User } from "../entities/User";
import { isAuth } from "../middleware/isAuth";
import { Context } from "../types";
import { getConnection } from "typeorm";
import { Upvote } from "../entities/Upvote";

@InputType()
class PostInput {
  @Field()
  title!: string;
  @Field()
  text!: string;
}

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts!: Post[];
  @Field()
  hasMore!: boolean;
}

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(@Root() post: Post) {
    return post.text.slice(0, 100);
  }

  @FieldResolver(() => User)
  creator(@Root() post: Post, @Ctx() { userLoader }: Context) {
    return userLoader.load(post.creatorId);
  }

  @FieldResolver(() => Int, { nullable: true })
  async voteStatus(@Root() post: Post, @Ctx() { upvoteLoader, req }: Context) {
    if (!req.session.userId) {
      return null;
    }

    const upvote = await upvoteLoader.load({
      postId: post.id,
      userId: req.session.userId,
    });

    return upvote ? upvote.value : null;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg("postId", () => Int) postId: number,
    @Arg("value", () => Int) value: number,
    @Ctx() { req }: Context
  ) {
    const isUpvote = value !== -1;
    const voteValue = isUpvote ? 1 : -1;
    const { userId } = req.session;

    const upvote = await Upvote.findOne({ where: { postId, userId } });

    // the user has voted on the post before
    // and they are changing their vote
    if (upvote && upvote.value !== voteValue) {
      await getConnection().transaction(async (tm) => {
        await tm.query(
          `
    update upvote
    set value = $1
    where "postId" = $2 and "userId" = $3
        `,
          [voteValue, postId, userId]
        );
        // remove vote and vote opposite
        await tm.query(
          `
          update post
          set points = points + $1
          where id = $2
        `,
          [2 * voteValue, postId]
        );
      });
    } else if (!upvote) {
      // has never voted before
      await getConnection().transaction(async (tm) => {
        await tm.query(
          `
    insert into upvote ("userId", "postId", value)
    values ($1, $2, $3)
        `,
          [userId, postId, voteValue]
        );

        await tm.query(
          `
    update post
    set points = points + $1
    where id = $2
      `,
          [voteValue, postId]
        );
      });
    }
    return true;
  }

  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int) limit: number,
    // the cursor is a position and then get posts from that position
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null
  ): Promise<PaginatedPosts> {
    const realLimit = Math.min(50, limit);
    // get one more post so we know if there are more
    const realLimitPlusOne = realLimit + 1;
    const replacements: any[] = [realLimitPlusOne];
    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
    }

    const posts = await getConnection().query(
      `
    select p.*
    from post p
    ${cursor ? `where p."createdAt" < $2` : ""}
    order by p."createdAt" DESC
    limit $1
    `,
      replacements
    );

    return {
      posts: posts.slice(0, realLimit),
      hasMore: posts.length === realLimitPlusOne,
    };
  }

  @Query(() => Post, { nullable: true })
  post(@Arg("id", () => Int) id: number): Promise<Post | undefined> {
    return Post.findOne(id, { relations: ["creator"] });
  }

  @Mutation(() => Post)
  @UseMiddleware(isAuth)
  async createPost(
    @Arg("input") input: PostInput,
    @Ctx() { req }: Context
  ): Promise<Post> {
    return Post.create({ ...input, creatorId: req.session.userId }).save();
  }

  @Mutation(() => Post, { nullable: true })
  @UseMiddleware(isAuth)
  async updatePost(
    @Arg("id", () => Int) id: number,
    @Arg("title") title: string,
    @Arg("text") text: string,
    @Ctx() { req }: Context
  ): Promise<Post | null> {
    const result = await getConnection()
      .createQueryBuilder()
      .update(Post)
      .set({ title, text })
      .where('id = :id and "creatorId" = :creatorId', {
        id,
        creatorId: req.session.userId,
      })
      .returning("*")
      .execute();

    return result.raw[0];
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deletePost(
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: Context
  ): Promise<boolean> {
    await Post.delete({ id, creatorId: req.session.userId });
    return true;
  }
}
