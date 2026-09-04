import { AppError } from "./errors.js";

export const LOCALES = [
  "en", "fa", "ar", "tr", "ru", "de", "fr", "es", "it", "pt",
  "zh", "ja", "ko", "hi", "ur", "id", "nl", "pl", "uk", "az",
  "he", "sv", "vi", "th", "bn", "ms", "cs", "ro", "el", "hu",
];

const en = {
  help: `dedhand — headless dead-hand core
  no website · no inbound port · operator-owned channels only

  setup                 first-time passphrase + telegram
  daemon / tick         long-running core / one watchdog beat
  install-service       user systemd service + timer
  uninstall-service     remove those units
  which                 paths and runtime
  export / status --json
  passwd                rotate passphrase
  lang <code> / langs / version
  doctor                health + integrity
  add <path> / rm <id|path>
  interval <hours> / warning <minutes>
  message               leak message from stdin
  telegram discord slack mastodon webhook ntfy matrix gotify email
  test <channel>
  arm / checkin / disarm / fire / reset

Telegram:  in <passphrase>
`,
  unknown_cmd: "Unknown command: {cmd}",
  already_setup: "Already set up.",
  ask_name: "Operator name: ",
  ask_pass: "Check-in passphrase (min 12, letters+digits): ",
  ask_pass2: "Repeat passphrase: ",
  ask_hours: "Check-in interval hours [24]: ",
  ask_tg_token: "Telegram bot token (empty = CLI only): ",
  ask_tg_chat: "Telegram chat id: ",
  ask_checkin: "Check-in passphrase: ",
  ask_disarm: "Disarm passphrase: ",
  ask_pass_plain: "Passphrase: ",
  ask_fire: "Type FIRE to confirm: ",
  pass_mismatch: "Passphrases do not match.",
  password_short: "Passphrase must be at least 12 characters.",
  password_weak: "Passphrase needs letters and digits.",
  setup_next: "Next:",
  home: "data home",
  tg_hint: "Telegram: in <passphrase>",
  locked: "Temporarily locked after failed attempts.",
  need_setup: "Run setup first.",
  already_fired: "Already fired. Use reset.",
  bad_pass: "Wrong passphrase.",
  need_path: "Path required.",
  need_id: "Id or path required.",
  bad_hours: "Invalid hours.",
  bad_minutes: "Invalid minutes.",
  need_channel: "Channel name required.",
  no_channel: "Unknown channel.",
  vault_empty: "Vault is empty.",
  need_channel_on: "Enable at least one publish channel.",
  cancelled: "Cancelled.",
  checkin_ok: "check-in ok",
  disarmed: "disarmed",
  armed: "ARMED",
  reset_ok: "reset ok",
  added: "added {path}",
  removed: "removed",
  updated: "{name} updated",
  lang_set: "language: {lang}",
  lang_bad: "Unknown language. Try: langs",
  langs_title: "Languages",
  setup_done: "setup complete",
  fired_log: "fired: {reason}",
  armed_log: "armed",
  reset_log: "reset",
  vault_log: "vault: {path}",
  checkin_log: "check-in from {source}",
  disarm_log: "disarmed from {source}",
  fail_log: "failed passphrase",
  tg_deny_log: "telegram denied",
  tamper_log: "vault tamper — firing",
  warn_log: "deadline approaching",
  warn_tg: "Deadline soon. Send: in <passphrase>",
  released_tg: "Released.\n{links}",
  tg_ok: "ok\n{left}",
  tg_off: "off",
  tg_no: "no",
  status_home: "home",
  status_setup: "setup",
  status_operator: "operator",
  status_armed: "armed",
  status_triggered: "triggered",
  status_deadline: "deadline",
  status_left: "left",
  status_checkin: "check-in",
  status_vault: "vault",
  status_channels: "channels",
  status_lang: "language",
  empty: "(empty)",
  on: "on",
  off: "off",
  doctor_ok: "healthy",
  doctor_fail: "unhealthy",
  doctor_vault_missing: "missing vault path: {path}",
  doctor_no_channel: "no channel enabled",
  doctor_not_setup: "not set up",
  doctor_node: "Node {have} is below 20",
  doctor_perms: "insecure permissions: {path}",
  doctor_hash: "vault integrity drift: {path}",
  passwd_ok: "passphrase rotated",
  daemon_need_setup: "Not set up. Run: node bin/dedhand.js setup",
  unit: "d {d}  h {h}  m {m}  s {s}",
  default_message:
    "Dead-hand protocol activated. The operator missed check-in.\nThis package is published automatically.",
};

