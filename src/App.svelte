<script lang="ts">
import Thing from "./Thing.svelte";
import { CddaData, data, loadProgress, mapType, singularName } from "./data";
import { tileData } from "./tile-data";
import SearchResults from "./SearchResults.svelte";
import Catalog from "./Catalog.svelte";
import dontPanic from "./assets/dont_panic.png";
import InterpolatedTranslation from "./InterpolatedTranslation.svelte";
import { t } from "@transifex/native";
import type { SupportedTypeMapped, SupportedTypesWithMapped } from "./types";
import throttle from "lodash/throttle";
import debounce from "lodash/debounce";
import { onDestroy } from "svelte";

let item: { type: string; id: string } | null = null;
let search: string = "";
let renderedSearch = search;
const updateRenderedSearch = debounce((value: string) => {
  renderedSearch = value;
}, 150);

function renderSearchNow() {
  updateRenderedSearch.cancel();
  renderedSearch = search;
}

$: if (search !== renderedSearch) {
  if (search) updateRenderedSearch(search);
  else renderSearchNow();
}

onDestroy(updateRenderedSearch.cancel);

let builds:
  | {
      build_number: string;
      prerelease: boolean;
      created_at: string;
      langs?: string[];
    }[]
  | null = null;

fetch(
  "https://raw.githubusercontent.com/CrimsonCrossBunker/CCB-GUIDE-DATA/main/builds.json",
)
  .then((d) => d.json())
  .then((b) => {
    builds = b;
  })
  .catch((e) => {
    console.error(e);
  });

const url = new URL(location.href);
const version = url.searchParams.get("v") ?? "latest";
const locale = url.searchParams.get("lang");
data.setVersion(version, locale);

const tilesets = [
  {
    name: "AltiCa",
    url: "https://raw.githubusercontent.com/CrimsonCrossBunker/Cataclysm-Cleanwater-Bomb/{version}/gfx/Altica",
  },
  {
    name: "BrownLikeBears",
    url: "https://raw.githubusercontent.com/CrimsonCrossBunker/Cataclysm-Cleanwater-Bomb/{version}/gfx/BrownLikeBears",
  },
  {
    name: "Chibi_Ultica",
    url: "https://raw.githubusercontent.com/CrimsonCrossBunker/Cataclysm-Cleanwater-Bomb/{version}/gfx/ChibiUltica",
  },
  {
    name: "Cuteclysm(Alpha)",
    url: "https://raw.githubusercontent.com/CrimsonCrossBunker/Cataclysm-Cleanwater-Bomb/{version}/gfx/Cuteclysm",
  },
  {
    name: "Hollow Moon",
    url: "https://raw.githubusercontent.com/CrimsonCrossBunker/Cataclysm-Cleanwater-Bomb/{version}/gfx/HollowMoon",
  },
  {
    name: "MSXotto+",
    url: "https://raw.githubusercontent.com/CrimsonCrossBunker/Cataclysm-Cleanwater-Bomb/{version}/gfx/MshockXotto%2B",
  },
  {
    name: "NeoDays",
    url: "https://raw.githubusercontent.com/CrimsonCrossBunker/Cataclysm-Cleanwater-Bomb/{version}/gfx/NeoDaysTileset",
  },
  {
    name: "RetroDays",
    url: "https://raw.githubusercontent.com/CrimsonCrossBunker/Cataclysm-Cleanwater-Bomb/{version}/gfx/RetroDaysTileset",
  },
  {
    name: "UltiCa",
    url: "https://raw.githubusercontent.com/CrimsonCrossBunker/Cataclysm-Cleanwater-Bomb/{version}/gfx/UltimateCataclysm",
  },
];

const normalizeTemplate = (t: string) => (t === "null" || !t ? "" : t);
function loadTileset(): string {
  try {
    const templ = localStorage.getItem("cdda-guide:tileset");
    if (!templ) return "";
    return normalizeTemplate(templ);
  } catch (e) {
    return "";
  }
}
function saveTileset(url: string) {
  try {
    if (!url) localStorage.removeItem("cdda-guide:tileset");
    else localStorage.setItem("cdda-guide:tileset", normalizeTemplate(url));
  } catch (e) {
    /* swallow security errors, which can happen when in incognito mode */
  }
}
let tilesetUrlTemplate = loadTileset();
$: saveTileset(tilesetUrlTemplate);
$: tilesetUrl = $data
  ? (tilesetUrlTemplate?.replace("{version}", $data.build_number!) ?? null)
  : null;
$: tileData.setURL(tilesetUrl);

function decodeQueryParam(p: string) {
  return decodeURIComponent(p.replace(/\+/g, " "));
}

