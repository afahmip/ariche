"use client";

import {
  QueryClient as RQQueryClient,
  QueryClientProvider as RQQueryClientProvider,
} from "react-query";
const queryClient = new RQQueryClient();

export function QueryClientProvider(props: { children: React.ReactNode }) {
  return (
    <RQQueryClientProvider client={queryClient}>
      {props.children}
    </RQQueryClientProvider>
  );
}
