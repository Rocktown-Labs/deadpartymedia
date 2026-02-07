import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useClerk } from "@clerk/nextjs";

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string | null;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  userType: "fan" | "artist";
}

export interface LoginData {
  email: string;
  password: string;
}

function useUnsupportedLegacyMutation<TPayload>(message: string) {
  return useMutation<never, Error, TPayload>({
    mutationFn: async () => {
      throw new Error(message);
    },
  });
}

export function useLegacyRegisterDisabled() {
  return useUnsupportedLegacyMutation<RegisterData>(
    "Register with Clerk UI. Legacy register payload is not supported.",
  );
}

export function useRegister() {
  return useLegacyRegisterDisabled();
}

export function useLegacyLoginDisabled() {
  return useUnsupportedLegacyMutation<LoginData>(
    "Login with Clerk UI. Legacy login payload is not supported.",
  );
}

export function useLogin() {
  return useLegacyLoginDisabled();
}

export function useLogout() {
  const { signOut } = useClerk();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await signOut();
    },
    onSuccess: () => {
      queryClient.setQueryData(["current-user"], null);
      queryClient.invalidateQueries();
    },
  });
}

export function useCurrentUser() {
  return useQuery<User | null>({
    queryKey: ["current-user"],
    queryFn: async () => {
      const response = await fetch("/api/auth/me");
      if (response.status === 401) {
        return null;
      }
      if (!response.ok) {
        throw new Error("Failed to fetch current user");
      }
      try {
        return await response.json();
      } catch {
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: true,
  });
}

export interface UserUpdateData {
  first_name: string;
  last_name: string;
  email: string;
}

export interface PasswordChangeData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export function useLegacyUpdateUserDisabled() {
  return useUnsupportedLegacyMutation<UserUpdateData>(
    "Profile updates are handled by Clerk profile. Legacy update payload is not supported.",
  );
}

export function useUpdateUser() {
  return useLegacyUpdateUserDisabled();
}

export function useLegacyChangePasswordDisabled() {
  return useUnsupportedLegacyMutation<Omit<PasswordChangeData, "confirm_password">>(
    "Password changes are handled by Clerk profile. Legacy password mutation is not supported.",
  );
}

export function useChangePassword() {
  return useLegacyChangePasswordDisabled();
}
