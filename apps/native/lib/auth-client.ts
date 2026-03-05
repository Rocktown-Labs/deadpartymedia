// TODO: Implement Django auth client for native app
// This is a placeholder that will be replaced when native app auth is implemented
export const authClient = {
  signIn: {
    email: async (_params: { email: string; password: string }, _callbacks?: unknown) => {
      // TODO: Implement Django auth sign in
      console.warn("Native auth not yet implemented - using Django REST API");
    },
  },
  signOut: async () => {
    // TODO: Implement Django auth sign out
    console.warn("Native auth not yet implemented - using Django REST API");
  },
  signUp: {
    email: async (
      _params: { name: string; email: string; password: string },
      _callbacks?: unknown,
    ) => {
      // TODO: Implement Django auth sign up
      console.warn("Native auth not yet implemented - using Django REST API");
    },
  },
};
