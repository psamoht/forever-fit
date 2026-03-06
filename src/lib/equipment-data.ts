
export interface EquipmentItem {
    id: string;
    name: string;
    description: string;
    iconUrl: string;
}

export const EQUIPMENT_REPOSITORY: EquipmentItem[] = [
    {
        id: "dumbbells",
        name: "Hanteln",
        description: "Ein Paar Kurzhanteln (0.5 - 2kg)",
        iconUrl: "/equipment/dumbbells.png"
    },
    {
        id: "resistance-band",
        name: "Widerstandsband",
        description: "Ein elastisches Gymnastikband",
        iconUrl: "/equipment/resistance-bands.png"
    },
    {
        id: "chair",
        name: "Stuhl",
        description: "Ein stabiler Stuhl ohne Rollen",
        iconUrl: "/equipment/chair.png"
    },
    {
        id: "mat",
        name: "Gymnastikmatte",
        description: "Eine rutschfeste Unterlage",
        iconUrl: "/equipment/yoga-mat.png"
    },
    {
        id: "foam-roller",
        name: "Faszienrolle",
        description: "Zur Massage und Lockerung",
        iconUrl: "/equipment/foam-roller.png"
    }
];
