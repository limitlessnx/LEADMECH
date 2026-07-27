export type SearchForm = {
  companyIndustries?: string[] | string;
  companyCities?: string[] | string;
  companyCountries?: string[] | string;
  companySizes?: string[];
  personCountries?: string[] | string;
  personStates?: string[] | string;
  personTitles?: string[] | string;
  jobTitles?: string[] | string;
  seniority?: string[];
  requireVerifiedEmail?: boolean;
  requirePhone?: boolean;
  hasEmail?: string;
  hasPhone?: string;
};

function toArray(value?: string[] | string) {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
  if (!value) return [];
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

export function buildApifyInput(form: SearchForm) {
  const payload: Record<string, unknown> = {
    countOnly: false,
    dontSaveProgress: false,
    resetProgress: false,
    includeTitleVariants: false
  };
  const add=(key:string,value?:string[] | string)=>{const items=toArray(value);if(items.length) payload[key]=items};
  add('companyIndustryIncludes',form.companyIndustries);
  add('companyLocationCityIncludes',form.companyCities);
  add('companyLocationCountryIncludes',form.companyCountries);
  add('companySizeIncludes',form.companySizes);
  add('personLocationCountryIncludes',form.personCountries);
  add('personLocationStateIncludes',form.personStates);
  add('personTitleIncludes',form.personTitles ?? form.jobTitles);
  add('seniorityIncludes',form.seniority);
  payload.hasEmail=form.hasEmail ? form.hasEmail !== 'not-required' : form.requireVerifiedEmail ?? true;
  payload.hasPhone=form.hasPhone ? form.hasPhone === 'required' : form.requirePhone ?? false;
  if(form.hasEmail ? form.hasEmail === 'verified' : form.requireVerifiedEmail ?? true){payload.emailStatusIncludes=['verified'];payload.emailStatusExcludes=['unverified'];}
  return payload;
}
