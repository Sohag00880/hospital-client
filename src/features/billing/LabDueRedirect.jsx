"use client";
import {useEffect} from "react";
import {useRouter} from "next/navigation";
export function LabDueRedirect(){
 const router=useRouter();
 useEffect(()=>{router.replace("/dues/lab");},[router]);
 return <p role="status" className="text-sm text-muted-foreground">Opening Lab dues…</p>;
}
