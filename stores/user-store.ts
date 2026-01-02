import { User } from "@/types/user";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserState extends User {
    updateUser: (data: Partial<User>) => void;
}

export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            height: null,
            weight: null,
            age: null,
            gender: "unspecified",
            activityLevel: "sedentary",
            customStrideLength: null,
            updateUser: (data) => set((state) => ({ ...state, ...data })),
        }),
        {
            name: "user-storage", // content of local storage
        }
    )
);
