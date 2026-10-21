"use client";
import {useEffect} from "react";
import {useRouter} from "next/navigation";
export function LabListRedirect(){
 const router=useRouter();
 useEffect(()=>{router.replace("/laboratory/test-list");},[router]);
 return <p role="status" className="text-sm text-muted-foreground">Opening Test List…</p>;
}
