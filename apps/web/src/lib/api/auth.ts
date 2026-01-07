import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

export interface User {
  id: number;
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

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RegisterData) => {
      return apiClient.post<User & { userType: string }>(
        "/auth/register/",
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: LoginData) => {
      return apiClient.post<User>("/auth/login/", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return apiClient.post("/auth/logout/", {});
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
      try {
        return await apiClient.get<User>("/auth/user/");
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

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UserUpdateData) => {
      return apiClient.put<User>("/auth/user/", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: Omit<PasswordChangeData, "confirm_password">) => {
      return apiClient.post<{ message: string }>("/auth/user/password/", data);
    },
  });
}
