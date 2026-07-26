import { NextResponse } from 'next/server';
export async function POST(request:Request){
  const payload=await request.json();
  // TODO: verify NOWPayments IPN signature before trusting payload.
  // When payment_status is finished/confirmed: mark order paid and send payment confirmation email.
  return NextResponse.json({received:true,status:payload.payment_status});
}
