"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { APP_CONFIG } from "@/lib/appConfig";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { loadSignupBuildings, type SignupBuilding } from "@/lib/supabase/repository";

export default function LoginPage() {
  const router = useRouter();
  const { loginUser, registerUser, resetPassword } = useAppStore();

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Register form
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regBuilding, setRegBuilding] = useState("");
  const [regApartment, setRegApartment] = useState("");
  const [buildings, setBuildings] = useState<SignupBuilding[]>([]);
  const [regRole, setRegRole] = useState<"resident" | "service_provider">("resident");
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [regNeedsConfirmation, setRegNeedsConfirmation] = useState(false);

  // Дома и квартиры берутся из базы: подъезд определяется по номеру квартиры,
  // иначе житель легко указывает не тот подъезд и не привязывается к квартире.
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    void loadSignupBuildings().then((list) => {
      setBuildings(list);
      if (list[0]) setRegBuilding(list[0].number);
    }).catch(() => setRegError("Не удалось загрузить список домов. Обновите страницу."));
  }, []);

  const selectedBuilding = buildings.find((building) => building.number === regBuilding);
  const knownEntrance = selectedBuilding?.entranceByApartment[regApartment.trim()];

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      if (!loginEmail.trim() || !loginPassword) {
        setLoginError("Введите email и пароль");
        setLoginLoading(false);
        return;
      }
      await loginUser(loginEmail.trim(), loginPassword);
      router.push("/feed");
    } catch (err: any) {
      setLoginError(err?.message || "Ошибка входа");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regApartment.trim() || !regEmail.trim()) {
      setRegError("Заполните ФИО, email и квартиру");
      return;
    }
    if (regPassword.length < 6) {
      setRegError("Пароль должен содержать минимум 6 символов");
      return;
    }
    if (!knownEntrance) {
      setRegError(`В доме ${regBuilding} нет квартиры ${regApartment.trim()}`);
      return;
    }
    setRegError("");
    setRegLoading(true);

    try {
      const result = await registerUser({
        fullName: regName.trim(),
        phone: regPhone.trim(),
        email: regEmail.trim(),
        password: regPassword,
        buildingNumber: regBuilding,
        entranceNumber: knownEntrance,
        apartmentNumber: regApartment.trim(),
        role: regRole,
      });
      setRegNeedsConfirmation(result.requiresEmailConfirmation);
      setRegSuccess(true);
      if (!result.requiresEmailConfirmation) {
        setTimeout(() => router.push("/feed"), 800);
      }
    } catch (err: any) {
      setRegError(err?.message || "Ошибка регистрации");
    } finally {
      setRegLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setLoginError("");
    if (!loginEmail.trim()) {
      setLoginError("Сначала введите email");
      return;
    }
    setLoginLoading(true);
    try {
      await resetPassword(loginEmail);
      setResetSent(true);
    } catch (err: any) {
      setLoginError(err?.message || "Не удалось отправить письмо");
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#173f2a] p-4 text-white selection:bg-violet-500 selection:text-white sm:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(124,58,237,.24),transparent_32%),radial-gradient(circle_at_80%_90%,rgba(52,211,153,.17),transparent_35%)]" />
      <div className="reveal-up relative w-full max-w-md space-y-6 rounded-[36px] bg-[#fffefb] p-6 text-stone-900 shadow-[0_32px_90px_rgba(0,0,0,.28)] sm:p-8">
        {/* Логотип */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-violet-600 text-xl font-black text-white shadow-[0_12px_30px_rgba(124,58,237,.24)]">
            K
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <h1 className="text-2xl font-black tracking-tight text-stone-950">{APP_CONFIG.brandName}</h1>
            <ShieldCheck className="h-5 w-5 text-green-800" />
          </div>
          <p className="text-sm font-semibold text-stone-500">Всё важное о вашем доме</p>
        </div>

        {/* Табы */}
        <div className="flex bg-gray-100 p-1 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setActiveTab("register")}
            className={`flex-1 py-2.5 rounded-xl transition ${
              activeTab === "register" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Регистрация жильца
          </button>
          <button
            onClick={() => setActiveTab("login")}
            className={`flex-1 py-2.5 rounded-xl transition ${
              activeTab === "login" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Вход
          </button>
        </div>

        {/* Регистрация нового жильца */}
        {activeTab === "register" && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            {regSuccess ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto" />
                <p className="text-sm font-bold text-green-800">Регистрация успешна!</p>
                <p className="text-xs text-green-600">
                  {regNeedsConfirmation
                    ? "Подтвердите email по ссылке из письма, затем войдите."
                    : "Переход в ленту..."}
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ФИО (как в удостоверении)
                  </label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Иван Иванов"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                    
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Для входа по email и восстановления</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Пароль</label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Минимум 6 символов"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                    minLength={6}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Номер мобильного телефона
                  </label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+7 (777) 123-45-67"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </>
            )}

            {!regSuccess && <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Дом №</label>
                <select
                  value={regBuilding}
                  onChange={(e) => setRegBuilding(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {buildings.map((building) => (
                    <option key={building.number} value={building.number}>Дом {building.number}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Подъезд</label>
                <p className="w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600">
                  {knownEntrance ?? "—"}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Кв. №</label>
                <input
                  type="text"
                  value={regApartment}
                  onChange={(e) => setRegApartment(e.target.value)}
                  placeholder="45"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
            </div>}

            {!regSuccess && <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Роль в ЖК</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRegRole("resident")}
                  className={`py-2 rounded-xl text-xs font-bold border transition ${
                    regRole === "resident"
                      ? "bg-green-50 border-green-600 text-green-700"
                      : "bg-gray-50 border-gray-200 text-gray-600"
                  }`}
                >
                  Житель / Собственник
                </button>
                <button
                  type="button"
                  onClick={() => setRegRole("service_provider")}
                  className={`py-2 rounded-xl text-xs font-bold border transition ${
                    regRole === "service_provider"
                      ? "bg-green-50 border-green-600 text-green-700"
                      : "bg-gray-50 border-gray-200 text-gray-600"
                  }`}
                >
                  Мастер услуг ЖК
                </button>
              </div>
            </div>}

            {!regSuccess && regError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                {regError}
              </div>
            )}

            {!regSuccess && <button
              type="submit"
              disabled={regLoading}
              className="w-full py-3 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
            >
              {regLoading ? "Регистрация..." : "Зарегистрироваться и войти в ЖК"}
            </button>}
          </form>
        )}

        {/* Вход */}
        {activeTab === "login" && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Пароль</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Введите пароль"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                  <button type="button" onClick={handleResetPassword} className="mt-2 text-[11px] font-bold text-green-700 hover:text-green-800">
                    Забыли пароль?
                  </button>
                </div>
            </>
            {resetSent && <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-800">Письмо для смены пароля отправлено на email.</div>}

            {loginError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <span>
                  {loginLoading ? "Подождите..." : "Войти по email"}
              </span>
              {!loginLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
