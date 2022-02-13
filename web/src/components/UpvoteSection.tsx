import { useState } from "react";
import { Flex, IconButton, useDisclosure } from "@chakra-ui/react";
import {
  PostSnippetFragment,
  useVoteMutation,
  useMeQuery,
} from "../generated/graphql";
import { ChevronUpIcon, ChevronDownIcon } from "@chakra-ui/icons";
import { updateAfterVote } from "../utils/updateCacheAfterVote";
import { isServer } from "../utils/isServer";
import { Modal } from "./Modal";

interface UpvoteSectionProps {
  post: PostSnippetFragment;
}

export const UpvoteSection: React.FC<UpvoteSectionProps> = ({ post }) => {
  const { data } = useMeQuery({
    skip: isServer(),
  });
  const [loadingState, setLoadingState] = useState<
    "upvote-loading" | "downvote-loading" | "not-loading"
  >("not-loading");
  const [vote] = useVoteMutation();

  const { isOpen, onOpen, onClose } = useDisclosure(); // modal control
  const modal = (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      text="Log in to create posts or vote on them."
      actionBtnText="Login"
    />
  );
  return (
    <Flex direction="column" justifyContent="center" alignItems="center" mr={4}>
      {modal}
      <IconButton
        onClick={async () => {
          if (!data?.me) {
            onOpen();
            return;
          }
          if (post.voteStatus === 1) {
            return;
          }
          setLoadingState("upvote-loading");
          const { errors } = await vote({
            variables: {
              postId: post.id,
              value: 1,
            },
            update: (cache) => updateAfterVote(1, post.id, cache),
          });
          if (errors) {
            console.log(errors);
          }
          setLoadingState("not-loading");
        }}
        colorScheme={post.voteStatus === 1 ? "green" : undefined}
        isLoading={loadingState === "upvote-loading"}
        aria-label="upvote post"
        icon={<ChevronUpIcon />}
      />
      {post.points}
      <IconButton
        onClick={async () => {
          if (!data?.me) {
            onOpen();
            return;
          }
          if (post.voteStatus === -1) {
            return;
          }
          setLoadingState("downvote-loading");
          await vote({
            variables: {
              postId: post.id,
              value: -1,
            },
            update: (cache) => updateAfterVote(-1, post.id, cache),
          });
          setLoadingState("not-loading");
        }}
        colorScheme={post.voteStatus === -1 ? "red" : undefined}
        isLoading={loadingState === "downvote-loading"}
        aria-label="downvote post"
        icon={<ChevronDownIcon />}
      />
    </Flex>
  );
};
