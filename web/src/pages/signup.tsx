import React from "react";
import { Formik, Form } from "formik";
import { Box, Button, Flex, Link } from "@chakra-ui/react";
import { Wrapper } from "../components/Wrapper";
import { InputField } from "../components/InputField";
import { MeDocument, MeQuery, useSignupMutation } from "../generated/graphql";
import { toErrorMap } from "../utils/toErrorMap";
import { useRouter } from "next/router";
import { withApollo } from "../utils/withApollo";
import NextLink from "next/link";

interface signupProps {}

const Signup: React.FC<signupProps> = ({}) => {
  const router = useRouter();
  const [signUp] = useSignupMutation();
  return (
    <Wrapper variant="small">
      <Formik
        initialValues={{ email: "", username: "", password: "" }}
        onSubmit={async (values, { setErrors }) => {
          const res = await signUp({
            variables: { options: values },
            update: (cache, { data }) => {
              cache.writeQuery<MeQuery>({
                query: MeDocument,
                data: {
                  __typename: "Query",
                  me: data?.signUp.user,
                },
              });
            },
          });
          if (res.data?.signUp.errors) {
            // errors are received as an array from graphql resolver
            // convert them to a key: value record
            setErrors(toErrorMap(res.data.signUp.errors));
          } else if (res.data?.signUp.user) {
            router.push("/");
          }
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            <InputField
              name="username"
              placeholder="username"
              label="Username"
            />
            <Box mt={4}>
              <InputField
                name="email"
                placeholder="email"
                label="Email"
                //type="email"
              />
            </Box>
            <Box mt={4}>
              <InputField
                name="password"
                placeholder="password"
                label="Password"
                type="password"
              />
            </Box>
            <Button
              mt={4}
              type="submit"
              isLoading={isSubmitting}
              colorScheme="blue"
            >
              Sign up
            </Button>
          </Form>
        )}
      </Formik>
      <Flex mt={6} justify="center">
        Already have an account?
        <NextLink href={"/signup"}>
          <Link ml={1} color="blue.500">
            Log In
          </Link>
        </NextLink>
      </Flex>
    </Wrapper>
  );
};

export default withApollo({ ssr: false })(Signup);
