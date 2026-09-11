import type { OperationsState } from "@/stores/operationsStore";
export function operationsFixtures(): Pick<OperationsState, "memberships" | "passes" | "accessEvents" | "parkingSpots" | "parkingBookings" | "works" | "events" | "clubs" | "notices" | "marketplace" | "notificationChannels" | "complexSettings" | "securityLists"> { return {
memberships: [
    { id: "membership-home", complexName: "Солнечный", address: "Алматы, ул. Абая, 150", building: "2", entrance: "1", apartment: "45", role: "owner", isActive: true },
    { id: "membership-family", complexName: "Жетысу Park", address: "Алматы, мкр. Жетысу-2", building: "4", entrance: "3", apartment: "108", role: "family", isActive: false },
  ],
passes: [
    { id: "access-pass-1", guestName: "Айдар Н.", kind: "single", code: "481920", validUntil: "Сегодня, 22:00", status: "active", arrivals: 0 },
    { id: "access-pass-2", guestName: "Семейный автомобиль", kind: "permanent", code: "731155", vehiclePlate: "777 ABC 02", validUntil: "31 декабря", status: "active", arrivals: 14 },
  ],
accessEvents: [
    { id: "access-event-1", subject: "777 ABC 02", direction: "entry", checkpoint: "Шлагбаум A", occurredAt: "Сегодня, 08:42", result: "allowed" },
    { id: "access-event-2", subject: "Курьер · код 304118", direction: "entry", checkpoint: "Подъезд 1", occurredAt: "Вчера, 19:16", result: "allowed" },
    { id: "access-event-3", subject: "Неизвестный автомобиль", direction: "entry", checkpoint: "Шлагбаум A", occurredAt: "Вчера, 02:11", result: "denied" },
  ],
parkingSpots: [
    { id: "spot-g1", label: "G-01", zone: "Гостевая", kind: "guest", status: "free" },
    { id: "spot-g2", label: "G-02", zone: "Гостевая", kind: "guest", status: "reserved" },
    { id: "spot-g3", label: "G-03", zone: "Гостевая", kind: "accessible", status: "free" },
    { id: "spot-r45", label: "R-45", zone: "Резиденты", kind: "resident", status: "occupied" },
    { id: "spot-g4", label: "G-04", zone: "Гостевая", kind: "guest", status: "free" },
    { id: "spot-g5", label: "G-05", zone: "Гостевая", kind: "guest", status: "occupied" },
  ],
parkingBookings: [],
works: [
    { id: "work-1", title: "Уборка входной группы", kind: "cleaning", location: "Дом 2 · подъезд 1", employee: "Айгуль С.", startsAt: "Сегодня, 09:00", status: "in_progress", geo: "43.2383, 76.9457", checklist: [{ id: "w1-1", label: "Влажная уборка", done: true }, { id: "w1-2", label: "Лифтовой холл", done: true }, { id: "w1-3", label: "Фотоотчёт", done: false }] },
    { id: "work-2", title: "ТО пассажирского лифта", kind: "lift", location: "Дом 1 · подъезд 2", employee: "Lift Service KZ", startsAt: "Завтра, 11:00", status: "planned", checklist: [{ id: "w2-1", label: "Диагностика", done: false }, { id: "w2-2", label: "Проверка аварийной связи", done: false }] },
    { id: "work-3", title: "Проверка пожарных датчиков", kind: "repair", location: "Дом 3", employee: "Служба эксплуатации", startsAt: "30 августа, 15:00", status: "missed", checklist: [{ id: "w3-1", label: "Обход этажей", done: false }] },
  ],
events: [
    { id: "event-yard", title: "Соседский пикник", description: "Знакомимся, обсуждаем двор и отдыхаем вместе.", startsAt: "7 сентября, 16:00", location: "Центральный двор", capacity: 40, going: 24, albumCount: 18 },
    { id: "event-run", title: "Утренняя пробежка", description: "Спокойные 3 км вокруг квартала.", startsAt: "8 сентября, 08:00", location: "У фонтана", capacity: 15, going: 9, albumCount: 0 },
  ],
clubs: [
    { id: "club-parents", name: "Родители Korshi", description: "Прогулки, кружки и взаимопомощь", members: 46, joined: true },
    { id: "club-sport", name: "Спорт во дворе", description: "Футбол, бег и тренировки", members: 31, joined: false },
    { id: "club-green", name: "Зелёный двор", description: "Озеленение и раздельный сбор", members: 22, joined: false },
  ],
notices: [
    { id: "notice-help", kind: "help", title: "Помогу донести покупки", description: "Свободен вечером, дом 2.", status: "active" },
    { id: "notice-lost", kind: "lost", title: "Найдены ключи", description: "Связка с синим брелоком у детской площадки.", status: "active" },
    { id: "notice-pet", kind: "pet", title: "Ищем хозяина кота", description: "Рыжий кот сидит у третьего подъезда.", status: "active" },
    { id: "notice-buy", kind: "group_buy", title: "Совместная закупка воды", description: "Нужно ещё 5 квартир для оптовой цены.", status: "active" },
  ],
marketplace: { favoriteIds: [], archivedIds: [], reports: [], reviews: [] },
notificationChannels: { push: true, emailCritical: true, smsCritical: false, voting: true, payments: true },
complexSettings: { name: "Солнечный", logoUrl: "", primaryColor: "#166534", managementPhone: "+7 (727) 123-45-67", managementEmail: "osi@korshi.kz", domain: "solnechny.korshi.kz", languages: ["ru", "kk"], requestCategories: ["Коммунальные сети", "Уборка", "Ремонт", "Безопасность", "Территория"], customRoles: ["Председатель ОСИ", "Диспетчер", "Исполнитель", "Охрана", "Консьерж"], houseRules: "Тихий час с 22:00 до 08:00. Работы выполняются по согласованному графику.", whiteLabel: false },
securityLists: { allow: ["Клининг CleanHome", "777 ABC 02"], deny: ["Автомобиль 999 ZZZ 01"] }
}; }
