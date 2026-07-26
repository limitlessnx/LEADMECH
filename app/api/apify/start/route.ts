import { NextResponse } from 'next/server';
import { buildApifyInput } from '@/lib/search-payload';
export async function POST(request:Request){
  const body=await request.json();
  const actorId=process.env.APIFY_ACTOR_ID; const token=process.env.APIFY_API_TOKEN;
  if(!actorId||!token) return NextResponse.json({error:'Apify is not configured'},{status:500});
  const input=buildApifyInput(body.filters??{});
  const url=`https://api.apify.com/v2/acts/${actorId}/runs?token=${token}&waitForFinish=0`;
  const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)});
  const data=await response.json();
  return NextResponse.json({runId:data?.data?.id,status:data?.data?.status,input});
}
