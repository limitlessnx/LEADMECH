export type SearchForm = {
  companyIndustries?: string[] | string;
  companyCities?: string[] | string;
  companyStates?: string[] | string;
  companyCountries?: string[] | string;
  companySizes?: string[];
  personCountries?: string[] | string;
  personStates?: string[] | string;
  personCities?: string[] | string;
  personTitles?: string[] | string;
  jobTitles?: string[] | string;
  seniority?: string[];
  emailStatus?: 'verified' | 'unverified' | 'any';
  requireVerifiedEmail?: boolean;
  requirePhone?: boolean;
  hasEmail?: string | boolean;
  hasPhone?: string | boolean;
  totalResults?: number;
};

function toArray(value?: string[] | string) {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
  if (!value) return [];
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function isRequired(value?: string | boolean) {
  if (typeof value === 'boolean') return value;
  return value === 'required' || value === 'verified' || value === 'any';
}

export function buildApifyInput(form: SearchForm) {
  const payload: Record<string, unknown> = {
    countOnly: false,
    dontSaveProgress: false,
    resetProgress: false,
    includeTitleVariants: false,
  };

  const add = (key: string, value?: string[] | string) => {
    const items = toArray(value);
    if (items.length) payload[key] = items;
  };

  add('companyIndustryIncludes', form.companyIndustries);
  add('companyLocationCountryIncludes', form.companyCountries);
  add('companyLocationStateIncludes', form.companyStates);
  add('companyLocationCityIncludes', form.companyCities);
  add('companySizeIncludes', form.companySizes);
  add('personLocationCountryIncludes', form.personCountries);
  add('personLocationStateIncludes', form.personStates);
  add('personLocationCityIncludes', form.personCities);
  add('personTitleIncludes', form.personTitles ?? form.jobTitles);
  add('seniorityIncludes', form.seniority);

  const hasEmail = form.hasEmail !== undefined
    ? isRequired(form.hasEmail)
    : form.requireVerifiedEmail ?? true;
  const hasPhone = form.hasPhone !== undefined
    ? isRequired(form.hasPhone)
    : form.requirePhone ?? false;

  payload.hasEmail = hasEmail;
  payload.hasPhone = hasPhone;

  if (hasEmail) {
    const emailStatus = form.emailStatus || (form.requireVerifiedEmail === false ? 'any' : 'verified');
    if (emailStatus === 'verified') {
      payload.emailStatusIncludes = ['verified'];
      payload.emailStatusExcludes = ['unverified'];
    } else if (emailStatus === 'unverified') {
      payload.emailStatusIncludes = ['unverified'];
      payload.emailStatusExcludes = ['verified'];
    }
  }

  if (form.totalResults && Number.isFinite(Number(form.totalResults))) {
    payload.totalResults = Math.min(Math.max(Math.round(Number(form.totalResults)), 1), 50000);
  }

  return payload;
}

export async function validateApifyInputAgainstActorSchema(actorId: string, token: string, input: Record<string, unknown>) {
  const response = await fetch(`https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/input-schema`, {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!response.ok) return { valid: true as const, unavailable: true as const };

  const schema = await response.json().catch(() => null) as Record<string, any> | null;
  const properties = schema?.properties ?? schema?.data?.properties ?? {};
  const errors: string[] = [];

  for (const [field, value] of Object.entries(input)) {
    if (!Array.isArray(value)) continue;
    const fieldSchema = properties[field];
    const enumValues = fieldSchema?.items?.enum ?? fieldSchema?.enum;
    if (!Array.isArray(enumValues)) continue;
    const allowed = new Set(enumValues.map(String));
    const invalid = value.map(String).filter((item) => !allowed.has(item));
    if (invalid.length) errors.push(`${field}: ${invalid.join(', ')}`);
  }

  if (errors.length) {
    return {
      valid: false as const,
      unavailable: false as const,
      error: `Some selected search values are not supported by the current lead provider: ${errors.join('; ')}. Remove the unsupported selections and try again.`,
    };
  }

  return { valid: true as const, unavailable: false as const };
}
