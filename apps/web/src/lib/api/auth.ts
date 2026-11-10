import { authClient } from "@/lib/auth-client";
import { musicApi } from "@/lib/music-client";
import { readResponse } from "@dpmedia/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
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
export function useRegister() {
  const router = useRouter();
  return useMutation({
    mutationFn: async (data: RegisterData) => {
      const result = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => router.invalidate(),
  });
}
export function useLogin() {
  const router = useRouter();
  return useMutation({
    mutationFn: async (data: LoginData) => {
      const result = await authClient.signIn.email(data);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => router.invalidate(),
  });
}
export function useLogout() {
  const query = useQueryClient(),
    router = useRouter();
  return useMutation({
    mutationFn: async () => {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: async () => {
      query.setQueryData(["current-user"], null);
      await query.invalidateQueries();
      await router.invalidate();
    },
  });
}
export function useCurrentUser() {
  return useQuery<User | null>({
    queryKey: ["current-user"],
    queryFn: async () => readResponse(await musicApi.auth.me.$get({ query: {} })).catch(() => null),
    retry: false,
    refetchOnWindowFocus: true,
  });
}
export function useUpdateUser() {
  const router = useRouter();
  return useMutation({
    mutationFn: async (data: UserUpdateData) => {
      const result = await authClient.updateUser({
        name: `${data.first_name} ${data.last_name}`.trim(),
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => router.invalidate(),
  });
}
export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: Omit<PasswordChangeData, "confirm_password">) => {
      const result = await authClient.changePassword({
        currentPassword: data.current_password,
        newPassword: data.new_password,
        revokeOtherSessions: true,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
  });
}
