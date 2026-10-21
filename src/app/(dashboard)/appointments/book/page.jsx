import {AppointmentBookingPage} from "@/features/appointments/AppointmentBookingPage";
export const metadata={title:"Book a Appointment"};
export default async function Page({searchParams}){
 const params=await searchParams;
 return <AppointmentBookingPage initialDate={typeof params?.date==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(params.date)?params.date:undefined} initialDoctor={typeof params?.doctorId==="string"?params.doctorId:undefined}/>;
}
