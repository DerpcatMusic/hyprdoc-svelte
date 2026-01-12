export interface AccordTemplate {
  name: string; // The folder name in the repo
  title: string; // The human readable title
  description: string;
  source: string;
}

// A curated list of high-quality templates from the Accord Project
export const ACCORD_TEMPLATES: AccordTemplate[] = [
  {
    name: "acceptance-of-delivery",
    title: "Acceptance of Delivery",
    description: "A clause that specifies the acceptance of delivery criteria.",
    source:
      "https://github.com/accordproject/cicero-template-library/tree/master/src/acceptance-of-delivery",
  },
  {
    name: "copyright-license",
    title: "Copyright License Agreement",
    description: "A standard copyright license agreement.",
    source:
      "https://github.com/accordproject/cicero-template-library/tree/master/src/copyright-license",
  },
  {
    name: "demandforecast",
    title: "Demand Forecast",
    description: "A template for supply chain demand forecasting.",
    source:
      "https://github.com/accordproject/cicero-template-library/tree/master/src/demandforecast",
  },
  {
    name: "fragile-goods",
    title: "Fragile Goods Delivery",
    description: "A clause for the shipping of fragile goods.",
    source:
      "https://github.com/accordproject/cicero-template-library/tree/master/src/fragile-goods",
  },
  {
    name: "installment-sale",
    title: "Installment Sale Agreement",
    description: "An agreement for the sale of goods paid in installments.",
    source:
      "https://github.com/accordproject/cicero-template-library/tree/master/src/installment-sale",
  },
  {
    name: "ip-payment",
    title: "IP Payment Clause",
    description: "A clause for intellectual property royalty payments.",
    source: "https://github.com/accordproject/cicero-template-library/tree/master/src/ip-payment",
  },
  {
    name: "late-delivery-and-penalty",
    title: "Late Delivery Penalty",
    description: "A clause specifying penalties for late delivery.",
    source:
      "https://github.com/accordproject/cicero-template-library/tree/master/src/late-delivery-and-penalty",
  },
  {
    name: "perishable-goods",
    title: "Perishable Goods Delivery",
    description: "A clause for the shipping of perishable goods.",
    source:
      "https://github.com/accordproject/cicero-template-library/tree/master/src/perishable-goods",
  },
  {
    name: "promissory-note",
    title: "Promissory Note",
    description: "A standard promissory note for loans.",
    source:
      "https://github.com/accordproject/cicero-template-library/tree/master/src/promissory-note",
  },
  {
    name: "purchase-order-failure",
    title: "Purchase Order Failure",
    description: "A clause handling failure to deliver on a purchase order.",
    source:
      "https://github.com/accordproject/cicero-template-library/tree/master/src/purchase-order-failure",
  },
  {
    name: "sales-envelope-ru",
    title: "Sales Envelope (RU)",
    description: "A sales envelope template (Russian jurisdiction example).",
    source:
      "https://github.com/accordproject/cicero-template-library/tree/master/src/sales-envelope-ru",
  },
  {
    name: "service-level-agreement",
    title: "Service Level Agreement",
    description: "A template for defining service levels and penalties.",
    source:
      "https://github.com/accordproject/cicero-template-library/tree/master/src/service-level-agreement",
  },
  {
    name: "supply-agreement",
    title: "Supply Agreement",
    description: "A comprehensive supply agreement template.",
    source:
      "https://github.com/accordproject/cicero-template-library/tree/master/src/supply-agreement",
  },
  {
    name: "volumediscount",
    title: "Volume Discount",
    description: "A clause that applies discounts based on purchase volume.",
    source:
      "https://github.com/accordproject/cicero-template-library/tree/master/src/volumediscount",
  },
];

export async function fetchTemplateContent(templateName: string): Promise<string | null> {
  try {
    const url = `https://raw.githubusercontent.com/accordproject/cicero-template-library/master/src/${templateName}/text/grammar.tem.md`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch template ${templateName}: ${response.statusText}`);
      return null;
    }
    return await response.text();
  } catch (error) {
    console.error(`Error fetching template ${templateName}:`, error);
    return null;
  }
}
