import { ChakraProvider } from "@chakra-ui/react";
import { ApolloProvider, InMemoryCache, ApolloClient } from "@apollo/client";
import { PaginatedPosts } from "../generated/graphql";

function MyApp({ Component, pageProps }) {
  return (
    <ChakraProvider>
      <Component {...pageProps} />
    </ChakraProvider>
  );
}

export default MyApp;
// do ssr when moving to apollo
