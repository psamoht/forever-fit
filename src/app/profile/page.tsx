
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { LogOut, User } from "lucide-react";
import { useProfile } from "@/components/profile-provider";

export default function ProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [name, setName] = useState("");
    const [age, setAge] = useState("");
    const [weight, setWeight] = useState("");
    const [gender, setGender] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    const { profile: globalProfile, refreshProfile, isLoading: isProfileLoading } = useProfile();

    useEffect(() => {
        if (isProfileLoading) return;

        if (globalProfile) {
            setName(globalProfile.display_name || "");
            setAge(globalProfile.birth_year ? String(new Date().getFullYear() - globalProfile.birth_year) : "");
            setWeight(globalProfile.weight ? String(globalProfile.weight) : "");
            setGender(globalProfile.gender || "");
            setAvatarUrl(globalProfile.photo_url || null);
        }
        setLoading(false);
    }, [globalProfile, isProfileLoading]);

    const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) {
                throw new Error("Bitte wähle ein Bild aus.");
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setAvatarUrl(publicUrl);

            // Auto-save the new photo URL
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('profiles').update({
                    photo_url: publicUrl
                }).eq('id', user.id);

                await refreshProfile();
                toast.success("Profilbild aktualisiert!");
            }

        } catch (error: any) {
            toast.error("Fehler beim Hochladen: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const ageNum = parseInt(age);
            const birthYear = !isNaN(ageNum) ? new Date().getFullYear() - ageNum : null;

            const weightNum = parseInt(weight);
            const finalWeight = !isNaN(weightNum) ? weightNum : null;
            const finalGender = gender === "" ? null : gender;

            const { error } = await supabase
                .from("profiles")
                .update({
                    display_name: name,
                    birth_year: birthYear,
                    weight: finalWeight,
                    gender: finalGender
                })
                .eq("id", user.id);

            if (error) throw error; // Throw to catch block

            await refreshProfile();
            toast.success("Profil gespeichert!");
        } catch (error: any) {
            console.error("Save Error:", error);

            // Fallback: Try saving only display_name if full save fails (likely due to missing columns)
            if (error.message && (error.message.includes("column") || error.code === "PGRST301")) {
                try {
                    const { data: { user: currentUser } } = await supabase.auth.getUser();
                    if (!currentUser) return;

                    const { error: fallbackError } = await supabase
                        .from("profiles")
                        .update({ display_name: name })
                        .eq("id", currentUser.id);

                    if (!fallbackError) {
                        toast.warning("Teilweise gespeichert. Bitte Datenbank aktualisieren für Alter/Gewicht.");
                        return;
                    }
                } catch (e) {
                    console.error("Fallback failed", e);
                }
            }

            if (error.message) toast.error(`Fehler: ${error.message}`);
            else toast.error("Speicherfehler. Bitte Konsole prüfen.");
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/");
    };

    if (loading) return <div className="p-6 text-center">Laden...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex flex-col items-center gap-4 mb-6">
                <div className="relative group cursor-pointer" onClick={() => document.getElementById('avatar-upload')?.click()}>
                    <div className="h-24 w-24 bg-muted rounded-full flex items-center justify-center text-muted-foreground overflow-hidden border-4 border-background shadow-md">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Profilbild" className="h-full w-full object-cover" />
                        ) : (
                            <User size={40} />
                        )}
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                            <span className="text-white text-xs font-bold">Ändern</span>
                        </div>
                    </div>
                </div>
                <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={uploadAvatar}
                    disabled={uploading}
                />
                <h1 className="text-2xl font-bold text-foreground">Mein Profil</h1>
            </div>

            <Card className="p-6 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="text-lg p-6"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="age">Alter</Label>
                        <Input
                            id="age"
                            type="number"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            className="text-lg p-6"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="weight">Gewicht (kg)</Label>
                        <Input
                            id="weight"
                            type="number"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            className="text-lg p-6"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="gender">Geschlecht (Für personalisierte Trainings-Animationen)</Label>
                    <select
                        id="gender"
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 text-lg h-[72px]"
                    >
                        <option value="">Bitte wählen...</option>
                        <option value="female">Weiblich</option>
                        <option value="male">Männlich</option>
                        <option value="diverse">Divers</option>
                        <option value="prefer_not_to_say">Keine Angabe</option>
                    </select>
                </div>

                <Button className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave}>
                    Speichern
                </Button>
            </Card>

            <Button variant="outline" className="w-full h-12 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 border-red-100 dark:border-red-900/30" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" /> Abmelden
            </Button>
        </div>
    );
}
