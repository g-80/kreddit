import {
  Modal as _Modal,
  ModalOverlay,
  ModalContent,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
} from "@chakra-ui/react";
import NextLink from "next/link";

export const Modal = ({ isOpen, onClose, text, actionBtnText }) => {
  return (
    <>
      <_Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalBody mt={10} fontSize={"lg"}>
            {text}
          </ModalBody>

          <ModalFooter>
            <Button mr={3} onClick={onClose}>
              Close
            </Button>
            <NextLink href={"/login"}>
              <Button colorScheme="blue">{actionBtnText}</Button>
            </NextLink>
          </ModalFooter>
        </ModalContent>
      </_Modal>
    </>
  );
};
