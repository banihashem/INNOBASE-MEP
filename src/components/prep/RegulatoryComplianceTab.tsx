import React, { useState } from "react";
import {
  RegulatoryChecklist,
  IngredientCheckItem,
  KNOWN_INGREDIENT_FLAGS,
} from "../../types";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  CheckSquare,
  Square,
  Search,
  FileText,
  Languages,
} from "lucide-react";

interface Props {
  marketName: string;
  offeringName: string;
}

const INITIAL_CHECKLIST: RegulatoryChecklist = {
  halalCertification: false,
  arabicLabelApproved: false,
  nutritionalPanelBilingual: false,
  allergenDisclosure: false,
  shelfLifeLabeling: false,
  importPermitFiled: false,
  moccaeRegistration: false,
  adafsaCompliance: false,
};

const CHECKLIST_LABELS: Record<keyof RegulatoryChecklist, { label: string; detail: string }> = {
  halalCertification: {
    label: "Halal Certification",
    detail: "Valid halal certificate from an accredited body (e.g., ESMA-recognized)",
  },
  arabicLabelApproved: {
    label: "Arabic Label Approved",
    detail: "Product label includes Arabic translation reviewed by certified translator",
  },
  nutritionalPanelBilingual: {
    label: "Bilingual Nutritional Panel",
    detail: "Nutritional information table in both Arabic and English per GSO 2233",
  },
  allergenDisclosure: {
    label: "Allergen Disclosure Completed",
    detail: "All 14 major allergens declared per UAE FSSAI and Codex Alimentarius",
  },
  shelfLifeLabeling: {
    label: "Shelf-Life & Date Labeling",
    detail: "Production date, expiry date, and best-before in DD/MM/YYYY format",
  },
  importPermitFiled: {
    label: "Import Permit Filed",
    detail: "FIRS (Food Import Re-export System) registration submitted to MOCCAE",
  },
  moccaeRegistration: {
    label: "MoCCAE Product Registration",
    detail: "Product registered on the Ministry of Climate Change & Environment portal",
  },
  adafsaCompliance: {
    label: "ADAFSA Compliance (Abu Dhabi)",
    detail: "Abu Dhabi Agriculture & Food Safety Authority standards met if targeting Abu Dhabi",
  },
};

