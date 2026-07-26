export type SearchForm = {
  companyIndustries?: string[];
  companyCities?: string[];
  companyCountries?: string[];
  companySizes?: string[];
  personCountries?: string[];
  personStates?: string[];
  personTitles?: string[];
  seniority?: string[];
  requireVerifiedEmail?: boolean;
  requirePhone?: boolean;
};

export function buildApifyInput(form: SearchForm) {
  const payload: Record<string, unknown> = {
    countOnly: false,
    dontSaveProgress: false,
    resetProgress: false,
    includeTitleVariants: false
  };
  const add=(key:string,value?:string[])=>{if(value?.length) payload[key]=value};
  add('companyIndustryIncludes',form.companyIndustries);
  add('companyLocationCityIncludes',form.companyCities);
  add('companyLocationCountryIncludes',form.companyCountries);
  add('companySizeIncludes',form.companySizes);
  add('personLocationCountryIncludes',form.personCountries);
  add('personLocationStateIncludes',form.personStates);
  add('personTitleIncludes',form.personTitles);
  add('seniorityIncludes',form.seniority);
  payload.hasEmail=form.requireVerifiedEmail ?? true;
  payload.hasPhone=form.requirePhone ?? false;
  if(form.requireVerifiedEmail ?? true){payload.emailStatusIncludes=['verified'];payload.emailStatusExcludes=['unverified'];}
  return payload;
}
