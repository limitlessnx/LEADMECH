const listPrefixes=['companyIndustry/','companySpecialties/','functions/','technologies/'];
function mergePrefix(row:Record<string,unknown>,prefix:string){return Object.entries(row).filter(([k,v])=>k.startsWith(prefix)&&v!==null&&v!==''&&v!==undefined).sort(([a],[b])=>Number(a.split('/')[1])-Number(b.split('/')[1])).map(([,v])=>String(v)).join(', ')}
export function cleanLead(row:Record<string,unknown>){return {
  'Full Name':row.fullName??'', 'First Name':row.firstName??'', 'Last Name':row.lastName??'',
  'Job Title':row.title??row.position??'', 'Seniority':row.seniority??'', 'Functions':mergePrefix(row,'functions/'),
  'Email':row.email??'', 'Email Status':row.emailStatus??'', 'Phone':row.phone??'', 'LinkedIn':row.linkedinUrl??'',
  'Person City':row.personCity??'', 'Person State':row.personState??'', 'Person Country':row.personCountry??'',
  'Company Name':row.companyName??'', 'Company Domain':row.companyDomain??'', 'Company LinkedIn':row.companyLinkedinUrl??'',
  'Company Description':row.companyDescription??'', 'Company City':row.companyCity??'', 'Company State':row.companyState??'', 'Company Country':row.companyCountry??'',
  'Industries':mergePrefix(row,'companyIndustry/'), 'Specialties':mergePrefix(row,'companySpecialties/'),
  'Company Size':row.companySize??'', 'Company Size Range':row.companySizeRange??'', 'Annual Revenue':row.annualRevenue??'',
  'Founded Year':row.foundedYear??'', 'Funding Stage':row.fundingStage??'', 'Total Funding':row.totalFunding??'',
  'Technologies':mergePrefix(row,'technologies/')
}}
