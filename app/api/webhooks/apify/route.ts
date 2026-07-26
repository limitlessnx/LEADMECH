import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { cleanLead } from '@/lib/clean-leads';
export async function POST(request:Request){
  const event=await request.json();
  const datasetId=event?.resource?.defaultDatasetId;
  if(!datasetId) return NextResponse.json({error:'Missing dataset ID'},{status:400});
  const token=process.env.APIFY_API_TOKEN;
  const res=await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&format=json&token=${token}`);
  const raw=await res.json(); const rows=raw.map(cleanLead);
  const ws=XLSX.utils.json_to_sheet(rows); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Leads');
  const xlsx=Buffer.from(XLSX.write(wb,{type:'buffer',bookType:'xlsx'}));
  const csv=XLSX.utils.sheet_to_csv(ws);
  // TODO: upload xlsx and csv to Supabase Storage, update order, then send completion email with Resend.
  return NextResponse.json({ok:true,rows:rows.length,xlsxBytes:xlsx.length,csvBytes:Buffer.byteLength(csv)});
}
