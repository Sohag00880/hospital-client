const locationName=value=>typeof value==="string"?value:value?.name || value?.bnName || "";
export function formatAddress(address){
 if(!address)return "Not recorded";
 if(typeof address==="string")return address.trim() || "Not recorded";
 const parts=address.upazila || address.union || address.village!==undefined
  ? [address.village,locationName(address.union),locationName(address.upazila),locationName(address.district)]
  : [address.line1,address.line2,address.city,locationName(address.district),address.state,address.postalCode,address.country];
 return parts.filter(part=>typeof part==="string"&&part.trim()).map(part=>part.trim()).join(", ") || "Not recorded";
}
