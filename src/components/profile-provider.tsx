"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

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

                // Track daily active user without spamming
                fetch('/api/track', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id, type: 'app_opened', description: 'User opened app' }),
                }).catch(() => { });

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

    // Global listener for Chat AI Profile Actions
    useEffect(() => {
        const handleCoachAction = async (e: any) => {
            const data = e.detail;
            if (!data) return;

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Handle Profile Updates (Goals, Medical Conditions)
            if (data.action === 'update_profile' && data.payload) {
                try {
                    const updates: any = {};
                    if (data.payload.goals) updates.goals = data.payload.goals;
                    if (data.payload.medical_conditions !== undefined && data.payload.medical_conditions !== null) {
                        let conditionsArray: string[] = [];
                        if (Array.isArray(data.payload.medical_conditions)) {
                            conditionsArray = data.payload.medical_conditions;
                        } else if (typeof data.payload.medical_conditions === 'string') {
                            conditionsArray = data.payload.medical_conditions.split(',').map((s: string) => s.trim()).filter(Boolean);
                        }
                        updates.medical_conditions = JSON.stringify(conditionsArray);
                    } else if (data.payload.medical_conditions === null) {
                        updates.medical_conditions = null;
                    }

                    if (Object.keys(updates).length > 0) {
                        const { error } = await supabase
                            .from('profiles')
                            .update(updates)
                            .eq('id', user.id);

                        if (!error) {
                            toast.success("Dein Profil wurde von Coach Theo aktualisiert!");
                            fetchProfile();
                        }
                    }
                } catch (err) {
                    console.error("Error updating profile via chat globally:", err);
                }
            }

            // Handle Training State Updates (Recovery, Progression)
            if (data.action === 'update_training_state' && data.payload) {
                try {
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('training_state')
                        .eq('id', user.id)
                        .single();

                    const currentState = profileData?.training_state || {};
                    const updates = data.payload;

                    const newState = { ...currentState };
                    if (updates.recovery_status) {
                        newState.recovery_status = updates.recovery_status;
                    }
                    if (typeof updates.progression_factor_adjustment === 'number') {
                        const current = newState.progression_factor || 1.0;
                        newState.progression_factor = Math.max(0.5, Math.min(2.0,
                            parseFloat((current + updates.progression_factor_adjustment).toFixed(2))
                        ));
                    }

                    const { error } = await supabase
                        .from('profiles')
                        .update({ training_state: newState })
                        .eq('id', user.id);

                    if (!error) {
                        toast.success("Trainingsstatus wurde von Theo angepasst!");
                        fetchProfile();
                    }
                } catch (err) {
                    console.error("Error updating training state via chat globally:", err);
                }
            }

            // Handle Schedule Updates (Wochenplan anpassen)
            if (data.action === 'update_schedule' && data.payload) {
                try {
                    const updates = Array.isArray(data.payload) ? data.payload : [data.payload];

                    // Fetch current schedule to find IDs
                    const { data: currentSchedule } = await supabase
                        .from('weekly_schedules')
                        .select('*')
                        .eq('user_id', user.id);

                    let successCount = 0;
                    for (const update of updates) {
                        if (update.day && update.activity_type) {
                            const existing = currentSchedule?.find(s => s.day_of_week === update.day);

                            if (existing) {
                                const { error } = await supabase
                                    .from('weekly_schedules')
                                    .update({
                                        activity_title: update.activity_title || existing.activity_title,
                                        activity_type: update.activity_type,
                                        theme: update.theme || existing.theme
                                    })
                                    .eq('id', existing.id);
                                if (!error) successCount++;
                            } else {
                                // No existing entry for that day — insert
                                const { error } = await supabase
                                    .from('weekly_schedules')
                                    .insert({
                                        user_id: user.id,
                                        day_of_week: update.day,
                                        activity_title: update.activity_title || 'Neues Training',
                                        activity_type: update.activity_type,
                                        theme: update.theme || 'full_body'
                                    });
                                if (!error) successCount++;
                            }
                        }
                    }

                    if (successCount > 0) {
                        toast.success(`Coach Theo hat ${successCount} Tag(e) in deinem Wochenplan angepasst!`);
                    }
                } catch (err) {
                    console.error("Error updating schedule via chat globally:", err);
                    toast.error("Fehler beim Aktualisieren des Plans.");
                }
            }
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('coach:action', handleCoachAction);
            return () => window.removeEventListener('coach:action', handleCoachAction);
        }
    }, []);

    return (
        <ProfileContext.Provider value={{ profile, userName, isLoading, refreshProfile: fetchProfile }}>
            {children}
        </ProfileContext.Provider>
    );
};

export const useProfile = () => useContext(ProfileContext);
