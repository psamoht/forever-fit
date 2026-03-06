"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface ProfileContextType {
    profile: any | null;
    userName: string;
    isLoading: boolean;
    refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType>({
    profile: null,
    userName: "Du",
    isLoading: true,
    refreshProfile: async () => { },
});

export const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
    const [profile, setProfile] = useState<any | null>(null);
    const [userName, setUserName] = useState<string>("Du");
    const [isLoading, setIsLoading] = useState(true);

    const fetchProfile = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;

            if (!user) {
                setProfile(null);
                setUserName("Du");
                setIsLoading(false);
                return;
            }

            // Extract best name from auth metadata
            let finalName = user.user_metadata?.first_name || user.user_metadata?.full_name || user.user_metadata?.name;
            if (!finalName && user.email) {
                finalName = user.email.split('@')[0];
            }
            finalName = finalName || "Du";

            // Fetch profile data
            const { data: profileData } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            if (profileData) {
                setProfile(profileData);
                finalName = profileData.display_name || finalName;
            } else {
                setProfile(null);
            }

            setUserName(finalName);

        } catch (error) {
            console.error("Error fetching global profile context:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();

        // Listen for auth changes (login/logout/token refresh) to re-fetch or clear profile
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                    fetchProfile();
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return (
        <ProfileContext.Provider value={{ profile, userName, isLoading, refreshProfile: fetchProfile }}>
            {children}
        </ProfileContext.Provider>
    );
};

export const useProfile = () => useContext(ProfileContext);
