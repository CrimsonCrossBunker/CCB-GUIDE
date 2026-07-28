import makeI18n from "gettext.js";
import { expect, test } from "vitest";

import { CddaData, normalizePluralCatalogEntries } from "./data";

test("normalizes collapsed one-form plural translations", () => {
  const data = new CddaData([
    {
      type: "ITEM",
      abstract: "ammo_base",
      name: { str_sp: ".22 LR" },
    },
    {
      type: "ITEM",
      id: "22_lr",
      "copy-from": "ammo_base",
    },
  ]);
  const malformedCatalog = {
    "": {
      language: "zh_CN",
      "plural-forms": "nplurals=1; plural=0;",
    },
    ".22 LR": ".22 LR 弹",
    "ordinary singular message": "普通单数消息",
  };

  const normalized = normalizePluralCatalogEntries(malformedCatalog, data);

  expect(normalized[".22 LR"]).toEqual([".22 LR 弹"]);
  expect(normalized["ordinary singular message"]).toBe("普通单数消息");
  expect(malformedCatalog[".22 LR"]).toBe(".22 LR 弹");

  const gettext = makeI18n();
  gettext.loadJSON(normalized);
  gettext.setLocale("zh_CN");
  expect(gettext.dcnpgettext(undefined, undefined, ".22 LR", ".22 LR", 1)).toBe(
    ".22 LR 弹",
  );
});

test("keeps correctly generated plural arrays unchanged", () => {
  const data = new CddaData([
    {
      type: "ITEM",
      id: "22_lr",
      name: { str_sp: ".22 LR" },
    },
  ]);
  const translation = [".22 LR 弹"];
  const normalized = normalizePluralCatalogEntries(
    {
      "": {
        language: "zh_CN",
        "plural-forms": "nplurals=1; plural=0;",
      },
      ".22 LR": translation,
    },
    data,
  );

  expect(normalized[".22 LR"]).toBe(translation);
});
