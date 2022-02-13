import { ObjectType, Field, Int } from "type-graphql";
import { User } from "./User";

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  CreateDateColumn,
  BaseEntity,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { Upvote } from "./Upvote";

@ObjectType() // convert to ObjectType so type-graphql can use the class
@Entity()
export class Post extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @CreateDateColumn()
  createdAt!: Date;

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt!: Date;

  @Field(() => String)
  @Column()
  title!: string;

  @Field(() => String)
  @Column()
  text!: string;

  @Field(() => Int)
  @Column({ type: "int", default: 0 })
  points!: number;

  @Field(() => Int, { nullable: true })
  voteStatus!: number | null; // user's vote on a post: 1 or -1 or null

  @Field()
  @Column()
  creatorId!: number;

  @Field()
  @ManyToOne(() => User, (user) => user.posts)
  creator!: User;

  @OneToMany(() => Upvote, (upvote) => upvote.post)
  upvotes!: Upvote[];
}
