import {Suspense} from "react";
import {IpdBilling} from "@/features/billing/IpdBilling";
export const metadata={title:"IPD Billing"};
export default function Page(){return <Suspense fallback={<p>Loading IPD Billing?</p>}><IpdBilling view="deposits"/></Suspense>;}