const packs = { en };

function add(code, overlay) {
  packs[code] = { ...en, ...overlay };
}

add("fa", {
  help: `dedhand — هستهٔ سرور، بدون وب، بدون پورت ورودی

  setup                 برپایی رمز و تلگرام
  daemon                هستهٔ دائم
  tick                  یک ضربان نگهبان
  install-service       سرویس و تایمر systemd
  lang <code>           زبان رابط
  langs                 فهرست زبان‌ها
  doctor                سلامت سیستم
  status / logs
  add <path> / rm <id|path>
  interval <hours> / warning <minutes>
  message               پیام انتشار از stdin
  telegram --token --chat
  discord --webhook | slack --webhook
  mastodon --instance --token
  webhook --url [--secret]
  ntfy --topic
  matrix --homeserver --token --room
  email --host --port --user --from --to
  test <channel>
  arm / checkin / disarm / fire / reset

چک‌این تلگرام:  in رمز
تایمر و دیمِن مستقل‌اند. پورت گوش نمی‌دهد.`,
  unknown_cmd: "دستور ناشناخته: {cmd}",
  already_setup: "قبلاً راه‌اندازی شده.",
  ask_name: "نام اپراتور: ",
  ask_pass: "رمز چک‌این (حداقل ۱۲، حرف و رقم): ",
  ask_pass2: "تکرار رمز: ",
  ask_hours: "مهلت چک‌این به ساعت [24]: ",
  ask_tg_token: "توکن ربات تلگرام (خالی = فقط CLI): ",
  ask_tg_chat: "Chat ID تلگرام: ",
  ask_checkin: "رمز چک‌این: ",
  ask_disarm: "رمز خنثی‌سازی: ",
  ask_pass_plain: "رمز: ",
  ask_fire: "برای تأیید بنویس FIRE: ",
  pass_mismatch: "رمزها یکی نیستند.",
  password_short: "رمز باید حداقل ۱۲ کاراکتر باشد.",
  password_weak: "رمز باید حرف و رقم داشته باشد.",
  setup_next: "بعدی:",
  home: "خانهٔ داده",
  tg_hint: "تلگرام: in رمز",
  locked: "قفل موقت بعد از تلاش‌های غلط.",
  need_setup: "اول setup را کامل کن.",
  already_fired: "قبلاً شلیک شده. reset کن.",
  bad_pass: "رمز نادرست است.",
  need_path: "مسیر لازم است.",
  need_id: "شناسه یا مسیر لازم است.",
  bad_hours: "ساعت نامعتبر.",
  bad_minutes: "دقیقه نامعتبر.",
  need_channel: "نام کانال لازم است.",
  no_channel: "کانال نیست.",
  vault_empty: "خزانه خالی است.",
  need_channel_on: "حداقل یک کانال را روشن کن.",
  cancelled: "لغو شد.",
  checkin_ok: "چک‌این موفق",
  disarmed: "خنثی شد",
  armed: "مسلح",
  reset_ok: "بازنشانی شد",
  added: "اضافه شد {path}",
  removed: "حذف شد",
  updated: "{name} به‌روز شد",
  lang_set: "زبان: {lang}",
  lang_bad: "زبان ناشناخته. langs را بزن.",
  langs_title: "زبان‌ها",
  setup_done: "راه‌اندازی کامل شد",
  fired_log: "شلیک: {reason}",
  armed_log: "مسلح شد",
  reset_log: "بازنشانی شلیک",
  vault_log: "خزانه: {path}",
  checkin_log: "چک‌این از {source}",
  disarm_log: "خنثی از {source}",
  fail_log: "رمز نادرست",
  tg_deny_log: "تلگرام رد شد",
  tamper_log: "دستکاری خزانه — شلیک",
  warn_log: "مهلت رو به پایان",
  warn_tg: "مهلت نزدیک است. بفرست: in رمز",
  released_tg: "منتشر شد.\n{links}",
  tg_ok: "ok\n{left}",
  doctor_ok: "سالم",
  doctor_fail: "ناسالم",
  doctor_vault_missing: "مسیر خزانه نیست: {path}",
  doctor_no_channel: "کانالی روشن نیست",
  doctor_not_setup: "راه‌اندازی نشده",
  daemon_need_setup: "setup نشده. node bin/dedhand.js setup",
  unit: "{d} روز  {h} ساعت  {m} دقیقه  {s} ثانیه",
  default_message:
    "پروتکل دِدهَند فعال شد. اپراتور چک‌این نکرد.\nاین بسته به‌صورت خودکار منتشر می‌شود.",
});

