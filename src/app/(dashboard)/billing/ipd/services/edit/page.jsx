import {Suspense} from "react";
import {IpdChargeEditorPage} from "@/features/billing/IpdChargeEditorPage";
export const metadata={title:"Edit IPD charges"};
export default function Page(){return <Suspense fallback={<p>Loading patient charges…</p>}><IpdChargeEditorPage/></Suspense>;}
