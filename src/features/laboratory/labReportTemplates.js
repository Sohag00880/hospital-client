// Editable layouts transcribed from the supplied examples. No patient results.
const field=(label,type="numeric",unit="",referenceRange="",section="",extra={})=>({label,type,unit,referenceRange,section,...extra});
export const labReportTemplates=[
  {key:"rbs",code:"RBS",name:"Random Blood Sugar (RBS)",specimenType:"blood",description:"Random blood sugar with an optional corresponding urine sugar finding.",parameters:[
    field("Random blood sugar (RBS)","numeric","mmol/L","Up to 7.8 mmol/L","Biochemistry"),
    field("Corresponding urine sugar","text","","Nil","Corresponding urine (if provided)",{required:false}),
  ]},
  {key:"haemoglobin",code:"HB",name:"Haemoglobin (Hb%)",specimenType:"blood",description:"Standalone haemoglobin report with editable sex-specific reference values.",parameters:[
    field("Haemoglobin","numeric","gm/dl","Male: 12–18 gm/dl\nFemale: 11–16 gm/dl","Haematology"),
  ]},
  {key:"urine-re",code:"URINE_RE",name:"Urine R/E",specimenType:"urine",description:"Complete two-page layout: physical, chemical and microscopic examination, casts, crystals and other findings.",parameters:[
    ...["Quantity","Colour","Appearance","Sediment","Specific gravity"].map(label=>field(label,"text","","","Physical examination")),
    ...["Reaction (pH)","B. J. Protein","Ex. Phosphate","Bilirubin","Urobilinogen","Nitrite","Leukocyte esterase","Albumin","Sugar"].map(label=>field(label,"text","","","Chemical examination")),
    ...["Pus cell","Epithelial cells","RBC"].map(label=>field(label,"text","/HPF","","Microscopic examination")),
    ...["Yeast","Fungus","Bacteria"].map(label=>field(label,"text","","","Organisms")),
    ...["Granular","Epithelial","Hyaline","Cellular"].map(label=>field(label,"text","","","Casts")),
    ...["Calcium oxalate","Amorphous phosphate","Triple phosphate","Uric acid","Urates","Spermatozoa","Others"].map(label=>field(label,"text",label==="Calcium oxalate"?"/HPF":"","","Crystals & others",label==="Others"?{required:false}:{})),
  ]},
  {key:"cbc",code:"CBC",name:"CBC (Cell Counter)",specimenType:"blood",description:"Haematology panel with total count, differential count and RBC indices.",parameters:[
    field("Haemoglobin","numeric","g/dl","Male: 12–18 g/dl\nFemale: 11–16 g/dl"),
    field("ESR (Westergren Method)","numeric","mm in 1st hour","Male: 0–10\nFemale: 0–20"),
    field("RBC","numeric","Million/cmm","4.5–5.5","Total count"),field("WBC","numeric","/cmm","4,000–11,000","Total count"),field("Platelets","numeric","/cmm","150,000–450,000","Total count"),
    ...[["Neutrophils","40–75"],["Lymphocytes","20–45"],["Monocytes","2–8"],["Eosinophils","1–6"],["Basophils","0–0.1"]].map(([label,range])=>field(label,"numeric","%",range,"Differential count")),
    field("HCT/PCV","numeric","%","35–55","RBC panel"),field("MCV","numeric","fl","75–100","RBC panel"),field("MCH","numeric","pg","25–35","RBC panel"),field("MCHC","numeric","g/dl","29–36","RBC panel"),
  ]},
  {key:"semen-summary",code:"SEMEN_SUMMARY",name:"Semen Analysis (Summary)",specimenType:"semen",description:"Collection details, sperm count, motility, morphology and opinion.",parameters:[
    field("Collection method","text","","","Physical examination"),field("Volume","numeric","ml","","Physical examination"),field("Colour","text","","","Physical examination"),
    field("Sperm count","numeric","million/ml","","Microscopic examination"),
    ...["Actively motile","Feebly motile","Non motile"].map(label=>field(label,"numeric","%","","Sperm motility")),
    ...["Normal","Abnormal"].map(label=>field(label,"numeric","%","","Sperm morphology")),
    field("Epithelial cell","text","/HPF","","Other cells"),field("Pus cell","text","/HPF","","Other cells"),field("Opinion","text","","","Interpretation"),
  ]},
  {key:"semen-detailed",code:"SEMEN_DETAILED",name:"Semen Analysis (Detailed)",specimenType:"semen",description:"Physical and microscopic examination with detailed cellular findings.",parameters:[
    field("Reaction","text","","","Physical examination"),field("Amount","numeric","ml","","Physical examination"),field("Colour","text","","","Physical examination"),field("Consistency","text","","","Physical examination"),
    field("Total count","numeric","million/ml","","Microscopic examination"),
    ...["Actively motile","Feebly motile","Non motile"].map(label=>field(label,"numeric","%","","Motility (after incubation at 37°C for 30 min.)")),
    ...["Normal","Abnormal"].map(label=>field(label,"numeric","%","","Morphology")),
    ...["Epithelial cell","Pus cell","RBC"].map(label=>field(label,"text","/HPF","","Other findings")),
    field("Fat globule","text","","","Other findings"),field("Clumping","choice","","","Other findings",{options:["Present","Absent"]}),field("Opinion","text","","","Interpretation",{required:false}),
  ]},
  {key:"creatinine",code:"CREATININE",name:"Serum Creatinine",specimenType:"blood",description:"Biochemistry result with sex-specific reference values.",parameters:[field("Serum Creatinine","numeric","mg/dl","Male: 0.7–1.3 mg/dl\nFemale: 0.6–1.1 mg/dl","Biochemistry")]},
  {key:"tsh",code:"TSH",name:"TSH",specimenType:"blood",description:"hTSH with editable adult, paediatric and pregnancy reference notes.",parameters:[field("hTSH","numeric","µIU/ml","Adults: 0.27–4.20\nNewborns: 1.00–25.00\nInfant: 0.80–9.10\nChildren: 0.70–5.70\nGestational age:\n1st trimester: 0.10–2.50\n2nd trimester: 0.20–3.00\n3rd trimester: 0.30–3.00","Hormone analysis")]},
];
export function instantiateLabTemplate(template){return {...template,parameters:template.parameters.map(parameter=>({...parameter,id:crypto.randomUUID()}))};}