add("ar", {
  already_setup: "تم الإعداد مسبقاً.",
  ask_name: "اسم المشغّل: ",
  ask_pass: "عبارة المرور (١٢+ حرفاً ورقماً): ",
  ask_pass2: "أعد العبارة: ",
  pass_mismatch: "العبارتان غير متطابقتين.",
  password_short: "يجب ألا تقل عن ١٢ حرفاً.",
  password_weak: "يلزم حروف وأرقام.",
  locked: "مقفل مؤقتاً بعد محاولات فاشلة.",
  need_setup: "نفّذ setup أولاً.",
  already_fired: "تم الإطلاق. استخدم reset.",
  bad_pass: "عبارة مرور خاطئة.",
  vault_empty: "الخزنة فارغة.",
  need_channel_on: "فعّل قناة نشر واحدة على الأقل.",
  checkin_ok: "تم تسجيل الحضور",
  disarmed: "أُلغي التسليح",
  armed: "مسلّح",
  lang_set: "اللغة: {lang}",
  warn_tg: "الموعد قريب. أرسل: in عبارة_المرور",
  released_tg: "نُشر.\n{links}",
  default_message: "تم تفعيل اليد الميتة. فوّت المشغّل تسجيل الحضور.",
  unit: "{d}ي {h}س {m}د {s}ث",
});

add("tr", {
  already_setup: "Zaten kurulu.",
  ask_name: "Operatör adı: ",
  ask_pass: "Parola (en az 12, harf+rakam): ",
  ask_pass2: "Tekrar: ",
  pass_mismatch: "Parolalar uyuşmuyor.",
  password_short: "En az 12 karakter.",
  password_weak: "Harf ve rakam gerekli.",
  locked: "Başarısız denemeler sonrası kilitli.",
  need_setup: "Önce setup.",
  already_fired: "Zaten ateşlendi. reset kullan.",
  bad_pass: "Yanlış parola.",
  vault_empty: "Kasa boş.",
  need_channel_on: "En az bir kanal aç.",
  checkin_ok: "check-in tamam",
  disarmed: "devre dışı",
  armed: "SİLAHLI",
  lang_set: "dil: {lang}",
  warn_tg: "Süre dolmak üzere. Gönder: in parola",
  released_tg: "Yayınlandı.\n{links}",
  default_message: "Ölü-el etkin. Operatör check-in yapmadı.",
});

add("ru", {
  already_setup: "Уже настроено.",
  ask_name: "Имя оператора: ",
  ask_pass: "Пароль (от 12, буквы и цифры): ",
  ask_pass2: "Повтор: ",
  pass_mismatch: "Пароли не совпадают.",
  password_short: "Не менее 12 символов.",
  password_weak: "Нужны буквы и цифры.",
  locked: "Временно заблокировано.",
  need_setup: "Сначала setup.",
  already_fired: "Уже сработало. reset.",
  bad_pass: "Неверный пароль.",
  vault_empty: "Хранилище пусто.",
  need_channel_on: "Включите хотя бы один канал.",
  checkin_ok: "check-in ок",
  disarmed: "снято",
  armed: "ВООРУЖЕНО",
  lang_set: "язык: {lang}",
  warn_tg: "Срок близко. Отправьте: in пароль",
  released_tg: "Опубликовано.\n{links}",
  default_message: "Протокол мёртвой руки. Оператор не отметился.",
});