export default function RegulatoryComplianceTab({ marketName, offeringName }: Props) {
  const [checklist, setChecklist] = useState<RegulatoryChecklist>(INITIAL_CHECKLIST);
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [selectedIngredients, setSelectedIngredients] = useState<IngredientCheckItem[]>([]);

  const toggleCheck = (key: keyof RegulatoryChecklist) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const totalCount = Object.keys(checklist).length;

  // Ingredient checker
  const filteredIngredients = KNOWN_INGREDIENT_FLAGS.filter((ing) =>
    ing.name.toLowerCase().includes(ingredientSearch.toLowerCase())
  );

  const addIngredient = (ing: IngredientCheckItem) => {
    if (!selectedIngredients.find((s) => s.id === ing.id)) {
      setSelectedIngredients((prev) => [...prev, ing]);
    }
    setIngredientSearch("");
  };

  const removeIngredient = (id: string) => {
    setSelectedIngredients((prev) => prev.filter((s) => s.id !== id));
  };

  const blockedCount = selectedIngredients.filter((i) => i.status === "BLOCKED").length;
  const warningCount = selectedIngredients.filter((i) => i.status === "WARNING").length;

  const getStatusIcon = (status: IngredientCheckItem["status"]) => {
    switch (status) {
      case "OK":
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case "WARNING":
        return <ShieldAlert className="w-4 h-4 text-amber-400" />;
      case "BLOCKED":
        return <ShieldX className="w-4 h-4 text-rose-400" />;
    }
  };

  const getStatusBadge = (status: IngredientCheckItem["status"]) => {
    const styles = {
      OK: "bg-emerald-950/40 text-emerald-400 border-emerald-900/40",
      WARNING: "bg-amber-950/40 text-amber-400 border-amber-900/40",
      BLOCKED: "bg-rose-950/40 text-rose-400 border-rose-900/40",
    };
    return (
      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${styles[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-fade-slide-in">
      {/* Header */}
      <div>
        <h3 className="text-xl font-semibold font-display text-white">
          Regulatory & Formulation Compliance
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          {marketName} market compliance checklist for {offeringName}. Based on UAE MoCCAE and ADAFSA standards.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Compliance Checklist */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <h4 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">
                Compliance Checklist
              </h4>
            </div>
            <span
              className={`text-xs font-mono font-bold px-2.5 py-1 rounded border ${
                completedCount === totalCount
                  ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/40"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
            >
              {completedCount}/{totalCount}
            </span>
          </div>

          <div className="space-y-3">
            {(Object.keys(checklist) as Array<keyof RegulatoryChecklist>).map((key) => {
              const info = CHECKLIST_LABELS[key];
              const checked = checklist[key];

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleCheck(key)}
                  className={`w-full flex items-start space-x-3 p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    checked
                      ? "bg-emerald-950/15 border-emerald-900/40"
                      : "bg-slate-950/40 border-slate-800/60 hover:border-slate-700"
                  }`}
                  id={`checklist-${key}`}
                >
                  {checked ? (
                    <CheckSquare className="w-4.5 h-4.5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-4.5 h-4.5 text-slate-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span
                      className={`text-sm font-semibold block ${
                        checked ? "text-emerald-300 line-through" : "text-slate-200"
                      }`}
                    >
                      {info.label}
                    </span>
                    <span className="text-xs text-slate-500 block mt-0.5">{info.detail}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Ingredient Checker */}
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-indigo-400" />
              <h4 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">
                Ingredient Flag Checker
              </h4>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search ingredients (e.g., gelatin, BHA, tartrazine...)"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                value={ingredientSearch}
                onChange={(e) => setIngredientSearch(e.target.value)}
                id="ingredient-search-input"
              />
              {ingredientSearch && filteredIngredients.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-800 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                  {filteredIngredients.map((ing) => (
                    <button
                      key={ing.id}
                      type="button"
                      onClick={() => addIngredient(ing)}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-slate-800/80 transition-colors cursor-pointer border-b border-slate-800/40 last:border-b-0"
                    >
                      {getStatusIcon(ing.status)}
                      <span className="text-sm text-slate-200">{ing.name}</span>
                      {getStatusBadge(ing.status)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Summary badges */}
            {selectedIngredients.length > 0 && (
              <div className="flex items-center space-x-3 pt-2">
                {blockedCount > 0 && (
                  <span className="text-xs font-bold bg-rose-950/40 text-rose-400 border border-rose-900/40 px-3 py-1.5 rounded-lg">
                    {blockedCount} BLOCKED
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="text-xs font-bold bg-amber-950/40 text-amber-400 border border-amber-900/40 px-3 py-1.5 rounded-lg">
                    {warningCount} WARNING
                  </span>
                )}
                <span className="text-xs text-slate-500">{selectedIngredients.length} ingredients checked</span>
              </div>
            )}

            {/* Selected Ingredients */}
            <div className="space-y-2">
              {selectedIngredients.map((ing) => (
                <div
                  key={ing.id}
                  className={`flex items-start justify-between p-4 rounded-xl border transition-all ${
                    ing.status === "BLOCKED"
                      ? "bg-rose-950/10 border-rose-900/40"
                      : ing.status === "WARNING"
                      ? "bg-amber-950/10 border-amber-900/40"
                      : "bg-emerald-950/10 border-emerald-900/40"
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {getStatusIcon(ing.status)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-slate-200">{ing.name}</span>
                        {getStatusBadge(ing.status)}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{ing.note}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeIngredient(ing.id)}
                    className="text-slate-500 hover:text-rose-400 text-xs ml-3 shrink-0 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Localization Assistant */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center space-x-2">
              <Languages className="w-4 h-4 text-indigo-400" />
              <h4 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">
                Localization Template
              </h4>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-3 font-mono text-xs">
              <p className="text-slate-400">
                <span className="text-indigo-400 font-bold">// Required Label Elements (GSO 9/2007)</span>
              </p>
              <div className="grid grid-cols-2 gap-4 text-slate-300">
                <div className="space-y-1">
                  <span className="text-slate-500 block">English</span>
                  <p>Product Name: {offeringName}</p>
                  <p>Net Weight: ____ g/ml</p>
                  <p>Ingredients: (descending order)</p>
                  <p>Allergens: <span className="text-amber-400">BOLD declaration</span></p>
                  <p>Nutritional Information per 100g</p>
                  <p>Storage: ___°C</p>
                  <p>Mfg Date: DD/MM/YYYY</p>
                  <p>Exp Date: DD/MM/YYYY</p>
                  <p>Country of Origin: ________</p>
                  <p>Importer: ________</p>
                </div>
                <div className="space-y-1 text-right" dir="rtl">
                  <span className="text-slate-500 block text-right">عربي</span>
                  <p>اسم المنتج: ________</p>
                  <p>الوزن الصافي: ____ غ/مل</p>
                  <p>المكونات: (ترتيب تنازلي)</p>
                  <p>مسببات الحساسية: <span className="text-amber-400">بخط عريض</span></p>
                  <p>القيمة الغذائية لكل 100 غ</p>
                  <p>التخزين: ___°م</p>
                  <p>تاريخ الإنتاج: يوم/شهر/سنة</p>
                  <p>تاريخ الانتهاء: يوم/شهر/سنة</p>
                  <p>بلد المنشأ: ________</p>
                  <p>المستورد: ________</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