function load() {
  const path = location.pathname.slice(import.meta.env.BASE_URL.length - 1);
  let m: RegExpExecArray | null;
  if ((m = /^\/([^\/]+)(?:\/(.+))?$/.exec(path))) {
    const [, type, id] = m;
    if (type === "search") {
      item = null;
      search = decodeQueryParam(id ?? "");
      renderSearchNow();
    } else {
      item = { type, id: id ? decodeURIComponent(id) : "" };
    }

    window.scrollTo(0, 0);
  } else {
    item = null;
    search = "";
    renderSearchNow();
  }
}

$: if (item && item.id && $data && $data.byIdMaybe(item.type as any, item.id)) {
  const it = $data.byId(item.type as any, item.id);
  document.title = `${singularName(it)} - Cataclysm: Cleanwater Bomb Guide`;
} else if (item && !item.id && item.type) {
  document.title = `${item.type} - Cataclysm: Cleanwater Bomb Guide`;
} else {
  document.title = "Cataclysm: Cleanwater Bomb Guide";
}

load();

// Throttle replaceState to avoid browser warnings.
// |throttle| isn't defined when running tests for some reason.
const replaceState = throttle
  ? throttle(history.replaceState.bind(history), 100, {
      trailing: true,
    })
  : history.replaceState.bind(history);

const clearItem = () => {
  if (item)
    history.pushState(
      null,
      "",
      import.meta.env.BASE_URL +
        (search ? "search/" + encodeURIComponent(search) : "") +
        location.search,
    );
  else
    replaceState(
      null,
      "",
      import.meta.env.BASE_URL +
        (search ? "search/" + encodeURIComponent(search) : "") +
        location.search,
    );
  item = null;
};

function maybeNavigate(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  const anchor = target?.closest("a") as HTMLAnchorElement | null;
  if (anchor && anchor.href) {
    const { origin, pathname } = new URL(anchor.href);
    if (
      origin === location.origin &&
      pathname.startsWith(import.meta.env.BASE_URL)
    ) {
      event.preventDefault();
      history.pushState(null, "", pathname + location.search);
      load();
    }
  }
}

window.addEventListener("popstate", () => {
  load();
});

let deferredPrompt: any;
window.addEventListener("beforeinstallprompt", (e) => {
  deferredPrompt = e;
});

function maybeFocusSearch(e: KeyboardEvent) {
  if (e.key === "/" && document.activeElement?.id !== "search") {
    document.getElementById("search")?.focus();
    e.preventDefault();
  }
}

function getLanguageName(code: string) {
  // from src/options.cpp
  return (
    {
      en: "English",
      ar: "العربية",
      cs: "Český Jazyk",
      da: "Dansk",
      de: "Deutsch",
      el: "Ελληνικά",
      es_AR: "Español (Argentina)",
      es_ES: "Español (España)",
      fr: "Français",
      hu: "Magyar",
      id: "Bahasa Indonesia",
      is: "Íslenska",
      it_IT: "Italiano",
      ja: "日本語",
      ko: "한국어",
      nb: "Norsk",
      nl: "Nederlands",
      pl: "Polski",
      pt_BR: "Português (Brasil)",
      ru: "Русский",
      sr: "Српски",
      tr: "Türkçe",
      uk_UA: "український",
      zh_CN: "中文（简体）",
      zh_TW: "中文（繁體）",
    }[code] ??
    (Intl?.DisplayNames
      ? new Intl.DisplayNames([code.replace(/_/, "-")], {
          type: "language",
        }).of(code.replace(/_/, "-"))
      : code)
  );
}

type Attribution = { text: string; issueLinkText: string };

const englishAttribution: Attribution = {
  text: `This Cleanwater Bomb edition is maintained on {link_github} by {link_maintainer}. It is derived from the original guide by nornagon and its contributors. If you notice any problems, please {link_file_an_issue}!`,
  issueLinkText: "file an issue",
};