add("de", {
  already_setup: "Bereits eingerichtet.",
  ask_name: "Operatorname: ",
  ask_pass: "Passphrase (min. 12, Buchstaben+Ziffern): ",
  ask_pass2: "Wiederholen: ",
  pass_mismatch: "Passphrasen stimmen nicht überein.",
  password_short: "Mindestens 12 Zeichen.",
  password_weak: "Buchstaben und Ziffern nötig.",
  locked: "Nach Fehlversuchen gesperrt.",
  need_setup: "Zuerst setup.",
  already_fired: "Bereits ausgelöst. reset.",
  bad_pass: "Falsche Passphrase.",
  vault_empty: "Tresor leer.",
  need_channel_on: "Mindestens einen Kanal aktivieren.",
  checkin_ok: "Check-in ok",
  disarmed: "entschärft",
  armed: "SCHARF",
  lang_set: "Sprache: {lang}",
  warn_tg: "Frist nah. Sende: in Passphrase",
  released_tg: "Veröffentlicht.\n{links}",
  default_message: "Totmannschaltung ausgelöst. Kein Check-in.",
});

add("fr", {
  already_setup: "Déjà configuré.",
  ask_name: "Nom de l'opérateur : ",
  ask_pass: "Phrase secrète (12+, lettres+chiffres) : ",
  ask_pass2: "Répéter : ",
  pass_mismatch: "Les phrases ne correspondent pas.",
  password_short: "Au moins 12 caractères.",
  password_weak: "Lettres et chiffres requis.",
  locked: "Verrouillé après échecs.",
  need_setup: "Faites setup d'abord.",
  already_fired: "Déjà déclenché. reset.",
  bad_pass: "Mauvaise phrase.",
  vault_empty: "Coffre vide.",
  need_channel_on: "Activez au moins un canal.",
  checkin_ok: "check-in ok",
  disarmed: "désarmé",
  armed: "ARMÉ",
  lang_set: "langue : {lang}",
  warn_tg: "Échéance proche. Envoyez : in phrase",
  released_tg: "Publié.\n{links}",
  default_message: "Protocole homme mort. L'opérateur n'a pas pointé.",
});

add("es", {
  already_setup: "Ya configurado.",
  ask_name: "Nombre del operador: ",
  ask_pass: "Frase de paso (12+, letras+números): ",
  ask_pass2: "Repetir: ",
  pass_mismatch: "No coinciden.",
  password_short: "Mínimo 12 caracteres.",
  password_weak: "Hacen falta letras y números.",
  locked: "Bloqueado tras fallos.",
  need_setup: "Haz setup primero.",
  already_fired: "Ya disparó. reset.",
  bad_pass: "Frase incorrecta.",
  vault_empty: "Bóveda vacía.",
  need_channel_on: "Activa al menos un canal.",
  checkin_ok: "check-in ok",
  disarmed: "desarmado",
  armed: "ARMADO",
  lang_set: "idioma: {lang}",
  warn_tg: "Plazo cerca. Envía: in frase",
  released_tg: "Publicado.\n{links}",
  default_message: "Protocolo de hombre muerto. Sin check-in.",
});

add("it", {
  already_setup: "Già configurato.",
  ask_pass: "Passphrase (12+, lettere+numeri): ",
  pass_mismatch: "Non coincidono.",
  bad_pass: "Passphrase errata.",
  vault_empty: "Cassaforte vuota.",
  armed: "ARMATO",
  lang_set: "lingua: {lang}",
  default_message: "Protocollo uomo morto attivato.",
});

