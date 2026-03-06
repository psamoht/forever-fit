
"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { EQUIPMENT_REPOSITORY, EquipmentItem } from "@/lib/equipment-data";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { EquipmentItemCard } from "@/components/equipment-item-card";
import { useProfile } from "@/components/profile-provider";

// New Data Structure
interface EquipmentState {
    id: string;
    name: string;
    active: boolean; // Grayed out if false
    custom: boolean;
    iconUrl: string;
}

export default function EquipmentPage() {
    const [equipmentList, setEquipmentList] = useState<EquipmentState[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { profile: globalProfile, refreshProfile, isLoading: isProfileLoading } = useProfile();

    useEffect(() => {
        if (!isProfileLoading) {
            fetchEquipment();
        }
    }, [isProfileLoading, globalProfile]);

    const fetchEquipment = async () => {
        try {
            const profile = globalProfile;

            if (profile && profile.equipment) {
                const rawEquip = Array.isArray(profile.equipment)
                    ? profile.equipment
                    : JSON.parse(profile.equipment as unknown as string);

                // --- MIGRATION LOGIC ---
                // If data is array of strings (old format), convert to EquipmentState[]
                if (rawEquip.length > 0 && typeof rawEquip[0] === 'string') {
                    console.log("Migrating legacy equipment data...");
                    const migratedList: EquipmentState[] = [];

                    // 1. Map existing owned IDs to States
                    const ownedIds = rawEquip as string[];

                    // Add all Standard Items (mark owned as active=true, unowned as active=false)
                    EQUIPMENT_REPOSITORY.forEach(repoItem => {
                        const isOwned = ownedIds.includes(repoItem.id);
                        migratedList.push({
                            id: repoItem.id,
                            name: repoItem.name,
                            active: isOwned,
                            custom: false,
                            iconUrl: repoItem.iconUrl
                        });
                    });

                    // Add any custom strings found in ownedIds that are NOT in repo
                    const customItems = ownedIds.filter(id => !EQUIPMENT_REPOSITORY.some(i => i.id === id));
                    customItems.forEach(customName => {
                        migratedList.push({
                            id: customName, // ID is name for custom
                            name: customName,
                            active: true,
                            custom: true,
                            // Random generic icon for now
                            iconUrl: getBestIconForName(customName)
                        });
                    });

                    setEquipmentList(migratedList);
                    // Save migration immediately
                    updateProfileEquipment(migratedList);

                } else {
                    // Already in new format (or empty)
                    let currentList = rawEquip as EquipmentState[];

                    setEquipmentList(currentList);
                }
            } else {
                // No profile data -> Serialize all Standard Items as Inactive
                const initialList = EQUIPMENT_REPOSITORY.map(item => ({
                    id: item.id,
                    name: item.name,
                    active: false,
                    custom: false,
                    iconUrl: item.iconUrl
                }));
                setEquipmentList(initialList);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const updateProfileEquipment = async (newList: EquipmentState[]) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from("profiles")
                .update({ equipment: newList })
                .eq("id", user.id);

            if (error) throw error;
            await refreshProfile();
            // toast.success("Gespeichert");
        } catch (error) {
            console.error(error);
            toast.error("Fehler beim Speichern");
        }
    };

    const toggleItem = (id: string) => {
        const newList = equipmentList.map(item =>
            item.id === id ? { ...item, active: !item.active } : item
        );
        setEquipmentList(newList);
        updateProfileEquipment(newList);
    };

    const deleteCustomItem = (id: string) => {
        const newList = equipmentList.filter(item => item.id !== id);
        setEquipmentList(newList);
        updateProfileEquipment(newList);
        toast.success("Gerät entfernt");
    };

    // --- Adding Custom Items ---
    const [newItemName, setNewItemName] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    // --- Helper: Smart Icon Mapping ---
    const getBestIconForName = (name: string): string => {
        const lower = name.toLowerCase();

        if (lower.includes("hantel") || lower.includes("gewicht") || lower.includes("dumb") || lower.includes("weight")) return "/equipment/dumbbells.png";
        if (lower.includes("band") || lower.includes("gummi") || lower.includes("elastic") || lower.includes("tube")) return "/equipment/resistance-bands.png";
        if (lower.includes("matte") || lower.includes("mat") || lower.includes("yoga") || lower.includes("unterlage")) return "/equipment/yoga-mat.png";
        if (lower.includes("rolle") || lower.includes("roll") || lower.includes("faszien")) return "/equipment/foam-roller.png";
        if (lower.includes("stuhl") || lower.includes("chair") || lower.includes("bank") || lower.includes("sitz")) return "/equipment/chair.png";

        // Default fallback (can be random or fixed)
        return "/equipment/dumbbells.png";
    };

    const addCustomItem = () => {
        if (!newItemName.trim()) return;
        const name = newItemName.trim();

        // Check duplicates
        if (equipmentList.some(i => i.name.toLowerCase() === name.toLowerCase())) {
            toast.error("Dieses Gerät existiert bereits.");
            return;
        }

        const newItem: EquipmentState = {
            id: name,
            name: name,
            active: true,
            custom: true,
            iconUrl: getBestIconForName(name)
        };

        const newList = [...equipmentList, newItem];
        setEquipmentList(newList);
        setNewItemName("");
        setIsAdding(false);
        updateProfileEquipment(newList);
        toast.success("Neues Gerät hinzugefügt");
    };


    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-foreground">Meine Ausrüstung</h1>
                    <p className="text-muted-foreground text-sm mt-1">Tippen zum Aktivieren/Deaktivieren. Gedrückt halten zum Bearbeiten.</p>
                </div>
            </div>

            {/* Unified Grid */}
            <section>
                <div className="grid grid-cols-2 gap-4">
                    {/* Render All Items */}
                    {equipmentList.map((item) => (
                        <EquipmentItemCard
                            key={item.id}
                            id={item.id}
                            name={item.name}
                            iconUrl={item.iconUrl}
                            isActive={item.active}
                            isCustom={item.custom}
                            onToggle={() => toggleItem(item.id)}
                            onDelete={() => deleteCustomItem(item.id)}
                        />
                    ))}

                    {/* Add Button as a Card-like element */}
                    {isAdding ? (
                        <div className="col-span-2 bg-card border border-border rounded-xl p-4 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                            <input
                                autoFocus
                                type="text"
                                placeholder="Name des Geräts..."
                                className="flex-1 bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-foreground placeholder:text-muted-foreground"
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addCustomItem()}
                            />
                            <Button size="sm" onClick={addCustomItem} className="bg-emerald-600 hover:bg-emerald-700 text-white">Speichern</Button>
                            <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>X</Button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="bg-card border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:border-emerald-500 hover:bg-accent transition-all group min-h-[140px]"
                        >
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center group-hover:scale-110 transition-transform text-muted-foreground group-hover:text-emerald-500">
                                <Plus size={24} />
                            </div>
                            <span className="text-sm font-bold text-muted-foreground group-hover:text-emerald-600">Gerät hinzufügen</span>
                        </button>
                    )}
                </div>
            </section>
        </div>
    );
}
