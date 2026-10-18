export const TIME_ZONE = "Asia/Dhaka";
export const bangladeshDate = (value = new Date()) => new Intl.DateTimeFormat("en-CA", {timeZone:TIME_ZONE,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(value));
export const bangladeshTime = value => new Intl.DateTimeFormat("en-GB",{timeZone:TIME_ZONE,hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(value));
export const bangladeshTimestamp = value => new Intl.DateTimeFormat("en-GB",{timeZone:TIME_ZONE,dateStyle:"medium",timeStyle:"short"}).format(new Date(value));
