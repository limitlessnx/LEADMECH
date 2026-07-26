import { NextResponse } from 'next/server';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;return NextResponse.json({order:id,message:'Generate a signed Supabase Storage URL here.'})}