const translatedAttributions: Record<string, Attribution> = {
  ace: {
    text: `Edisi Cleanwater Bomb nyoe geupeulara bak {link_github} le {link_maintainer}. Edisi nyoe geupeugöt nibak panduan asli atra nornagon ngon dum kontributornya. Meunyoe Droëneuh meurumpok masalah, neu{link_file_an_issue}!`,
    issueLinkText: "kirim laporan masalah",
  },
  ar: {
    text: `يتولى {link_maintainer} صيانة إصدار Cleanwater Bomb هذا على {link_github}. وهو مشتق من الدليل الأصلي الذي أنشأه nornagon ومساهموه. إذا لاحظت أي مشكلة، فيُرجى {link_file_an_issue}!`,
    issueLinkText: "فتح بلاغ",
  },
  be: {
    text: `Гэтае выданне Cleanwater Bomb падтрымлівае {link_maintainer} на {link_github}. Яно створана на аснове арыгінальнага даведніка nornagon і яго ўдзельнікаў. Калі вы заўважылі праблему, калі ласка, {link_file_an_issue}!`,
    issueLinkText: "стварыце паведамленне пра праблему",
  },
  bg: {
    text: `Това издание на Cleanwater Bomb се поддържа в {link_github} от {link_maintainer}. То е създадено въз основа на оригиналния справочник на nornagon и неговите сътрудници. Ако забележите проблем, моля, {link_file_an_issue}!`,
    issueLinkText: "подайте сигнал",
  },
  ca: {
    text: `Aquesta edició de Cleanwater Bomb és mantinguda a {link_github} per {link_maintainer}. Deriva de la guia original de nornagon i els seus col·laboradors. Si detecteu cap problema, {link_file_an_issue}!`,
    issueLinkText: "obriu una incidència",
  },
  cs: {
    text: `Tuto edici Cleanwater Bomb udržuje na {link_github} tým {link_maintainer}. Vychází z původního průvodce od nornagona a jeho přispěvatelů. Pokud narazíte na problém, {link_file_an_issue}!`,
    issueLinkText: "nahlaste jej",
  },
  da: {
    text: `Denne Cleanwater Bomb-udgave vedligeholdes på {link_github} af {link_maintainer}. Den er baseret på den oprindelige guide af nornagon og bidragyderne. Hvis du opdager et problem, bedes du {link_file_an_issue}!`,
    issueLinkText: "oprette en fejlrapport",
  },
  de: {
    text: `Diese Cleanwater-Bomb-Ausgabe wird auf {link_github} von {link_maintainer} gepflegt. Sie basiert auf dem ursprünglichen Guide von nornagon und den Mitwirkenden. Wenn dir ein Problem auffällt, {link_file_an_issue}!`,
    issueLinkText: "erstelle bitte einen Issue",
  },
  el: {
    text: `Αυτή η έκδοση Cleanwater Bomb συντηρείται στο {link_github} από το {link_maintainer}. Βασίζεται στον αρχικό οδηγό του nornagon και των συντελεστών του. Αν παρατηρήσετε κάποιο πρόβλημα, {link_file_an_issue}!`,
    issueLinkText: "υποβάλετε μια αναφορά",
  },
  "en@pirate": {
    text: `This Cleanwater Bomb edition be kept shipshape on {link_github} by {link_maintainer}. It be descended from the original guide by nornagon and the crew. If ye spy trouble, {link_file_an_issue}!`,
    issueLinkText: "send up a distress signal",
  },
  eo: {
    text: `Ĉi tiu eldono de Cleanwater Bomb estas prizorgata en {link_github} de {link_maintainer}. Ĝi devenas de la originala gvidilo de nornagon kaj ties kontribuantoj. Se vi rimarkas problemon, bonvolu {link_file_an_issue}!`,
    issueLinkText: "raporti ĝin",
  },
  es: {
    text: `Esta edición de Cleanwater Bomb se mantiene en {link_github} por {link_maintainer}. Se deriva de la guía original de nornagon y sus colaboradores. Si encuentras algún problema, {link_file_an_issue}!`,
    issueLinkText: "informa de él",
  },
  es_AR: {
    text: `Esta edición de Cleanwater Bomb es mantenida en {link_github} por {link_maintainer}. Se deriva de la guía original de nornagon y sus colaboradores. Si encontrás algún problema, ¡{link_file_an_issue}!`,
    issueLinkText: "reportalo",
  },
  es_ES: {
    text: `Esta edición de Cleanwater Bomb se mantiene en {link_github} por {link_maintainer}. Se deriva de la guía original de nornagon y sus colaboradores. Si encuentras algún problema, ¡{link_file_an_issue}!`,
    issueLinkText: "notifícalo",
  },
  et: {
    text: `Seda Cleanwater Bombi väljaannet haldab {link_github} keskkonnas {link_maintainer}. See põhineb nornagoni ja kaasautorite algsel juhendil. Kui märkad probleemi, palun {link_file_an_issue}!`,
    issueLinkText: "teata sellest",
  },
  fa_IR: {
    text: `این نسخهٔ Cleanwater Bomb در {link_github} توسط {link_maintainer} نگهداری می‌شود. این نسخه از راهنمای اصلی nornagon و مشارکت‌کنندگان آن گرفته شده است. اگر مشکلی مشاهده کردید، لطفاً {link_file_an_issue}!`,
    issueLinkText: "یک گزارش مشکل ثبت کنید",
  },
  fi: {
    text: `Tätä Cleanwater Bomb -versiota ylläpitää {link_maintainer} {link_github}-palvelussa. Se perustuu nornagonin ja muiden tekijöiden alkuperäiseen oppaaseen. Jos huomaat ongelman, {link_file_an_issue}!`,
    issueLinkText: "ilmoita siitä",
  },
  fil_PH: {
    text: `Ang edisyong ito ng Cleanwater Bomb ay pinapanatili sa {link_github} ng {link_maintainer}. Hango ito sa orihinal na gabay ni nornagon at ng mga nag-ambag dito. Kung may mapansin kang problema, mangyaring {link_file_an_issue}!`,
    issueLinkText: "magsumite ng ulat",
  },
  fr: {
    text: `Cette édition de Cleanwater Bomb est maintenue sur {link_github} par {link_maintainer}. Elle est dérivée du guide original de nornagon et de ses contributeurs. Si vous remarquez un problème, veuillez {link_file_an_issue} !`,
    issueLinkText: "ouvrir un ticket",
  },
  ga_IE: {
    text: `Tá an t-eagrán seo de Cleanwater Bomb á chothabháil ar {link_github} ag {link_maintainer}. Tá sé bunaithe ar an treoir bhunaidh le nornagon agus a rannpháirtithe. Má thugann tú fadhb faoi deara, {link_file_an_issue}!`,
    issueLinkText: "oscail tuairisc ar fhadhb",
  },
  he: {
    text: `מהדורת Cleanwater Bomb זו מתוחזקת ב־{link_github} על ידי {link_maintainer}. היא נגזרת מהמדריך המקורי של nornagon והתורמים שלו. אם נתקלת בבעיה, נא {link_file_an_issue}!`,
    issueLinkText: "לפתוח דיווח",
  },
  hu: {
    text: `A Cleanwater Bomb ezen kiadását a {link_maintainer} tartja karban a {link_github} felületén. A nornagon és közreműködői által készített eredeti útmutatón alapul. Ha problémát észlelsz, kérjük, {link_file_an_issue}!`,
    issueLinkText: "jelentsd be",
  },
  id: {
    text: `Edisi Cleanwater Bomb ini dikelola di {link_github} oleh {link_maintainer}. Edisi ini berasal dari panduan asli karya nornagon dan para kontributornya. Jika Anda menemukan masalah, silakan {link_file_an_issue}!`,
    issueLinkText: "kirim laporan",
  },
  is: {
    text: `Þessari útgáfu Cleanwater Bomb er viðhaldið á {link_github} af {link_maintainer}. Hún er byggð á upprunalegu handbókinni eftir nornagon og aðra þátttakendur. Ef þú tekur eftir vandamáli skaltu {link_file_an_issue}!`,
    issueLinkText: "tilkynna það",
  },
  it_IT: {
    text: `Questa edizione di Cleanwater Bomb è mantenuta su {link_github} da {link_maintainer}. Deriva dalla guida originale di nornagon e dei suoi collaboratori. Se noti un problema, {link_file_an_issue}!`,
    issueLinkText: "segnalalo",
  },
  ja: {
    text: `この Cleanwater Bomb 版は、{link_maintainer} が {link_github} でメンテナンスしています。nornagon とコントリビューターによるオリジナル版のガイドを基にしています。問題を見つけた場合は、{link_file_an_issue}してください！`,
    issueLinkText: "Issue を報告",
  },
  ko: {
    text: `이 Cleanwater Bomb 에디션은 {link_maintainer}가 {link_github}에서 관리합니다. nornagon과 기여자들이 만든 원본 가이드를 기반으로 합니다. 문제가 있다면 {link_file_an_issue}해 주세요!`,
    issueLinkText: "이슈를 등록",
  },
  ms: {
    text: `Edisi Cleanwater Bomb ini diselenggara di {link_github} oleh {link_maintainer}. Edisi ini diterbitkan berasaskan panduan asal oleh nornagon dan para penyumbangnya. Jika anda menemui sebarang masalah, sila {link_file_an_issue}!`,
    issueLinkText: "hantar laporan",
  },
  nb: {
    text: `Denne Cleanwater Bomb-utgaven vedlikeholdes på {link_github} av {link_maintainer}. Den er basert på den opprinnelige veiledningen av nornagon og bidragsyterne. Hvis du oppdager et problem, vennligst {link_file_an_issue}!`,
    issueLinkText: "opprett en feilrapport",
  },
  nl: {
    text: `Deze Cleanwater Bomb-editie wordt op {link_github} onderhouden door {link_maintainer}. Ze is afgeleid van de oorspronkelijke gids van nornagon en de andere bijdragers. Als je een probleem opmerkt, {link_file_an_issue}!`,
    issueLinkText: "meld het dan",
  },
  nl_BE: {
    text: `Deze Cleanwater Bomb-editie wordt op {link_github} onderhouden door {link_maintainer}. Ze is gebaseerd op de oorspronkelijke gids van nornagon en de andere medewerkers. Als je een probleem opmerkt, {link_file_an_issue}!`,
    issueLinkText: "meld het dan",
  },
  pl: {
    text: `Ta edycja Cleanwater Bomb jest utrzymywana w serwisie {link_github} przez {link_maintainer}. Powstała na podstawie oryginalnego przewodnika autorstwa nornagona i współtwórców. Jeśli zauważysz problem, {link_file_an_issue}!`,
    issueLinkText: "zgłoś go",
  },
  pt: {
    text: `Esta edição de Cleanwater Bomb é mantida no {link_github} por {link_maintainer}. Deriva do guia original de nornagon e dos seus colaboradores. Se encontrar algum problema, {link_file_an_issue}!`,
    issueLinkText: "comunique-o",
  },
  pt_BR: {
    text: `Esta edição de Cleanwater Bomb é mantida no {link_github} por {link_maintainer}. Ela é derivada do guia original de nornagon e seus colaboradores. Se você encontrar algum problema, {link_file_an_issue}!`,
    issueLinkText: "abra uma issue",
  },
  ro: {
    text: `Această ediție Cleanwater Bomb este întreținută pe {link_github} de {link_maintainer}. Este derivată din ghidul original realizat de nornagon și colaboratorii săi. Dacă observați o problemă, vă rugăm să {link_file_an_issue}!`,
    issueLinkText: "o raportați",
  },
  ru: {
    text: `Эту версию Cleanwater Bomb поддерживает {link_maintainer} на {link_github}. Она создана на основе оригинального справочника nornagon и его участников. Если вы заметили проблему, пожалуйста, {link_file_an_issue}!`,
    issueLinkText: "сообщите о ней",
  },
  sr: {
    text: `Ово издање Cleanwater Bomb-а одржава {link_maintainer} на {link_github}-у. Изведено је из оригиналног водича који су направили nornagon и сарадници. Ако приметите проблем, {link_file_an_issue}!`,
    issueLinkText: "пријавите га",
  },
  sv: {
    text: `Den här utgåvan av Cleanwater Bomb underhålls på {link_github} av {link_maintainer}. Den bygger på den ursprungliga guiden av nornagon och de andra bidragsgivarna. Om du upptäcker ett problem, {link_file_an_issue}!`,
    issueLinkText: "rapportera det",
  },
  th_TH: {
    text: `คู่มือฉบับ Cleanwater Bomb นี้ดูแลบน {link_github} โดย {link_maintainer} และพัฒนาต่อยอดจากคู่มือต้นฉบับของ nornagon และผู้ร่วมพัฒนา หากพบปัญหา โปรด{link_file_an_issue}!`,
    issueLinkText: "แจ้งปัญหา",
  },
  tr: {
    text: `Bu Cleanwater Bomb sürümü {link_github} üzerinde {link_maintainer} tarafından sürdürülmektedir. nornagon ve katkıda bulunanların hazırladığı özgün rehberden türetilmiştir. Bir sorun fark ederseniz lütfen {link_file_an_issue}!`,
    issueLinkText: "bildirin",
  },
  uk_UA: {
    text: `Це видання Cleanwater Bomb підтримує {link_maintainer} на {link_github}. Воно створене на основі оригінального довідника nornagon та його учасників. Якщо ви помітили проблему, будь ласка, {link_file_an_issue}!`,
    issueLinkText: "повідомте про неї",
  },
  vi: {
    text: `Phiên bản Cleanwater Bomb này được {link_maintainer} duy trì trên {link_github}. Phiên bản này được phát triển từ hướng dẫn gốc của nornagon và những người đóng góp. Nếu bạn phát hiện vấn đề, vui lòng {link_file_an_issue}!`,
    issueLinkText: "gửi báo cáo",
  },
  zh_CN: {
    text: `这个 Cleanwater Bomb 版本由 {link_maintainer} 在 {link_github} 上维护。它基于 nornagon 及其贡献者开发的原版指南。如果你发现任何问题，请{link_file_an_issue}！`,
    issueLinkText: "提交问题",
  },
  zh_TW: {
    text: `這個 Cleanwater Bomb 版本由 {link_maintainer} 在 {link_github} 上維護。它衍生自 nornagon 及其貢獻者開發的原版指南。如果你發現任何問題，請{link_file_an_issue}！`,
    issueLinkText: "提交問題",
  },
};