add("pt", {
  already_setup: "Já configurado.",
  ask_pass: "Frase-passe (12+, letras+números): ",
  pass_mismatch: "Não coincidem.",
  bad_pass: "Frase errada.",
  vault_empty: "Cofre vazio.",
  armed: "ARMADO",
  lang_set: "idioma: {lang}",
  default_message: "Protocolo homem-morto ativado.",
});

add("zh", {
  already_setup: "已经初始化。",
  ask_name: "操作者姓名：",
  ask_pass: "口令（至少12位，字母+数字）：",
  ask_pass2: "再输入一次：",
  pass_mismatch: "两次口令不一致。",
  password_short: "至少12个字符。",
  password_weak: "需要字母和数字。",
  locked: "失败次数过多，暂时锁定。",
  need_setup: "请先 setup。",
  already_fired: "已经触发。使用 reset。",
  bad_pass: "口令错误。",
  vault_empty: "保险库为空。",
  need_channel_on: "至少启用一个频道。",
  checkin_ok: "签到成功",
  disarmed: "已解除",
  armed: "已武装",
  lang_set: "语言：{lang}",
  warn_tg: "期限将至。发送：in 口令",
  released_tg: "已发布。\n{links}",
  default_message: "死手协议已触发。操作者未签到。",
  unit: "{d}天 {h}时 {m}分 {s}秒",
});

add("ja", {
  already_setup: "既にセットアップ済み。",
  ask_pass: "パスフレーズ（12文字以上、文字+数字）: ",
  pass_mismatch: "一致しません。",
  bad_pass: "パスフレーズが違います。",
  vault_empty: "保管庫が空です。",
  armed: "アーム済み",
  lang_set: "言語: {lang}",
  default_message: "デッドマンが作動しました。チェックインなし。",
});

add("ko", {
  already_setup: "이미 설정됨.",
  ask_pass: "암호문 (12자 이상, 문자+숫자): ",
  bad_pass: "암호가 틀립니다.",
  vault_empty: "금고가 비어 있습니다.",
  armed: "무장됨",
  lang_set: "언어: {lang}",
  default_message: "데드맨 프로토콜이 작동했습니다.",
});

add("hi", {
  already_setup: "पहले से सेट है।",
  ask_pass: "पासफ्रेज़ (12+, अक्षर+अंक): ",
  bad_pass: "गलत पासफ्रेज़।",
  vault_empty: "वॉल्ट खाली है।",
  armed: "सशस्त्र",
  lang_set: "भाषा: {lang}",
  default_message: "डेड-हैंड चालू। ऑपरेटर चेक-इन नहीं किया।",
});

add("ur", {
  already_setup: "پہلے سے سیٹ ہے۔",
  ask_pass: "پاس فریز (۱۲+ حرف اور عدد): ",
  bad_pass: "غلط پاس فریز۔",
  vault_empty: "خزانہ خالی ہے۔",
  armed: "مسلح",
  lang_set: "زبان: {lang}",
  default_message: "ڈیڈ ہینڈ چالو ہو گیا۔ آپریٹر چیک اِن نہیں کیا۔",
});

add("id", {
  already_setup: "Sudah disetel.",
  bad_pass: "Frasa salah.",
  vault_empty: "Brankas kosong.",
  armed: "SIAGA",
  lang_set: "bahasa: {lang}",
  default_message: "Protokol dead-hand aktif.",
});

add("nl", {
  already_setup: "Al ingesteld.",
  bad_pass: "Verkeerde wachtzin.",
  vault_empty: "Kluis leeg.",
  armed: "GEWAPEND",
  lang_set: "taal: {lang}",
});

add("pl", {
  already_setup: "Już skonfigurowane.",
  bad_pass: "Złe hasło.",
  vault_empty: "Sejf pusty.",
  armed: "UZBROJONY",
  lang_set: "język: {lang}",
});

add("uk", {
  already_setup: "Вже налаштовано.",
  bad_pass: "Невірний пароль.",
  vault_empty: "Сховище порожнє.",
  armed: "ЗБРОЄНО",
  lang_set: "мова: {lang}",
});

add("az", {
  already_setup: "Artıq qurulub.",
  bad_pass: "Yanlış parol.",
  vault_empty: "Seyf boşdur.",
  armed: "SİLAHLI",
  lang_set: "dil: {lang}",
});

