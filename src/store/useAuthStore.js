import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set) => ({
      isLogged: false,

      user: {
        id: null,
        name: "",
        email: "",
        avatar: "",
        role: "",
      },

      login: (userData) =>
        set({
          isLogged: true,
          user: {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            avatar: userData.avatar,
            role: userData.role,
          },
        }),

      logout: () =>
        set({
          isLogged: false,
          user: {
            id: null,
            name: "",
            email: "",
            avatar: "",
            role: "",
          },
        }),

      updateUser: (newData) =>
        set((state) => ({
          user: {
            ...state.user,
            ...newData,
          },
        })),
    }),
    {
      name: "auth-storage",
    }
  )
);