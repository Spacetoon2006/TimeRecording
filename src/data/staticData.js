export const PROJECT_MANAGERS = [
    "Ahmed Al-Dajani",
    "Akin Uslucan",
    "Aleksandar Semi",
    "Chahid Belkarim",
    "Heinz-Willi Hegger",
    "Juri Bergheim",
    "Markus Manderla",
    "Peter Takacs",
    "Ralf Jansen",
    "Rishabh Khari",
    "Tobias Radek",
    "Udo Ditges",
    "Yvonne Yu"
];

export const HOLIDAYS_2026 = {
    "2026-01-01": { type: "Feiertag", name: "Neujahr" },
    "2026-01-02": { type: "Werktag", name: "" }, // Explicitly listed as Werktag
    // ... We can rely on a helper to default to Werktag/Wochenende, but I'll add the specific Feiertage/Brückentage
    // Feiertage
    "2026-04-03": { type: "Feiertag", name: "Karfreitag" },
    "2026-04-06": { type: "Feiertag", name: "Ostermontag" },
    "2026-05-01": { type: "Feiertag", name: "Tag der Arbeit" },
    "2026-05-14": { type: "Feiertag", name: "Christi Himmelfahrt" },
    "2026-05-25": { type: "Feiertag", name: "Pfingstmontag" },
    "2026-06-04": { type: "Feiertag", name: "Fronleichnam" },
    "2026-10-03": { type: "Feiertag", name: "Tag der Deutschen Einheit" },
    "2026-11-01": { type: "Feiertag", name: "Allerheiligen" },
    "2026-12-25": { type: "Feiertag", name: "1. Weihnachtsfeiertag" },
    "2026-12-26": { type: "Feiertag", name: "2. Weihnachtsfeiertag" },

    // Brückentage
    "2026-05-15": { type: "Brückentag", name: "nach Christi Himmelfahrt" },
    "2026-06-05": { type: "Brückentag", name: "nach Fronleichnam" },
    "2026-12-23": { type: "Brückentag", name: "vor Heiligabend" },
    "2026-12-28": { type: "Brückentag", name: "nach Weihnachten" },
    "2026-12-29": { type: "Brückentag", name: "nach Weihnachten" },
    "2026-12-30": { type: "Brückentag", name: "nach Weihnachten" },
};

export const DEFAULT_ORDER_NR = "99000501";
export const ABSENT_ORDER_NR = "Absent";

export function getDayInfo(dateStr) {
    // dateStr format YYYY-MM-DD
    const holiday = HOLIDAYS_2026[dateStr];
    if (holiday) return holiday;

    const date = new Date(dateStr);
    const day = date.getDay(); // 0 = Sun, 6 = Sat

    if (day === 0) return { type: "Sonntag", name: "" };
    if (day === 6) return { type: "Samstag", name: "" };

    return { type: "Werktag", name: "" };
}