add("he", {
  already_setup: "כבר הוגדר.",
  bad_pass: "סיסמה שגויה.",
  vault_empty: "הכספת ריקה.",
  armed: "חמוש",
  lang_set: "שפה: {lang}",
});

add("sv", {
  already_setup: "Redan konfigurerad.",
  bad_pass: "Fel lösenfras.",
  vault_empty: "Valvet är tomt.",
  armed: "BEVÄPNAD",
  lang_set: "språk: {lang}",
});

add("vi", {
  already_setup: "Đã cài đặt.",
  bad_pass: "Sai cụm mật khẩu.",
  vault_empty: "Kho trống.",
  armed: "ĐÃ KÍCH",
  lang_set: "ngôn ngữ: {lang}",
});

add("th", {
  already_setup: "ตั้งค่าแล้ว",
  bad_pass: "รหัสผิด",
  vault_empty: "คลังว่าง",
  armed: "ติดอาวุธ",
  lang_set: "ภาษา: {lang}",
});

add("bn", {
  already_setup: "আগেই সেটআপ হয়েছে।",
  bad_pass: "ভুল পাসফ্রেজ।",
  vault_empty: "ভল্ট খালি।",
  armed: "সশস্ত্র",
  lang_set: "ভাষা: {lang}",
});

add("ms", {
  already_setup: "Sudah disediakan.",
  bad_pass: "Frasa salah.",
  vault_empty: "Peti kosong.",
  armed: "BERSENJATA",
  lang_set: "bahasa: {lang}",
});

add("cs", {
  already_setup: "Už nastaveno.",
  bad_pass: "Špatné heslo.",
  vault_empty: "Trezor prázdný.",
  armed: "ODJIŠTĚNO",
  lang_set: "jazyk: {lang}",
});

add("ro", {
  already_setup: "Deja configurat.",
  bad_pass: "Parolă greșită.",
  vault_empty: "Seiful e gol.",
  armed: "ARMAT",
  lang_set: "limbă: {lang}",
});

add("el", {
  already_setup: "Ήδη ρυθμισμένο.",
  bad_pass: "Λάθος φράση.",
  vault_empty: "Το θησαυροφυλάκιο είναι άδειο.",
  armed: "ΟΠΛΙΣΜΕΝΟ",
  lang_set: "γλώσσα: {lang}",
});

add("hu", {
  already_setup: "Már beállítva.",
  bad_pass: "Hibás jelszó.",
  vault_empty: "A trezor üres.",
  armed: "ÉLESÍTVE",
  lang_set: "nyelv: {lang}",
});

export function normalizeLang(raw) {
  if (!raw) return null;
  const base = String(raw).trim().toLowerCase().replace(/_/g, "-").split("-")[0];
  if (base === "iw") return "he";
  if (base === "in") return "id";
  if (base === "jp") return "ja";
  if (base === "ua") return "uk";
  if (packs[base]) return base;
  return null;
}

export function detectLang(stored) {
  return (
    normalizeLang(process.env.DEDHAND_LANG) ||
    normalizeLang(stored) ||
    "en"
  );
}

export function t(lang, key, vars = {}) {
  const pack = packs[normalizeLang(lang) || "en"] || packs.en;
  let text = pack[key] ?? packs.en[key] ?? key;
  for (const [k, v] of Object.entries(vars)) {
    text = text.replaceAll(`{${k}}`, String(v));
  }
  return text;
}

export function remainingLabel(ms, lang = "en") {
  const total = Math.max(0, Math.floor((ms || 0) / 1000));
  return t(lang, "unit", {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  });
}

export function formatTime(ts, lang) {
  if (!ts) return "—";
  const locale = normalizeLang(lang) || "en";
  try {
    return new Date(ts).toLocaleString(locale);
  } catch {
    return new Date(ts).toISOString();
  }
}

export function fail(lang, err) {
  if (err instanceof AppError) return t(lang, err.code, err.extra);
  return err.message || String(err);
}
