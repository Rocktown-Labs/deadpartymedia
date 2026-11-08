import { QueryClient } from "@tanstack/react-query";

export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        staleTime: 60 * 1000,
      },
    },
  });

  return {
    queryClient,
  };
}
export default function TanstackQueryProvider() {}
