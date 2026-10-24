"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useAppSelector} from "@/store/hooks";
export function DuesNavigation(){
 const pathname=usePathname(),permissions=useAppSelector(s=>s.auth.permissions);
 if(!permissions.includes("billing.view"))return null;
 const links=[["Lab","/dues/lab"]];
 return <nav aria-label="Dues navigation" className="flex gap-1 overflow-x-auto rounded-xl border bg-card p-1">{links.filter(([, ,permission])=>!permission||permissions.includes(permission)).map(([title,href])=><Link key={href} href={href} aria-current={pathname===href?"page":undefined} className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium ${pathname===href?"bg-primary text-primary-foreground":"text-muted-foreground hover:bg-muted"}`}>{title}</Link>)}</nav>;
}
