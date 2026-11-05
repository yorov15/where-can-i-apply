export function feeWaiverInquiry(programName) {
  return `Subject: Application fee waiver for an international applicant\n\nDear Admissions Team,\n\nI am considering a first-year undergraduate application to ${programName}. I am applying from [country].\n\nCould you confirm whether international applicants may request an application fee waiver, which conditions apply, and how to submit the request before paying? Please let me know if any supporting documents are required.\n\nThank you,\n[Your name]`;
}
export const waiverTitle = waiver => ({automatic:'Взнос снимается автоматически при выполнении условий',request:'Можно запросить снятие взноса',unavailable:'Снятие взноса иностранцам недоступно'})[waiver?.mode]??'Снятие взноса пока не проверено';