function attributionForLocale(language: string | null): Attribution {
  return translatedAttributions[language ?? ""] ?? englishAttribution;
}

const attribution = attributionForLocale(locale);

const randomableItemTypes = new Set<keyof SupportedTypesWithMapped>([
  "item",
  "monster",
  "furniture",
  "terrain",
  "vehicle_part",
  "tool_quality",
  "mutation",
  "martial_art",
  "json_flag",
  "achievement",
  "conduct",
  "proficiency",
]);
async function getRandomPage() {
  const d = await new Promise<CddaData>((resolve) => {
    const unsubscribe = data.subscribe((v) => {
      if (v) {
        resolve(v);
        setTimeout(() => unsubscribe());
      }
    });
  });
  const items = d
    .all()
    .filter(
      (x) => "id" in x && randomableItemTypes.has(mapType(x.type)),
    ) as (SupportedTypeMapped & { id: string })[];
  return items[(Math.random() * items.length) | 0];
}

let randomPage: string | null = null;
function newRandomPage() {
  getRandomPage().then((r) => {
    randomPage = `${import.meta.env.BASE_URL}${mapType(r.type)}/${r.id}${
      location.search
    }`;
  });
}
newRandomPage();

// This is one character behind the actual search value, because
// of the throttle, but eh, it's good enough.
let currentHref = location.href;
$: (item, search, (currentHref = location.href));

function langHref(lang: string, href: string) {
  const u = new URL(href);
  u.searchParams.set("lang", lang);
  return u.toString();
}
</script>

<svelte:window on:click={maybeNavigate} on:keydown={maybeFocusSearch} />

<svelte:head>
  {#if builds}
    {@const build_number =
      version === "latest" ? builds[0].build_number : version}
    {#each [...(builds.find((b) => b.build_number === build_number)?.langs ?? [])].sort( (a, b) => a.localeCompare(b), ) as lang}
      <link
        rel="alternate"
        hreflang={lang}
        href={langHref(lang, currentHref)} />
    {/each}
  {/if}
</svelte:head>

<header>
  <nav>
    <div class="title">
      <!-- svelte-ignore a11y-invalid-attribute -->
      <strong>
        <a
          href={import.meta.env.BASE_URL + location.search}
          on:click={() => (search = "")}
          ><span class="wide">Cataclysm: Cleanwater Bomb Guide</span><span
            class="narrow">CCB Guide</span
          ></a>
      </strong>
    </div>
    <div class="search">
      <input
        style="margin: 0; width: 100%"
        placeholder={t("Search...", {
          _comment: "Placeholder text in the search box",
        })}
        type="search"
        bind:value={search}
        on:input={clearItem}
        id="search" />
    </div>
  </nav>
</header>
<main>
  {#if item}
    {#if $data}
      {#key item}
        {#if item.id}
          <Thing {item} data={$data} />
        {:else}
          <Catalog type={item.type} data={$data} />
        {/if}
      {/key}
    {:else}
      <span style="color: var(--cata-color-gray)">
        <em>{t("Loading...")}</em>
        {#if $loadProgress}
          ({($loadProgress[0] / 1024 / 1024).toFixed(1)}/{(
            $loadProgress[1] /
            1024 /
            1024
          ).toFixed(1)} MB)
        {/if}
      </span>
    {/if}
  {:else if search}
    {#if $data}
      {#key renderedSearch}
        <SearchResults data={$data} search={renderedSearch} />
      {/key}
    {:else}
      <span style="color: var(--cata-color-gray)">
        <em>{t("Loading...")}</em>
        {#if $loadProgress}
          ({($loadProgress[0] / 1024 / 1024).toFixed(1)}/{(
            $loadProgress[1] /
            1024 /
            1024
          ).toFixed(1)} MB)
        {/if}
      </span>
    {/if}
  {:else}
    <img
      src={dontPanic}
      height="200"
      width="343"
      style="float:right"
      alt="The words 'Don't Panic' in big friendly letters" />
    <p>
      <InterpolatedTranslation
        str={t(
          `The {hhg} is a guide to the zombie survival roguelike game {link_cdda}. You can
search for things in the game, like items (e.g. a {link_flashlight}), furniture
(e.g. a {link_table}), or monsters (e.g. a {link_zombie}), and find useful
information about them. The data in the Guide comes directly from the JSON
files in the game itself.`,
          {
            hhg: "{hhg}",
            link_cdda: "{link_cdda}",
            link_flashlight: "{link_flashlight}",
            link_table: "{link_table}",
            link_zombie: "{link_zombie}",
          },
        )}
        slot0="hhg"
        slot1="link_cdda"
        slot2="link_flashlight"
        slot3="link_table"
        slot4="link_zombie">
        <strong slot="0">Cataclysm: Cleanwater Bomb Guide</strong>
        <a
          slot="1"
          href="https://github.com/CrimsonCrossBunker/Cataclysm-Cleanwater-Bomb"
          >Cataclysm: Cleanwater Bomb</a>
        <a
          slot="2"
          href="{import.meta.env.BASE_URL}item/flashlight{location.search}"
          >{t("flashlight", { _comment: "Item name" })}</a>
        <a
          slot="3"
          href="{import.meta.env.BASE_URL}furniture/f_table{location.search}"
          >{t("table", { _comment: "Furniture" })}</a>
        <a
          slot="4"
          href="{import.meta.env.BASE_URL}monster/mon_zombie{location.search}"
          >{t("zombie", { _comment: "Monster name" })}</a>
      </InterpolatedTranslation>
    </p>
    <p>
      {t(`The Guide stores all its data locally and is offline-capable, so you can
take it with you wherever you go. There's nothing to do to make the Guide
work offline, just visit the page and it will work even without internet
access, as long as you've visited it once before.`)}
      {#if deferredPrompt}
        <InterpolatedTranslation
          str={t(
            `It's also {installable_button}, so you can pop it out of your browser and use it like a regular app.`,
            { installable_button: "{installable_button}" },
          )}
          slot0="installable_button">
          <button
            slot="0"
            class="disclosure"
            on:click={(e) => {
              e.preventDefault();
              deferredPrompt.prompt();
            }}
            >{t("installable", {
              _context: "Front page",
              _comment: "Meaning, install the Hitchhiker's Guide app itself.",
            })}</button>
        </InterpolatedTranslation>
      {/if}
    </p>
    <p style="font-style: italic; color: var(--cata-color-gray)">
      {t(
        `More popular than the Celestial Home Care Omnibus, better selling than
Fifty-three More Things to do in Zero Gravity, and more controversial than
Oolon Colluphid's trilogy of philosophical blockbusters Where God Went
Wrong, Some More of God's Greatest Mistakes and Who is this God Person
Anyway?`,
        {
          _comment:
            "This is a quote from the Hitchhiker's Guide to the Galaxy, by Douglas Adams",
        },
      )}
    </p>
    <p>
      <InterpolatedTranslation
        str={attribution.text}
        slot0="link_github"
        slot1="link_maintainer"
        slot2="link_file_an_issue">
        <a slot="0" href="https://github.com/CrimsonCrossBunker/CCB-GUIDE"
          >GitHub</a>
        <a slot="1" href="https://github.com/CrimsonCrossBunker"
          >CrimsonCrossBunker</a>
        <a
          slot="2"
          href="https://github.com/CrimsonCrossBunker/CCB-GUIDE/issues"
          >{attribution.issueLinkText}</a>
      </InterpolatedTranslation>
    </p>

    {#if locale}
      <p style="font-weight: bold">
        <InterpolatedTranslation
          str={t(
            `You can help translate the Guide into your language on {link_transifex}.`,
            { link_transifex: "{link_transifex}" },
          )}
          slot0="link_transifex">
          <a
            slot="0"
            href="https://www.transifex.com/nornagon/the-hitchhikers-guide-to-the-cataclysm/"
            >Transifex</a>
        </InterpolatedTranslation>
      </p>
    {/if}

    <h2>{t("Catalogs")}</h2>
    <ul>
      <li>
        <a href="{import.meta.env.BASE_URL}item{location.search}"
          >{t("Items")}</a>
      </li>
      <li>
        <a href="{import.meta.env.BASE_URL}monster{location.search}"
          >{t("Monsters")}</a>
      </li>
      <li>
        <a href="{import.meta.env.BASE_URL}furniture{location.search}"
          >{t("Furniture")}</a>
      </li>
      <li>
        <a href="{import.meta.env.BASE_URL}terrain{location.search}"
          >{t("Terrain")}</a>
      </li>
      <li>
        <a href="{import.meta.env.BASE_URL}vehicle_part{location.search}"
          >{t("Vehicle Parts")}</a>
      </li>
      <li>
        <a href="{import.meta.env.BASE_URL}tool_quality{location.search}"
          >{t("Qualities")}</a>
      </li>
      <li>
        <a href="{import.meta.env.BASE_URL}mutation{location.search}"
          >{t("Mutations")}</a>
      </li>
      <li>
        <a href="{import.meta.env.BASE_URL}martial_art{location.search}"
          >{t("Martial Arts")}</a>
      </li>
      <li>
        <a href="{import.meta.env.BASE_URL}json_flag{location.search}"
          >{t("Flags")}</a>
      </li>
      <li>
        <a href="{import.meta.env.BASE_URL}achievement{location.search}"
          >{t("Achievements")}</a>
        /
        <a href="{import.meta.env.BASE_URL}conduct{location.search}"
          >{t("Conducts")}</a>
      </li>
      <li>
        <a href="{import.meta.env.BASE_URL}proficiency{location.search}"
          >{t("Proficiencies")}</a>
      </li>
    </ul>

    <InterpolatedTranslation
      str={t(`Or visit a {link_random_page}.`, {
        link_random_page: "{link_random_page}",
      })}
      slot0="link_random_page">
      <a slot="0" href={randomPage} on:click={() => setTimeout(newRandomPage)}
        >{t("random page")}</a>
    </InterpolatedTranslation>
  {/if}

  <p class="data-options">
    {t("Version:")}
    {#if $data || builds}
      {#if builds}
        <!-- svelte-ignore a11y-no-onchange -->
        <select
          value={$data?.build_number ??
            (version === "latest" ? builds[0].build_number : version)}
          on:change={(e) => {
            const url = new URL(location.href);
            const buildNumber = e.currentTarget.value;
            if (buildNumber === builds?.[0].build_number)
              url.searchParams.delete("v");
            else url.searchParams.set("v", buildNumber);
            location.href = url.toString();
          }}>
          <optgroup label="Stable">
            {#each builds.filter((b) => !b.prerelease) as build}
              <option value={build.build_number}>{build.build_number}</option>
            {/each}
          </optgroup>
          <optgroup label="Experimental">
            {#each builds.filter((b) => b.prerelease) as build, i}
              <option value={build.build_number}
                >{build.build_number}{#if i === 0}&nbsp;(latest){/if}</option>
            {/each}
          </optgroup>
        </select>
      {:else if $data}
        <select disabled>
          <option>{$data.build_number}</option>
        </select>
      {/if}
    {:else}
      <em style="color: var(--cata-color-gray)">({t("Loading...")})</em>
    {/if}
    <span style="white-space: nowrap">
      {t("Tileset:")}
      <!-- svelte-ignore a11y-no-onchange -->
      <select
        value={tilesetUrlTemplate}
        on:change={(e) => {
          tilesetUrlTemplate = e.currentTarget.value;
        }}>
        <option value="">None (ASCII)</option>
        {#each tilesets as { name, url }}
          <option value={url}>{name}</option>
        {/each}
      </select>
    </span>
    <span style="white-space: nowrap">
      {t("Language:")}
      {#if builds}
        {@const build_number =
          version === "latest" ? builds[0].build_number : version}
        {@const build = builds.find((b) => b.build_number === build_number)}
        {@const langs = build?.langs ?? []}
        {@const validLangs = langs.filter((lang) => {
          try {
            getLanguageName(lang);
            return true;
          } catch {
            return false;
          }
        })}
        <select
          value={locale || "en"}
          on:change={(e) => {
            const url = new URL(location.href);
            const lang = e.currentTarget.value;
            if (lang === "en") url.searchParams.delete("lang");
            else url.searchParams.set("lang", lang);
            location.href = url.toString();
          }}>
          <option value="en">English</option>
          {#each validLangs.sort((a, b) => a.localeCompare(b)) as lang}
            <option value={lang}>{getLanguageName(lang)}</option>
          {/each}
        </select>
      {:else}
        <select disabled><option>{t("Loading...")}</option></select>
      {/if}
    </span>
  </p>
</main>

<style>
main {
  text-align: left;
  padding: 1em;
  max-width: 980px;
  margin: 0 auto;
  margin-top: 4rem;
}
header {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 100;
  box-shadow: 0px 0px 8px rgba(0, 0, 0, 0.5);
  width: 100%;
  height: 4rem;
  background: rgba(33, 33, 33, 0.98);
  padding: 0 calc(1em + 8px);
  box-sizing: border-box;
}

nav {
  max-width: 980px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
}

nav > .search {
  flex: 1;
  max-width: calc(0.5 * 980px);
}

nav > .title .narrow {
  display: none;
}

nav > .title {
  margin-right: 1em;
}

@media (max-width: 600px) {
  nav > .title .wide {
    display: none;
  }
  nav > .title .narrow {
    display: inline;
  }

  nav > .search {
    flex: 1;
  }
}

.data-options select {
  max-width: 100%;
}
</style>
